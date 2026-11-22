import {bucket} from '@/db/storage';
import {identity,json,validOrigin} from '@/lib/server/access';
import {readBytes,requestFailure} from '@/lib/server/http';
export const dynamic='force-dynamic';
const ID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const MAX=2_000_000;
const key=(id:string)=>'site/logos/'+id+'.png';
function validPng(data:Uint8Array){
 if(data.byteLength<45||data.byteLength>MAX||![137,80,78,71,13,10,26,10].every((v,i)=>data[i]===v)||new TextDecoder().decode(data.slice(12,16))!=='IHDR')return false;
 const view=new DataView(data.buffer,data.byteOffset,data.byteLength),width=view.getUint32(16),height=view.getUint32(20);
 return width>=64&&width<=2048&&height>=64&&height<=2048&&width/height<=5&&height/width<=5;
}
export async function POST(r:Request){
 if(!(await identity(r))?.isAdmin||!validOrigin(r))return json({},403);
 if(r.headers.get('content-type')!=='image/png')return json({error:'لوگو را به شکل PNG بارگذاری کنید.'},415);
 try{const bytes=await readBytes(r,MAX);if(!validPng(bytes))return json({error:'لوگوی PNG باید بین ۶۴ و ۲۰۴۸ پیکسل و حداکثر ۲ مگابایت باشد.'},400);const id=crypto.randomUUID();await bucket().put(key(id),bytes,{httpMetadata:{contentType:'image/png'}});return json({url:'/api/site-logo?id='+id})}catch(e){return requestFailure(e,'بارگذاری لوگو انجام نشد.')}
}
export async function GET(r:Request){
 const id=new URL(r.url).searchParams.get('id')??'';
 if(!ID.test(id))return new Response(null,{status:404});
 try{const object=await bucket().get(key(id));if(!object)return new Response(null,{status:404});return new Response(object.body,{headers:{'Content-Type':'image/png','X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=31536000, immutable','Content-Security-Policy':"default-src 'none'; sandbox"}})}catch{return new Response(null,{status:503})}
}
