import {database} from '@/db/storage';
import {identity,json,superAdministrator} from '@/lib/server/access';
export const dynamic='force-dynamic';
export async function GET(r:Request){
 const u=await identity(r);if(!u?.isAdmin)return json({},403);
 try{
 const db=database();
 const counts=await db.prepare(`SELECT
 (SELECT count(*) FROM teacher_public_profiles) AS portfolios,
 (SELECT count(*) FROM teacher_public_profiles WHERE published=1) AS published,
 (SELECT count(*) FROM site_inquiries WHERE status='new') AS pending,
 (SELECT count(*) FROM site_inquiries) AS requests`).first();
 const users=await db.prepare(`SELECT count(*) AS users,sum(CASE WHEN active=1 THEN 1 ELSE 0 END) AS active,sum(CASE WHEN role='teacher' THEN 1 ELSE 0 END) AS teachers,sum(CASE WHEN role='student' THEN 1 ELSE 0 END) AS students,sum(CASE WHEN role='admin' THEN 1 ELSE 0 END) AS admins,sum(CASE WHEN must_change=1 THEN 1 ELSE 0 END) AS temporary FROM classer_accounts`).first();
 const recent=await db.prepare("SELECT id,status,created_at,json_extract(data,'$.name') AS name,json_extract(data,'$.teacherName') AS teacherName,json_extract(data,'$.kind') AS kind,json_extract(data,'$.forwardedAt') AS forwardedAt FROM site_inquiries ORDER BY created_at DESC LIMIT 6").all();
 return json({counts:{...counts,...users},recent:recent.results,superAdmin:superAdministrator(u)});
 }catch{return json({error:'دریافت آمار ممکن نشد. دوباره تلاش کنید.'},503)}
}

