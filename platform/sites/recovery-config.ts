import {env} from 'cloudflare:workers';
import {recoveryMailConfig} from '@/lib/server/recovery-mail';
export const getRecoveryMailConfig=()=>recoveryMailConfig(env as unknown as Record<string,string|undefined>);

