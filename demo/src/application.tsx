import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import PublicSite from '../../app/public-site';
import TeacherWorkspace from '../../app/workspace';
import AdminPanel from '../../app/admin/panel';
import StudentPanel from '../../app/student/student-panel';
import LocalLogin from '../../components/local-login';
import {ContentWorkbench} from '../../components/content-workbench';
import {SiteCopyProvider} from '../../components/site-copy-provider';
import {AutomaticTranslation} from '../../components/automatic-translation';
import {useLocation,navigate} from './navigation';
import type {Catalogue} from '../../lib/catalogue';
function DemoNotice({children}:{children:React.ReactNode}){
 const ref=useRef<HTMLElement>(null);
 useLayoutEffect(()=>{const element=ref.current;if(!element)return;const update=()=>document.documentElement.style.setProperty('--classer-demo-notice-height',element.getBoundingClientRect().height+'px');update();const observer=new ResizeObserver(update);observer.observe(element);return()=>{observer.disconnect();document.documentElement.style.removeProperty('--classer-demo-notice-height')}},[]);
 return <aside ref={ref} className="classer-demo-notice" data-no-translate>{children}</aside>;
}
function Application(){
 const url=useLocation(),[data,setData]=useState<any>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;fetch('/__classer_demo__/state').then(r=>r.json()).then(j=>{if(active){setData(j);setError('')}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[url]);
 const path=url.split('?')[0],params=new URLSearchParams(url.split('?')[1]||'');
 useEffect(()=>{if(!data)return;if(['/dashboard','/students','/schedule','/finance','/messages','/studio','/journal','/admin','/student'].some(p=>path===p||path.startsWith(p+'/'))&&!data.account)navigate('/signin',true);if(path==='/signout'){fetch('/api/auth/logout',{method:'POST'}).then(()=>navigate('/signin',true))}},[data,path]);
 if(error)return <p className="save-error" role="alert">{error}</p>;if(!data)return null;
 const catalogue:Catalogue=data.catalogue;const [section,id]=path.slice(1).split('/');let page:React.ReactNode;
 if(path==='/signin'||path.startsWith('/signin-with-chatgpt'))page=<LocalLogin key={url} initial={params.get('mode')==='change'?'change':params.get('mode')==='reset'?'reset':'login'} forced={false}/>;
 else if(path==='/admin/content')page=<main><ContentWorkbench/></main>;
 else if(section==='admin')page=<AdminPanel local me={data.account?.id||'demo-admin'} superAdmin displayName={data.account?.name||'مدیر نمونه'}/>;
 else if(section==='student')page=<StudentPanel/>;
 else if(['dashboard','students','schedule','finance','messages','studio','journal'].includes(section))page=<TeacherWorkspace/>;
 else if(path==='/')page=<PublicSite view="home" initialCatalogue={catalogue}/>;
 else if(section==='teachers')page=<PublicSite view={id?'teacher':'teachers'} initialCatalogue={catalogue} recordId={id} videoUrl={data.videos?.[id]?.visible?'/api/public-video/'+id:undefined}/>;
 else if(section==='blog')page=<PublicSite view={id?'article':'blog'} initialCatalogue={catalogue} recordId={id}/>;
 else if(section==='contact')page=<PublicSite view="contact" initialCatalogue={catalogue}/>;
 else page=<main className="classer-console"><h1>صفحه پیدا نشد</h1><a href="/">صفحهٔ اصلی</a></main>;
 return <SiteCopyProvider values={data.values}><DemoNotice><span>نسخهٔ نمایشی · اطلاعات فقط در همین مرورگر ذخیره می‌شوند.</span><span>ورود نمونه: <bdi>teacher / admin / student</bdi> · رمز: <bdi>demo1234</bdi> · کد تصویر: <bdi>123456</bdi></span><button type="button" onClick={async()=>{if(!confirm('تغییرات همین نسخهٔ نمایشی بازنشانی شوند؟'))return;await fetch('/__classer_demo__/reset',{method:'POST'});window.location.assign('/')}}>بازنشانی دمو</button></DemoNotice>{page}<AutomaticTranslation/></SiteCopyProvider>;
}
createRoot(document.getElementById('app')!).render(<Application/>);
