import TeacherWorkspace from '../workspace';
import {requireChatGPTUser} from '../chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Dashboard(){await requireChatGPTUser('/dashboard');return <TeacherWorkspace/>}
