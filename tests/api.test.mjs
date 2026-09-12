import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile,readdir} from 'node:fs/promises';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
test('workspace API persists changes, isolates users, rejects stale writes, and stores photos',async()=>{
 const moduleFiles=(await readdir('dist/server',{recursive:true})).filter(p=>p.endsWith('.js')&&p!=='index.js');
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'app',modules:[{type:'ESModule',path:'dist/server/index.js'},...moduleFiles.map(p=>({type:'ESModule',path:'dist/server/'+p}))],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],serviceBindings:{ASSETS:()=>new Response('Not found',{status:404})}}]}));
 try{
  const db=await mf.getD1Database('DB');for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const sql of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint'))if(sql.trim())await db.exec(sql.replace(/\n/g,' '));
  const req=(user,method='GET',body)=>mf.dispatchFetch('http://workspace.test/api/workspace',{method,headers:{...(user?{'oai-authenticated-user-id':user}:{}),...(body?{'Content-Type':'application/json',Origin:'http://workspace.test'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  assert.equal((await req()).status,401);
  const res=await req('teacher-a');assert.equal(res.status,200);const a=await res.json();assert.equal(a.data.students.length,5);
  a.data.profile.name='آزمایش ذخیره';let saved=await req('teacher-a','PUT',a);assert.equal(saved.status,200,await saved.clone().text());assert.equal((await (await req('teacher-a')).json()).data.profile.name,'آزمایش ذخیره');
  const b=await(await req('teacher-b')).json();assert.notEqual(b.data.profile.name,a.data.profile.name);
  assert.equal((await req('teacher-a','PUT',a)).status,409);
  const current=await(await req('teacher-a')).json();current.data.sessions.push({...current.data.sessions[0],id:'overlap',time:'09:30'});assert.equal((await req('teacher-a','PUT',current)).status,400);
  assert.equal((await mf.dispatchFetch('http://workspace.test/api/workspace',{method:'PUT',headers:{'oai-authenticated-user-id':'teacher-a',Origin:'http://untrusted.test'},body:JSON.stringify(current)})).status,403);
  const uploaded=await mf.dispatchFetch('http://workspace.test/api/photo',{method:'POST',headers:{'oai-authenticated-user-id':'teacher-a',Origin:'http://workspace.test','Content-Type':'image/png'},body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jPdwAAAAASUVORK5CYII=','base64')});assert.equal(uploaded.status,200,await uploaded.clone().text());
  const photo=await mf.dispatchFetch('http://workspace.test/api/photo',{headers:{'oai-authenticated-user-id':'teacher-a'}});assert.equal(photo.status,200);assert.equal(photo.headers.get('Content-Type'),'image/png');
  assert.equal((await mf.dispatchFetch('http://workspace.test/api/photo',{headers:{'oai-authenticated-user-id':'teacher-b'}})).status,404);
 }finally{await mf.dispose()}
});
