import {z} from 'zod';
import {validMoney,type Currency} from './model.ts';
export const languageCodes=['en','fr','de','es','tr','ar','fa','it'] as const;
export const languages={en:['انگلیسی','English'],fr:['فرانسوی','French'],de:['آلمانی','German'],es:['اسپانیایی','Spanish'],tr:['ترکی','Turkish'],ar:['عربی','Arabic'],fa:['فارسی','Persian'],it:['ایتالیایی','Italian']} as const;
export const articleCategories={learning:['یادگیری زبان','Learning'],conversation:['مکالمه','Conversation'],exams:['آزمون‌ها','Exams'],culture:['فرهنگ و زبان','Culture']} as const;
export const educationLevels={middle:['سیکل','Lower secondary'],diploma:['دیپلم','High school diploma'],associate:['کاردانی','Associate degree'],bachelor:['کارشناسی','Bachelor’s degree'],master:['کارشناسی ارشد','Master’s degree'],doctorate:['دکترا','Doctorate'],none:['بدون مدرک','No qualification']} as const;
const educationCodes=['middle','diploma','associate','bachelor','master','doctorate','none',''] as const;
export const PROFILE_ITEMS_MAX=30;
const profileItems=z.array(z.string().trim().max(2000)).max(PROFILE_ITEMS_MAX).transform(items=>items.filter(Boolean)).optional();
const languageSchema=z.enum(languageCodes);
const formatSchema=z.enum(['online','in-person']);
export const classOfferSchema=z.object({id:z.string().regex(/^[a-zA-Z0-9:_-]{1,100}$/).optional(),title:z.string().trim().max(100).optional(),language:languageSchema,format:formatSchema,rate:z.number().min(0).max(100000000),duration:z.number().int().min(15).max(300).optional(),currency:z.enum(['TOMAN','USD'])}).refine(p=>validMoney(p.rate,p.currency),{message:'مبلغ هر کلاس را بررسی کنید. / Check the fee for each class.'});
export type ClassOffer=z.infer<typeof classOfferSchema>;
export type DisplayOffer=ClassOffer&{duration:number};
const profileTranslation=z.object({name:z.string().trim().max(100).optional(),headline:z.string().trim().max(150).optional(),bio:z.string().trim().max(5000).optional(),city:z.string().trim().max(100).optional(),educationField:z.string().trim().max(2000).optional(),certificateItems:profileItems,specialtyItems:profileItems});
export type ProfileTranslation=z.infer<typeof profileTranslation>;
const articleTranslation=z.object({title:z.string().trim().max(180).optional(),excerpt:z.string().trim().max(350).optional(),content:z.string().trim().max(50000).optional()});
export type ArticleTranslation=z.infer<typeof articleTranslation>;
export type ContentLocale=typeof languageCodes[number];
export const publicProfileSchema=z.object({name:z.string().trim().min(2).max(100),gender:z.enum(['man','woman','other','unspecified']).optional(),headline:z.string().trim().max(150),bio:z.string().trim().max(5000),languages:z.array(z.enum(languageCodes)).min(1).max(8),formats:z.array(z.enum(['online','in-person'])).min(1).max(2),city:z.string().trim().max(100),experience:z.number().int().min(0).max(70),education:z.string().trim().max(2000),certificates:z.string().trim().max(2000),specialties:z.string().trim().max(600),educationLevel:z.enum(educationCodes).optional(),educationField:z.string().trim().max(2000).optional(),certificateItems:profileItems,specialtyItems:profileItems,offers:z.array(classOfferSchema).max(64).optional(),contentLocale:languageSchema.optional(),translations:z.partialRecord(languageSchema,profileTranslation).optional(),rate:z.number().min(0).max(100000000),currency:z.enum(['TOMAN','USD']),duration:z.number().int().min(15).max(300),published:z.boolean()}).superRefine((p,c)=>{
 if(new Set(p.languages).size!==p.languages.length||new Set(p.formats).size!==p.formats.length)c.addIssue({code:'custom',path:['offers'],message:'زبان یا نوع کلاس تکراری است. / Duplicate language or class format.'});
 if(p.offers){
  const combinations=new Set<string>(),offeredLanguages=new Set<string>(),offeredFormats=new Set<string>();
  for(const [index,offer] of p.offers.entries()){
   const key=offer.id??('legacy-'+index);
   if(!p.languages.includes(offer.language)||!p.formats.includes(offer.format)||combinations.has(key))c.addIssue({code:'custom',path:['offers'],message:'ترکیب نرخ کلاس نامعتبر یا تکراری است. / Invalid or duplicate class rate.'});
   combinations.add(key);offeredLanguages.add(offer.language);offeredFormats.add(offer.format);
  }
  if(p.languages.some(l=>!offeredLanguages.has(l))||p.formats.some(f=>!offeredFormats.has(f)))c.addIssue({code:'custom',path:['offers'],message:'برای هر زبان حداقل یک نوع کلاس و نرخ مشخص کنید. / Set at least one class format and fee per language.'});
 }
 if(!validMoney(p.rate,p.currency))c.addIssue({code:'custom',path:['rate'],message:'مبلغ معتبر وارد کنید؛ دلار حداکثر دو رقم اعشار دارد. / Invalid amount.'});if(p.published&&(!p.headline||p.bio.length<40))c.addIssue({code:'custom',message:'برای نمایش پرتفولیو، عنوان و معرفی حداقل ۴۰ کاراکتری وارد کنید. / Add a headline and a bio of at least 40 characters.'});if(p.formats.includes('in-person')&&!p.city)c.addIssue({code:'custom',path:['city'],message:'برای کلاس حضوری شهر را مشخص کنید. / Enter a city for in-person classes.'})});
