import { env } from 'cloudflare:workers';
export function database(){if(!env.DB)throw new Error('Database unavailable');return env.DB;}
export function bucket(){if(!env.BUCKET)throw new Error('Storage unavailable');return env.BUCKET;}
export function readVideo(key:string,range?:{offset:number,length:number}){return bucket().get(key,range?{range}:undefined)}
export function deleteVideo(key:string){return bucket().delete(key)}
