import {PublicPage,sectionMetadata} from '../public-page';
export const dynamic='force-dynamic';
export const generateMetadata=()=>sectionMetadata('بلاگ معلم‌ها — تمرین و یادگیری زبان','نوشته‌های آموزشی، تجربه‌ها و تمرین‌های معلم‌های زبان را در بلاگ اختصاصی آن‌ها بخوانید.');
export default function Blog(){return <PublicPage view="blog"/>}
