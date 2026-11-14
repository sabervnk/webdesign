export function displayDate(value:Date|string,lang='fa',options:Intl.DateTimeFormatOptions={weekday:'long',day:'numeric',month:'long',year:'numeric'}){
 const date=value instanceof Date?value:new Date(value.length===10?value+'T12:00:00+03:30':value);if(!Number.isFinite(date.getTime()))return '—';
 const settings={timeZone:'Asia/Tehran',...options};
 if(lang!=='fa')return new Intl.DateTimeFormat('en-GB',settings).format(date);
 const parts=new Intl.DateTimeFormat('fa-IR',{calendar:'persian',...settings,hourCycle:'h23'}).formatToParts(date),get=(type:string)=>parts.find(p=>p.type===type)?.value??'';
 const pieces=[get('day'),get('month'),get('year')].filter(Boolean),numericMonth=options.month==='numeric'||options.month==='2-digit'||options.dateStyle==='short';
 let text=pieces.join(numericMonth?'/':' ');if(get('weekday'))text=get('weekday')+(text?'، '+text:'');
 const time=[get('hour'),get('minute'),get('second')].filter(Boolean).join(':');return text+(text&&time?'، ':'')+time+(get('dayPeriod')?' '+get('dayPeriod'):'');
}
