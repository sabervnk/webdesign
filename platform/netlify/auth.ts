import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {identity,siteOrigin,safeReturn} from './access';
export type ChatGPTUser={displayName:string,email:string,fullName:string|null};
export async function getChatGPTUser():Promise<ChatGPTUser|null>{const user=identity(new Request(siteOrigin,{headers:await headers()}));return user?{displayName:user.displayName,email:user.email,fullName:user.displayName}:null}
export async function requireChatGPTUser(returnTo:string){const user=await getChatGPTUser();if(user)return user;redirect(chatGPTSignInPath(returnTo))}
export function chatGPTSignInPath(returnTo:string){return '/signin?return_to='+encodeURIComponent(safeReturn(returnTo))}
export function chatGPTSignOutPath(){return '/signout'}
