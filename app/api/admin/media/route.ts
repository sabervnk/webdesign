import {database} from '@/db/storage';
import {identity,json} from '@/lib/server/access';
import {avatarResponse} from '@/lib/server/avatar';
import {playVideo,videoHeaders,type VideoRow} from '@/lib/server/video';
export const dynamic='force-dynamic';
export async function GET(r:Request){if(!(await identity(r))?.isAdmin)return json({},403);try{const url=new URL(r.url),owner=url.searchParams.get('owner'),kind=url.searchParams.get('kind')??'details';if(!owner||owner.length>160||!['details','photo','video'].includes(kind))return json({},400);
 const db=database(),w=await db.prepare("SELECT json_extract(data,'$.profile.photo') AS photo FROM teacher_workspaces WHERE owner_id=?").bind(owner).first<{photo:string}>(),v=await db.prepare('SELECT object_key,size,visible FROM teacher_videos WHERE owner_id=?').bind(owner).first<VideoRow>();
 if(!w&&!v)return json({},404);if(kind==='photo')return w?.photo?avatarResponse(owner):new Response(null,{status:404});if(kind==='video')return v?playVideo(r,v):new Response(null,{status:404,headers:videoHeaders});return json({photo:!!w?.photo,video:v?{size:v.size,visible:!!v.visible}:null});
 }catch{return json({error:'Media unavailable.'},503)}}
