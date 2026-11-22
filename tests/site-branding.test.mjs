import test from 'node:test';
import assert from 'node:assert/strict';
import {brandingDefaults,brandingError,contrast} from '../lib/site-branding.ts';

test('default palette is legible; unreadable text combinations are rejected',()=>{
 assert.equal(brandingError(brandingDefaults),'');
 assert(contrast('#147d67','#ffffff')>=4.5);
 assert.match(brandingError({...brandingDefaults,'site.color.primary':'#f0f0f0'}),/خوانا/);
 assert.match(brandingError({...brandingDefaults,'site.color.highlight':'#122b27'}),/تضاد/);
 assert.match(brandingError({...brandingDefaults,'site.color.hero':'#ffffff'}),/خوانا/);
 assert.match(brandingError({...brandingDefaults,'site.color.primary':'red'}),/شش‌رقمی/);
});
