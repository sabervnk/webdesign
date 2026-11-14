import test from 'node:test';import assert from 'node:assert/strict';
import {proportionalFee,pricingFor,changeSessionStatus,sessionEndTimestamp,sessionNeedsReview,tehranDay} from '../lib/session-policy.ts';
test('session duration prorates currency precisely from one immutable baseline',()=>{
 assert.equal(proportionalFee(600000,60,90,'TOMAN'),900000);assert.equal(proportionalFee(600000,60,30,'TOMAN'),300000);assert.equal(proportionalFee(13.33,60,90,'USD'),20);
 assert.equal(proportionalFee(100001,60,45,'TOMAN'),75001);assert.equal(proportionalFee(0,60,90,'USD'),0);
 for(const duration of [0,NaN,-30])assert.throws(()=>proportionalFee(100,60,duration,'USD'));
});
test('old sessions keep their old price baseline after the student rate changes',()=>{
 const student={rate:900000,duration:60,currency:'TOMAN'},old={rate:300000,duration:60,currency:'TOMAN'};
 const base=pricingFor(old,student);assert.equal(base.baseRate,300000);assert.equal(proportionalFee(base.baseRate,base.baseDuration,90,base.currency),450000);
 const updated={...old,duration:90,rate:450000,pricing:base};assert.deepEqual(pricingFor(updated,student),base);assert.equal(proportionalFee(base.baseRate,base.baseDuration,120,base.currency),600000);
});
test('status changes open a fresh note while preserving the previous note and status',()=>{
 const before={id:'session',status:'held',note:'**Completed** chapter one',charge:false,cancelReason:'student'};
 const next=changeSessionStatus(before,'scheduled','2026-11-14T06:00:00Z');assert.equal(next.note,'');assert.equal(next.noteHistory[0].note,before.note);assert.equal(next.noteHistory[0].status,'held');assert.equal(before.noteHistory,undefined);
 assert.equal(changeSessionStatus(before,'held'),before);assert.equal(changeSessionStatus({...before,note:''},'cancelled').noteHistory.length,0);
});
test('overdue reminders use the Tehran class end, including the exact boundary',()=>{
 const s={date:'2026-11-14',time:'10:00',duration:90,status:'scheduled'};const end=Date.parse('2026-11-14T08:00:00Z');assert.equal(sessionEndTimestamp(s),end);
 assert.equal(sessionNeedsReview(s,end-1),false);assert.equal(sessionNeedsReview(s,end),true);assert.equal(sessionNeedsReview({...s,status:'held'},end),false);assert.equal(sessionNeedsReview({...s,status:'cancelled'},end),false);assert.equal(sessionNeedsReview(s,0),false);
 assert.equal(tehranDay(new Date('2026-11-14T21:00:00Z')),'2026-11-15');
});
