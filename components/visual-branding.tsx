'use client';
import {useState,type ChangeEvent,type CSSProperties} from 'react';
import {Check,ImagePlus,RotateCcw,Save,Palette,ExternalLink} from 'lucide-react';
import type {CopyValues} from '@/lib/site-copy';
import {brandingDefaults,brandingKeys,brandingError,validColor,type BrandColorKey} from '@/lib/site-branding';

type Data={values:CopyValues;version:number};
const palette=(values:CopyValues)=>Object.fromEntries(brandingKeys.map(k=>[k,values[k]?.fa||brandingDefaults[k]])) as Record<BrandColorKey,string>;
const presets=[
 {name:'سبز کلاسیک',colors:['#147d67','#102b25','#d0ee98']},
 {name:'آبی معاصر',colors:['#2458a5','#142445','#f4d77a']},
 {name:'بنفش خلاق',colors:['#6740a0','#241a40','#f7d7a5']},
 {name:'آجری گرم',colors:['#a43e39','#392426','#f9d5a5']},
] as const;
const labels:Record<BrandColorKey,string>={'site.color.primary':'رنگ اصلی دکمه‌ها و لینک‌ها','site.color.hero':'پس‌زمینهٔ بخش آغازین','site.color.highlight':'رنگ تأکیدی روی بنر'};

async function pngFromImage(file:File){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8_000_000)throw Error('فایل باید PNG، JPG یا WebP و حداکثر ۸ مگابایت باشد.');
 const url=URL.createObjectURL(file);
 try{
  const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('تصویر باز نشد.'));im.src=url});
  const w=image.naturalWidth,h=image.naturalHeight;
  if(w<64||h<64||w>4096||h>4096||w/h>5||h/w>5)throw Error('لوگو باید بین ۶۴ و ۴۰۹۶ پیکسل باشد و نسبت طول به عرض از ۵:۱ بیشتر نشود.');
  const scale=Math.min(1,2048/Math.max(w,h)),canvas=document.createElement('canvas');canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('مرورگر امکان پردازش تصویر را ندارد.');ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!blob||blob.size>2_000_000)throw Error('فایل خروجی بیش از ۲ مگابایت است. لوگو را کوچک‌تر یا کم‌حجم‌تر کنید.');return blob;
 }finally{URL.revokeObjectURL(url)}
}

