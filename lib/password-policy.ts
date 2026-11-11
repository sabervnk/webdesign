export const PASSWORD_MIN_LENGTH=8;
export const PASSWORD_MAX_LENGTH=128;
export const passwordValid=(value:string)=>value.length>=PASSWORD_MIN_LENGTH&&value.length<=PASSWORD_MAX_LENGTH;

// Advisory feedback, not an estimate of cracking time.
export function passwordStrength(value:string){
 if(!value)return 0;
 const normalized=value.toLowerCase().replace(/[^a-z0-9]/g,'');
 if(!passwordValid(value)||/^(.)\1+$/u.test(value)||['password','password1','password123','12345678','123456789','1234567890','qwerty123','qwertyuiop','abcdefgh','admin123'].includes(normalized))return 1;
 const classes=[/[a-z]/,/[A-Z]/,/[0-9]/,/[^a-zA-Z0-9]/].filter(pattern=>pattern.test(value)).length;
 if(value.length>=16||(value.length>=12&&classes>=3))return 3;
 return value.length>=12||classes>=3?2:1;
}
