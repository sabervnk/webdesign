import {sampleWorkspace,validateWorkspace,workspaceSchema} from '../../lib/model';
import {sampleTeachers,sampleArticles,publicProfileSchema,articleSchema,portfolioIdentity,classOffers,offerFor,inquirySchema} from '../../lib/catalogue';
import catalogue from '../../lib/site-copy-catalogue.json';
import dictionary from '../../lib/translation-dictionary.json';
import {captchaImage} from '../../lib/captcha-image';

export const DATABASE_NAME='classer-original-ui-demo-v1';
export const clone=<T>(value:T):T=>structuredClone(value);
export function today(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(k=>parts.find(p=>p.type===k)!.value).join('-')}
const now=()=>new Date().toISOString();
export function createState(){
 const teachers=clone(sampleTeachers);
 const workspaces=Object.fromEntries(teachers.map((t,i)=>{const w=sampleWorkspace(today());w.profile={...w.profile,name:t.name,nameFa:t.name,nameEn:['Sara Mehr','Arman Rad','Leila Navid'][i],email:['teacher','arman','leila'][i]+'@example.com',phone:'+98912000000'+i};return[t.id,{data:w,version:1}]}));
 const accounts=[{id:'demo-admin',username:'admin',name:'مدیر نمونه',email:'admin@example.com',phone:'+989120000009',role:'admin',active:1,teacher_id:null,student_id:null,must_change:0},...teachers.map((t,i)=>({id:t.id,username:['teacher','arman','leila'][i],name:t.name,email:['teacher','arman','leila'][i]+'@example.com',phone:'+98912000000'+i,role:'teacher',active:1,teacher_id:null,student_id:null,must_change:0})),{id:'demo-student',username:'student',name:workspaces[teachers[0].id].data.students[0].name,email:'elena@example.com',phone:'+989120000008',role:'student',active:1,teacher_id:teachers[0].id,student_id:'elena',must_change:0}];
 return {schema:1,currentAccount:null as string|null,accounts,workspaces,teachers,articles:clone(sampleArticles),requests:[] as any[],messages:[] as any[],media:[] as any[],videos:{} as Record<string,any>,photoOwners:{} as Record<string,string>,values:{} as Record<string,any>,copyVersion:1,categories:['learning','conversation','exams','culture'],policies:Object.fromEntries(teachers.map(t=>[t.id,{percent:20,students:{},sessions:{},version:1}]))};
}
export type DemoState=ReturnType<typeof createState>;
export interface BlobStore{get(key:string):Promise<Blob|undefined>;put(key:string,blob:Blob):Promise<void>;remove(key:string):Promise<void>}
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Classer-Demo':'browser-local'}});
class DemoError extends Error{constructor(message:string,public status=400){super(message)}}
const requireValue=(value:any,message='این رکورد نمونه پیدا نشد. / Sample record not found.')=>{if(!value)throw new DemoError(message,404);return value};
const versionCheck=(sent:unknown,actual:number)=>{if(sent!==undefined&&Number(sent)!==actual)throw new DemoError('نسخهٔ اطلاعات تغییر کرده است؛ صفحه را تازه کنید. / Refresh the changed record.',409)};
function account(s:DemoState){return s.accounts.find(a=>a.id===s.currentAccount)||null}
function owner(s:DemoState,url:URL,body:any={}){const a=account(s);const requested=body.ownerId||body.teacherId||body.id&&url.pathname==='/api/admin/teachers'&&body.id||url.searchParams.get('ownerId')||url.searchParams.get('owner')||url.searchParams.get('teacherId')||url.searchParams.get('id')&&url.pathname==='/api/admin/teachers'&&url.searchParams.get('id');return requested||((a?.role==='teacher'&&s.workspaces[a.id])?a.id:a?.teacher_id)||s.teachers[0].id}
function publicData(s:DemoState){return {teachers:s.teachers.filter(t=>t.published),articles:s.articles.filter(a=>a.status==='published'&&s.teachers.some(t=>t.id===a.teacherId&&t.published)),isAdmin:account(s)?.role==='admin'}}
function policies(s:DemoState,id:string){return s.policies[id]??(s.policies[id]={percent:20,students:{},sessions:{},version:1})}
function teacherDetail(s:DemoState,id:string){const p=s.teachers.find(t=>t.id===id);return {workspace:s.workspaces[id]||null,profile:p?{id:p.id,version:p.version,data:p}:null,articles:s.articles.filter(a=>a.teacherId===id)}}
function bytesBase64(bytes:Uint8Array){let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text)}
export async function handle(request:Request,s:DemoState,blobs:BlobStore):Promise<Response>{
 try{
 const url=new URL(request.url),p=url.pathname,method=request.method;
 const isJson=request.headers.get('content-type')?.includes('application/json');
 const b:any=method!=='GET'&&method!=='HEAD'&&isJson?await request.json():{};
 const a=account(s),id=owner(s,url,b);
 if(p==='/__classer_demo__/state')return json({account:a,catalogue:publicData(s),values:s.values,videos:s.videos});
 if(p==='/__classer_demo__/reset'&&method==='POST'){Object.assign(s,createState());return json({ok:true})}
 if(p==='/api/auth/captcha')return json({id:crypto.randomUUID(),image:'data:image/png;base64,'+bytesBase64(await captchaImage('123456'))});
 if(p.startsWith('/api/auth/')){
  const action=p.split('/').at(-1);
  if(action==='login'){
   const found=s.accounts.find(x=>x.username===String(b.username).trim()&&x.active);
   if(!found||b.password!=='demo1234'||b.captchaCode!=='123456')throw new DemoError('برای دمو از نام کاربری teacher، admin یا student، رمز demo1234 و کد تصویر 123456 استفاده کنید.');
   s.currentAccount=found.id;return json({next:found.role==='admin'?'/admin':found.role==='student'?'/student':'/dashboard'});
  }
  if(action==='logout'){s.currentAccount=null;return json({ok:true})}
  if(action==='recovery-request')return json({challenge:'demo-challenge',resendAfter:1,message:'این نسخه نمایشی است؛ ایمیلی ارسال نمی‌شود. کد نمونه: 123456'});
  if(action==='recovery-verify'){if(b.code!=='123456')throw new DemoError('کد نمونه 123456 است.');return json({grant:'demo-grant'})}
  if(['change','reset','recovery-reset'].includes(action))return json({reset:true,message:'بازیابی فقط نمایشی است؛ رمز ورود نمونه همچنان demo1234 است.'});
  throw new DemoError('این عملیات در نسخهٔ نمایشی به سرویس واقعی متصل نیست.');
 }
 if(p==='/api/catalogue')return json(publicData(s));
 if(p==='/api/translate'){const texts=b.texts||b.chunks||[];return json({translations:Object.fromEntries(texts.map((text:string)=>[text,(dictionary as any)[text.trim()]||text]))})}
 if(p==='/api/workspace'){
  const doc=requireValue(s.workspaces[id]);
  if(method==='PUT'){versionCheck(b.version,doc.version);const next=workspaceSchema.parse(b.data);validateWorkspace(next,doc.data);doc.data=next;doc.version++}
  return json({ownerId:id,data:doc.data,version:doc.version,isAdmin:a?.role==='admin',localAccount:true,portfolioIdentity:portfolioIdentity(requireValue(s.teachers.find(t=>t.id===id)))});
 }
 if(p==='/api/studio')return json({profile:requireValue(s.teachers.find(t=>t.id===id)),articles:s.articles.filter(x=>x.teacherId===id)});
 if(p==='/api/studio/profile'){
  const profile=requireValue(s.teachers.find(t=>t.id===id));versionCheck(b.version,profile.version);
  const values=method==='PATCH'?{gender:b.gender}:publicProfileSchema.parse(b.profile);
  Object.assign(profile,values,{version:profile.version+1,updatedAt:now()});return json({version:profile.version,profile});
 }
 if(p==='/api/studio/posts'){
  const articleId=b.id||url.searchParams.get('id'),existing=s.articles.find(x=>x.id===articleId);
  if(method==='GET')return articleId?json({article:requireValue(existing)}):json({articles:s.articles.filter(x=>x.teacherId===id)});
  if(existing)versionCheck(b.version,existing.version);
  if(method==='DELETE'){s.articles=s.articles.filter(x=>x.id!==articleId);return json({ok:true})}
  const data=articleSchema.parse(b.article),article={...data,id:articleId||crypto.randomUUID(),teacherId:existing?.teacherId||id,createdAt:existing?.createdAt||now(),updatedAt:now(),version:(existing?.version||0)+1,sample:true};
  if(existing)s.articles=s.articles.map(x=>x.id===existing.id?article:x);else s.articles.unshift(article);
  return json({article,id:article.id,version:article.version});
 }
 if(p==='/api/studio/categories'){
  if(method==='POST'&&!s.categories.includes(String(b.name)))s.categories.push(String(b.name).slice(0,60));
  return json({categories:s.categories.map(name=>({name})),name:b.name});
 }
 if(p==='/api/studio/media'){
  if(method==='GET')return json({media:s.media.filter(x=>x.ownerId===id)});
  if(method==='DELETE'){s.media=s.media.filter(x=>x.id!==b.id);await blobs.remove('media:'+b.id);return json({ok:true})}
  const blob=await request.blob();if(blob.size>20*1024*1024)throw new DemoError('فایل نمونه حداکثر ۲۰ مگابایت باشد.');
  const mediaId=crypto.randomUUID(),type=blob.type.startsWith('video/')?'video':'image';await blobs.put('media:'+mediaId,blob);
  const media={id:mediaId,ownerId:id,url:'/api/blog-media/'+mediaId,type,mime:blob.type,name:decodeURIComponent(request.headers.get('X-File-Name')||'demo-file'),bytes:blob.size,createdAt:now()};s.media.unshift(media);return json(media);
 }
 if(p.startsWith('/api/blog-media/')){const blob=await blobs.get('media:'+p.split('/').at(-1));return blob?new Response(blob,{headers:{'Content-Type':blob.type}}):new Response(null,{status:404})}
 if(p==='/api/photo'||p.startsWith('/api/public-photo/')){
  const photoId=p==='/api/photo'?id:p.split('/').at(-1)!;
  if(method==='POST'){const blob=await request.blob();if(blob.size>2*1024*1024)throw new DemoError('حجم تصویر نمونه زیاد است.');await blobs.put('photo:'+id,blob);const version=Date.now();const w=s.workspaces[id];if(w)w.data.profile.photo='/api/photo?v='+version;const profile=s.teachers.find(t=>t.id===id);if(profile)profile.photo='/api/public-photo/'+id+'?v='+version;return json({url:'/api/photo?v='+version,photo:'/api/photo?v='+version,version})}
  const blob=await blobs.get('photo:'+photoId);return blob?new Response(blob,{headers:{'Content-Type':blob.type}}):new Response(null,{status:404});
 }
 if(p==='/api/site-logo'){
  if(method==='POST'){await blobs.put('site-logo',await request.blob());return json({url:'/api/site-logo?v='+Date.now()})}
  const blob=await blobs.get('site-logo');return blob?new Response(blob,{headers:{'Content-Type':blob.type}}):new Response(null,{status:404});
 }
 if(p==='/api/studio/video'||p.startsWith('/api/public-video/')){
  const ownerId=p.startsWith('/api/public-video/')?p.split('/').at(-1)!:id;
  if(method==='POST'){const blob=await request.blob();if(blob.size>50*1024*1024)throw new DemoError('برای دمو ویدئوی کمتر از ۵۰ مگابایت انتخاب کنید.');await blobs.put('video:'+id,blob);s.videos[id]={visible:false,bytes:blob.size,uploadedAt:now()}}
  if(method==='PATCH'&&s.videos[id])s.videos[id].visible=!!b.visible;
  if(method==='DELETE'){delete s.videos[id];await blobs.remove('video:'+id)}
  if(p.startsWith('/api/public-video/')||url.searchParams.get('stream')==='1'){const blob=await blobs.get('video:'+ownerId);return blob?new Response(blob,{headers:{'Content-Type':blob.type,'Accept-Ranges':'bytes'}}):new Response(null,{status:404})}
  const video=s.videos[id];return json({video:video?{...video,url:'/api/public-video/'+id,visible:video.visible}:null,visible:video?.visible||false,url:video?'/api/public-video/'+id:undefined});
 }
 if(p==='/api/requests'&&method==='POST'){
  const input=inquirySchema.parse(b),teacher=s.teachers.find(t=>t.id===input.teacherId),offer=teacher?offerFor(teacher,input.language,input.format,input.offerId||undefined)||classOffers(teacher)[0]:null;
  if(!s.requests.some(x=>x.id===input.id))s.requests.unshift({...input,teacherName:teacher?.name||'',rate:offer?.rate??null,currency:offer?.currency??null,duration:offer?.duration??null,status:'new',adminNote:'',notes:[],events:[],createdAt:now(),updatedAt:now(),version:1});
  return json({ok:true,message:'درخواست نمونه فقط در همین مرورگر ثبت شد.'});
 }
 if(p==='/api/admin/content'){
  if(method==='PATCH'){versionCheck(b.version,s.copyVersion);for(const change of b.changes||[b]){const old=s.values[change.key]||{};if(change.value===null||change.value==='')delete old[change.locale];else old[change.locale]=change.value;s.values[change.key]=old}s.copyVersion++}
  return json({catalogue,values:s.values,version:s.copyVersion});
 }
 if(p==='/api/admin/overview')return json({counts:{users:s.accounts.length,teachers:s.teachers.length,students:s.accounts.filter(x=>x.role==='student').length,pending:s.requests.filter(x=>x.status==='new').length,temporary:0},recent:s.requests.slice(0,8).map(x=>({...x,created_at:x.createdAt}))});
 if(p==='/api/admin/teachers'){
  if(method==='GET'){if(url.searchParams.has('article')){const article=requireValue(s.articles.find(x=>x.id===url.searchParams.get('article')));return json({article:{id:article.id,data:article,version:article.version}})}return url.searchParams.get('id')?json(teacherDetail(s,id)):json({teachers:s.teachers.map(t=>({id:t.id,name:t.name,published:Number(t.published),kind:'teacher',hasAccount:true,username:s.accounts.find(a=>a.id===t.id)?.username,email:s.workspaces[t.id]?.data.profile.email,active:1})),superAdmin:true})}
  if(b.kind==='workspace'||b.type==='workspace'){const doc=requireValue(s.workspaces[id]);versionCheck(b.version,doc.version);const data=workspaceSchema.parse(b.data);validateWorkspace(data,doc.data);doc.data=data;doc.version++;return json({ok:true,version:doc.version})}
  if(b.kind==='profile'||b.type==='profile'){const profile=requireValue(s.teachers.find(t=>t.id===id));versionCheck(b.version,profile.version);Object.assign(profile,publicProfileSchema.parse(b.data),{version:profile.version+1});return json({ok:true,version:profile.version})}
  if(b.kind==='article'||b.type==='article'){const article=requireValue(s.articles.find(x=>x.id===b.articleId));Object.assign(article,articleSchema.parse(b.data),{version:article.version+1});return json({ok:true,version:article.version})}
  return json(teacherDetail(s,id));
 }
 if(p==='/api/admin/accounts'){
  if(method==='GET')return json({accounts:s.accounts,superAdmin:true});
  if(method==='DELETE'){
   if(b.teacherId&&b.studentId){const doc=requireValue(s.workspaces[b.teacherId]);doc.data.students=doc.data.students.filter(x=>x.id!==b.studentId);for(const key of ['sessions','assessments','messages'] as const)doc.data[key]=doc.data[key].filter(x=>x.studentId!==b.studentId) as any;doc.version++;return json({ok:true})}
   s.accounts=s.accounts.filter(x=>x.id!==b.id);s.teachers=s.teachers.filter(x=>x.id!==b.id);delete s.workspaces[b.id];return json({ok:true});
  }
  if(b.action==='recovery'||b.action==='reset')return json({code:'d'.repeat(64)});
  const existing=s.accounts.find(x=>x.id===b.id);if(existing){Object.assign(existing,{name:b.name??existing.name,email:b.email??existing.email,phone:b.phone??existing.phone,active:b.active===undefined?existing.active:Number(b.active),role:b.role??existing.role,teacher_id:b.teacherId??existing.teacher_id,student_id:b.studentId??existing.student_id});return json({ok:true})}
  const key=b.teacherRecord||b.teacherId&&b.role==='teacher'&&b.teacherId||crypto.randomUUID();
  const added={id:key,username:String(b.username||'demo-user'),name:String(b.name||'کاربر نمونه'),email:String(b.email||'sample@example.com'),phone:String(b.phone||''),role:b.role||'teacher',active:1,teacher_id:b.teacherId||null,student_id:b.studentId||null,must_change:0};s.accounts.push(added);
  if(added.role==='teacher'&&!s.teachers.some(t=>t.id===key)){const profile={...clone(sampleTeachers[0]),id:key,name:added.name,published:false,version:1,sample:true};s.teachers.push(profile);const data=sampleWorkspace(today());data.profile={...data.profile,name:added.name,email:added.email,phone:added.phone};s.workspaces[key]={data,version:1}}
  return json({ok:true,id:key});
 }
 if(p==='/api/admin/finance'){
  const ownerId=b.ownerId||url.searchParams.get('ownerId');
  if(method==='PUT'){const policy=policies(s,ownerId);versionCheck(b.version,policy.version);s.policies[ownerId]={percent:Number(b.percent),students:b.students||{},sessions:b.sessions||{},version:policy.version+1}}
  return json({teachers:s.teachers.filter(t=>!ownerId||t.id===ownerId).map(t=>({id:t.id,name:t.name,policy:policies(s,t.id),students:s.workspaces[t.id]?.data.students||[],sessions:(s.workspaces[t.id]?.data.sessions||[]).map(x=>({...x,commissionPercent:(policies(s,t.id).sessions as any)[x.id]??(policies(s,t.id).students as any)[x.studentId]??policies(s,t.id).percent}))})});
 }
 if(p==='/api/admin/requests'){
  if(method==='PUT'){const item=requireValue(s.requests.find(x=>x.id===b.id));versionCheck(b.version,item.version);item.status=b.status??item.status;item.adminNote=b.adminNote??item.adminNote;item.version++;item.updatedAt=now();if(b.action==='forward'){item.teacherOwnerId=item.teacherId;item.forwardedAt=now()}return json({request:item,...item})}
  return json({requests:s.requests});
 }
 if(p==='/api/referrals'){
  if(method==='POST'){const item=requireValue(s.requests.find(x=>x.id===b.id));const doc=requireValue(s.workspaces[id]);const student={...clone(doc.data.students[0]||sampleWorkspace(today()).students[0]),id:crypto.randomUUID(),name:item.name,email:item.email,phone:item.phone,level:b.level||'A1',rate:item.rate||250000,currency:item.currency||'TOMAN',duration:item.duration||60,sourceInquiryId:item.id};doc.data.students.push(student);doc.version++;item.convertedStudentId=student.id;return json({ok:true,student})}
  return json({requests:s.requests.filter(x=>x.teacherOwnerId===id&&x.forwardedAt&&!x.convertedStudentId)});
 }
 if(p==='/api/student'){const doc=requireValue(s.workspaces[a?.teacher_id||s.teachers[0].id]);const st=requireValue(doc.data.students.find(x=>x.id===(a?.student_id||'elena')));return json({name:st.name,teacher:doc.data.profile.name,level:st.level,skills:st.skills,sessions:doc.data.sessions.filter(x=>x.studentId===st.id)})}
 if(p==='/api/messages'){
  const teacherId=b.teacherId||url.searchParams.get('teacherId')||a?.teacher_id||id,doc=requireValue(s.workspaces[teacherId]),studentId=b.studentId||url.searchParams.get('studentId')||(a?.role==='student'?a.student_id:null),role=a?.role||'teacher';
  if(!studentId)return json({conversations:doc.data.students.map(st=>({id:st.id,name:st.name,unread:s.messages.filter(m=>m.studentId===st.id&&!m.readAt&&m.sender==='student').length,available:true}))});
  const st=requireValue(doc.data.students.find(x=>x.id===studentId));
  if(method==='POST'){if(b.action==='send'&&!s.messages.some(m=>m.id===b.id))s.messages.push({id:b.id||crypto.randomUUID(),teacherId,studentId,text:String(b.text).slice(0,4000),sender:role==='student'?'student':'teacher',sentAt:now(),readAt:null});if(b.action==='read')for(const m of s.messages.filter(m=>m.studentId===studentId&&m.sender!==role))m.readAt=now();return json({ok:true,sentAt:now()})}
  return json({actorId:a?.id,role,teacherId,studentId,teacherName:doc.data.profile.name,studentName:st.name,available:true,hasMore:false,olderCursor:null,messages:s.messages.filter(m=>m.teacherId===teacherId&&m.studentId===studentId)});
 }
 if(p==='/api/admin/media')return json({photo:s.workspaces[id]?.data.profile.photo||'',video:s.videos[id]||null});
 return json({error:'این عملیات در نسخهٔ نمایشی محلی هنوز پشتیبانی نمی‌شود. / This operation is not available in the local demo.'},501);
 }catch(error:any){return json({error:error.issues?.[0]?.message||error.message||'خطا در اطلاعات نمونه.'},error.status||400)}
}
