import catalogue from '@/lib/site-copy-catalogue.json';
import {identity,json,payload,validOrigin} from '@/lib/server/access';
import {loadSiteCopy} from '@/lib/server/site-copy';
import {database} from '@/db/storage';
import {requestFailure} from '@/lib/server/http';
export const dynamic='force-dynamic';
const keys=new Set(catalogue.map(x=>x.key));
const imageSafe=(value:string)=>/^\/images\/[a-z0-9_./-]+\.(webp|jpg|jpeg|png|avif)$/i.test(value)&&!value.includes('..')||/^https:\/\/[^\s]+$/i.test(value);
export async function GET(r:Request){
 if(!(await identity(r))?.isAdmin)return json({},403);
 return json({catalogue,...await loadSiteCopy()});
}
export async function PATCH(r:Request){
 if(!(await identity(r))?.isAdmin||!validOrigin(r))return json({},403);
 try{
  const {key,locale,value,version}=await payload(r,20000);
  if(typeof key!=='string'||!keys.has(key)||(locale!=='fa'&&locale!=='en')||typeof value!=='string'||value.length>4000||!Number.isSafeInteger(version))return json({error:'اطلاعات متن معتبر نیست.'},400);
  const clean=value.trim();
  if(key==='home.image'&&clean&&!imageSafe(clean))return json({error:'نشانی تصویر باید HTTPS یا مسیر معتبر تصویر در سایت باشد.'},400);
  const {values,version:current}=await loadSiteCopy();
  if(current!==version)return json({error:'محتوا در پنجرهٔ دیگری تغییر کرده؛ دوباره بارگیری کنید.'},409);
  const entry={...values[key]};
  if(clean)entry[locale]=clean;else delete entry[locale];
  if(Object.keys(entry).length)values[key]=entry;else delete values[key];
  const serialized=JSON.stringify(values);
  if(new TextEncoder().encode(serialized).byteLength>1_500_000)return json({error:'ظرفیت متن‌های سایت پر شده است.'},413);
  const db=database();
  const changed=current===0?await db.prepare('INSERT OR IGNORE INTO classer_site_copy VALUES(1,?,1)').bind(serialized).run():await db.prepare('UPDATE classer_site_copy SET data=?,version=version+1 WHERE id=1 AND version=?').bind(serialized,current).run();
  return changed.meta.changes?json({values,version:current+1}):json({error:'محتوا تغییر کرده؛ دوباره بارگیری کنید.'},409);
 }catch(e){return requestFailure(e,'ذخیرهٔ متن انجام نشد.')}
}
