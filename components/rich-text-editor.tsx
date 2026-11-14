'use client';
import {useEffect,useRef,useState} from 'react';
import type QuillType from 'quill';
import {richDelta,richStorage,type MediaValue} from '@/lib/rich-text';
import {safeLink} from '@/lib/blog';
type Props={value:string;onChange:(value:string)=>void;lang?:string;maxLength?:number;disabled?:boolean;required?:boolean;placeholder?:string;label?:string;id?:string;compact?:boolean;onMedia?:()=>void};
export function RichTextEditor({value,onChange,lang='fa',maxLength=50000,disabled=false,required=false,placeholder,label,id,compact=false,onMedia}:Props){
 const host=useRef<HTMLDivElement>(null),quill=useRef<QuillType|null>(null),last=useRef(value),latest=useRef(value),change=useRef(onChange),media=useRef(onMedia);latest.current=value;change.current=onChange;media.current=onMedia;
 const [ready,setReady]=useState(false),[error,setError]=useState('');const t=(fa:string,en:string)=>lang==='fa'?fa:en;
 useEffect(()=>{let alive=true;const wrapper=host.current;if(!wrapper)return;setReady(false);
 import('quill').then(({default:Quill})=>{if(!alive)return;
 if(!Quill.imports['formats/lessonImage']){
 const Block=Quill.import('blots/block/embed') as any;
 class LessonImage extends Block{static blotName='lessonImage';static tagName='IMG';static create(v:MediaValue){const node=super.create() as HTMLImageElement;node.src=safeLink(v?.src)??'';node.alt=v?.caption??'';return node}static value(node:HTMLImageElement){return {src:node.getAttribute('src')??'',caption:node.alt}}}
 class LessonVideo extends Block{static blotName='lessonVideo';static tagName='VIDEO';static create(v:MediaValue){const node=super.create() as HTMLVideoElement;node.src=safeLink(v?.src)??'';node.controls=true;node.playsInline=true;node.preload='metadata';node.setAttribute('aria-label',v?.caption??'Video');return node}static value(node:HTMLVideoElement){return {src:node.getAttribute('src')??'',caption:node.getAttribute('aria-label')??''}}}
 Quill.register({'formats/lessonImage':LessonImage,'formats/lessonVideo':LessonVideo},true);
 const icons=Quill.import('ui/icons') as Record<string,unknown>;icons.lessonImage=icons.image;icons.lessonVideo=icons.video;
 }
 wrapper.replaceChildren();const editor=document.createElement('div');wrapper.append(editor);
 const toolbar=[['bold','italic'],[{header:[2,false]}],[{list:'ordered'},{list:'bullet'}],['blockquote','link'],['clean'],...(media.current?[['lessonImage','lessonVideo']]:[])];
 const q=new Quill(editor,{theme:'snow',bounds:wrapper,readOnly:disabled,placeholder:placeholder??t('اینجا بنویسید…','Write here…'),formats:['bold','italic','header','list','blockquote','link','lessonImage','lessonVideo'],modules:{toolbar:{container:toolbar,handlers:{lessonImage:()=>media.current?.(),lessonVideo:()=>media.current?.()}},history:{userOnly:true}}});
 quill.current=q;q.root.dir='auto';q.root.setAttribute('aria-label',label??t('ویرایشگر متن','Text editor'));q.root.setAttribute('aria-required',String(required));if(id)q.root.id=id;
 q.setContents(richDelta(latest.current) as any,'silent');last.current=latest.current;
 q.on('text-change',(_delta,_old,source)=>{if(source!=='user')return;const next=richStorage(q.getContents() as any);if(next.length>maxLength){q.setContents(richDelta(last.current) as any,'silent');setError(t('متن از حد مجاز طولانی‌تر است.','Text exceeds the allowed length.'));return}last.current=next;setError('');change.current(next)});
 for(const button of wrapper.querySelectorAll('button')){button.type='button';const key=button.className.replace('ql-','');const names:Record<string,string>={bold:'پررنگ',italic:'مورب',header:'عنوان',list:'فهرست',blockquote:'نقل قول',link:'پیوند',clean:'پاک‌کردن قالب',lessonImage:'افزودن عکس',lessonVideo:'افزودن ویدئو'};const name=lang==='fa'?(names[key]??key):key;button.setAttribute('aria-label',name);button.title=name}
 setReady(true);
 }).catch(()=>{if(alive)setError(t('ویرایشگر بارگیری نشد؛ صفحه را تازه کنید.','Editor could not load. Refresh the page.'))});
 return()=>{alive=false;quill.current?.disable();quill.current=null;wrapper.replaceChildren()};
 },[lang,compact]);
 useEffect(()=>{const q=quill.current;if(q&&last.current!==value){const range=q.getSelection();q.setContents(richDelta(value) as any,'silent');last.current=value;if(range)q.setSelection(Math.min(range.index,Math.max(0,q.getLength()-1)),0,'silent')}},[value,ready]);
 useEffect(()=>{quill.current?.enable(!disabled&&!host.current?.closest('fieldset[disabled]'))},[disabled,ready,value]);
 return <div className={'standard-rich-editor'+(compact?' compact':'')} aria-busy={!ready}>{!ready&&!error&&<div className="editor-loading">{t('آماده‌سازی ویرایشگر…','Loading editor…')}</div>}<div ref={host}/>{error&&<p role="alert" className="form-error">{error}</p>}<small className="rich-editor-count">{value.length.toLocaleString()} / {maxLength.toLocaleString()}</small></div>;
}
