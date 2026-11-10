'use client';
import {useState,type ComponentProps} from 'react';
import type {Currency} from '@/lib/model';

type AmountInputProps=Omit<ComponentProps<'input'>,'type'|'value'|'defaultValue'|'onChange'|'inputMode'|'min'|'max'|'step'> & {
 value:number|string;
 currency:Currency;
 onAmountChange:(unformatted:string)=>void;
 max?:number;
};

const ungroup=(value:string)=>value.replace(/[۰-۹٠-٩]/g,d=>String(d.charCodeAt(0)&15)).replace(/٫/g,'.').replace(/[,٬\s]/g,'');
const group=(raw:string)=>raw.replace(/^\d+/,whole=>whole.replace(/\B(?=(\d{3})+(?!\d))/g,','));

export function AmountInput({value,currency,onAmountChange,max=100000000,...props}:AmountInputProps){
 const [draft,setDraft]=useState(String(value));
 const raw=typeof value==='string'?value:Number(draft)===value?draft:String(value);
 return <input {...props} type="text" dir="ltr" inputMode={currency==='USD'?'decimal':'numeric'} value={group(raw)} onChange={e=>{
  const input=e.currentTarget;
  const next=ungroup(input.value);
  const caret=ungroup(input.value.slice(0,input.selectionStart??input.value.length)).length;
  if(!(currency==='USD'?/^(?:\d{1,9}(?:\.\d{0,2})?)?$/:/^\d{0,9}$/).test(next)||Number(next)>max)return;
  setDraft(next);onAmountChange(next);
  requestAnimationFrame(()=>{
   if(document.activeElement!==input)return;
   let pos=0,seen=0;
   while(pos<input.value.length&&seen<caret){if(input.value[pos]!==',')seen++;pos++}
   input.setSelectionRange(pos,pos);
  });
 }}/>;
}
