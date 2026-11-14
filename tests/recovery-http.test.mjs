import {authCaptcha} from './fixtures/captcha.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import * as moduleHooks from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,extname} from 'node:path';
import {recoveryDatabase} from './fixtures/recovery.mjs';
import {verifyPassword} from '../lib/server/password.ts';

const root=fileURLToPath(new URL('../',import.meta.url));
const origin='https://mahela-classroom.lahzehtv.chatgpt.site';
const stubs={
 '@/db/storage':"export const database=()=>globalThis.__recoveryHttp.db",
 '@platform/auth-api':"export const POST=async()=>new Response(null,{status:404})",
 '@platform/recovery-config':"export const getRecoveryMailConfig=()=>globalThis.__recoveryHttp.config",
 '@/lib/server/access':`export const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
 export const validOrigin=r=>r.headers.get('origin')===${JSON.stringify(origin)};
 export const payload=r=>r.json();
 export const landing=u=>u.role==='student'?'/student':'/dashboard';`,
};
const hooks=typeof moduleHooks.registerHooks==='function'?moduleHooks.registerHooks({resolve(specifier,context,nextResolve){
 if(stubs[specifier])return {url:'data:text/javascript,'+encodeURIComponent(stubs[specifier]),shortCircuit:true};
 if(specifier.startsWith('@/'))return nextResolve(pathToFileURL(resolve(root,specifier.slice(2)+'.ts')).href,context);
 if(specifier.startsWith('.')&&!extname(specifier)&&context.parentURL?.startsWith('file:'))return nextResolve(new URL(specifier+'.ts',context.parentURL).href,context);
 return nextResolve(specifier,context);
}}):null;
const POST=hooks?(await import('../app/api/auth/[action]/route.ts')).POST:null;

test('HTTP recovery flow uses the registered email, enforces origin and config, then changes the password once',{skip:!hooks},async(t)=>{
 const {db,sqlite}=recoveryDatabase(),emails=[];
 const oldTarget=process.env.NEXT_PUBLIC_HOSTING_TARGET;delete process.env.NEXT_PUBLIC_HOSTING_TARGET;
 globalThis.__recoveryHttp={db,config:null};
 const request=async(action,body,headers={Origin:origin})=>{const prepared=await authCaptcha(db,action,body,headers);return POST(new Request(origin+'/api/auth/'+action,{method:'POST',headers:{'Content-Type':'application/json','cf-connecting-ip':'192.0.2.44',...prepared.headers},body:JSON.stringify(prepared.body)}),{params:Promise.resolve({action})})};

 t.mock.method(globalThis,'fetch',async(url,init)=>{
  assert.equal(url,'https://api.resend.com/emails');emails.push(JSON.parse(init.body));return Response.json({id:'fixture-email'});
 });
 try{
  assert.equal((await request('recovery-request',{email:'teacher@example.com'},{})).status,403);
  assert.equal((await request('recovery-request',{email:'teacher@example.com'})).status,503);
  assert.equal(emails.length,0);
  globalThis.__recoveryHttp.config={apiKey:'fixture',from:'auth@example.com',secret:'test-only-secret-with-at-least-thirty-two-characters'};
  const started=Date.now(),sent=await request('recovery-request',{email:'Teacher@Example.com'});
  assert.equal(sent.status,200);assert(Date.now()-started>=4400);
  const reply=await sent.json();assert.equal('code' in reply,false);assert.equal(emails.length,1);
  assert.deepEqual(emails[0].to,['teacher@example.com']);
  const code=emails[0].text.match(/: (\d{6})/)[1],wrong=code==='000000'?'000001':'000000';
  assert.equal((await request('recovery-verify',{challenge:reply.challenge,code:wrong})).status,400);
  const verified=await request('recovery-verify',{challenge:reply.challenge,code});assert.equal(verified.status,200);
  const {grant}=await verified.json();
  assert.equal((await request('recovery-reset',{grant,password:'short'})).status,400);
  const reset=await request('recovery-reset',{grant,password:'Eight!8x'});assert.equal(reset.status,200);
  assert.match(reset.headers.get('set-cookie'),/Max-Age=0/);
  assert.equal((await reset.json()).next,'/signin');
  assert.equal(await verifyPassword('Eight!8x',sqlite.prepare('SELECT password_hash FROM classer_accounts').get().password_hash),true);
  assert.equal((await request('recovery-reset',{grant,password:'Another!9'})).status,400);
  assert.equal((await request('recovery-verify',{challenge:reply.challenge,code})).status,400);
  const unknown=await request('recovery-request',{email:'missing@example.com'});
  assert.equal(unknown.status,200);const missing=await unknown.json();
  assert.equal(missing.message,reply.message);assert.deepEqual(Object.keys(missing).sort(),Object.keys(reply).sort());assert.equal(emails.length,1);
 }finally{
  sqlite.close();delete globalThis.__recoveryHttp;
  if(oldTarget===undefined)delete process.env.NEXT_PUBLIC_HOSTING_TARGET;else process.env.NEXT_PUBLIC_HOSTING_TARGET=oldTarget;
  hooks.deregister();
 }
});

