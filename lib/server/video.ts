import {readVideo} from '@/db/storage';
export type VideoRow={object_key:string,size:number,visible:number};
export const videoHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export function videoRange(header:string|null,size:number){
 if(!header)return undefined;
 const match=/^bytes=(\d*)-(\d*)$/.exec(header);
 if(!match||(!match[1]&&!match[2]))return null;
 const offset=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
 const end=match[1]&&match[2]?Math.min(size-1,Number(match[2])):size-1;
 return Number.isSafeInteger(offset)&&offset<=end?{offset,length:end-offset+1}:null;
}
export async function playVideo(r:Request,row:VideoRow){
 const range=videoRange(r.headers.get('range'),row.size);
 const headers={...videoHeaders,'Accept-Ranges':'bytes'};
 if(range===null)return new Response(null,{status:416,headers:{...headers,'Content-Range':'bytes */'+row.size}});
 const file=await readVideo(row.object_key,range);
 if(!file)return new Response(null,{status:404,headers});
 return new Response(file.body,{status:range?206:200,headers:{...headers,'Content-Type':'video/mp4','Content-Length':String(range?.length??row.size),...(range?{'Content-Range':`bytes ${range.offset}-${range.offset+range.length-1}/${row.size}`}:{})}});
}
