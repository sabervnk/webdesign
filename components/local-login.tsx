'use client';
import {useState} from 'react';
export default function LocalLogin({initial,forced}:{initial:'login'|'reset'|'change',forced:boolean}){
 const [mode,setMode]=useState(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const labels={login:'ورود با نام کاربری',reset:'بازیابی رمز عبور',change:'تغییر رمز عبور'};
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMessage('');
  try{
   const form=Object.fromEntries(new FormData(e.currentTarget));
   const r=await fetch('/api/auth/'+mode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
   const j=await r.json() as {next?:string,reset?:boolean,error?:string};
   if(!r.ok)throw Error(j.error||'عملیات انجام نشد.');
   if(j.reset){setMode('login');setMessage('رمز تغییر کرد. با رمز جدید وارد شوید.');return}
   if(j.next?.startsWith('/')&&!j.next.startsWith('//'))window.location.assign(j.next);
  }catch(e){setMessage((e as Error).message)}finally{setBusy(false)}
 }
 return <main className="classer-login"><section className="panel"><div className="panel-head"><div><h1>{labels[mode]}</h1><p>{mode==='reset'?'کد یک‌بارمصرف بازیابی را از مدیر Classer دریافت کنید.':forced?'پیش از ورود به پنل، رمز موقت خود را تغییر دهید.':'با حساب Classer وارد پنل خود شوید.'}</p></div></div>
 <form className="panel-body account-fields" key={mode} onSubmit={submit}>
 {mode!=='change'&&<label className="field">نام کاربری<input name="username" dir="ltr" autoComplete="username" required maxLength={40}/></label>}
 {mode==='reset'&&<label className="field">کد یک‌بارمصرف<input name="code" dir="ltr" autoComplete="one-time-code" required maxLength={64}/></label>}
 {mode==='change'&&!forced&&<label className="field">رمز فعلی<input name="current" type="password" dir="ltr" autoComplete="current-password" required maxLength={128}/></label>}
 <label className="field">{mode==='login'?'رمز عبور':'رمز جدید'}<input name="password" dir="ltr" type="password" autoComplete={mode==='login'?'current-password':'new-password'} required minLength={mode==='login'?1:12} maxLength={128}/></label>
 {message&&<p role="status" className="status-help">{message}</p>}
 <button className="btn primary" disabled={busy}>{busy?'لطفاً صبر کنید…':labels[mode]}</button>
 {mode==='login'?<button type="button" className="text-link" onClick={()=>{setMode('reset');setMessage('')}}>رمز عبور را فراموش کرده‌ام</button>:<a className="text-link" href="/signin">بازگشت به ورود</a>}
 {mode==='login'&&<a className="text-link" href="/signin-with-chatgpt?return_to=%2Fadmin" target="_top">ورود مالک سایت با ChatGPT</a>}
 <a className="text-link" href="/">صفحهٔ اصلی</a>
 </form></section></main>;
}
