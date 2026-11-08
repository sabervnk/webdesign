import TeacherWorkspace from '../workspace';
import {requireChatGPTUser} from '../chatgpt-auth';
import {isAdministrator} from '@/lib/server/access';
import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function WorkspacePage({params}:{params:Promise<{path:string[]}>}){const {path}=await params;if(!['students','schedule','finance','messages','settings','studio','admin'].includes(path[0]))notFound();return <ProtectedWorkspace path={path}/>}
async function ProtectedWorkspace({path}:{path:string[]}){const user=await requireChatGPTUser('/'+path.map(encodeURIComponent).join('/'));if(path[0]==='admin'&&!isAdministrator(user.email))notFound();return <TeacherWorkspace/>}
