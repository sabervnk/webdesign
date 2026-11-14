'use client';
import {useState} from 'react';
export function CommissionField({label,value,onChange,inherit=false,inherited=0,disabled=false}:{label:string;value:number|null;onChange:(value:number|null)=>void;inherit?:boolean;inherited?:number;disabled?:boolean}){
 const [draft,setDraft]=useState(''),mode=value===null?'inherit':value===0?'none':'percent';
 return <label className="field commission-field"><span>{label}</span><select value={mode} disabled={disabled} onChange={e=>{setDraft('');onChange(e.target.value==='inherit'?null:e.target.value==='none'?0:NaN)}}>{inherit&&<option value="inherit">طبق تنظیم معلم ({inherited>0?inherited+'٪':'بدون کمیسیون'})</option>}<option value="none">بدون کمیسیون</option><option value="percent">درصد مشخص</option></select>{mode==='percent'&&<input type="number" dir="ltr" min="0.01" max="100" step="0.01" disabled={disabled} required={!Number.isFinite(value)} placeholder={(Number.isFinite(value)?'فعلی: '+value+'٪ · ':'')+'مثلاً ۲۰'} value={draft} onChange={e=>{setDraft(e.target.value);onChange(e.target.value===''?NaN:Number(e.target.value))}}/>}</label>;
}
