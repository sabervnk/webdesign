import {database} from '@/db/storage';
export {hashPassword,verifyPassword} from './password';
export {passwordValid} from '../password-policy';
export type AccountRole='admin'|'teacher'|'student';
export type AccountRow={id:string,username:string,name:string,email:string,role:AccountRole,active:number,password_hash:string,epoch:number,must_change:number,teacher_id:string|null,student_id:string|null,created_at:string};
export const SESSION_COOKIE='__Host-classer_session';
const SESSION_SECONDS=8*3600;
const encoder=new TextEncoder();
const hex=(a:Uint8Array)=>Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');
export const randomCode=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
export const digest=async(s:string)=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s))));
export const usernameValid=(s:string)=>/^[a-z0-9][a-z0-9_.-]{2,39}$/.test(s);
export function sessionToken(r:Request){
 const token=r.headers.get('cookie')?.match(/(?:^|;\s*)__Host-classer_session=([0-9a-f]{64})(?=;|$)/)?.[1];
 return token??null;
}
export const expiredCookie=()=>SESSION_COOKIE+'=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax';
export async function accountSession(r:Request){
 const token=sessionToken(r);if(!token)return null;
 return database().prepare('SELECT a.* FROM classer_sessions s JOIN classer_accounts a ON a.id=s.account_id WHERE s.token=? AND s.expires>? AND a.active=1 AND a.epoch=s.epoch').bind(await digest(token),Date.now()).first<AccountRow>();
}
export async function issueSession(a:AccountRow){
 const token=randomCode(),db=database();
 await db.prepare('DELETE FROM classer_sessions WHERE expires<=?').bind(Date.now()).run();
 await db.prepare('INSERT INTO classer_sessions VALUES(?,?,?,?)').bind(await digest(token),a.id,a.epoch,Date.now()+SESSION_SECONDS*1000).run();
 return SESSION_COOKIE+'='+token+'; Path=/; Max-Age='+SESSION_SECONDS+'; Secure; HttpOnly; SameSite=Lax';
}
export async function issueRecovery(a:{id:string,epoch:number}){
 const token=randomCode(),db=database();
 await db.prepare('DELETE FROM classer_recovery WHERE expires<=? OR account_id=?').bind(Date.now(),a.id).run();
 await db.prepare('INSERT INTO classer_recovery VALUES(?,?,?,?)').bind(await digest(token),a.id,a.epoch,Date.now()+30*60*1000).run();
 return token;
}
export async function allowAttempt(r:Request,username:string){
 const db=database(),window=Math.floor(Date.now()/900000);
 await db.prepare('DELETE FROM classer_auth_limits WHERE window<?').bind(window-1).run();
 const ip=r.headers.get('cf-connecting-ip')??'local';
 for(const [scope,max] of [['ip:'+ip,30],['user:'+username,8]] as const){
  const result=await db.prepare('INSERT INTO classer_auth_limits VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET window=excluded.window,count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END WHERE window<>excluded.window OR count<?').bind(await digest(scope),window,max).run();
  if(!result.meta.changes)return false;
 }
 return true;
}
