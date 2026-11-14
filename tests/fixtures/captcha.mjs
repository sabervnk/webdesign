import {captchaBinding,captchaDigest,CAPTCHA_COOKIE} from '../../lib/captcha-policy.ts';
export async function authCaptcha(db,path,body,headers={}){
 const action=path.split('?')[0].split('/').at(-1);if(!['login','reset','recovery-request'].includes(action))return {body,headers};
 const id=crypto.randomUUID(),token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join(''),code='123456',agent=new Headers(headers).get('user-agent')??'ClasserFixture/1';
 await db.prepare('INSERT INTO classer_captchas (id,answer_hash,binding_hash,expires) VALUES (?,?,?,?)').bind(id,await captchaDigest(id+'\0'+code),await captchaBinding(token,agent),Date.now()+120000).run();
 const h=new Headers(headers);h.set('user-agent',agent);h.set('Cookie',(h.get('Cookie')?h.get('Cookie')+'; ':'')+CAPTCHA_COOKIE+'='+token);
 return {body:{...body,captchaId:id,captchaCode:code},headers:Object.fromEntries(h)};
}
