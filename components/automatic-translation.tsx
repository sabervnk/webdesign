'use client';
import {useEffect,useState} from 'react';
import dictionary from '@/lib/translation-dictionary.json';
import {hasPersianText,translationChunks} from '@/lib/translation';
const known=dictionary as Record<string,string>,cache=new Map<string,string>();
const sourceAttributes=new WeakMap<Element,Record<string,{original:string;rendered:string}>>();
const sourceNodes=new WeakMap<Text,{original:string;rendered:string}>();
export function AutomaticTranslation(){
 const [unavailable,setUnavailable]=useState(false);
 useEffect(()=>{
  let cancelled=false,running=false,queued=false,timer:ReturnType<typeof setTimeout>;const failed=new Set<string>();
  const ignored='script,style,noscript,textarea,input,select option[value="fa"],code,pre,[contenteditable="true"],[translate="no"],[data-no-translate],.ql-editor';
  async function run(){if(running){queued=true;return}running=true;queued=false;const lang=document.documentElement.lang.split('-')[0]||'fa';if(lang==='fa')setUnavailable(false);
   for(const element of document.querySelectorAll('[placeholder],[title],[aria-label]')){if(element.closest('[translate="no"],[data-no-translate]'))continue;const saved=sourceAttributes.get(element)??{};for(const name of ['placeholder','title','aria-label']){const current=element.getAttribute(name);if(current===null)continue;const old=saved[name],original=old&&current===old.rendered?old.original:current;if(lang==='fa'){if(old&&current===old.rendered)element.setAttribute(name,old.original);delete saved[name]}else if(lang==='en'&&known[original.trim()]){const rendered=original.replace(original.trim(),known[original.trim()]);saved[name]={original,rendered};if(current!==rendered)element.setAttribute(name,rendered)}}sourceAttributes.set(element,saved)}
   const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),pending:{node:Text;original:string;chunks:string[]}[]=[];
   while(walker.nextNode()){
    const node=walker.currentNode as Text;if(node.parentElement?.closest(ignored))continue;
    let value=node.nodeValue??'',old=sourceNodes.get(node);if(old&&value!==old.rendered)old=undefined;
    if(lang==='fa'){if(old){node.nodeValue=old.original;sourceNodes.delete(node)}continue}
    const original=old?.original??value;if(!hasPersianText(original)||!original.trim())continue;
    const direct=lang==='en'?known[original.trim()]:undefined;
    if(direct){const rendered=original.replace(original.trim(),direct);sourceNodes.set(node,{original,rendered});if(node.nodeValue!==rendered)node.nodeValue=rendered;continue}
    const chunks=translationChunks(original);pending.push({node,original,chunks});
   }
   const missing=[...new Set(pending.flatMap(x=>x.chunks).filter(x=>hasPersianText(x)&&!cache.has(lang+'\0'+x)&&!failed.has(lang+'\0'+x)))];
   for(let i=0;i<missing.length&&!cancelled;i+=4){if(document.documentElement.lang.split('-')[0]!==lang)break;try{const r=await fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({target:lang,texts:missing.slice(i,i+4)})}),j=await r.json();if(!r.ok)throw Error();for(const text of missing.slice(i,i+4)){const result=j.translations?.[text];if(result)cache.set(lang+'\0'+text,result);else failed.add(lang+'\0'+text)}if(j.unavailable)setUnavailable(true)}catch{for(const text of missing.slice(i,i+4))failed.add(lang+'\0'+text);setUnavailable(true)}
    if(document.documentElement.lang.split('-')[0]!==lang)break;
    for(const item of pending){if(!item.node.isConnected)continue;const value=item.node.nodeValue??'',old=sourceNodes.get(item.node);if(value!==item.original&&value!==old?.rendered)continue;const rendered=item.chunks.map(c=>cache.get(lang+'\0'+c)??c).join('');if(rendered!==item.original){sourceNodes.set(item.node,{original:item.original,rendered});item.node.nodeValue=rendered}}
   }
   // Cached content needs no request, including route revisits.
   if(document.documentElement.lang.split('-')[0]===lang)for(const item of pending){const old=sourceNodes.get(item.node);if(!item.node.isConnected||(item.node.nodeValue!==item.original&&item.node.nodeValue!==old?.rendered))continue;const rendered=item.chunks.map(c=>cache.get(lang+'\0'+c)??c).join('');if(rendered!==item.original){sourceNodes.set(item.node,{original:item.original,rendered});if(item.node.nodeValue!==rendered)item.node.nodeValue=rendered}}
   running=false;if(queued&&!cancelled)timer=setTimeout(run,200);
  }
  const observer=new MutationObserver(()=>{if(cancelled)return;clearTimeout(timer);timer=setTimeout(run,250)});observer.observe(document.body,{subtree:true,childList:true,characterData:true});observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});timer=setTimeout(run,300);
  return()=>{cancelled=true;clearTimeout(timer);observer.disconnect()};
 },[]);
 return unavailable?<button className="translation-notice" translate="no" onClick={()=>location.reload()} title="Reload to retry automatic translation">Some automatic translations are unavailable. Original text is preserved. ↻</button>:null;
}
