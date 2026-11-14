import {normalizeMobile,mobileValid} from '@/lib/account-contact';
import {isVeryWeakPassword} from '@/lib/password-policy';
import {z} from 'zod';
import {identity,json,payload,validOrigin,superAdministrator} from '@/lib/server/access';
import {hashPassword,issueRecovery,passwordValid,usernameValid,type AccountRow} from '@/lib/server/accounts';
import {database} from '@/db/storage';
import {requestFailure} from '@/lib/server/http';
export const dynamic='force-dynamic';
const weakPassword=()=>json({error:'رمز خیلی ضعیف است. رمز قوی‌تری انتخاب کنید. / Choose a stronger password.'},400);
const forbidden=()=>json({},403);
const role=z.enum(['admin','teacher','student']);
const values=z.object({username:z.string().trim().toLowerCase().refine(usernameValid),name:z.string().trim().min(2).max(100),email:z.string().trim().toLowerCase().max(200).email(),phone:z.string().transform(normalizeMobile).refine(mobileValid),role,teacherId:z.string().max(160).optional(),studentId:z.string().max(100).optional(),active:z.boolean().default(true)});
const teacherExists=async(id:string)=>!!await database().prepare('SELECT 1 AS present WHERE EXISTS(SELECT 1 FROM teacher_workspaces WHERE owner_id=?) OR EXISTS(SELECT 1 FROM teacher_public_profiles WHERE owner_id=?) OR EXISTS(SELECT 1 FROM classer_accounts WHERE id=? AND role=?)').bind(id,id,id,'teacher').first();
async function validStudent(teacherId?:string,studentId?:string){
 if(!teacherId||!studentId)return false;
 const row=await database().prepare('SELECT data FROM teacher_workspaces WHERE owner_id=?').bind(teacherId).first<{data:string}>();
 return !!row&&!JSON.parse(row.data).demo&&JSON.parse(row.data).students.some((s:{id:string})=>s.id===studentId);
}
export async function GET(r:Request){
 if(!superAdministrator(await identity(r)))return forbidden();
 const a=await database().prepare('SELECT id,username,name,email,phone,role,active,must_change,teacher_id,student_id,created_at FROM classer_accounts ORDER BY created_at DESC LIMIT 1000').all();
 return json({accounts:a.results});
}
export async function POST(r:Request){
 const u=await identity(r);if(!superAdministrator(u)||!validOrigin(r))return forbidden();
 let stage='validation';
 try{
  const b=await payload(r,12000),v=values.safeParse(b);
  if(!v.success||typeof b.password!=='string'||!passwordValid(b.password))return json({error:'نام کاربری، اطلاعات و رمز موقت (حداقل ۸ نویسه) را بررسی کنید. / Check account details and temporary password.'},400);
  if(isVeryWeakPassword(b.password))return weakPassword();
  const a=v.data,existing=typeof b.existingTeacher==='string'?b.existingTeacher:'';
  if(existing&&(a.role!=='teacher'||!await teacherExists(existing)))return json({error:'فضای معلم معتبر نیست. / Invalid existing teacher.'},400);
  if(a.role==='student'&&!await validStudent(a.teacherId,a.studentId))return json({error:'زبان‌آموز واقعی را از پروندهٔ یک معلم انتخاب کنید. / Choose a real student from a teacher workspace.'},400);
  const id=existing||'account-'+crypto.randomUUID();
  stage='hash';
  const passwordHash=await hashPassword(b.password);
  stage='insert';
  const result=await database().prepare('INSERT OR IGNORE INTO classer_accounts (id,username,name,email,phone,role,password_hash,active,must_change,teacher_id,student_id,created_at) SELECT ?,?,?,?,?,?,?,?,1,?,?,? WHERE NOT EXISTS(SELECT 1 FROM classer_accounts WHERE lower(trim(email))=?)').bind(id,a.username,a.name,a.email,a.phone,a.role,passwordHash,Number(a.active),a.role==='student'?a.teacherId!:null,a.role==='student'?a.studentId!:null,new Date().toISOString(),a.email).run();
  return result.meta.changes?json({id},201):json({error:'نام کاربری، ایمیل یا فضای معلم از قبل حساب دارد. / Username, email or teacher is already linked.'},409);
 }catch(e){if(stage!=='validation')console.error('Account creation failed at '+stage,e instanceof Error?e.name:'unknown');return requestFailure(e,'ایجاد حساب ممکن نشد. / Could not create the account.')}
}
export async function PATCH(r:Request){
 const u=await identity(r);if(!superAdministrator(u)||!validOrigin(r))return forbidden();
 try{
  const b=await payload(r,12000);if(typeof b.id!=='string'||b.id===u.id)return forbidden();
  const db=database(),a=await db.prepare('SELECT * FROM classer_accounts WHERE id=?').bind(b.id).first<AccountRow>();
  if(!a)return json({},404);
  if(b.action==='recovery'){
   if(!a.active)return json({error:'ابتدا حساب را فعال کنید. / Activate this account first.'},409);
   return json({code:await issueRecovery(a),minutes:30});
  }
  if(b.action==='password'){
   if(typeof b.password!=='string'||!passwordValid(b.password))return json({error:'رمز موقت حداقل ۸ نویسه باشد. / Temporary password must be at least 8 characters.'},400);
   if(isVeryWeakPassword(b.password))return weakPassword();
   const changed=await db.prepare('UPDATE classer_accounts SET password_hash=?,epoch=epoch+1,must_change=1 WHERE id=? AND epoch=?').bind(await hashPassword(b.password),a.id,a.epoch).run();
   return changed.meta.changes?json({saved:true}):json({},409);
  }
  if(b.action==='deactivate'){
   await db.prepare('UPDATE classer_accounts SET active=0,epoch=epoch+1 WHERE id=?').bind(a.id).run();
   return json({saved:true});
  }
  const v=values.safeParse(b);
  if(!v.success)return json({error:'اطلاعات حساب معتبر نیست. / Check the account fields.'},400);
  const p=v.data;
  if(p.role==='student'&&!await validStudent(p.teacherId,p.studentId))return json({error:'معلم و زبان‌آموز معتبر نیستند. / Choose a valid teacher and student.'},400);
  const updated=await db.prepare('UPDATE OR IGNORE classer_accounts SET username=?,name=?,email=?,phone=?,role=?,active=?,teacher_id=?,student_id=?,epoch=epoch+1 WHERE id=? AND epoch=? AND NOT EXISTS(SELECT 1 FROM classer_accounts other WHERE lower(trim(other.email))=? AND other.id<>?)').bind(p.username,p.name,p.email,p.phone,p.role,Number(p.active),p.role==='student'?p.teacherId!:null,p.role==='student'?p.studentId!:null,a.id,a.epoch,p.email,a.id).run();
  return updated.meta.changes?json({saved:true}):json({error:'نام کاربری تکراری است یا حساب تغییر کرده. / Username already taken or account changed.'},409);
 }catch(e){return requestFailure(e,'به‌روزرسانی حساب انجام نشد. / Could not update the account.')}
}
