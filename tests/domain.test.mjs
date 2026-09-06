import assert from 'node:assert/strict';
import test from 'node:test';
import {sampleWorkspace,workspaceSchema,validateWorkspace,billable,weekStart,addDays,moneyTotals,formatTotals,validMoney} from '../lib/model.ts';
const fresh=()=>sampleWorkspace('2026-09-05');
test('sample data has valid records, consistent balances and no collisions',()=>{const w=fresh();workspaceSchema.parse(w);validateWorkspace(w);assert.equal(w.students.length,5);assert.equal(w.sessions.filter(s=>billable(s)&&!s.paid).length,8);assert.equal(weekStart('2026-09-05'),'2026-09-05');assert.equal(addDays('2028-02-28',1),'2028-02-29')});
test('overlapping sessions are rejected; adjacent sessions are allowed',()=>{const w=fresh(),s={...w.sessions[0],id:'extra',time:'09:30'};w.sessions.push(s);assert.throws(()=>validateWorkspace(w),/overlaps/);s.time='10:00';validateWorkspace(w)});
test('teacher cancellations are never billable; student cancellation can be charged',()=>{const w=fresh(),s=w.sessions[0];s.status='cancelled';s.cancelReason='teacher';s.charge=true;assert.equal(billable(s),false);assert.throws(()=>validateWorkspace(w),/cannot be charged/);s.charge=false;validateWorkspace(w);s.cancelReason='student';s.charge=true;assert.equal(billable(s),true);validateWorkspace(w)});
test('completed fees may be settled, scheduled sessions cannot be settled',()=>{const w=fresh(),s=w.sessions[0];s.paid=true;s.paidAt=new Date().toISOString();assert.throws(()=>validateWorkspace(w),/Only billable/);s.status='held';validateWorkspace(w)});
test('real paid session amounts and history cannot be changed or deleted',()=>{const before=fresh();before.demo=false;const next=structuredClone(before),s=next.sessions.find(x=>x.paid);s.rate+=100;assert.throws(()=>validateWorkspace(next,before),/cannot be changed/);const deleted=structuredClone(before);deleted.sessions=deleted.sessions.filter(x=>x.id!==s.id);assert.throws(()=>validateWorkspace(deleted,before),/cannot be changed/)});
test('student email uniqueness, skill score bounds and record references are enforced',()=>{const w=fresh();w.students[1].email=w.students[0].email.toUpperCase();assert.throws(()=>validateWorkspace(w),/already in use/);const a=fresh();a.students[0].skills.reading=9.5;assert.equal(workspaceSchema.safeParse(a).success,false);const b=fresh();b.sessions[0].studentId='missing';assert.throws(()=>validateWorkspace(b),/Student not found/)});

test('currency totals preserve cents and never combine dollars with toman',()=>{
 assert.deepEqual(moneyTotals([{rate:450000,currency:'TOMAN'},{rate:0.1,currency:'USD'},{rate:0.2,currency:'USD'}]),{TOMAN:450000,USD:0.3});
 assert.equal(formatTotals([{rate:0,currency:'USD'}],'en'),'0 USD');
 assert.equal(validMoney(22.99,'USD'),true);assert.equal(validMoney(22.999,'USD'),false);assert.equal(validMoney(1000.5,'TOMAN'),false);
 const w=fresh();w.students[0].currency='USD';w.students[0].rate=22.999;assert.throws(()=>validateWorkspace(w),/precision/);
});
test('legacy records default to toman, and paid historical currency cannot change',()=>{
 const old=fresh();old.demo=false;delete old.profile.currency;for(const s of [...old.students,...old.sessions])delete s.currency;
 const next=workspaceSchema.parse(old);assert.equal(next.profile.currency,'TOMAN');assert(next.sessions.every(s=>s.currency==='TOMAN'));
 next.profile.currency='USD';next.students[0].currency='USD';next.students[0].rate=24.99;validateWorkspace(next,old);
 const paid=next.sessions.find(s=>s.paid);paid.currency='USD';assert.throws(()=>validateWorkspace(next,old),/cannot be changed/);
});
