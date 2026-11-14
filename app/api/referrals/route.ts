import {z} from 'zod';
import {database} from '@/db/storage';
import {teacherIdentity,json,payload,validOrigin} from '@/lib/server/access';
import {financialWorkspace} from '@/lib/server/finance';
import {workspaceSchema,studentSchema,validateWorkspace,type Student} from '@/lib/model';
import {normalizeFinance} from '@/lib/finance';
import {RequestError,requestFailure} from '@/lib/server/http';
export const dynamic='force-dynamic';
export async function GET(r:Request){const u=await teacherIdentity(r);if(!u)return json({},401);try{
 const db=database(),rows=await db.prepare("SELECT i.id,i.data,i.version,i.created_at,i.status FROM site_inquiries i JOIN teacher_public_profiles p ON p.id=json_extract(i.data,'$.teacherId') WHERE p.owner_id=? AND json_extract(i.data,'$.teacherOwnerId')=? AND json_extract(i.data,'$.forwardedAt') IS NOT NULL ORDER BY i.updated_at DESC LIMIT 500").bind(u.id,u.id).all<{id:string;data:string;version:number;created_at:string;status:string}>();
 const w=await financialWorkspace(u.id);
 return json({requests:rows.results.map(row=>{const x=JSON.parse(row.data);return {id:row.id,version:row.version,name:x.name,email:x.email,phone:x.phone,message:x.message,language:x.language,format:x.format,offerTitle:x.offerTitle,rate:x.rate,currency:x.currency,duration:x.duration,forwardedAt:x.forwardedAt,commissionPercent:x.commissionPercent??0,convertedStudentId:w?.data.students.find(s=>s.sourceInquiryId===row.id)?.id??x.convertedStudentId}})});
 }catch(e){if(e instanceof z.ZodError)e=new RequestError('Invalid form fields.',400);return requestFailure(e,'Could not load referred requests.')}}
export async function POST(r:Request){const u=await teacherIdentity(r);if(!u||!validOrigin(r))return json({},403);try{
 const x=z.object({id:z.string().uuid(),version:z.number().int().positive(),level:z.enum(['A1','A2','B1','B2','C1','C2']).default('A1'),existingStudentId:z.string().max(80).optional()}).parse(await payload(r,5000)),db=database();
 const row=await db.prepare("SELECT i.data,i.version FROM site_inquiries i JOIN teacher_public_profiles p ON p.id=json_extract(i.data,'$.teacherId') WHERE i.id=? AND p.owner_id=? AND json_extract(i.data,'$.teacherOwnerId')=? AND json_extract(i.data,'$.forwardedAt') IS NOT NULL").bind(x.id,u.id,u.id).first<{data:string;version:number}>();
 if(!row)return json({},404);const inquiry=JSON.parse(row.data),w=await financialWorkspace(u.id);if(!w)return json({},404);
 const prior=w.data.students.find(s=>s.sourceInquiryId===x.id);if(prior)return json({studentId:prior.id,alreadyImported:true});
 if(row.version!==x.version)return json({error:'Request changed; reload.'},409);
 if(inquiry.convertedStudentId)return json({error:'This request was already added. Restore or edit the existing student.'},409);
 if(w.data.demo)return json({error:'ابتدا از حالت نمونه خارج شوید. / Leave demo mode first.'},400);
 const duplicate=w.data.students.find(s=>s.email.toLowerCase()===inquiry.email.toLowerCase());
 if(duplicate&&!x.existingStudentId)return json({error:'این ایمیل در فهرست وجود دارد؛ پرونده موجود را انتخاب کنید. / Select the existing student record.',existingStudent:{id:duplicate.id,name:duplicate.name}},409);
 if(x.existingStudentId&&(!duplicate||duplicate.id!==x.existingStudentId||duplicate.sourceInquiryId))return json({error:'Invalid existing student selection.'},400);
 const now=new Date().toISOString(),student:Student=duplicate?{...duplicate,sourceInquiryId:x.id}:studentSchema.parse({id:crypto.randomUUID(),name:inquiry.name,email:inquiry.email,phone:inquiry.phone,level:x.level,gender:'unspecified',rate:inquiry.rate??0,currency:inquiry.currency??'TOMAN',duration:inquiry.duration??60,since:now.slice(0,10),skills:{listening:0,speaking:0,reading:0,writing:0},tone:w.data.students.length%5,sourceInquiryId:x.id});
 const next=normalizeFinance({...w.data,students:duplicate?w.data.students.map(s=>s.id===student.id?student:s):[...w.data.students,student]},w.policy);workspaceSchema.parse(next);validateWorkspace(next,w.data);
 // The roster write is authoritative and carries a unique source ID. Retrying
 // after a lost response cannot create a second student, even if the inbox update failed.
 const changed=await db.prepare("UPDATE teacher_workspaces SET data=?,version=version+1,updated_at=? WHERE owner_id=? AND version=? AND EXISTS(SELECT 1 FROM site_inquiries WHERE id=? AND version=? AND json_extract(data,'$.teacherOwnerId')=?)").bind(JSON.stringify(next),now,u.id,w.version,x.id,row.version,u.id).run();
 if(!changed.meta.changes)return json({error:'Workspace or request changed; reload.'},409);
 await db.prepare("UPDATE site_inquiries SET data=json_set(data,'$.convertedStudentId',?,'$.convertedAt',?),version=version+1,updated_at=? WHERE id=? AND json_extract(data,'$.teacherOwnerId')=?").bind(student.id,now,now,x.id,u.id).run();
 return json({studentId:student.id},201);
 }catch(e){return requestFailure(e,'افزودن زبان‌آموز انجام نشد. / Could not add the student.')}}
