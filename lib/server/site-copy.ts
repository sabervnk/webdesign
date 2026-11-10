import {database} from '@/db/storage';
import type {CopyValues} from '@/lib/site-copy';
export async function loadSiteCopy(){
 try{
  const row=await database().prepare('SELECT data,version FROM classer_site_copy WHERE id=1').first<{data:string,version:number}>();
  return {values:(row?JSON.parse(row.data):{}) as CopyValues,version:row?.version??0};
 }catch(e){console.error('Site copy unavailable',e);return {values:{} as CopyValues,version:0}}
}
