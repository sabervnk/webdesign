/** Editorial navigation follows the order of the source pages, not alphabetical copy. */
type Entry={key:string;fa:string;en:string;area:string;label?:string};
type Boundary={start:string;page:string;section:string};

const boundaries:Boundary[]=[
 {start:'site.brand',page:'تنظیمات سایت',section:'هویت، تصویر و سئو'},
 {start:'cj54lo',page:'اجزای مشترک',section:'برچسب‌ها و منوی بالای سایت'},
 {start:'1yauk8b',page:'صفحهٔ اصلی',section:'معرفی و تصویر آغازین'},
 {start:'1k1686p',page:'صفحهٔ اصلی',section:'مراحل انتخاب معلم'},
 {start:'s0ehb9',page:'صفحهٔ اصلی',section:'معلم‌های پیشنهادی'},
 {start:'d58n1x',page:'صفحهٔ اصلی',section:'نوشته‌های معلم‌ها'},
 {start:'15u9tie',page:'صفحهٔ اصلی',section:'دعوت به تماس'},
 {start:'1g6v5c2',page:'صفحهٔ معلم‌ها',section:'معرفی صفحه'},
 {start:'g27qsn',page:'بلاگ عمومی',section:'معرفی بلاگ'},
 {start:'weixyl',page:'تماس با ما',section:'معرفی و راه‌های ارتباط'},
 {start:'k6lx2s',page:'اجزای مشترک',section:'پاورقی سایت'},
 {start:'nbdqg9',page:'صفحهٔ معلم‌ها',section:'جست‌وجو و فیلتر معلم'},
 {start:'12xkt4c',page:'صفحهٔ معلم',section:'معرفی و جزئیات معلم'},
 {start:'1pmfx40',page:'صفحهٔ معلم',section:'تحصیلات و دستاوردها'},
 {start:'1thy7mn',page:'صفحهٔ معلم',section:'مقاله‌ها و نوشته‌های معلم'},
 {start:'fh1y5h',page:'صفحهٔ معلم',section:'درخواست کلاس'},
 {start:'alixxh',page:'بلاگ عمومی',section:'فهرست و فیلتر مقاله‌ها'},
 {start:'spa4zd',page:'تماس با ما',section:'فرم درخواست و پیام'},
 {start:'1qfz60l',page:'فضای معلم',section:'ناوبری و برچسب‌ها'},
 {start:'1i2npcd',page:'فضای معلم',section:'معرفی فضای کار'},
 {start:'199fkv8',page:'فضای معلم',section:'پیشخوان'},
 {start:'1bt47gw',page:'فضای معلم',section:'زبان‌آموزان'},
 {start:'1b6f1ur',page:'فضای معلم',section:'برنامهٔ کلاس‌ها'},
 {start:'1rsiefs',page:'فضای معلم',section:'شهریه و تسویه'},
 {start:'1nblzyo',page:'فضای معلم',section:'ثبت دریافتی و گفتگو'},
 {start:'9px6r7',page:'فضای معلم',section:'حساب و تنظیمات'},
 {start:'1dz5n0o',page:'فضای معلم',section:'امنیت و دسترسی'},
 {start:'18fnq5b',page:'پروفایل و کلاس',section:'راهنمای تنظیم پروفایل'},
 {start:'1fhp469',page:'پروفایل و کلاس',section:'تنظیمات کلاس و تخصص'},
 {start:'9jgpk1',page:'پروفایل و کلاس',section:'پروفایل عمومی'},
 {start:'1xxt0fy',page:'بلاگ معلم',section:'نوشته‌ها و ویرایش مقاله'},
 {start:'kuqzsk',page:'بلاگ معلم',section:'درخواست‌ها و وضعیت‌ها'},
 {start:'1lms4m4',page:'رسانهٔ معلم',section:'عکس پروفایل و ویدئو'},
];
const pageOrder=['صفحهٔ اصلی','صفحهٔ معلم‌ها','صفحهٔ معلم','بلاگ عمومی','تماس با ما','پروفایل و کلاس','بلاگ معلم','رسانهٔ معلم','فضای معلم','اجزای مشترک','تنظیمات سایت'];
export type StructuredEntry={item:Entry;page:string;section:string;detail:boolean;order:number};
export function structureContent(catalogue:Entry[]){
 const positions=new Map(catalogue.map((item,i)=>[item.key,i]));
 const ranges=boundaries.map(b=>({...b,index:positions.get(b.start)??-1})).filter(b=>b.index>=0).sort((a,b)=>a.index-b.index);
 const entries:StructuredEntry[]=catalogue.map((item,index)=>{
  let group=ranges[0];for(const range of ranges){if(range.index>index)break;group=range}
  const page=item.area==='برچسب‌ها و دسته‌بندی‌ها'?'اجزای مشترک':item.area==='تصویر و ویدئو'?'رسانهٔ معلم':group?.page??'اجزای مشترک';
  const section=item.area==='برچسب‌ها و دسته‌بندی‌ها'?'نام زبان‌ها و دسته‌بندی‌ها':item.area==='تصویر و ویدئو'?'عکس پروفایل و ویدئو':group?.section??'سایر متن‌ها';
  // Short UI tokens remain editable in the detail view, while editorial content stays prominent.
  const detail=item.fa.trim().length<12&&!item.label&&!/[؟.!،:]/.test(item.fa);
  return {item,page,section,detail,order:index};
 });
 const pages=pageOrder.filter(page=>entries.some(x=>x.page===page));
 const sections=(page:string)=>[...new Set(entries.filter(x=>x.page===page).map(x=>x.section))];
 return {entries,pages,sections};
}
