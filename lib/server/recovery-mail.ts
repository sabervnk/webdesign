export type RecoveryMailConfig={apiKey:string;from:string;secret:string};
export function recoveryMailConfig(values:Record<string,string|undefined>):RecoveryMailConfig|null{
 const apiKey=values.RESEND_API_KEY?.trim(),from=values.RECOVERY_EMAIL_FROM?.trim(),secret=values.RECOVERY_CODE_SECRET;
 if(!apiKey||!from||/[\r\n]/.test(from)||!/@/.test(from)||!secret||secret.length<32)return null;
 return {apiKey,from,secret};
}
export function recoveryEmailSender(config:RecoveryMailConfig,sendFetch:typeof fetch=fetch){
 return async(to:string,code:string,challenge:string)=>{
  if(!/^\d{6}$/.test(code)||!/^[0-9a-f]{64}$/.test(challenge))throw new Error('Invalid recovery message');
  const response=await sendFetch('https://api.resend.com/emails',{
   method:'POST',signal:AbortSignal.timeout(4000),
   headers:{Authorization:'Bearer '+config.apiKey,'Content-Type':'application/json','Idempotency-Key':'classer-recovery/'+challenge},
   body:JSON.stringify({from:config.from,to:[to],subject:'کد بازیابی رمز عبور Classer',text:'کد بازیابی رمز عبور شما: '+code+'\nاین کد ۱۰ دقیقه اعتبار دارد و فقط یک بار قابل استفاده است. کد را در صفحهٔ بازیابی سایت وارد کنید و با کسی به اشتراک نگذارید.\nاگر این درخواست را نداده‌اید، این ایمیل را نادیده بگیرید. رمز شما تغییر نکرده است.'})
  });
  // Never log provider bodies: they can contain email addresses or credentials.
  if(!response.ok)throw new Error('Recovery email delivery rejected');
  const body=await response.json() as {id?:unknown};
  if(typeof body.id!=='string'||!body.id)throw new Error('Recovery email delivery unconfirmed');
 };
}

