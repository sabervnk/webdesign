'use client';
import {useEffect,useState} from 'react';
import {AccountLinks} from '@/components/account-links';
import {formatMoney,type Session} from '@/lib/model';
type Learner={name:string;teacher:string;level:string;skills:Record<string,number>;sessions:Pick<Session,'date'|'time'|'duration'|'status'|'rate'|'currency'|'paid'>[]};
export default function StudentPanel(){
 const [data,setData]=useState<Learner|null>(null),[error,setError]=useState('');
 useEffect(()=>{fetch('/api/student',{cache:'no-store'}).then(async r=>{const j=await r.json() as Learner&{error?:string};if(!r.ok)throw Error(j.error||'دسترسی به پرونده ممکن نیست.');setData(j)}).catch(e=>setError(e.message))},[]);
 return <main className="classer-console"><div className="page-heading"><div><h1>پنل زبان‌آموز</h1><p>{data?data.name+' · '+data.teacher:'جلسه‌ها، پیشرفت و شهریهٔ شما'}</p></div><div className="actions"><a className="btn" href="/">صفحهٔ اصلی</a><AccountLinks/></div></div>
 {error&&<p className="save-error" role="alert">{error}</p>}
 {!data&&!error&&<p role="status">در حال دریافت پرونده…</p>}
 {data&&<><section className="panel"><div className="panel-head"><h2>سطح و مهارت‌ها</h2><span className="badge">{data.level}</span></div><div className="panel-body learner-skills">{Object.entries(data.skills).map(([k,v])=><span className="badge" key={k}>{({listening:'شنیدن',speaking:'گفتار',reading:'خواندن',writing:'نوشتن'} as Record<string,string>)[k]??k}: {v} / ۹</span>)}</div></section>
 <section className="panel"><div className="panel-head"><h2>جلسه‌ها و شهریه</h2></div><div className="panel-body"><ul className="learner-sessions">{[...data.sessions].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)).map((s,i)=><li key={i}><span dir="ltr">{s.date} · {s.time}</span><span>{s.duration} دقیقه · {s.status==='held'?'برگزار شده':s.status==='cancelled'?'لغوشده':'برنامه‌ریزی شده'}</span><strong>{formatMoney(s.rate,s.currency)}</strong><span className="badge">{s.paid?'تسویه‌شده':'تسویه نشده'}</span></li>)}</ul>{!data.sessions.length&&<p>هنوز جلسه‌ای ثبت نشده است.</p>}</div></section></>}
 </main>;
}
