import test from 'node:test';import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {captchaBinding,captchaDigest,consumeCaptcha,normalizeCaptcha,randomCaptcha,captchaLimit} from '../lib/captcha-policy.ts';
import {captchaImage} from '../lib/captcha-image.ts';
import {displayDate} from '../lib/date-display.ts';
import {profileContact} from '../lib/profile-contact.ts';
test('Persian date order is weekday, day, month, year in Tehran',()=>{
 assert.equal(displayDate('2026-11-14T12:00:00Z','fa'),'شنبه، ۲۳ آبان ۱۴۰۵');
 assert.equal(displayDate('2026-11-14','fa',{day:'numeric',month:'long',year:'numeric'}),'۲۳ آبان ۱۴۰۵');
 assert(!displayDate('2026-11-14T12:00:00Z','fa',{dateStyle:'medium',timeStyle:'short'}).includes(','));
 assert.equal(displayDate('2026-11-14T21:00:00Z','fa',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),'یکشنبه، ۲۴ آبان ۱۴۰۵');
});
test('profile contact details require email and an international or normalized Iranian mobile',()=>{
 assert.equal(profileContact('','').valid,false);assert.equal(profileContact('name@example.com','').valid,false);assert.equal(profileContact('name','+989121234567').valid,false);
 const p=profileContact(' Name@Example.com ','۰۹۱۲ ۱۲۳ ۴۵۶۷');assert.equal(p.valid,true);assert.deepEqual(p.value,{email:'name@example.com',phone:'+989121234567'});
});
test('captcha is a raster PNG, not recoverable plaintext or SVG',async()=>{
 const png=await captchaImage('482961');assert.deepEqual([...png.slice(0,8)],[137,80,78,71,13,10,26,10]);assert.equal(new DataView(png.buffer).getUint32(16),220);assert.equal(new DataView(png.buffer).getUint32(20),72);assert(!new TextDecoder().decode(png).includes('482961'));
 assert.equal(normalizeCaptcha(' ۱۲٣۴۵۶ '),'123456');for(let i=0;i<30;i++)assert.match(randomCaptcha(),/^\d{6}$/);
});
test('captcha is bound to the browser, expires, is single use on success or failure and has atomic limits',async()=>{
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE classer_captchas(id TEXT PRIMARY KEY,answer_hash TEXT,binding_hash TEXT,expires INTEGER);CREATE TABLE classer_security_limits(id TEXT PRIMARY KEY,count INTEGER,expires INTEGER)');
 const db={prepare(sql){let values=[];const q={bind(...v){values=v;return q},async first(){return sqlite.prepare(sql).get(...values)??null},async run(){return {meta:{changes:sqlite.prepare(sql).run(...values).changes}}}};return q}};
 const token='a'.repeat(64),agent='fixture',request=new Request('https://example.test',{headers:{Cookie:'__Host-classer_captcha='+token,'User-Agent':agent}}),now=10000;
 async function create(){const id=crypto.randomUUID();await db.prepare('INSERT INTO classer_captchas VALUES(?,?,?,?)').bind(id,await captchaDigest(id+'\0'+'123456'),await captchaBinding(token,agent),now+120000).run();return id}
 try{let id=await create();assert.equal(await consumeCaptcha(db,new Request('https://example.test'),id,'123456',now),false);assert.equal(await consumeCaptcha(db,request,id,'123456',now),true);assert.equal(await consumeCaptcha(db,request,id,'123456',now),false);
 id=await create();assert.equal(await consumeCaptcha(db,request,id,'000000',now),false);assert.equal(await consumeCaptcha(db,request,id,'123456',now),false);
 id=await create();assert.equal(await consumeCaptcha(db,request,id,'123456',now+120000),false);
 id=await create();const race=await Promise.all([consumeCaptcha(db,request,id,'123456',now),consumeCaptcha(db,request,id,'123456',now)]);assert.equal(race.filter(Boolean).length,1);
 assert.equal(await captchaLimit(db,'fixture',2,60,now),true);assert.equal(await captchaLimit(db,'fixture',2,60,now),true);assert.equal(await captchaLimit(db,'fixture',2,60,now),false);assert.equal(await captchaLimit(db,'fixture',2,60,now+60000),true);
 }finally{sqlite.close()}
});
