'use client';
import {useId,useState} from 'react';
import {MAX_PASSWORD_LENGTH,MIN_PASSWORD_LENGTH,passwordStrength} from '@/lib/password-policy';
const ratings=['کوتاه','خیلی ضعیف','قابل قبول','خوب','قوی'];
export function PasswordField({label}:{label:string}){
 const [value,setValue]=useState(''),[show,setShow]=useState(false);
 const id=useId(),strength=passwordStrength(value);
 const message=!value?'حداقل ۸ نویسه. یک عبارت طولانی و منحصربه‌فرد انتخاب کنید.':strength===0?'رمز باید حداقل ۸ نویسه باشد.':strength===1?'این رمز خیلی ضعیف و قابل حدس است. یک رمز قوی‌تر انتخاب کنید.':strength<4?'برای رمز قوی‌تر از چند واژهٔ نامرتبط استفاده کنید.':'رمز از نظر طول و تنوع قوی است.';
 return <div className="password-field"><label className="field" htmlFor={id}>{label}</label>
 <div className="password-input"><input id={id} name="password" dir="ltr" type={show?'text':'password'} autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} maxLength={MAX_PASSWORD_LENGTH} value={value} aria-describedby={id+'-hint'} onChange={e=>{const input=e.currentTarget;input.setCustomValidity(passwordStrength(input.value)===1?'رمز خیلی ضعیف است؛ رمز قوی‌تری وارد کنید.':'');setValue(input.value)}}/><button type="button" className="btn" aria-controls={id} onClick={()=>setShow(!show)}>{show?'پنهان کردن':'نمایش رمز'}</button></div>
 <div className="password-meter" data-strength={strength} aria-hidden="true">{[1,2,3,4].map(i=><span key={i} data-filled={strength>=i}/>)}</div>
 <p id={id+'-hint'} className="password-hint" data-weak={strength===1} aria-live="polite">{value&&<strong>{ratings[strength]} — </strong>}{message}</p>
 </div>;
}
