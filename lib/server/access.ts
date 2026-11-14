import {identity as providerIdentity,siteOrigin} from '@platform/access';
import {accountSession,sessionToken,type AccountRole} from './accounts';
import {database} from '@/db/storage';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
export {json,validOrigin,payload,siteOrigin,isAdministrator} from '@platform/access';
export type Principal={id:string,email:string,name?:string,role:AccountRole,isAdmin:boolean,local:boolean,mustChange:boolean};
export async function identity(r:Request):Promise<Principal|null>{
 if(sessionToken(r)){
  const a=await accountSession(r);
  return a?{id:a.id,email:a.email,name:a.name,role:a.role,isAdmin:a.role==='admin'&&!a.must_change,local:true,mustChange:!!a.must_change}:null;
 }
 const provider=providerIdentity(r);
 if(!provider)return null;
 // The existing verified Sites owner remains the recovery administrator.
 if(provider.isAdmin){await database().prepare('INSERT OR IGNORE INTO classer_administrator_ids (owner_id) VALUES (?)').bind(provider.id).run();return {...provider,role:'admin',local:false,mustChange:false}}
 if(process.env.NEXT_PUBLIC_HOSTING_TARGET==='netlify')return {...provider,role:'teacher',local:false,mustChange:false};
 const legacy=await database().prepare('SELECT 1 AS allowed WHERE NOT EXISTS(SELECT 1 FROM classer_administrator_ids WHERE owner_id=?) AND NOT EXISTS(SELECT 1 FROM classer_accounts WHERE id=?) AND (EXISTS(SELECT 1 FROM teacher_workspaces WHERE owner_id=?) OR EXISTS(SELECT 1 FROM teacher_public_profiles WHERE owner_id=?))').bind(provider.id,provider.id,provider.id,provider.id).first();
 return legacy?{...provider,role:'teacher',local:false,mustChange:false}:null;
}
export function superAdministrator(u:Principal|null){return !!u?.isAdmin&&!u.local}
export function canTeach(u:Principal|null){return !!u&&!u.mustChange&&u.role==='teacher'}
export async function teacherIdentity(r:Request){const u=await identity(r);return canTeach(u)?u:null}
export const landing=(u:Pick<Principal,'role'|'mustChange'>)=>u.mustChange?'/signin?mode=change':u.role==='admin'?'/admin':u.role==='student'?'/student':'/dashboard';
export async function pageIdentity(){
 const h=await headers();
 return identity(new Request(siteOrigin,{headers:h}));
}
export async function requireRole(role:AccountRole){
 const u=await pageIdentity();
 if(!u)redirect('/signin');
 if(u.mustChange)redirect('/signin?mode=change');
 if(role==='teacher'? !canTeach(u):u.role!==role)redirect(landing(u));
 return u;
}
