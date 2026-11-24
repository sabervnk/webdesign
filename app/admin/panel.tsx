'use client';
import {useRouter,useSearchParams} from 'next/navigation';
import {LayoutDashboard,Users,GraduationCap,Inbox,Wallet,ShieldCheck,Crown,Globe,Menu,X,ArrowUpRight,Palette} from 'lucide-react';
import React,{useEffect,useState,useRef} from 'react';
import {useCopyValue} from '@/components/site-copy-provider';
import {PasswordField} from '@/components/password-field';
import {AdminTeacherMedia} from '@/components/admin-teacher-media';
import {CommissionSettings} from '@/components/commission-settings';
import {AdminFinance} from '@/components/admin-finance';
import {AdminOverview} from '@/components/admin-overview';
import {DashboardClock} from '@/components/dashboard-clock';
import {AccountLinks} from '@/components/account-links';
import {AdminInbox} from '@/components/admin-inbox';
import {WorkspaceEditor} from './workspace-editor';
import {ArticleForm,PortfolioForm} from './portfolio-editor';
import type {ArticleInput,PublicProfileInput} from '@/lib/catalogue';
import type {Workspace} from '@/lib/model';

type Teacher={id:string;name:string;published:number;kind?:'teacher'|'admin-legacy';hasAccount?:boolean;username?:string;email?:string;phone?:string;active?:number};
type Account={id:string;username:string;name:string;email:string;phone:string;role:'admin'|'teacher'|'student';active:number;teacher_id:string|null;student_id:string|null;must_change:number;legacy?:number};
type Doc<T>={id?:string;version:number;data:T};
type TeacherData={workspace:{data:Workspace;version:number}|null;profile:Doc<PublicProfileInput>|null;articles:{id:string;title:string;status:string}[]};

