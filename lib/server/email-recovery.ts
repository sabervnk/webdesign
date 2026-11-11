import {createHash,createHmac,randomBytes,randomInt,timingSafeEqual} from 'node:crypto';
import {RECOVERY_CODE_SECONDS,RECOVERY_RESEND_SECONDS,RECOVERY_GRANT_SECONDS,RECOVERY_MAX_ATTEMPTS,normalizeRecoveryEmail,normalizeRecoveryCode,recoveryEmailValid} from '../recovery-policy.ts';

type Statement={
 bind:(...values:(string|number|null)[])=>Statement;
 first:<T>()=>Promise<T|null>;
 all:<T>()=>Promise<{results:T[]}>;
 run:()=>Promise<{meta:{changes?:number}}>;
};
export type RecoveryDatabase={prepare:(sql:string)=>Statement};
type RecoveryAccount={id:string;email:string;epoch:number};
type RecoveryRow=RecoveryAccount&{account_id:string;challenge:string;code_hash:string};
const randomToken=()=>randomBytes(32).toString('hex');
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
const tokenValid=(value:string)=>/^[0-9a-f]{64}$/.test(value);
const invalid=()=>({error:'کد اشتباه، منقضی یا قبلاً مصرف شده است. کد جدید درخواست کنید.',status:400 as const});
export class RecoveryRateLimit extends Error{}

