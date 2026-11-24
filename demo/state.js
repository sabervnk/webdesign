export const STORAGE_KEY='classer-static-demo-v1';
export const PREF_KEY='classer-static-demo-prefs-v1';
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function tehranDay(now=new Date()){
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=k=>p.find(v=>v.type===k).value;return `${get('year')}-${get('month')}-${get('day')}`;
}
export function addDays(day,n){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
export function initialState(seed,day=tehranDay()){
 const roster=[['elena','النا کیم','Elena Kim','B2',280000,60],['daniel','دنیل کروز','Daniel Cruz','B1',250000,60],['sara','سارا احمدی','Sara Ahmadi','C1',300000,60],['marco','مارکو روسی','Marco Rossi','B1',250000,60],['yuki','یوکی تاناکا','Yuki Tanaka','A2',220000,45]];
 const students=roster.map(([id,name,nameEn,level,rate,duration],i)=>({id,name,nameEn,level,rate,duration,email:id+'@example.com',phone:'',currency:'TOMAN',skills:[6,5.5,6.5,5.5].map(v=>Math.max(2,v-i*.5))}));
 const sessions=Array.from({length:13},(_,i)=>{const s=students[i%students.length];const duration=s.duration;return{id:'demo-session-'+i,studentId:s.id,date:addDays(day,i<5?i:4-i),time:i%2?'15:30':'09:00',duration,rate:s.rate,currency:s.currency,type:i%3?'online':'in-person',status:i<5?'scheduled':'held',paid:i>9,note:''}});
 return {schema:1,profile:{name:'مهتا احمدی',nameEn:'Mahta Ahmadi',email:'teacher@example.com',headline:'مدرس زبان انگلیسی',bio:'به فضای کار نمونه خوش آمدید. این اطلاعات صرفاً برای نمایش امکانات است.'},students,sessions,teachers:structuredClone(seed.teachers),articles:structuredClone(seed.articles),memos:[{id:'memo-welcome',title:'به Classer خوش آمدید',body:'پنل را امتحان کنید؛ تغییرات فقط در همین مرورگر ذخیره می‌شوند.',color:'mint'}],messages:[{id:'message-welcome',studentId:'elena',text:'سلام استاد، برای جلسه بعد چه تمرینی آماده کنم؟',direction:'in'}],requests:[]};
}
export function readState(storage,seed){try{const d=JSON.parse(storage.getItem(STORAGE_KEY));if(d?.schema===1&&['students','sessions','teachers','articles','memos','messages','requests'].every(k=>Array.isArray(d[k]))&&d.profile&&d.students.length<=2000&&d.sessions.length<=10000)return d;}catch{}return initialState(seed)}
export function persistState(storage,state){try{storage.setItem(STORAGE_KEY,JSON.stringify(state));return true}catch{return false}}
export function feeFor(rate,baseDuration,duration,currency){const factor=currency==='USD'?100:1;return Math.round(rate/baseDuration*duration*factor)/factor}
export function sessionConflict(sessions,next){const minute=s=>{const [h,m]=s.split(':').map(Number);return h*60+m};return sessions.some(s=>s.id!==next.id&&s.status!=='cancelled'&&next.status!=='cancelled'&&s.date===next.date&&minute(s.time)<minute(next.time)+next.duration&&minute(next.time)<minute(s.time)+s.duration)}
