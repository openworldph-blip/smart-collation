import test from 'node:test';
import assert from 'node:assert/strict';
import {passwordRecord,verifyPassword} from '../src/local-auth.js';
test('local password verifiers use separate salts and do not store plaintext',async()=>{
 const fixture='test-fixture-only-2026',a=await passwordRecord(fixture),b=await passwordRecord(fixture);
 assert.notEqual(a.salt,b.salt);assert.notEqual(a.hash,b.hash);assert(!JSON.stringify(a).includes(fixture));
 assert(await verifyPassword(fixture,a));assert(!await verifyPassword('incorrect-fixture',a));assert(!await verifyPassword(fixture,null));
});
test('short passwords are rejected',async()=>{await assert.rejects(()=>passwordRecord('short'),/8 characters/);});
