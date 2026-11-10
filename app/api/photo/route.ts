import {readBytes,requestFailure} from '@/lib/server/http';
import {identity,validOrigin,json} from '@/lib/server/access';
import {bucket} from '@/db/storage';
import {AVATAR_MAX,avatarKey} from '@/lib/profile-media';
import {normalizeAvatar,avatarResponse} from '@/lib/server/avatar';
export const dynamic='force-dynamic';
export async function GET(r:Request){
 const id=identity(r)?.id;
 if(!id)return new Response(null,{status:401});
 try{return await avatarResponse(id)}catch{return new Response(null,{status:503})}
}
export async function POST(r:Request){
 const id=identity(r)?.id;
 if(!id)return json({error:'ورود لازم است / Sign in first.'},401);
 if(!validOrigin(r))return new Response(null,{status:403});
 try{
  const bytes=await readBytes(r,AVATAR_MAX);
  const avatar=r.headers.get('content-type')==='image/webp'?normalizeAvatar(bytes):null;
  if(!avatar)return json({error:'تصویر مربعی WebP معتبر نیست. / Invalid square WebP avatar.'},400);
  await bucket().put(avatarKey(id),avatar,{httpMetadata:{contentType:'image/webp'}});
  return json({url:'/api/photo?v='+Date.now()});
 }catch(e){return requestFailure(e,'ذخیره عکس ناموفق بود. / Could not save the photo.')}
}
