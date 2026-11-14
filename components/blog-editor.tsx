'use client';
import {useRef,useState} from 'react';
import {BlogContent} from './blog-content';
export function BlogEditor({value,onChange,lang='fa',onMedia}:{value:string;onChange:(v:string)=>void;lang?:string;onMedia?:()=>void}){
 const input=useRef<HTMLTextAreaElement>(null),[preview,setPreview]=useState(false),[link,setLink]=useState(false),[url,setUrl]=useState('');
 const t=(fa:string,en:string)=>lang==='fa'?fa:en;
 function insert(before:string,after='',fallback=''){const el=input.current,start=el?.selectionStart??value.length,end=el?.selectionEnd??value.length,selection=value.slice(start,end)||fallback;onChange(value.slice(0,start)+before+selection+after+value.slice(end));requestAnimationFrame(()=>{el?.focus();el?.setSelectionRange(start+before.length,start+before.length+selection.length)})}
 return <div className="blog-editor"><div className="blog-toolbar" role="toolbar" aria-label={t('ابزارهای ویرایش متن','Formatting tools')}>
 {[[t('پررنگ','Bold'),'**','**'],[t('مورب','Italic'),'*','*'],[t('عنوان بخش','Heading'),'\n\n## ',''],[t('فهرست','List'),'\n- ',''],[t('فهرست شماره‌دار','Numbered list'),'\n1. ',''],[t('نقل قول','Quote'),'\n\n> ','']].map(([label,before,after])=><button className="btn compact" type="button" key={label} disabled={preview} onMouseDown={e=>e.preventDefault()} onClick={()=>insert(before,after,t('متن','Text'))}>{label}</button>)}
 <button type="button" className="btn compact" disabled={preview} onClick={()=>setLink(!link)}>{t('پیوند','Link')}</button>{onMedia&&<button type="button" className="btn compact" onClick={onMedia}>{t('افزودن عکس / ویدئو','Add image / video')}</button>}<button type="button" className="btn compact" aria-pressed={preview} onClick={()=>setPreview(!preview)}>{preview?t('بازگشت به ویرایش','Edit'):t('پیش‌نمایش','Preview')}</button></div>
 {link&&<div className="blog-link-form"><input aria-label="HTTPS URL" type="url" dir="ltr" placeholder="https://" value={url} onChange={e=>setUrl(e.target.value)}/><button type="button" className="btn" disabled={!/^https:\/\/\S+$/.test(url)} onClick={()=>{insert('[',']('+url+')',t('عنوان پیوند','Link text'));setLink(false);setUrl('')}}>{t('درج پیوند','Insert link')}</button></div>}
 {preview?<div className="blog-editor-preview"><BlogContent content={value}/></div>:<textarea ref={input} aria-label={t('متن نوشته','Article content')} dir="auto" maxLength={50000} value={value} onChange={e=>onChange(e.target.value)} placeholder={t('داستان، تجربه یا آموزش خود را بنویسید…','Write your story, experience or lesson…')}/>}
 <div className="blog-word-count">{value.trim()?value.trim().split(/\s+/).length:0} {t('واژه','words')} · {value.length.toLocaleString()} / 50,000</div></div>;
}
