import {redirect} from 'next/navigation';
import {chatGPTSignInPath} from './auth';
export default function Login(){redirect(chatGPTSignInPath('/dashboard'))}
