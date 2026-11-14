import test from 'node:test';import assert from 'node:assert/strict';
import {richDelta,richStorage,richPlain} from '../lib/rich-text.ts';
test('Quill conversion retains existing text, headings, lists, quote and inline formats',()=>{
 const text='## Teaching notes\n\nHello **reader**, *welcome*.\n\n- One\n- Two\n\n1. First\n2. Second\n\n> Remember this';
 assert.equal(richStorage(richDelta(text)),text);assert.equal(richStorage(richDelta('')),'');assert.equal(richPlain('**Hello** *world*'),'Hello world');
});
test('combined bold, italic and links survive editing and unsafe links lose their target',()=>{
 const text='***Important*** [**source**](https://example.com)';assert.equal(richStorage(richDelta(text)),text);
 assert.equal(richPlain('[label](javascript:alert(1))').includes('javascript:'),false);
});
test('blog images and videos retain owned URLs and captions in Quill',()=>{
 const url='/api/blog-media/f882f215-e72e-463b-8ac6-7f1ee1cfe97a';const text='![Teaching image]('+url+')\n\n@[Lesson video]('+url+')';assert.equal(richStorage(richDelta(text)),text);
 assert(!richStorage({ops:[{insert:{lessonImage:{src:'data:text/html,evil',caption:'x'}}}]}).includes('data:'));
});
