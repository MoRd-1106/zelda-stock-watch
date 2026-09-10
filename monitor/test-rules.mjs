import assert from 'node:assert/strict';
import { classifyHtml } from './monitor.mjs';
import { STORES } from './stores.mjs';

const gameStop = STORES.find((s) => s.id === 'gamestop-us');
const target = STORES.find((s) => s.id === 'target-us');

const falsePositive = `
  <h1>Nintendo Switch 2 The Legend of Zelda 40th Anniversary Edition</h1>
  <button>ADD TO CART</button>
  <div>Currently Unavailable</div>
  <button>Coming Soon</button>
  <span>$519.99</span>
`;
assert.equal(classifyHtml(gameStop, falsePositive).status, 'COMING_SOON');

const preorder = `
  <h1>Nintendo Switch 2 The Legend of Zelda 40th Anniversary Edition</h1>
  <span>$519.99</span>
  <button>Preorder now</button>
`;
assert.equal(classifyHtml(target, preorder).status, 'PREORDER');

const blocked = `Sorry, you have been blocked. Cloudflare Ray ID`;
assert.equal(classifyHtml(gameStop, blocked, 403).status, 'BLOCKED');

console.log('✓ Reglas anti-falsos-positivos verificadas.');
