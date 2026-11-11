import {recoveryMailConfig} from '@/lib/server/recovery-mail';
export const getRecoveryMailConfig=()=>recoveryMailConfig(process.env);

