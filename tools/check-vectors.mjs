// Holds docs/bsp.js, the browser verifier, to the kit's bytes: `node tools/check-vectors.mjs [dir ...]`.
//
// Each directory is read in the layout the kit's spec/vectors/ has:
//   commitment.json                 a commitment record; its signature must verify
//   proof.json, *.proof.json,       proof documents from `bwkit prove`; every settlement must be in the
//   proof-*.json                    root, the leaf the kit wrote must equal the one computed here, and the
//                                   commitment must be signed (and match commitment.json's hour when both exist)
//   *.tampered*.json, *.bad*.json   documents that must fail; a sidecar <name>.expect holds words the
//                                   reason must contain
//   receipt.json, ack.json          signed envelopes {kind, from, receipt, sig}; the signature must verify
//   settlements.json                an hour's settlements; their tree must give commitment.json's root
// With no arguments it runs over tools/fixtures (real proofs from bw-mint, Oct 17 and 18, 2026, and tampered
// copies) and, when ../kit/spec/vectors exists beside this repo, over that too. Exit 1 on any failure.
// Node 20 or newer: WebCrypto with Ed25519 (Node calls it experimental and says so once; that notice is muted here).

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as bsp from '../docs/bsp.js';

process.removeAllListeners('warning');
process.on('warning', (w) => { if (w.name !== 'ExperimentalWarning') console.warn(w); });

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
let failures = 0, checks = 0;

function check(name, ok, detail) {
  checks++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : ': ' + detail));
  if (!ok) failures++;
}

// ---------------------------------------------------------------- the encoding, against Python's own output
// Every expected string below was printed by the kit's Python (json.dumps with sort_keys, (",", ":") and ensure_ascii; repr for floats).
const FLOATS = [[1e15, '1000000000000000.0'], [1e16, '1e+16'], [9999999999999998, '9999999999999998.0'], [0.0001, '0.0001'],
  [0.00001, '1e-05'], [-0, '-0.0'], [-1.5e-7, '-1.5e-07'], [12345.678, '12345.678'], [5e-324, '5e-324'],
  [1.7976931348623157e308, '1.7976931348623157e+308'], [0.30000000000000004, '0.30000000000000004'], [0, '0.0'], [1e-6, '1e-06'],
  [0.1, '0.1'], [0.002199, '0.002199'], [1e21, '1e+21'], [123456789012345680000, '1.2345678901234568e+20'], [100, '100.0'], [1, '1.0']];
check('floats print as Python repr', FLOATS.every(([x, want]) => bsp.pyFloat(x) === want),
  FLOATS.filter(([x, want]) => bsp.pyFloat(x) !== want).map(([x, want]) => x + ' -> ' + bsp.pyFloat(x) + ' not ' + want).join('; '));
const STR = '{"b":"\\u00e9\\u2028\\u0001\\"\\\\/","a":[1,null,true]}';
check('strings are ASCII-escaped and keys sorted', bsp.canon(bsp.parse(STR)) === '{"a":[1,null,true],"b":"\\u00e9\\u2028\\u0001\\"\\\\/"}', bsp.canon(bsp.parse(STR)));
const ORDER = '{"\\ud83d\\ude00":"\\ud83d\\ude00 \\u007f \\u00e9","\\uffff":1,"z":2,"a":3}';
check('keys sort by code point, not UTF-16 unit', bsp.canon(bsp.parse(ORDER)) === '{"a":3,"z":2,"\\uffff":1,"\\ud83d\\ude00":"\\ud83d\\ude00 \\u007f \\u00e9"}', bsp.canon(bsp.parse(ORDER)));
check('a float written whole stays a float', bsp.canon(bsp.parse('{"x":0.0,"y":0,"z":1E5,"w":12345678901234567890}')) === '{"w":12345678901234567890,"x":0.0,"y":0,"z":100000.0}',
  bsp.canon(bsp.parse('{"x":0.0,"y":0,"z":1E5,"w":12345678901234567890}')));
check('a parsed object falls back to the known float fields', bsp.canon({ amount_usd: 0, settled_bytes: 0 }) === '{"amount_usd":0.0,"settled_bytes":0}', bsp.canon({ amount_usd: 0, settled_bytes: 0 }));
check('split is the largest power of two below n', [2, 3, 4, 5, 8, 9, 16, 17].map(bsp.split).join(',') === '1,2,2,4,4,8,8,16');
for (const bad of ['{"a":1,}', '[1 2]', '{"a":01}', '"\\x"', '{"a":1}x', '"\u0001"']) {
  let threw = false;
  try { bsp.parse(bad); } catch (e) { threw = true; }
  check('rejects ' + JSON.stringify(bad), threw);
}
const NYM = 'ed25519:lQLEToBb2f98uPsrOIfVCV0YRN2VTJ8IVeJ0uDk6ysM';
check('a NYM round-trips through its 32 bytes', bsp.nymOfPub(bsp.pubOfNym(NYM)) === NYM);
for (const bad of ['lQLEToBb2f98uPsrOIfVCV0YRN2VTJ8IVeJ0uDk6ysM', 'ed25519:lQLE', 'rsa:abc', 'ed25519:lQLEToBb2f98uPsrOIfVCV0YRN2VTJ8IVeJ0uDk6ysM+']) {
  let threw = false;
  try { bsp.pubOfNym(bad); } catch (e) { threw = true; }
  check('rejects the NYM ' + JSON.stringify(bad), threw);
}
// A tree built here must agree with its own paths, for 1 to 9 leaves.
for (const n of [1, 2, 3, 5, 8, 9]) {
  const leaves = [];
  for (let i = 0; i < n; i++) leaves.push(await bsp.sha256(new TextEncoder().encode('leaf ' + i)));
  const root = bsp.hex(await bsp.merkleRoot(leaves));
  let ok = true;
  for (let i = 0; i < n; i++) ok = ok && (await bsp.merkleCheck(leaves[i], await bsp.merklePath(leaves, i), root));
  ok = ok && (n === 1 || !(await bsp.merkleCheck(leaves[0], await bsp.merklePath(leaves, n - 1), root)));
  check('paths reach the root over ' + n + ' leaves', ok);
}

