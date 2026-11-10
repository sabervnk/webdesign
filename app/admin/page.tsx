import {requireRole} from '@/lib/server/access';
import AdminPanel from './panel';
export const dynamic='force-dynamic';
export const metadata={title:'پنل مدیریت | Classer',robots:{index:false,follow:false}};
export default async function Admin(){const u=await requireRole('admin');return <AdminPanel local={u.local} me={u.id}/>}
