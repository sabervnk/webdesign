import {database} from '@/db/storage';
import {identity,json,payload,validOrigin} from '@/lib/server/access';
import {workspaceSchema,validateWorkspace} from '@/lib/model';
import {publicProfileSchema,articleSchema} from '@/lib/catalogue';
import {requestFailure} from '@/lib/server/http';
export const dynamic='force-dynamic';
type RecordRow={data:string,version:number};
const decode=<T extends RecordRow>(row:T|null)=>row?{...row,data:JSON.parse(row.data)}:null;
export async function GET(r:Request){
 if(!(await identity(r))?.isAdmin)return json({},403);
 const db=database(),id=new URL(r.url).searchParams.get('id');
 if(!id){
  const rows=await db.prepare(`WITH owners AS (SELECT owner_id AS id FROM teacher_workspaces UNION SELECT owner_id FROM teacher_public_profiles UNION SELECT id FROM classer_accounts WHERE role='teacher')
   SELECT owners.id,COALESCE(NULLIF(json_extract(p.data,'$.name'),''),a.name,json_extract(w.data,'$.profile.name'),owners.id) AS name,COALESCE(p.published,0) AS published
   FROM owners LEFT JOIN teacher_workspaces w ON w.owner_id=owners.id LEFT JOIN teacher_public_profiles p ON p.owner_id=owners.id LEFT JOIN classer_accounts a ON a.id=owners.id ORDER BY name LIMIT 1000`).all();
  return json({teachers:rows.results});
 }
 if(id.length>160)return json({},400);
 const [w,p,a]=await Promise.all([
  db.prepare('SELECT data,version FROM teacher_workspaces WHERE owner_id=?').bind(id).first<RecordRow>(),
  db.prepare('SELECT id,data,version FROM teacher_public_profiles WHERE owner_id=?').bind(id).first<RecordRow&{id:string}>(),
  db.prepare("SELECT id,version,status,json_extract(data,'$.title') AS title FROM teacher_articles WHERE owner_id=? ORDER BY updated_at DESC LIMIT 500").bind(id).all(),
 ]);
 const articleId=new URL(r.url).searchParams.get('article');
 if(articleId){
  const article=await db.prepare('SELECT id,data,version FROM teacher_articles WHERE owner_id=? AND id=?').bind(id,articleId).first<RecordRow&{id:string}>();
  return article?json({article:decode(article)}):json({},404);
 }
 return json({workspace:decode(w),profile:decode(p),articles:a.results});
}
export async function PUT(r:Request){
 if(!(await identity(r))?.isAdmin||!validOrigin(r))return json({},403);
 try{
  const b=await payload(r,1_900_000);
  if(typeof b.id!=='string'||b.id.length>160||!Number.isSafeInteger(b.version))return json({error:'شناسه یا نسخه معتبر نیست.'},400);
  const db=database(),now=new Date().toISOString();
  if(b.kind==='profile'){
   const p=publicProfileSchema.safeParse(b.data);if(!p.success)return json({error:p.error.issues[0].message},400);
   const changed=await db.prepare('UPDATE teacher_public_profiles SET data=?,published=?,version=version+1,updated_at=? WHERE owner_id=? AND version=?').bind(JSON.stringify(p.data),Number(p.data.published),now,b.id,Number(b.version)).run();
   return changed.meta.changes?json({version:Number(b.version)+1}):json({error:'پرتفولیو تغییر کرده؛ دوباره باز کنید.'},409);
  }
  if(b.kind==='workspace'){
   const p=workspaceSchema.safeParse(b.data);if(!p.success)return json({error:p.error.issues[0].message},400);
   const prev=await db.prepare('SELECT data,version FROM teacher_workspaces WHERE owner_id=?').bind(b.id).first<RecordRow>();
   if(!prev||prev.version!==b.version)return json({error:'پرونده تغییر کرده؛ دوباره باز کنید.'},409);
   try{validateWorkspace(p.data,JSON.parse(prev.data))}catch(e){return json({error:(e as Error).message},400)}
   const changed=await db.prepare('UPDATE teacher_workspaces SET data=?,version=version+1,updated_at=? WHERE owner_id=? AND version=?').bind(JSON.stringify(p.data),now,b.id,Number(b.version)).run();
   return changed.meta.changes?json({version:Number(b.version)+1}):json({},409);
  }
  if(b.kind==='article'&&typeof b.articleId==='string'){
   const p=articleSchema.safeParse(b.data);if(!p.success)return json({error:p.error.issues[0].message},400);
   if(p.data.status==='published'){const teacher=await db.prepare('SELECT published FROM teacher_public_profiles WHERE owner_id=?').bind(b.id).first<{published:number}>();if(!teacher?.published)return json({error:'برای انتشار نوشته، ابتدا پرتفولیو را منتشر کنید.'},400)}
   const stored={...p.data,readingMinutes:Math.max(1,Math.ceil(p.data.content.split(/\s+/).length/180))};
   const changed=await db.prepare('UPDATE teacher_articles SET data=?,status=?,version=version+1,updated_at=? WHERE owner_id=? AND id=? AND version=?').bind(JSON.stringify(stored),p.data.status,now,b.id,b.articleId,Number(b.version)).run();
   return changed.meta.changes?json({version:Number(b.version)+1}):json({error:'نوشته تغییر کرده؛ دوباره باز کنید.'},409);
  }
  return json({},400);
 }catch(e){return requestFailure(e,'ذخیره انجام نشد.')}
}
