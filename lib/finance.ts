import type {Workspace,Session,Student,Currency} from './model';
import {pricingFor,proportionalFee} from './session-policy.ts';
export type CommissionPolicy={percent:number;students:Record<string,number>;version:number;sessions?:Record<string,number>;referrals?:Record<string,number>};
export const defaultCommission:CommissionPolicy={percent:0,students:{},version:0};
export function commissionFor(student:Student|undefined,policy:CommissionPolicy){return student?(policy.students[student.id]??(policy.version===0&&student.sourceInquiryId?policy.referrals?.[student.sourceInquiryId]:undefined)??policy.percent):policy.percent}
export function feeSplit(s:Pick<Session,'rate'|'currency'|'commissionPercent'>){const percent=s.commissionPercent??0,factor=s.currency==='USD'?100:1,total=Math.round(s.rate*factor),admin=Math.round(total*percent/100);return {percent,teacherPercent:100-percent,admin:admin/factor,teacher:(total-admin)/factor,total:total/factor}}
// One-time upgrade of unpriced legacy classes. Settled receipts are immutable.
export function normalizeFinance(w:Workspace,policy?:CommissionPolicy):Workspace{
 return {...w,students:w.students.map(s=>policy?{...s,commissionPercent:commissionFor(s,policy)}:s),sessions:w.sessions.map(s=>{
  if(s.paid)return s;
  const student=w.students.find(x=>x.id===s.studentId);if(!student)return s;
  const inherited=s.pricing&&!s.pricing.version&&s.pricing.baseRate===student.rate&&s.pricing.baseDuration===s.duration&&s.duration!==student.duration&&s.rate===student.rate&&s.currency===student.currency;
  const pricing={...(inherited?{baseRate:student.rate,baseDuration:student.duration,currency:student.currency}:pricingFor(s,student)),version:2 as const};
  return {...s,pricing,rate:proportionalFee(pricing.baseRate,pricing.baseDuration,s.duration,pricing.currency),currency:pricing.currency,...(policy?{commissionPercent:policy.sessions?.[s.id]??commissionFor(student,policy)}:{})};
 })};
}
export function splitTotals(rows:Session[]){const result={TOMAN:{total:0,teacher:0,admin:0},USD:{total:0,teacher:0,admin:0}};for(const s of rows){const f=feeSplit(s);for(const k of ['total','teacher','admin'] as const)result[s.currency][k]+=Math.round(f[k]*(s.currency==='USD'?100:1))}for(const k of ['total','teacher','admin'] as const)result.USD[k]/=100;return result}
