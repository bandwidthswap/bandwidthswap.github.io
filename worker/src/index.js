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
// A report is names and roles: node names, roles, times and byte counts, and
// per node a history of its last twelve hours' windows; since bwkit 0.3.0 also
// the Mint's NYM, the committed hour's proof (so a browser can check the
// commitment against the Mint's key) and, once the Steward runs, its book.
// NYMs are public keys and may appear. The Worker refuses a body that carries
// an IPv4 or a MAC address, so a LAN detail cannot leak through a careless
// reporter.

const KEY = 'status';
const MAX_BODY = 64 * 1024;
const MAX_HISTORY = 48;
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

const count = (v) => v === null || v === undefined || (Number.isInteger(v) && v >= 0);   // a byte count or a time, or none
const flag = (v) => v === null || v === undefined || typeof v === 'boolean';
const money = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;            // an amount in the unit, never negative
const fraction = (v) => typeof v === 'number' && v >= 0 && v <= 1;
const NAME = /^[a-z0-9][a-z0-9-]{0,31}$/;                                              // a node or place name
const NYM = /^ed25519:[A-Za-z0-9_-]{43}$/;                                             // 32 bytes of public key, base64url
const HEX64 = /^[0-9a-f]{64}$/;
const SIG = /^[A-Za-z0-9_-]{86}$/;                                                     // 64 bytes of Ed25519 signature, base64url
const ID = /^[a-z0-9][a-z0-9-]{0,31}$/;                                                // a purchase id
const WORD = /^[a-z_]{1,16}$/;                                                         // a status
const TEXT = /^[\x20-\x7e]{0,40}$/;                                                    // a short label (a medium, a range class)
const PROGRAMS = new Set(['payer', 'match', 'second_bridge', 'first_link']);
const MAX_PROOF = 48;      // settlements in the committed hour's proof, like a node's history
const MAX_PATH = 16;       // a path of 16 siblings covers 65,536 leaves
const MAX_PURCHASES = 32, MAX_PAYOUTS = 48, MAX_LINKS = 32, MAX_PLACES = 32, MAX_VIA = 8;
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const nameOrNull = (v) => v === null || (typeof v === 'string' && NAME.test(v));
const names = (v, max) => Array.isArray(v) && v.length <= max && v.every((x) => typeof x === 'string' && NAME.test(x));

// The committed hour's proof, as `bwkit prove` prints it: the commitment's fields and one entry per settlement with its
// leaf and path. The page checks the signature and the paths; the Worker checks only the shape and its bounds.
function checkProof(p) {
  if (!isObj(p)) return 'proof must be an object';
  if (p.kind !== 'proof') return 'proof.kind must be "proof"';
  if (typeof p.mint !== 'string' || !NYM.test(p.mint)) return 'proof.mint must be an ed25519 NYM';
  if (!Number.isInteger(p.window) || p.window < 0) return 'proof.window must be a Unix hour';
  if (typeof p.root !== 'string' || !HEX64.test(p.root)) return 'proof.root must be 64 hex characters';
  if (!Number.isInteger(p.count) || p.count < 1 || p.count > MAX_PROOF) return 'proof.count must be 1 to ' + MAX_PROOF;
  if (typeof p.signature !== 'string' || !SIG.test(p.signature)) return 'proof.signature must be a base64url Ed25519 signature';
  if (p.commitment !== undefined && !isObj(p.commitment)) return 'proof.commitment must be an object';
  if (!Array.isArray(p.settlements) || p.settlements.length > p.count) return 'proof.settlements must list at most count entries';
  for (const e of p.settlements) {
    if (!isObj(e)) return 'each proof entry must be an object';
    if (!Number.isInteger(e.index) || e.index < 0 || e.index >= p.count) return 'a proof entry\'s index is 0 to count - 1';
    if (typeof e.leaf !== 'string' || !HEX64.test(e.leaf)) return 'a proof entry\'s leaf is 64 hex characters';
    if (!Array.isArray(e.path) || e.path.length > MAX_PATH) return 'a proof entry\'s path is a list of at most ' + MAX_PATH + ' siblings';
    for (const step of e.path) {
      if (!Array.isArray(step) || step.length !== 2 || (step[0] !== 'L' && step[0] !== 'R') || typeof step[1] !== 'string' || !HEX64.test(step[1])) return 'a path step is ["L" or "R", 64 hex characters]';
    }
    const s = e.settlement;
    if (!isObj(s) || s.kind !== 'settlement') return 'a proof entry\'s settlement must be a settlement record';
    if (typeof s.payer !== 'string' || !NYM.test(s.payer) || typeof s.hop !== 'string' || !NYM.test(s.hop)) return 'a settlement\'s payer and hop are NYMs';
    if (!Number.isInteger(s.t_first) || !Number.isInteger(s.t_last) || s.t_first < 0 || s.t_last < s.t_first) return 'a settlement has t_first <= t_last, in Unix seconds';
    if (!count(s.payer_bytes) || !count(s.hop_bytes) || !count(s.settled_bytes)) return 'a settlement\'s byte counts are non-negative integers';
    if (s.status !== 'settled' && s.status !== 'disputed') return 'a settlement\'s status is settled or disputed';
  }
  return null;
}