export type PublicProfileInput=z.infer<typeof publicProfileSchema>;
export type Teacher=PublicProfileInput&{id:string,photo:string,updatedAt:string,version:number,sample?:boolean;directoryOnly?:boolean};
export const articleSchema=z.object({title:z.string().trim().min(3).max(180),excerpt:z.string().trim().max(350),content:z.string().trim().max(50000),category:z.string().trim().min(1).max(60),status:z.enum(['draft','published','archived','trash']),archivedFrom:z.enum(['draft','published']).optional(),coverImage:z.string().regex(/^$|^\/api\/blog-media\/[0-9a-f-]{36}$/).default(''),coverAlt:z.string().max(200).default(''),tags:z.array(z.string().trim().max(40)).max(12).default([]),mediaIds:z.array(z.string().uuid()).max(100).default([]),contentLocale:languageSchema.optional(),translations:z.partialRecord(languageSchema,articleTranslation).optional()}).superRefine((p,c)=>{if(p.status==='published'&&p.content.length<150)c.addIssue({code:'custom',message:'برای انتشار، متن مقاله باید حداقل ۱۵۰ کاراکتر باشد. / Add at least 150 characters to publish.'})});
type ParsedArticle=z.infer<typeof articleSchema>;
export type ArticleInput=Omit<ParsedArticle,'coverImage'|'coverAlt'|'tags'|'mediaIds'>&Partial<Pick<ParsedArticle,'coverImage'|'coverAlt'|'tags'|'mediaIds'>>;
export type Article=ArticleInput&{id:string,teacherId:string,createdAt:string,updatedAt:string,version:number,readingMinutes?:number,sample?:boolean};
export const inquirySchema=z.object({id:z.string().uuid(),kind:z.enum(['class','contact']),teacherId:z.string().max(100).default(''),teacherVersion:z.number().int().positive().optional(),offerId:z.string().max(100).default(''),name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(200),phone:z.string().trim().max(30).default('').transform(v=>v.replace(/[۰-۹٠-٩]/g,d=>String(d.charCodeAt(0)-(d>='۰'?1776:1632))).replace(/[\s()-]/g,'')),language:z.string().max(10).default(''),format:z.enum(['online','in-person','']).default(''),message:z.string().trim().min(5).max(4000),website:z.string().max(100).default('')}).superRefine((p,c)=>{if(p.kind==='class'&&!/^\+?\d{8,15}$/.test(p.phone))c.addIssue({code:'custom',path:['phone'],message:'شماره تماس معتبر برای درخواست کلاس الزامی است. / A valid phone number is required.'})});
export type InquiryInput=z.infer<typeof inquirySchema>;
export type Inquiry=Omit<InquiryInput,'website'>&{teacherName:string,offerTitle?:string,rate:number|null,currency:Currency|null,duration:number|null,status:'new'|'reviewing'|'closed',adminNote:string,notes?:{id:string;text:string;at:string;author:string;dateUnknown?:boolean}[],teacherOwnerId?:string,forwardedAt?:string,convertedStudentId?:string,commissionPercent?:number,events?:{id:string;type:string;at:string;author:string}[],createdAt:string,updatedAt:string,version:number};
export type Catalogue={teachers:Teacher[],articles:Article[],isAdmin:boolean,error?:string};
export function initialPublicProfile(name=''):PublicProfileInput{return {name,headline:'',bio:'',languages:['en'],formats:['online'],city:'',experience:0,education:'',certificates:'',specialties:'',rate:250000,currency:'TOMAN',duration:60,published:false}}
export function portfolioItems(p:PublicProfileInput,type:'certificates'|'specialties'){
 const list=type==='certificates'?p.certificateItems:p.specialtyItems;
 if(list)return list;
 const old=p[type].split(type==='certificates'?/\r?\n/:/[,،\n]/).map(x=>x.trim()).filter(Boolean);
 return old.length<=PROFILE_ITEMS_MAX?old:[...old.slice(0,PROFILE_ITEMS_MAX-1),old.slice(PROFILE_ITEMS_MAX-1).join(type==='certificates'?'\n':'، ')];
}
export function portfolioEducation(p:PublicProfileInput){
 return {level:p.educationLevel||undefined,field:(p.educationField??p.education).trim()};
}
type OfferFilters={language?:string,format?:string,currency?:string,maxPrice?:string};
export function classOffers(p:PublicProfileInput,filters:OfferFilters={}):DisplayOffer[]{
 const rows:DisplayOffer[]=p.offers?p.offers.map((o,index)=>({...o,id:o.id??('legacy-'+o.language+'-'+o.format+'-'+index),duration:o.duration??p.duration})):p.languages.flatMap(language=>p.formats.map(format=>({id:'legacy-'+language+'-'+format,language,format,rate:p.rate,currency:p.currency,duration:p.duration})));
 return rows.filter(o=>p.languages.includes(o.language)&&p.formats.includes(o.format)&&(!filters.language||filters.language==='all'||o.language===filters.language)&&(!filters.format||filters.format==='all'||o.format===filters.format)&&(!filters.currency||filters.currency==='all'||o.currency===filters.currency)&&(!filters.maxPrice||!filters.currency||filters.currency==='all'||o.rate<=Number(filters.maxPrice)));
}
export function offerFor(p:PublicProfileInput,language:string,format:string,id?:string):DisplayOffer|undefined{
 const rows=classOffers(p,{language,format}).filter(o=>o.language===language&&o.format===format);
 return id?rows.find(o=>o.id===id):rows.length===1?rows[0]:undefined;
}
export function matchesTeacher(t:Teacher,filters:OfferFilters&{query?:string,city?:string}){
 const q=(filters.query||'').trim().toLowerCase();
 return (t.directoryOnly?(!q||t.name.toLowerCase().includes(q))&&(!filters.language||filters.language==='all')&&(!filters.format||filters.format==='all')&&(!filters.currency||filters.currency==='all')&&!filters.city:(!q||(t.name+' '+t.headline+' '+portfolioItems(t,'specialties').join(' ')).toLowerCase().includes(q))&&classOffers(t,filters).length>0&&(!filters.city||t.city.toLowerCase().includes(filters.city.toLowerCase())));
}
const localeKey=(locale:string)=>locale.toLowerCase().split(/[-_]/)[0] as ContentLocale;
export function localizeTeacher<T extends PublicProfileInput>(p:T,locale:string):T{
 const key=localeKey(locale),tr=p.translations?.[key];
 if(!tr||key===(p.contentLocale??'fa'))return p;
 return {...p,name:tr.name||p.name,headline:tr.headline||p.headline,bio:tr.bio||p.bio,city:tr.city||p.city,educationField:tr.educationField||p.educationField,certificateItems:tr.certificateItems?.length?tr.certificateItems:p.certificateItems,specialtyItems:tr.specialtyItems?.length?tr.specialtyItems:p.specialtyItems};
}
export type PortfolioIdentity=Partial<Record<'fa'|'en',{name?:string,headline?:string}>>;
export function portfolioIdentity(profile:Pick<PublicProfileInput,'name'|'headline'|'translations'|'contentLocale'>):PortfolioIdentity{
 const entry=(locale:'fa'|'en')=>locale===(profile.contentLocale??'fa')?{name:profile.name,headline:profile.headline}:{name:profile.translations?.[locale]?.name,headline:profile.translations?.[locale]?.headline};
 return {fa:entry('fa'),en:entry('en')};
}
export function localizeArticle<T extends ArticleInput>(a:T,locale:string):T{
 const key=localeKey(locale),tr=a.translations?.[key];
 if(!tr||key===(a.contentLocale??'fa'))return a;
 return {...a,title:tr.title||a.title,excerpt:tr.excerpt||a.excerpt,content:tr.content||a.content};
}
export const sampleTeachers:Teacher[]=[
 {...initialPublicProfile('سارا مهر'),id:'sample-sara',headline:'مکالمه‌ای که از زندگی شروع می‌شود',bio:'این یک پرتفولیوی نمونه برای نمایش امکانات سایت است. در معرفی واقعی می‌توانید روش تدریس، هدف‌های آموزشی و تجربه خود را توضیح دهید. کلاس‌ها می‌توانند با توجه به سطح و نیاز هر زبان‌آموز برنامه‌ریزی شوند.',languages:['en'],formats:['online','in-person'],city:'تهران',experience:6,education:'محل درج تحصیلات معلم',certificates:'محل درج گواهی‌های واقعی',specialties:'مکالمه روزمره، انگلیسی سفر',rate:450000,currency:'TOMAN',duration:60,published:true,photo:'',updatedAt:'2026-09-05T08:00:00Z',version:1,sample:true},
 {...initialPublicProfile('آرمان راد'),id:'sample-arman',headline:'قدم‌به‌قدم تا گفت‌وگوی آلمانی',bio:'این پروفایل نمونه است و معلم واقعی معرفی نمی‌کند. معلم می‌تواند در این بخش درباره ساختار کلاس، تمرین‌های پیشنهادی و شیوه بازخورد خود بنویسد. اطلاعات واقعی پس از ثبت و انتشار جایگزین می‌شوند.',languages:['de','en'],formats:['online'],city:'',experience:4,education:'محل درج تحصیلات معلم',certificates:'محل درج گواهی‌های واقعی',specialties:'آلمانی مقدماتی، آمادگی مکالمه',rate:22.5,currency:'USD',duration:60,published:true,photo:'',updatedAt:'2026-09-05T08:00:00Z',version:1,sample:true},
 {...initialPublicProfile('لیلا نوید'),id:'sample-leila',headline:'فرانسه را از واژه‌ها فراتر ببرید',bio:'این یک معرفی نمونه برای پیش‌نمایش پرتفولیوی معلم است. در صفحه واقعی، زبان‌آموز می‌تواند زبان‌ها، هزینه هر جلسه، شهر کلاس حضوری و نوشته‌های آموزشی معلم را ببیند و درخواستش را برای مدیریت ارسال کند.',languages:['fr'],formats:['online','in-person'],city:'اصفهان',experience:5,education:'محل درج تحصیلات معلم',certificates:'محل درج گواهی‌های واقعی',specialties:'فرانسوی روزمره، تلفظ',rate:390000,currency:'TOMAN',duration:45,published:true,photo:'',updatedAt:'2026-09-05T08:00:00Z',version:1,sample:true}
];
export const sampleArticles:Article[]=[
 {id:'sample-small-steps',teacherId:'sample-sara',title:'هر روز کمی زبان؛ چطور یک عادت ماندگار بسازیم؟',excerpt:'قرار نیست هر روز یک فصل کتاب بخوانید. گاهی یک گفت‌وگوی کوتاه، شروع بهتری است.',content:'برای ساختن عادت یادگیری، فعالیتی را انتخاب کنید که در یک روز شلوغ هم بتوانید انجامش دهید. مثلاً چند جمله درباره روزتان بنویسید یا یک فایل صوتی کوتاه را گوش کنید.\n\n## یک موقعیت واقعی انتخاب کنید\nبه چیزی فکر کنید که دوست دارید به زبان جدید بگویید: سفارش غذا، معرفی خودتان یا توضیح یک علاقه شخصی. چند عبارت کاربردی برای همان موقعیت جمع کنید و با صدای بلند تمرین کنید.\n\n## تمرین کوچک را قابل تکرار کنید\nتمرین را به یکی از کارهای روزمره وصل کنید. بعد از صبحانه یا پیش از رفتن به محل کار، چند دقیقه برای مرور عبارت‌های دیروز کنار بگذارید. زمان کوتاه و مشخص، برنامه را قابل اجرا می‌کند.\n\n## از معلم بازخورد بگیرید\nنمونه‌ای از تمرینتان را به کلاس ببرید. معلم می‌تواند به شما کمک کند خطاهای تکراری را پیدا کنید و برای مرحله بعد هدفی متناسب با سطح خودتان بگذارید.',category:'learning',status:'published',createdAt:'2026-09-05T08:00:00Z',updatedAt:'2026-09-05T08:00:00Z',version:1,sample:true},
 {id:'sample-speaking',teacherId:'sample-arman',title:'قبل از اولین کلاس مکالمه، این سه سؤال را از خودتان بپرسید',excerpt:'هدفتان از یادگیری، موقعیت‌های موردنیاز و زمان تمرین را روشن کنید.',content:'شروع یک کلاس جدید فرصت خوبی برای مشخص کردن انتظارات است. لازم نیست همه پاسخ‌ها را از قبل بدانید؛ همین که درباره نیازهایتان فکر کنید، گفت‌وگوی اول با معلم مفیدتر می‌شود.\n\n## برای چه موقعیتی زبان می‌خواهید؟\nکار، سفر، تحصیل یا گفت‌وگو با دوستان؟ یک یا دو موقعیت را مشخص کنید تا بتوانید از معلم درباره محتوای مناسب آن‌ها بپرسید.\n\n## کجا بیشتر مکث می‌کنید؟\nآیا پیدا کردن واژه‌ها سخت است یا شنیدن پاسخ طرف مقابل؟ نمونه‌ای واقعی از تجربه خودتان آماده کنید و با معلم در میان بگذارید.\n\n## چه زمانی برای تمرین دارید؟\nیک برنامه واقع‌بینانه با زمان‌های کوتاه بهتر از برنامه‌ای است که نتوانید ادامه‌اش دهید. درباره تمرین بین جلسات و نوع بازخورد با معلم توافق کنید.',category:'conversation',status:'published',createdAt:'2026-09-04T08:00:00Z',updatedAt:'2026-09-04T08:00:00Z',version:1,sample:true},
 {id:'sample-online-class',teacherId:'sample-leila',title:'کلاس آنلاین یا حضوری؛ کدام با زندگی شما سازگارتر است؟',excerpt:'به مسیر رفت‌وآمد، فضای تمرین و شیوه ارتباطی موردعلاقه‌تان نگاه کنید.',content:'انتخاب کلاس آنلاین یا حضوری به برنامه روزانه و ترجیح یادگیری شما بستگی دارد. پیش از انتخاب، به این فکر کنید که در چه شرایطی راحت‌تر تمرکز می‌کنید.\n\n## فضای یادگیری را بررسی کنید\nبرای کلاس آنلاین به فضایی آرام و ارتباط اینترنتی مناسب نیاز دارید. برای کلاس حضوری، زمان و هزینه رفت‌وآمد را در برنامه خود حساب کنید.\n\n## درباره شیوه کلاس بپرسید\nاز معلم بپرسید تمرین‌ها چطور انجام می‌شوند، بازخورد به چه صورت است و چه منابعی برای بین جلسات پیشنهاد می‌کند. شیوه تدریس به اندازه قالب کلاس اهمیت دارد.\n\n## هزینه هر جلسه را در کنار مدت آن ببینید\nمدت کلاس‌ها ممکن است متفاوت باشد. برای مقایسه، هم مدت جلسه و هم واحد پول را بررسی کنید و جزئیات نهایی را با مدیریت هماهنگ کنید.',category:'learning',status:'published',createdAt:'2026-09-03T08:00:00Z',updatedAt:'2026-09-03T08:00:00Z',version:1,sample:true}
];
