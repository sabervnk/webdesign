import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

// Atomic in-memory implementation of the documented remote Blobs CAS contract.
// Two independently loaded adapters represent separate serverless instances.
// The official local Blobs emulator checks ETags before an awaited filesystem
// rename, so it cannot validate cross-process atomicity by itself.
test('independent Netlify instances preserve writes and reject stale versions',async()=>{
 await mkdir('work',{recursive:true});const dir=await mkdtemp(resolve('work/storage-test-'));
 let snapshot=null,revision=0,rejections=0,failNext=false;
 globalThis.__mahelaTestStore={
  async getWithMetadata(){return snapshot?{data:snapshot.slice(0),etag:String(revision),metadata:{}}:null},
  async set(_key,value,options){
   if(failNext){failNext=false;throw new Error('Simulated storage outage')}
   if((options.onlyIfNew&&snapshot)||(options.onlyIfMatch&&options.onlyIfMatch!==String(revision))){rejections++;return {modified:false}}
   snapshot=value.slice(0);revision++;return {modified:true,etag:String(revision)};
  }
 };
 try{
  const outfile=resolve(dir,'adapter.mjs');
  await build({entryPoints:['platform/netlify/storage.ts'],outfile,bundle:true,platform:'node',format:'esm',external:['sql.js/dist/sql-asm.js'],plugins:[{name:'test-store',setup(b){b.onResolve({filter:/^@netlify\/blobs$/},()=>({path:'test-store',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const getStore=()=>globalThis.__mahelaTestStore;'}))}}]});
  const one=(await import(pathToFileURL(outfile).href+'?one')).database();
  const two=(await import(pathToFileURL(outfile).href+'?two')).database();
  const insert=(db,id)=>db.prepare('INSERT INTO teacher_workspaces(owner_id,data,version,updated_at) VALUES(?,?,1,?)').bind(id,'{}','today').run();
  await Promise.all([insert(one,'a'),insert(two,'b')]);
  assert.equal((await one.prepare('SELECT COUNT(*) AS n FROM teacher_workspaces').first()).n,2);
  assert(rejections>0,'must exercise a remote conditional-write rejection');
  const update=(db,id,name,version)=>db.prepare('UPDATE teacher_workspaces SET data=?,version=version+1 WHERE owner_id=? AND version=?').bind(JSON.stringify({name}),id,version).run();
  await Promise.all([update(one,'a','Teacher A',1),update(two,'b','Teacher B',1)]);
  assert.equal(JSON.parse((await two.prepare('SELECT data FROM teacher_workspaces WHERE owner_id=?').bind('a').first()).data).name,'Teacher A');
  assert.equal(JSON.parse((await one.prepare('SELECT data FROM teacher_workspaces WHERE owner_id=?').bind('b').first()).data).name,'Teacher B');
  const conflicting=await Promise.all([update(one,'a','First tab',2),update(two,'a','Second tab',2)]);
  assert.deepEqual(conflicting.map(r=>r.meta.changes).sort(),[0,1]);
  failNext=true;
  await assert.rejects(insert(one,'failed'),/Simulated storage outage/);
  await insert(one,'after-failure');
  assert.equal((await two.prepare('SELECT COUNT(*) AS n FROM teacher_workspaces').first()).n,3);
 }finally{delete globalThis.__mahelaTestStore;await rm(dir,{recursive:true,force:true})}
});
