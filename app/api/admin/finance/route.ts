import {z} from 'zod';
import {database} from '@/db/storage';
import {identity,json,payload,validOrigin} from '@/lib/server/access';
import {financialWorkspace,commissionPolicy} from '@/lib/server/finance';
import {feeSplit} from '@/lib/finance';
import {RequestError,requestFailure} from '@/lib/server/http';
export const dynamic='force-dynamic';
export async function GET(r:Request){if(!(await identity(r))?.isAdmin)return json({},403);try{
 const db=database(),owners=await db.prepare("SELECT w.owner_id AS id,COALESCE(json_extract(p.data,'$.name'),json_extract(w.data,'$.profile.name')) AS name FROM teacher_workspaces w LEFT JOIN teacher_public_profiles p ON p.owner_id=w.owner_id ORDER BY name LIMIT 500").all<{id:string;name:string}>();
 const teachers=[];
 for(const owner of owners.results){const w=await financialWorkspace(owner.id);if(!w||w.data.demo)continue;teachers.push({...owner,policy:w.policy,students:w.data.students.map(s=>({id:s.id,name:s.name,commissionPercent:s.commissionPercent??0})),sessions:w.data.sessions.map(s=>({id:s.id,studentId:s.studentId,date:s.date,time:s.time,duration:s.duration,status:s.status,charge:s.charge,cancelReason:s.cancelReason,paid:s.paid,paidAt:s.paidAt,rate:s.rate,currency:s.currency,pricing:s.pricing,commissionPercent:s.commissionPercent??0,split:feeSplit(s)}))})}
 return json({teachers});
 }catch(e){if(e instanceof z.ZodError)e=new RequestError('Invalid form fields.',400);return requestFailure(e,'دریافت گزارش مالی انجام نشد. / Could not load finance report.')}}
const input=z.object({ownerId:z.string().min(1).max(160),version:z.number().int().min(0),percent:z.number().min(0).max(100).multipleOf(.01),students:z.record(z.string().max(80),z.number().min(0).max(100).multipleOf(.01)).refine(v=>Object.keys(v).length<=2000)});
export async function PUT(r:Request){if(!(await identity(r))?.isAdmin||!validOrigin(r))return json({},403);try{
 const parsed=input.safeParse(await payload(r,120000));if(!parsed.success)return json({error:'Invalid commission fields.'},400);const x=parsed.data,db=database();const w=await financialWorkspace(x.ownerId);if(!w)return json({},404);
 if(w.policy.version!==x.version)return json({error:'درصدها تغییر کرده‌اند؛ دوباره بارگیری کنید. / Commission policy changed. Reload.'},409);
 if(Object.keys(x.students).some(id=>!w.data.students.some(s=>s.id===id)))return json({error:'Student not found.'},400);
 const data=JSON.stringify({percent:x.percent,students:x.students}),now=new Date().toISOString();
 const changed=x.version===0?await db.prepare('INSERT OR IGNORE INTO classer_commissions (owner_id,data,version,updated_at) VALUES (?,?,1,?)').bind(x.ownerId,data,now).run():await db.prepare('UPDATE classer_commissions SET data=?,version=version+1,updated_at=? WHERE owner_id=? AND version=?').bind(data,now,x.ownerId,x.version).run();
 if(!changed.meta.changes)return json({error:'Commission policy changed. Reload.'},409);
 await financialWorkspace(x.ownerId);return json({policy:await commissionPolicy(x.ownerId)});
 }catch(e){return requestFailure(e,'ذخیره سهم مدیر انجام نشد. / Could not save commission.')}}
