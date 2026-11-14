export function normalizeMobile(value:string){
 let phone=value.trim().replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[\s()-]/g,'');
 if(/^09\d{9}$/.test(phone))phone='+98'+phone.slice(1);
 if(phone.startsWith('00'))phone='+'+phone.slice(2);
 return phone;
}
export const mobileValid=(phone:string)=>/^\+[1-9]\d{7,14}$/.test(phone);

