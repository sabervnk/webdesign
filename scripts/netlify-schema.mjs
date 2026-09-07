import {readFile, readdir, writeFile} from 'node:fs/promises';
// Embed the existing append-only migrations; no runtime filesystem dependency.
const names=(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort();
const migrations=await Promise.all(names.map(async name=>({name,sql:await readFile('drizzle/'+name,'utf8')})));
await writeFile('platform/netlify/migrations.json',JSON.stringify(migrations,null,2)+'\n');
