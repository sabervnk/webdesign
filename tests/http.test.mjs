import test from 'node:test';
import assert from 'node:assert/strict';
import {payload,readBytes,RequestError} from '../lib/server/http.ts';

test('JSON requests reject malformed and non-object bodies as client errors',async()=>{
 for(const body of ['{','null','[]','42','"text"','']){
  await assert.rejects(payload(new Request('https://example.test',{method:'POST',body})),e=>e instanceof RequestError&&e.status===400);
 }
 assert.deepEqual(await payload(new Request('https://example.test',{method:'POST',body:'{"name":"مهتا"}'})),{name:'مهتا'});
});

test('chunked request size is bounded by bytes and stops reading on overflow',async()=>{
 let cancelled=false;
 const body=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(8))},cancel(){cancelled=true}});
 await assert.rejects(readBytes(new Request('https://example.test',{method:'POST',body,duplex:'half'}),12),e=>e.status===413);
 assert.equal(cancelled,true);
 await assert.rejects(payload(new Request('https://example.test',{method:'POST',body:'{"text":"مهتا"}'}),15),e=>e.status===413);
 const result=await readBytes(new Request('https://example.test',{method:'POST',body:'1234'}),4);
 assert.equal(result.byteLength,4);
});
