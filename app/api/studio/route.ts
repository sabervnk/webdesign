import {ownStudio} from '@/lib/server/catalogue';
import {identity,json} from '@/lib/server/access';
export const dynamic='force-dynamic';
export async function GET(r:Request){const user=identity(r);if(!user)return json({error:'ابتدا وارد حساب شوید. / Sign in first.'},401);try{return json({...await ownStudio(user.id,''),isAdmin:user.isAdmin})}catch(e){console.error('Studio load failed',e);return json({error:'دریافت اطلاعات ممکن نشد. / Could not load studio.'},503)}}
