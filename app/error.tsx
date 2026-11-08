'use client';
export default function ErrorPage({reset}:{error:Error & {digest?:string},reset:()=>void}){
 return <main dir="rtl" className="page-skeleton"><section className="panel panel-body" role="alert"><h1>بارگذاری صفحه کامل نشد</h1><p>لطفاً اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.</p><button className="btn primary" onClick={reset}>تلاش دوباره</button><a className="btn" href="/">صفحه اصلی</a></section></main>;
}
