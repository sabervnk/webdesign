import {safeLink} from './blog';
const element=(name:string,text?:string)=>{const node=document.createElement(name);if(text!==undefined)node.textContent=text;return node};
function inline(parent:HTMLElement,text:string){for(const part of text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g)){
 if(part.startsWith('**'))parent.append(element('strong',part.slice(2,-2)));
 else if(part.startsWith('*'))parent.append(element('em',part.slice(1,-1)));
 else{const m=/^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);if(m){const a=element('a',m[1]),href=safeLink(m[2]);if(href)a.setAttribute('href',href);parent.append(a)}else parent.append(document.createTextNode(part))}
}}
export function loadEditor(root:HTMLElement,content:string,onChange:()=>void){
 const fragment=document.createDocumentFragment();
 for(const block of content.split(/\n\s*\n/).filter(Boolean)){
 const m=/^(!|@)\[([^\]]*)\]\(([^)]+)\)$/.exec(block.trim());
 if(m&&safeLink(m[3])){const fig=element('figure');fig.contentEditable='false';fig.dataset.kind=m[1];fig.dataset.url=m[3];const file=element(m[1]==='!'?'img':'video');file.setAttribute('src',m[3]);if(m[1]==='!')file.setAttribute('alt',m[2]);else{file.setAttribute('controls','');file.setAttribute('preload','metadata')}const caption=element('figcaption',m[2]);caption.contentEditable='true';const remove=element('button','×');remove.setAttribute('type','button');remove.setAttribute('aria-label','Remove media');remove.className='editor-remove-media';remove.onclick=()=>{fig.remove();onChange()};fig.append(file,caption,remove);fragment.append(fig);continue}
 const lines=block.split('\n');
 if(lines.every(l=>/^[-*] /.test(l))||lines.every(l=>/^\d+\. /.test(l))){const list=element(/^\d/.test(lines[0])?'ol':'ul');for(const line of lines){const li=element('li');inline(li,line.replace(/^(?:[-*]|\d+\.) /,''));list.append(li)}fragment.append(list);continue}
 if(block.startsWith('> ')){const q=element('blockquote');inline(q,block.replace(/^> /gm,''));fragment.append(q);continue}
 if(/^#{1,3} /.test(block)){const [title,...rest]=lines,h=element('h2');inline(h,title.replace(/^#+ /,''));fragment.append(h);if(rest.length){const p=element('p');inline(p,rest.join('\n'));fragment.append(p)}continue}
 const p=element('p');inline(p,block);fragment.append(p);
 }
 if(!fragment.childNodes.length)fragment.append(element('p',''));root.replaceChildren(fragment);
}
export function readEditor(root:HTMLElement):string{
 function read(node:Node):string{
 if(node.nodeType===Node.TEXT_NODE)return node.textContent??'';if(!(node instanceof HTMLElement))return '';const inner=()=>[...node.childNodes].map(read).join('');
 switch(node.tagName){
 case 'STRONG':case 'B':return '**'+inner()+'**';case 'EM':case 'I':return '*'+inner()+'*';
 case 'A':{const href=safeLink(node.getAttribute('href')??'');return href?'['+inner()+']('+href+')':inner()}
 case 'BR':return '\n';case 'H1':case 'H2':case 'H3':return '\n\n## '+inner().trim()+'\n\n';
 case 'UL':case 'OL':return '\n\n'+[...node.children].filter(n=>n.tagName==='LI').map((li,i)=>(node.tagName==='OL'?(i+1)+'. ':'- ')+[...li.childNodes].map(read).join('').trim()).join('\n')+'\n\n';
 case 'BLOCKQUOTE':return '\n\n> '+inner().trim().replaceAll('\n','\n> ')+'\n\n';
 case 'FIGURE':{const src=safeLink(node.dataset.url??''),caption=node.querySelector('figcaption')?.textContent?.replaceAll(']','')??'';return src?'\n\n'+(node.dataset.kind==='@'?'@':'!')+'['+caption+']('+src+')\n\n':''}
 case 'IMG':case 'VIDEO':case 'BUTTON':case 'SCRIPT':case 'STYLE':return '';
 case 'P':case 'DIV':return '\n\n'+inner().trim()+'\n\n';default:return inner();
 }}return [...root.childNodes].map(read).join('').replace(/\n{3,}/g,'\n\n').trim();
}
