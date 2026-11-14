import LocalLogin from '@/components/local-login';
import PlatformLogin from '@platform/login';
import {pageIdentity,landing} from '@/lib/server/access';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export const metadata={title:'ورود به حساب | Classer',robots:{index:false,follow:false}};
export default async function Signin({searchParams}:{searchParams:Promise<{mode?:string}>}){
 if(process.env.NEXT_PUBLIC_HOSTING_TARGET==='netlify')return (PlatformLogin as unknown as ()=>React.ReactNode)();
 const mode=(await searchParams).mode,u=await pageIdentity();
 if(u?.mustChange)return <LocalLogin initial="change" forced/>;
 if(mode==='change'&&u?.local)return <LocalLogin initial="change" forced={false}/>;
 if(u)redirect(landing(u));
 return <LocalLogin initial={mode==='reset'?'reset':'login'} forced={false}/>;
}
