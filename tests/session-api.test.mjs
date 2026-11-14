import assert from 'node:assert/strict';import test from 'node:test';
import {readFile,readdir} from 'node:fs/promises';import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {sampleWorkspace} from '../lib/model.ts';import {changeSessionStatus} from '../lib/session-policy.ts';
test('duration prices and note history persist; paid notes remain editable while money is locked',async()=>{
 const files=(await readdir('dist/server',{recursive:true})).filter(p=>p.endsWith('.js')&&p!=='index.js');const origin='https://mahela-classroom.lahzehtv.chatgpt.site';
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'app',modules:[{type:'ESModule',path:'dist/server/index.js'},...files.map(p=>({type:'ESModule',path:'dist/server/'+p}))],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],serviceBindings:{ASSETS:()=>new Response('Not found',{status:404})}}]}));
 try{const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(x=>x.endsWith('.sql')).sort())for(const sql of (await readFile('drizzle/'+f,'utf8')).split('--> statement-breakpoint'))if(sql.trim())await db.exec(sql.replaceAll('\n',' '));
 const w=sampleWorkspace('2026-11-14');w.demo=false;await db.prepare('INSERT INTO teacher_workspaces VALUES(?,?,1,?)').bind('session-teacher',JSON.stringify(w),new Date().toISOString()).run();
 const call=body=>mf.dispatchFetch(origin+'/api/workspace',{method:body?'PUT':'GET',headers:{'oai-authenticated-user-id':'session-teacher',...(body?{Origin:origin,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 let document=await(await call()).json();let session=document.data.sessions.find(x=>x.id==='demo-1');session.pricing={baseRate:session.rate,baseDuration:60,currency:session.currency};session.duration=90;session.rate=session.pricing.baseRate*1.5;session.note='**First planning note**';
 let saved=await call(document);assert.equal(saved.status,200,await saved.clone().text());document=await saved.json();session=document.data.sessions.find(x=>x.id==='demo-1');assert.equal(session.duration,90);assert.equal(session.rate,420000);
 session.rate=1;assert.equal((await call(document)).status,400);session.rate=420000;
 const changed=changeSessionStatus(session,'held');changed.note='A new completed-class note';document.data.sessions=document.data.sessions.map(x=>x.id===changed.id?changed:x);saved=await call(document);assert.equal(saved.status,200,await saved.clone().text());document=await saved.json();session=document.data.sessions.find(x=>x.id==='demo-1');assert.equal(session.noteHistory[0].status,'scheduled');assert.equal(session.noteHistory[0].note,'**First planning note**');
 const paid=document.data.sessions.find(x=>x.paid);const originalRate=paid.rate;paid.note='Updated feedback after payment';saved=await call(document);assert.equal(saved.status,200,await saved.clone().text());document=await saved.json();const stored=document.data.sessions.find(x=>x.id===paid.id);assert.equal(stored.rate,originalRate);assert.equal(stored.note,paid.note);stored.rate+=1;assert.equal((await call(document)).status,400);
 }finally{await mf.dispose()}
});