export function VisualBranding({data,onSaved,onRefresh}:{data:Data;onSaved:(value:Data)=>void;onRefresh:()=>Promise<void>}){
 const [colors,setColors]=useState(()=>palette(data.values));
 const [logo,setLogo]=useState(()=>data.values['site.logo']?.fa||'');
 const [error,setError]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const changed=brandingKeys.some(k=>colors[k]!== (data.values[k]?.fa||brandingDefaults[k]))||logo!==(data.values['site.logo']?.fa||'');
 const problem=brandingError(colors);
 const update=(key:BrandColorKey,value:string)=>{setColors(c=>({...c,[key]:value}));setStatus('')};
 async function upload(e:ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];e.target.value='';if(!file)return;setBusy(true);setError('');setStatus('');try{const blob=await pngFromImage(file);const r=await fetch('/api/site-logo',{method:'POST',headers:{'Content-Type':'image/png'},body:blob});const j=await r.json() as {url?:string;error?:string};if(!r.ok||!j.url)throw Error(j.error||'بارگذاری لوگو انجام نشد.');setLogo(j.url);setStatus('لوگو آماده است. برای انتشار، «ذخیرهٔ هویت بصری» را بزنید.')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function save(){if(!changed||busy)return;if(problem){setError(problem);return}setBusy(true);setError('');setStatus('');try{const changes=[...brandingKeys.map(key=>({key,locale:'fa',value:colors[key]})),{key:'site.logo',locale:'fa',value:logo}];const r=await fetch('/api/admin/content',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({changes,version:data.version})});const j=await r.json() as {values:CopyValues;version:number;error?:string};if(r.status===409){await onRefresh();throw Error('محتوای سایت هم‌زمان تغییر کرده است. رنگ‌ها و لوگوی انتخاب‌شده حفظ شدند؛ دوباره ذخیره کنید.')}if(!r.ok)throw Error(j.error||'ذخیره انجام نشد.');onSaved({values:j.values,version:j.version});setStatus('رنگ‌ها و لوگو ذخیره شدند. صفحهٔ عمومی را تازه‌سازی کنید.')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <section className="cw-branding" aria-labelledby="cw-branding-title"><div className="cw-branding-head"><div><span className="cw-eyebrow"><Palette size={16}/> تنظیمات هویت بصری</span><h2 id="cw-branding-title">رنگ و لوگوی سایت</h2><p>رنگ‌های اصلی سایت، سربرگ و بنر آغازین را یکجا تنظیم کنید؛ پیش‌نمایش قبل از ذخیره در سمت دیگر دیده می‌شود.</p></div><a className="btn" href="/" target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> مشاهدهٔ سایت</a></div>
 <div className="cw-branding-layout"><div className="cw-branding-fields"><div className="cw-branding-presets" aria-label="ترکیب‌های پیشنهادی">{presets.map(p=><button key={p.name} type="button" disabled={busy} onClick={()=>{setColors(Object.fromEntries(brandingKeys.map((k,i)=>[k,p.colors[i]])) as Record<BrandColorKey,string>);setError('');setStatus('')}}><span className="cw-swatches" aria-hidden="true">{p.colors.map(c=><i key={c} style={{background:c}}/>)}</span>{p.name}</button>)}</div><div className="cw-color-grid">{brandingKeys.map(k=><label className="cw-color-field" key={k}><span>{labels[k]}</span><span className="cw-color-controls"><input type="color" aria-label={'انتخاب '+labels[k]} value={validColor(colors[k])?colors[k]:brandingDefaults[k]} onChange={e=>update(k,e.target.value)}/><input type="text" dir="ltr" spellCheck={false} aria-label={'کد '+labels[k]} maxLength={7} placeholder={brandingDefaults[k]} value={colors[k]} onChange={e=>update(k,e.target.value)}/></span></label>)}</div>
 <div className="cw-logo-field"><div><strong>لوگوی سایت</strong><p>PNG، JPG یا WebP؛ نسخهٔ PNG با پس‌زمینهٔ شفاف توصیه می‌شود. برای لوگوی افقی نسبت تا ۵:۱ پشتیبانی می‌شود. در سربرگ و پایین صفحه نمایش داده می‌شود.</p></div><label className="btn"><ImagePlus size={17}/> انتخاب تصویر<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={upload} hidden/></label>{logo&&<button type="button" className="btn" disabled={busy} onClick={()=>setLogo('')}>حذف لوگو</button>}</div>
 {problem&&<p className="cw-feedback error" role="alert">{problem}</p>}{error&&<p className="cw-feedback error" role="alert">{error}</p>}{status&&<p className="cw-feedback success" role="status"><Check size={16}/>{status}</p>}<div className="cw-branding-actions"><button type="button" className="btn primary" disabled={!!problem||!changed||busy} onClick={()=>void save()}><Save size={17}/>{busy?'در حال پردازش…':'ذخیرهٔ هویت بصری'}</button><button type="button" className="btn" disabled={busy} onClick={()=>{setColors({...brandingDefaults});setLogo('');setError('');setStatus('')}}><RotateCcw size={16}/> بازگشت به طرح پیش‌فرض</button></div></div>
 <div className="cw-branding-preview" style={{'--preview-hero':validColor(colors['site.color.hero'])?colors['site.color.hero']:brandingDefaults['site.color.hero'],'--preview-highlight':validColor(colors['site.color.highlight'])?colors['site.color.highlight']:brandingDefaults['site.color.highlight'],'--preview-primary':validColor(colors['site.color.primary'])?colors['site.color.primary']:brandingDefaults['site.color.primary']} as CSSProperties}><span>پیش‌نمایش ترکیب رنگ</span><div className="cw-branding-preview-header"><span className="cw-branding-preview-logo">{logo?<img src={logo} alt="پیش‌نمایش لوگو"/>:<Palette size={20}/>}<b>Classer</b></span><span>معلم‌ها · بلاگ · تماس</span></div><div className="cw-branding-preview-hero"><small>فضای یادگیری زبان</small><strong>با معلمی که به تو می‌خورد.</strong><span>رنگ، لوگو و دکمه‌ها کنار هم دیده می‌شوند.</span><i>دیدن معلم‌ها</i></div></div></div></section>
}
