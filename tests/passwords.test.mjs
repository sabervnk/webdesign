import assert from 'node:assert/strict';
import {pbkdf2Sync} from 'node:crypto';
import test from 'node:test';
import {hashPassword,verifyPassword} from '../lib/server/password.ts';
import {passwordValid,passwordStrength} from '../lib/password-policy.ts';

const salt='ab'.repeat(32);
const fixture=(value)=>salt+':'+pbkdf2Sync(value,salt,600_000,32,'sha256').toString('hex');

test('native verification accepts existing 600k hashes and rejects incorrect or malformed values',async()=>{
 const password='Existing password!1';
 assert.equal(await verifyPassword(password,fixture(password)),true);
 assert.equal(await verifyPassword('Wrong password!1',fixture(password)),false);
 for(const invalid of ['',salt, salt+':abc','a:','::'])assert.equal(await verifyPassword(password,invalid),false);
});

test('production iteration-cap fallback matches Node PBKDF2 and remains compatible',async(t)=>{
 let calls=0;
 t.mock.method(crypto.subtle,'deriveBits',()=>{
  calls++;
  throw new DOMException('Pbkdf2 failed: iteration counts above 100000 are not supported','NotSupportedError');
 });
 for(const password of ['Eight!8x','رمز طولانی آزمایشی 🔐', 'long-secret-'.repeat(10)]){
  assert.equal(await verifyPassword(password,fixture(password)),true);
 }
 assert.equal(await verifyPassword('wrong',fixture('correct')),false);
 const password='New password!23';
 const first=await hashPassword(password),second=await hashPassword(password);
 assert.notEqual(first,second,'every password receives a fresh random salt');
 for(const hash of [first,second]){
  const [storedSalt,expected]=hash.split(':');
  assert.equal(expected,pbkdf2Sync(password,storedSalt,600_000,32,'sha256').toString('hex'));
  assert.equal(await verifyPassword(password,hash),true);
 }
 assert(calls>0);
});

test('unexpected crypto failures are propagated rather than silently bypassed',async(t)=>{
 t.mock.method(crypto.subtle,'deriveBits',()=>{throw new DOMException('unavailable','OperationError')});
 await assert.rejects(hashPassword('Unexpected failure'),{name:'OperationError'});
});

test('eight-character minimum and weak password feedback',()=>{
 assert.equal(passwordValid('a'.repeat(7)),false);
 assert.equal(passwordValid('a'.repeat(8)),true);
 assert.equal(passwordValid('a'.repeat(128)),true);
 assert.equal(passwordValid('a'.repeat(129)),false);
 assert.equal(passwordStrength(''),0);
 assert.equal(passwordStrength('Password123!'),1);
 assert.equal(passwordStrength('a'.repeat(20)),1);
 assert.equal(passwordStrength('Rainbow!7059'),3);
 assert.equal(passwordStrength('four unrelated words here'),4);
});

