import {database} from '@/db/storage';
import {defaultCommission,normalizeFinance,type CommissionPolicy} from '@/lib/finance';
import {workspaceSchema,type Workspace} from '@/lib/model';
export async function commissionPolicy(ownerId:string):Promise<CommissionPolicy>{const row=await database().prepare('SELECT data,version FROM classer_commissions WHERE owner_id=?').bind(ownerId).first<{data:string;version:number}>();const refs=await database().prepare("SELECT id,json_extract(data,'$.commissionPercent') AS percent FROM site_inquiries WHERE json_extract(data,'$.teacherOwnerId')=? AND json_extract(data,'$.forwardedAt') IS NOT NULL").bind(ownerId).all<{id:string;percent:number}>();return {...(row?{...JSON.parse(row.data),version:row.version}:defaultCommission),referrals:Object.fromEntries(refs.results.filter(x=>Number.isFinite(x.percent)&&x.percent>=0&&x.percent<=100).map(x=>[x.id,x.percent]))}}
export async function financialWorkspace(ownerId:string){
 const db=database(),policy=await commissionPolicy(ownerId);
 for(let attempt=0;attempt<3;attempt++){
  const row=await db.prepare('SELECT data,version FROM teacher_workspaces WHERE owner_id=?').bind(ownerId).first<{data:string;version:number}>();if(!row)return null;
  const previous=workspaceSchema.parse(JSON.parse(row.data)),data=normalizeFinance(previous,policy);
  if(JSON.stringify(data)===JSON.stringify(previous))return {data,version:row.version,policy};
  const changed=await db.prepare('UPDATE teacher_workspaces SET data=?,version=version+1,updated_at=? WHERE owner_id=? AND version=?').bind(JSON.stringify(data),new Date().toISOString(),ownerId,row.version).run();
  if(changed.meta.changes)return {data,version:row.version+1,policy};
 }
 throw Error('Workspace changed; reload.');
}
