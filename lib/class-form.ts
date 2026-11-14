export function twoDigits(value:string){return value.replace(/[۰-۹٠-٩]/g,c=>String(c.charCodeAt(0)&15)).replace(/\D/g,'').slice(0,2)}
export function parseTimeParts(hours:string,minutes:string,maxHours=23){if(!/^\d{1,2}$/.test(hours)||!/^\d{1,2}$/.test(minutes))return null;const h=Number(hours),m=Number(minutes);return h<=maxHours&&m<=59?{hours:h,minutes:m,total:h*60+m}:null}
export function pasteTime(value:string){const normalized=value.replace(/[۰-۹٠-٩]/g,c=>String(c.charCodeAt(0)&15)).trim();const found=/^(\d{1,2})\s*[:：]\s*(\d{1,2})$/.exec(normalized)||/^(\d{2})(\d{2})$/.exec(normalized);return found?{hours:found[1],minutes:found[2]}:null}
export function shiftDay(value:string,days:number){const d=new Date(value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
export function validClassDate(value:string){const n=Date.parse(value+'T12:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===value}
export type ClassMonth={key:string;label:string;days:string[]};
export function classMonths(today:string,selected:string,calendar:'persian'|'gregory',locale:string,editing=false):ClassMonth[]{
 const values=new Set<string>();for(let i=editing?-400:-40;i<=400;i++)values.add(shiftDay(today,i));if(validClassDate(selected))for(let i=-35;i<=35;i++)values.add(shiftDay(selected,i));
 const keyFormat=new Intl.DateTimeFormat('en-GB',{calendar,timeZone:'UTC',year:'numeric',month:'2-digit'}),labelFormat=new Intl.DateTimeFormat(locale,{calendar,timeZone:'UTC',year:'numeric',month:'long'});const groups=new Map<string,ClassMonth>();
 for(const value of [...values].sort()){const date=new Date(value+'T12:00:00Z'),parts=Object.fromEntries(keyFormat.formatToParts(date).map(x=>[x.type,x.value])),key=parts.year+'-'+parts.month;let month=groups.get(key);if(!month){month={key,label:labelFormat.format(date),days:[]};groups.set(key,month)}month.days.push(value)}
 return [...groups.values()].filter(month=>editing||month.days.some(day=>day>=today));
}
export function chooseMonthDay(month:ClassMonth,current:string,calendar:'persian'|'gregory',today:string,editing:boolean){
 const days=month.days.filter(day=>editing||day>=today);if(!days.length)return current;const format=new Intl.DateTimeFormat('en-GB',{calendar,timeZone:'UTC',day:'numeric'}),day=Number(format.format(new Date(current+'T12:00:00Z')));return days.reduce((best,d)=>Math.abs(Number(format.format(new Date(d+'T12:00:00Z')))-day)<Math.abs(Number(format.format(new Date(best+'T12:00:00Z')))-day)?d:best,days[0]);
}
export function classDraftKey(owner:string,sessionId:string|undefined,studentId:string|undefined,date:string){return 'classer-session-draft:'+owner+':'+(sessionId??'new:'+date+':'+(studentId??'any'))}
