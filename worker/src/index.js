// status.bandwidthswap.com: the Phase 0 lab's status.
//
// The three Pis on the bench accept nothing from the internet, so the page
// cannot ask them anything. Instead the Mint (bw-mint) posts a summary of its
// ledger here every two minutes (the kit's `bwkit report`), and the page reads
// it back. One key in KV holds the latest report.
//
//   POST /status   Authorization: Bearer <STATUS_TOKEN>, body: the report (JSON)
//   GET  /status   the latest report, with `received_at` (Unix seconds) added;
//                  CORS for the site
//   GET  /         one line of text
//
// A report is names and roles: node names, roles, times and byte counts. The
// Worker refuses a body that carries an IPv4 or a MAC address, so a LAN detail
// cannot leak through a careless reporter.

const KEY = 'status';
const MAX_BODY = 16 * 1024;
const ROLES = new Set(['payer', 'hop', 'mint', 'peer']);
const ORIGINS = new Set(['https://bandwidthswap.com', 'https://www.bandwidthswap.com']);
const PRIVATE = [
  /\b\d{1,3}(?:\.\d{1,3}){3}\b/,              // an IPv4 address
  /\b[0-9a-f]{2}(?::[0-9a-f]{2}){5}\b/i,      // a MAC address
];

// The site, and a local copy of the page while working on it.
function allowOrigin(origin) {
  if (!origin) return null;
  if (ORIGINS.has(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}

function headers(origin, extra) {
  const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra };
  const o = allowOrigin(origin);
  if (o) {
    h['Access-Control-Allow-Origin'] = o;
    h['Vary'] = 'Origin';
  }
  return h;
}

function json(obj, status, origin, extra) {
  return new Response(JSON.stringify(obj), { status, headers: headers(origin, extra) });
}

// Compare two strings without leaking where they differ: hash both, compare the digests.
async function sameToken(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < u.length; i++) diff |= u[i] ^ v[i];
  return diff === 0;
}

// What a report must look like. Returns a reason, or null when it is fine.
export function checkReport(report, text) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) return 'the body must be a JSON object';
  if (!Number.isInteger(report.generated_at) || report.generated_at <= 0) return 'generated_at must be Unix seconds';
  if (!Array.isArray(report.nodes) || report.nodes.length < 1 || report.nodes.length > 16) return 'nodes must list 1 to 16 nodes';
  for (const n of report.nodes) {
    if (!n || typeof n !== 'object' || Array.isArray(n)) return 'each node must be an object';
    if (typeof n.name !== 'string' || !/^[a-z0-9][a-z0-9-]{0,31}$/.test(n.name)) return 'a node name is 1 to 32 of a-z, 0-9 and -';
    if (!ROLES.has(n.role)) return 'a node role is payer, hop, mint or peer';
  }
  for (const pat of PRIVATE) {
    if (pat.test(text)) return 'a report may not carry an address';
  }
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: headers(origin, {
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }),
      });
    }

    if (url.pathname === '/' && request.method === 'GET') {
      return new Response('status.bandwidthswap.com: GET /status is the Phase 0 lab\'s status, posted by the Mint. See https://bandwidthswap.com/#lab\n',
        { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    if (url.pathname !== '/status') return json({ error: 'no such path' }, 404, origin);

    if (request.method === 'GET') {
      const raw = await env.STATUS.get(KEY);
      if (!raw) return json({ error: 'no report yet' }, 404, origin);
      return new Response(raw, { status: 200, headers: headers(origin, { 'Cache-Control': 'public, max-age=30' }) });
    }

    if (request.method === 'POST') {
      if (!env.STATUS_TOKEN) return json({ error: 'no token configured' }, 503, origin);
      const auth = request.headers.get('Authorization') || '';
      const given = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
      if (!given || !(await sameToken(given, env.STATUS_TOKEN))) {
        return json({ error: 'bad token' }, 401, origin, { 'WWW-Authenticate': 'Bearer' });
      }
      const text = await request.text();
      if (text.length > MAX_BODY) return json({ error: 'too large' }, 413, origin);
      let report;
      try {
        report = JSON.parse(text);
      } catch (e) {
        return json({ error: 'bad JSON' }, 400, origin);
      }
      const why = checkReport(report, text);
      if (why) return json({ error: why }, 400, origin);
      const received_at = Math.floor(Date.now() / 1000);
      await env.STATUS.put(KEY, JSON.stringify({ ...report, received_at }));
      return json({ stored: true, received_at }, 200, origin);
    }

    return json({ error: 'method not allowed' }, 405, origin, { Allow: 'GET, POST, OPTIONS' });
  },
};
