import {normalizeFinance} from '@/lib/finance';
import {identity,json} from '@/lib/server/access';
import {database} from '@/db/storage';
import {workspaceSchema} from '@/lib/model';
export const dynamic='force-dynamic';
export async function GET(r:Request){
 const u=await identity(r);if(!u||u.role!=='student'||u.mustChange)return json({},403);
 const row=await database().prepare('SELECT a.student_id,w.data FROM classer_accounts a JOIN teacher_workspaces w ON w.owner_id=a.teacher_id WHERE a.id=? AND a.active=1 AND a.role=?').bind(u.id,'student').first<{student_id:string,data:string}>();
 if(!row)return json({error:'پروندهٔ شما هنوز متصل نیست. / No linked student record.'},404);
 const w=normalizeFinance(workspaceSchema.parse(JSON.parse(row.data))),s=w.students.find(x=>x.id===row.student_id);
 if(!s||w.demo)return json({error:'پروندهٔ شما در دسترس نیست. / Your student record is unavailable.'},404);
 return json({name:s.name,teacher:w.profile.name,level:s.level,skills:s.skills,sessions:w.sessions.filter(x=>x.studentId===s.id).map(({date,time,duration,type,status,rate,currency,paid})=>({date,time,duration,type,status,rate,currency,paid}))});
}
