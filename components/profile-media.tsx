'use client';
import {useEffect,useRef,useState,type PointerEvent,type KeyboardEvent} from 'react';
import {Crop,RotateCcw} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {AVATAR_EDGE,AVATAR_MAX,VIDEO_MAX} from '@/lib/profile-media';

type Translate=(fa:string,en:string)=>string;
type Frame={x:number,y:number,size:number};
type Drag={pointer:number,x:number,y:number,scale:number,frame:Frame,corner?:[number,number]};
const MIN_FRAME=.22;
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const centered=(w:number,h:number,size=.82):Frame=>({x:(w-size)/2,y:(h-size)/2,size});

export function PhotoCrop({file,t,onClose,onSave}:{file:File,t:Translate,onClose:()=>void,onSave:(blob:Blob)=>Promise<void>}){
 const canvas=useRef<HTMLCanvasElement>(null),stage=useRef<HTMLDivElement>(null),drag=useRef<Drag|null>(null);
 const [image,setImage]=useState<HTMLImageElement|null>(null),[frame,setFrame]=useState<Frame>({x:0,y:0,size:1});
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const unit=image?Math.min(image.naturalWidth,image.naturalHeight):1;
 const w=(image?.naturalWidth??1)/unit,h=(image?.naturalHeight??1)/unit;
 useEffect(()=>{
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{
   const {naturalWidth:iw,naturalHeight:ih}=img;
   if(!iw||!ih||iw*ih>32_000_000){setError('ابعاد تصویر نامعتبر یا بیش از حد بزرگ است. / Invalid or oversized image dimensions.');return}
   const d=Math.min(iw,ih);setFrame(centered(iw/d,ih/d));setImage(img);
  };
  img.onerror=()=>setError('تصویر قابل خواندن نیست. / Could not open image.');
  img.src=url;
  return ()=>{img.onload=null;img.onerror=null;URL.revokeObjectURL(url)};
 },[file]);

 function draw(){
  const c=canvas.current,ctx=c?.getContext('2d',{alpha:false});
  if(!ctx||!image)return null;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,AVATAR_EDGE,AVATAR_EDGE);
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(image,frame.x*unit,frame.y*unit,frame.size*unit,frame.size*unit,0,0,AVATAR_EDGE,AVATAR_EDGE);
  return c;
 }
 useEffect(()=>{draw()},[image,frame]);
 function move(f:Frame,dx:number,dy:number){
  return {...f,x:clamp(f.x+dx,0,w-f.size),y:clamp(f.y+dy,0,h-f.size)};
 }
 function resize(size:number){
  setFrame(f=>{const side=clamp(size,MIN_FRAME,1);return move({...f,size:side},(f.size-side)/2,(f.size-side)/2)});
 }
 function begin(e:PointerEvent<HTMLDivElement>){
  if(busy||!image||!e.isPrimary||e.button!==0||!stage.current)return;
  e.preventDefault();
  const part=(e.target as HTMLElement).dataset.corner;
  const corner=part?.split(',').map(Number) as [number,number]|undefined;
  drag.current={pointer:e.pointerId,x:e.clientX,y:e.clientY,scale:stage.current.getBoundingClientRect().width/w,frame,corner};
  e.currentTarget.focus({preventScroll:true});e.currentTarget.setPointerCapture(e.pointerId);
 }
 function track(e:PointerEvent<HTMLDivElement>){
  const d=drag.current;
  if(!d||d.pointer!==e.pointerId)return;
  const dx=(e.clientX-d.x)/d.scale,dy=(e.clientY-d.y)/d.scale,f=d.frame;
  if(!d.corner){setFrame(move(f,dx,dy));return}
  const [sx,sy]=d.corner,ax=f.x+(sx<0?f.size:0),ay=f.y+(sy<0?f.size:0);
  const max=Math.min(sx<0?ax:w-ax,sy<0?ay:h-ay);
  const size=clamp(f.size+(sx*dx+sy*dy)/2,MIN_FRAME,max);
  setFrame({x:ax-(sx<0?size:0),y:ay-(sy<0?size:0),size});
 }
 function keyMove(e:KeyboardEvent<HTMLDivElement>){
  if(busy)return;
  const step=e.shiftKey?.05:.015;
  const deltas:Record<string,[number,number]>={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
  const d=deltas[e.key];
  if(d){e.preventDefault();setFrame(f=>move(f,...d))}
  else if(['+','=','-'].includes(e.key)){e.preventDefault();resize(frame.size+(e.key==='-'?-step:step))}
 }
 async function save(){
  const c=draw();
  if(!c||busy)return;
  setBusy(true);setError('');
  try{
   for(const quality of [.82,.7,.55,.4]){
    const blob=await new Promise<Blob|null>(r=>c.toBlob(r,'image/webp',quality));
    if(blob?.type==='image/webp'&&blob.size<=AVATAR_MAX){await onSave(blob);onClose();return}
   }
   throw Error(t('ساخت نسخهٔ کم‌حجم ممکن نشد.','Could not compress the photo.'));
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <Dialog open onOpenChange={v=>{if(!v&&!busy)onClose()}}><DialogContent className="modal avatar-crop" onInteractOutside={e=>e.preventDefault()} showCloseButton={!busy}>
  <DialogHeader><DialogTitle className="crop-title"><Crop size={21}/>{t('کادر عکس پروفایل','Frame your profile photo')}</DialogTitle><DialogDescription>{t('قاب را روی عکس بکشید؛ برای تغییر اندازه، یکی از گوشه‌ها را بگیرید.','Drag the frame over the photo. Pull any corner to resize it.')}</DialogDescription></DialogHeader>
  {image&&<div className="crop-editor">
   <div className="crop-stage">
    <div ref={stage} className="crop-photo" dir="ltr" style={{width:`min(100%, ${w/h*370}px, ${w/h*48}dvh)`,aspectRatio:w/h}}>
     <img src={image.src} alt="" draggable={false}/>
     <div className="crop-frame" role="group" aria-label={t('قاب برش؛ جابه‌جایی با کلیدهای جهت و تغییر اندازه با مثبت و منفی','Crop frame; use arrow keys to move and plus or minus to resize')} tabIndex={busy?-1:0}
      style={{left:frame.x/w*100+'%',top:frame.y/h*100+'%',width:frame.size/w*100+'%',height:frame.size/h*100+'%'}}
      onPointerDown={begin} onPointerMove={track} onLostPointerCapture={()=>{drag.current=null}} onKeyDown={keyMove}>
      <span className="crop-grid" aria-hidden="true"/>
      {['-1,-1','1,-1','-1,1','1,1'].map((corner,i)=><span key={corner} className={'crop-handle crop-handle-'+i} data-corner={corner} aria-hidden="true"/>)}
     </div>
    </div>
   </div>
   <div className="crop-tools">
    <div className="crop-live"><canvas ref={canvas} width={AVATAR_EDGE} height={AVATAR_EDGE} aria-label={t('پیش‌نمایش برش','Crop preview')}/><span>{t('پیش‌نمایش','Preview')}</span></div>
    <label className="crop-size">{t('اندازهٔ قاب','Frame size')}<input dir="ltr" type="range" min={22} max={100} value={Math.round(frame.size*100)} disabled={busy} onChange={e=>resize(Number(e.target.value)/100)}/></label>
    <button type="button" className="btn crop-reset" disabled={busy} onClick={()=>setFrame(centered(w,h))}><RotateCcw size={16}/>{t('بازنشانی','Reset')}</button>
   </div>
  </div>}
  {!image&&!error&&<p role="status" className="small muted">{t('در حال آماده‌سازی عکس…','Opening your photo…')}</p>}
  {error&&<p className="form-error" role="alert">{error}</p>}
  <div className="form-actions"><button type="button" className="btn" onClick={onClose} disabled={busy}>{t('انصراف','Cancel')}</button><button type="button" className="btn primary" onClick={save} disabled={!image||busy}>{busy?t('در حال ذخیره…','Saving…'):t('ذخیرهٔ عکس','Save photo')}</button></div>
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
