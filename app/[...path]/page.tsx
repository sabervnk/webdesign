import TeacherWorkspace from '../workspace';
import {requireChatGPTUser} from '../chatgpt-auth';
import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function WorkspacePage({params}:{params:Promise<{path:string[]}>}){const {path}=await params;if(!['students','schedule','finance','messages','settings','studio','admin'].includes(path[0]))notFound();return <ProtectedWorkspace path={path}/>}
async function ProtectedWorkspace({path}:{path:string[]}){await requireChatGPTUser('/'+path.map(encodeURIComponent).join('/'));return <TeacherWorkspace/>}
