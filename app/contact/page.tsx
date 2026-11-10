import {PublicPage,sectionMetadata} from '../public-page';
export const dynamic='force-dynamic';
export const generateMetadata=()=>sectionMetadata('ارتباط با مدیریت','برای انتخاب معلم، هماهنگی کلاس یا همکاری آموزشی به مدیریت سایت پیام دهید.');
export default function Contact(){return <PublicPage view="contact"/>}
