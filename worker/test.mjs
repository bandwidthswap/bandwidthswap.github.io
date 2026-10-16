// Runs the Worker in Node (20 or newer) against a KV in memory: `node test.mjs`.
import worker from './src/index.js';

const kv = new Map();
const env = {
  STATUS: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } },
  STATUS_TOKEN: 'test-token-0123456789abcdef',
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
check('…with CORS for the site', r.headers.get('Access-Control-Allow-Origin') === SITE);

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
check('…with CORS for https://bandwidthswap.com', r.headers.get('Access-Control-Allow-Origin') === SITE);
check('…and a short cache', r.headers.get('Cache-Control') === 'public, max-age=30');
r = await call('/status', { headers: { Origin: 'https://example.com' } });
check('GET from another origin has no CORS header', r.status === 200 && r.headers.get('Access-Control-Allow-Origin') === null);
r = await call('/status', { headers: { Origin: 'http://localhost:8765' } });
check('GET from localhost has CORS (a local copy of the page)', r.headers.get('Access-Control-Allow-Origin') === 'http://localhost:8765');
r = await call('/status', { method: 'OPTIONS', headers: { Origin: SITE, 'Access-Control-Request-Method': 'GET' } });
check('OPTIONS is 204 and allows GET only', r.status === 204 && r.headers.get('Access-Control-Allow-Methods') === 'GET, OPTIONS');
r = await call('/status', { method: 'DELETE' });
check('DELETE is 405', r.status === 405, r.status);
r = await call('/elsewhere');
check('another path is 404', r.status === 404, r.status);
r = await call('/');
check('/ is one line of text', r.status === 200 && (r.headers.get('Content-Type') || '').startsWith('text/plain'));
r = await worker.fetch(new Request(BASE + '/status', { method: 'POST', headers: { Authorization: 'Bearer x' }, body: '{}' }), { STATUS: env.STATUS });
check('POST with no token configured is 503', r.status === 503, r.status);

console.log(failures ? failures + ' failed' : 'all passed');
process.exit(failures ? 1 : 0);
