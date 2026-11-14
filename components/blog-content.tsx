import React from 'react';
import {safeLink} from '@/lib/blog';
function inline(text:string):React.ReactNode[]{return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g).map((part,i)=>{
 if(part.startsWith('**'))return <strong key={i}>{part.slice(2,-2)}</strong>;
 if(part.startsWith('*'))return <em key={i}>{part.slice(1,-1)}</em>;
 const link=/^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);if(link){const url=safeLink(link[2]);return url?<a href={url} key={i} rel="noopener noreferrer" target="_blank">{link[1]}</a>:<span key={i}>{link[1]}</span>}
 return <React.Fragment key={i}>{part}</React.Fragment>;
})}
export function BlogContent({content}:{content:string}){
 return <div className="blog-rich-content" dir="auto">{content.split(/\n\s*\n/).filter(Boolean).map((block,i)=>{
 const media=/^(!|@)\[([^\]]*)\]\(([^)]+)\)$/.exec(block.trim());
 if(media){const url=safeLink(media[3]);if(!url)return null;return <figure key={i}>{media[1]==='!'?<img src={url} alt={media[2]} loading="lazy"/>:<video src={url} controls playsInline preload="metadata" aria-label={media[2]||'Video'}/>} {media[2]&&<figcaption>{media[2]}</figcaption>}</figure>}
 if(/^#{1,3} /.test(block)){const [first,...rest]=block.split('\n'),heading=first.replace(/^#+ /,'');return <section key={i}><h2>{inline(heading)}</h2>{rest.length>0&&<p>{inline(rest.join('\n'))}</p>}</section>}
 const lines=block.split('\n');if(lines.every(l=>/^[-*] /.test(l)))return <ul key={i}>{lines.map((line,j)=><li key={j}>{inline(line.slice(2))}</li>)}</ul>;
 if(lines.every(l=>/^\d+\. /.test(l)))return <ol key={i}>{lines.map((line,j)=><li key={j}>{inline(line.replace(/^\d+\. /,''))}</li>)}</ol>;
 if(block.startsWith('> '))return <blockquote key={i}>{inline(block.replace(/^> /gm,''))}</blockquote>;
 return <p key={i}>{inline(block)}</p>;
 })}</div>;
}