export function createEmailRecovery({db,secret,send,now=Date.now,onDeliveryError=()=>console.error('Classer recovery email delivery failed')}:{
 db:RecoveryDatabase;secret:string;send:(to:string,code:string,challenge:string)=>Promise<void>;now?:()=>number;onDeliveryError?:()=>void;
}){
 if(secret.length<32)throw new Error('Recovery secret is not configured');
 const codeHash=(a:RecoveryAccount,challenge:string,code:string)=>createHmac('sha256',secret).update(JSON.stringify([a.id,normalizeRecoveryEmail(a.email),a.epoch,challenge,code])).digest('hex');
 async function allow(scope:string,max:number,seconds:number){
  const time=now();
  const result=await db.prepare('INSERT INTO classer_recovery_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<=? THEN 1 ELSE count+1 END,expires=CASE WHEN expires<=? THEN excluded.expires ELSE expires END WHERE expires<=? OR count<?')
   .bind(digest(scope),time+seconds*1000,time,time,time,max).run();
  if(!result.meta.changes)throw new RecoveryRateLimit('Too many recovery attempts');
 }
 async function request(emailInput:string,ip:string){
  const email=normalizeRecoveryEmail(emailInput);
  if(!recoveryEmailValid(email))return {error:'ایمیل معتبر وارد کنید.',status:400 as const};
  await db.prepare('DELETE FROM classer_recovery_limits WHERE expires<=?').bind(now()).run();
  await allow('request-ip:'+ip,10,900);
  await allow('request-email:'+email,5,3600);
  const challenge=randomToken();
  // Every syntactically valid email gets the same response, including duplicates.
  const reply={challenge,expiresIn:RECOVERY_CODE_SECONDS,resendAfter:RECOVERY_RESEND_SECONDS,message:'اگر حساب فعالی با این ایمیل ثبت شده باشد، کد بازیابی ارسال می‌شود. پوشهٔ هرزنامه را هم بررسی کنید.'};
  const matches=await db.prepare('SELECT id,email,epoch FROM classer_accounts WHERE lower(trim(email))=? AND active=1 LIMIT 2').bind(email).all<RecoveryAccount>();
  if(matches.results.length!==1)return reply;
  const account=matches.results[0],time=now(),code=String(randomInt(0,1_000_000)).padStart(6,'0');
  await db.prepare('DELETE FROM classer_email_recovery WHERE expires<=? AND (grant_expires IS NULL OR grant_expires<=?)').bind(time,time).run();
  const saved=await db.prepare(`INSERT INTO classer_email_recovery (account_id,challenge,code_hash,email,epoch,created_at,expires,attempts,delivered,grant_hash,grant_expires)
   SELECT id,?,?,lower(trim(email)),epoch,?,?,0,0,NULL,NULL FROM classer_accounts WHERE id=? AND active=1 AND epoch=? AND lower(trim(email))=?
   ON CONFLICT(account_id) DO UPDATE SET challenge=excluded.challenge,code_hash=excluded.code_hash,email=excluded.email,epoch=excluded.epoch,created_at=excluded.created_at,expires=excluded.expires,attempts=0,delivered=0,grant_hash=NULL,grant_expires=NULL
   WHERE classer_email_recovery.created_at<=?`)
   .bind(challenge,codeHash(account,challenge,code),time,time+RECOVERY_CODE_SECONDS*1000,account.id,account.epoch,email,time-RECOVERY_RESEND_SECONDS*1000).run();
  if(!saved.meta.changes)return reply;
  try{
   await send(email,code,challenge);
   await db.prepare('UPDATE classer_email_recovery SET delivered=1 WHERE challenge=?').bind(challenge).run();
  }catch{
   await db.prepare('DELETE FROM classer_email_recovery WHERE challenge=?').bind(challenge).run();
   onDeliveryError();
  }
  return reply;
 }
 async function verify(challenge:string,codeInput:string,ip:string){
  await allow('verify-ip:'+ip,50,900);
  const code=normalizeRecoveryCode(codeInput);
  if(!tokenValid(challenge))return invalid();
  // Increment before comparing, atomically. Even malformed submissions count.
  const row=await db.prepare(`UPDATE classer_email_recovery SET attempts=attempts+1
   WHERE challenge=? AND code_hash<>'' AND delivered=1 AND expires>? AND attempts<?
   AND EXISTS(SELECT 1 FROM classer_accounts a WHERE a.id=account_id AND a.active=1 AND a.epoch=classer_email_recovery.epoch AND lower(trim(a.email))=classer_email_recovery.email)
   RETURNING account_id AS id,account_id,email,epoch,challenge,code_hash`).bind(challenge,now(),RECOVERY_MAX_ATTEMPTS).first<RecoveryRow>();
  if(!row||!/^\d{6}$/.test(code))return invalid();
  const expected=Buffer.from(row.code_hash,'hex'),actual=Buffer.from(codeHash(row,challenge,code),'hex');
  if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return invalid();
  const grant=randomToken(),time=now();
  const saved=await db.prepare(`UPDATE classer_email_recovery SET code_hash='',grant_hash=?,grant_expires=?
   WHERE challenge=? AND code_hash=? AND attempts<=? AND expires>? AND delivered=1
   AND EXISTS(SELECT 1 FROM classer_accounts a WHERE a.id=account_id AND a.active=1 AND a.epoch=classer_email_recovery.epoch AND lower(trim(a.email))=classer_email_recovery.email)`)
   .bind(digest(grant),time+RECOVERY_GRANT_SECONDS*1000,challenge,row.code_hash,RECOVERY_MAX_ATTEMPTS,time).run();
  return saved.meta.changes?{grant,expiresIn:RECOVERY_GRANT_SECONDS}:invalid();
 }
 async function reset(grant:string,passwordHash:()=>Promise<string>,ip:string){
  await allow('reset-ip:'+ip,20,900);
  if(!tokenValid(grant))return false;
  const active=await db.prepare(`SELECT 1 AS present FROM classer_email_recovery r JOIN classer_accounts a ON a.id=r.account_id WHERE r.grant_hash=? AND r.grant_expires>? AND r.code_hash='' AND r.delivered=1 AND a.active=1 AND a.epoch=r.epoch AND lower(trim(a.email))=r.email`).bind(digest(grant),now()).first();
  if(!active)return false;
  const hash=await passwordHash();
  // Changing epoch consumes the grant and revokes all existing sessions in one write.
  const result=await db.prepare(`UPDATE classer_accounts SET password_hash=?,epoch=epoch+1,must_change=0
   WHERE active=1 AND EXISTS(SELECT 1 FROM classer_email_recovery r WHERE r.account_id=classer_accounts.id AND r.grant_hash=? AND r.grant_expires>? AND r.code_hash='' AND r.delivered=1 AND r.epoch=classer_accounts.epoch AND r.email=lower(trim(classer_accounts.email)))`)
   .bind(hash,digest(grant),now()).run();
  return !!result.meta.changes;
 }
 return {request,verify,reset};
}

