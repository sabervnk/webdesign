/// <reference lib="webworker" />
import {createState,DATABASE_NAME,handle,type BlobStore,type DemoState} from './runtime';
declare const self:ServiceWorkerGlobalScope;
const db=new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open(DATABASE_NAME,1);r.onupgradeneeded=()=>{r.result.createObjectStore('records');r.result.createObjectStore('blobs')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
async function read<T>(store:string,key:string):Promise<T|undefined>{const database=await db;return new Promise((resolve,reject)=>{const r=database.transaction(store,'readonly').objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function write(store:string,key:string,value:unknown,remove=false){const database=await db;await new Promise<void>((resolve,reject)=>{const tx=database.transaction(store,'readwrite');if(remove)tx.objectStore(store).delete(key);else tx.objectStore(store).put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
const blobs:BlobStore={get:key=>read<Blob>('blobs',key),put:(key,blob)=>write('blobs',key,blob),remove:key=>write('blobs',key,undefined,true)};
let queue=Promise.resolve();
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(url.origin!==self.location.origin||!(url.pathname.startsWith('/api/')||url.pathname.startsWith('/__classer_demo__/')))return;
 const result=queue.then(async()=>{const saved=await read<DemoState>('records','state');const state=saved?.schema===1?saved:createState();const response=await handle(event.request,state,blobs);if(response.ok||!saved)await write('records','state',state);return response});
 queue=result.then(()=>{},()=>{});event.respondWith(result.catch(()=>Response.json({error:'فضای ذخیرهٔ مرورگر در دسترس نیست. لطفاً حالت خصوصی یا محدودیت ذخیره‌سازی را بررسی کنید.'},{status:503})));
});
