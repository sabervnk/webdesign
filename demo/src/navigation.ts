import {useSyncExternalStore} from 'react';
const event='classer-demo-navigation';
export function locationSnapshot(){return window.location.pathname+window.location.search}
function subscribe(fn:()=>void){window.addEventListener(event,fn);window.addEventListener('popstate',fn);return()=>{window.removeEventListener(event,fn);window.removeEventListener('popstate',fn)}}
export function useLocation(){return useSyncExternalStore(subscribe,locationSnapshot,()=>'/')}
export function navigate(url:string,replace=false,scroll=true){const next=new URL(url,location.href);if(next.origin!==location.origin){window.location.assign(next.href);return}window.history[replace?'replaceState':'pushState']({},'',next.pathname+next.search+next.hash);window.dispatchEvent(new Event(event));if(scroll)window.scrollTo({top:0})}
export function usePathname(){useLocation();return location.pathname}
export function useSearchParams(){const snapshot=useLocation();return new URLSearchParams(snapshot.split('?')[1]||'')}
export function useRouter(){return {push:(url:string,opts?:{scroll?:boolean})=>navigate(url,false,opts?.scroll!==false),replace:(url:string,opts?:{scroll?:boolean})=>navigate(url,true,opts?.scroll!==false),refresh:()=>window.dispatchEvent(new Event(event)),back:()=>history.back(),forward:()=>history.forward(),prefetch:()=>Promise.resolve()}}
export function redirect(url:string){navigate(url,true)}
export function notFound(){navigate('/404',true)}
