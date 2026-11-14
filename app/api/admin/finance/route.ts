import {z} from 'zod';
import {database} from '@/db/storage';
import {identity,json,payload,validOrigin} from '@/lib/server/access';
import {financialWorkspace,commissionPolicy} from '@/lib/server/finance';
import {workspaceSchema,emptyWorkspace} from '@/lib/model';
import {normalizeFinance,defaultCommission} from '@/lib/finance';
import {feeSplit} from '@/lib/finance';
import {RequestError,requestFailure} from '@/lib/server/http';
export const dynamic='force-dynamic';
export async function GET(r:Request){if(!(await identity(r))?.isAdmin)return json({},403);try{
 const db=database();const missing=await db.prepare("SELECT a.id,a.name,a.email,a.phone FROM classer_accounts a WHERE a.role='teacher' AND NOT EXISTS(SELECT 1 FROM teacher_workspaces w WHERE w.owner_id=a.id) LIMIT 1000").all<{id:string;name:string;email:string;phone:string}>();for(const a of missing.results){const w=emptyWorkspace(a.email);w.profile.name=a.name;w.profile.phone=a.phone;await db.prepare('INSERT OR IGNORE INTO teacher_workspaces (owner_id,data,version,updated_at) VALUES (?,?,1,?)').bind(a.id,JSON.stringify(w),new Date().toISOString()).run()}const [owners,policies,referrals]=await Promise.all([
 db.prepare("SELECT w.owner_id AS id,w.data,COALESCE(json_extract(p.data,'$.name'),json_extract(w.data,'$.profile.name')) || CASE WHEN EXISTS(SELECT 1 FROM classer_administrator_ids r WHERE r.owner_id=w.owner_id) OR EXISTS(SELECT 1 FROM classer_accounts a WHERE a.id=w.owner_id AND a.role='admin') THEN ' · پروندهٔ قدیمی مدیریت' ELSE '' END AS name FROM teacher_workspaces w LEFT JOIN teacher_public_profiles p ON p.owner_id=w.owner_id ORDER BY name LIMIT 500").all<{id:string;name:string;data:string}>(),
 db.prepare('SELECT owner_id,data,version FROM classer_commissions LIMIT 500').all<{owner_id:string;data:string;version:number}>(),
 db.prepare("SELECT id,json_extract(data,'$.teacherOwnerId') AS owner,json_extract(data,'$.commissionPercent') AS percent FROM site_inquiries WHERE json_extract(data,'$.forwardedAt') IS NOT NULL LIMIT 10000").all<{id:string;owner:string;percent:number}>()]);
 const requested=new URL(r.url).searchParams.get('ownerId');const teachers=[];
 for(const owner of owners.results){if(requested&&requested!==owner.id)continue;const raw=workspaceSchema.parse(JSON.parse(owner.data));if(raw.demo){raw.students=[];raw.sessions=[];}const row=policies.results.find(p=>p.owner_id===owner.id),policy={...(row?{...JSON.parse(row.data),version:row.version}:defaultCommission),referrals:Object.fromEntries(referrals.results.filter(r=>r.owner===owner.id&&Number.isFinite(r.percent)&&r.percent>=0&&r.percent<=100).map(r=>[r.id,r.percent]))},data=normalizeFinance(raw,policy);
 teachers.push({id:owner.id,name:owner.name,policy,students:data.students.map(s=>({id:s.id,name:s.name,commissionPercent:s.commissionPercent??0})),sessions:data.sessions.map(s=>({id:s.id,studentId:s.studentId,date:s.date,time:s.time,duration:s.duration,status:s.status,charge:s.charge,cancelReason:s.cancelReason,paid:s.paid,paidAt:s.paidAt,rate:s.rate,currency:s.currency,pricing:s.pricing,commissionPercent:s.commissionPercent??0,split:feeSplit(s)}))})}
 return json({teachers});
 }catch(e){if(e instanceof z.ZodError)e=new RequestError('Invalid form fields.',400);return requestFailure(e,'دریافت گزارش مالی انجام نشد. / Could not load finance report.')}}
const input=z.object({ownerId:z.string().min(1).max(160),version:z.number().int().min(0),percent:z.number().min(0).max(100).multipleOf(.01),sessions:z.record(z.string().max(80),z.number().min(0).max(100).multipleOf(.01)).refine(v=>Object.keys(v).length<=10000).optional(),students:z.record(z.string().max(80),z.number().min(0).max(100).multipleOf(.01)).refine(v=>Object.keys(v).length<=2000)});
export async function PUT(r:Request){if(!(await identity(r))?.isAdmin||!validOrigin(r))return json({},403);try{
 const parsed=input.safeParse(await payload(r,120000));if(!parsed.success)return json({error:'Invalid commission fields.'},400);const x=parsed.data,db=database();const w=await financialWorkspace(x.ownerId);if(!w)return json({},404);
 if(w.policy.version!==x.version)return json({error:'درصدها تغییر کرده‌اند؛ دوباره بارگیری کنید. / Commission policy changed. Reload.'},409);
 if(Object.keys(x.students).some(id=>!w.data.students.some(s=>s.id===id)))return json({error:'Student not found.'},400);
 const sessions=x.sessions??w.policy.sessions??{};if(Object.keys(sessions).some(id=>!w.data.sessions.some(s=>s.id===id)))return json({error:'Class not found.'},400);if(w.data.sessions.some(s=>s.paid&&sessions[s.id]!==w.policy.sessions?.[s.id]))return json({error:'سهم کلاس تسویه‌شده قابل تغییر نیست.'},409);
 const data=JSON.stringify({percent:x.percent,students:x.students,sessions}),now=new Date().toISOString();
 const changed=x.version===0?await db.prepare('INSERT OR IGNORE INTO classer_commissions (owner_id,data,version,updated_at) VALUES (?,?,1,?)').bind(x.ownerId,data,now).run():await db.prepare('UPDATE classer_commissions SET data=?,version=version+1,updated_at=? WHERE owner_id=? AND version=?').bind(data,now,x.ownerId,x.version).run();
 if(!changed.meta.changes)return json({error:'Commission policy changed. Reload.'},409);
 await financialWorkspace(x.ownerId);return json({policy:await commissionPolicy(x.ownerId)});
 }catch(e){return requestFailure(e,'ذخیره سهم مدیر انجام نشد. / Could not save commission.')}}
