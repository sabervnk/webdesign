import {avatar} from './fixtures/avatar.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile,readdir} from 'node:fs/promises';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
test('workspace API persists changes, isolates users, rejects stale writes, and stores photos',async()=>{
 const moduleFiles=(await readdir('dist/server',{recursive:true})).filter(p=>p.endsWith('.js')&&p!=='index.js');
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'app',modules:[{type:'ESModule',path:'dist/server/index.js'},...moduleFiles.map(p=>({type:'ESModule',path:'dist/server/'+p}))],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],serviceBindings:{ASSETS:()=>new Response('Not found',{status:404})}}]}));
 try{
  const db=await mf.getD1Database('DB');for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const sql of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint'))if(sql.trim())await db.exec(sql.replace(/\n/g,' '));
  const req=(user,method='GET',body)=>mf.dispatchFetch('https://mahela-classroom.lahzehtv.chatgpt.site/api/workspace',{method,headers:{...(user?{'oai-authenticated-user-id':user}:{}),...(body?{'Content-Type':'application/json',Origin:'https://mahela-classroom.lahzehtv.chatgpt.site'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  assert.equal((await req()).status,401);
  const res=await req('teacher-a');assert.equal(res.status,200);const a=await res.json();assert.equal(a.data.students.length,5);
  a.data.profile.name='آزمایش ذخیره';let saved=await req('teacher-a','PUT',a);assert.equal(saved.status,200,await saved.clone().text());assert.equal((await (await req('teacher-a')).json()).data.profile.name,'آزمایش ذخیره');
  const b=await(await req('teacher-b')).json();assert.notEqual(b.data.profile.name,a.data.profile.name);
  assert.equal((await req('teacher-a','PUT',a)).status,409);
  const current=await(await req('teacher-a')).json();current.data.sessions.push({...current.data.sessions[0],id:'overlap',time:'09:30'});assert.equal((await req('teacher-a','PUT',current)).status,400);
  assert.equal((await mf.dispatchFetch('https://mahela-classroom.lahzehtv.chatgpt.site/api/workspace',{method:'PUT',headers:{'oai-authenticated-user-id':'teacher-a',Origin:'http://untrusted.test'},body:JSON.stringify(current)})).status,403);
  const photoUrl='https://mahela-classroom.lahzehtv.chatgpt.site/api/photo';
  const upload=(body)=>mf.dispatchFetch(photoUrl,{method:'POST',headers:{'oai-authenticated-user-id':'teacher-a',Origin:'https://mahela-classroom.lahzehtv.chatgpt.site','Content-Type':'image/webp'},body});
  // Chromium canvas writes a VP8X header and ICCP chunk before the pixel data.
  const header=Buffer.from('VP8X\x0a\x00\x00\x00\x20\x00\x00\x00\xbf\x00\x00\xbf\x00\x00','latin1');
  const icc=Buffer.from('ICCP\x08\x00\x00\x00test-icc','latin1');
  const extended=Buffer.concat([avatar.subarray(0,12),header,icc,avatar.subarray(12)]);
  extended.writeUInt32LE(extended.length-8,4);
  const wrongSize=Buffer.from(extended);wrongSize[24]=127;
  assert.equal((await upload(wrongSize)).status,400);
  const animated=Buffer.from(extended);animated[20]|=2;
  assert.equal((await upload(animated)).status,400);
  const uploaded=await upload(extended);
  assert.equal(uploaded.status,200,await uploaded.clone().text());
  const photo=await mf.dispatchFetch(photoUrl,{headers:{'oai-authenticated-user-id':'teacher-a'}});
  assert.equal(photo.status,200);
  assert.equal(photo.headers.get('Content-Type'),'image/webp');
  assert.deepEqual(Buffer.from(await photo.arrayBuffer()),avatar,'stored image must omit the extended header and ICC metadata');
  assert.equal((await mf.dispatchFetch('https://mahela-classroom.lahzehtv.chatgpt.site/api/photo',{headers:{'oai-authenticated-user-id':'teacher-b'}})).status,404);
 }finally{await mf.dispose()}
});
