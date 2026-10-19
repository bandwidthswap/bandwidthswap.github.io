// The local smoke: the Worker in workerd, the real SQL against a local D1, a signed report posted and every GET read.
//
//   npx -y wrangler@3 d1 execute bandwidthswap-status --local --file=migrations/0001.sql    # once
//   npx -y wrangler@3 dev --local --var ALLOW_TEST_KEYS:1                                    # another terminal
//   node smoke.mjs [http://localhost:8787] [--wait]
//
// It posts as the kit's vector Mint (a test-only key; the Worker takes it only with ALLOW_TEST_KEYS), so it can be
// run again and again: each run's report is newer than the last. A run within 60 s of the previous one meets the
// per-Mint rate and says so. `--wait` posts the same report a second time after 61 s, to show the rows a report
// with nothing changed writes. Exit 1 on any failure.
import { readFileSync } from 'node:fs';
import * as bsp from '../docs/bsp.js';
import { keyFromSeed, signObject, SEEDS, STATUS_DOMAIN, MAP_DOMAIN } from './sign.mjs';

process.removeAllListeners('warning');
process.on('warning', (w) => { if (w.name !== 'ExperimentalWarning') console.warn(w); });
await bsp.useEd25519('webcrypto');

const args = process.argv.slice(2);
const base = (args.find((a) => a.startsWith('http')) || 'http://localhost:8787').replace(/\/$/, '');
const wait = args.includes('--wait');
let failures = 0;
const check = (name, ok, detail) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : ': ' + detail)); if (!ok) failures++; };
const now = () => Math.floor(Date.now() / 1000);
const get = (path) => fetch(base + path);
const post = (path, text) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text });
const enc = new TextEncoder();

const { key, nym: MINT } = await keyFromSeed(SEEDS.mint.seed);
const live = JSON.parse(readFileSync(new URL('../tools/fixtures/report-bwkit-0.4.0.json', import.meta.url), 'utf8'));
const report = () => ({ ...live, kind: 'status', proto: 1, mint: MINT, generated_at: now(), proof: { ...live.proof, mint: MINT }, commitment: { ...live.commitment, mint: MINT } });
const windowsIn = live.nodes.reduce((n, x) => n + (x.history || []).length, 0);

console.log(base);
let r = await get('/');
let j = await r.json();
check('GET / answers, and Ed25519 works in this runtime', r.status === 200 && j.ed25519 === 'ok', r.status + ' ' + JSON.stringify(j).slice(0, 100));

let text = await signObject(key, STATUS_DOMAIN, report());
r = await post('/report', text);
j = await r.json();
if (r.status === 429) console.log('     (429: a run within 60 s of the last; ' + JSON.stringify(j) + ')');
check('POST /report with a signed report is 200 (or 429 right after another run)', r.status === 200 || r.status === 429, r.status + ' ' + JSON.stringify(j));
if (r.status === 200) console.log('     rows written for a report with ' + windowsIn + ' windows and a commitment: ' + j.rows_written + ' (a first report writes them all; a repeat writes only what changed)');
r = await post('/report', await signObject(key, STATUS_DOMAIN, { ...report(), generated_at: now() + 1 }));
check('…and a newer one right away is 429', r.status === 429, r.status);
r = await post('/report', text.replace(/"sig":"./, (m) => m.slice(0, -1) + (m.endsWith('A') ? 'B' : 'A')));
check('…a changed signature is 401', r.status === 401, r.status);

r = await get('/mints/' + MINT + '/status');
const served = await r.text();
check('GET /mints/<nym>/status serves it', r.status === 200, r.status);
const rec = bsp.parse(served);
const sig = rec.sig, received_at = rec.received_at;
delete rec.sig; delete rec.received_at;
const ok = await bsp.verifySignature(bsp.pubOfNym(MINT), enc.encode(STATUS_DOMAIN + '\n' + bsp.canon(rec)), bsp.unb64u(sig));
check('…and the served bytes, less received_at and sig, verify under the Mint (floats intact through D1)', ok && Number.isInteger(received_at));

r = await get('/mints/' + MINT + '/history');
j = await r.json();
check('GET /history has the report\'s windows and its commitment', r.status === 200 && j.windows.length >= windowsIn && j.commitments.length >= 1, r.status + ' ' + (j.windows || []).length + ' windows, ' + (j.commitments || []).length + ' commitments');
check('…cached for a minute', r.headers.get('Cache-Control') === 'public, max-age=60');

const mapText = await signObject(key, MAP_DOMAIN, { kind: 'map', proto: 1, by: MINT, at: now(), map: { mints: [{ nym: MINT, name: 'vec-mint', domain: 'vectors' }] } });
r = await post('/map', mapText);
j = await r.json();
check('POST /map from the vector Mint (ADMIN_MINTS in wrangler.toml is the lab\'s; dev passes with --var ADMIN_MINTS:<nym> or lists it) is 200 or 403', r.status === 200 || r.status === 403, r.status + ' ' + JSON.stringify(j));
const mapped = r.status === 200;
r = await get('/map');
check('GET /map ' + (mapped ? 'serves it as posted' : 'answers'), mapped ? (r.status === 200 && (await r.text()) === mapText) : r.status === 200 || r.status === 404, r.status);
r = await get('/mints');
j = await r.json();
check('GET /mints ' + (mapped ? 'lists the Mint' : 'counts it unlisted'), r.status === 200 && (mapped ? j.mints.some((m) => m.mint === MINT) : j.unlisted >= 1), JSON.stringify(j));
r = await get('/status');
check('GET /status (the default Mint) answers 200 or 404 locally', r.status === 200 || r.status === 404, r.status);
r = await fetch(base + '/status', { method: 'OPTIONS', headers: { Origin: 'https://example.com', 'Access-Control-Request-Method': 'GET' } });
check('OPTIONS allows any origin', r.status === 204 && r.headers.get('Access-Control-Allow-Origin') === '*');

if (wait) {
  console.log('     waiting 61 s for the per-Mint rate…');
  await new Promise((res) => setTimeout(res, 61000));
  r = await post('/report', await signObject(key, STATUS_DOMAIN, report()));
  j = await r.json();
  check('the same report 61 s later is 200', r.status === 200, r.status + ' ' + JSON.stringify(j));
  console.log('     rows written for a report with nothing changed: ' + j.rows_written + ' (the report, the Mint\'s row, the meter)');
}

console.log(failures ? failures + ' failed' : 'smoke passed');
process.exit(failures ? 1 : 0);
