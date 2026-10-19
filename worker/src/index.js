// status.bandwidthswap.com: the status feed. A Mint posts a signed summary of its ledger here and the page reads it
// back. The Worker keeps the bytes the Mint signed and serves them with the signature, so it can delay or drop a
// report and cannot make one up or alter one; a reader checks the signature with docs/bsp.js (worker/PLAN.md).
//
//   POST /report   a signed status record (below); 200 {stored, received_at}
//   POST /status   the Phase 0 lab's Mint with the bearer token, until the kit signs its reports (P2 removes it)
//   GET  /status   the default Mint's latest report, with `received_at` (Unix seconds) added
//   GET  /         what this is
//
// The signed record is the report as `bwkit report --print` prints it (names, roles, times and byte counts, each
// node's windows of the last twelve hours, the Mint's NYM, the committed hour's proof, the Steward's book), with
// `kind: "status"`, `proto: 1`, the Mint's NYM in `mint`, and `sig`: Ed25519 by the Mint over the domain string
// "bandwidthswap/status/v1", a newline, and the canonical JSON of the record without `sig` (the kit's
// spec/PROTOCOL.md, Section 3). The key is the identity: nothing is registered, no token is issued.
//
// NYMs are public keys and may appear. The Worker refuses a body that carries an IPv4 or a MAC address, so a LAN
// detail cannot leak through a careless reporter.

import * as bsp from '../../docs/bsp.js';
import { SQL } from './sql.js';

// Decided here, not by bsp's probe: on Workers a URL import of the noble fallback fails, verifySignature returns
// false rather than throwing, and a failed probe would answer 401 to every good report. Workers have Ed25519.
bsp.useEd25519('webcrypto');

const STATUS_DOMAIN = 'bandwidthswap/status/v1';
const KEY = 'status';
const MAX_BODY = 64 * 1024;
const MAX_HISTORY = 48;
const FRESH_S = 300;            // generated_at within this of the Worker's clock
const RATE_S = 60;              // one accepted report per Mint per this
const METER_MAX = 80000;        // rows written a day before the Worker answers 429 (D1's free plan stops at 100,000)
const KEEP_S = 30 * 86400;      // windows and commitments older than this are pruned
const PRUNE_EVERY_S = 3600;     // at most once an hour per Mint: a delete is a write too
const ROLES = new Set(['payer', 'hop', 'mint', 'peer']);
const ORIGINS = new Set(['https://bandwidthswap.com', 'https://www.bandwidthswap.com']);
const PRIVATE = [
  /\b\d{1,3}(?:\.\d{1,3}){3}\b/,              // an IPv4 address
  /\b[0-9a-f]{2}(?::[0-9a-f]{2}){5}\b/i,      // a MAC address
];
// The kit's spec/vectors/keys.json: three keys whose seeds are published. Refused unless ALLOW_TEST_KEYS is set,
// which test.mjs and the local smoke do and wrangler.toml does not.
const TEST_NYMS = new Set([
  'ed25519:7NXLckho5kxw7Bht2Dcjv_v4-ShUgY1sAdYX3V0RVec',
  'ed25519:ZSkFPo6PQCl9IKHZpRXT7zp_1vBFqEcpwW0Zucj1Wsg',
  'ed25519:IGSk-aXtuMXYJ8tMVPFTPqR2hXXtCjkDgRKur2IWVuM',
]);
const enc = new TextEncoder();

