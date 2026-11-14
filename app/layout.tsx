import type { Metadata } from 'next';
import {loadSiteCopy} from '@/lib/server/site-copy';
import {SiteCopyProvider} from '@/components/site-copy-provider';
import {AutomaticTranslation} from '@/components/automatic-translation';
import './globals.css';
import './public.css';
import './workspace-responsive.css';
import './admin-design.css';
import './profile-layout.css';
import './messaging-security.css';
import './admin-profile-polish.css';
const fallback:Metadata={title:'Classer — معلم زبان، همراه مسیر تو',description:'پرتفولیوی معلم‌های زبان را ببینید، هزینه کلاس آنلاین و حضوری را مقایسه کنید و نوشته‌های آموزشی معلم‌ها را بخوانید.',icons:{icon:'/favicon.svg'}};
export async function generateMetadata():Promise<Metadata>{
 const {values}=await loadSiteCopy();
 return {...fallback,title:values['home.metaTitle']?.fa??(values['site.brand']?.fa?values['site.brand'].fa+' — فضای یادگیری زبان':fallback.title),description:values['home.metaDescription']?.fa??fallback.description};
}
export default async function RootLayout({children}:{children:React.ReactNode}){
 const {values}=await loadSiteCopy();
 return <html lang="fa" dir="rtl" suppressHydrationWarning><head><link rel="preload" href="/fonts/vazirmatn.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/></head><body><SiteCopyProvider values={values}>{children}<AutomaticTranslation/></SiteCopyProvider></body></html>;
}
