'use client';
import React,{useEffect,useState,useRef} from 'react';
import {useCopyValue} from '@/components/site-copy-provider';
import {PasswordField} from '@/components/password-field';
import {AdminOverview} from '@/components/admin-overview';
import {DashboardClock} from '@/components/dashboard-clock';
import {AccountLinks} from '@/components/account-links';
import {AdminInbox} from '../studio';
import {WorkspaceEditor} from './workspace-editor';
import {ArticleForm,PortfolioForm} from './portfolio-editor';
import type {ArticleInput,PublicProfileInput} from '@/lib/catalogue';
import type {CopyValues} from '@/lib/site-copy';
import type {Workspace} from '@/lib/model';

type Teacher={id:string;name:string;published:number};
type Account={id:string;username:string;name:string;email:string;phone:string;role:'admin'|'teacher'|'student';active:number;teacher_id:string|null;student_id:string|null;must_change:number};
type Doc<T>={id?:string;version:number;data:T};
type TeacherData={workspace:{data:Workspace;version:number}|null;profile:Doc<PublicProfileInput>|null;articles:{id:string;title:string;status:string}[]};
type CopyItem={key:string;fa:string;en:string;area:string;label?:string};
const roles={admin:'مدیر',teacher:'معلم',student:'شاگرد'};
async function api<T>(url:string,method='GET',body?:unknown):Promise<T>{
 const response=await fetch(url,{method,cache:'no-store',...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
 const data=await response.json() as {error?:string};
 if(!response.ok)throw Error(data.error||'عملیات انجام نشد. دسترسی یا اطلاعات را بررسی کنید.');
 return data as T;
}
function Feedback({value}:{value:string}){return value?<p role="status" className="status-help">{value}</p>:null}
function useTeachers(){
 const [items,setItems]=useState<Teacher[]>([]),[error,setError]=useState('');
 useEffect(()=>{api<{teachers:Teacher[]}>('/api/admin/teachers').then(j=>setItems(j.teachers)).catch(e=>setError(e.message))},[]);
 return {items,error};
}
function SiteEditor(){
 const [data,setData]=useState<{catalogue:CopyItem[];values:CopyValues;version:number}|null>(null);
 const [search,setSearch]=useState(''),[area,setArea]=useState(''),[key,setKey]=useState('site.brand'),[locale,setLocale]=useState<'fa'|'en'>('fa'),[draft,setDraft]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false);
 const url='/api/admin/content';
 function load(){api<NonNullable<typeof data>>(url).then(setData).catch(e=>setNote(e.message))}
 useEffect(load,[]);
 const active=data?.catalogue.find(x=>x.key===key);
 useEffect(()=>{setDraft(data?.values[key]?.[locale]??active?.[locale]??'')},[data,key,locale]);
 const results=(data?.catalogue??[]).filter(x=>(!area||x.area===area)&&[x.fa,x.en,x.label,data?.values[x.key]?.fa,data?.values[x.key]?.en].some(v=>v?.toLowerCase().includes(search.toLowerCase())));
 async function save(value:string){
  if(!data)return;setBusy(true);setNote('');
  try{const saved=await api<{values:CopyValues;version:number}>(url,'PATCH',{key,locale,value,version:data.version});setData({...data,...saved});setNote('ذخیره شد. متن تازه در بارگیری بعدی سایت نمایش داده می‌شود.')}catch(e){setNote((e as Error).message)}finally{setBusy(false)}
 }
 return <section className="panel"><div className="panel-head"><div><h2>محتوا و نوشته‌های سایت</h2><p>نام سایت، بنر، هدر، فوتر، عنوان بخش‌ها، دکمه‌ها و متن‌های رابط را جست‌وجو و ویرایش کنید.</p></div><a className="btn" href="/" target="_blank" rel="noopener noreferrer">دیدن سایت</a></div><div className="panel-body admin-split">
 <div className="account-fields"><label className="field">جست‌وجوی متن<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="مثلاً پیدا کردن معلم"/></label><label className="field">بخش<select value={area} onChange={e=>setArea(e.target.value)}><option value="">همهٔ بخش‌ها</option>{[...new Set(data?.catalogue.map(x=>x.area)??[])].map(x=><option key={x}>{x}</option>)}</select></label><ul className="admin-list">{results.map(x=><li key={x.key}><button type="button" aria-pressed={key===x.key} onClick={()=>{setKey(x.key);setNote('')}}>{x.label??x.fa}</button></li>)}</ul></div>
 <div className="account-fields">{active&&<><span className="badge">{active.area}</span><h3>{active.label??active.fa}</h3><label className="field">زبان<select value={locale} onChange={e=>setLocale(e.target.value as 'fa'|'en')}><option value="fa">فارسی</option><option value="en">English</option></select></label><label className="field">متن پیش‌فرض<small dir="auto">{active[locale]}</small></label><label className="field">متن جدید<textarea value={draft} dir="auto" maxLength={4000} onChange={e=>setDraft(e.target.value)}/></label><div className="actions"><button type="button" className="btn primary" disabled={busy} onClick={()=>void save(draft)}>ذخیرهٔ متن</button><button type="button" className="btn" disabled={busy} onClick={()=>void save('')}>بازگردانی پیش‌فرض</button></div></>}<Feedback value={note}/></div>
 </div></section>;
}
function Accounts({me}:{me:string}){
 const {items:teachers,error}=useTeachers();
 const [rows,setRows]=useState<Account[]>([]),[editing,setEditing]=useState<Account|null>(null),[role,setRole]=useState<Account['role']>('teacher'),[teacher,setTeacher]=useState(''),[roster,setRoster]=useState<Workspace['students']>([]),[selectedStudent,setSelectedStudent]=useState(''),[note,setNote]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[search,setSearch]=useState('');
 const url='/api/admin/accounts';
 function reload(){return api<{accounts:Account[]}>(url).then(j=>setRows(j.accounts)).catch(e=>setNote(e.message))}
 useEffect(()=>{void reload()},[]);
 useEffect(()=>{
  let active=true;setRoster([]);
  if(role==='student'&&teacher)api<TeacherData>('/api/admin/teachers?id='+encodeURIComponent(teacher)).then(j=>{if(active)setRoster(j.workspace?.data.demo?[]:j.workspace?.data.students??[])}).catch(e=>{if(active)setNote(e.message)});
  return ()=>{active=false};
 },[role,teacher]);
 function select(a:Account|null){setEditing(a);setRole(a?.role??'teacher');setTeacher(a?.teacher_id??'');setSelectedStudent(a?.student_id??'');setCode('');setNote('')}
 async function mutate(method:string,b:unknown){
  setBusy(true);setNote('');setCode('');
  try{const saved=await api<{code?:string}>(url,method,b);if(saved.code){setCode(saved.code);setNote('کد بازیابی فقط یک بار و تا ۳۰ دقیقه معتبر است. آن را از مسیر امن به کاربر بدهید.')}else{select(null);setNote('تغییر ذخیره شد.');await reload()}}
  catch(e){setNote((e as Error).message)}finally{setBusy(false)}
 }
 return <section className="panel"><div className="panel-head"><div><h2>کاربران و دسترسی‌ها</h2><p>نام کاربری، رمز موقت، نقش، فعال‌سازی و بازیابی حساب.</p></div><button className="btn" type="button" onClick={()=>select(null)}>کاربر جدید</button></div><div className="panel-body admin-split">
  <div className="account-fields"><label className="field">جست‌وجوی کاربر<input value={search} onChange={e=>setSearch(e.target.value)}/></label><ul className="admin-list">{rows.filter(a=>(a.name+' '+a.username+' '+a.email).toLowerCase().includes(search.toLowerCase())).map(a=><li key={a.id}><button type="button" aria-pressed={editing?.id===a.id} onClick={()=>select(a)}><strong>{a.name}</strong> · <bdi>{a.username}</bdi><small>{roles[a.role]} · {a.active?'فعال':'غیرفعال'}</small></button></li>)}</ul></div>
  <div className="account-fields"><h3>{editing?'ویرایش '+editing.name:'ایجاد کاربر'}</h3>
  {editing?.id===me?<p>برای تغییر رمز حساب خود، از دکمهٔ تغییر رمز بالای پنل استفاده کنید.</p>:<form className="account-fields" key={editing?.id??'new'} onSubmit={e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.currentTarget));void mutate(editing?'PATCH':'POST',{...v,id:editing?.id,role,teacherId:teacher,studentId:selectedStudent,active:v.active==='on'})}}>
   <div className="form-grid"><label className="field">نام نمایشی<input name="name" required minLength={2} maxLength={100} defaultValue={editing?.name}/></label><label className="field">نام کاربری<input name="username" required minLength={3} maxLength={40} pattern="[a-zA-Z0-9][a-zA-Z0-9_.\-]{2,39}" dir="ltr" defaultValue={editing?.username}/></label><label className="field">ایمیل<input name="email" type="email" dir="ltr" required maxLength={200} defaultValue={editing?.email}/></label><label className="field">شمارهٔ تلفن همراه<input name="phone" type="tel" dir="ltr" required maxLength={30} placeholder="+989121234567" defaultValue={editing?.phone}/></label><label className="field">نقش<select value={role} onChange={e=>{setRole(e.target.value as Account['role']);setTeacher('');setSelectedStudent('')}}>{Object.entries(roles).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label></div>
   {!editing&&<PasswordField label="رمز موقت"/>}
   {!editing&&role==='teacher'&&<label className="field">اتصال اختیاری به فضای معلم قبلی<select name="existingTeacher"><option value="">فضای تازه</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
   {role==='student'&&<div className="form-grid"><label className="field">معلم<select required value={teacher} onChange={e=>{setTeacher(e.target.value);setSelectedStudent('')}}><option value="">انتخاب معلم</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label className="field">زبان‌آموز<select required value={selectedStudent} onChange={e=>setSelectedStudent(e.target.value)}><option value="">انتخاب از پروندهٔ معلم</option>{roster.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>}
   <label><input type="checkbox" name="active" defaultChecked={editing?!!editing.active:true}/> حساب فعال باشد</label><button className="btn primary" disabled={busy}>{editing?'ذخیرهٔ تغییرات':'ایجاد حساب'}</button><p className="password-hint">ایمیل و تلفن همراه الزامی‌اند. کاربر پس از اولین ورود باید رمز موقت را تغییر دهد.</p>
  </form>}
  {editing&&editing.id!==me&&<div className="account-fields"><div className="actions"><button className="btn" type="button" disabled={busy||!editing.active} onClick={()=>void mutate('PATCH',{id:editing.id,action:'recovery'})}>ساخت کد بازیابی</button><button className="btn danger" type="button" disabled={busy||!editing.active} onClick={()=>void mutate('PATCH',{id:editing.id,action:'deactivate'})}>غیرفعال‌کردن حساب</button></div><form className="account-fields" onSubmit={e=>{e.preventDefault();void mutate('PATCH',{id:editing.id,action:'password',password:new FormData(e.currentTarget).get('password')})}}><PasswordField key={editing.id} label="تنظیم رمز موقت جدید"/><button className="btn" disabled={busy}>ثبت رمز موقت</button></form></div>}
  {code&&<label className="field">کد بازیابی یک‌بارمصرف<input dir="ltr" readOnly value={code}/></label>}
  <Feedback value={note||error}/></div>
 </div></section>;
}
function Teachers({superAdmin}:{superAdmin:boolean}){
 const {items,error}=useTeachers();const [id,setId]=useState(''),[detail,setDetail]=useState<TeacherData|null>(null),[article,setArticle]=useState<Doc<ArticleInput>|null>(null),[note,setNote]=useState(''),[search,setSearch]=useState('');
 const url='/api/admin/teachers',selection=useRef(0),articleSelection=useRef(0);
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
  else setDetail(d=>d?{...d,workspace:{version:j.version,data:data as Workspace}}:d);
  setNote('تغییرات ذخیره شد.');
 }
 return <section className="panel"><div className="panel-head"><div><h2>معلم‌ها و پرونده‌ها</h2><p>پرتفولیو، نوشته‌ها و پروندهٔ فضای کاری هر معلم.</p></div></div><div className="panel-body admin-split admin-teacher-split">
  <div className="account-fields"><label className="field">جست‌وجوی معلم<input value={search} onChange={e=>setSearch(e.target.value)}/></label><ul className="admin-list">{items.filter(t=>t.name.toLowerCase().includes(search.toLowerCase())).map(t=><li key={t.id}><button aria-pressed={id===t.id} onClick={()=>void open(t.id)}>{t.name}</button></li>)}</ul></div>
  <div className="account-fields"><Feedback value={note||error}/>{detail&&<><details open><summary>پرتفولیوی عمومی</summary>{detail.profile?.id&&detail.profile.data.published&&<a className="btn" href={'/teachers/'+detail.profile.id} target="_blank" rel="noopener noreferrer">دیدن صفحهٔ عمومی معلم</a>}<p className="password-hint">اطلاعات این بخش، پس از انتشار پرتفولیو، در صفحهٔ معلم نمایش داده می‌شود.</p>{detail.profile?<PortfolioForm key={id} data={detail.profile.data} onSave={data=>save('profile',data,detail.profile!.version)}/>:<p>پرتفولیو ساخته نشده است.</p>}</details>
  {superAdmin&&<details><summary>فضای کاری و اطلاعات خصوصی</summary>{detail.workspace?<WorkspaceEditor key={id} {...detail.workspace} onSave={(data,v)=>save('workspace',data,v)}/>:<p>فضای کار هنوز ایجاد نشده است.</p>}</details>}
  <details><summary>نوشته‌های معلم</summary>{detail.articles.map(a=><button className="btn" key={a.id} onClick={()=>void openArticle(a.id)}>{a.title}</button>)}{article&&<ArticleForm key={article.id} data={article.data} onSave={data=>save('article',data,article.version)}/>}</details>
  </>}</div>
 </div></section>;
}
function UsersSection({me,superAdmin}:{me:string;superAdmin:boolean}){
 const [view,setView]=useState(superAdmin?'accounts':'teachers');
 return <div className="account-fields"><div className="actions" role="group" aria-label="بخش‌های کاربران">{superAdmin&&<button className="btn" aria-pressed={view==='accounts'} onClick={()=>setView('accounts')}>حساب‌ها و نقش‌ها</button>}<button className="btn" aria-pressed={view==='teachers'} onClick={()=>setView('teachers')}>معلم‌ها، پرتفولیو و پرونده‌ها</button></div>{view==='accounts'&&superAdmin?<Accounts me={me}/>:<Teachers superAdmin={superAdmin}/>}</div>;
}
export default function AdminPanel({local,me,superAdmin}:{local:boolean;me:string;superAdmin:boolean}){
 const brand=useCopyValue('site.brand','fa','Classer');const [tab,setTab]=useState('overview');
 const tabs=[['overview','پیشخوان مدیریت'],['users','کاربران و معلم‌ها'],['content','محتوای سایت'],['requests','درخواست‌ها']];
 return <main className="classer-console"><div className="page-heading"><div><h1>{superAdmin?'پنل سوپرادمین ':'پنل مدیریت '}{brand}</h1><p>{superAdmin?'مدیریت کامل سایت، حساب‌ها و دسترسی‌ها':'مدیریت محتوا و پرتفولیوها با دسترسی محدود'}</p></div><div className="actions"><DashboardClock/><a className="btn" href="/">دیدن سایت</a>{!local&&<a className="btn" href="/dashboard">فضای معلم</a>}<AccountLinks local={local}/></div></div><nav className="admin-nav" aria-label="بخش‌های مدیریت">{tabs.map(([v,label])=><button className="btn" key={v} aria-pressed={tab===v} onClick={()=>setTab(v)}>{label}</button>)}</nav>{tab==='overview'?<AdminOverview superAdmin={superAdmin} onNavigate={setTab}/>:tab==='content'?<SiteEditor/>:tab==='users'?<UsersSection me={me} superAdmin={superAdmin}/>:<AdminInbox lang="fa"/>}</main>;
}
