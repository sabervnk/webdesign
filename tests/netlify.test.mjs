import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {randomBytes} from 'node:crypto';
import {BlobsServer} from '@netlify/blobs/server';

test('Netlify production: persistent data, safe login, teacher isolation and public requests', {timeout:120000,skip:process.env.TEST_NETLIFY!=='1'},async()=>{
 const directory=await mkdtemp(join(tmpdir(),'mahela-netlify-'));
 const blobs=new BlobsServer({directory,token:'local-test-token',logger:()=>{}});
 const address=await blobs.start();
 const adminPassword=randomBytes(24).toString('hex');
 const invite=randomBytes(24).toString('hex');
 const listener=createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
 let app;let origin=`http://127.0.0.1:${port}`;let output='';
 const env={...process.env,MAHELA_SITE_URL:origin,NEXT_PUBLIC_HOSTING_TARGET:'netlify',MAHELA_ADMIN_PASSWORD:adminPassword,MAHELA_SESSION_SECRET:randomBytes(32).toString('hex'),MAHELA_TEACHER_INVITE_CODE:invite,NETLIFY_BLOBS_CONTEXT:Buffer.from(JSON.stringify({siteID:'local-site',token:'local-test-token',edgeURL:`http://localhost:${address.port}`,uncachedEdgeURL:`http://localhost:${address.port}`})).toString('base64')};
 async function start(){
  app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port',String(port),'--hostname','127.0.0.1'],{env,stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{let done=false;const timer=setTimeout(()=>reject(new Error('Server not ready: '+output)),20000);const read=b=>{output+=b;const m=output.match(/Local:\s+(http:\/\/127\.0\.0\.1:\d+)/);if(m)origin=m[1];if(!done&&origin&&output.includes('Ready in')){done=true;clearTimeout(timer);resolve()}};app.stdout.on('data',read);app.stderr.on('data',read);app.once('exit',()=>{if(!done){clearTimeout(timer);reject(new Error(output))}})});
 }
 async function stop(){if(app&&app.exitCode===null){app.kill('SIGTERM');await once(app,'exit')}}
 const request=(path,cookie,method='GET',body,headers={})=>fetch(origin+path,{method,redirect:'manual',headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json',Origin:origin}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
 const ok=async(r,status=200)=>{assert.equal(r.status,status,await r.clone().text());return r.json()};
 async function login(email,password,register=false){const r=await request('/api/auth/'+(register?'register':'login'),null,'POST',{email,password,invite,displayName:'Test teacher',returnTo:'/dashboard'});await ok(r);assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);return r.headers.get('set-cookie').split(';')[0]}
 try{
  await start();
  for(const path of ['/','/teachers','/blog','/contact','/signin']){const r=await request(path);assert.equal(r.status,200,path);assert(!(await r.text()).includes('Could not load site content'),path)}
  assert.equal((await request('/dashboard')).status,307);
  assert.equal((await request('/api/workspace',null,'GET',null,{'oai-authenticated-user-id':'admin','oai-authenticated-user-email':'lahzetv@gmail.com'})).status,401);
  const admin=await login('lahzetv@gmail.com',adminPassword);
  const a=await login('teacher-a@example.com','teacher-password-for-test',true);
  const b=await login('teacher-b@example.com','another-password-for-test',true);
  const session=JSON.parse(Buffer.from(a.split('=')[1].split('.')[0],'base64url').toString());
  assert.deepEqual(Object.keys(session).sort(),['aud','displayName','email','exp','id']);
  assert.equal((await request('/api/admin/requests',a)).status,403);
  assert.equal((await request('/api/workspace',a+'tampered')).status,401);
  assert.equal((await request('/api/auth/register',null,'POST',{email:'no@example.com',password:'a-long-enough-password',invite:'wrong'})).status,403);
  const workspace=await ok(await request('/api/workspace',a));workspace.data.profile.name='Persistent teacher';
  await ok(await request('/api/workspace',a,'PUT',workspace));
  assert.equal((await request('/api/workspace',a,'PUT',workspace)).status,409);
  assert.notEqual((await ok(await request('/api/workspace',b))).data.profile.name,'Persistent teacher');
  const studio=await ok(await request('/api/studio',a));
  const profile={...studio.profile,name:'معلم آزمایشی',headline:'تمرین مکالمه انگلیسی',bio:'معرفی واقعی برای بررسی مسیر انتشار پرتفولیو و ارائه کلاس‌های زبان با تمرین و بازخورد آموزشی.',published:true,currency:'USD',rate:24.99,languages:['en'],formats:['online']};
  await ok(await request('/api/studio/profile',a,'PUT',{profile,version:1}));
  const article={title:'Conversation practice',excerpt:'Learning with feedback.',content:'Practice and feedback help language learners improve. '.repeat(8),category:'learning',status:'published'};
  const post=await ok(await request('/api/studio/posts',a,'POST',{article}),201);
  assert.equal((await request('/api/studio/posts?id='+post.id,b)).status,404);
  assert.equal((await request('/teachers/'+profile.id)).status,200);
  assert.equal((await request('/blog/'+post.id)).status,200);
  const inquiry={id:crypto.randomUUID(),kind:'class',teacherId:profile.id,teacherVersion:2,name:'Learner',email:'learner@example.com',phone:'09121234567',language:'en',format:'online',message:'I would like to arrange a class.',rate:1,currency:'TOMAN'};
  await ok(await request('/api/requests',null,'POST',inquiry),201);
  const inbox=await ok(await request('/api/admin/requests',admin));
  assert.equal(inbox.requests[0].rate,24.99);assert.equal(inbox.requests[0].currency,'USD');
  assert.equal((await request('/api/studio/profile',a,'PUT',{profile,version:2},{Origin:'https://evil.example'})).status,403);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jPdwAAAAASUVORK5CYII=','base64');
  await ok(await fetch(origin+'/api/photo',{method:'POST',headers:{Cookie:a,Origin:origin,'Content-Type':'image/png'},body:png}));
  assert.equal((await request('/api/photo',a)).status,200);assert.equal((await request('/api/photo',b)).status,404);
  // Parallel requests must not discard either independent user's changes.
  const wa=await ok(await request('/api/workspace',a));const wb=await ok(await request('/api/workspace',b));wa.data.profile.name='Parallel A';wb.data.profile.name='Parallel B';
  await Promise.all([request('/api/workspace',a,'PUT',wa).then(ok),request('/api/workspace',b,'PUT',wb).then(ok)]);
  assert.equal((await ok(await request('/api/workspace',a))).data.profile.name,'Parallel A');
  assert.equal((await ok(await request('/api/workspace',b))).data.profile.name,'Parallel B');
  await stop();output='';await start();
  assert.equal((await ok(await request('/api/workspace',a))).data.profile.name,'Parallel A');
  assert.equal((await request('/api/photo',a)).status,200);
  assert.equal((await ok(await request('/api/admin/requests',admin))).requests.length,1);
  const logout=await request('/api/auth/logout',a,'POST');assert.equal(logout.status,204);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
 }finally{await stop();await blobs.stop();await rm(directory,{recursive:true,force:true})}
});
