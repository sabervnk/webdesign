import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeFinance,feeSplit,splitTotals} from '../lib/finance.ts';
import {sessionNotes,withSessionNotes} from '../lib/session-notes.ts';
import {translationChunks,translateSegment,preferredTranslation} from '../lib/translation.ts';
const student={id:'one',rate:1000000,duration:60,currency:'TOMAN'};
const session={id:'class',studentId:'one',rate:1000000,duration:90,currency:'TOMAN',paid:false,note:'Previous note',date:'2026-11-10',time:'18:00',status:'held'};
const workspace={students:[student],sessions:[session]};
test('legacy 90-minute unpaid class uses the one-hour baseline once, including a snapshot created by the old form',()=>{
 for(const s of [session,{...session,pricing:{baseRate:1000000,baseDuration:90,currency:'TOMAN'}}]){const next=normalizeFinance({...workspace,sessions:[s]});assert.equal(next.sessions[0].rate,1500000);assert.equal(next.sessions[0].pricing.baseDuration,60);assert.deepEqual(normalizeFinance(next),next);assert.equal(normalizeFinance({...next,students:[{...student,rate:2000000}]}).sessions[0].rate,1500000)}
 const settled={...session,paid:true};assert.deepEqual(normalizeFinance({...workspace,sessions:[settled]}).sessions[0],settled);
 const negotiated={...session,rate:800000};assert.equal(normalizeFinance({...workspace,sessions:[negotiated]}).sessions[0].rate,800000);
});
test('commission shares use minor-unit rounding and the teacher receives the exact remainder',()=>{
 assert.deepEqual(feeSplit({...session,rate:1500000,commissionPercent:20}),{percent:20,teacherPercent:80,admin:300000,teacher:1200000,total:1500000});
 const rows=[{...session,currency:'USD',rate:.01,commissionPercent:50},{...session,currency:'USD',rate:13.33,commissionPercent:33.33}];
 for(const row of rows){const split=feeSplit(row);assert.equal(Math.round((split.admin+split.teacher)*100),Math.round(row.rate*100))}
 const sums=splitTotals(rows);assert.equal(Math.round((sums.USD.admin+sums.USD.teacher)*100),Math.round(sums.USD.total*100));
 const policy={percent:15,students:{},referrals:{ref:25},version:1};assert.equal(normalizeFinance({...workspace,students:[{...student,sourceInquiryId:'ref'}]},policy).sessions[0].commissionPercent,15);policy.students.one=10;assert.equal(normalizeFinance(workspace,policy).sessions[0].commissionPercent,10);
});
test('independent class notes preserve timestamps through editing and deletion, with old notes kept once',()=>{
 const s={...session,noteHistory:[{note:'Earlier',status:'scheduled',at:'2026-11-09T06:00:00Z'}]};let notes=sessionNotes(s);assert.equal(notes.length,2);assert.equal(notes.find(n=>n.id==='legacy-note').dateUnknown,true);
 notes.push({id:'new',text:'New note',createdAt:'2026-11-14T08:00:00Z'});let next=withSessionNotes(s,notes);assert.equal(next.note,'');assert.deepEqual(next.noteHistory,[]);assert.equal(sessionNotes(next).length,3);
 next=withSessionNotes(next,sessionNotes(next).map(n=>n.id==='new'?{...n,text:'Edited',updatedAt:'2026-11-14T09:00:00Z'}:n));assert.equal(next.notes.find(n=>n.id==='new').createdAt,'2026-11-14T08:00:00Z');assert.equal(withSessionNotes(next,sessionNotes(next).filter(n=>n.id!=='new')).notes.length,2);
});
test('translation prioritizes manual text, bounds UTF-8 requests and rejects quota/error pages',async()=>{
 assert.equal(preferredTranslation('فارسی','Hand-written','Automatic'),'Hand-written');assert.equal(preferredTranslation('فارسی','   ','Automatic'),'Automatic');
 const text='یادداشت فارسی '.repeat(300),chunks=translationChunks(text);assert.equal(chunks.join(''),text);assert(chunks.every(c=>new TextEncoder().encode(c).length<=480));
 assert.equal(await translateSegment('سلام','en',async url=>{assert.equal(url.searchParams.get('langpair'),'fa|en');return Response.json({responseStatus:200,responseData:{translatedText:'Hello &amp; welcome'}})}),'Hello & welcome');
 await assert.rejects(()=>translateSegment('سلام','en',async()=>Response.json({responseStatus:429,quotaFinished:true,responseData:{translatedText:'QUOTA EXCEEDED'}})));
});

test('teacher policy and per-class override preserve settled money and support explicit no commission',()=>{
 const policy={percent:12.5,students:{one:15},sessions:{class:22.25},version:2};
 const data=normalizeFinance(workspace,policy);assert.equal(data.sessions[0].commissionPercent,22.25);assert.equal(data.students[0].commissionPercent,15);
 const split=feeSplit(data.sessions[0]);assert.equal(split.admin,333750);assert.equal(split.teacher,1166250);
 assert.equal(normalizeFinance(workspace,{...policy,sessions:{class:0}}).sessions[0].commissionPercent,0);
 assert.equal(normalizeFinance(workspace,{...policy,sessions:{}}).sessions[0].commissionPercent,15);
 const settled={...data.sessions[0],paid:true};assert.deepEqual(normalizeFinance({...workspace,sessions:[settled]},{...policy,percent:99,sessions:{class:1}}).sessions[0],settled);
});
