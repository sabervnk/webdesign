import test from 'node:test';import assert from 'node:assert/strict';
import {twoDigits,pasteTime,parseTimeParts,classMonths,chooseMonthDay,classDraftKey,validClassDate} from '../lib/class-form.ts';
test('time fields normalize Persian and Arabic digits and never retain more than two digits',()=>{
 assert.equal(twoDigits('۱۲۳۴'),'12');assert.equal(twoDigits('٤٥'),'45');assert.equal(twoDigits('a9!'),'9');assert.deepEqual(pasteTime('۱۴:۳۰'),{hours:'14',minutes:'30'});assert.deepEqual(pasteTime('0930'),{hours:'09',minutes:'30'});
 assert.deepEqual(parseTimeParts('23','59'),{hours:23,minutes:59,total:1439});for(const [h,m] of [['24','00'],['09','60'],['','00'],['123','00']])assert.equal(parseTimeParts(h,m),null);
 assert.equal(parseTimeParts('01','30',5).total,90);assert.equal(parseTimeParts('06','00',5),null);
});
test('month selection can move forward, backward and return without empty days in either calendar',()=>{
 for(const calendar of ['persian','gregory']){const today='2026-11-14';let selected=today;let groups=classMonths(today,selected,calendar,'fa-IR',false);const first=groups.findIndex(x=>x.days.includes(today));assert(first>=0);const original=groups[first].key;
 for(const index of [first+1,first+2,first,first+1,first]){const key=groups[index].key;selected=chooseMonthDay(groups[index],selected,calendar,today,false);assert(validClassDate(selected));assert(selected>=today);groups=classMonths(today,selected,calendar,'fa-IR',false);const active=groups.find(x=>x.key===key);assert(active.days.includes(selected));assert(active.days.length>0)}
 assert.equal(groups.find(x=>x.days.includes(selected)).key,original);
 }
});
test('editing an older class keeps its selected month and draft keys isolate users and classes',()=>{
 const groups=classMonths('2026-11-14','2020-01-15','persian','fa-IR',true);assert(groups.some(x=>x.days.includes('2020-01-15')));
 assert.notEqual(classDraftKey('teacher-a',undefined,undefined,'2026-11-14'),classDraftKey('teacher-b',undefined,undefined,'2026-11-14'));assert.notEqual(classDraftKey('teacher-a','class-1',undefined,'2026-11-14'),classDraftKey('teacher-a','class-2',undefined,'2026-11-14'));
 assert.equal(validClassDate('2026-02-30'),false);
});
