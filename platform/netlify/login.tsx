import {configured} from './access';
import LoginForm from './login-form';
export default async function Login({searchParams}:{searchParams:Promise<{return_to?:string}>}){
 const p=await searchParams;
 return <main className="auth-page"><a className="auth-brand" href="/">MahELA<span>یادگیری، با همراه درست</span></a><section className="panel auth-card"><span className="auth-eyebrow">فضای اختصاصی معلم</span><h1>خوش آمدید.</h1><p className="muted">کلاس‌ها، پرتفولیو و نوشته‌هایتان را از اینجا مدیریت کنید.</p><LoginForm ready={configured()} registration={!!process.env.MAHELA_TEACHER_INVITE_CODE&&process.env.MAHELA_TEACHER_INVITE_CODE.length>=16} returnTo={p.return_to||'/dashboard'}/></section><a className="text-link" href="/">بازگشت به صفحه اصلی</a></main>
}
