import {publicCatalogue} from '@/lib/server/catalogue';
import {identity,json} from '@/lib/server/access';
export const dynamic='force-dynamic';
export async function GET(r:Request){try{return json(await publicCatalogue(identity(r)?.isAdmin))}catch(e){console.error('Catalogue load failed',e);return json({error:'دریافت فهرست ممکن نشد. دوباره تلاش کنید. / Catalogue unavailable.'},503)}}
