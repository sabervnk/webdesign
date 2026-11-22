import catalogue from '@/lib/site-copy-catalogue.json';
import {identity,json,payload,validOrigin} from '@/lib/server/access';
import {loadSiteCopy} from '@/lib/server/site-copy';
import {database} from '@/db/storage';
import {requestFailure} from '@/lib/server/http';
import {brandingDefaults,brandingKeys,brandingError,type BrandColorKey} from '@/lib/site-branding';
export const dynamic='force-dynamic';
const keys=new Set(catalogue.map(x=>x.key));
const imageSafe=(value:string)=>/^\/images\/[a-z0-9_./-]+\.(webp|jpg|jpeg|png|avif)$/i.test(value)&&!value.includes('..')||/^https:\/\/[^\s]+$/i.test(value);
type Change={key:string;locale:'fa'|'en';value:string};
export async function GET(r:Request){
 if(!(await identity(r))?.isAdmin)return json({},403);
 return json({catalogue,...await loadSiteCopy()});
}
export async function PATCH(r:Request){
 if(!(await identity(r))?.isAdmin||!validOrigin(r))return json({},403);
 try{
  const {key,locale,value,version,changes}=await payload(r,20000);
  if(!Number.isSafeInteger(version))return json({error:'شمارهٔ نسخه معتبر نیست.'},400);
  const updates=Array.isArray(changes)?changes:[{key,locale,value}];
  if(!updates.length||updates.length>8||updates.some(u=>!u||typeof u!=='object'||typeof u.key!=='string'||!keys.has(u.key)||(u.locale!=='fa'&&u.locale!=='en')||typeof u.value!=='string'||u.value.length>4000))return json({error:'داده‌های متن معتبر نیست.'},400);
  const edits=updates as Change[];
  if(new Set(edits.map(u=>u.key+':'+u.locale)).size!==edits.length)return json({error:'فیلد تکراری ارسال شده است.'},400);
  for(const u of edits){const clean=u.value.trim();if(u.key==='home.image'&&clean&&!imageSafe(clean))return json({error:'نشانی تصویر باید HTTPS یا مسیر تصویر داخلی سایت باشد.'},400);if(u.key==='site.logo'&&clean&&!/^\/api\/site-logo\?id=[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(clean))return json({error:'نشانی لوگو معتبر نیست.'},400)}
  const {values,version:current}=await loadSiteCopy();
  if(current!==version)return json({error:'محتوای سایت تغییر کرده است. صفحه را تازه‌سازی کنید.'},409);
  for(const u of edits){const entry={...values[u.key]};const clean=u.value.trim();if(clean)entry[u.locale]=clean;else delete entry[u.locale];if(Object.keys(entry).length)values[u.key]=entry;else delete values[u.key]}
  if(edits.some(u=>brandingKeys.includes(u.key as BrandColorKey))){const palette=Object.fromEntries(brandingKeys.map(k=>[k,values[k]?.fa||brandingDefaults[k]])) as Record<BrandColorKey,string>;const error=brandingError(palette);if(error)return json({error},400)}
  const serialized=JSON.stringify(values);
  if(new TextEncoder().encode(serialized).byteLength>1_500_000)return json({error:'حجم محتوای سایت بیش از حد مجاز است.'},413);
  const db=database();
  const changed=current===0?await db.prepare('INSERT OR IGNORE INTO classer_site_copy VALUES(1,?,1)').bind(serialized).run():await db.prepare('UPDATE classer_site_copy SET data=?,version=version+1 WHERE id=1 AND version=?').bind(serialized,current).run();
  return changed.meta.changes?json({values,version:current+1}):json({error:'محتوا هم‌زمان تغییر کرده است. دوباره تلاش کنید.'},409);
 }catch(e){return requestFailure(e,'ذخیرهٔ محتوای سایت انجام نشد.')}
}
