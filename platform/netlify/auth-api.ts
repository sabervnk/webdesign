import {requestFailure} from '@/lib/server/http';
import {randomBytes,scrypt,createHash} from 'node:crypto';
import {store} from './storage';
import {administratorEmail,configured,createSession,cookieName,sessionSeconds,equal,json,validOrigin,payload,safeReturn} from './access';
type Account={id:string,email:string,displayName:string,salt:string,hash:string};
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const passwordHash=(password:string,salt:string)=>new Promise<string>((resolve,reject)=>scrypt(password,salt,64,(err,key)=>err?reject(err):resolve(key.toString('hex'))));

async function allowAttempt(email:string){
 const s=store('auth-limits');const key=digest(email);
 for(let i=0;i<5;i++){
  const row=await s.getWithMetadata(key,{type:'json'});const old=row?.data as {count:number,until:number}|undefined;
  const now=Date.now();const next=old&&old.until>now?{count:old.count+1,until:old.until}:{count:1,until:now+15*60*1000};
  if(next.count>10)return false;
  const saved=await s.setJSON(key,next,row?{onlyIfMatch:row.etag}:{onlyIfNew:true});if(saved.modified)return true;
 }return false;
}

export async function POST(r:Request,{params}:{params:Promise<{action:string}>}){
 if(!validOrigin(r))return json({error:'درخواست نامعتبر است.'},403);
 const {action}=await params;
 if(action==='logout')return new Response(null,{status:204,headers:{'Cache-Control':'no-store','Set-Cookie':`${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`}});
 if(!['login','register'].includes(action))return json({error:'Not found'},404);
 if(!configured())return json({error:'ورود هنوز فعال نشده است. مدیر سایت باید تنظیمات ورود را تکمیل کند.'},503);
 try{
  const body=await payload(r,8000);const email=String(body.email||'').trim().toLowerCase();const password=String(body.password||'');
  if(email.length>254||!/^\S+@\S+\.\S+$/.test(email)||password.length<12||password.length>256)return json({error:'ایمیل معتبر و رمز بین ۱۲ تا ۲۵۶ کاراکتر وارد کنید.'},400);
  const invite=process.env.MAHELA_TEACHER_INVITE_CODE;
  if(action==='register'&&(!invite||invite.length<16||!equal(String(body.invite||''),invite)))return json({error:'کد دعوت معتبر از مدیر سایت دریافت کنید.'},403);
  if(!await allowAttempt(email))return json({error:'تلاش‌های زیادی انجام شده است. ۱۵ دقیقه دیگر دوباره تلاش کنید.'},429);
  let account:Pick<Account,'id'|'email'|'displayName'>;
  const accounts=store('accounts');const key=digest(email);
  if(action==='register'){
   const displayName=String(body.displayName||'').trim();
   if(displayName.length<2||displayName.length>100||email===administratorEmail)return json({error:'اطلاعات ثبت‌نام معتبر نیست.'},400);
   const salt=randomBytes(24).toString('hex');
   const created:Account={id:crypto.randomUUID(),email,displayName,salt,hash:await passwordHash(password,salt)};
   if(!(await accounts.setJSON(key,created,{onlyIfNew:true})).modified)return json({error:'این حساب قبلاً ثبت شده است. از بخش ورود استفاده کنید.'},409);
   account=created;
  }else if(email===administratorEmail){
   if(!equal(digest(password),digest(process.env.MAHELA_ADMIN_PASSWORD!)))return json({error:'ایمیل یا رمز عبور نادرست است.'},401);
   account={id:'netlify-admin',email,displayName:'مدیر سایت'};
  }else{
   const saved=await accounts.get(key,{type:'json'}) as Account|null;
   const hash=await passwordHash(password,saved?.salt||'unknown-account-dummy-salt');
   if(!saved||!equal(hash,saved.hash))return json({error:'ایمیل یا رمز عبور نادرست است.'},401);
   account=saved;
  }
  return new Response(JSON.stringify({redirect:safeReturn(String(body.returnTo||'/dashboard'))}),{headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','Set-Cookie':`${cookieName}=${createSession(account)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${sessionSeconds}`}});
 }catch(e){console.error('Account request failed',e);return requestFailure(e,'ورود انجام نشد. کمی بعد دوباره تلاش کنید.')}
}
