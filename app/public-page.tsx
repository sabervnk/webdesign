import {teachingOwner} from '@/lib/server/teacher-roles';
import {richPlain} from '@/lib/rich-text';
import {loadSiteCopy} from '@/lib/server/site-copy';
import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import PublicSite from './public-site';
import {publicCatalogue,articleSummary,articleView,profileView,type ArticleRow,type ProfileRow} from '@/lib/server/catalogue';
import {identity,siteOrigin} from '@/lib/server/access';
import {database} from '@/db/storage';
import {sampleTeachers,sampleArticles,type Catalogue} from '@/lib/catalogue';
export async function PublicPage({view,id}:{view:'home'|'teachers'|'teacher'|'blog'|'article'|'contact',id?:string}){
 let data:Catalogue;
 let videoUrl:string|undefined;
 try{
  const h=await headers();data=await publicCatalogue((await identity(new Request(siteOrigin,{headers:h})))?.isAdmin||false);
  const db=database();let teacherId=view==='teacher'?id:undefined;
  if(view==='article'&&id){
   const row=await db.prepare(`SELECT a.* FROM teacher_articles a INNER JOIN teacher_public_profiles p ON p.id=a.teacher_id WHERE a.id=? AND a.status='published' AND p.published=1 AND ${teachingOwner('p.owner_id')}`).bind(id).first<ArticleRow>();
   if(row){const full=articleView(row);teacherId=full.teacherId;data.articles=[full,...data.articles.filter(a=>a.id!==id)]}
  }
  // Detail URLs must resolve independently of the 500-item discovery listing.
  if(teacherId&&!data.teachers.some(t=>t.id===teacherId)){
   const row=await db.prepare(`SELECT * FROM teacher_public_profiles WHERE id=? AND published=1 AND ${teachingOwner('teacher_public_profiles.owner_id')}`).bind(teacherId).first<ProfileRow>();
   if(row)data.teachers=[profileView(row),...data.teachers];
  }
  if(view==='teacher'&&id&&data.teachers.some(t=>t.id===id)){
   const posts=await db.prepare(`SELECT id,owner_id,teacher_id,${articleSummary('data')} AS data,status,version,created_at,updated_at FROM teacher_articles WHERE teacher_id=? AND status='published' ORDER BY created_at DESC LIMIT 500`).bind(id).all<ArticleRow>();
   data.articles=posts.results.map(articleView);
   const video=await db.prepare(`SELECT v.object_key FROM teacher_public_profiles p JOIN teacher_videos v ON v.owner_id=p.owner_id WHERE p.id=? AND p.published=1 AND ${teachingOwner('p.owner_id')} AND v.visible=1`).bind(id).first<{object_key:string}>();
   if(video)videoUrl='/api/public-video/'+encodeURIComponent(id);
  }
 }catch(e){console.error('Public content unavailable',e);data={teachers:[],articles:[],isAdmin:false,error:'دریافت اطلاعات سایت ممکن نشد. لطفاً دوباره تلاش کنید. / Could not load site content.'}}
 if(!data.error&&view==='teacher'&&id&&!data.teachers.some(t=>t.id===id))notFound();
 if(!data.error&&view==='article'&&id&&!data.articles.some(t=>t.id===id))notFound();
 return <PublicSite view={view} initialCatalogue={data} recordId={id} videoUrl={videoUrl}/>;
}
export async function sectionMetadata(title:string,description:string){
 const {values}=await loadSiteCopy();
 return {title:title+' | '+(values['site.brand']?.fa??'Classer'),description};
}
export async function publicMetadata(kind:'teacher'|'article',id:string){
 const {values}=await loadSiteCopy();
 const brand=values['site.brand']?.fa??'Classer';
 try{
  const db=database();
  if(kind==='teacher'){
   const row=await db.prepare(`SELECT data FROM teacher_public_profiles WHERE id=? AND published=1 AND ${teachingOwner('teacher_public_profiles.owner_id')}`).bind(id).first<{data:string}>();
   if(row){const t=JSON.parse(row.data);return {title:t.name+' — '+t.headline+' | '+brand,description:richPlain(t.bio).slice(0,160),alternates:{canonical:siteOrigin+'/teachers/'+id}}}
  }else{
   const row=await db.prepare(`SELECT json_extract(a.data,'$.title') AS title,json_extract(a.data,'$.excerpt') AS excerpt FROM teacher_articles a INNER JOIN teacher_public_profiles p ON p.id=a.teacher_id WHERE a.id=? AND a.status='published' AND p.published=1 AND ${teachingOwner('p.owner_id')}`).bind(id).first<{title:string,excerpt:string}>();
   if(row)return {title:row.title+' | '+brand,description:richPlain(row.excerpt),alternates:{canonical:siteOrigin+'/blog/'+id}};
  }
 }catch{}
 return {title:'پیش‌نمایش | '+brand,robots:{index:false,follow:false}};
}
