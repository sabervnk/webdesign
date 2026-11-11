import assert from 'node:assert/strict';
import test from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {createEmailRecovery,RecoveryRateLimit} from '../lib/server/email-recovery.ts';
import {recoveryMailConfig,recoveryEmailSender} from '../lib/server/recovery-mail.ts';
import {normalizeRecoveryCode} from '../lib/recovery-policy.ts';

const migration=await readFile(new URL('../drizzle/0004_email_recovery.sql',import.meta.url),'utf8');
const secret='fixture-only-recovery-secret-not-a-production-key';
function fixture(options={}){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec("PRAGMA foreign_keys=ON; CREATE TABLE classer_accounts(id TEXT PRIMARY KEY,email TEXT NOT NULL,epoch INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,password_hash TEXT,must_change INTEGER DEFAULT 1); CREATE TABLE classer_sessions(token TEXT,account_id TEXT,epoch INTEGER);");
 sqlite.exec(migration);
 sqlite.prepare('INSERT INTO classer_accounts(id,email,password_hash) VALUES(?,?,?)').run('teacher-1','Teacher@Example.com','old-hash');
 sqlite.prepare('INSERT INTO classer_sessions VALUES(?,?,?)').run('old-session','teacher-1',0);
 let time=1_800_000_000_000,errors=0;
 const emails=[];
 const db={prepare(sql){
  let values=[];
  const statement={bind(...v){values=v;return statement},async first(){return sqlite.prepare(sql).get(...values)??null},async all(){return {results:sqlite.prepare(sql).all(...values)}},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...values).changes)}}}};
  return statement;
 }};
 const send=options.send??(async(to,code,challenge)=>{emails.push({to,code,challenge})});
 const service=createEmailRecovery({db,secret,send,now:()=>time,onDeliveryError:()=>errors++});
 return {service,emails,sqlite,advance(ms){time+=ms},close(){sqlite.close()},errors:()=>errors};
}
const ip='192.0.2.8';
async function sent(f){const reply=await f.service.request(' TEACHER@example.com ',ip);assert.equal(f.emails.length,1);return {...reply,code:f.emails[0].code}}
const getGrant=async(f)=>{const r=await sent(f);const v=await f.service.verify(r.challenge,r.code,ip);assert(v.grant);return v.grant};

test('registered email receives a six-digit code; code and grant are never stored in plaintext',async()=>{
 const f=fixture();try{
  const {challenge,code}=await sent(f);
  assert.match(code,/^\d{6}$/);assert.equal(f.emails[0].to,'teacher@example.com');
  const row=f.sqlite.prepare('SELECT * FROM classer_email_recovery').get();
  assert.notEqual(row.code_hash,code);assert.equal(row.delivered,1);
  assert.equal('code' in await f.service.request('missing@example.com','192.0.2.9'),false);
  const verified=await f.service.verify(challenge,code,ip);assert.match(verified.grant,/^[0-9a-f]{64}$/);
  const after=f.sqlite.prepare('SELECT * FROM classer_email_recovery').get();
  assert.equal(after.code_hash,'');assert.notEqual(after.grant_hash,verified.grant);
 }finally{f.close()}
});

test('wrong code cannot create a reset grant; the fifth failed attempt locks this challenge',async()=>{
 const f=fixture();try{
  const r=await sent(f),wrong=r.code==='000000'?'000001':'000000';
  for(let i=0;i<5;i++)assert.equal((await f.service.verify(r.challenge,wrong,ip)).status,400);
  assert.equal((await f.service.verify(r.challenge,r.code,ip)).status,400);
  assert.equal(f.sqlite.prepare('SELECT attempts FROM classer_email_recovery').get().attempts,5);
  assert.equal(f.sqlite.prepare('SELECT password_hash FROM classer_accounts').get().password_hash,'old-hash');
 }finally{f.close()}
});

test('a correct fifth attempt succeeds, malformed submissions also consume attempts',async()=>{
 const f=fixture();try{
  const r=await sent(f);
  for(let i=0;i<4;i++)assert.equal((await f.service.verify(r.challenge,'bad',ip)).status,400);
  assert((await f.service.verify(r.challenge,r.code,ip)).grant);
 }finally{f.close()}
});

