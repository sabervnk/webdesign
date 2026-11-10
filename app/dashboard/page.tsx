import TeacherWorkspace from '../workspace';
import {requireRole} from '@/lib/server/access';
export const dynamic='force-dynamic';
export default async function Dashboard(){await requireRole('teacher');return <TeacherWorkspace/>}
