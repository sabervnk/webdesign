'use client';
import {useState,type ReactNode} from 'react';
import {AmountInput} from '@/components/amount-input';
import {billable,formatMoney,levels,skillKeys,type Workspace,type Skills} from '@/lib/model';

const options=<T extends string>(values:readonly T[])=>values.map(v=>[v,v] as const);
const currencies=[['TOMAN','تومان'],['USD','دلار']] as const;
const formats=[['online','آنلاین'],['in-person','حضوری']] as const;
const statuses=[['scheduled','برنامه‌ریزی‌شده'],['held','برگزارشده'],['cancelled','لغوشده']] as const;
const reasons=[['teacher','از طرف معلم'],['student','از طرف شاگرد'],['no-show','عدم حضور']] as const;
const skillLabels={listening:'شنیدن',speaking:'گفتار',reading:'خواندن',writing:'نوشتن'};
const tabs=[['profile','حساب معلم'],['students','زبان‌آموزان'],['sessions','جلسه‌ها'],['assessments','ارزیابی‌ها'],['messages','پیام‌ها']] as const;
type Tab=typeof tabs[number][0];
export function Field({label,value,onChange,type='text',max,required=false,area=false}:{label:string;value?:string;onChange:(v:string)=>void;type?:string;max?:number;required?:boolean;area?:boolean}){
 return <label className="field">{label}{area?<textarea dir="auto" value={value??''} onChange={e=>onChange(e.target.value)} maxLength={max} required={required}/>:<input dir={type==='text'?'auto':'ltr'} type={type} value={value??''} onChange={e=>onChange(e.target.value)} maxLength={max} required={required}/>}</label>
}
export function Select<V extends string>({label,value,onChange,items}:{label:string;value:V;onChange:(v:V)=>void;items:readonly (readonly [V,string])[]}){
 return <label className="field">{label}<select value={value} onChange={e=>onChange(e.target.value as V)}>{items.map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label>
}
export function Numeric({label,value,onChange,min=0,max=100000000,step=1}:{label:string;value:number;onChange:(v:number)=>void;min?:number;max?:number;step?:number}){
 return <label className="field">{label}<input type="number" dir="ltr" min={min} max={max} step={step} value={Number.isNaN(value)?'':value} onChange={e=>onChange(e.target.valueAsNumber)} required/></label>
}
function Scores({skills,set}:{skills:Skills;set:(v:Skills)=>void}){
 return <fieldset className="admin-fieldset"><legend>نمرهٔ مهارت‌ها (از ۹)</legend><div className="form-grid">{skillKeys.map(k=><Numeric key={k} label={skillLabels[k]} min={0} max={9} step={.5} value={skills[k]} onChange={v=>set({...skills,[k]:v})}/>)}</div></fieldset>;
}
function Check({label,value,onChange}:{label:string;value:boolean;onChange:(v:boolean)=>void}){
 return <label><input type="checkbox" checked={value} onChange={e=>onChange(e.target.checked)}/> {label}</label>;
}
export function RecordForm<T>({value,save,fields,locked=false}:{value:T;save:(v:T)=>Promise<void>;fields:(v:T,set:(update:Partial<T>)=>void)=>ReactNode;locked?:boolean}){
 const [draft,setDraft]=useState(value),[busy,setBusy]=useState(false),[note,setNote]=useState('');
 return <form className="account-fields admin-record-form" onSubmit={async e=>{e.preventDefault();if(busy||locked)return;setBusy(true);setNote('');try{await save(draft);setNote('تغییرات ذخیره شد.')}catch(err){setNote((err as Error).message)}finally{setBusy(false)}}}>
 {locked&&<p className="status-help">این جلسه تسویه شده و جزئیات آن برای حفظ سابقهٔ مالی فقط قابل مشاهده است.</p>}
 <fieldset className="admin-fieldset" disabled={locked||busy}>{fields(draft,patch=>setDraft(d=>({...d,...patch})))}</fieldset>
 {!locked&&<div className="actions"><button className="btn primary" disabled={busy}>{busy?'در حال ذخیره…':'ذخیرهٔ تغییرات'}</button><button className="btn" type="button" disabled={busy} onClick={()=>{setDraft(value);setNote('تغییرات ذخیره‌نشده کنار گذاشته شد.')}}>انصراف از تغییرات</button></div>}
 {note&&<p className="status-help" role="status">{note}</p>}</form>;
}
const displayDate=(value:string)=>value.slice(0,10);
const inputTimestamp=(previous:string,value:string)=>value?(value===displayDate(previous)?previous:value+'T12:00:00.000Z'):'';
function Records<T extends {id:string}>({rows,title,subtitle,empty,children}:{rows:T[];title:(row:T)=>string;subtitle:(row:T)=>string;empty:string;children:(row:T)=>ReactNode}){
 const [selected,setSelected]=useState(''),[query,setQuery]=useState(''),[limit,setLimit]=useState(20);
 const filtered=rows.filter(r=>(title(r)+' '+subtitle(r)).toLowerCase().includes(query.trim().toLowerCase()));
 return <div className="account-fields">
 {rows.length>0&&<label className="field">جست‌وجوی پرونده<input value={query} onChange={e=>{setQuery(e.target.value);setLimit(20)}} placeholder="نام یا جزئیات…"/></label>}
 {!filtered.length&&<p className="status-help">{rows.length?'نتیجه‌ای پیدا نشد.':empty}</p>}
 {filtered.slice(0,limit).map(row=><div className="admin-record" key={row.id}><button type="button" className="admin-record-toggle" aria-expanded={selected===row.id} onClick={()=>setSelected(selected===row.id?'':row.id)}><span><strong dir="auto">{title(row)}</strong><small dir="auto">{subtitle(row)}</small></span><span className="badge">{selected===row.id?'بستن':'مشاهده و ویرایش'}</span></button>{selected===row.id&&children(row)}</div>)}
 {filtered.length>limit&&<button className="btn" type="button" onClick={()=>setLimit(l=>l+20)}>نمایش موارد بیشتر ({filtered.length-limit})</button>}
 </div>;
}
export function WorkspaceEditor({data,version,onSave}:{data:Workspace;version:number;onSave:(data:Workspace,version:number)=>Promise<void>}){
 const [tab,setTab]=useState<Tab>('profile');
 const roster=data.students.map(s=>[s.id,s.name] as const);
 const names=new Map(roster);
 const studentName=(id:string)=>names.get(id)??'زبان‌آموز';
 const save=async(p:Partial<Workspace>)=>onSave({...data,...p},version);
 return <div className="account-fields"><div className="admin-nav" role="group" aria-label="بخش‌های پرونده">{tabs.map(([id,label])=><button key={id} className="btn" type="button" aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}{id!=='profile'&&<span className="badge">{data[id].length.toLocaleString('fa-IR')}</span>}</button>)}</div>
 {data.demo&&<p className="status-help">این فضای کاری در حالت نمونه است.</p>}
 {tab==='profile'&&<RecordForm value={data.profile} save={profile=>save({profile})} fields={(p,set)=><div className="form-grid">
 <Field label="نام نمایشی" value={p.name} onChange={name=>set({name})} required max={100}/><Field label="نام فارسی" value={p.nameFa} onChange={nameFa=>set({nameFa})} max={100}/><Field label="نام انگلیسی" value={p.nameEn} onChange={nameEn=>set({nameEn})} max={100}/>
 <Select label="جنسیت" value={p.gender??'unspecified'} onChange={gender=>set({gender})} items={[[ 'unspecified','ثبت نشده'],['man','آقا'],['woman','خانم'],['other','دیگر']]}/>
 <Field label="ایمیل" type="email" value={p.email} onChange={email=>set({email})} max={200}/><Field label="شماره تماس" type="tel" value={p.phone} onChange={phone=>set({phone})} max={30}/>
 <Field label="تخصص" value={p.specialization} onChange={specialization=>set({specialization})} max={100}/><Field label="تخصص به انگلیسی" value={p.specializationEn} onChange={specializationEn=>set({specializationEn})} max={100}/>
 <Select label="تقویم" value={p.calendar} onChange={calendar=>set({calendar})} items={[[ 'auto','خودکار'],['persian','شمسی'],['gregory','میلادی']]}/><Select label="ارز پیش‌فرض" value={p.currency} onChange={currency=>set({currency})} items={currencies}/>
 <Field label="معرفی" value={p.bio} onChange={bio=>set({bio})} area max={1500}/>
 </div>}/>}
 {tab==='students'&&<Records key="students" rows={data.students} title={s=>s.name} subtitle={s=>[s.level,s.email,formatMoney(s.rate,s.currency)].join(' · ')} empty="زبان‌آموزی ثبت نشده است.">{s=><RecordForm value={s} save={v=>save({students:data.students.map(x=>x.id===v.id?v:x)})} fields={(p,set)=><><div className="form-grid">
 <Field label="نام" value={p.name} onChange={name=>set({name})} required max={100}/><Field label="ایمیل" type="email" value={p.email} onChange={email=>set({email})} required max={200}/><Field label="شماره تماس" type="tel" value={p.phone} onChange={phone=>set({phone})} required max={22}/><Field label="تاریخ شروع" type="date" value={displayDate(p.since)} onChange={since=>set({since})}/>
 <Select label="سطح" value={p.level} onChange={level=>set({level})} items={options(levels)}/><Select label="جنسیت" value={p.gender} onChange={gender=>set({gender})} items={[[ 'unspecified','ثبت نشده'],['male','آقا'],['female','خانم']]}/>
 <label className="field">شهریهٔ هر جلسه<AmountInput key={p.currency} required value={p.rate} currency={p.currency} onAmountChange={v=>set({rate:Number(v)})}/></label><Select label="واحد پول" value={p.currency} onChange={currency=>set({currency})} items={currencies}/><Numeric label="مدت جلسه (دقیقه)" min={15} max={300} value={p.duration} onChange={duration=>set({duration})}/>
 </div><Scores skills={p.skills} set={skills=>set({skills})}/></>}/>}</Records>}
 {tab==='sessions'&&<Records key="sessions" rows={data.sessions} title={s=>studentName(s.studentId)} subtitle={s=>[s.date,s.time,statuses.find(([k])=>k===s.status)?.[1],s.paid?'تسویه‌شده':formatMoney(s.rate,s.currency)].join(' · ')} empty="جلسه‌ای ثبت نشده است.">{s=><RecordForm value={s} locked={s.paid&&!data.demo} save={v=>save({sessions:data.sessions.map(x=>x.id===v.id?v:x)})} fields={(p,set)=><div className="form-grid">
 <Select label="زبان‌آموز" value={p.studentId} onChange={studentId=>set({studentId})} items={roster}/><Field label="تاریخ جلسه" type="date" value={p.date} onChange={date=>set({date})} required/><Field label="ساعت شروع" type="time" value={p.time} onChange={time=>set({time})} required/><Numeric label="مدت (دقیقه)" min={15} max={300} value={p.duration} onChange={duration=>set({duration})}/>
 <Select label="نوع کلاس" value={p.type} onChange={type=>set({type})} items={formats}/><Select label="وضعیت" value={p.status} onChange={status=>set({status,...(status!=='cancelled'||p.cancelReason==='teacher'?{charge:false,paid:false,paidAt:''}:{}),...(status==='scheduled'||(status==='cancelled'&&(p.cancelReason==='teacher'||!p.charge))?{paid:false,paidAt:''}:{})})} items={statuses}/>
 {p.status==='cancelled'&&<><Select label="دلیل لغو" value={p.cancelReason} onChange={cancelReason=>set({cancelReason,...(cancelReason==='teacher'?{charge:false,paid:false,paidAt:''}:{})})} items={reasons}/>{p.cancelReason!=='teacher'&&<Check label="شهریهٔ لغو ثبت شود" value={p.charge} onChange={charge=>set({charge,...(!charge?{paid:false,paidAt:''}:{})})}/>}</>}
 <label className="field">شهریه<AmountInput key={p.currency} required value={p.rate} currency={p.currency} onAmountChange={v=>set({rate:Number(v)})}/></label><Select label="واحد پول" value={p.currency} onChange={currency=>set({currency})} items={currencies}/>
 {billable(p)&&<Check label="جلسه تسویه شده است" value={p.paid} onChange={paid=>set({paid,paidAt:paid?new Date().toISOString():''})}/>}
 <Field label="یادداشت" value={p.note} onChange={note=>set({note})} area max={2000}/>
 </div>}/>}</Records>}
 {tab==='assessments'&&<Records key="assessments" rows={data.assessments} title={a=>studentName(a.studentId)} subtitle={a=>[displayDate(a.date),a.note.slice(0,95)].filter(Boolean).join(' · ')} empty="ارزیابی‌ای ثبت نشده است.">{a=><RecordForm value={a} save={v=>save({assessments:data.assessments.map(x=>x.id===v.id?v:x)})} fields={(p,set)=><><div className="form-grid"><Select label="زبان‌آموز" value={p.studentId} onChange={studentId=>set({studentId})} items={roster}/><Field label="تاریخ ارزیابی" type="date" value={displayDate(p.date)} onChange={v=>set({date:inputTimestamp(p.date,v)})} required/></div><Scores skills={p.skills} set={skills=>set({skills})}/><Field label="بازخورد" value={p.note} onChange={note=>set({note})} area max={2000}/></>}/>}</Records>}
 {tab==='messages'&&<Records key="messages" rows={data.messages} title={m=>studentName(m.studentId)} subtitle={m=>[displayDate(m.date),m.direction==='in'?'دریافتی':'ارسالی',m.text.slice(0,95)].join(' · ')} empty="پیامی ثبت نشده است.">{m=><RecordForm value={m} save={v=>save({messages:data.messages.map(x=>x.id===v.id?v:x)})} fields={(p,set)=><><div className="form-grid"><Select label="زبان‌آموز" value={p.studentId} onChange={studentId=>set({studentId})} items={roster}/><Select label="نوع پیام" value={p.direction} onChange={direction=>set({direction})} items={[[ 'in','دریافتی'],['out','ارسالی']]}/><Field label="تاریخ پیام" type="date" value={displayDate(p.date)} onChange={v=>set({date:inputTimestamp(p.date,v)})} required/></div><Field label="متن پیام" value={p.text} onChange={text=>set({text})} area required max={4000}/></>}/>}</Records>}
 </div>;
}
