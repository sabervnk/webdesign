'use client';
import React,{useEffect,useState,useRef} from 'react';
import {useCopyValue} from '@/components/site-copy-provider';
import {AccountLinks} from '@/components/account-links';
import {PasswordField} from '@/components/password-field';
import {AdminInbox} from '../studio';
import type {CopyValues} from '@/lib/site-copy';
import type {Workspace} from '@/lib/model';

type Teacher={id:string;name:string;published:number};
type Account={id:string;username:string;name:string;email:string;role:'admin'|'teacher'|'student';active:number;teacher_id:string|null;student_id:string|null;must_change:number};
type Doc={id?:string;version:number;data:Record<string,unknown>};
type TeacherData={workspace:{data:Workspace;version:number}|null;profile:Doc|null;articles:{id:string;title:string;status:string}[]};
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
   <div className="form-grid"><label className="field">نام نمایشی<input name="name" required minLength={2} maxLength={100} defaultValue={editing?.name}/></label><label className="field">نام کاربری<input name="username" required minLength={3} maxLength={40} pattern="[a-zA-Z0-9][a-zA-Z0-9_.\-]{2,39}" dir="ltr" defaultValue={editing?.username}/></label><label className="field">ایمیل بازیابی (اختیاری)<input name="email" type="email" dir="ltr" defaultValue={editing?.email}/><small>برای بازیابی خودکار رمز، ایمیل معتبر و اختصاصی این کاربر را ثبت کنید.</small></label><label className="field">نقش<select value={role} onChange={e=>{setRole(e.target.value as Account['role']);setTeacher('');setSelectedStudent('')}}>{Object.entries(roles).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label></div>
   {!editing&&<PasswordField/>}
   {!editing&&role==='teacher'&&<label className="field">اتصال اختیاری به فضای معلم قبلی<select name="existingTeacher"><option value="">فضای تازه</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
   {role==='student'&&<div className="form-grid"><label className="field">معلم<select required value={teacher} onChange={e=>{setTeacher(e.target.value);setSelectedStudent('')}}><option value="">انتخاب معلم</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label className="field">زبان‌آموز<select required value={selectedStudent} onChange={e=>setSelectedStudent(e.target.value)}><option value="">انتخاب از پروندهٔ معلم</option>{roster.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>}
   <label><input type="checkbox" name="active" defaultChecked={editing?!!editing.active:true}/> حساب فعال باشد</label><button className="btn primary" disabled={busy}>{editing?'ذخیرهٔ تغییرات':'ایجاد حساب'}</button>
  </form>}
  {editing&&editing.id!==me&&<div className="account-fields"><div className="actions"><button className="btn" type="button" disabled={busy||!editing.active} onClick={()=>void mutate('PATCH',{id:editing.id,action:'recovery'})}>ساخت کد بازیابی</button><button className="btn danger" type="button" disabled={busy||!editing.active} onClick={()=>void mutate('PATCH',{id:editing.id,action:'deactivate'})}>غیرفعال‌کردن حساب</button></div><form className="account-fields" onSubmit={e=>{e.preventDefault();void mutate('PATCH',{id:editing.id,action:'password',password:new FormData(e.currentTarget).get('password')})}}><PasswordField key={editing.id} label="تنظیم رمز موقت جدید"/><button className="btn" disabled={busy}>ثبت رمز موقت</button></form></div>}
  {code&&<label className="field">کد بازیابی یک‌بارمصرف<input dir="ltr" readOnly value={code}/></label>}
  <Feedback value={note||error}/></div>
 </div></section>;
}
function DocumentEditor({doc,kind,onSave}:{doc:Doc;kind:'profile'|'workspace'|'article';onSave:(data:Record<string,unknown>,version:number)=>Promise<void>}){
 const [data,setData]=useState(doc.data),[advanced,setAdvanced]=useState(false),[raw,setRaw]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false);
 const fields=kind==='profile'?[['name','نام نمایشی'],['headline','عنوان'],['bio','معرفی'],['city','شهر']]:kind==='article'?[['title','عنوان'],['excerpt','خلاصه'],['content','متن نوشته']]:[];
 async function save(){setBusy(true);setNote('');try{await onSave(advanced?JSON.parse(raw):data,doc.version);setNote('ذخیره شد.')}catch(e){setNote((e as Error).message)}finally{setBusy(false)}}
 return <div className="account-fields">{!advanced&&fields.map(([key,label])=><label className="field" key={key}>{label}{key==='bio'||key==='content'||key==='excerpt'?<textarea dir="auto" value={String(data[key]??'')} onChange={e=>setData({...data,[key]:e.target.value})}/>:<input dir="auto" value={String(data[key]??'')} onChange={e=>setData({...data,[key]:e.target.value})}/>}</label>)}
 {!advanced&&kind==='profile'&&<label><input type="checkbox" checked={!!data.published} onChange={e=>setData({...data,published:e.target.checked})}/> پرتفولیو منتشر شود</label>}
 {!advanced&&kind==='article'&&<label className="field">وضعیت<select value={String(data.status)} onChange={e=>setData({...data,status:e.target.value})}><option value="draft">پیش‌نویس</option><option value="published">منتشرشده</option></select></label>}
 {kind==='workspace'&&!advanced&&<div className="account-fields">{(['profile','students','sessions','assessments','messages'] as const).map((key,i)=><details key={key}><summary>{['حساب معلم','زبان‌آموزان','جلسه‌ها','ارزیابی‌ها','پیام‌ها'][i]}</summary><pre className="admin-data" dir="ltr">{JSON.stringify(data[key],null,2)}</pre></details>)}</div>}
 {advanced&&<label className="field">ویرایش ساختاریافته (JSON)<textarea dir="ltr" className="admin-data" value={raw} onChange={e=>setRaw(e.target.value)} spellCheck={false}/></label>}
 <div className="actions"><button className="btn" onClick={()=>{setRaw(JSON.stringify(data,null,2));setAdvanced(v=>!v)}}>{advanced?'بازگشت':'ویرایش پیشرفته'}</button>{(advanced||kind!=='workspace')&&<button className="btn primary" disabled={busy} onClick={()=>void save()}>ذخیرهٔ تغییرات</button>}</div><Feedback value={note}/></div>;
}
function Teachers(){
 const {items,error}=useTeachers();const [id,setId]=useState(''),[detail,setDetail]=useState<TeacherData|null>(null),[article,setArticle]=useState<Doc|null>(null),[note,setNote]=useState(''),[search,setSearch]=useState('');
 const url='/api/admin/teachers',selection=useRef(0);
 async function open(next:string){const ticket=++selection.current;setId(next);setDetail(null);setArticle(null);setNote('');try{const result=await api<TeacherData>(url+'?id='+encodeURIComponent(next));if(ticket===selection.current)setDetail(result)}catch(e){if(ticket===selection.current)setNote((e as Error).message)}}
 async function openArticle(a:string){const ticket=++selection.current;setNote('');try{const result=await api<{article:Doc}>(url+'?id='+encodeURIComponent(id)+'&article='+encodeURIComponent(a));if(ticket===selection.current)setArticle(result.article)}catch(e){if(ticket===selection.current)setNote((e as Error).message)}}
 async function save(kind:'profile'|'workspace'|'article',data:Record<string,unknown>,version:number){
  const ticket=selection.current;const j=await api<{version:number}>(url,'PUT',{kind,id,data,version,articleId:article?.id});
  if(ticket!==selection.current)return;
  if(kind==='article')setArticle(a=>a?{...a,version:j.version,data}:null);
  else setDetail(d=>d?{...d,[kind]:{...d[kind],version:j.version,data}}:null);
  setNote('تغییرات ذخیره شد.');
 }
 return <section className="panel"><div className="panel-head"><div><h2>معلم‌ها و پرونده‌ها</h2><p>پرتفولیو، نوشته‌ها و پروندهٔ فضای کاری هر معلم.</p></div></div><div className="panel-body admin-split">
  <div className="account-fields"><label className="field">جست‌وجوی معلم<input value={search} onChange={e=>setSearch(e.target.value)}/></label><ul className="admin-list">{items.filter(t=>t.name.toLowerCase().includes(search.toLowerCase())).map(t=><li key={t.id}><button aria-pressed={id===t.id} onClick={()=>void open(t.id)}>{t.name}</button></li>)}</ul></div>
  <div className="account-fields"><Feedback value={note||error}/>{detail&&<><details open><summary>پرتفولیوی عمومی</summary>{detail.profile?<DocumentEditor key={id+'-p-'+detail.profile.version} doc={detail.profile} kind="profile" onSave={(data,v)=>save('profile',data,v)}/>:<p>پرتفولیو ساخته نشده است.</p>}</details>
  <details><summary>فضای کاری و اطلاعات خصوصی</summary>{detail.workspace?<DocumentEditor key={id+'-w-'+detail.workspace.version} doc={{...detail.workspace,data:detail.workspace.data as unknown as Record<string,unknown>}} kind="workspace" onSave={(data,v)=>save('workspace',data,v)}/>:<p>فضای کار هنوز ایجاد نشده است.</p>}</details>
  <details><summary>نوشته‌های معلم</summary>{detail.articles.map(a=><button className="btn" key={a.id} onClick={()=>void openArticle(a.id)}>{a.title}</button>)}{article&&<DocumentEditor key={article.id+'-'+article.version} doc={article} kind="article" onSave={(data,v)=>save('article',data,v)}/>}</details>
  </>}</div>
 </div></section>;
}
export default function AdminPanel({local,me}:{local:boolean,me:string}){
 const brand=useCopyValue('site.brand','fa','Classer');const [tab,setTab]=useState('content');
 const tabs=[['content','محتوای سایت'],['accounts','کاربران'],['teachers','معلم‌ها'],['requests','درخواست‌ها']];
 return <main className="classer-console"><div className="page-heading"><div><h1>پنل مدیریت {brand}</h1><p>محتوا، دسترسی کاربران و پرونده‌های معلم‌ها</p></div><div className="actions"><a className="btn" href="/">دیدن سایت</a>{!local&&<a className="btn" href="/dashboard">فضای معلم</a>}<AccountLinks local={local}/></div></div><nav className="admin-nav" aria-label="بخش‌های مدیریت">{tabs.map(([v,label])=><button className="btn" key={v} aria-pressed={tab===v} onClick={()=>setTab(v)}>{label}</button>)}</nav>{tab==='content'?<SiteEditor/>:tab==='accounts'?<Accounts me={me}/>:tab==='teachers'?<Teachers/>:<AdminInbox lang="fa"/>}</main>;
}