const roles={admin:'مدیر',teacher:'معلم',student:'شاگرد'};
async function api<T>(url:string,method='GET',body?:unknown):Promise<T>{
 const response=await fetch(url,{method,cache:'no-store',...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
 const data=await response.json() as {error?:string};
 if(!response.ok)throw Error(data.error||(response.status===403?'اجازهٔ این عملیات را ندارید. دوباره وارد حساب مدیر شوید.':response.status===404?'این حساب پیدا نشد؛ فهرست را تازه کنید.':'ذخیره انجام نشد؛ اطلاعات و تداخل تغییرات را بررسی کنید.'));
 return data as T;
}
function Feedback({value}:{value:string}){return value?<p role="status" className="status-help">{value}</p>:null}
function useTeachers(){
 const [items,setItems]=useState<Teacher[]>([]),[error,setError]=useState('');
 useEffect(()=>{const refresh=()=>api<{teachers:Teacher[]}>('/api/admin/teachers').then(j=>setItems(j.teachers)).catch(e=>setError(e.message));void refresh();window.addEventListener('classer-accounts-updated',refresh);return()=>window.removeEventListener('classer-accounts-updated',refresh)},[]);
 return {items,error};
}

function Accounts({me,superAdmin}:{me:string;superAdmin:boolean}){
 const {items:teacherRecords,error}=useTeachers();const teachers=teacherRecords.filter(t=>t.kind!=='admin-legacy');
 const [rows,setRows]=useState<Account[]>([]),[editing,setEditing]=useState<Account|null>(null),[role,setRole]=useState<Account['role']>('teacher'),[teacher,setTeacher]=useState(''),[roster,setRoster]=useState<Workspace['students']>([]),[selectedStudent,setSelectedStudent]=useState(''),[note,setNote]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[search,setSearch]=useState('');
 const url='/api/admin/accounts';const [teacherRecord,setTeacherRecord]=useState(''),[link,setLink]=useState<Account|null>(null);
 function reload(){return api<{accounts:Account[]}>(url).then(j=>setRows(j.accounts)).catch(e=>setNote(e.message))}
 useEffect(()=>{void reload()},[]);
 useEffect(()=>{
  let active=true;setRoster([]);
  if(role==='student'&&teacher)api<TeacherData>('/api/admin/teachers?id='+encodeURIComponent(teacher)).then(j=>{if(active)setRoster(j.workspace?.data.demo?[]:j.workspace?.data.students??[])}).catch(e=>{if(active)setNote(e.message)});
  return ()=>{active=false};
 },[role,teacher]);
 function select(a:Account|null){setLink(null);setEditing(a);setRole(a?.role??'teacher');setTeacher(a?.teacher_id??'');setSelectedStudent(a?.student_id??'');setCode('');setNote('')}
 async function mutate(method:string,b:unknown){
  setBusy(true);setNote('');setCode('');
  try{const saved=await api<{code?:string}>(url,method,b);if(saved.code){setCode(saved.code);setNote('کد بازیابی فقط یک بار و تا ۳۰ دقیقه معتبر است. آن را از مسیر امن به کاربر بدهید.')}else{select(null);setNote('تغییر ذخیره شد.');await reload();window.dispatchEvent(new Event('classer-accounts-updated'))}}
  catch(e){setNote((e as Error).message)}finally{setBusy(false)}
 }
 return <section className="panel"><div className="panel-head"><div><h2>کاربران و دسترسی‌ها</h2><p>نام کاربری، رمز موقت، نقش، فعال‌سازی و بازیابی حساب.</p></div><button className="btn" type="button" onClick={()=>select(null)}>کاربر جدید</button></div><div className="panel-body admin-split">
  <div className="account-fields"><label className="field">جست‌وجوی کاربر<input value={search} onChange={e=>setSearch(e.target.value)}/></label><ul className="admin-list">{rows.filter(a=>(a.name+' '+a.username+' '+a.email).toLowerCase().includes(search.toLowerCase())).map(a=><li key={a.id}><button type="button" aria-pressed={editing?.id===a.id} onClick={()=>select(a)}><strong>{a.name}</strong> · <bdi>{a.username}</bdi><small>{roles[a.role]} · {a.active?'فعال':'غیرفعال'}</small></button></li>)}</ul></div>
  <div className="account-fields"><h3>{editing?'ویرایش '+editing.name:'ایجاد کاربر'}</h3>
  {editing?.legacy?<div className="account-fields"><h3>{editing.name}</h3><p>این معلم پرونده دارد، اما حساب ورود با نام کاربری هنوز برایش ساخته نشده است.</p><button className="btn primary" type="button" onClick={()=>{const a=editing;select(null);setRole('teacher');setLink(a)}}>ساخت حساب ورود برای این معلم</button><a className="btn info" href={'/admin?section=teachers&teacher='+encodeURIComponent(editing.id)}>دیدن پروندهٔ معلم</a></div>:editing?.id===me||editing?.role==='admin'&&!superAdmin?<div className="account-fields"><p>{editing?.id===me?'برای تغییر رمز حساب خود، از دکمهٔ تغییر رمز بالای پنل استفاده کنید.':'اطلاعات این حساب قابل مشاهده است؛ تغییر دسترسی و رمز مدیران با سوپرادمین است.'}</p><dl className="admin-account-facts"><div><dt>نام نمایشی</dt><dd>{editing?.name}</dd></div><div><dt>نام کاربری</dt><dd><bdi>{editing?.username}</bdi></dd></div><div><dt>ایمیل</dt><dd><bdi>{editing?.email}</bdi></dd></div><div><dt>شماره تماس</dt><dd><bdi>{editing?.phone}</bdi></dd></div></dl></div>:<form className="account-fields" key={editing?.id??link?.id??'new'} onSubmit={e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.currentTarget));void mutate(editing?'PATCH':'POST',{...v,id:editing?.id,existingTeacher:link?.id||v.existingTeacher,role,teacherId:teacher,studentId:selectedStudent,active:v.active==='on'})}}>
   <div className="form-grid"><label className="field">نام نمایشی<input name="name" required minLength={2} maxLength={100} defaultValue={editing?.name??link?.name}/></label><label className="field">نام کاربری<input name="username" required minLength={3} maxLength={40} pattern="[a-zA-Z0-9][a-zA-Z0-9_.\-]{2,39}" dir="ltr" defaultValue={editing?.username}/></label><label className="field">ایمیل<input name="email" type="email" dir="ltr" required maxLength={200} defaultValue={editing?.email??link?.email}/></label><label className="field">شمارهٔ تلفن همراه<input name="phone" type="tel" dir="ltr" required maxLength={30} placeholder="+989121234567" defaultValue={editing?.phone??link?.phone}/></label><label className="field">نقش<select value={role} onChange={e=>{setRole(e.target.value as Account['role']);setTeacher('');setSelectedStudent('')}}>{Object.entries(roles).filter(([id])=>superAdmin||id!=='admin').map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label></div>
   {!editing&&<PasswordField label="رمز موقت"/>}
   {!editing&&!link&&role==='teacher'&&<label className="field">اتصال اختیاری به فضای معلم قبلی<select name="existingTeacher"><option value="">فضای تازه</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
   {role==='student'&&<div className="form-grid"><label className="field">معلم<select required value={teacher} onChange={e=>{setTeacher(e.target.value);setSelectedStudent('')}}><option value="">انتخاب معلم</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label className="field">زبان‌آموز<select required value={selectedStudent} onChange={e=>setSelectedStudent(e.target.value)}><option value="">انتخاب از پروندهٔ معلم</option>{roster.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>}
   <label><input type="checkbox" name="active" defaultChecked={editing?!!editing.active:true}/> حساب فعال باشد</label><button className="btn primary" disabled={busy} data-action="save">{editing?'ذخیرهٔ تغییرات':'ایجاد حساب'}</button><p className="password-hint">ایمیل و تلفن همراه الزامی‌اند. کاربر پس از اولین ورود باید رمز موقت را تغییر دهد.</p>
  </form>}
  {editing&&!editing.legacy&&editing.id!==me&&(superAdmin||editing.role!=='admin')&&<div className="account-fields"><div className="actions"><button className="btn" type="button" disabled={busy||!editing.active} onClick={()=>void mutate('PATCH',{id:editing.id,action:'recovery'})}>ساخت کد بازیابی</button><button className="btn danger" type="button" disabled={busy||!editing.active} onClick={()=>void mutate('PATCH',{id:editing.id,action:'deactivate'})} data-action="warning">غیرفعال‌کردن حساب</button>{superAdmin&&<button className="btn danger" type="button" disabled={busy} onClick={()=>{if(window.confirm('حذف دائمی «'+editing.name+'» و تمام اطلاعات وابسته؟'))void mutate('DELETE',{id:editing.id})}} data-action="danger">حذف دائمی کاربر</button>}</div><form className="account-fields" onSubmit={e=>{e.preventDefault();void mutate('PATCH',{id:editing.id,action:'password',password:new FormData(e.currentTarget).get('password')})}}><PasswordField key={editing.id} label="تنظیم رمز موقت جدید"/><button className="btn" disabled={busy} data-action="save">ثبت رمز موقت</button></form></div>}
  {code&&<label className="field">کد بازیابی یک‌بارمصرف<input dir="ltr" readOnly value={code}/></label>}
  <Feedback value={note||error}/></div>
 </div><div className="panel-body admin-all-teachers"><h3>تمام معلم‌های ثبت‌شده</h3><p className="small muted">حساب‌های محلی و معلم‌های قدیمی؛ برای دیدن شاگردها و کلاس‌ها پرونده را باز کنید.</p><div className="admin-teacher-shortcuts">{teachers.map(t=><button className="btn" type="button" key={t.id} onClick={()=>setTeacherRecord(t.id)}>{t.name}</button>)}</div>{teacherRecord&&<Teachers key={teacherRecord} initialId={teacherRecord} superAdmin={superAdmin}/>}</div></section>;
}
function Teachers({superAdmin,initialId,learners=false}:{superAdmin:boolean;initialId?:string;learners?:boolean}){
 const {items:allItems,error}=useTeachers();const items=learners?allItems.filter(t=>t.kind!=='admin-legacy'):allItems;const [id,setId]=useState(''),[detail,setDetail]=useState<TeacherData|null>(null),[article,setArticle]=useState<Doc<ArticleInput>|null>(null),[note,setNote]=useState(''),[search,setSearch]=useState('');
 const url='/api/admin/teachers',selection=useRef(0),articleSelection=useRef(0);
 useEffect(()=>{if(initialId)void open(initialId)},[initialId]);
 async function open(next:string){const ticket=++selection.current;setId(next);setDetail(null);setArticle(null);setNote('');try{const result=await api<TeacherData>(url+'?id='+encodeURIComponent(next));if(ticket===selection.current)setDetail(result)}catch(e){if(ticket===selection.current)setNote((e as Error).message)}}
 async function openArticle(a:string){const teacherTicket=selection.current,ticket=++articleSelection.current;setNote('');setArticle(null);try{const result=await api<{article:Doc<ArticleInput>}>(url+'?id='+encodeURIComponent(id)+'&article='+encodeURIComponent(a));if(teacherTicket===selection.current&&ticket===articleSelection.current)setArticle(result.article)}catch(e){if(teacherTicket===selection.current&&ticket===articleSelection.current)setNote((e as Error).message)}}
 async function save<K extends 'profile'|'workspace'|'article'>(kind:K,data:K extends 'profile'?PublicProfileInput:K extends 'workspace'?Workspace:ArticleInput,version:number){
  const activeId=id,articleId=article?.id,ticket=selection.current;
  const j=await api<{version:number;id?:string}>(url,'PUT',{kind,id:activeId,data,version,articleId});
  if(ticket!==selection.current)return;
  if(kind==='article'){
   setArticle(a=>a?.id===articleId&&a?{...a,version:j.version,data:data as ArticleInput}:a);
   setDetail(d=>d?{...d,articles:d.articles.map(a=>a.id===articleId?{...a,title:(data as ArticleInput).title,status:(data as ArticleInput).status}:a)}:d);
  }else if(kind==='profile')setDetail(d=>d?.profile?{...d,profile:{...d.profile,id:j.id??d.profile.id,version:j.version,data:data as PublicProfileInput}}:d);
  else {const fresh=await api<TeacherData>(url+'?id='+encodeURIComponent(activeId));if(ticket===selection.current)setDetail(fresh)}
  setNote('تغییرات ذخیره شد.');
 }
 return <section className="panel"><div className="panel-head"><div><h2>{learners?'زبان‌آموزان و شهریه':'پروفایل و فضای کاری'}</h2><p>{learners?'شاگردها، کلاس‌ها، شهریه و سهم مالک هر معلم.':'پرتفولیو، نوشته‌ها و حساب معلم.'}</p></div></div><div className="panel-body admin-split admin-teacher-split">
  <div className="account-fields"><label className="field">جست‌وجوی معلم<input value={search} onChange={e=>setSearch(e.target.value)}/></label><ul className="admin-list">{items.filter(t=>t.name.toLowerCase().includes(search.toLowerCase())).map(t=><li key={t.id}><button aria-pressed={id===t.id} onClick={()=>void open(t.id)}><strong>{t.name}</strong><small>{t.kind==='admin-legacy'?'پروندهٔ قدیمی مدیریت':'معلم'}</small></button></li>)}</ul></div>
  <div className="account-fields"><Feedback value={note||error}/>{detail&&<>{items.find(t=>t.id===id)?.kind==='admin-legacy'&&<p className="status-help">این پروندهٔ قدیمی مدیریت است و به مدیر نقش معلم نمی‌دهد. برای تدریس، حساب جداگانهٔ معلم ایجاد کنید.</p>}{learners&&<CommissionSettings key={id+':commission:'+detail.workspace?.version} ownerId={id} onSaved={()=>open(id)}/>}{!learners&&superAdmin&&items.find(t=>t.id===id)?.kind!=='admin-legacy'&&<button className="btn danger" type="button" onClick={async()=>{if(!window.confirm('حذف دائمی معلم و شاگردها و کلاس‌هایش؟'))return;try{await api('/api/admin/accounts','DELETE',{id});setDetail(null);setId('');window.dispatchEvent(new Event('classer-accounts-updated'))}catch(e){setNote((e as Error).message)}}} data-action="danger">حذف دائمی معلم</button>}{!learners&&<AdminTeacherMedia key={id} ownerId={id}/>}{!learners&&<details open><summary>پرتفولیوی عمومی</summary>{detail.profile?.id&&detail.profile.data.published&&items.find(t=>t.id===id)?.kind!=='admin-legacy'&&<a className="btn" href={'/teachers/'+detail.profile.id} target="_blank" rel="noopener noreferrer">دیدن صفحهٔ عمومی معلم</a>}<p className="password-hint">اطلاعات این بخش، پس از انتشار پرتفولیو، در صفحهٔ معلم نمایش داده می‌شود.</p>{detail.profile?<PortfolioForm key={id} data={detail.profile.data} onSave={data=>save('profile',data,detail.profile!.version)}/>:<p>پرتفولیو ساخته نشده است.</p>}</details>}
  <details open><summary>{learners?'پروندهٔ زبان‌آموزان و کلاس‌ها':'فضای کاری و حساب معلم'}</summary>{detail.workspace?<WorkspaceEditor key={id+(learners?':learners':':profile')} ownerId={id} allowedTabs={learners?['students','sessions','assessments','messages']:['profile','memos']} canDelete={superAdmin&&learners} onReload={async()=>open(id)} {...detail.workspace} onSave={(data,v)=>save('workspace',data,v)}/>:<p>فضای کار هنوز ایجاد نشده است.</p>}</details>
  {!learners&&<details><summary>نوشته‌های معلم</summary>{detail.articles.map(a=><button className="btn" key={a.id} onClick={()=>void openArticle(a.id)}>{a.title}</button>)}{article&&<ArticleForm key={article.id} data={article.data} onSave={data=>save('article',data,article.version)}/>}</details>}
  </>}</div>
 </div></section>;
}
function UsersSection({me,superAdmin}:{me:string;superAdmin:boolean}){
 const [view,setView]=useState('accounts');
 return <div className="account-fields"><div className="actions" role="group" aria-label="بخش‌های کاربران">{<button className="btn" aria-pressed={view==='accounts'} onClick={()=>setView('accounts')}>حساب‌ها و نقش‌ها</button>}<button className="btn" aria-pressed={view==='teachers'} onClick={()=>setView('teachers')}>معلم‌ها، پرتفولیو و پرونده‌ها</button></div>{view==='accounts'?<Accounts me={me} superAdmin={superAdmin}/>:<Teachers superAdmin={superAdmin}/>}</div>;
}
export default function AdminPanel({local,me,superAdmin,displayName}:{local:boolean;me:string;superAdmin:boolean;displayName:string}){
 const [lang,setLang]=useState<'fa'|'en'>('fa'),[mobile,setMobile]=useState(false);const router=useRouter(),params=useSearchParams(),requested=params.get('section');
 const t=(fa:string,en:string)=>lang==='fa'?fa:en;
 const sections=[['overview',LayoutDashboard,t('پیشخوان مدیریت','Overview')],['users',Users,t('کاربران و دسترسی‌ها','Users & access')],['teachers',GraduationCap,t('پروندهٔ معلم‌ها','Teacher records')],['learners',GraduationCap,t('زبان‌آموزان و شهریه','Learners & tuition')],['requests',Inbox,t('صندوق درخواست‌ها','Request inbox')],['finance',Wallet,t('شهریه و سهم‌ها','Fees & commissions')]] as const;
 const tab=sections.some(([key])=>key===requested)?requested!:'overview';const navigate=(key:string)=>{setMobile(false);router.replace('/admin?section='+key,{scroll:false})};
 useEffect(()=>{setLang(localStorage.getItem('mahela-language')==='en'?'en':'fa')},[]);useEffect(()=>{document.documentElement.lang=lang;document.documentElement.dir=lang==='fa'?'rtl':'ltr';localStorage.setItem('mahela-language',lang)},[lang]);
 const brand=useCopyValue('site.brand',lang,'Classer');
 return <main className={'admin-shell'+(mobile?' admin-menu-open':'')}><button className="admin-menu-backdrop" aria-label={t('بستن فهرست','Close menu')} onClick={()=>setMobile(false)}/><aside className="admin-navigation"><a target="_blank" rel="noopener noreferrer" className="admin-brand" href="/admin"><span><ShieldCheck size={24}/></span><div><strong>{brand}</strong><small>{t('مرکز مدیریت','ADMINISTRATION')}</small></div></a><span className="admin-navigation-label">{t('مدیریت مجموعه','WORKSPACE')}</span><nav aria-label={t('بخش‌های مدیریت','Administration sections')}>{sections.map(([key,Icon,label],i)=><button type="button" key={key} aria-current={tab===key?'page':undefined} onClick={()=>navigate(key)}><Icon size={18}/><span>{label}</span><small>0{i+1}</small></button>)}</nav><div className="admin-navigation-content"><Palette size={20}/><strong>{t('استودیوی محتوای سایت','Site content studio')}</strong><p>{t('صفحهٔ اصلی، متن‌ها و هویت سایت','Homepage, copy and site identity')}</p><a href="/admin/content">{t('ورود به استودیو','Open studio')}<ArrowUpRight size={15}/></a></div><footer><span className="admin-avatar">{superAdmin?<Crown size={20}/>:<ShieldCheck size={20}/>}</span><div><strong>{displayName}</strong><small>{superAdmin?t('مالک و سوپرادمین','Owner & super admin'):t('مدیر سایت','Site administrator')}</small></div></footer></aside><div className="admin-main"><header className="admin-topbar"><div className="admin-breadcrumb"><button className="icon-button admin-menu-trigger" onClick={()=>setMobile(!mobile)} aria-label={t('فهرست مدیریت','Admin menu')}>{mobile?<X/>:<Menu/>}</button><span>{t('مدیریت سایت','Administration')}</span><b>/</b><strong>{sections.find(([key])=>key===tab)?.[2]}</strong></div><div className="admin-topbar-actions"><button type="button" className="btn compact" onClick={()=>setLang(lang==='fa'?'en':'fa')}><Globe size={14}/>{lang==='fa'?'EN':'فارسی'}</button><a className="btn compact" href="/" target="_blank" rel="noopener noreferrer">{t('دیدن سایت','View site')}<ArrowUpRight size={14}/></a><AccountLinks local={local}/></div></header><div className="admin-page-content"><div className="admin-page-title"><div><span className="admin-eyebrow">{t('کنترل، هماهنگی و رشد','ORGANIZE · CONNECT · GROW')}</span><h1>{sections.find(([key])=>key===tab)?.[2]}</h1><p>{t('مدیریت یکپارچهٔ کاربران، کلاس‌ها، درخواست‌ها و امور مالی مجموعه.','Manage your users, teaching records, incoming requests and finances.')}</p></div><DashboardClock/></div>{tab==='overview'?<AdminOverview lang={lang} superAdmin={superAdmin} onNavigate={navigate}/>:tab==='users'?<UsersSection me={me} superAdmin={superAdmin}/>:tab==='teachers'?<Teachers initialId={params.get('teacher')??undefined} superAdmin={superAdmin}/>:tab==='learners'?<Teachers learners initialId={params.get('teacher')??undefined} superAdmin={superAdmin}/>:tab==='finance'?<AdminFinance/>:<AdminInbox lang={lang}/>}</div></div></main>;
}
