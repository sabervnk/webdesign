import './netlify-schema.mjs';
import {spawnSync} from 'node:child_process';
const result=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build','--webpack'],{
 stdio:'inherit',env:{...process.env,NEXT_PUBLIC_HOSTING_TARGET:'netlify',NEXT_TELEMETRY_DISABLED:'1'}
});
if(result.error)throw result.error;
process.exit(result.status??1);
