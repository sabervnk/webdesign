import {database} from '@/db/storage';
import {mediaReferences} from '@/lib/blog';
import {RequestError} from './http';
export async function ownedArticleMedia(owner:string,article:Parameters<typeof mediaReferences>[0]){
 const ids=mediaReferences(article);if(ids.length>100)throw new RequestError('حداکثر ۱۰۰ رسانه برای هر نوشته مجاز است.',400);
 for(const id of ids)if(!await database().prepare('SELECT id FROM classer_blog_media WHERE id=? AND owner_id=?').bind(id,owner).first())throw new RequestError('رسانهٔ نوشته متعلق به این معلم نیست یا حذف شده است.',400);
 return ids;
}
