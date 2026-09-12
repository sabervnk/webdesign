import {readBytes,requestFailure} from '@/lib/server/http';
import {identity,validOrigin} from '@/lib/server/access';
import {bucket} from '@/db/storage';
export const dynamic='force-dynamic';
export async function GET(r:Request){const id=identity(r)?.id;if(!id)return new Response('Unauthorized',{status:401});try{const file=await bucket().get('profiles/'+id);if(!file)return new Response('Not found',{status:404});return new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType||'image/jpeg','Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff'}})}catch(e){console.error('Profile photo read failed',e);return new Response('Unavailable',{status:503})}}
export async function POST(r:Request){
 const id=identity(r)?.id;if(!id)return Response.json({error:'ورود لازم است'},{status:401});if(!validOrigin(r))return new Response('Forbidden',{status:403});
 const type=r.headers.get('content-type')?.split(';')[0]||'';const max=5*1024*1024;
 if(!['image/jpeg','image/png','image/webp'].includes(type)||Number(r.headers.get('content-length')||0)>max)return Response.json({error:'عکس JPG، PNG یا WEBP تا ۵ مگابایت انتخاب کنید.'},{status:400});
 try{const a=await readBytes(r,max);const bytes=new Uint8Array(a).buffer;const valid=(type==='image/jpeg'&&a[0]===255&&a[1]===216&&a[2]===255)||(type==='image/png'&&a[0]===137&&a[1]===80&&a[2]===78&&a[3]===71&&a[4]===13&&a[5]===10&&a[6]===26&&a[7]===10)||(type==='image/webp'&&String.fromCharCode(...a.slice(0,4))==='RIFF'&&String.fromCharCode(...a.slice(8,12))==='WEBP');if(!valid)return Response.json({error:'فایل تصویر معتبر نیست.'},{status:400});await bucket().put('profiles/'+id,bytes,{httpMetadata:{contentType:type}});return Response.json({url:'/api/photo?v='+Date.now()})}catch(e){console.error('Profile photo upload failed',e);return requestFailure(e,'بارگذاری عکس انجام نشد؛ دوباره تلاش کنید.')}
}
