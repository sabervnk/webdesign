import './ui.css';
async function start(){
 if(!('serviceWorker' in navigator))throw Error('این مرورگر از اجرای نسخهٔ نمایشی پشتیبانی نمی‌کند.');
 await navigator.serviceWorker.register('/demo-worker.js',{type:'module',updateViaCache:'none'});
 await navigator.serviceWorker.ready;
 if(!navigator.serviceWorker.controller)await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('آماده‌سازی نسخهٔ نمایشی طول کشید؛ صفحه را تازه کنید.')),15000);navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(timer);resolve()},{once:true})});
 await import('./application');
}
start().catch(error=>{const root=document.querySelector('#app')!;root.textContent=String(error.message);root.setAttribute('role','alert')});
