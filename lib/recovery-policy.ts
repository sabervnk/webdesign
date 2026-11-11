export const RECOVERY_CODE_SECONDS=600;
export const RECOVERY_RESEND_SECONDS=60;
export const RECOVERY_GRANT_SECONDS=300;
export const RECOVERY_MAX_ATTEMPTS=5;
export const normalizeRecoveryEmail=(value:string)=>value.trim().toLowerCase();
export const recoveryEmailValid=(value:string)=>value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const normalizeRecoveryCode=(value:string)=>value.trim().replace(/[\s-]/g,'').replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632));

