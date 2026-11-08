import {mutationOriginAllowed} from '@/lib/server/origin';
// Administrator identity is the verified owner of this Site, resolved through Sites.
const administratorEmail='lahzetv@gmail.com';
export const siteOrigin='https://mahela-classroom.lahzehtv.chatgpt.site';
export function identity(r:Request){const id=r.headers.get('oai-authenticated-user-id');if(!id)return null;const email=r.headers.get('oai-authenticated-user-email')||'';return {id,email,isAdmin:email.toLowerCase()===administratorEmail}}
export function isAdministrator(email:string){return email.toLowerCase()===administratorEmail}
export function validOrigin(r:Request){return mutationOriginAllowed(r,siteOrigin)}
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export {payload} from '@/lib/server/http';
