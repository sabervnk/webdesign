export const translationLocales=['fa','en','ar','fr','de','es','tr','it'] as const;
export const hasPersianText=(text:string)=>/(?=[\u0600-\u06ff])\p{L}/u.test(text);
export function translationChunks(text:string,maxBytes=480){const chunks:string[]=[];let current='';for(const part of text.split(/(\s+)/)){if(new TextEncoder().encode(current+part).length>maxBytes&&current){chunks.push(current);current=''}if(new TextEncoder().encode(part).length>maxBytes){for(const ch of part){if(new TextEncoder().encode(current+ch).length>maxBytes){chunks.push(current);current=''}current+=ch}}else current+=part}if(current)chunks.push(current);return chunks}
export function preferredTranslation(original:string,manual:string|undefined,automatic:string|undefined){return manual?.trim()?manual:automatic?.trim()?automatic:original}
export function decodeTranslation(text:string){return text.replace(/&(?:amp|quot|apos|lt|gt|#39|#x27);/g,x=>({'&amp;':'&','&quot;':'"','&apos;':"'",'&#39;':"'",'&#x27;':"'",'&lt;':'<','&gt;':'>'}[x]??x))}
export async function translateSegment(text:string,target:string,fetcher:typeof fetch=fetch){
 if(target==='fa'||!text.trim())return text;
 const url=new URL('https://api.mymemory.translated.net/get');url.searchParams.set('q',text);url.searchParams.set('langpair','fa|'+target);
 const r=await fetcher(url,{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Translation provider unavailable.');
 const data=await r.json() as {responseStatus:number;quotaFinished?:boolean;responseData?:{translatedText?:string}};
 if(data.responseStatus!==200||data.quotaFinished||!data.responseData?.translatedText)throw Error('Translation quota or provider unavailable.');
 return (text.match(/^\s*/)?.[0]??'')+decodeTranslation(data.responseData.translatedText).trim()+(text.match(/\s*$/)?.[0]??'');
}
