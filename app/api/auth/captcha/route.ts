import {database} from '@/db/storage';
import {captchaImage} from '@/lib/captcha-image';
import {CAPTCHA_COOKIE,captchaBinding,captchaDigest,captchaLimit,captchaToken,randomCaptcha} from '@/lib/captcha-policy';
import {json} from '@/lib/server/access';
export const dynamic='force-dynamic';
export async function GET(r:Request){try{const db=database(),ip=r.headers.get('cf-connecting-ip')??'unknown';if(!await captchaLimit(db,'captcha-create:'+ip,40,900))return json({error:'کمی بعد تصویر تازه بگیرید. / Try again later.'},429);
 const token=captchaToken(r)||Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join(''),id=crypto.randomUUID(),code=randomCaptcha(),expires=Date.now()+120000;
 await db.prepare('DELETE FROM classer_captchas WHERE expires<=?').bind(Date.now()).run();await db.prepare('INSERT INTO classer_captchas (id,answer_hash,binding_hash,expires) VALUES (?,?,?,?)').bind(id,await captchaDigest(id+'\0'+code),await captchaBinding(token,r.headers.get('user-agent')??''),expires).run();
 const image=await captchaImage(code);return Response.json({id,image:'data:image/png;base64,'+btoa(String.fromCharCode(...image)),expiresAt:expires},{headers:{'Cache-Control':'private, no-store','Set-Cookie':CAPTCHA_COOKIE+'='+token+'; Path=/; Max-Age=900; Secure; HttpOnly; SameSite=Lax','X-Content-Type-Options':'nosniff'}});
 }catch{return json({error:'تصویر امنیتی دریافت نشد. دوباره تلاش کنید. / Could not load the security image.'},503)}}
