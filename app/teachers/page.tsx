import {PublicPage,sectionMetadata} from '../public-page';
export const dynamic='force-dynamic';
export const generateMetadata=()=>sectionMetadata('معلم‌های زبان — پرتفولیو و هزینه کلاس','انتخاب معلم زبان بر اساس زبان موردنظر، کلاس حضوری یا آنلاین، شهر و هزینه هر جلسه به تومان یا دلار.');
export default function Teachers(){return <PublicPage view="teachers"/>}
