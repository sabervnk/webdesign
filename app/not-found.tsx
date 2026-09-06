import Link from 'next/link';
export default function NotFound(){return <main style={{maxWidth:600,margin:'12vh auto',padding:24,textAlign:'center'}}><h1>این صفحه پیدا نشد.</h1><p style={{margin:'20px 0',color:'var(--muted-foreground)'}}>ممکن است آدرس تغییر کرده باشد یا هنوز منتشر نشده باشد.</p><Link className="btn primary" href="/">بازگشت به صفحه اصلی</Link></main>}
