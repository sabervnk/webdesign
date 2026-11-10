'use client';
import {createContext,useContext,type ReactNode} from 'react';
import {copyKey,type CopyValues} from '@/lib/site-copy';
const CopyContext=createContext<CopyValues>({});
export function SiteCopyProvider({values,children}:{values:CopyValues,children:ReactNode}){
 return <CopyContext.Provider value={values}>{children}</CopyContext.Provider>;
}
export function useSiteText(lang:'fa'|'en'){
 const copy=useContext(CopyContext);
 return (fa:string,en:string)=>copy[copyKey(fa,en)]?.[lang]??(lang==='fa'?fa:en);
}
export function useCopyValue(key:string,lang:'fa'|'en',fallback:string){return useContext(CopyContext)[key]?.[lang]??fallback}
