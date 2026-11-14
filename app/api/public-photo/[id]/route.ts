import {teachingOwner} from '@/lib/server/teacher-roles';
import {avatarResponse} from '@/lib/server/avatar';
import {database} from '@/db/storage';
import {identity} from '@/lib/server/access';
export const dynamic='force-dynamic';
export async function GET(r:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;const row=await database().prepare("SELECT p.owner_id,p.published,json_extract(w.data,'$.profile.photo') AS photo FROM teacher_public_profiles p INNER JOIN teacher_workspaces w ON w.owner_id=p.owner_id WHERE p.id=?").bind(id).first<{owner_id:string,published:number,photo:string}>();if(!row||!row.photo||(!row.published&&(await identity(r))?.id!==row.owner_id))return new Response('Not found',{status:404});return await avatarResponse(row.owner_id)}catch{return new Response('Unavailable',{status:503})}}
