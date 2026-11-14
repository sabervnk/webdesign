import assert from 'node:assert/strict';
import test from 'node:test';
import {safeLink,mediaReferences,categoryLabel} from '../lib/blog.ts';
test('blog links reject script, data, protocol-relative and foreign local routes',()=>{
 for(const value of ['javascript:alert(1)','data:text/html,bad','//evil.test','/api/admin/accounts','https://x.test/<script>'])assert.equal(safeLink(value),undefined);
 assert.equal(safeLink('https://example.com/lesson'),'https://example.com/lesson');assert.equal(categoryLabel('آموزش کودکان','fa'),'آموزش کودکان');
});
test('media references include translations and cover images, deduplicated',()=>{
 const id='da43acbc-0388-40d4-99ac-39e52a435b41',other='f882f215-e72e-463b-8ac6-7f1ee1cfe97a';
 assert.deepEqual(mediaReferences({content:'![caption](/api/blog-media/'+id+')',coverImage:'/api/blog-media/'+id,translations:{en:{content:'@[video](/api/blog-media/'+other+')'}}}),[id,other]);
});
