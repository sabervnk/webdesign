'use client';
import {useState,type ComponentProps} from 'react';
// Existing data stays unchanged until the user types; examples/current values are hints.
export function NumberInput({value,defaultValue,placeholder='مثلاً ۶۰',required,...props}:ComponentProps<'input'>){
 const [edited,setEdited]=useState(false),[draft,setDraft]=useState('');
 const current=value??defaultValue,known=current!==undefined&&current!==''&&Number.isFinite(Number(current));
 return <input {...props} type="number" value={edited?draft:''} required={required&&(!known||edited)} placeholder={(known?'فعلی: '+current+' · ':'')+placeholder} onChange={e=>{setEdited(true);setDraft(e.target.value);props.onChange?.(e)}}/>;
}
