import {AVATAR_EDGE,AVATAR_MAX,avatarKey} from '@/lib/profile-media';
import {bucket} from '@/db/storage';

// Canvas may use extended WebP to carry a browser color profile. Keep just
// the validated still-image chunk, never the source container or its metadata.
export function normalizeAvatar(a:Uint8Array):ArrayBuffer|null{
 if(a.length<30||a.length>AVATAR_MAX)return null;
 const d=new DataView(a.buffer,a.byteOffset,a.byteLength);
 const tag=(o:number)=>String.fromCharCode(...a.subarray(o,o+4));
 const u24=(o:number)=>a[o]+256*a[o+1]+65536*a[o+2];
 if(tag(0)!=='RIFF'||tag(8)!=='WEBP'||d.getUint32(4,true)!==a.length-8)return null;
 let extended=false,pixelStart=0,pixelSize=0;
 const metadata=new Set<string>();
 for(let offset=12;offset<a.length;){
  if(offset+8>a.length)return null;
  const kind=tag(offset),size=d.getUint32(offset+4,true),start=offset+8,end=start+size+(size%2);
  if(end>a.length)return null;
  if(kind==='VP8X'){
   if(offset!==12||size!==10||(a[start]&~0x2c)!==0||a[start+1]||a[start+2]||a[start+3]||u24(start+4)+1!==AVATAR_EDGE||u24(start+7)+1!==AVATAR_EDGE)return null;
   extended=true;
  }else if(kind==='VP8 '||kind==='VP8L'){
   if(pixelStart)return null;
   if(kind==='VP8 '){
    if(size<10||(a[start]&1)||a[start+3]!==157||a[start+4]!==1||a[start+5]!==42||(d.getUint16(start+6,true)&16383)!==AVATAR_EDGE||(d.getUint16(start+8,true)&16383)!==AVATAR_EDGE)return null;
   }else{
    if(size<5||a[start]!==47)return null;
    const bits=d.getUint32(start+1,true);
    if((bits&16383)+1!==AVATAR_EDGE||((bits>>>14)&16383)+1!==AVATAR_EDGE||bits>>>29!==0)return null;
   }
   pixelStart=offset;pixelSize=size;
  }else if(extended&&['ICCP','EXIF','XMP '].includes(kind)&&!metadata.has(kind)){
   metadata.add(kind);
  }else return null;
  offset=end;
 }
 if(!pixelStart)return null;
 const output=new Uint8Array(20+pixelSize+(pixelSize%2));
 output.set(a.subarray(0,12));output.set(a.subarray(pixelStart,pixelStart+8+pixelSize),12);
 new DataView(output.buffer).setUint32(4,output.length-8,true);
 return output.buffer;
}
export async function avatarResponse(id:string){
 const file=await bucket().get(avatarKey(id));
 return file?new Response(file.body,{headers:{'Content-Type':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}}):new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});
}
