import {identity,validOrigin} from '@/lib/server/access';
import {database} from '@/db/storage';
import {workspaceSchema,validateWorkspace,sampleWorkspace,dateKey} from '@/lib/model';
export const dynamic='force-dynamic';
function owner(r:Request){return identity(r)?.id}
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(r:Request){
 const id=owner(r);if(!id)return json({error:'برای ورود به فضای معلم، وارد حساب خود شوید. / Sign in to continue.'},401);
 try{const db=database();let row=await db.prepare('SELECT data,version FROM teacher_workspaces WHERE owner_id = ?').bind(id).first<{data:string,version:number}>();
 if(!row){const tzDay=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const state=sampleWorkspace(/^\d{4}-\d{2}-\d{2}$/.test(tzDay)?tzDay:dateKey(new Date()));await db.prepare('INSERT OR IGNORE INTO teacher_workspaces (owner_id,data,version,updated_at) VALUES (?,?,1,?)').bind(id,JSON.stringify(state),new Date().toISOString()).run();row=await db.prepare('SELECT data,version FROM teacher_workspaces WHERE owner_id = ?').bind(id).first<{data:string,version:number}>();}
 return json({data:workspaceSchema.parse(JSON.parse(row!.data)),version:row!.version,isAdmin:identity(r)?.isAdmin||false});
 }catch(e){console.error('Workspace load failed',e);return json({error:'دریافت اطلاعات ممکن نشد. دوباره تلاش کنید. / Could not load your workspace.'},503)}
}
export async function PUT(r:Request){
 const id=owner(r);if(!id)return json({error:'ورود به حساب لازم است. / Sign-in required.'},401);
 if(!validOrigin(r))return json({error:'درخواست نامعتبر است. / Invalid request.'},403);
 try{const raw=await r.text();if(raw.length>1500000)return json({error:'حجم اطلاعات از ظرفیت این فضای کاری بیشتر است. / Workspace capacity exceeded.'},413);let payload;try{payload=JSON.parse(raw)}catch{return json({error:'اطلاعات نامعتبر است. / Invalid data.'},400)}
 const parsed=workspaceSchema.safeParse(payload.data);if(!parsed.success||!Number.isSafeInteger(payload.version))return json({error:'لطفاً فیلدها را بررسی کنید. / Please check the form fields.'},400);
 const db=database(),row=await db.prepare('SELECT data,version FROM teacher_workspaces WHERE owner_id = ?').bind(id).first<{data:string,version:number}>();if(!row||row.version!==payload.version)return json({error:'اطلاعات در پنجره دیگری تغییر کرده است. ابتدا تازه‌سازی کنید. / Workspace changed in another tab. Reload before saving.'},409);
 try{validateWorkspace(parsed.data,JSON.parse(row.data));}catch(e){return json({error:(e as Error).message},400)}
 const result=await db.prepare('UPDATE teacher_workspaces SET data=?,version=version+1,updated_at=? WHERE owner_id=? AND version=?').bind(JSON.stringify(parsed.data),new Date().toISOString(),id,payload.version).run();if(!result.meta.changes)return json({error:'تغییر هم‌زمان اطلاعات؛ دوباره بارگیری کنید. / Concurrent update. Please reload.'},409);
 return json({version:payload.version+1,data:parsed.data});
 }catch(e){console.error('Workspace save failed',e);return json({error:'ذخیره انجام نشد. اطلاعات فرم شما حفظ شده؛ دوباره تلاش کنید. / Save failed. Please retry.'},503)}
}
