import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {structureContent} from '../lib/content-structure.ts';

test('content navigation keeps every existing editable key and groups page copy in display order',()=>{
 const catalogue=JSON.parse(readFileSync('lib/site-copy-catalogue.json','utf8'));
 const structure=structureContent(catalogue);
 assert.equal(structure.entries.length,catalogue.length);
 assert.deepEqual(structure.entries.map(x=>x.item.key),catalogue.map(x=>x.key));
 assert.equal(structure.pages[0],'صفحهٔ اصلی');
 assert.deepEqual(structure.sections('صفحهٔ اصلی'),['معرفی و تصویر آغازین','مراحل انتخاب معلم','معلم‌های پیشنهادی','نوشته‌های معلم‌ها','دعوت به تماس']);
 const byKey=key=>structure.entries.find(x=>x.item.key===key);
 assert.deepEqual([byKey('1kn2jcq').page,byKey('1kn2jcq').section,byKey('1kn2jcq').detail],['صفحهٔ اصلی','معرفی و تصویر آغازین',false]);
 assert.deepEqual([byKey('12sxo22').page,byKey('12sxo22').section,byKey('12sxo22').detail],['صفحهٔ اصلی','مراحل انتخاب معلم',false]);
 assert.deepEqual([byKey('nbdqg9').page,byKey('nbdqg9').section],['صفحهٔ معلم‌ها','جست‌وجو و فیلتر معلم']);
 assert.equal(byKey('cj54lo').detail,true);
});
