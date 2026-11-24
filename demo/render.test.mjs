import {test} from 'node:test';
import assert from 'node:assert/strict';
import {STORAGE_KEY} from './state.js';
const documentEvents={},windowEvents={},nodes=new Map();
function node(){return {innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){}},addEventListener(){},querySelector(){return null},querySelectorAll(){return []}}}
for(const id of ['#app','#overlay','#toast'])nodes.set(id,node());
globalThis.localStorage={values:new Map(),getItem(k){return this.values.get(k)||null},setItem(k,v){this.values.set(k,v)}};
globalThis.location=new URL('https://demo.example/');
globalThis.scrollY=0;
globalThis.document={querySelector:s=>nodes.get(s)||null,addEventListener:(k,fn)=>documentEvents[k]=fn,body:node(),documentElement:{...node(),style:{setProperty(){},removeProperty(){}}}};
globalThis.window={addEventListener:(k,fn)=>windowEvents[k]=fn,scrollTo(){}};
globalThis.history={pushState(_state,_title,url){globalThis.location=new URL(url,location)}};
globalThis.FormData=class{constructor(form){this.values=Object.entries(form.values)}[Symbol.iterator](){return this.values[Symbol.iterator]()}get(key){return this.values.find(x=>x[0]===key)?.[1]}};
await import('./app.js');
const rendered=()=>nodes.get('#app').innerHTML;
function visit(path){globalThis.location=new URL(path,'https://demo.example');windowEvents.popstate()}
function click(action,id){const button={dataset:{action,id}};documentEvents.click({target:{closest(selector){return selector==='[data-action]'?button:null}}})}
function submit(kind,values,id=''){documentEvents.submit({preventDefault(){},target:{dataset:{form:kind,id},values,reset(){}}})}
test('all public pages and all three demo roles render with local content',()=>{
 for(const [path,text] of [['/','زبان تازه'],['/teachers','یادگیری خوب'],['/teachers/sample-sara','سارا مهر'],['/blog','کلمه به کلمه'],['/blog/sample-small-steps','عادت ماندگار'],['/contact','فرم نمونه'],['/signin','پنل معلم'],['/dashboard','زبان‌آموزان فعال'],['/students','النا کیم'],['/students/elena','پرونده'],['/schedule','همه کلاس‌ها'],['/finance','تسویه'],['/messages','سلام استاد'],['/studio','نام فارسی'],['/journal','نوشته جدید'],['/student','مسیر یادگیری'],['/admin','درخواست‌های نمونه']]){visit(path);assert.ok(rendered().includes(text),path);assert.ok(!rendered().includes('undefined'),path)}
});
test('language changes rerender pages and save preference',()=>{visit('/');click('language');assert.ok(rendered().includes('A new language.'));visit('/dashboard');assert.ok(rendered().includes('Active students'));click('language')});
test('sample submissions persist locally, escape markup and appear in the admin inbox',()=>{visit('/contact');submit('inquiry',{name:'<img onerror=alert(1)>',email:'sample@example.com',message:'Sample message only'});visit('/admin');assert.ok(rendered().includes('&lt;img onerror=alert(1)&gt;'));assert.ok(!rendered().includes('<img onerror=alert(1)>'));assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).requests.length,1);visit('/students');submit('student',{name:'آزمون نمونه',nameEn:'Sample learner',email:'new@example.com',rate:'300000',duration:'60',level:'B2',currency:'TOMAN'});assert.ok(rendered().includes('آزمون نمونه'));visit('/dashboard');submit('memo',{title:'Demo note',body:'Local only',color:'mint'});assert.ok(rendered().includes('Demo note'))});
