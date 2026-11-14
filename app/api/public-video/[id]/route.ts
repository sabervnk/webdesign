import {teachingOwner} from '@/lib/server/teacher-roles';
import {database} from '@/db/storage';
import {playVideo,videoHeaders,type VideoRow} from '@/lib/server/video';
export const dynamic='force-dynamic';
export async function GET(r:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;
  const v=await database().prepare(`SELECT v.object_key,v.size,v.visible FROM teacher_public_profiles p JOIN teacher_videos v ON v.owner_id=p.owner_id WHERE p.id=? AND p.published=1 AND ${teachingOwner('p.owner_id')} AND v.visible=1`).bind(id).first<VideoRow>();
  return v?await playVideo(r,v):new Response(null,{status:404,headers:videoHeaders});
 }catch{return new Response(null,{status:503,headers:videoHeaders})}
}
