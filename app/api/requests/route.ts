import {teachingOwner} from '@/lib/server/teacher-roles';
import {database} from '@/db/storage';
import {inquirySchema,offerFor,type DisplayOffer,type Teacher} from '@/lib/catalogue';
import {json,validOrigin,payload} from '@/lib/server/access';
import {requestFailure} from '@/lib/server/http';

export async function POST(r:Request){
 if(!validOrigin(r))return json({error:'Invalid origin'},403);
 try{
  const parsed=inquirySchema.safeParse(await payload(r,15000));
  if(!parsed.success)return json({error:'نام، ایمیل، شماره تماس و متن پیام را کامل و معتبر وارد کنید. / Enter a valid name, email, phone and message.'},400);
  const {website,...input}=parsed.data;
  if(website)return json({error:'درخواست معتبر نیست. / Invalid request.'},400);
  const data={...input,email:input.email.toLowerCase()};
  const db=database();
  const receipt=()=>({id:data.id,reference:data.id.slice(0,8).toUpperCase()});
  async function duplicate(){
   const row=await db.prepare('SELECT data FROM site_inquiries WHERE id=?').bind(data.id).first<{data:string}>();
   if(!row)return null;
   const saved=JSON.parse(row.data);
   const same=Object.entries(data).every(([key,value])=>(key==='offerId'?(saved[key]??''):saved[key])===value);
   return same?json(receipt()):json({error:'این شناسه برای درخواست دیگری ثبت شده است. فرم را دوباره باز کنید. / Request identifier already used for different details.'},409);
  }
  // A successful retry must still work after the teacher changes their offer.
  const repeated=await duplicate();if(repeated)return repeated;
  let teacher:Teacher|undefined;
  let offer:DisplayOffer|undefined;
  if(data.kind==='class'){
   const row=await db.prepare(`SELECT data,version FROM teacher_public_profiles WHERE id=? AND published=1 AND ${teachingOwner('teacher_public_profiles.owner_id')}`).bind(data.teacherId).first<{data:string,version:number}>();
   if(!row)return json({error:'این معلم اکنون درخواست جدید نمی‌پذیرد. / This teacher is not available.'},400);
   if(data.teacherVersion!==row.version)return json({error:'مشخصات یا نرخ معلم تغییر کرده است؛ صفحه را تازه کنید و دوباره بررسی کنید. / Teacher details changed. Refresh and review the current fee.'},409);
   teacher=JSON.parse(row.data) as Teacher;
   offer=offerFor(teacher,data.language,data.format,data.offerId);
   if(!offer)return json({error:'زبان یا نوع کلاس با خدمات معلم مطابقت ندارد. / Select a language and format offered by this teacher.'},400);
  }
  const now=new Date().toISOString();
  const stored={...data,teacherName:teacher?.name||'',offerTitle:offer?.title||'',rate:offer?.rate??null,currency:offer?.currency??null,duration:offer?.duration??null,adminNote:''};
  // One conditional write makes both duplicate handling and the hourly limit
  // atomic on D1 and across Netlify snapshot compare-and-swap retries.
  const result=await db.prepare(`INSERT OR IGNORE INTO site_inquiries (id,email,data,status,version,created_at,updated_at)
   SELECT ?,?,?,'new',1,?,?
   WHERE (SELECT COUNT(*) FROM site_inquiries WHERE email=? AND created_at>?)<5
   AND (?='contact' OR EXISTS(SELECT 1 FROM teacher_public_profiles WHERE id=? AND published=1 AND ${teachingOwner('teacher_public_profiles.owner_id')} AND version=?))`)
   .bind(data.id,data.email,JSON.stringify(stored),now,now,data.email,new Date(Date.now()-3600000).toISOString(),data.kind,data.teacherId,data.teacherVersion??0).run();
  if(result.meta.changes)return json(receipt(),201);
  const raced=await duplicate();if(raced)return raced;
  if(data.kind==='class'){
   const current=await db.prepare('SELECT version,published FROM teacher_public_profiles WHERE id=?').bind(data.teacherId).first<{version:number,published:number}>();
   if(!current?.published||current.version!==data.teacherVersion)return json({error:'پیشنهاد معلم تغییر کرده است؛ صفحه را تازه کنید. / Teacher offer changed. Refresh before requesting.'},409);
  }
  return json({error:'درخواست‌های زیادی ثبت کرده‌اید؛ کمی بعد دوباره تلاش کنید. / Please try again later.'},429);
 }catch(e){console.error('Inquiry failed',e);return requestFailure(e,'ارسال درخواست انجام نشد؛ متن شما حفظ شده است. / Could not send your request. Please retry.')}
}
