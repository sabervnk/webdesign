import {requireRole} from '@/lib/server/access';
import {SiteEditor} from '../panel';
export const dynamic='force-dynamic';
export const metadata={title:'استودیوی محتوای سایت | Classer',robots:{index:false,follow:false}};
export default async function ContentStudio(){await requireRole('admin');return <main className="content-studio-shell" dir="rtl"><header className="content-studio-heading"><div><span className="pub-kicker">CLASSER · CONTENT STUDIO</span><h1>استودیوی محتوای سایت</h1><p>فضای مستقل برای ویرایش نوشته‌ها و ظاهر محتوایی سایت.</p></div><div className="actions"><a className="btn" href="/admin">بازگشت به مدیریت</a><a className="btn" href="/" target="_blank" rel="noopener noreferrer">پیش‌نمایش سایت</a></div></header><SiteEditor/></main>}
