import {createHmac} from 'node:crypto';

// Retain the existing PBKDF2 parameters and salt:hash format.
const ITERATIONS=600_000;
const encoder=new TextEncoder();
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');

async function derive(password:string,salt:string){
 try{
  const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:ITERATIONS,hash:'SHA-256'},key,256);
  return hex(new Uint8Array(bits));
 }catch(error){
  if(!(error instanceof Error)||error.name!=='NotSupportedError')throw error;
 }
 // Workers production caps native PBKDF2 iterations. RFC 8018 section 5.2:
 // a 32-byte SHA-256 key needs exactly one block, U1 through U600000.
 // Use the runtime's HMAC primitive; do not lower the password work factor.
 const key=encoder.encode(password);
 let u=createHmac('sha256',key).update(encoder.encode(salt)).update(new Uint8Array([0,0,0,1])).digest();
 const result=new Uint8Array(u);
 for(let i=1;i<ITERATIONS;i++){
  u=createHmac('sha256',key).update(u).digest();
  for(let j=0;j<result.length;j++)result[j]^=u[j];
 }
 return hex(result);
}
export async function hashPassword(password:string){
 const salt=hex(crypto.getRandomValues(new Uint8Array(32)));
 return salt+':'+await derive(password,salt);
}
export async function verifyPassword(password:string,hash:string){
 if(!/^[0-9a-f]{64}:[0-9a-f]{64}$/.test(hash))return false;
 const [salt,expected]=hash.split(':');
 const computed=await derive(password,salt);
 let diff=0;
 for(let i=0;i<computed.length;i++)diff|=computed.charCodeAt(i)^expected.charCodeAt(i);
 return diff===0;
}

