import {redirect} from 'next/navigation';
import {chatGPTSignOutPath} from './auth';
export default function Logout(){redirect(chatGPTSignOutPath('/'))}
