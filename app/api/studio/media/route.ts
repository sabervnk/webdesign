import {bucket,database} from '@/db/storage';
import {teacherIdentity,json,payload,validOrigin} from '@/lib/server/access';
import {readBytes,requestFailure} from '@/lib/server/http';
import {mp4Duration} from '@/lib/server/mp4';
export const dynamic='force-dynamic';
export async function GET(r:Request){const u=await teacherIdentity(r);if(!u)return json({},401);return json({media:(await database().prepare('SELECT id,type,size,name FROM classer_blog_media WHERE owner_id=? ORDER BY created_at DESC LIMIT 100').bind(u.id).all()).results})}
export async function POST(r:Request){
 const u=await teacherIdentity(r);if(!u)return json({},401);if(!validOrigin(r))return json({},403);
 const type=r.headers.get('content-type')??'';if(!['image/jpeg','image/png','image/webp','video/mp4'].includes(type))return json({error:'عکس JPG، PNG، WebP یا ویدئوی MP4 انتخاب کنید.'},400);
 try{const a=await readBytes(r,type==='video/mp4'?50*1024*1024:5*1024*1024);const at=(start:number,text:string)=>[...text].every((c,i)=>a[start+i]===c.charCodeAt(0));
 const valid=type==='image/jpeg'?a.length>3&&a[0]===255&&a[1]===216&&a[2]===255:type==='image/png'?a.length>24&&a[0]===137&&at(1,'PNG\r\n\x1a\n'):type==='image/webp'?at(0,'RIFF')&&at(8,'WEBP'):false;
 if(type==='video/mp4'){const seconds=mp4Duration(a);if(seconds===null||seconds>300)return json({error:'ویدئو باید MP4 معتبر و حداکثر ۵ دقیقه باشد.'},400)}else if(!valid)return json({error:'محتوای فایل با نوع عکس مطابقت ندارد.'},400);
 const id=crypto.randomUUID(),key='blog-media/'+id;let name='Media';try{name=decodeURIComponent(r.headers.get('x-file-name')??'Media').replace(/[\x00-\x1f]/g,'').slice(0,180)}catch{}
 await bucket().put(key,a.buffer as ArrayBuffer,{httpMetadata:{contentType:type}});
 try{const saved=await database().prepare('INSERT INTO classer_blog_media(id,owner_id,object_key,type,size,name,created_at) SELECT ?,?,?,?,?,?,? WHERE (SELECT count(*) FROM classer_blog_media WHERE owner_id=?)<100 AND (SELECT coalesce(sum(size),0) FROM classer_blog_media WHERE owner_id=?) + ? <= 209715200').bind(id,u.id,key,type,a.length,name,new Date().toISOString(),u.id,u.id,a.length).run();if(!saved.meta.changes){await bucket().delete(key);return json({error:'کتابخانهٔ رسانه پر است؛ فایل‌های استفاده‌نشده را حذف کنید.'},409)}}catch(e){await bucket().delete(key);throw e}
 return json({id,type,name,size:a.length,url:'/api/blog-media/'+id},201);
 }catch(e){return requestFailure(e,'بارگذاری فایل انجام نشد.')}
}
export async function DELETE(r:Request){const u=await teacherIdentity(r);if(!u)return json({},401);if(!validOrigin(r))return json({},403);try{const b=await payload(r,1000);if(typeof b.id!=='string')return json({},400);const row=await database().prepare('SELECT object_key FROM classer_blog_media WHERE id=? AND owner_id=?').bind(b.id,u.id).first<{object_key:string}>();if(!row)return json({},404);const result=await database().prepare("DELETE FROM classer_blog_media WHERE id=? AND owner_id=? AND NOT EXISTS(SELECT 1 FROM teacher_articles a,json_each(json_extract(a.data,'$.mediaIds')) ref WHERE ref.value=?)").bind(b.id,u.id,b.id).run();if(!result.meta.changes)return json({error:'این رسانه در یک نوشته استفاده شده است. ابتدا آن را از نوشته حذف و تغییرات را ذخیره کنید.'},409);await bucket().delete(row.object_key);return json({deleted:true})}catch(e){return requestFailure(e,'حذف رسانه انجام نشد.')}}
