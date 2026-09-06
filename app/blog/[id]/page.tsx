import {PublicPage,publicMetadata} from '../../public-page';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{id:string}>}){return publicMetadata('article',(await params).id)}
export default async function Article({params}:{params:Promise<{id:string}>}){return <PublicPage view="article" id={(await params).id}/>}
