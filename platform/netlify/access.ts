import {createHmac,timingSafeEqual} from 'node:crypto';
export const siteOrigin=(process.env.MAHELA_SITE_URL||process.env.URL||'https://missmahta.netlify.app').replace(/\/$/,'');
export const administratorEmail=(process.env.MAHELA_ADMIN_EMAIL||'lahzetv@gmail.com').toLowerCase();
export const cookieName='mahela_session';
export const sessionSeconds=8*60*60;
export function configured(){return (process.env.MAHELA_SESSION_SECRET?.length||0)>=32&&(process.env.MAHELA_ADMIN_PASSWORD?.length||0)>=16}
export function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
function signature(value:string){return createHmac('sha256',process.env.MAHELA_SESSION_SECRET!).update(value).digest('base64url')}
export function createSession(user:{id:string,email:string,displayName:string}){
 if(!configured())throw new Error('Authentication is not configured');
 const payload=Buffer.from(JSON.stringify({id:user.id,email:user.email,displayName:user.displayName,aud:siteOrigin,exp:Math.floor(Date.now()/1000)+sessionSeconds})).toString('base64url');
 return payload+'.'+signature(payload);
}
export function identity(r:Request){
 if(!configured())return null;
 const token=r.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 if(!token||token.length>3000)return null;
 const [value,sig,extra]=token.split('.');
 if(!value||!sig||extra||!equal(sig,signature(value)))return null;
 try{const user=JSON.parse(Buffer.from(value,'base64url').toString());
  if(typeof user.id!=='string'||typeof user.email!=='string'||typeof user.displayName!=='string'||!Number.isSafeInteger(user.exp)||user.exp<=Date.now()/1000||user.aud!==siteOrigin)return null;
  return {id:user.id,email:user.email,displayName:user.displayName,isAdmin:user.id==='netlify-admin'&&user.email===administratorEmail};
 }catch{return null}
}
export function isAdministrator(email:string){return email.toLowerCase()===administratorEmail}
export function validOrigin(r:Request){const origin=r.headers.get('origin');return !origin||origin===new URL(r.url).origin||origin===siteOrigin}
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function payload(r:Request,max=200000){const body=await r.text();if(body.length>max)throw new Error('اطلاعات بیش از حد مجاز است. / Payload too large.');return JSON.parse(body)}
export function safeReturn(value:string){try{const u=new URL(value,siteOrigin);return value.startsWith('/')&&!value.startsWith('//')&&u.origin===siteOrigin&&!['/signin','/signout'].includes(u.pathname)?u.pathname+u.search+u.hash:'/dashboard'}catch{return '/dashboard'}}