// The Steward's book (PLAN.md 2.5): balances, the open purchases with their routes in names, the last day's payouts.
// Beyond 2.5, the page also reads, when present: a purchase's poster, refunded_usd, target_usd and matches; a payout's
// settled_bytes, purchase and refund_usd; `links` (where the income came from), `map` (the places), and the parameters
// cap_margin, program_windows, first_link_usd and last_run. Every name is a node or place name; nothing is an address.
function checkSteward(st) {
  if (!isObj(st)) return 'steward must be an object';
  if (typeof st.nym !== 'string' || !NYM.test(st.nym)) return 'steward.nym must be an ed25519 NYM';
  if (!fraction(st.f) || !fraction(st.m)) return 'steward.f and steward.m are fractions, 0 to 1';
  for (const k of ['income_usd', 'escrow_usd', 'posted_usd', 'paid_usd', 'refunded_usd', 'held_by_cap_usd']) {
    if (!money(st[k])) return 'steward.' + k + ' must be a non-negative amount';
  }
  for (const k of ['cap_margin']) if (st[k] !== undefined && !fraction(st[k])) return 'steward.' + k + ' is a fraction, 0 to 1';
  for (const k of ['program_windows', 'last_run']) if (!count(st[k])) return 'steward.' + k + ' is a non-negative integer or null';
  if (st.first_link_usd !== undefined && !money(st.first_link_usd)) return 'steward.first_link_usd must be a non-negative amount';
  if (!Array.isArray(st.purchases) || st.purchases.length > MAX_PURCHASES) return 'steward.purchases is a list of at most ' + MAX_PURCHASES;
  for (const p of st.purchases) {
    if (!isObj(p)) return 'each purchase must be an object';
    if (typeof p.id !== 'string' || !ID.test(p.id)) return 'a purchase id is 1 to 32 of a-z, 0-9 and -';
    if (!PROGRAMS.has(p.program)) return 'a purchase program is payer, match, second_bridge or first_link';
    if (!isObj(p.route) || !nameOrNull(p.route.from) || typeof p.route.to !== 'string' || !NAME.test(p.route.to) || !names(p.route.not_via, MAX_VIA)) {
      return 'a purchase route is {from: name or null, to: name, not_via: [names]}';
    }
    if (!money(p.premium_per_gb) || !count(p.min_bytes) || !count(p.windows_left) || !count(p.deadline)) return 'a purchase has premium_per_gb, min_bytes, windows_left and deadline (the last two or null)';
    if (!money(p.escrow_usd) || !money(p.paid_usd)) return 'a purchase\'s escrow_usd and paid_usd are non-negative amounts';
    if (typeof p.status !== 'string' || !WORD.test(p.status)) return 'a purchase status is one lowercase word';
    if (p.poster !== undefined && !nameOrNull(p.poster)) return 'a purchase poster is a name or null';
    if ((p.refunded_usd !== undefined && !money(p.refunded_usd)) || (p.target_usd !== undefined && !money(p.target_usd))) return 'a purchase\'s refunded_usd and target_usd are non-negative amounts';
    if (p.matches !== undefined && p.matches !== null && (typeof p.matches !== 'string' || !ID.test(p.matches))) return 'a purchase\'s matches is a purchase id or null';
  }
  if (!Array.isArray(st.payouts) || st.payouts.length > MAX_PAYOUTS) return 'steward.payouts is a list of at most ' + MAX_PAYOUTS;
  for (const y of st.payouts) {
    if (!isObj(y)) return 'each payout must be an object';
    if (!Number.isInteger(y.t) || y.t < 0 || !Number.isInteger(y.window) || y.window < 0) return 'a payout has t and window in Unix seconds';
    if (typeof y.payer !== 'string' || !NAME.test(y.payer) || typeof y.hop !== 'string' || !NAME.test(y.hop)) return 'a payout\'s payer and hop are node names';
    if (!money(y.premium_usd) || !money(y.from_steward_usd) || !money(y.from_poster_usd)) return 'a payout\'s premium_usd, from_steward_usd and from_poster_usd are non-negative amounts';
    if (!count(y.settled_bytes)) return 'a payout\'s settled_bytes is a non-negative integer or null';
    if (y.refund_usd !== undefined && !money(y.refund_usd)) return 'a payout\'s refund_usd is a non-negative amount';
    if (y.purchase !== undefined && y.purchase !== null && (typeof y.purchase !== 'string' || !ID.test(y.purchase))) return 'a payout\'s purchase is a purchase id or null';
  }
  if (st.links !== undefined) {
    if (!Array.isArray(st.links) || st.links.length > MAX_LINKS) return 'steward.links is a list of at most ' + MAX_LINKS;
    for (const l of st.links) {
      if (!isObj(l) || typeof l.from !== 'string' || !NAME.test(l.from) || typeof l.to !== 'string' || !NAME.test(l.to)) return 'a link has from and to as node names';
      if (!nameOrNull(l.place_from === undefined ? null : l.place_from) || !nameOrNull(l.place_to === undefined ? null : l.place_to)) return 'a link\'s places are place names or null';
      if (!count(l.windows) || !count(l.bytes) || !money(l.paid_usd) || !money(l.fee_usd)) return 'a link has windows, bytes, paid_usd and fee_usd';
    }
  }
  if (st.map !== undefined) {
    const m = st.map;
    if (!isObj(m) || !nameOrNull(m.domain === undefined ? null : m.domain) || !nameOrNull(m.mint === undefined ? null : m.mint)) return 'steward.map has domain and mint as names';
    if (m.unit !== undefined && (typeof m.unit !== 'string' || !/^[A-Za-z0-9-]{1,16}$/.test(m.unit))) return 'steward.map.unit is a short code';
    if (!Array.isArray(m.places) || m.places.length > MAX_PLACES) return 'steward.map.places is a list of at most ' + MAX_PLACES;
    for (const pl of m.places) {
      if (!isObj(pl) || typeof pl.name !== 'string' || !NAME.test(pl.name)) return 'a place has a name';
      if ((pl.medium !== undefined && (typeof pl.medium !== 'string' || !TEXT.test(pl.medium))) || (pl.range_class !== undefined && (typeof pl.range_class !== 'string' || !TEXT.test(pl.range_class)))) return 'a place\'s medium and range_class are short labels';
      if (!flag(pl.mapped) || (pl.linked !== undefined && !names(pl.linked, 16))) return 'a place has mapped (a flag) and linked (names)';
    }
  }
  return null;
}

