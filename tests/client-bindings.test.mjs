import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import ts from 'typescript';

test('teacher studio and workspace have no unbound runtime names',()=>{
 const root=process.cwd(),config=ts.readConfigFile(path.join(root,'tsconfig.json'),ts.sys.readFile);
 assert.equal(config.error,undefined);
 const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,root);
 const names=['app/studio.tsx','app/workspace.tsx','components/direct-messenger.tsx','components/login-captcha.tsx','components/local-login.tsx'].map(p=>path.join(root,p));
 const program=ts.createProgram(names,{...parsed.options,noEmit:true,incremental:false,skipLibCheck:true});
 const unbound=[];
 for(const name of names){const source=program.getSourceFile(name);assert(source);unbound.push(...program.getSemanticDiagnostics(source).filter(d=>d.code===2304||d.code===2552))}
 const host={getCanonicalFileName:f=>f,getCurrentDirectory:()=>root,getNewLine:()=> '\n'};
 assert.equal(unbound.length,0,ts.formatDiagnosticsWithColorAndContext(unbound,host));
});
