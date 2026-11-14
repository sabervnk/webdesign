import type {Currency,Session,Student} from './model';
export type SessionPricing={baseRate:number;baseDuration:number;currency:Currency};
export function proportionalFee(baseRate:number,baseDuration:number,duration:number,currency:Currency){
 if(!Number.isFinite(baseRate)||baseRate<0||!Number.isFinite(baseDuration)||baseDuration<=0||!Number.isFinite(duration)||duration<=0)throw Error('مبلغ یا مدت پایه معتبر نیست.');
 const factor=currency==='USD'?100:1;return Math.round(Math.round(baseRate*factor)*duration/baseDuration)/factor;
}
export function pricingFor(session:Session|undefined,student:Student):SessionPricing{return session?.pricing??{baseRate:session?.rate??student.rate,baseDuration:session?.duration??student.duration,currency:session?.currency??student.currency}}
export function changeSessionStatus(session:Session,status:Session['status'],at=new Date().toISOString()):Session{
 if(status===session.status)return session;
 const history=[...(session.noteHistory??[]),...(session.note.trim()?[{note:session.note,status:session.status,at}]:[])];
 return {...session,status,note:'',noteHistory:history.slice(-100),charge:status==='cancelled'&&session.cancelReason!=='teacher'?session.charge:false};
}
export function tehranDay(now=new Date()){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day}
export function sessionEndTimestamp(session:Pick<Session,'date'|'time'|'duration'>){
 const [y,m,d]=session.date.split('-').map(Number),[h,min]=session.time.split(':').map(Number),utc=Date.UTC(y,m-1,d,h,min);
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(utc));
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));const displayed=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);return utc-(displayed-utc)+session.duration*60000;
}
export const sessionNeedsReview=(session:Session,now:number)=>now>0&&session.status==='scheduled'&&sessionEndTimestamp(session)<=now;
