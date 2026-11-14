'use client';
import {useEffect,useState} from 'react';
import {PasswordField} from '@/components/password-field';
import {normalizeRecoveryCode} from '@/lib/recovery-policy';

type Step='login'|'request'|'verify'|'new-password'|'change'|'manual';
type Reply={next?:string;reset?:boolean;error?:string;message?:string;challenge?:string;grant?:string;resendAfter?:number};
export default function LocalLogin({initial,forced}:{initial:'login'|'reset'|'change',forced:boolean}){
 const [step,setStep]=useState<Step>(initial==='reset'?'request':initial);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[email,setEmail]=useState(''),[code,setCode]=useState('');
 const [challenge,setChallenge]=useState(''),[grant,setGrant]=useState(''),[deadline,setDeadline]=useState(0),[remaining,setRemaining]=useState(0);
 useEffect(()=>{
  if(!deadline){setRemaining(0);return}
  const tick=()=>setRemaining(Math.max(0,Math.ceil((deadline-Date.now())/1000)));
  tick();const timer=window.setInterval(tick,1000);return ()=>window.clearInterval(timer);
 },[deadline]);
 const titles:Record<Step,string>={login:'ورود به حساب Classer',request:'بازیابی رمز عبور',verify:'تأیید کد بازیابی','new-password':'تعیین رمز جدید',change:'تغییر رمز عبور',manual:'بازیابی با کد مدیر'};
 const help=step==='request'?'ایمیلی را وارد کنید که هنگام ساخت حساب در سایت ثبت شده است.':step==='verify'?'کد ۶رقمی ایمیل را وارد کنید. کد تا ۱۰ دقیقه معتبر است و حداکثر ۵ بار می‌توانید آن را امتحان کنید.':step==='new-password'?'ایمیل تأیید شد. تا ۵ دقیقه فرصت دارید رمز تازه تعیین کنید.':step==='manual'?'این بخش فقط برای کد بلند بازیابی است که مدیر شخصاً به شما داده است.':forced?'پیش از ورود به پنل، رمز موقت خود را تغییر دهید.':'با نام کاربری و رمزی که مدیر سایت ساخته وارد شوید؛ حساب ChatGPT لازم نیست.';
 async function call(action:string,body:Record<string,unknown>){
  const r=await fetch('/api/auth/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json() as Reply;
  if(!r.ok)throw Error(j.error||'عملیات انجام نشد.');
  return j;
 }
 async function requestCode(){
  const j=await call('recovery-request',{email});
  if(!j.challenge)throw Error('پاسخ بازیابی معتبر نیست. دوباره تلاش کنید.');
  setChallenge(j.challenge);setGrant('');setCode('');
  setDeadline(Date.now()+(j.resendAfter??60)*1000);setStep('verify');setMessage(j.message??'ایمیل و پوشهٔ هرزنامه را بررسی کنید.');
 }
 function begin(){setChallenge('');setGrant('');setCode('');setStep('request');setMessage('')}
 async function resend(){
  setBusy(true);setMessage('');
  try{await requestCode()}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}
 }
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMessage('');
  try{
   const form=Object.fromEntries(new FormData(e.currentTarget));
   if(step==='request'){await requestCode();return}
   if(step==='verify'){
    const j=await call('recovery-verify',{challenge,code});
    if(!j.grant)throw Error('تأیید کد انجام نشد. دوباره تلاش کنید.');
    setGrant(j.grant);setCode('');setStep('new-password');return;
   }
   const action=step==='new-password'?'recovery-reset':step==='manual'?'reset':step;
   const j=await call(action,step==='new-password'?{grant,password:form.password}:form);
   if(j.reset){
    setStep('login');setGrant('');setChallenge('');setCode('');setDeadline(0);
    setMessage('رمز تغییر کرد و ورودهای قبلی پایان یافتند. با نام کاربری و رمز جدید وارد شوید.');return;
   }
   if(j.next?.startsWith('/')&&!j.next.startsWith('//'))window.location.assign(j.next);
  }catch(e){setMessage((e as Error).message)}finally{setBusy(false)}
 }
 return <main className="classer-login local-account-login"><header className="local-login-brand"><a href="/">Class<span>er</span>.</a><p>ورود امن به حساب شما</p></header><section className="panel"><div className="panel-head"><div><h1>{titles[step]}</h1><p>{help}</p></div></div>
 <form className="panel-body account-fields" key={step} onSubmit={submit}>
 {step==='request'&&<><label className="field">ایمیل ثبت‌شده<input name="email" type="email" dir="ltr" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label><small>اگر ایمیلی برای حساب ثبت نشده یا به آن دسترسی ندارید، از مدیر سایت کمک بگیرید.</small></>}
 {(step==='login'||step==='manual')&&<label className="field">نام کاربری<input name="username" dir="ltr" autoCapitalize="none" spellCheck={false} autoComplete="username" required maxLength={40}/></label>}
 {step==='verify'&&<><p className="small">ایمیل واردشده: <bdi>{email}</bdi></p><label className="field">کد ۶رقمی<input name="code" dir="ltr" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" minLength={6} maxLength={6} value={code} onChange={e=>setCode(normalizeRecoveryCode(e.target.value))} placeholder="000000"/></label></>}
 {step==='manual'&&<label className="field">کد بازیابی مدیر<input name="code" dir="ltr" autoComplete="one-time-code" required minLength={64} maxLength={64}/></label>}
 {step==='change'&&!forced&&<label className="field">رمز فعلی<input name="current" type="password" dir="ltr" autoComplete="current-password" required maxLength={128}/></label>}
 {step==='login'?<label className="field">رمز عبور<input name="password" dir="ltr" type="password" autoComplete="current-password" required minLength={1} maxLength={128}/></label>:(step==='new-password'||step==='change'||step==='manual')&&<PasswordField label="رمز جدید"/>}
 {message&&<p role="status" className="status-help">{message}</p>}
 <button className="btn primary" disabled={busy||(step==='request'&&remaining>0)}>{busy?'لطفاً صبر کنید…':step==='request'?(remaining>0?'ارسال دوباره تا '+remaining+' ثانیهٔ دیگر':'ارسال کد به ایمیل'):step==='verify'?'تأیید کد':step==='new-password'?'ذخیرهٔ رمز جدید':titles[step]}</button>
 {step==='verify'&&<div className="account-fields"><button type="button" className="btn" disabled={busy||remaining>0} onClick={()=>void resend()}>{remaining>0?'ارسال مجدد تا '+remaining+' ثانیهٔ دیگر':'ارسال مجدد کد'}</button><button type="button" className="text-link" disabled={busy} onClick={begin}>اصلاح آدرس ایمیل</button></div>}
 {step==='new-password'&&<button type="button" className="text-link" disabled={busy} onClick={begin}>شروع دوبارهٔ بازیابی</button>}
 {step==='login'?<button type="button" className="text-link" disabled={busy} onClick={begin}>رمز عبور را فراموش کرده‌ام</button>:<a className="text-link" href="/signin">بازگشت به ورود</a>}
 {step==='request'&&<button type="button" className="text-link" disabled={busy} onClick={()=>{setStep('manual');setMessage('')}}>کد بازیابی مدیر را دارم</button>}
 {step==='login'&&<details className="owner-login-option"><summary>ورود اختیاری مالک سایت</summary><a className="text-link" href="/signin-with-chatgpt?return_to=%2Fadmin" target="_top">ورود مالک با ChatGPT</a></details>}
 <a className="text-link" href="/">صفحهٔ اصلی</a>
 </form></section></main>;
}

