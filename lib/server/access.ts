// Administrator identity is the verified owner of this Site, resolved through Sites.
const administratorEmail='lahzetv@gmail.com';
export const siteOrigin='https://mahela-classroom.lahzehtv.chatgpt.site';
export function identity(r:Request){const id=r.headers.get('oai-authenticated-user-id');if(!id)return null;const email=r.headers.get('oai-authenticated-user-email')||'';return {id,email,isAdmin:email.toLowerCase()===administratorEmail}}
export function isAdministrator(email:string){return email.toLowerCase()===administratorEmail}
export function validOrigin(r:Request){const origin=r.headers.get('origin');return !origin||origin===new URL(r.url).origin}
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function payload(r:Request,max=200000){const body=await r.text();if(body.length>max)throw new Error('اطلاعات بیش از حد مجاز است. / Payload too large.');return JSON.parse(body)}
