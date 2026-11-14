import {normalizeMobile,mobileValid} from './account-contact.ts';
export function profileContact(email:string,phone:string){const normalized={email:email.trim().toLowerCase(),phone:normalizeMobile(phone)};return {value:normalized,valid:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)&&normalized.email.length<=254&&mobileValid(normalized.phone)}}
