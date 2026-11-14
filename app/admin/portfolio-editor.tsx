'use client';
import {useState} from 'react';
import {useSiteText} from '@/components/site-copy-provider';
import {articleCategories,classOffers,educationLevels,languageCodes,languages,portfolioItems,type ArticleInput,type ContentLocale,type DisplayOffer,type PublicProfileInput} from '@/lib/catalogue';
import {FeeMatrix,PortfolioItems} from '../studio';
import {Field,Numeric,RecordForm,Select} from './workspace-editor';

const langOptions=languageCodes.map(code=>[code,languages[code][0]] as const);
const formats=['online','in-person'] as const;
const degrees=[['','ثبت نشده'] as const,...(Object.keys(educationLevels) as (keyof typeof educationLevels)[]).map(key=>[key,educationLevels[key][0]] as const)];
export function PortfolioForm({data,onSave}:{data:PublicProfileInput;onSave:(v:PublicProfileInput)=>Promise<void>}){
 const t=useSiteText('fa'),[picked,setPicked]=useState<ContentLocale>('en');
 return <RecordForm value={data} save={onSave} fields={(p,set)=>{
  const source=p.contentLocale??'fa',target=source===picked?(source==='en'?'fa':'en'):picked,tr=p.translations?.[target]??{};
  function translate(key:keyof typeof tr,value:string|string[]){set({translations:{...p.translations,[target]:{...tr,[key]:value}}})}
  function fees(offers:DisplayOffer[]){return {offers,formats:formats.filter(f=>offers.some(o=>o.format===f))}}
  const textFields=[['name','نام نمایشی',100],['headline','عنوان',150],['city','شهر',100],['bio','معرفی',5000],['educationField','رشتهٔ تحصیلی',2000]] as const;
  return <div className="account-fields">
   <div className="form-grid"><Select label="زبان اصلی" value={source} onChange={contentLocale=>set({contentLocale})} items={langOptions}/><Select label="ویرایش ترجمه" value={target} onChange={setPicked} items={langOptions.filter(([code])=>code!==source)}/></div>
   <div className="form-grid">{textFields.flatMap(([key,label,max])=>[
    <Field key={key} label={label} max={max} area={key==='bio'} value={p[key]??(key==='educationField'?p.education:'')} required={key==='name'} onChange={v=>set({[key]:v})}/>,
    <Field key={key+'-tr'} label={label+' · '+languages[target][0]} max={max} area={key==='bio'} value={tr[key]} onChange={v=>translate(key,v)}/>,
   ])}</div>
   <div className="form-grid"><Select label="جنسیت در پروفایل عمومی" value={p.gender??'unspecified'} items={[['unspecified','نمایش داده نشود'],['man','آقا'],['woman','خانم'],['other','دیگر']]} onChange={gender=>set({gender})}/><Numeric label="سابقهٔ تدریس (سال)" value={p.experience} max={70} onChange={experience=>set({experience})}/><Select label="مقطع تحصیلی" value={p.educationLevel??''} items={degrees} onChange={educationLevel=>set({educationLevel})}/></div>
   <div className="form-grid">{(['certificates','specialties'] as const).flatMap(key=>{
    const label=key==='certificates'?'گواهی‌ها':'تخصص‌ها',field=key==='certificates'?'certificateItems':'specialtyItems';
    return [<PortfolioItems key={field} title={label} placeholder="مورد جدید" items={portfolioItems(p,key)} t={t} onChange={items=>set({[field]:items})}/>,
    <PortfolioItems key={field+'-tr'} title={label+' · '+languages[target][0]} placeholder="مورد جدید" items={tr[field]??[]} t={t} onChange={items=>translate(field,items)}/>]
   })}</div>
   <fieldset className="admin-fieldset"><legend>زبان‌های تدریس</legend><div className="actions">{langOptions.map(([code,label])=><label key={code}><input type="checkbox" checked={p.languages.includes(code)} onChange={e=>{
    const enabled=e.target.checked,rows=classOffers(p);
    const offers=enabled?[...rows,{language:code,format:'online' as const,rate:p.rate,currency:p.currency,duration:p.duration}]:rows.filter(o=>o.language!==code);
    set({languages:enabled?[...p.languages,code]:p.languages.filter(l=>l!==code),...fees(offers)});
   }}/> {label}</label>)}</div></fieldset>
   <FeeMatrix p={p} lang="fa" t={t} onChange={offers=>set(fees(offers))}/>
   <label><input type="checkbox" checked={p.published} onChange={e=>set({published:e.target.checked})}/> پرتفولیو منتشر شود</label>
  </div>;
 }}/>;
}
export function ArticleForm({data,onSave}:{data:ArticleInput;onSave:(v:ArticleInput)=>Promise<void>}){
 const [picked,setPicked]=useState<ContentLocale>('en');
 return <RecordForm value={data} save={onSave} fields={(a,set)=>{
 const source=a.contentLocale??'fa',target=source===picked?(source==='en'?'fa':'en'):picked,tr=a.translations?.[target]??{};
 return <div className="account-fields">
  <div className="form-grid"><Select label="زبان اصلی" value={source} onChange={contentLocale=>set({contentLocale})} items={langOptions}/><Select label="ویرایش ترجمه" value={target} onChange={setPicked} items={langOptions.filter(([code])=>code!==source)}/></div>
  <div className="form-grid">{([['title','عنوان',180],['excerpt','خلاصه',350],['content','متن نوشته',50000]] as const).flatMap(([key,label,max])=>[
   <Field key={key} label={label} value={a[key]} area={key!=='title'} max={max} required={key!=='excerpt'} onChange={v=>set({[key]:v})}/>,
   <Field key={key+'-tr'} label={label+' · '+languages[target][0]} value={tr[key]} area={key!=='title'} max={max} onChange={v=>set({translations:{...a.translations,[target]:{...tr,[key]:v}}})}/>,
  ])}</div>
  <div className="form-grid"><Select label="دسته‌بندی" value={a.category} onChange={category=>set({category})} items={Object.entries(articleCategories).map(([k,v])=>[k,v[0]] as const) as (readonly [ArticleInput['category'],string])[]}/><Select label="وضعیت" value={a.status} onChange={status=>set({status})} items={[[ 'draft','پیش‌نویس'],['published','منتشرشده'],['archived','آرشیوشده'],['trash','زباله‌دان']]}/></div>
 </div>}}/>;
}
