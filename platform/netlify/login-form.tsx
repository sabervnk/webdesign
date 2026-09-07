'use client';
import {useState} from 'react';
export default function LoginForm({ready,registration,returnTo}:{ready:boolean,registration:boolean,returnTo:string}){
 const [register,setRegister]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 if(!ready)return <p className="form-error" role="status">ورود به پنل هنوز فعال نشده است. برای دسترسی، با مدیر سایت تماس بگیرید.</p>;
 return <form className="auth-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');const data=Object.fromEntries(new FormData(e.currentTarget));try{const r=await fetch('/api/auth/'+(register?'register':'login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,returnTo})});const result=await r.json() as {error?:string,redirect:string};if(!r.ok)throw new Error(result.error||'ورود انجام نشد.');window.location.assign(result.redirect)}catch(e){setError((e as Error).message);setBusy(false)}}}>
 {register&&<label>نام و نام خانوادگی<input name="displayName" required minLength={2} maxLength={100} autoComplete="name"/></label>}
 <label>ایمیل<input name="email" type="email" required maxLength={254} dir="ltr" autoComplete="username"/></label>
 <label>رمز عبور<input name="password" type="password" required minLength={12} maxLength={256} dir="ltr" autoComplete={register?'new-password':'current-password'}/></label>
 {register&&<label>کد دعوت مدیر<input name="invite" type="password" required maxLength={256} dir="ltr" autoComplete="off"/><small className="muted">برای ایجاد حساب معلم، کد دعوت را از مدیر سایت بگیرید.</small></label>}
 {error&&<p className="form-error" role="alert">{error}</p>}
 <button className="btn primary" disabled={busy}>{busy?'لطفاً صبر کنید…':register?'ساخت حساب معلم':'ورود به پنل'}</button>
 {registration&&<button className="text-link" type="button" disabled={busy} onClick={()=>{setRegister(!register);setError('')}}>{register?'حساب دارید؟ وارد شوید':'معلم هستید و کد دعوت دارید؟ ثبت‌نام کنید'}</button>}
 </form>
}
