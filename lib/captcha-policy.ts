export const CAPTCHA_COOKIE='__Host-classer_captcha';
export const captchaDigest=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(b=>b.toString(16).padStart(2,'0')).join('');
export const captchaToken=(r:Request)=>r.headers.get('cookie')?.match(/(?:^|;\s*)__Host-classer_captcha=([0-9a-f]{64})(?=;|$)/)?.[1]??'';
export const captchaBinding=(token:string,agent:string)=>captchaDigest(token+'\0'+agent);
export const normalizeCaptcha=(text:string)=>text.trim().replace(/[۰-۹٠-٩]/g,d=>String(d.charCodeAt(0)&15));
export function randomCaptcha(){let result='';while(result.length<6)for(const b of crypto.getRandomValues(new Uint8Array(16))){if(b<250)result+=b%10;if(result.length===6)break}return result}
export async function captchaLimit(db:any,key:string,max:number,seconds:number,now=Date.now()){
 await db.prepare('DELETE FROM classer_security_limits WHERE expires<=?').bind(now).run();const id=await captchaDigest(key);
 const result=await db.prepare('INSERT INTO classer_security_limits (id,count,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 WHERE count<?').bind(id,now+seconds*1000,max).run();return !!result.meta.changes;
}
export async function consumeCaptcha(db:any,r:Request,id:unknown,answer:unknown,now=Date.now()){
 const token=captchaToken(r);if(!token||typeof id!=='string'||!/^[0-9a-f-]{36}$/.test(id)||typeof answer!=='string')return false;
 const binding=await captchaBinding(token,r.headers.get('user-agent')??'');
 const row=await db.prepare('DELETE FROM classer_captchas WHERE id=? AND binding_hash=? AND expires>? RETURNING answer_hash').bind(id,binding,now).first() as {answer_hash:string}|null;if(!row)return false;
 const code=normalizeCaptcha(answer);if(!/^\d{6}$/.test(code))return false;return row.answer_hash===await captchaDigest(id+'\0'+code);
}
