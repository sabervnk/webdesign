import {z} from 'zod';
import {database} from '@/db/storage';
import {identity,json,payload,validOrigin} from '@/lib/server/access';
import {hasPersianText,translationLocales,translateSegment} from '@/lib/translation';
export const dynamic='force-dynamic';
const digest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
export async function POST(r:Request){if(!validOrigin(r))return json({},403);try{
 const parsed=z.object({target:z.enum(translationLocales),texts:z.array(z.string().max(500).refine(s=>new TextEncoder().encode(s).length<=500)).min(1).max(8)}).safeParse(await payload(r,16000));if(!parsed.success)return json({error:'Invalid translation request.'},400);
 const {target,texts}=parsed.data,u=await identity(r),scope=u?.id??'public',day=new Date().toISOString().slice(0,10),db=database();
 const ip=await digest(r.headers.get('cf-connecting-ip')??r.headers.get('x-forwarded-for')??'anonymous'),key=(u?'user:'+u.id:'ip:'+ip)+':'+day;
 const results:Record<string,string>={},failed:string[]=[];
 for(const text of [...new Set(texts)]){
  if(target==='fa'||!hasPersianText(text)){results[text]=text;continue}
  const id=await digest(scope+'\0'+target+'\0'+text),cached=await db.prepare('SELECT translated FROM classer_translations WHERE id=?').bind(id).first<{translated:string}>();if(cached){results[text]=cached.translated;continue}
  const budget=await db.prepare('INSERT INTO classer_translation_limits (id,count) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET count=count+excluded.count WHERE count+excluded.count<=?').bind(key,text.length,u?5000:1500).run();
  if(!budget.meta.changes){failed.push(text);continue}
  try{const translated=await translateSegment(text,target);if(translated.trim()===text.trim()){failed.push(text);continue}await db.prepare('INSERT OR REPLACE INTO classer_translations (id,translated,created_at) VALUES (?,?,?)').bind(id,translated,new Date().toISOString()).run();results[text]=translated}catch{failed.push(text)}
 }
 return json({translations:results,unavailable:failed.length>0});
 }catch{return json({error:'Automatic translation is temporarily unavailable.'},503)}}