test('code expires at ten minutes and cannot be verified at the expiry boundary',async()=>{
 const f=fixture();try{
  const r=await sent(f);f.advance(600_000);
  assert.equal((await f.service.verify(r.challenge,r.code,ip)).status,400);
 }finally{f.close()}
});

test('code is single-use and racing verifications issue at most one grant',async()=>{
 const f=fixture();try{
  const r=await sent(f);
  const results=await Promise.all([f.service.verify(r.challenge,r.code,ip),f.service.verify(r.challenge,r.code,ip)]);
  assert.equal(results.filter(r=>r.grant).length,1);
  assert.equal((await f.service.verify(r.challenge,r.code,ip)).status,400);
 }finally{f.close()}
});

test('password reset is atomic, single-use and revokes existing sessions',async()=>{
 const f=fixture();try{
  const grant=await getGrant(f);
  const result=await Promise.all([f.service.reset(grant,async()=>'new-hash',ip),f.service.reset(grant,async()=>'new-hash',ip)]);
  assert.equal(result.filter(Boolean).length,1);
  const a=f.sqlite.prepare('SELECT * FROM classer_accounts').get();
  assert.equal(a.epoch,1);assert.equal(a.must_change,0);assert.equal(a.password_hash,'new-hash');
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM classer_sessions s JOIN classer_accounts a ON a.id=s.account_id AND a.epoch=s.epoch').get().n,0);
  assert.equal(await f.service.reset(grant,async()=>'another-hash',ip),false);
 }finally{f.close()}
});

test('reset grant expires after five minutes, including expiry while hashing',async()=>{
 for(const duringHash of [false,true]){
  const f=fixture();try{
   const grant=await getGrant(f);
   if(!duringHash)f.advance(300_000);
   assert.equal(await f.service.reset(grant,async()=>{if(duringHash)f.advance(300_000);return 'new-hash'},ip),false);
   assert.equal(f.sqlite.prepare('SELECT password_hash FROM classer_accounts').get().password_hash,'old-hash');
  }finally{f.close()}
 }
});

test('resend waits 60 seconds then invalidates the previous code and grant',async()=>{
 const f=fixture();try{
  const r=await sent(f),oldGrant=(await f.service.verify(r.challenge,r.code,ip)).grant;
  await f.service.request('teacher@example.com',ip);assert.equal(f.emails.length,1);
  f.advance(60_000);
  const next=await f.service.request('teacher@example.com',ip);assert.equal(f.emails.length,2);
  assert.equal((await f.service.verify(r.challenge,r.code,ip)).status,400);
  assert.equal(await f.service.reset(oldGrant,async()=>'bad',ip),false);
  assert((await f.service.verify(next.challenge,f.emails[1].code,ip)).grant);
 }finally{f.close()}
});

test('unknown, inactive and duplicate-email accounts receive the same public response and no email',async()=>{
 const f=fixture();try{
  const {code:fixtureCode,...known}=await sent(f);
  const missing=await f.service.request('missing@example.com',ip);
  f.sqlite.prepare('UPDATE classer_accounts SET active=0').run();
  const inactive=await f.service.request('teacher@example.com',ip);
  f.sqlite.prepare('UPDATE classer_accounts SET active=1').run();
  f.sqlite.prepare('INSERT INTO classer_accounts(id,email) VALUES(?,?)').run('duplicate','teacher@example.com');
  const duplicate=await f.service.request('teacher@example.com',ip);
  for(const result of [missing,inactive,duplicate]){
   assert.deepEqual(Object.keys(result).sort(),Object.keys(known).sort());
   assert.equal(result.message,known.message);assert.equal(result.expiresIn,known.expiresIn);assert.equal(result.resendAfter,known.resendAfter);
   assert.notEqual(result.challenge,known.challenge);
  }
  assert.equal(f.emails.length,1);
 }finally{f.close()}
});

test('changing account email, epoch or active status invalidates both code and reset grants',async()=>{
 for(const update of ["email='different@example.com'","epoch=epoch+1","active=0"]){
  for(const stage of ['code','grant']){
   const f=fixture();try{
    const r=await sent(f);
    const grant=stage==='grant'?(await f.service.verify(r.challenge,r.code,ip)).grant:null;
    f.sqlite.exec('UPDATE classer_accounts SET '+update);
    if(stage==='code')assert.equal((await f.service.verify(r.challenge,r.code,ip)).status,400);
    else assert.equal(await f.service.reset(grant,async()=>'bad',ip),false);
   }finally{f.close()}
  }
 }
});

