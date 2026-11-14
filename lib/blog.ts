export const builtInCategories:Record<string,readonly [string,string]>={learning:['یادگیری زبان','Learning'],conversation:['مکالمه','Conversation'],exams:['آزمون‌ها','Exams'],culture:['فرهنگ و زبان','Culture']};
export const categoryLabel=(key:string,lang:string)=>builtInCategories[key]?.[lang==='fa'?0:1]??key;
export function safeLink(value:string){return /^https:\/\/[^\s<>]+$/i.test(value)||/^\/api\/blog-media\/[0-9a-f-]{36}$/.test(value)?value:undefined}
export function mediaReferences(article:{content:string;coverImage?:string;translations?:Record<string,{content?:string}|undefined>}){
 const text=[article.content,article.coverImage??'',...Object.values(article.translations??{}).map(x=>x?.content??'')].join('\n');
 return [...new Set([...text.matchAll(/\/api\/blog-media\/([0-9a-f-]{36})/g)].map(x=>x[1]))];
}
