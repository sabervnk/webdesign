import {cp, mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, 'dist');
await mkdir(out, {recursive:true});
for (const name of ['index.html','app.js','data.js','state.js','base.css','public.css','action-colors.css','demo.css','_redirects','_headers']) {
  await cp(path.join(root,name),path.join(out,name));
}
await cp(path.join(root,'../public'),out,{recursive:true,filter:source=>!source.endsWith('.base64')});
// Never publish backend entry points, runtime data or environment files.
const html=await readFile(path.join(out,'index.html'),'utf8');
if (!html.includes('src="/app.js"')) throw new Error('Missing demo entry point');
await writeFile(path.join(out,'demo-version.json'),JSON.stringify({version:'0.14.2-demo.1',static:true}));
console.log('Static Classer demo ready in demo/dist — no database, R2, Worker or dependencies.');
