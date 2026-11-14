import TeacherWorkspace from '../workspace';
import {requireRole} from '@/lib/server/access';
import {notFound,redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function WorkspacePage({params}:{params:Promise<{path:string[]}>}){const {path}=await params;if(path[0]==='settings'&&path.length===1)redirect('/studio?tab=account');if(!['students','schedule','finance','messages','studio','journal'].includes(path[0]))notFound();return <ProtectedWorkspace/>}
async function ProtectedWorkspace(){await requireRole('teacher');return <TeacherWorkspace/>}
