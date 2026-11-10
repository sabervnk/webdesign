'use client';
import {useEffect,useRef,useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {AVATAR_EDGE,AVATAR_MAX,VIDEO_MAX} from '@/lib/profile-media';

type Translate=(fa:string,en:string)=>string;
export function PhotoCrop({file,t,onClose,onSave}:{file:File,t:Translate,onClose:()=>void,onSave:(blob:Blob)=>Promise<void>}){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [image,setImage]=useState<HTMLImageElement|null>(null),[zoom,setZoom]=useState(1),[x,setX]=useState(50),[y,setY]=useState(50);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{if(img.naturalWidth*img.naturalHeight>32_000_000)setError('ابعاد تصویر بیش از حد بزرگ است. / Image dimensions are too large.');else setImage(img)};
  img.onerror=()=>setError('تصویر قابل خواندن نیست. / Could not open image.');
  img.src=url;
  return ()=>{img.onload=null;img.onerror=null;URL.revokeObjectURL(url)};
 },[file]);
 useEffect(()=>{
  const ctx=canvas.current?.getContext('2d',{alpha:false});
  if(!ctx||!image)return;
  const w=image.naturalWidth,h=image.naturalHeight,edge=Math.min(w,h)/zoom;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,AVATAR_EDGE,AVATAR_EDGE);
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(image,(w-edge)*x/100,(h-edge)*y/100,edge,edge,0,0,AVATAR_EDGE,AVATAR_EDGE);
 },[image,zoom,x,y]);
 async function save(){
  const c=canvas.current;
  if(!c||!image)return;
  setBusy(true);setError('');
  try{
   for(const quality of [.82,.7,.55,.4]){
    const blob=await new Promise<Blob|null>(r=>c.toBlob(r,'image/webp',quality));
    if(blob?.type==='image/webp'&&blob.size<=AVATAR_MAX){await onSave(blob);onClose();return}
   }
   throw Error(t('ساخت نسخهٔ کم‌حجم ممکن نشد.','Could not compress the photo.'));
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <Dialog open onOpenChange={v=>{if(!v&&!busy)onClose()}}><DialogContent className="modal avatar-crop" onInteractOutside={e=>e.preventDefault()}>
  <DialogHeader><DialogTitle>{t('برش عکس پروفایل','Crop profile photo')}</DialogTitle><DialogDescription>{t('کادر مربعی را تنظیم کنید. فقط همین تصویر کوچک ذخیره می‌شود.','Adjust the square crop. Only this small image is saved.')}</DialogDescription></DialogHeader>
  <canvas ref={canvas} width={AVATAR_EDGE} height={AVATAR_EDGE} aria-label={t('پیش‌نمایش برش','Crop preview')}/>
  <div className="crop-controls">{([{label:t('بزرگ‌نمایی','Zoom'),value:zoom,min:1,max:4,step:.05,set:setZoom},{label:t('جابه‌جایی افقی','Horizontal position'),value:x,min:0,max:100,step:1,set:setX},{label:t('جابه‌جایی عمودی','Vertical position'),value:y,min:0,max:100,step:1,set:setY}]).map(c=><label key={c.label}>{c.label}<input dir="ltr" type="range" min={c.min} max={c.max} step={c.step} value={c.value} disabled={!image||busy} onChange={e=>c.set(Number(e.target.value))}/></label>)}</div>
  {error&&<p className="form-error" role="alert">{error}</p>}
  <div className="form-actions"><button type="button" className="btn" onClick={onClose} disabled={busy}>{t('انصراف','Cancel')}</button><button type="button" className="btn primary" onClick={save} disabled={!image||busy}>{busy?t('در حال ذخیره…','Saving…'):t('تأیید برش و ذخیره','Save crop')}</button></div>
 </DialogContent></Dialog>
}
type Clip={url:string,visible:boolean};
export function TeacherVideoSettings({t,published}:{t:Translate,published:boolean}){
 const [video,setVideo]=useState<Clip|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[status,setStatus]=useState('');
 const endpoint='/api/studio/video';
 async function read(response:Response){const data=await response.json() as {video:Clip|null,error?:string};if(!response.ok)throw Error(data.error||t('عملیات انجام نشد. دوباره تلاش کنید.','Could not complete the operation. Try again.'));setVideo(data.video)}
 useEffect(()=>{fetch(endpoint,{cache:'no-store'}).then(read).catch(()=>setError('دریافت ویدئو ممکن نشد. / Could not load video.')).finally(()=>setBusy(false))},[]);
 async function change(method:'POST'|'PATCH',body:File|string){
  setBusy(true);setError('');setStatus('');
  try{await read(await fetch(endpoint,{method,body,headers:{'Content-Type':method==='POST'?'video/mp4':'application/json'}}));setStatus(t('تغییرات ویدئو ذخیره شد.','Video changes saved.'))}
  catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <section className="panel studio-video">
  <div className="panel-head"><div><h2>{t('ویدئوی معرفی','Introduction video')}</h2><p>{t('با یک ویدئوی کوتاه خودتان و شیوهٔ تدریستان را معرفی کنید.','Introduce yourself and your teaching style with a short video.')}</p></div>{video&&<span className={'badge '+(video.visible&&published?'':'gray')}>{video.visible&&published?t('در حال نمایش','Visible'):t('پنهان','Hidden')}</span>}</div>
  <div className="panel-body studio-video-body">
   {video&&<video key={video.url} src={video.url} controls playsInline preload="none" aria-label={t('پیش‌نمایش ویدئوی معرفی','Introduction video preview')}/>}
   <label className="field">{video?t('جایگزینی ویدئو','Replace video'):t('انتخاب ویدئو','Choose video')}<input type="file" accept="video/mp4,.mp4" disabled={busy} onChange={e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value='';if(!f)return;setStatus('');if(f.size>VIDEO_MAX||(!f.name.toLowerCase().endsWith('.mp4')&&f.type!=='video/mp4')){setError(t('فایل MP4 حداکثر ۲۴ مگابایت انتخاب کنید.','Choose an MP4 up to 24 MB.'));return}void change('POST',f)}}/></label>
   <p className="small muted">{t('MP4 تا ۲۴ مگابایت. ویدئوی تازه پس از بارگذاری پنهان است.','MP4 up to 24 MB. New uploads are hidden by default.')}</p>
   {video&&<label className="video-visibility"><input type="checkbox" checked={video.visible} disabled={busy} onChange={e=>void change('PATCH',JSON.stringify({visible:e.target.checked,url:video.url}))}/>{t('ویدئو در پروفایل منتشرشده نمایش داده شود','Show video on my published profile')}</label>}
   {busy&&<p role="status" className="small muted">{t('لطفاً صبر کنید…','Please wait…')}</p>}
   {status&&<p role="status" className="small">{status}</p>}
   {error&&<p role="alert" className="form-error">{error}</p>}
  </div>
 </section>
}
