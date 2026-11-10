import {AVATAR_EDGE,AVATAR_MAX,avatarKey} from '@/lib/profile-media';
import {bucket} from '@/db/storage';

// Accept one opaque WebP image chunk only, with no ancillary metadata or trailing bytes.
export function validAvatar(a:Uint8Array){
 if(a.length<30||a.length>AVATAR_MAX)return false;
 const d=new DataView(a.buffer,a.byteOffset,a.byteLength);
 const tag=(offset:number)=>String.fromCharCode(...a.subarray(offset,offset+4));
 const size=d.getUint32(16,true);
 if(tag(0)!=='RIFF'||tag(8)!=='WEBP'||d.getUint32(4,true)!==a.length-8||20+size+(size%2)!==a.length)return false;
 if(tag(12)==='VP8 ')return size>=10&&!(a[20]&1)&&a[23]===157&&a[24]===1&&a[25]===42&&(d.getUint16(26,true)&16383)===AVATAR_EDGE&&(d.getUint16(28,true)&16383)===AVATAR_EDGE;
 if(tag(12)==='VP8L'&&a[20]===47){const bits=d.getUint32(21,true);return (bits&16383)+1===AVATAR_EDGE&&((bits>>>14)&16383)+1===AVATAR_EDGE&&bits>>>29===0}
 return false;
}
export async function avatarResponse(id:string){
 const file=await bucket().get(avatarKey(id));
 return file?new Response(file.body,{headers:{'Content-Type':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}}):new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});
}