// ---------------------------------------------------------------- the directories
async function runDir(dir) {
  console.log('\n' + dir);
  const names = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  let commitment = null;
  if (names.includes('commitment.json')) {
    const text = readFileSync(join(dir, 'commitment.json'), 'utf8');
    commitment = bsp.parse(text);
    const r = await bsp.verifyCommitment(commitment);
    check('commitment.json is signed by ' + String(commitment.mint).slice(0, 24) + '…', r.ok, r.reason);
  }
  if (names.includes('settlements.json') && commitment) {
    const tree = await bsp.hourTree(bsp.parse(readFileSync(join(dir, 'settlements.json'), 'utf8')));
    check('settlements.json gives commitment.json\'s root', tree.root === commitment.root && tree.leaves.length === commitment.count,
      tree.root + ' over ' + tree.leaves.length);
  }
  for (const env of ['receipt.json', 'ack.json']) {
    if (!names.includes(env)) continue;
    const e = bsp.parse(readFileSync(join(dir, env), 'utf8'));
    check(env + ' is signed by its sender', await bsp.verifyReceipt(e.from, e.receipt, e.sig));
  }
  const mustFail = (f) => /tampered|\.bad\b|bad\./.test(f);
  const isProof = (f) => f === 'proof.json' || f.endsWith('.proof.json') || /^proof-.*\.json$/.test(f);
  for (const f of names) {
    if (!isProof(f) && !mustFail(f)) continue;
    const text = readFileSync(join(dir, f), 'utf8');
    const r = await bsp.verifyProof(text);
    if (mustFail(f)) {
      const reasons = [r.reason, r.commitment && r.commitment.reason, ...r.settlements.map((s) => s.reason)].filter(Boolean).join(' | ');
      check(f + ' fails', !r.ok, 'it verified');
      const side = join(dir, f.replace(/\.json$/, '.expect'));
      if (existsSync(side)) {
        const want = readFileSync(side, 'utf8').trim();
        check(f + ' fails for the expected reason (' + want + ')', reasons.includes(want), reasons);
      } else if (!r.ok) console.log('     reason: ' + reasons);
      continue;
    }
    const label = f + ' (hour ' + r.commitment?.window + ', ' + r.shown + ' settlements)';
    check(label + ' verifies', r.ok, r.reason || r.settlements.filter((s) => !s.ok).map((s) => s.reason).join('; '));
    check(label + ': the leaves the kit wrote are the leaves computed here', r.settlements.every((s) => s.leafMatches !== false),
      r.settlements.filter((s) => s.leafMatches === false).map((s) => s.index + ': ' + s.statedLeaf + ' vs ' + s.leaf).join('; '));
    check(label + ': the document shows every settlement the commitment counts', r.shown === r.count, r.shown + ' of ' + r.count);
    if (commitment && commitment.window === r.commitment.window) {
      check(label + ' is the commitment.json hour and root', commitment.root === r.commitment.root && commitment.count === r.commitment.count);
    }
    // The tree rebuilt from the document's settlements, in the kit's order, must give the same root.
    const tree = await bsp.hourTree(r.settlements.map((s) => s.settlement));
    check(label + ': the settlements rebuild the root', tree.root === r.commitment.root, tree.root);
    // And a verifier that knows the Mint must agree, or disagree, on its NYM.
    const other = await bsp.verifyProof(text, { mint: 'ed25519:' + 'A'.repeat(43) });
    check(label + ' is refused for another Mint', !other.ok && /not the Mint you expected/.test(other.reason || ''), other.reason);
  }
}

const args = process.argv.slice(2);
const withNoble = args.includes('--noble');
const dirs = args.filter((a) => a !== '--noble');
if (!dirs.length) {
  dirs.push(join(repo, 'tools', 'fixtures'));
  const vectors = resolve(repo, '..', 'kit', 'spec', 'vectors');
  if (existsSync(vectors) && statSync(vectors).isDirectory()) dirs.push(vectors);
  else console.log('(no kit vectors yet at ' + vectors + '; running the fixtures alone)');
}
for (const d of dirs) await runDir(d);
// With --noble, the fallback a browser without Ed25519 in WebCrypto takes: the pinned noble-ed25519 from jsDelivr (needs the network).
if (withNoble) {
  console.log('\nnoble-ed25519, the fallback');
  // Node cannot import an https: URL, so the pinned file is fetched and imported as a data: URL.
  const src = await (await fetch(bsp.NOBLE_URL)).text();
  await bsp.useEd25519('noble', await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64')));
  for (const d of dirs) {
    for (const f of readdirSync(d).filter((f) => f.endsWith('.json') && /^proof/.test(f)).sort()) {
      const r = await bsp.verifyProof(readFileSync(join(d, f), 'utf8'));
      const want = !/tampered|bad/.test(f);
      check(f + (want ? ' verifies' : ' fails') + ' under noble', r.ok === want, r.reason);
    }
  }
} else console.log('\n(pass --noble to also run the proofs through the noble-ed25519 fallback; it loads from jsDelivr)');
console.log('\n' + (failures ? failures + ' of ' + checks + ' checks FAILED' : 'all ' + checks + ' checks passed') + ' · Ed25519 via ' + bsp.ed25519Backend());
process.exit(failures ? 1 : 0);
