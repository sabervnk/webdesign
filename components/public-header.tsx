'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowUp,BookOpen,Globe,Menu,Sun,Moon} from 'lucide-react';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetTrigger,SheetClose} from '@/components/ui/sheet';

type Lang='fa'|'en';
type Props={view:string;isAdmin:boolean;lang:Lang;setLang:(value:Lang)=>void;dark:boolean;setDark:(value:boolean)=>void;t:(fa:string,en:string)=>string;brand:string;logo:string};
export function PublicHeader({view,isAdmin,lang,setLang,dark,setDark,t,brand,logo}:Props){
 const [scrolled,setScrolled]=useState(false);
 useEffect(()=>{const check=()=>setScrolled(window.scrollY>64);check();window.addEventListener('scroll',check,{passive:true});return()=>window.removeEventListener('scroll',check)},[]);
 const links=[{href:'/',text:t('خانه','Home'),id:'home'},{href:'/teachers',text:t('معلم‌ها','Teachers'),id:'teachers'},{href:'/blog',text:t('بلاگ','Journal'),id:'blog'},{href:'/contact',text:t('ارتباط با ما','Contact'),id:'contact'}];
 const toTop=()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 return <><header className={'pub-header'+(scrolled?' is-scrolled':'')}><div className="pub-container pub-header-inner"><Link target="_blank" rel="noopener noreferrer" href="/" className={'pub-logo'+(logo?' has-logo':'')} aria-label={brand}><span className="brand-mark pub-mark">{logo?<img src={logo} width={44} height={44} alt=""/>:<BookOpen size={24}/>}</span><span dir="auto">{brand==='Classer'?<>Class<b>er</b></>:brand}<i>.</i></span></Link>
 <nav className="pub-nav" aria-label={t('منوی اصلی','Main navigation')}>{links.map(link=><Link key={link.id} href={link.href} className={view===link.id?'active':''} aria-current={view===link.id?'page':undefined}>{link.text}</Link>)}</nav>
 <div className="pub-header-actions"><button type="button" className="icon-button pub-theme-button" onClick={()=>setDark(!dark)} aria-label={t('تغییر حالت روشن و تیره','Toggle theme')} title={t('تغییر حالت روشن و تیره','Toggle theme')}>{dark?<Sun/>:<Moon/>}</button><button type="button" className="pub-language" onClick={()=>setLang(lang==='fa'?'en':'fa')} aria-label={t('تغییر زبان','Switch language')}><Globe size={16}/>{lang==='fa'?'EN':'FA'}</button><Link className="btn primary pub-teacher-login" href="/signin">{t('ورود به حساب','Sign in')}</Link><Sheet><SheetTrigger asChild><button type="button" className="icon-button pub-mobile-menu" aria-label={t('باز کردن منو','Open menu')}><Menu/></button></SheetTrigger><SheetContent side={lang==='fa'?'right':'left'} className="pub-mobile-sheet"><SheetHeader><SheetTitle>{brand}</SheetTitle></SheetHeader><nav>{links.map(link=><SheetClose asChild key={link.href}><Link href={link.href}>{link.text}</Link></SheetClose>)}<SheetClose asChild><Link href="/signin">{t('ورود به حساب','Sign in')}</Link></SheetClose>{isAdmin&&<SheetClose asChild><Link href="/admin">{t('صندوق مدیریت','Admin dashboard')}</Link></SheetClose>}</nav></SheetContent></Sheet></div></div></header>
 <button type="button" className={'pub-back-top'+(scrolled?' visible':'')} onClick={toTop} aria-label={t('بازگشت به بالای صفحه','Back to top')} title={t('بازگشت به بالای صفحه','Back to top')} tabIndex={scrolled?0:-1}><ArrowUp size={21}/><span>{t('بالای صفحه','Back to top')}</span></button></>;
}