test('codes are unusable until delivery succeeds and provider failures leave no live code',async()=>{
 let release;
 const gate=new Promise(resolve=>release=resolve);
 const f=fixture({send:async()=>gate});try{
  const pending=f.service.request('teacher@example.com',ip);
  await new Promise(resolve=>setImmediate(resolve));
  const row=f.sqlite.prepare('SELECT challenge FROM classer_email_recovery').get();
  assert.equal((await f.service.verify(row.challenge,'123456',ip)).status,400);
  release();await pending;
 }finally{f.close()}
 const failed=fixture({send:async()=>{throw Error('provider error with private data')}});try{
  const r=await failed.service.request('teacher@example.com',ip);
  assert(r.challenge);assert.equal(failed.errors(),1);
  assert.equal(failed.sqlite.prepare('SELECT count(*) AS n FROM classer_email_recovery').get().n,0);
 }finally{failed.close()}
});

test('request limits apply to email and IP, including unknown emails, and expire',async()=>{
 const f=fixture();try{
  for(let i=0;i<5;i++)await f.service.request('unknown@example.com','email-ip-'+i);
  await assert.rejects(f.service.request('unknown@example.com','new-ip'),RecoveryRateLimit);
  for(let i=0;i<10;i++)await f.service.request('unknown'+i+'@example.com','same-ip');
  await assert.rejects(f.service.request('other@example.com','same-ip'),RecoveryRateLimit);
  f.advance(3_600_000);
  assert((await f.service.request('unknown@example.com','same-ip')).challenge);
 }finally{f.close()}
});

test('invalid grants never run expensive password hashing; reset and verification have IP limits',async()=>{
 const f=fixture();try{
  let hashes=0;
  for(let i=0;i<20;i++)assert.equal(await f.service.reset('a'.repeat(64),async()=>{hashes++;return 'bad'},ip),false);
  assert.equal(hashes,0);
  await assert.rejects(f.service.reset('a'.repeat(64),async()=>'bad',ip),RecoveryRateLimit);
  for(let i=0;i<50;i++)assert.equal((await f.service.verify('a'.repeat(64),'000000',ip)).status,400);
  await assert.rejects(f.service.verify('a'.repeat(64),'000000',ip),RecoveryRateLimit);
 }finally{f.close()}
});

test('invalid email and incomplete configuration fail closed; Persian and Arabic code digits normalize',async()=>{
 const f=fixture();try{
  assert.equal((await f.service.request('not-an-email',ip)).status,400);assert.equal(f.emails.length,0);
 }finally{f.close()}
 assert.equal(recoveryMailConfig({}),null);
 assert.equal(recoveryMailConfig({RESEND_API_KEY:'fixture',RECOVERY_EMAIL_FROM:'a@example.com',RECOVERY_CODE_SECRET:'short'}),null);
 assert.equal(normalizeRecoveryCode(' ۱۲۳-٤٥٦ '),'123456');
});

test('Resend adapter sends only to the registered destination with idempotency and a timeout',async()=>{
 const calls=[];
 const config={apiKey:'fixture-api-key',from:'Classer <auth@example.com>',secret};
 const sender=recoveryEmailSender(config,async(url,init)=>{calls.push({url,init});return Response.json({id:'fixture-email-id'})});
 await sender('teacher@example.com','012345','a'.repeat(64));
 assert.equal(calls[0].url,'https://api.resend.com/emails');
 assert.equal(calls[0].init.headers.Authorization,'Bearer fixture-api-key');
 assert.equal(calls[0].init.headers['Idempotency-Key'],'classer-recovery/'+'a'.repeat(64));
 assert.deepEqual(JSON.parse(calls[0].init.body).to,['teacher@example.com']);
 assert(JSON.parse(calls[0].init.body).text.includes('012345'));
 assert(calls[0].init.signal);
 const failed=recoveryEmailSender(config,async()=>new Response('private provider details',{status:403}));
 await assert.rejects(failed('teacher@example.com','012345','b'.repeat(64)),/delivery rejected/);
 const unconfirmed=recoveryEmailSender(config,async()=>Response.json({}));
 await assert.rejects(unconfirmed('teacher@example.com','012345','c'.repeat(64)),/unconfirmed/);
});

