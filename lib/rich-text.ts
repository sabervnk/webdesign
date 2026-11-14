import {safeLink} from './blog.ts';
export type MediaValue={src:string;caption:string};
export type RichOp={insert:string|Record<string,MediaValue>;attributes?:Record<string,unknown>};
function inline(text:string):RichOp[]{return text.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean).flatMap(part=>{
 if(part.startsWith('***'))return {insert:part.slice(3,-3),attributes:{bold:true,italic:true}};
 if(part.startsWith('**'))return {insert:part.slice(2,-2),attributes:{bold:true}};
 if(part.startsWith('*'))return {insert:part.slice(1,-1),attributes:{italic:true}};
 const link=/^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);return link?inline(link[1]).map(op=>({...op,attributes:{...op.attributes,...(safeLink(link[2])?{link:link[2]}:{})}})):{insert:part};
})}
export function richDelta(text:string):{ops:RichOp[]}{
 const ops:RichOp[]=[];for(const block of text.split(/\n\s*\n/).filter(Boolean)){
 const media=/^(!|@)\[([^\]]*)\]\(([^)]+)\)$/.exec(block.trim());
 if(media){if(safeLink(media[3]))ops.push({insert:{[media[1]==='!'?'lessonImage':'lessonVideo']:{src:media[3],caption:media[2]}}},{insert:'\n'});continue}
 for(const line of block.split('\n')){let content=line,attributes:Record<string,unknown>|undefined;
 if(/^#{1,3} /.test(line)){attributes={header:2};content=line.replace(/^#+ /,'')}
 else if(/^[-*] /.test(line)){attributes={list:'bullet'};content=line.slice(2)}
 else if(/^\d+\. /.test(line)){attributes={list:'ordered'};content=line.replace(/^\d+\. /,'')}
 else if(line.startsWith('> ')){attributes={blockquote:true};content=line.slice(2)}
 ops.push(...inline(content),{insert:'\n',...(attributes?{attributes}:{})});
 }}if(!ops.length)ops.push({insert:'\n'});return {ops};
}
export function richStorage(delta:{ops?:RichOp[]}):string{
 const lines:{text:string;kind:string}[]=[];let line='',ordered=0;
 const finish=(a:Record<string,unknown>={})=>{let text=line,kind='paragraph';if(a.header){text='## '+text;kind='heading'}else if(a.list){kind=String(a.list);ordered=kind==='ordered'?ordered+1:0;text=(kind==='ordered'?ordered+'. ':'- ')+text}else{ordered=0;if(a.blockquote){text='> '+text;kind='quote'}}lines.push({text,kind});line=''};
 for(const op of delta.ops??[]){const a=op.attributes??{};if(typeof op.insert!=='string'){if(line)finish();for(const [kind,value] of Object.entries(op.insert??{})){if(!['lessonImage','lessonVideo'].includes(kind)||!value||!safeLink(value.src))continue;lines.push({text:(kind==='lessonImage'?'!':'@')+'['+(value.caption??'').replaceAll(']','')+']('+value.src+')',kind:'media'})}continue}
 const chunks=op.insert.split('\n');for(let i=0;i<chunks.length;i++){let text=chunks[i];if(text){if(a.italic)text='*'+text+'*';if(a.bold)text='**'+text+'**';if(typeof a.link==='string'&&safeLink(a.link))text='['+text+']('+a.link+')';line+=text}if(i<chunks.length-1)finish(a)}
 }if(line)finish();let result='';for(let i=0;i<lines.length;i++){const previous=lines[i-1],current=lines[i];if(!current.text.trim())continue;const tight=previous&&previous.kind===current.kind&&['bullet','ordered','quote'].includes(current.kind);result+=(result?(tight?'\n':'\n\n'):'')+current.text}return result.trim();
}
export function richPlain(text:string){return richDelta(text).ops.map(op=>typeof op.insert==='string'?op.insert:Object.values(op.insert).map(v=>v.caption).join(' ')).join('').trim()}
