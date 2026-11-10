'use client';
export function AccountLinks({local=true,label='خروج از حساب'}:{local?:boolean,label?:string}){
 if(!local)return <a className="btn" href="/signout-with-chatgpt?return_to=/" target="_top">{label}</a>;
 return <><a className="btn" href="/signin?mode=change">تغییر رمز عبور</a><button type="button" className="btn" onClick={async()=>{const r=await fetch('/api/auth/logout',{method:'POST'});if(r.ok)window.location.assign('/signin')}}>{label}</button></>;
}
