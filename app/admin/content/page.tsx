import {requireRole} from '@/lib/server/access';
import {ContentWorkbench} from '@/components/content-workbench';
export const dynamic='force-dynamic';
export const metadata={title:'استودیوی محتوای Classer',robots:{index:false,follow:false}};
export default async function ContentStudio(){await requireRole('admin');return <main><ContentWorkbench/></main>}