// What a report must look like. Returns a reason, or null when it is fine.
export function checkReport(report, text) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) return 'the body must be a JSON object';
  if (!Number.isInteger(report.generated_at) || report.generated_at <= 0) return 'generated_at must be Unix seconds';
  if (!count(report.since)) return 'since must be Unix seconds or null';
  if (!Array.isArray(report.nodes) || report.nodes.length < 1 || report.nodes.length > 16) return 'nodes must list 1 to 16 nodes';
  for (const n of report.nodes) {
    if (!n || typeof n !== 'object' || Array.isArray(n)) return 'each node must be an object';
    if (typeof n.name !== 'string' || !/^[a-z0-9][a-z0-9-]{0,31}$/.test(n.name)) return 'a node name is 1 to 32 of a-z, 0-9 and -';
    if (!ROLES.has(n.role)) return 'a node role is payer, hop, mint or peer';
    if (!count(n.last_receipt) || !count(n.window_bytes) || !count(n.total_bytes)) return 'a node\'s times and byte counts are non-negative integers or null';
    if (n.history !== undefined) {
      if (!Array.isArray(n.history) || n.history.length > MAX_HISTORY) return 'a node\'s history is a list of at most ' + MAX_HISTORY + ' windows';
      for (const w of n.history) {
        if (!w || typeof w !== 'object' || Array.isArray(w)) return 'each window must be an object';
        if (!Number.isInteger(w.t_first) || !Number.isInteger(w.t_last) || w.t_first < 0 || w.t_last < w.t_first) return 'a window has t_first <= t_last, in Unix seconds';
        if (!Number.isInteger(w.bytes) || w.bytes < 0 || !count(w.settled_bytes) || !flag(w.disputed)) return 'a window has bytes, settled_bytes (or null) and a disputed flag (or null)';
      }
    }
  }
  // The Mint's NYM, at the top level or on the commitment; the committed hour's proof; the Steward's book. All optional:
  // an older reporter sends none of them.
  if (report.mint !== undefined && report.mint !== null && (typeof report.mint !== 'string' || !NYM.test(report.mint))) return 'mint must be an ed25519 NYM';
  if (isObj(report.commitment) && report.commitment.mint !== undefined && report.commitment.mint !== null && (typeof report.commitment.mint !== 'string' || !NYM.test(report.commitment.mint))) return 'commitment.mint must be an ed25519 NYM';
  if (report.proof !== undefined && report.proof !== null) {
    const why = checkProof(report.proof);
    if (why) return why;
  }
  if (report.steward !== undefined && report.steward !== null) {
    const why = checkSteward(report.steward);
    if (why) return why;
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
