export const MIN_PASSWORD_LENGTH=8;
export const MAX_PASSWORD_LENGTH=128;
export const passwordValid=(value:string)=>value.length>=MIN_PASSWORD_LENGTH&&value.length<=MAX_PASSWORD_LENGTH;
const common=new Set(['password','password1','password123','qwerty123','12345678','123456789','1234567890','11111111','letmein','welcome','admin123','iloveyou','abc123','classer123','changeme']);
const sequences=['01234567890','abcdefghijklmnopqrstuvwxyz','qwertyuiop','asdfghjkl','zxcvbnm'];
export function passwordStrength(value:string):0|1|2|3|4{
 if(!passwordValid(value))return 0;
 const compact=value.trim().normalize('NFKC').toLowerCase().replace(/[\s_.!@#$%&*+\-]/g,'').replace(/[۰-۹٠-٩]/g,c=>String(c.charCodeAt(0)%16));
 const distinct=new Set([...compact]).size;
 if(common.has(compact)||distinct<4||/^(.{1,4})\1+$/u.test(compact)||sequences.some(s=>s.includes(compact)||[...s].reverse().join('').includes(compact))||/^\d{8}$/.test(compact))return 1;
 if(value.length>=15&&distinct>=9)return 4;
 if(value.length>=12&&distinct>=7)return 3;
 return 2;
}
export const isVeryWeakPassword=(value:string)=>passwordStrength(value)===1;
