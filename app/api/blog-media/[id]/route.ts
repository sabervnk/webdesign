import {teachingOwner} from '@/lib/server/teacher-roles';
import {bucket,database} from '@/db/storage';
import {identity} from '@/lib/server/access';
import {playVideo,videoHeaders} from '@/lib/server/video';
export const dynamic='force-dynamic';
export async function GET(r:Request,{params}:{params:Promise<{id:string}>}){
 try{const {id}=await params;if(!/^[0-9a-f-]{36}$/.test(id))return new Response(null,{status:404});const row=await database().prepare('SELECT owner_id,object_key,type,size FROM classer_blog_media WHERE id=?').bind(id).first<{owner_id:string;object_key:string;type:string;size:number}>();if(!row)return new Response(null,{status:404});
 const user=await identity(r);const publicUse=await database().prepare(`SELECT 1 FROM teacher_articles a JOIN teacher_public_profiles p ON p.id=a.teacher_id,json_each(json_extract(a.data,'$.mediaIds')) ref WHERE a.owner_id=? AND a.status='published' AND p.published=1 AND ${teachingOwner('p.owner_id')} AND ref.value=? LIMIT 1`).bind(row.owner_id,id).first();
 if(!publicUse&&!(user&&!user.mustChange&&(user.id===row.owner_id||user.isAdmin)))return new Response(null,{status:404,headers:videoHeaders});
 if(row.type==='video/mp4')return playVideo(r,{object_key:row.object_key,size:row.size,visible:1});
 const file=await bucket().get(row.object_key);return file?new Response(file.body,{headers:{...videoHeaders,'Content-Type':row.type,'Content-Length':String(row.size)}}):new Response(null,{status:404});
 }catch{return new Response(null,{status:503,headers:videoHeaders})}
}