// The site, and a local copy of the page while working on it.
function allowOrigin(origin) {
  if (!origin) return null;
  if (ORIGINS.has(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}

function headers(origin, extra) {
  const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra };
  const o = origin === '*' ? '*' : allowOrigin(origin);
  if (o) {
    h['Access-Control-Allow-Origin'] = o;
    if (o !== '*') h['Vary'] = 'Origin';
  }
  return h;
}

function json(obj, status, origin, extra) {
  return new Response(JSON.stringify(obj), { status, headers: headers(origin, extra) });
}

// Compare two strings without leaking where they differ: hash both, compare the digests.
async function sameToken(a, b) {
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
const moneyOpt = (v) => v === undefined || v === null || money(v);
const fraction = (v) => typeof v === 'number' && v >= 0 && v <= 1;
const NAME = /^[a-z0-9][a-z0-9-]{0,31}$/;                                              // a node or place name
const NYM = /^ed25519:[A-Za-z0-9_-]{43}$/;                                             // 32 bytes of public key, base64url
const HEX64 = /^[0-9a-f]{64}$/;
const SIG = /^[A-Za-z0-9_-]{86}$/;                                                     // 64 bytes of Ed25519 signature, base64url
const ID = /^[a-z0-9][a-z0-9-]{0,31}$/;                                                // a purchase id
const WORD = /^[a-z_]{1,16}$/;                                                         // a status
const TEXT = /^[\x20-\x7e]{0,40}$/;                                                    // a short label (a medium, a place's name)
const CODE = /^[A-Za-z0-9\/-]{1,16}$/;                                                 // a unit
const PROGRAMS = new Set(['payer', 'match', 'second_bridge', 'first_link']);
const MAX_PROOF = 48;      // settlements in the committed hour's proof, like a node's history
const MAX_PATH = 16;       // a path of 16 siblings covers 65,536 leaves
const MAX_PURCHASES = 32, MAX_PAYOUTS = 48, MAX_LINKS = 32, MAX_PLACES = 32, MAX_VIA = 8, MAX_DOMAINS = 8;
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const nameOrNull = (v) => v === null || (typeof v === 'string' && NAME.test(v));
const nameOpt = (v) => v === undefined || nameOrNull(v);
const textOpt = (v) => v === undefined || v === null || (typeof v === 'string' && TEXT.test(v));
const names = (v, max) => Array.isArray(v) && v.length <= max && v.every((x) => typeof x === 'string' && NAME.test(x));
const idOrNull = (v) => v === null || (typeof v === 'string' && ID.test(v));

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

// The Mint's latest commitment as the report carries it: the hour, the root, the count, the Mint's signature and when.
// Before the first commitment the kit sends null, or an object whose root is null; both mean "none yet".
function checkCommitment(c) {
  if (!isObj(c)) return 'commitment must be an object';
  if (c.mint !== undefined && c.mint !== null && (typeof c.mint !== 'string' || !NYM.test(c.mint))) return 'commitment.mint must be an ed25519 NYM';
  if (c.root === null || c.root === undefined) return null;
  if (!Number.isInteger(c.window) || c.window < 0) return 'commitment.window must be a Unix hour';
  if (typeof c.root !== 'string' || !HEX64.test(c.root)) return 'commitment.root must be 64 hex characters';
  if (!Number.isInteger(c.count) || c.count < 0) return 'commitment.count must be a non-negative integer';
  if (typeof c.signature !== 'string' || !SIG.test(c.signature)) return 'commitment.signature must be a base64url Ed25519 signature';
  if (!Number.isInteger(c.t) || c.t < 0) return 'commitment.t must be Unix seconds';
  return null;
}
const hasCommitment = (c) => isObj(c) && typeof c.root === 'string';

// The Steward's book (the kit's PLAN.md 2.5, as bwkit 0.4.0 posts it): balances, the open purchases with their
// routes in place names, the last day's payouts, the links the income came from, and the map. Two shapes are in the
// wild and both are admitted: the hand-made fixture of Oct 17 (a payout's `window` an hour, links with `place_from`
// and `paid_usd`, the map with `domain` and `mint`) and the kit's (a payout's `window` is {t_first, t_last}, links
// carry `payer`, `hop`, `fees_usd` and `take_usd`, the map has `domains` keyed by name and places with an `id`).
// Every name is a node or place name, a label is short printable ASCII, and nothing may be an address.
function checkSteward(st) {
  if (!isObj(st)) return 'steward must be an object';
  if (typeof st.nym !== 'string' || !NYM.test(st.nym)) return 'steward.nym must be an ed25519 NYM';
  if (!fraction(st.f) || !fraction(st.m)) return 'steward.f and steward.m are fractions, 0 to 1';
  for (const k of ['income_usd', 'escrow_usd', 'posted_usd', 'paid_usd', 'refunded_usd', 'held_by_cap_usd']) {
    if (!money(st[k])) return 'steward.' + k + ' must be a non-negative amount';
  }
  for (const k of ['cap_margin', 'margin']) if (st[k] !== undefined && !fraction(st[k])) return 'steward.' + k + ' is a fraction, 0 to 1';
  for (const k of ['program_windows', 'program_window_s', 'last_run']) if (!count(st[k])) return 'steward.' + k + ' is a non-negative integer or null';
  for (const k of ['first_link_usd', 'in_offers_usd', 'reserve_usd']) if (!moneyOpt(st[k])) return 'steward.' + k + ' must be a non-negative amount';
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
    if (!nameOpt(p.poster)) return 'a purchase poster is a name or null';
    for (const k of ['refunded_usd', 'target_usd', 'topups_usd', 'refund_usd', 'match_usd']) if (!moneyOpt(p[k])) return 'a purchase\'s ' + k + ' is a non-negative amount or null';
    for (const k of ['windows', 'posted_at']) if (!count(p[k])) return 'a purchase\'s ' + k + ' is a non-negative integer';
    if (p.matches !== undefined && !idOrNull(p.matches)) return 'a purchase\'s matches is a purchase id or null';
  }
  if (!Array.isArray(st.payouts) || st.payouts.length > MAX_PAYOUTS) return 'steward.payouts is a list of at most ' + MAX_PAYOUTS;
  for (const y of st.payouts) {
    if (!isObj(y)) return 'each payout must be an object';
    if (!Number.isInteger(y.t) || y.t < 0) return 'a payout has t in Unix seconds';
    const w = y.window;
    if (!((Number.isInteger(w) && w >= 0) || (isObj(w) && Number.isInteger(w.t_first) && Number.isInteger(w.t_last) && w.t_first >= 0 && w.t_last >= w.t_first))) return 'a payout\'s window is a Unix hour or {t_first, t_last}';
    if (typeof y.payer !== 'string' || !NAME.test(y.payer) || typeof y.hop !== 'string' || !NAME.test(y.hop)) return 'a payout\'s payer and hop are node names';
    if (!money(y.premium_usd) || !money(y.from_steward_usd) || !money(y.from_poster_usd)) return 'a payout\'s premium_usd, from_steward_usd and from_poster_usd are non-negative amounts';
    if (!count(y.settled_bytes)) return 'a payout\'s settled_bytes is a non-negative integer or null';
    if (!moneyOpt(y.refund_usd)) return 'a payout\'s refund_usd is a non-negative amount';
    if (y.purchase !== undefined && !idOrNull(y.purchase)) return 'a payout\'s purchase is a purchase id or null';
  }
  if (st.links !== undefined) {
    if (!Array.isArray(st.links) || st.links.length > MAX_LINKS) return 'steward.links is a list of at most ' + MAX_LINKS;
    for (const l of st.links) {
      if (!isObj(l) || typeof l.from !== 'string' || !NAME.test(l.from) || typeof l.to !== 'string' || !NAME.test(l.to)) return 'a link has from and to as names';
      for (const k of ['place_from', 'place_to', 'payer', 'hop']) if (!nameOpt(l[k])) return 'a link\'s ' + k + ' is a name or null';
      if (!count(l.windows) || !count(l.bytes)) return 'a link has windows and bytes';
      for (const k of ['paid_usd', 'fee_usd', 'fees_usd', 'take_usd']) if (!moneyOpt(l[k])) return 'a link\'s ' + k + ' is a non-negative amount';
    }
  }
  if (st.map !== undefined && st.map !== null) {
    const m = st.map;
    if (!isObj(m) || !nameOpt(m.domain) || !nameOpt(m.mint)) return 'steward.map has domain and mint as names';
    if (m.unit !== undefined && m.unit !== null && (typeof m.unit !== 'string' || !CODE.test(m.unit))) return 'steward.map.unit is a short code';
    if (m.domains !== undefined) {
      if (!isObj(m.domains) || Object.keys(m.domains).length > MAX_DOMAINS) return 'steward.map.domains is an object of at most ' + MAX_DOMAINS + ' domains by name';
      for (const [k, d] of Object.entries(m.domains)) {
        if (!NAME.test(k) || !isObj(d) || !textOpt(d.name) || !nameOpt(d.mint)) return 'a domain is named, with name (a label) and mint (a name)';
        if (d.unit !== undefined && d.unit !== null && (typeof d.unit !== 'string' || !CODE.test(d.unit))) return 'a domain\'s unit is a short code';
      }
    }
    if (!Array.isArray(m.places) || m.places.length > MAX_PLACES) return 'steward.map.places is a list of at most ' + MAX_PLACES;
    for (const pl of m.places) {
      if (!isObj(pl) || typeof pl.name !== 'string' || !TEXT.test(pl.name) || !pl.name) return 'a place has a name';
      if (!nameOpt(pl.id)) return 'a place\'s id is a name';
      if (!textOpt(pl.medium) || !textOpt(pl.range_class)) return 'a place\'s medium and range_class are short labels';
      if (!flag(pl.mapped) || !(flag(pl.linked) || names(pl.linked, 16))) return 'a place has mapped (a flag) and linked (a flag or names)';
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
    if (typeof n.name !== 'string' || !NAME.test(n.name)) return 'a node name is 1 to 32 of a-z, 0-9 and -';
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
  // The Mint's NYM, at the top level or on the commitment; the commitment; the committed hour's proof; the Steward's
  // book; a name and a domain for the Mint. All optional: an older reporter sends none of them.
  if (report.mint !== undefined && report.mint !== null && (typeof report.mint !== 'string' || !NYM.test(report.mint))) return 'mint must be an ed25519 NYM';
  for (const k of ['name', 'domain']) if (!nameOpt(report[k])) return k + ' must be a name';
  if (report.commitment !== undefined && report.commitment !== null) {
    const why = checkCommitment(report.commitment);
    if (why) return why;
  }
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

// What a signed status record must look like, beyond the report: its kind, its proto, its signer and its signature,
// and a proof or commitment that is the signer's own.
export function checkRecord(rec, text) {
  if (!isObj(rec)) return 'the body must be a JSON object';
  if (rec.kind !== 'status') return 'kind must be "status"';
  if (rec.proto !== 1) return 'proto must be 1';
  if (typeof rec.mint !== 'string' || !NYM.test(rec.mint)) return 'mint must be an ed25519 NYM';
  if (typeof rec.sig !== 'string' || !SIG.test(rec.sig)) return 'sig must be a base64url Ed25519 signature';
  if (rec.received_at !== undefined) return 'received_at is added here, not posted';
  const why = checkReport(rec, text);
  if (why) return why;
  if (isObj(rec.commitment) && rec.commitment.mint !== undefined && rec.commitment.mint !== null && rec.commitment.mint !== rec.mint) return 'commitment.mint must be the record\'s mint';
  if (isObj(rec.proof) && rec.proof.mint !== rec.mint) return 'proof.mint must be the record\'s mint';
  return null;
}

// True when `sig` is `nym`'s signature over the domain string, a newline and the canonical JSON of `record`.
// `record` must be the parsed text with `sig` removed by `delete`, so canon keeps the floats the signer wrote.
async function verifies(nym, domain, record, sig) {
  let pub, s;
  try { pub = bsp.pubOfNym(nym); s = bsp.unb64u(sig); } catch (e) { return false; }
  return bsp.verifySignature(pub, enc.encode(domain + '\n' + bsp.canon(record)), s);
}

const byteLength = (text) => (text.length > MAX_BODY ? text.length : enc.encode(text).length);
const day = (t) => new Date(t * 1000).toISOString().slice(0, 10);

// The Mint's name, its domain and its places, read out of a report: `name` and `domain` at the top level when the
// Mint says them, else the Mint node's name and the Steward's map's domain; the places are the map's place ids.
function describe(report) {
  const mintNode = report.nodes.find((n) => n.role === 'mint');
  const name = typeof report.name === 'string' ? report.name : (mintNode ? mintNode.name : null);
  const st = report.steward, map = isObj(st) && isObj(st.map) ? st.map : null;
  let domain = typeof report.domain === 'string' ? report.domain : null;
  if (!domain && map) {
    if (typeof map.domain === 'string') domain = map.domain;
    else if (isObj(map.domains)) domain = Object.keys(map.domains).find((k) => NAME.test(k)) || null;
  }
  const places = [];
  if (map && Array.isArray(map.places)) {
    for (const pl of map.places) {
      const id = typeof pl.id === 'string' ? pl.id : pl.name;
      if (typeof id === 'string' && NAME.test(id) && !places.includes(id)) places.push(id);
    }
  }
  return { name, domain, places };
}

// Store a report: the bytes as received, the Mint's row, each node's windows and the commitment, in one batch that
// writes only what changed; then the day's meter, by the rows the batch wrote plus its own. Returns the rows written.
async function store(env, { mint, report, text, sig, received_at, pruned_at }) {
  const { name, domain, places } = describe(report);
  const stmts = [
    env.DB.prepare(SQL.putReport).bind(mint, name, domain, report.generated_at, received_at, text, sig),
    env.DB.prepare(SQL.seenMint).bind(mint, name, domain, JSON.stringify(places), received_at, received_at),
  ];
  for (const n of report.nodes) {
    for (const w of n.history || []) {
      stmts.push(env.DB.prepare(SQL.putWindow).bind(mint, n.name, n.role, w.t_first, w.t_last, w.bytes, w.settled_bytes ?? null, w.disputed == null ? null : (w.disputed ? 1 : 0)));
    }
  }
  const c = report.commitment;
  if (hasCommitment(c)) stmts.push(env.DB.prepare(SQL.putCommitment).bind(mint, c.window, c.root, c.count, c.signature, c.t));
  if (!(pruned_at > received_at - PRUNE_EVERY_S)) {
    stmts.push(env.DB.prepare(SQL.pruneWindows).bind(mint, received_at - KEEP_S));
    stmts.push(env.DB.prepare(SQL.pruneCommitments).bind(mint, received_at - KEEP_S));
    stmts.push(env.DB.prepare(SQL.pruned).bind(received_at, mint));
  }
  const results = await env.DB.batch(stmts);
  let rows = 0;
  for (const r of results) rows += (r.meta && r.meta.rows_written) || 0;
  await env.DB.prepare(SQL.bumpMeter).bind(day(received_at), rows + 1).run();
  return rows + 1;
}

// POST /report: a signed status record. The body is its own credential.
async function postReport(request, env) {
  const text = (await request.text()).trim();
  if (byteLength(text) > MAX_BODY) return json({ error: 'too large' }, 413, '*');
  let rec;
  try { rec = bsp.parse(text); } catch (e) { return json({ error: 'bad JSON' }, 400, '*'); }
  const why = checkRecord(rec, text);
  if (why) return json({ error: why }, 422, '*');
  if (TEST_NYMS.has(rec.mint) && !env.ALLOW_TEST_KEYS) return json({ error: 'a test key from the spec\'s vectors is refused here' }, 403, '*');
  const sig = rec.sig;
  delete rec.sig;                                   // not a spread copy: that would lose the floats the Mint wrote
  if (!(await verifies(rec.mint, STATUS_DOMAIN, rec, sig))) return json({ error: 'the signature does not verify under mint' }, 401, '*');
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - rec.generated_at) > FRESH_S) return json({ error: 'generated_at is more than ' + FRESH_S + ' s from the clock here', now }, 409, '*');
  const [prev, mintRow, meter] = await Promise.all([
    env.DB.prepare(SQL.report).bind(rec.mint).first(),
    env.DB.prepare(SQL.mintRow).bind(rec.mint).first(),
    env.DB.prepare(SQL.meter).bind(day(now)).first(),
  ]);
  if (prev && rec.generated_at <= prev.generated_at) return json({ error: 'generated_at is not newer than the stored report', stored: prev.generated_at }, 409, '*');
  if (prev && now - prev.received_at < RATE_S) {
    const wait = RATE_S - (now - prev.received_at);
    return json({ error: 'one report a minute per Mint', retry_after: wait }, 429, '*', { 'Retry-After': String(wait) });
  }
  if (meter && meter.writes >= METER_MAX) return json({ error: 'the day\'s write meter is full; try after midnight UTC' }, 429, '*');
  await store(env, { mint: rec.mint, report: rec, text, sig, received_at: now, pruned_at: mintRow ? mintRow.pruned_at : null });
  return json({ stored: true, received_at: now }, 200, '*');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      const posts = url.pathname === '/report';
      return new Response(null, {
        status: 204,
        headers: headers(posts ? '*' : origin, {
          'Access-Control-Allow-Methods': posts ? 'GET, POST, OPTIONS' : 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }),
      });
    }

    if (url.pathname === '/' && request.method === 'GET') {
      return new Response('status.bandwidthswap.com: GET /status is the Phase 0 lab\'s status, posted by the Mint. See https://bandwidthswap.com/#lab\n',
        { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    if (url.pathname === '/report') {
      if (request.method === 'POST') return postReport(request, env);
      return json({ error: 'method not allowed' }, 405, '*', { Allow: 'POST, OPTIONS' });
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
      if (byteLength(text) > MAX_BODY) return json({ error: 'too large' }, 413, origin);
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
