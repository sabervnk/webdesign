'use client';
import {useId,useState} from 'react';
import {PASSWORD_MIN_LENGTH,PASSWORD_MAX_LENGTH,passwordStrength} from '@/lib/password-policy';

export function PasswordField({label='رمز موقت'}:{label?:string}){
 const id=useId(),[value,setValue]=useState(''),[visible,setVisible]=useState(false);
 const strength=passwordStrength(value);
 const labels=['','ضعیف','متوسط','قوی'];
 return <div className="field password-field">
  <label htmlFor={id}>{label}</label>
  <div className="password-input">
   <input id={id} name="password" type={visible?'text':'password'} dir="ltr" autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} value={value} onChange={e=>setValue(e.target.value)} placeholder="حداقل ۸ کاراکتر" aria-describedby={id+'-help '+id+'-strength'}/>
   <button type="button" aria-controls={id} aria-pressed={visible} aria-label={visible?'پنهان‌کردن رمز':'نمایش رمز'} onClick={()=>setVisible(v=>!v)}>{visible?'پنهان':'نمایش'}</button>
  </div>
  <small id={id+'-help'}>۸ تا ۱۲۸ کاراکتر؛ بهتر است از یک عبارت طولانی و غیرقابل‌حدس استفاده کنید.</small>
  <div id={id+'-strength'} className="password-feedback" data-strength={strength} role="status" aria-live="polite" aria-atomic="true">
   {value&&<><div className="password-meter" aria-hidden="true">{[1,2,3].map(n=><span key={n} data-filled={strength>=n}/>)}</div><small>قدرت رمز: {labels[strength]}{strength===1?'؛ لطفاً رمز قوی‌تری انتخاب کنید.':''}</small></>}
  </div>
 </div>;
}
