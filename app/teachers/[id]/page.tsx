import {PublicPage,publicMetadata} from '../../public-page';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{id:string}>}){return publicMetadata('teacher',(await params).id)}
export default async function Teacher({params}:{params:Promise<{id:string}>}){return <PublicPage view="teacher" id={(await params).id}/>}
