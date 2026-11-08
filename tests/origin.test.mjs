import test from 'node:test';
import assert from 'node:assert/strict';
import {mutationOriginAllowed} from '../lib/server/origin.ts';
const trusted='https://missmahta.netlify.app';
test('mutations fail closed and do not trust attacker-controlled request hosts',()=>{
 const allowed=(headers={},url=trusted)=>mutationOriginAllowed(new Request(url,{method:'POST',headers}),trusted);
 assert.equal(allowed(),false);
 assert.equal(allowed({origin:'null'}),false);
 assert.equal(allowed({origin:'https://evil.test'},'https://evil.test'),false);
 assert.equal(allowed({origin:trusted,'sec-fetch-site':'cross-site'}),false);
 assert.equal(allowed({origin:trusted}),true);
 assert.equal(allowed({referer:trusted+'/studio'}),true);
 assert.equal(allowed({'sec-fetch-site':'same-origin'}),true);
 assert.equal(allowed({referer:'invalid'}),false);
 assert.equal(allowed({'sec-fetch-site':'same-site'}),false);
});
