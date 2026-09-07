import {getStore} from '@netlify/blobs';
import initSqlJs from 'sql.js/dist/sql-asm.js';
import migrations from './migrations.json';

// This small-site adapter preserves the app's tested SQLite queries. The durable
// copy lives in Netlify Blobs, never Lambda's temporary disk or process memory.
// Strong reads + conditional writes protect against parallel function instances.
const sqlReady=initSqlJs();
const key='database.sqlite';
type Value=string|number|null|Uint8Array;
const maxBytes=32*1024*1024;
export function store(name:string){return getStore({name:'mahela-'+name,consistency:'strong'})}

// Avoid competing writes inside one warm function. This is only coordination:
// cross-instance correctness still depends on the conditional write below.
// Rejections must release the queue so a failed request cannot block later saves.
let pendingWrite:Promise<unknown>=Promise.resolve();
function execute(query:string,values:Value[],write:boolean){
 if(!write)return executeSnapshot(query,values,false);
 const result=pendingWrite.then(()=>executeSnapshot(query,values,true));
 pendingWrite=result.catch(()=>{});
 return result;
}

async function executeSnapshot(query:string,values:Value[],write:boolean){
 const blobs=store('data');
 const SQL=await sqlReady;
 for(let attempt=0;attempt<8;attempt++){
  const current=await blobs.getWithMetadata(key,{type:'arrayBuffer'});
  if(current&&current.data.byteLength>maxBytes)throw new Error('Database capacity reached');
  const db=new SQL.Database(current?new Uint8Array(current.data):undefined);
  try{
   db.run('PRAGMA foreign_keys=ON');
   db.run('CREATE TABLE IF NOT EXISTS _mahela_migrations (name TEXT PRIMARY KEY)');
   for(const migration of migrations){
    const check=db.prepare('SELECT name FROM _mahela_migrations WHERE name=?');
    check.bind([migration.name]);const applied=check.step();check.free();
    if(!applied){db.run('BEGIN');try{db.run(migration.sql);db.run('INSERT INTO _mahela_migrations VALUES (?)',[migration.name]);db.run('COMMIT')}catch(e){db.run('ROLLBACK');throw e}}
   }
   if(!write){
    const statement=db.prepare(query);
    try{statement.bind(values);const results:Record<string,Value>[]=[];while(statement.step())results.push(statement.getAsObject());return {results,meta:{changes:0}}}finally{statement.free()}
   }
   db.run(query,values);
   const changes=db.getRowsModified();
   if(!changes)return {results:[],meta:{changes:0}};
   const snapshot=db.export();
   if(snapshot.byteLength>maxBytes)throw new Error('Database capacity reached');
   const result=await blobs.set(key,new Uint8Array(snapshot).buffer,current?{onlyIfMatch:current.etag}:{onlyIfNew:true});
   if(result.modified)return {results:[],meta:{changes}};
  }finally{db.close()}
 }
 throw new Error('Concurrent database updates; please retry');
}

class Statement {
 constructor(private sql:string,private values:Value[]=[]){ }
 bind(...values:Value[]){return new Statement(this.sql,values)}
 async first<T=Record<string,unknown>>():Promise<T|null>{return ((await execute(this.sql,this.values,false)).results[0]??null) as T|null}
 async all<T=Record<string,unknown>>(){const r=await execute(this.sql,this.values,false);return {...r,results:r.results as T[]}}
 async run(){return execute(this.sql,this.values,true)}
}
export function database(){return {prepare:(sql:string)=>new Statement(sql)}}
export function bucket(){return {
 async get(key:string){const file=await store('photos').getWithMetadata(key,{type:'arrayBuffer'});return file?{body:file.data,httpMetadata:{contentType:String(file.metadata.contentType||'image/jpeg')}}:null},
 async put(key:string,value:ArrayBuffer,options:{httpMetadata:{contentType:string}}){await store('photos').set(key,value,{metadata:{contentType:options.httpMetadata.contentType}})},
}}
