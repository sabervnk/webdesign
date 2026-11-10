export type CopyValues=Record<string,{fa?:string,en?:string}>;
export function copyKey(fa:string,en:string){
 let h=2166136261;
 for(const ch of fa+'\u0000'+en){h=Math.imul(h^ch.codePointAt(0)!,16777619)}
 return (h>>>0).toString(36);
}
export const brandKey='site.brand';
export const imageKey='home.image';
