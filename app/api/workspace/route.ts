import {profileContact} from '@/lib/profile-contact';
import {financialWorkspace,commissionPolicy} from '@/lib/server/finance';
import {normalizeFinance} from '@/lib/finance';
import {portfolioIdentity} from '@/lib/catalogue';
import {requestFailure} from '@/lib/server/http';
import {teacherIdentity,validOrigin,payload} from '@/lib/server/access';
import {database} from '@/db/storage';
import {workspaceSchema,validateWorkspace,sampleWorkspace,emptyWorkspace,dateKey} from '@/lib/model';
export const dynamic='force-dynamic';
async function owner(r:Request){return (await teacherIdentity(r))?.id}
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(r:Request){
 const u=await teacherIdentity(r),id=u?.id;if(!id)return json({error:'برای ورود به فضای معلم، وارد حساب خود شوید. / Sign in to continue.'},401);
 try{const db=database();let row=await db.prepare('SELECT data,version FROM teacher_workspaces WHERE owner_id = ?').bind(id).first<{data:string,version:number}>();
 if(!row){const tzDay=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const state=u.local?emptyWorkspace(u.email):sampleWorkspace(/^\d{4}-\d{2}-\d{2}$/.test(tzDay)?tzDay:dateKey(new Date()));if(u.local&&u.name)state.profile.name=u.name;await db.prepare('INSERT OR IGNORE INTO teacher_workspaces (owner_id,data,version,updated_at) VALUES (?,?,1,?)').bind(id,JSON.stringify(state),new Date().toISOString()).run();row=await db.prepare('SELECT data,version FROM teacher_workspaces WHERE owner_id = ?').bind(id).first<{data:string,version:number}>();}
 const financial=await financialWorkspace(id);
 const portfolio=await db.prepare("SELECT json_object('name',json_extract(data,'$.name'),'headline',json_extract(data,'$.headline'),'contentLocale',json_extract(data,'$.contentLocale'),'translations',json_object('fa',json_extract(data,'$.translations.fa'),'en',json_extract(data,'$.translations.en'))) AS details FROM teacher_public_profiles WHERE owner_id=?").bind(id).first<{details:string}>();
 return json({ownerId:id,data:financial!.data,version:financial!.version,isAdmin:u.isAdmin,localAccount:u.local,portfolioIdentity:portfolio?portfolioIdentity(JSON.parse(portfolio.details)):null});
 }catch(e){console.error('Workspace load failed',e);return json({error:'دریافت اطلاعات ممکن نشد. دوباره تلاش کنید. / Could not load your workspace.'},503)}
}
export async function PUT(r:Request){
 const id=await owner(r);if(!id)return json({error:'ورود به حساب لازم است. / Sign-in required.'},401);
 if(!validOrigin(r))return json({error:'درخواست نامعتبر است. / Invalid request.'},403);
 try{const body=await payload(r,1500000);
 const parsed=workspaceSchema.safeParse(body.data);if(!parsed.success||!Number.isSafeInteger(body.version))return json({error:'لطفاً فیلدها را بررسی کنید. / Please check the form fields.'},400);
 const db=database(),row=await db.prepare('SELECT data,version FROM teacher_workspaces WHERE owner_id = ?').bind(id).first<{data:string,version:number}>();if(!row||row.version!==body.version)return json({error:'اطلاعات در پنجره دیگری تغییر کرده است. ابتدا تازه‌سازی کنید. / Workspace changed in another tab. Reload before saving.'},409);
 const previous=workspaceSchema.parse(JSON.parse(row.data)),policy=await commissionPolicy(id);
 const contactChanged=parsed.data.profile.email!==previous.profile.email||parsed.data.profile.phone!==previous.profile.phone;if(body.requireContact===true||contactChanged){const contact=profileContact(parsed.data.profile.email,parsed.data.profile.phone);if(!contact.valid)return json({error:'ایمیل و شماره موبایل معتبر الزامی است. / A valid email and mobile number are required.'},400);Object.assign(parsed.data.profile,contact.value);}
 try{validateWorkspace(parsed.data,previous)}catch(e){return json({error:(e as Error).message},400)}
 const canonical=normalizeFinance({...parsed.data,sessions:parsed.data.sessions.map(s=>previous.sessions.find(old=>old.id===s.id)?.paid?s:{...s,paid:false,paidAt:''})},policy);
 canonical.sessions=canonical.sessions.map(s=>{const sent=parsed.data.sessions.find(x=>x.id===s.id)!;return {...s,paid:sent.paid,paidAt:sent.paidAt}});
 if(canonical.students.some(s=>s.sourceInquiryId!==previous.students.find(old=>old.id===s.id)?.sourceInquiryId))return json({error:'Referral links are server managed.'},400);
 try{validateWorkspace(canonical,previous);}catch(e){return json({error:(e as Error).message},400)}
 const result=await db.prepare('UPDATE teacher_workspaces SET data=?,version=version+1,updated_at=? WHERE owner_id=? AND version=?').bind(JSON.stringify(canonical),new Date().toISOString(),id,body.version).run();if(!result.meta.changes)return json({error:'تغییر هم‌زمان اطلاعات؛ دوباره بارگیری کنید. / Concurrent update. Please reload.'},409);
 return json({version:Number(body.version)+1,data:canonical});
 }catch(e){console.error('Workspace save failed',e);return requestFailure(e,'ذخیره انجام نشد. اطلاعات فرم شما حفظ شده؛ دوباره تلاش کنید. / Save failed. Please retry.')}
}
