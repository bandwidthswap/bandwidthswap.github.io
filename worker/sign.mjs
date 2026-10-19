// Signs records in Node the way a Mint does, for test.mjs and smoke.mjs: the domain string, a newline and the
// canonical JSON of the record without `sig` (the kit's spec/PROTOCOL.md, Section 3), Ed25519 through WebCrypto.
// A key comes from one of the kit's test seeds (spec/vectors/keys.json: published, test-only, refused by the Worker
// unless ALLOW_TEST_KEYS is set). WebCrypto takes a private key as PKCS#8: a fixed 16-byte prefix and the seed.
import * as bsp from '../docs/bsp.js';

const PKCS8_PREFIX = '302e020100300506032b657004220420';
const enc = new TextEncoder();

export const STATUS_DOMAIN = 'bandwidthswap/status/v1';
export const MAP_DOMAIN = 'bandwidthswap/map/v1';

// The kit's three vector keys, by role. `test.mjs` and `smoke.mjs` post as the vector Mint.
export const SEEDS = {
  hop: { nym: 'ed25519:7NXLckho5kxw7Bht2Dcjv_v4-ShUgY1sAdYX3V0RVec', seed: '37de99ca6d1d1f7de3ae97914e8a05d09e222ac72156bcb33b78694f4075b86c' },
  mint: { nym: 'ed25519:ZSkFPo6PQCl9IKHZpRXT7zp_1vBFqEcpwW0Zucj1Wsg', seed: '0ef04a03dfb962cf962708dc2f2ee8d408452af54bf251f53a7e8dd3a3347093' },
  payer: { nym: 'ed25519:IGSk-aXtuMXYJ8tMVPFTPqR2hXXtCjkDgRKur2IWVuM', seed: '0682cebd3b5d957c0b79e4987ffe8179b6f6854cb66e645b05e8739f97b90563' },
};

export async function keyFromSeed(seedHex) {
  const pkcs8 = Buffer.concat([Buffer.from(PKCS8_PREFIX, 'hex'), Buffer.from(seedHex, 'hex')]);
  const key = await crypto.subtle.importKey('pkcs8', pkcs8, { name: 'Ed25519' }, true, ['sign']);
  const nym = 'ed25519:' + (await crypto.subtle.exportKey('jwk', key)).x;
  return { key, nym };
}

// The signature over a record (an object without `sig`), as base64url.
export async function signRecord(key, domain, record) {
  const sig = await crypto.subtle.sign('Ed25519', key, enc.encode(domain + '\n' + bsp.canon(record)));
  return Buffer.from(sig).toString('base64url');
}

// Sign the text of a record and return the text with `sig` added: what a client that serialises first and signs
// what it wrote would post. The signature is over the canonical form of the parsed text, floats kept.
export async function signText(key, domain, text) {
  const rec = bsp.parse(text);
  delete rec.sig;
  const sig = await signRecord(key, domain, rec);
  const end = text.lastIndexOf('}');
  return text.slice(0, end) + ',"sig":"' + sig + '"}';
}

// Sign a record built in code and return its canonical text with `sig` added. canon writes the fields the kit
// writes as floats (amount_usd, fee_usd, ...) as floats even when whole, as the kit's Python does.
export async function signObject(key, domain, record) {
  const { sig: _, ...rec } = record;
  const text = bsp.canon(rec);
  const sig = await signRecord(key, domain, rec);
  return text.slice(0, -1) + ',"sig":"' + sig + '"}';
}
