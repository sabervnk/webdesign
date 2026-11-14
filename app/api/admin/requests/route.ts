import {requestFailure} from '@/lib/server/http';
import {z} from 'zod';
import {database} from '@/db/storage';
import {identity,json,validOrigin,payload} from '@/lib/server/access';
export const dynamic='force-dynamic';
export async function GET(r:Request){if(!(await identity(r))?.isAdmin)return json({},403);try{const rows=await database().prepare('SELECT * FROM site_inquiries ORDER BY created_at DESC LIMIT 1000').all<{id:string;data:string;status:string;version:number;created_at:string;updated_at:string}>();return json({requests:rows.results.map(x=>({...JSON.parse(x.data),id:x.id,status:x.status,version:x.version,createdAt:x.created_at,updatedAt:x.updated_at}))})}catch{return json({error:'Inbox unavailable.'},503)}}
const schema=z.object({id:z.string().uuid(),version:z.number().int().positive(),status:z.enum(['new','reviewing','closed']),adminNote:z.string().trim().max(4000).default(''),action:z.enum(['save','forward']).default('save'),commissionPercent:z.number().min(0).max(100).multipleOf(.01).optional()});
export async function PUT(r:Request){const u=await identity(r);if(!u?.isAdmin||!validOrigin(r))return json({},403);try{
 const p=schema.safeParse(await payload(r,14000));if(!p.success)return json({error:'Invalid request'},400);const x=p.data,db=database(),row=await db.prepare('SELECT data,status,version,created_at FROM site_inquiries WHERE id=?').bind(x.id).first<{data:string;status:string;version:number;created_at:string}>();
 if(!row)return json({},404);if(row.version!==x.version)return json({error:'Request changed; reload.'},409);
 const old=JSON.parse(row.data),now=new Date().toISOString(),author=u.name||'Administrator';
 const notes=[...(old.notes??[])];if(!notes.length&&old.adminNote?.trim())notes.push({id:'legacy-note',text:old.adminNote,at:row.created_at,author:'Administrator',dateUnknown:true});
 if(x.adminNote)notes.push({id:crypto.randomUUID(),text:x.adminNote,at:now,author});
 if(notes.length>200)return json({error:'Note history is full.'},400);
 const events=[...(old.events??[])];if(x.status!==row.status)events.push({id:crypto.randomUUID(),type:'status:'+x.status,at:now,author});
 const data={...old,adminNote:'',notes,events};
 if(x.action==='forward'){
  if(old.kind!=='class'||old.convertedStudentId)return json({error:'Only an unconverted class request can be referred.'},400);
  if(!/^\+?[\d\s()-]{8,30}$/.test(old.phone??''))return json({error:'شماره تماس درخواست کامل نیست. / The request needs a valid phone number.'},400);
  const target=await db.prepare('SELECT owner_id FROM teacher_public_profiles WHERE id=?').bind(old.teacherId).first<{owner_id:string}>();if(!target)return json({error:'Teacher not found.'},404);
  data.teacherOwnerId=target.owner_id;data.forwardedAt=now;data.commissionPercent=x.commissionPercent??old.commissionPercent??0;
  events.push({id:crypto.randomUUID(),type:'forwarded',at:now,author});
 }
 const changed=await db.prepare('UPDATE site_inquiries SET data=?,status=?,version=version+1,updated_at=? WHERE id=? AND version=?').bind(JSON.stringify(data),x.status,now,x.id,x.version).run();if(!changed.meta.changes)return json({error:'Request changed; reload.'},409);
 return json({version:x.version+1,request:{...data,id:x.id,status:x.status,version:x.version+1,createdAt:row.created_at,updatedAt:now}});
 }catch(e){return requestFailure(e,'Could not save request.')}}
