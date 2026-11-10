import {requireRole} from '@/lib/server/access';
import StudentPanel from './student-panel';
export const dynamic='force-dynamic';
export default async function StudentPage(){await requireRole('student');return <StudentPanel/>}
