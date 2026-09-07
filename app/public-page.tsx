import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import PublicSite from './public-site';
import {publicCatalogue,articleView,type ArticleRow} from '@/lib/server/catalogue';
import {identity,siteOrigin} from '@/lib/server/access';
import {database} from '@/db/storage';
import {sampleTeachers,sampleArticles,type Catalogue} from '@/lib/catalogue';
export async function PublicPage({view,id}:{view:'home'|'teachers'|'teacher'|'blog'|'article'|'contact',id?:string}){let data:Catalogue;try{const h=await headers();data=await publicCatalogue(identity(new Request(siteOrigin,{headers:h}))?.isAdmin||false);if(view==='article'&&id){const row=await database().prepare("SELECT a.* FROM teacher_articles a INNER JOIN teacher_public_profiles p ON p.id=a.teacher_id WHERE a.id=? AND a.status='published' AND p.published=1").bind(id).first<ArticleRow>();if(row){const full=articleView(row);data.articles=[full,...data.articles.filter(a=>a.id!==id)]}}}catch(e){console.error('Public content unavailable',e);data={teachers:[],articles:[],isAdmin:false,error:'دریافت اطلاعات سایت ممکن نشد. لطفاً دوباره تلاش کنید. / Could not load site content.'}}if(!data.error&&view==='teacher'&&id&&!data.teachers.some(t=>t.id===id)&&!(data.teachers.length===0&&sampleTeachers.some(t=>t.id===id)))notFound();if(!data.error&&view==='article'&&id&&!data.articles.some(t=>t.id===id)&&!(data.teachers.length===0&&sampleArticles.some(t=>t.id===id)))notFound();return <PublicSite view={view} initialCatalogue={data} recordId={id}/>}
export async function publicMetadata(kind:'teacher'|'article',id:string){
 try{
  const db=database();
  if(kind==='teacher'){
   const row=await db.prepare('SELECT data FROM teacher_public_profiles WHERE id=? AND published=1').bind(id).first<{data:string}>();
   if(row){const t=JSON.parse(row.data);return {title:t.name+' — '+t.headline+' | MissMahta',description:t.bio.slice(0,160),alternates:{canonical:siteOrigin+'/teachers/'+id}}}
  }else{
   const row=await db.prepare("SELECT json_extract(a.data,'$.title') AS title,json_extract(a.data,'$.excerpt') AS excerpt FROM teacher_articles a INNER JOIN teacher_public_profiles p ON p.id=a.teacher_id WHERE a.id=? AND a.status='published' AND p.published=1").bind(id).first<{title:string,excerpt:string}>();
   if(row)return {title:row.title+' | MissMahta',description:row.excerpt,alternates:{canonical:siteOrigin+'/blog/'+id}};
  }
 }catch{}
 return {title:'پیش‌نمایش | MissMahta',robots:{index:false,follow:false}};
}
