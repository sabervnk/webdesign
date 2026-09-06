import { z } from 'zod';
export const levels=['A1','A2','B1','B2','C1','C2'] as const;
export const skillKeys=['listening','speaking','reading','writing'] as const;
export const currencies=['TOMAN','USD'] as const;
export type Currency=typeof currencies[number];
const currencySchema=z.enum(currencies).default('TOMAN');
const score=z.number().min(0).max(9).multipleOf(.5);
const skills=z.object({listening:score,speaking:score,reading:score,writing:score});
export const studentSchema=z.object({id:z.string().min(1).max(80),name:z.string().trim().min(2).max(100),email:z.string().email().max(200),phone:z.string().regex(/^\+?[\d\s()-]{8,22}$/),level:z.enum(levels),gender:z.enum(['female','male','unspecified']),rate:z.number().min(0).max(100000000),currency:currencySchema,duration:z.number().int().min(15).max(300),since:z.string().max(30),skills,tone:z.number().int().min(0).max(4)});
export const sessionSchema=z.object({id:z.string().min(1).max(80),studentId:z.string().max(80),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),duration:z.number().int().min(15).max(300),type:z.enum(['online','in-person']),status:z.enum(['scheduled','held','cancelled']),cancelReason:z.enum(['teacher','student','no-show']),charge:z.boolean(),note:z.string().max(2000),rate:z.number().min(0).max(100000000),currency:currencySchema,paid:z.boolean(),paidAt:z.string().max(40)});
export const assessmentSchema=z.object({id:z.string().max(80),studentId:z.string().max(80),date:z.string().max(40),skills,note:z.string().max(2000)});
export const messageSchema=z.object({id:z.string().max(80),studentId:z.string().max(80),text:z.string().trim().min(1).max(4000),date:z.string().max(40),direction:z.enum(['in','out']),sample:z.boolean()});
export const workspaceSchema=z.object({demo:z.boolean(),profile:z.object({name:z.string().trim().min(2).max(100),email:z.string().email().or(z.literal('')),phone:z.string().max(30),specialization:z.string().max(100),bio:z.string().max(1500),photo:z.string().max(200),calendar:z.enum(['auto','persian','gregory']),currency:currencySchema}),students:z.array(studentSchema).max(2000),sessions:z.array(sessionSchema).max(10000),assessments:z.array(assessmentSchema).max(10000),messages:z.array(messageSchema).max(10000)});
export type Student=z.infer<typeof studentSchema>;export type Session=z.infer<typeof sessionSchema>;export type Assessment=z.infer<typeof assessmentSchema>;export type Message=z.infer<typeof messageSchema>;export type Workspace=z.infer<typeof workspaceSchema>;export type Skills=Student['skills'];
export function dateKey(d:Date){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
export function dateFrom(s:string){return new Date(s+'T12:00:00')}
export function addDays(s:string,n:number){const d=dateFrom(s);d.setDate(d.getDate()+n);return dateKey(d)}
export function weekStart(s:string){const d=dateFrom(s);return addDays(s,-((d.getDay()+1)%7))}
export function timeNumber(t:string){const [h,m]=t.split(':').map(Number);return h*60+m}
export function endTime(s:Pick<Session,'time'|'duration'>){const t=timeNumber(s.time)+s.duration;return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`}
export function billable(s:Session){return s.status==='held'||(s.status==='cancelled'&&s.cancelReason!=='teacher'&&s.charge)}
export function average(s:Skills){return Math.round((s.listening+s.speaking+s.reading+s.writing)/4*10)/10}
export function validateWorkspace(next:Workspace,previous?:Workspace){
 if(previous)previous=workspaceSchema.parse(previous);
 for(const x of [...next.students,...next.sessions])if(!validMoney(x.rate,x.currency||'TOMAN'))throw new Error('مبلغ تومان باید عدد صحیح و مبلغ دلار حداکثر دو رقم اعشار داشته باشد. / Invalid currency precision.');
 for(const list of [next.students,next.sessions,next.assessments,next.messages]){if(new Set(list.map(x=>x.id)).size!==list.length)throw new Error('شناسه تکراری است. / Duplicate identifier.');}
 const ids=new Set(next.students.map(x=>x.id));
 if([...next.sessions,...next.assessments,...next.messages].some(x=>!ids.has(x.studentId)))throw new Error('زبان‌آموز این رکورد وجود ندارد. / Student not found.');
 if(new Set(next.students.map(s=>s.email.toLowerCase())).size!==next.students.length)throw new Error('این ایمیل برای زبان‌آموز دیگری ثبت شده است. / Email already in use.');
 for(const s of next.sessions){
  if(Number.isNaN(dateFrom(s.date).getTime())||dateKey(dateFrom(s.date))!==s.date)throw new Error('تاریخ معتبر نیست. / Invalid date.');
  if(timeNumber(s.time)+s.duration>1440)throw new Error('پایان جلسه باید در همین روز باشد. / Session must end on the same day.');
  if(s.status==='cancelled'&&s.cancelReason==='teacher'&&s.charge)throw new Error('لغو از طرف معلم بدون شهریه است. / Teacher cancellations cannot be charged.');
  if(s.paid&&!billable(s))throw new Error('فقط جلسات مشمول شهریه قابل تسویه هستند. / Only billable sessions can be settled.');
 }
 const active=next.sessions.filter(s=>s.status!=='cancelled').sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 for(let i=1;i<active.length;i++){const a=active[i-1],b=active[i];if(a.date===b.date&&timeNumber(a.time)+a.duration>timeNumber(b.time))throw new Error('این زمان با یک کلاس دیگر تداخل دارد. / This session overlaps another class.');}
 if(previous&&!previous.demo){for(const old of previous.sessions.filter(s=>s.paid)){const n=next.sessions.find(s=>s.id===old.id);if(!n||JSON.stringify(n)!==JSON.stringify(old))throw new Error('جلسه تسویه‌شده قابل تغییر نیست. / A paid session cannot be changed.');}}
}
export function emptyWorkspace(email=''):Workspace{return {demo:false,profile:{name:'معلم',email,phone:'',specialization:'مدرس زبان انگلیسی',bio:'',photo:'',calendar:'auto',currency:'TOMAN'},students:[],sessions:[],assessments:[],messages:[]}}
export function sampleWorkspace(today:string):Workspace{
 const w=emptyWorkspace();w.demo=true;w.profile.name='مهتا احمدی';
 const roster=[['elena','النا کیم','elena@example.com','B2',280000,60,6.5,6,7,6],['daniel','دنیل کروز','daniel@example.com','B1',250000,60,5.5,5,6,5],['sara','سارا احمدی','sara@example.com','C1',300000,60,7.5,7,8,7],['marco','مارکو روسی','marco@example.com','B1',250000,60,5,4.5,5.5,4.5],['yuki','یوکی تاناکا','yuki@example.com','A2',220000,45,4,3.5,4.5,3.5]];
 w.students=roster.map((r,i)=>({id:r[0] as string,name:r[1] as string,email:r[2] as string,level:r[3] as Student['level'],rate:r[4] as number,currency:'TOMAN',duration:r[5] as number,skills:{listening:r[6] as number,speaking:r[7] as number,reading:r[8] as number,writing:r[9] as number},tone:i,phone:`0912000000${i}`,since:addDays(today,-60-i*16),gender:i%2?'male':'female'}));
 const make=(id:string,studentId:string,date:string,time:string,status:Session['status']='scheduled',paid=false):Session=>({id,studentId,date,time,duration:w.students.find(s=>s.id===studentId)!.duration,type:id.length%2?'online':'in-person',status,cancelReason:'student',charge:false,note:'',rate:w.students.find(s=>s.id===studentId)!.rate,currency:'TOMAN',paid,paidAt:paid?date+'T12:00:00.000Z':''});
 w.sessions=[make('demo-1','elena',today,'09:00'),make('demo-2','daniel',today,'11:00'),make('demo-3','sara',today,'15:30'),make('demo-4','marco',addDays(today,1),'10:00'),make('demo-5','yuki',addDays(today,2),'16:00'),make('demo-6','elena',addDays(today,3),'09:00'),make('demo-7','sara',addDays(today,4),'15:30'),make('demo-8','daniel',addDays(today,5),'11:00')];
 for(let i=0;i<16;i++){w.sessions.push(make('history-'+i,w.students[i%5].id,addDays(today,-1-i),i%2?'10:00':'16:00','held',i>7));}
 for(const s of w.students)for(let i=0;i<3;i++)w.assessments.push({id:`assessment-${s.id}-${i}`,studentId:s.id,date:addDays(today,-i*20)+'T12:00:00.000Z',skills:Object.fromEntries(Object.entries(s.skills).map(([k,v])=>[k,Math.max(0,v-i*.5)])) as Skills,note:i===0?'پیشرفت خوب در درک مطلب؛ تمرکز جلسه بعد روی مکالمه.':''});
 w.messages=[{id:'sample-message-1',studentId:'elena',text:'سلام استاد، برای جلسه بعد تمرین خاصی آماده کنم؟',date:addDays(today,-1)+'T14:00:00.000Z',direction:'in',sample:true},{id:'sample-message-2',studentId:'elena',text:'سلام النا! لطفاً تمرین‌های بخش Reading، درس پنجم را آماده کن.',date:addDays(today,-1)+'T14:12:00.000Z',direction:'out',sample:true}];return w;
}

export function validMoney(rate:number,currency:Currency){return Number.isFinite(rate)&&rate>=0&&(currency==='TOMAN'?Number.isSafeInteger(rate):Math.abs(Math.round(rate*100)-rate*100)<1e-6)}
export function moneyTotals(rows:Pick<Session,'rate'|'currency'>[]){const minor={TOMAN:0,USD:0};for(const r of rows){const c=r.currency||'TOMAN';minor[c]+=Math.round(r.rate*(c==='USD'?100:1))}return {TOMAN:minor.TOMAN,USD:minor.USD/100}}
export function currencyName(c:Currency,lang='fa'){return c==='USD'?(lang==='fa'?'دلار':'USD'):(lang==='fa'?'تومان':'toman')}
export function formatMoney(amount:number,currency:Currency,lang='fa'){return new Intl.NumberFormat(lang==='fa'?'fa-IR':'en-US',{maximumFractionDigits:currency==='USD'?2:0}).format(amount)+' '+currencyName(currency,lang)}
export function formatTotals(rows:Pick<Session,'rate'|'currency'>[],lang='fa'){const totals=moneyTotals(rows);return currencies.filter(c=>totals[c]>0||rows.some(r=>r.currency===c)).map(c=>formatMoney(totals[c],c,lang)).join(' + ')||formatMoney(0,'TOMAN',lang)}
