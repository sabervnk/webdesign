import {database} from '@/db/storage';
import {identity,type Principal} from './access';
import {RequestError} from './http';
export async function messageScope(r:Request,student?:string,teacher?:string){
 const u=await identity(r);if(!u||u.mustChange)throw new RequestError('ورود به حساب لازم است. / Sign in first.',401);
 let teacherId=u.id,studentId=student??'';
 if(u.role==='student'){const a=await database().prepare("SELECT teacher_id,student_id FROM classer_accounts WHERE id=? AND active=1 AND role='student'").bind(u.id).first<{teacher_id:string;student_id:string}>();if(!a?.teacher_id||!a.student_id)throw new RequestError('پروندهٔ زبان‌آموز متصل نیست. / No linked roster record.',403);if((teacher&&teacher!==a.teacher_id)||(student&&student!==a.student_id))throw new RequestError('Access denied.',403);teacherId=a.teacher_id;studentId=a.student_id}
 else if(u.isAdmin){if(!teacher)throw new RequestError('Select a teacher record.',400);teacherId=teacher}
 else if(u.role!=='teacher'||teacher&&teacher!==u.id)throw new RequestError('Access denied.',403);
 if(teacherId.length>160||studentId.length>80)throw new RequestError('Invalid thread.',400);
 const row=await database().prepare('SELECT data FROM teacher_workspaces WHERE owner_id=?').bind(teacherId).first<{data:string}>();if(!row)throw new RequestError('Workspace unavailable.',404);
 const w=JSON.parse(row.data) as {demo:boolean;profile:{name:string};students:{id:string;name:string}[]},record=studentId?w.students.find(s=>s.id===studentId):null;
 if(studentId&&!record)throw new RequestError('Student not found.',404);
 const linked=studentId?await database().prepare("SELECT 1 FROM classer_accounts WHERE role='student' AND active=1 AND teacher_id=? AND student_id=? LIMIT 1").bind(teacherId,studentId).first():null;
 return {u,teacherId,studentId,record,w,available:!w.demo&&!!linked};
}
