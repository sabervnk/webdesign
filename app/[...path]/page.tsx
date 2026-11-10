import TeacherWorkspace from '../workspace';
import {requireChatGPTUser} from '../chatgpt-auth';
import {isAdministrator} from '@/lib/server/access';
import {notFound,redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function WorkspacePage({params}:{params:Promise<{path:string[]}>}){const {path}=await params;if(path[0]==='settings'&&path.length===1)redirect('/studio?tab=account');if(!['students','schedule','finance','messages','studio','admin'].includes(path[0]))notFound();return <ProtectedWorkspace path={path}/>}
async function ProtectedWorkspace({path}:{path:string[]}){const user=await requireChatGPTUser('/'+path.map(encodeURIComponent).join('/'));if(path[0]==='admin'&&!isAdministrator(user.email))notFound();return <TeacherWorkspace/>}
