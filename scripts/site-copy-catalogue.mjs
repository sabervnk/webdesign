import {readFile,writeFile} from 'node:fs/promises';
import ts from 'typescript';
import {copyKey} from '../lib/site-copy.ts';
const sources={
 'app/public-site.tsx':'سایت عمومی','app/workspace.tsx':'فضای معلم','app/studio.tsx':'پرتفولیو و بلاگ',
 'components/profile-media.tsx':'تصویر و ویدئو','lib/catalogue.ts':'برچسب‌ها و دسته‌بندی‌ها',
};
const entries=new Map();
function add(fa,en,area){
 if(!fa.trim()||!en.trim()||fa.length>4000||en.length>4000||!/[\u0600-\u06ff]/.test(fa)||!/[a-z]/i.test(en))return;
 const key=copyKey(fa,en),old=entries.get(key);
 if(old&&(old.fa!==fa||old.en!==en))throw Error('Copy key collision: '+key);
 if(!old)entries.set(key,{key,fa,en,area});
}
const literal=n=>n&&(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))?n.text:undefined;
for(const [path,area] of Object.entries(sources)){
 const file=ts.createSourceFile(path,await readFile(path,'utf8'),ts.ScriptTarget.Latest,true);
 const walk=n=>{
  if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='t'&&n.arguments.length>=2){
   const a=literal(n.arguments[0]),b=literal(n.arguments[1]);if(a!==undefined&&b!==undefined)add(a,b,area);
  }
  if(ts.isArrayLiteralExpression(n)&&n.elements.length===2){const a=literal(n.elements[0]),b=literal(n.elements[1]);if(a!==undefined&&b!==undefined)add(a,b,area)}
  ts.forEachChild(n,walk);
 };
 walk(file);
}
const defaults=[
 {key:'site.brand',fa:'Classer',en:'Classer',area:'هویت و صفحهٔ اصلی',label:'نام سایت'},
 {key:'home.image',fa:'/images/learning-hero.webp',en:'/images/learning-hero.webp',area:'هویت و صفحهٔ اصلی',label:'نشانی تصویر بنر'},
 {key:'home.metaTitle',fa:'Classer — معلم زبان، همراه مسیر تو',en:'Classer — Find your language teacher',area:'هویت و صفحهٔ اصلی',label:'عنوان صفحه در مرورگر'},
 {key:'home.metaDescription',fa:'پرتفولیوی معلم‌های زبان را ببینید، هزینه کلاس آنلاین و حضوری را مقایسه کنید و نوشته‌های آموزشی معلم‌ها را بخوانید.',en:'Explore language teachers, compare class fees and read their articles.',area:'هویت و صفحهٔ اصلی',label:'توضیح صفحه برای موتور جست‌وجو'},
];
await writeFile('lib/site-copy-catalogue.json',JSON.stringify([...defaults,...entries.values()],null,2)+'\n');
