// Runs the Worker in Node (20 or newer) against a KV and a D1 in memory: `node test.mjs`.
// The D1 is fake-d1.mjs, which implements each statement of src/sql.js by name; the real SQL runs in smoke.mjs.
import worker from './src/index.js';
import { readFileSync } from 'node:fs';
import { fakeD1 } from './fake-d1.mjs';
import { keyFromSeed, signObject, signText, SEEDS, STATUS_DOMAIN } from './sign.mjs';

process.removeAllListeners('warning');
process.on('warning', (w) => { if (w.name !== 'ExperimentalWarning') console.warn(w); });

const kv = new Map();
const db = fakeD1();
const LAB = 'ed25519:lQLEToBb2f98uPsrOIfVCV0YRN2VTJ8IVeJ0uDk6ysM';
const env = {
  STATUS: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } },
  STATUS_TOKEN: 'test-token-0123456789abcdef',
  DB: db,
  DEFAULT_MINT: LAB,
  ADMIN_MINTS: LAB,
  ALLOW_TEST_KEYS: '1',
};
const BASE = 'https://status.bandwidthswap.com';
const SITE = 'https://bandwidthswap.com';
let failures = 0;

function check(name, ok, detail) {
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : ': ' + detail));
  if (!ok) failures++;
}

const call = (path, init) => worker.fetch(new Request(BASE + path, init), env);
const post = (body, token = env.STATUS_TOKEN, origin) => call('/status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(origin ? { Origin: origin } : {}) },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

const win = (t_first, t_last, bytes, settled_bytes, disputed) => ({ t_first, t_last, bytes, settled_bytes, disputed });
const report = {
  v: 1, generated_at: 1792187273, bwkit: '0.1.2', phase: 0, window_s: 3600, since: 1792185254, service: true,
  ledger: { receipts: 7, acks: 5, settlements: 5, disputed: 2, receipts_without_ack: 1, acks_without_receipt: 0 },
  nodes: [
    { name: 'bw-house', role: 'payer', last_receipt: 1792186147, window_bytes: 2160, window_t_first: 1792186134, window_t_last: 1792186147, receipts: 7, windows: 5, disputed: 2,
      total_bytes: 65846000, history: [win(1792185254, 1792185266, 21950868, 1710, true), win(1792186134, 1792186147, 2160, 2160, false), win(1792186147, 1792188000, 8416, null, null)] },
    { name: 'bw-forest', role: 'hop', last_receipt: 1792186147, window_bytes: 5040, window_t_first: 1792186134, window_t_last: 1792186147, receipts: 5, windows: 5, disputed: 2,
      total_bytes: 43900000, history: [win(1792186134, 1792186147, 5040, 2160, false)] },
    { name: 'bw-mint', role: 'mint', last_receipt: 1792186147, window_bytes: 2160, window_t_first: 1792186134, window_t_last: 1792186147, receipts: 12, windows: 5, disputed: 2,
      total_bytes: 43900000, history: [win(1792186134, 1792186147, 2160, 2160, false)] },
  ],
};
const noHistory = { ...report, nodes: report.nodes.map(({ history, total_bytes, ...n }) => n) };
delete noHistory.since;

let r = await call('/status', { headers: { Origin: SITE } });
check('GET before any report is 404', r.status === 404, r.status);
check('…with CORS for any origin', r.headers.get('Access-Control-Allow-Origin') === '*');

r = await post(report, null);
check('POST without a token is 401', r.status === 401, r.status);
r = await post(report, 'wrong');
check('POST with the wrong token is 401', r.status === 401, r.status);
r = await post('{not json');
check('POST with bad JSON is 400', r.status === 400, r.status);
r = await post({ ...report, nodes: [] });
check('POST with no nodes is 400', r.status === 400, r.status);
r = await post({ ...report, nodes: [{ name: 'bw-house', role: 'router' }] });
check('POST with an unknown role is 400', r.status === 400, r.status);
r = await post({ ...report, nodes: [{ name: 'BW House', role: 'payer' }] });
check('POST with a bad name is 400', r.status === 400, r.status);
r = await post({ ...report, note: 'bw-mint is 192.168.0.61' });
check('POST carrying an IPv4 address is 400', r.status === 400, r.status);
r = await post({ ...report, note: 'b8:27:eb:6b:1b:09' });
check('POST carrying a MAC address is 400', r.status === 400, r.status);
r = await post({ ...report, pad: 'x'.repeat(65 * 1024) });
check('POST over 64 KB is 413', r.status === 413, r.status);
r = await post({ ...report, nodes: [{ ...report.nodes[0], history: Array.from({ length: 49 }, (_, i) => win(i, i + 1, 1, 1, false)) }] });
check('POST with a history of 49 windows is 400', r.status === 400, r.status);
r = await post({ ...report, nodes: [{ ...report.nodes[0], history: [win(5, 4, 1, 1, false)] }] });
check('POST with a window ending before it starts is 400', r.status === 400, r.status);
r = await post({ ...report, nodes: [{ ...report.nodes[0], history: [{ t_first: 1, t_last: 2, bytes: '9', settled_bytes: null, disputed: null }] }] });
check('POST with a string byte count is 400', r.status === 400, r.status);
r = await post({ ...report, nodes: [{ ...report.nodes[0], total_bytes: -1 }] });
check('POST with a negative total is 400', r.status === 400, r.status);
r = await post({ ...report, since: 'yesterday' });
check('POST with a bad since is 400', r.status === 400, r.status);
r = await call('/status', { headers: { Origin: SITE } });
check('nothing was stored by the refused posts', r.status === 404, r.status);

r = await post(noHistory);
check('a POST from an older reporter, without history, is 200', r.status === 200, r.status);
r = await post(report);
check('a good POST with history is 200', r.status === 200, r.status);
const posted = await r.json();
check('…and answers with received_at', Number.isInteger(posted.received_at) && posted.stored === true);

r = await call('/status', { headers: { Origin: SITE } });
check('GET after the post is 200', r.status === 200, r.status);
const got = await r.json();
check('…returns the report with received_at added', got.generated_at === report.generated_at && got.received_at === posted.received_at && got.nodes.length === 3);
check('…history and totals intact', got.nodes[0].history.length === 3 && got.nodes[0].history[2].settled_bytes === null && got.nodes[0].total_bytes === 65846000 && got.since === report.since);
check('…with CORS for any origin', r.headers.get('Access-Control-Allow-Origin') === '*');
check('…and a short cache', r.headers.get('Cache-Control') === 'public, max-age=30');
r = await call('/status', { headers: { Origin: 'https://example.com' } });
check('GET from another origin gets * too: the feed is public', r.status === 200 && r.headers.get('Access-Control-Allow-Origin') === '*');
// bwkit 0.3.0 adds the Mint's NYM, the committed hour's proof and, once the Steward runs, its book (PLAN.md 2.5).
// The two fixtures are a real report with a real proof from bw-mint, and the same with a hand-made Steward object.
const fixture = (name) => JSON.parse(readFileSync(new URL('../tools/fixtures/' + name, import.meta.url), 'utf8'));
const withProof = fixture('report-with-proof.json'), withSteward = fixture('report-with-steward.json');
const clone = (o) => JSON.parse(JSON.stringify(o));
const NYM = 'ed25519:lQLEToBb2f98uPsrOIfVCV0YRN2VTJ8IVeJ0uDk6ysM';

r = await post(withProof);
check('a report with the Mint on its commitment and a real proof is 200', r.status === 200, r.status + ' ' + (await r.text()));
r = await post({ ...withProof, mint: NYM });
check('…and with mint at the top level too', r.status === 200, r.status);
r = await post({ ...withProof, mint: 'lQLEToBb2f98uPsrOIfVCV0YRN2VTJ8IVeJ0uDk6ysM' });
check('a mint without its ed25519: prefix is 400', r.status === 400, r.status);
r = await post({ ...withProof, commitment: { ...withProof.commitment, mint: 'ed25519:short' } });
check('a commitment.mint of the wrong length is 400', r.status === 400, r.status);
let bad = clone(withProof); bad.proof.kind = 'commitment';
r = await post(bad);
check('a proof that is not kind "proof" is 400', r.status === 400, r.status);
bad = clone(withProof); bad.proof.root = bad.proof.root.slice(0, 63);
r = await post(bad);
check('a proof with a short root is 400', r.status === 400, r.status);
bad = clone(withProof); bad.proof.count = 49;
r = await post(bad);
check('a proof claiming 49 settlements is 400', r.status === 400, r.status);
bad = clone(withProof); bad.proof.settlements.push(bad.proof.settlements[0]);
r = await post(bad);
check('a proof with more entries than its count is 400', r.status === 400, r.status);
bad = clone(withProof); bad.proof.settlements[0].index = 1;
r = await post(bad);
check('a proof entry indexed past the count is 400', r.status === 400, r.status);
bad = clone(withProof); bad.proof.settlements[0].path = [['M', bad.proof.root]];
r = await post(bad);
check('a path step that is not L or R is 400', r.status === 400, r.status);
bad = clone(withProof); bad.proof.settlements[0].settlement.status = 'paid';
r = await post(bad);
check('a settlement with an unknown status is 400', r.status === 400, r.status);
bad = clone(withProof); bad.proof.settlements[0].settlement.hop = 'bw-neighbor';
r = await post(bad);
check('a settlement whose hop is a name, not a NYM, is 400', r.status === 400, r.status);
bad = clone(withProof); bad.proof.signature = bad.proof.signature + '=';
r = await post(bad);
check('a proof signature with padding is 400', r.status === 400, r.status);
r = await post({ ...withProof, proof: null });
check('proof: null is 200 (no commitment yet)', r.status === 200, r.status);

r = await post(withSteward);
check('a report with the Steward\'s book is 200', r.status === 200, r.status + ' ' + (await r.text()));
bad = clone(withSteward); bad.steward.purchases[0].route.to = 'bw_neighbor';
r = await post(bad);
check('a route to a name with an underscore is 400', r.status === 400, r.status);
bad = clone(withSteward); bad.steward.purchases[2].route.from = '*';
r = await post(bad);
check('a route from "*" is 400 (any relay is null)', r.status === 400, r.status);
bad = clone(withSteward); bad.steward.purchases[3].route.not_via = ['house', 'Next Door'];
r = await post(bad);
check('a not_via with a bad name is 400', r.status === 400, r.status);
bad = clone(withSteward); bad.steward.payouts[0].hop = 'ed25519:Y_rtP6d0teob8J1qJttIOoZ17FLi5PG29HaZ-tE7IoY';
r = await post(bad);
check('a payout naming its hop by NYM, not name, is 400', r.status === 400, r.status);
bad = clone(withSteward); bad.steward.purchases[0].program = 'bounty';
r = await post(bad);
check('an unknown program is 400', r.status === 400, r.status);
bad = clone(withSteward); bad.steward.f = 1.5;
r = await post(bad);
check('f above 1 is 400', r.status === 400, r.status);
bad = clone(withSteward); bad.steward.paid_usd = -0.00008;
r = await post(bad);
check('a negative balance is 400', r.status === 400, r.status);
bad = clone(withSteward); bad.steward.purchases = Array.from({ length: 33 }, () => clone(withSteward.steward.purchases[0]));
r = await post(bad);
check('33 purchases is 400', r.status === 400, r.status);
bad = clone(withSteward); bad.steward.map.places[0].medium = 'Wi-Fi at 192.168.0.1';
r = await post(bad);
check('a Steward object smuggling an IPv4 address in a label is 400', r.status === 400, r.status);
bad = clone(withSteward); bad.steward.purchases[0].note = 'posted from b8:27:eb:6b:1b:09';
r = await post(bad);
check('a Steward object smuggling a MAC address in an extra field is 400', r.status === 400, r.status);
bad = clone(withSteward); delete bad.steward.links; delete bad.steward.map; delete bad.steward.cap_margin;
for (const p of bad.steward.purchases) { delete p.poster; delete p.refunded_usd; delete p.target_usd; delete p.matches; }
for (const y of bad.steward.payouts) { delete y.settled_bytes; delete y.purchase; delete y.refund_usd; }
r = await post(bad);
check('the strict PLAN.md 2.5 shape, without the optional fields, is 200', r.status === 200, r.status + ' ' + (await r.text()));
r = await post({ ...withSteward, steward: null });
check('steward: null is 200 (the Steward has not run)', r.status === 200, r.status);
r = await call('/status', { headers: { Origin: SITE } });
const last = await r.json();
check('the stored report is the last good one, with the Steward absent', r.status === 200 && last.steward === null && last.proof.count === 1);

r = await call('/status', { method: 'OPTIONS', headers: { Origin: SITE, 'Access-Control-Request-Method': 'GET' } });
check('OPTIONS is 204 and allows GET only', r.status === 204 && r.headers.get('Access-Control-Allow-Methods') === 'GET, OPTIONS');
r = await call('/status', { method: 'DELETE' });
check('DELETE is 405', r.status === 405, r.status);
r = await call('/elsewhere');
check('another path is 404', r.status === 404, r.status);
r = await call('/');
const about = await r.json();
check('/ says what this is, the routes, the default Mint, and that Ed25519 works here', r.status === 200 && about.ed25519 === 'ok' && about.default_mint === LAB && Object.keys(about.routes).length === 6, JSON.stringify(about).slice(0, 200));
r = await worker.fetch(new Request(BASE + '/status', { method: 'POST', headers: { Authorization: 'Bearer x' }, body: '{}' }), { STATUS: env.STATUS });
check('POST with no token configured is 503', r.status === 503, r.status);

// ---------------------------------------------------------------- POST /report: signed records (PLAN.md 2.1)
// The clock is the test's: Date.now is skewed forward by tick() so the per-Mint rate (60 s) and freshness (300 s)
// rules can be exercised without waiting.
const realNow = Date.now;
let skew = 0;
Date.now = () => realNow() + skew;
const tick = (s = 61) => { skew += s * 1000; };
const now = () => Math.floor(Date.now() / 1000);
const today = () => new Date(Date.now()).toISOString().slice(0, 10);
const meterNow = () => db.tables.meter.get(today()) || 0;

const { key: mintKey, nym: MINT } = await keyFromSeed(SEEDS.mint.seed);
const { key: hopKey, nym: HOP } = await keyFromSeed(SEEDS.hop.seed);
check('the vector seeds rebuild their NYMs', MINT === SEEDS.mint.nym && HOP === SEEDS.hop.nym);
const without = (o, ...keys) => { const c = { ...o }; for (const k of keys) delete c[k]; return c; };
const record = (base, extra = {}, nym = MINT) => ({ ...base, kind: 'status', proto: 1, mint: nym, generated_at: now(), ...extra });
const signedReport = (extra = {}, key = mintKey, nym = MINT, base = report) => signObject(key, STATUS_DOMAIN, record(base, extra, nym));
const postReport = (text, e = env) => worker.fetch(new Request(BASE + '/report', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.com' }, body: text }), e);

let text = await signedReport();
r = await postReport(text);
let body = await r.json();
check('a signed report from the vector Mint is 200', r.status === 200, r.status + ' ' + JSON.stringify(body));
check('…answers stored and received_at', body.stored === true && body.received_at === now());
check('…with CORS for any origin', r.headers.get('Access-Control-Allow-Origin') === '*');
let stored = db.tables.reports.get(MINT);
check('…the bytes as received are stored, with the signature', stored && stored.body === text && /^[A-Za-z0-9_-]{86}$/.test(stored.sig) && stored.generated_at === now());
let mintRow = db.tables.mints.get(MINT);
check('…the Mint has a row, named after its mint node, first and last seen now, unlisted', mintRow && mintRow.name === 'bw-mint' && mintRow.domain === null && mintRow.first_seen === now() && mintRow.last_seen === now() && mintRow.listed === 0);
check('…its five windows are in the table', db.tables.windows.size === 5 && [...db.tables.windows.values()].every((w) => w.mint === MINT));
check('…the unsettled window keeps null settled_bytes and disputed', [...db.tables.windows.values()].some((w) => w.t_first === 1792186147 && w.settled_bytes === null && w.disputed === null));
check('…the disputed window is stored as 1', [...db.tables.windows.values()].some((w) => w.t_first === 1792185254 && w.disputed === 1 && w.settled_bytes === 1710));
check('…no commitment, since the report had none', db.tables.commitments.size === 0);
check('…the meter counts the rows: report, mint, five windows, the prune stamp, and itself', meterNow() === 9, meterNow());
check('…and pruned_at is stamped', mintRow.pruned_at === now());

const at = text.lastIndexOf('"sig":"') + 7;   // the first character, not the last: that one carries four padding bits
r = await postReport(text.slice(0, at) + (text[at] === 'A' ? 'B' : 'A') + text.slice(at + 1));
check('a signature with one character changed is 401', r.status === 401, r.status);
r = await postReport(await signedReport({}, hopKey, MINT));
check('a record signed by another key, claiming the Mint\'s NYM, is 401', r.status === 401, r.status);
r = await postReport('{not json');
check('a body that is not JSON is 400', r.status === 400, r.status);
r = await postReport(await signedReport({ kind: 'report' }));
check('kind other than "status" is 422', r.status === 422, r.status);
r = await postReport(await signedReport({ proto: 2 }));
check('proto other than 1 is 422', r.status === 422, r.status);
r = await postReport(await signObject(mintKey, STATUS_DOMAIN, without(record(report), 'mint')));
check('a record without mint is 422', r.status === 422, r.status);
r = await postReport(text.replace(/"sig":"[^"]+"/, '"sig":"abc"'));
check('a sig that is not 86 base64url characters is 422', r.status === 422, r.status);
r = await postReport(await signedReport({ note: 'bw-mint is 192.168.0.61' }));
check('an address in the signed body is 422', r.status === 422, r.status);
r = await postReport(await signedReport({ received_at: 1 }));
check('a posted received_at is 422', r.status === 422, r.status);
r = await postReport(await signedReport({ nodes: [{ name: 'bw-house', role: 'router' }] }));
check('a shape fault of the report is 422 here (400 on the token path)', r.status === 422, r.status);
r = await postReport(await signedReport({ pad: 'x'.repeat(65 * 1024) }));
check('over 64 KB is 413', r.status === 413, r.status);
r = await postReport(await signedReport(), { ...env, ALLOW_TEST_KEYS: undefined });
check('a vector key is 403 unless ALLOW_TEST_KEYS is set', r.status === 403, r.status);
r = await postReport(await signedReport({ generated_at: now() - 301 }));
check('generated_at 301 s in the past is 409', r.status === 409, r.status);
r = await postReport(await signedReport({ generated_at: now() + 301 }));
check('generated_at 301 s in the future is 409', r.status === 409, r.status);
r = await postReport(text);
check('the same record again is 409 (generated_at not newer)', r.status === 409, r.status);
r = await postReport(await signedReport({ generated_at: now() + 1 }));
check('a newer record within 60 s of the last is 429, with Retry-After', r.status === 429 && r.headers.get('Retry-After') === '60', r.status + ' ' + r.headers.get('Retry-After'));
check('…and nothing of the refused posts was stored', db.tables.reports.get(MINT).body === text && meterNow() === 9);

tick();
const before = meterNow();
r = await postReport(await signedReport());
check('61 s later the next report is 200', r.status === 200, r.status);
check('…and with no window changed, the batch wrote the report and the Mint only: 3 rows with the meter', meterNow() - before === 3, meterNow() - before);
tick();
const settled = { ...report, nodes: report.nodes.map((n, i) => i ? n : { ...n, history: n.history.map((w, j) => j === 2 ? { ...w, settled_bytes: 8416, disputed: false } : w) }) };
r = await postReport(await signedReport({}, mintKey, MINT, settled));
check('a report that settles one window writes that one row more', r.status === 200 && meterNow() - before === 7, (meterNow() - before) + ' ' + r.status);
check('…and the window is updated in place', [...db.tables.windows.values()].find((w) => w.t_first === 1792186147).settled_bytes === 8416 && db.tables.windows.size === 5);

// The float trap: a settlement in the proof carries a fee the Mint wrote as 0.0 (Python writes a whole-valued float
// so). The signer signs the text it wrote, bsp.parse keeps the float, and the signature verifies; the same record
// through JSON.stringify loses it, and the same signature no longer does.
tick();
const proofRecord = record(withProof, { proof: { ...withProof.proof, mint: MINT }, commitment: { ...withProof.commitment, mint: MINT } });
proofRecord.proof.settlements[0].settlement.fee_usd = 0;
text = await signText(mintKey, STATUS_DOMAIN, JSON.stringify(proofRecord).replace('"fee_usd":0', '"fee_usd":0.0'));
check('the signed text carries the whole-valued float as 0.0', /"fee_usd":0\.0[,}]/.test(text));
r = await postReport(text);
check('a report with a real proof and commitment is 200', r.status === 200, r.status + ' ' + (await r.text()));
check('…and the commitment is in its table', db.tables.commitments.get(MINT + '|' + withProof.commitment.window)?.root === withProof.commitment.root);
r = await postReport(JSON.stringify(JSON.parse(text)));
check('the same record through JSON.stringify (0.0 becomes 0) no longer verifies: 401', r.status === 401, r.status);

// A Mint describes itself: the name, the domain and the places come out of the report.
tick();
r = await postReport(await signedReport({ proof: { ...withSteward.proof, mint: MINT }, commitment: { ...withSteward.commitment, mint: MINT } }, mintKey, MINT, withSteward));
mintRow = db.tables.mints.get(MINT);
check('the Oct 17 Steward shape gives the Mint its domain and places', r.status === 200 && mintRow.domain === 'earth' && mintRow.places === '["house","next-door","cabin"]', r.status + ' ' + JSON.stringify(mintRow));
const live = fixture('report-bwkit-0.4.0.json');
tick();
r = await postReport(await signedReport({ proof: { ...live.proof, mint: MINT }, commitment: { ...live.commitment, mint: MINT } }, mintKey, MINT, live));
mintRow = db.tables.mints.get(MINT);
check('what bwkit 0.4.0 posts today, signed, is 200', r.status === 200, r.status + ' ' + (await r.text()));
check('…and gives the Mint its domain and places from the kit\'s map shape', mintRow.domain === 'earth' && mintRow.places === '["house","next-door","the-cabin"]', JSON.stringify(mintRow));
check('…and every window of its four nodes is in the table', live.nodes.every((n) => (n.history || []).every((w) => db.tables.windows.has(MINT + '|' + n.name + '|' + w.t_first))));
tick();
r = await postReport(await signedReport({ name: 'lab', domain: 'texas' }));
check('a Mint may say its own name and domain', r.status === 200 && db.tables.mints.get(MINT).name === 'lab' && db.tables.mints.get(MINT).domain === 'texas');
r = await postReport(await signedReport({ name: 'The Lab' }));
check('…as names', r.status === 422, r.status);
r = await postReport(await signedReport({ proof: { ...withProof.proof, mint: LAB } }));
check('a proof that is another Mint\'s is 422', r.status === 422, r.status);

tick();
r = await postReport(await signedReport({}, hopKey, HOP));
check('a second Mint (the vector hop posting as a Mint) is 200', r.status === 200, r.status);
check('…and the tables hold both', db.tables.reports.size === 2 && db.tables.mints.size === 2);

r = await post(live);
check('the token path takes what bwkit 0.4.0 posts today, unchanged: 200', r.status === 200, r.status + ' ' + (await r.text()));
r = await call('/report', { method: 'OPTIONS', headers: { Origin: 'https://example.com', 'Access-Control-Request-Method': 'POST' } });
check('OPTIONS /report allows POST from any origin', r.status === 204 && r.headers.get('Access-Control-Allow-Methods') === 'GET, POST, OPTIONS' && r.headers.get('Access-Control-Allow-Origin') === '*');
r = await call('/report');
check('GET /report is 405', r.status === 405, r.status);

// ---------------------------------------------------------------- the GETs (PLAN.md 2.3)
r = await call('/status');
let got2 = await r.json();
check('/status falls back to the KV key while D1 has nothing for the default Mint', r.status === 200 && got2.generated_at === live.generated_at && got2.sig === undefined, r.status);
check('…with any origin allowed and the short cache', r.headers.get('Access-Control-Allow-Origin') === '*' && r.headers.get('Cache-Control') === 'public, max-age=30');
r = await call('/mints/' + MINT + '/status');
const rawMint = await r.text();
stored = db.tables.reports.get(MINT);
check('/mints/<nym>/status serves the Mint\'s latest report', r.status === 200 && rawMint.startsWith(stored.body.slice(0, -1)), r.status);
got2 = JSON.parse(rawMint);
check('…as the bytes it signed with received_at added', got2.sig === stored.sig && got2.received_at === stored.received_at && got2.name === 'lab' && rawMint.endsWith('"received_at":' + stored.received_at + '}'));
check('…so that removing received_at and sig gives back the signed text', JSON.stringify(JSON.parse(rawMint.replace(',"received_at":' + stored.received_at + '}', '}'))) === JSON.stringify(JSON.parse(stored.body)));
r = await call('/mints/' + HOP + '/status');
check('an unlisted Mint is reachable by its NYM', r.status === 200, r.status);
r = await call('/mints/ed25519:lQLEToBb2f98uPsrOIfVCV0YRN2VTJ8IVeJ0uDk6ysM/status');
check('a Mint that never posted is 404', r.status === 404, r.status);
r = await call('/mints/not-a-nym/status');
check('a path with something that is not a NYM is 404', r.status === 404, r.status);
r = await call('/mints');
got2 = await r.json();
check('/mints before any map lists nobody and counts the two unlisted', r.status === 200 && got2.mints.length === 0 && got2.unlisted === 2, JSON.stringify(got2));
r = await call('/mints/' + MINT + '/history');
got2 = await r.json();
check('/history defaults to a week and names the span', r.status === 200 && got2.hours === 168 && got2.since === now() - 168 * 3600 && got2.mint === MINT, JSON.stringify(got2).slice(0, 120));
check('…with the windows of every report the Mint posted in it', got2.windows.length === [...db.tables.windows.values()].filter((w) => w.mint === MINT).length && got2.windows.every((w) => w.t_first >= got2.since) && live.nodes.every((n) => (n.history || []).every((w) => got2.windows.some((x) => x.node === n.name && x.t_first === w.t_first))), got2.windows.length + ' of ' + db.tables.windows.size);
check('…disputed as a flag again, settled_bytes null while unsettled', got2.windows.some((w) => w.disputed === true) && got2.windows.some((w) => w.disputed === null && w.settled_bytes === null));
check('…and its commitments, oldest first', got2.commitments.length === 2 && got2.commitments[0].window < got2.commitments[1].window && got2.commitments[1].root === live.commitment.root, JSON.stringify(got2.commitments));
check('…cached for a minute', r.headers.get('Cache-Control') === 'public, max-age=60');
r = await call('/mints/' + MINT + '/history?hours=1');
got2 = await r.json();
check('?hours=1 narrows the span', got2.hours === 1 && got2.windows.length === 0 && got2.commitments.length === 0, JSON.stringify(got2).slice(0, 120));
r = await call('/mints/' + MINT + '/history?hours=9999');
check('?hours above 744 is clamped to 744', (await r.json()).hours === 744);
r = await call('/mints/' + MINT + '/history?hours=soon');
check('?hours that is not a number is 400', r.status === 400, r.status);
r = await call('/mints/' + HOP + '/history');
check('an unlisted Mint\'s history is served too, only its own windows', r.status === 200 && (await r.json()).windows.length === 5, r.status);
r = await call('/mints/ed25519:lQLEToBb2f98uPsrOIfVCV0YRN2VTJ8IVeJ0uDk6ysM/history');
check('a history of a Mint that never posted is 404', r.status === 404, r.status);
r = await call('/map');
check('/map before any map is 404', r.status === 404, r.status);
r = await call('/map', { method: 'OPTIONS', headers: { Origin: SITE, 'Access-Control-Request-Method': 'POST' } });
check('OPTIONS /map allows POST', r.status === 204 && r.headers.get('Access-Control-Allow-Methods') === 'GET, POST, OPTIONS');
Date.now = realNow;

console.log(failures ? failures + ' failed' : 'all passed');
process.exit(failures ? 1 : 0);
