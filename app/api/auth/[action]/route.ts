import {getRecoveryMailConfig} from '@platform/recovery-config';
import {createEmailRecovery,RecoveryRateLimit} from '@/lib/server/email-recovery';
import {recoveryEmailSender} from '@/lib/server/recovery-mail';
import {isVeryWeakPassword} from '@/lib/password-policy';
import {POST as platformPost} from '@platform/auth-api';
import {database} from '@/db/storage';
import {json,payload,validOrigin,landing} from '@/lib/server/access';
import {accountSession,allowAttempt,digest,expiredCookie,hashPassword,issueSession,passwordValid,sessionToken,usernameValid,verifyPassword,type AccountRow} from '@/lib/server/accounts';
export const dynamic='force-dynamic';
const denied=()=>json({error:'نام کاربری، رمز عبور یا کد بازیابی معتبر نیست. / Invalid credentials or recovery code.'},401);
const badPassword=()=>json({error:'رمز عبور باید ۸ تا ۱۲۸ نویسه باشد. / Password must be 8 to 128 characters.'},400);
const weakPassword=()=>json({error:'رمز خیلی ضعیف است. رمز قوی‌تری انتخاب کنید. / Choose a stronger password.'},400);
function withCookie(body:unknown,cookie:string){return Response.json(body,{headers:{'Set-Cookie':cookie,'Cache-Control':'private, no-store'}})}
export async function POST(r:Request,{params}:{params:Promise<{action:string}>}){
 if(process.env.NEXT_PUBLIC_HOSTING_TARGET==='netlify')return platformPost(r,{params});
 if(!validOrigin(r))return json({},403);
 const {action}=await params;
 try{
  const db=database();
  if(action==='logout'){
   const token=sessionToken(r);
   if(token)await db.prepare('DELETE FROM classer_sessions WHERE token=?').bind(await digest(token)).run();
   return withCookie({next:'/signin'},expiredCookie());
  }
  const b=await payload(r,2500),password=typeof b.password==='string'?b.password:'';
  if(['recovery-request','recovery-verify','recovery-reset'].includes(action)){
   const config=getRecoveryMailConfig();
   if(!config)return json({error:'ارسال ایمیل بازیابی هنوز فعال نشده است. با مدیر سایت تماس بگیرید.'},503);
   const service=createEmailRecovery({db,secret:config.secret,send:recoveryEmailSender(config)});
   const ip=r.headers.get('cf-connecting-ip')??'unknown';
   try{
    if(action==='recovery-request'){
     const started=Date.now();
     const result=await service.request(typeof b.email==='string'?b.email:'',ip);
     if('error' in result)return json({error:result.error},result.status);
     // The provider call times out at four seconds; pad all valid requests alike.
     await new Promise(resolve=>setTimeout(resolve,Math.max(0,4500-(Date.now()-started))));
     return json(result);
    }
    if(action==='recovery-verify'){
     const result=await service.verify(typeof b.challenge==='string'?b.challenge:'',typeof b.code==='string'?b.code:'',ip);
     return 'error' in result?json({error:result.error},result.status):json(result);
    }
    if(!passwordValid(password))return badPassword();
    if(isVeryWeakPassword(password))return weakPassword();
    const saved=await service.reset(typeof b.grant==='string'?b.grant:'',()=>hashPassword(password),ip);
    if(!saved)return json({error:'اجازهٔ تغییر رمز منقضی یا قبلاً مصرف شده است. بازیابی را دوباره شروع کنید.'},400);
    return withCookie({next:'/signin',reset:true},expiredCookie());
   }catch(error){
    if(error instanceof RecoveryRateLimit)return json({error:'درخواست‌های زیادی انجام شده است. کمی بعد دوباره تلاش کنید.'},429);
    throw error;
   }
  }
  if(action==='change'){
   const a=await accountSession(r);
   if(!a)return denied();
   if(!passwordValid(password))return badPassword();
   if(isVeryWeakPassword(password))return weakPassword();
   if(!a.must_change){
    if(!await allowAttempt(r,a.username))return json({error:'کمی بعد دوباره تلاش کنید. / Try again later.'},429);
    const old=typeof b.current==='string'?b.current:'';
    if(!passwordValid(old)||!await verifyPassword(old,a.password_hash))return denied();
   }else if(await verifyPassword(password,a.password_hash))return json({error:'رمز تازه باید با رمز موقت متفاوت باشد. / Choose a different password.'},400);
   const hash=await hashPassword(password);
   const result=await db.prepare('UPDATE classer_accounts SET password_hash=?,epoch=epoch+1,must_change=0 WHERE id=? AND active=1 AND epoch=?').bind(hash,a.id,a.epoch).run();
   if(!result.meta.changes)return denied();
   return withCookie({next:landing({role:a.role,mustChange:false})},await issueSession({...a,epoch:a.epoch+1}));
  }
  if(action!=='login'&&action!=='reset')return json({},404);
  const username=typeof b.username==='string'?b.username.trim().toLowerCase():'';
  if(!usernameValid(username))return denied();
  if(!await allowAttempt(r,username))return json({error:'تلاش‌های زیادی انجام شد. کمی بعد دوباره امتحان کنید. / Too many attempts. Try later.'},429);
  if(action==='reset'){
   const code=typeof b.code==='string'?b.code.trim().toLowerCase():'';
   if(!/^[0-9a-f]{64}$/.test(code))return denied();
   if(!passwordValid(password))return badPassword();
   if(isVeryWeakPassword(password))return weakPassword();
   const key=await digest(code);
   const a=await db.prepare('SELECT a.id,a.epoch FROM classer_recovery t JOIN classer_accounts a ON a.id=t.account_id WHERE t.token=? AND a.username=? AND t.expires>? AND a.active=1 AND a.epoch=t.epoch').bind(key,username,Date.now()).first<{id:string,epoch:number}>();
   if(!a)return denied();
   const hash=await hashPassword(password);
   const updated=await db.prepare('UPDATE classer_accounts SET password_hash=?,epoch=epoch+1,must_change=0 WHERE id=? AND epoch=? AND active=1 AND EXISTS(SELECT 1 FROM classer_recovery WHERE token=? AND account_id=? AND epoch=? AND expires>?)').bind(hash,a.id,a.epoch,key,a.id,a.epoch,Date.now()).run();
   if(!updated.meta.changes)return denied();
   return withCookie({next:'/signin',reset:true},expiredCookie());
  }
  if(!passwordValid(password))return denied();
  const a=await db.prepare('SELECT * FROM classer_accounts WHERE username=?').bind(username).first<AccountRow>();
  const dummy='0'.repeat(64)+':'+ '0'.repeat(64);
  const ok=await verifyPassword(password,a?.password_hash??dummy);
  if(!a||!a.active||!ok)return denied();
  return withCookie({next:landing({role:a.role,mustChange:!!a.must_change})},await issueSession(a));
 }catch(e){console.error('Classer sign-in operation failed',e);return json({error:'عملیات ورود در دسترس نیست. / Sign-in is temporarily unavailable.'},503)}
}
