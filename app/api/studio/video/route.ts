import {bucket,database,deleteVideo} from '@/db/storage';
import {identity,validOrigin,json,payload} from '@/lib/server/access';
import {readBytes,requestFailure} from '@/lib/server/http';
import {VIDEO_MAX,VIDEO_MAX_SECONDS} from '@/lib/profile-media';
import {mp4Duration} from '@/lib/server/mp4';
import {playVideo,videoHeaders,type VideoRow} from '@/lib/server/video';
export const dynamic='force-dynamic';
const current=(id:string)=>database().prepare('SELECT object_key,size,visible FROM teacher_videos WHERE owner_id=?').bind(id).first<VideoRow>();
const report=(v:VideoRow|null)=>json({video:v?{url:'/api/studio/video?play='+v.object_key.split('/').at(-1),visible:!!v.visible}:null});
const unavailable=(e:unknown)=>requestFailure(e,'ذخیره یا دریافت ویدئو انجام نشد. / Video operation failed.');
export async function GET(r:Request){
 const id=identity(r)?.id;
 if(!id)return json({},401);
 try{const v=await current(id);return new URL(r.url).searchParams.has('play')?(v?await playVideo(r,v):new Response(null,{status:404,headers:videoHeaders})):report(v)}catch(e){return unavailable(e)}
}
export async function POST(r:Request){
 const id=identity(r)?.id;
 if(!id)return json({},401);
 if(!validOrigin(r))return json({},403);
 if(r.headers.get('content-type')!=='video/mp4')return json({error:'فایل MP4 انتخاب کنید. / Choose an MP4 file.'},400);
 try{
  const a=await readBytes(r,VIDEO_MAX);
  const duration=mp4Duration(a);
  if(duration===null)return json({error:'فایل ویدئویی MP4 معتبر نیست. / Choose a valid MP4 video.'},400);
  if(duration>VIDEO_MAX_SECONDS)return json({error:'مدت ویدئو نباید بیشتر از ۵ دقیقه باشد. / Maximum video length is 5 minutes.'},400);
  const previous=await current(id);
  const key='teacher-videos/'+crypto.randomUUID();
  await bucket().put(key,a.buffer as ArrayBuffer,{httpMetadata:{contentType:'video/mp4'}});
  // Compare-and-swap keeps parallel replacements from leaking unreferenced files.
  const result=await (previous
   ?database().prepare('UPDATE teacher_videos SET object_key=?,size=?,visible=0 WHERE owner_id=? AND object_key=?').bind(key,a.length,id,previous.object_key)
   :database().prepare('INSERT INTO teacher_videos(owner_id,object_key,size) VALUES(?,?,?) ON CONFLICT(owner_id) DO NOTHING').bind(id,key,a.length)).run();
  if(!result.meta.changes){await deleteVideo(key);return json({error:'ویدئو هم‌زمان تغییر کرد. / Video changed concurrently.'},409)}
  if(previous)await deleteVideo(previous.object_key).catch(e=>console.error('Old video cleanup failed',e));
  return report({object_key:key,size:a.length,visible:0});
 }catch(e){return unavailable(e)}
}
export async function PATCH(r:Request){
 const id=identity(r)?.id;
 if(!id)return json({},401);
 if(!validOrigin(r))return json({},403);
 try{
  const {visible,url}=await payload(r,1024);
  if(typeof visible!=='boolean'||typeof url!=='string'||!/^\/api\/studio\/video\?play=[0-9a-f-]{36}$/.test(url))return json({},400);
  const result=await database().prepare('UPDATE teacher_videos SET visible=? WHERE owner_id=? AND object_key=?').bind(Number(visible),id,'teacher-videos/'+url.split('=').at(-1)).run();
  return result.meta.changes?report(await current(id)):json({error:'ویدئو تغییر کرده است؛ صفحه را دوباره باز کنید. / Reload to see the current video.'},409);
 }catch(e){return unavailable(e)}
}
export async function DELETE(r:Request){
 const id=identity(r)?.id;
 if(!id)return json({},401);
 if(!validOrigin(r))return json({},403);
 try{
  const {url}=await payload(r,1024);
  if(typeof url!=='string'||!/^\/api\/studio\/video\?play=[0-9a-f-]{36}$/.test(url))return json({},400);
  const key='teacher-videos/'+url.split('=').at(-1);
  const result=await database().prepare('DELETE FROM teacher_videos WHERE owner_id=? AND object_key=?').bind(id,key).run();
  if(!result.meta.changes)return json({error:'ویدئو تغییر کرده است؛ صفحه را دوباره باز کنید. / Reload to see the current video.'},409);
  await deleteVideo(key).catch(e=>console.error('Deleted video cleanup failed',e));
  return report(null);
 }catch(e){return unavailable(e)}
}
