'use client';
import {displayDate} from '@/lib/date-display';
import {useEffect,useState} from 'react';
export function DashboardClock({lang='fa'}:{lang?:'fa'|'en'}){
 const [now,setNow]=useState<Date|null>(null);
 useEffect(()=>{const tick=()=>setNow(new Date());tick();const id=setInterval(tick,1000);return ()=>clearInterval(id)},[]);
 const locale=lang==='fa'?'fa-IR-u-ca-persian':'en-GB';
 return <div className="dashboard-clock">{now?<><span>{displayDate(now,lang,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span><time dateTime={now.toISOString()} dir="ltr">{new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZone:'Asia/Tehran'}).format(now)}</time><small>{lang==='fa'?'به وقت تهران':'Tehran time'}</small></>:<span>—</span>}</div>;
}

