// A D1 binding in memory for test.mjs: prepare, bind, first, all, run and batch over the statements of src/sql.js,
// each implemented by name. Text that is not one of those statements throws, so the Worker cannot drift from the SQL
// the tests know; the real text runs in workerd in the local smoke. rows_written counts what SQLite would write
// for these WITHOUT ROWID tables: one row per inserted, changed or deleted row, none for an upsert whose WHERE
// finds nothing changed.
import { SQL } from './src/sql.js';

const byText = new Map(Object.entries(SQL).map(([name, text]) => [text, name]));
const same = (a, b) => (a === null || a === undefined ? null : a) === (b === null || b === undefined ? null : b);

export function fakeD1() {
  const t = { reports: new Map(), mints: new Map(), windows: new Map(), commitments: new Map(), map: null, meter: new Map() };
  const wkey = (mint, node, t_first) => mint + '|' + node + '|' + t_first;
  const ckey = (mint, window) => mint + '|' + window;
  const ops = {
    report: ([mint]) => rows(t.reports.has(mint) ? [pick(t.reports.get(mint), ['generated_at', 'received_at'])] : []),
    mintRow: ([mint]) => rows(t.mints.has(mint) ? [pick(t.mints.get(mint), ['first_seen', 'last_seen', 'listed', 'pruned_at'])] : []),
    meter: ([day]) => rows(t.meter.has(day) ? [{ writes: t.meter.get(day) }] : []),
    putReport: ([mint, name, domain, generated_at, received_at, body, sig]) => {
      t.reports.set(mint, { mint, name, domain, generated_at, received_at, body, sig });
      return wrote(1);
    },
    seenMint: ([mint, name, domain, places, first_seen, last_seen]) => {
      const m = t.mints.get(mint) || { mint, name: null, domain: null, places: '[]', first_seen: null, last_seen: null, listed: 0, pruned_at: null };
      Object.assign(m, { name: name ?? m.name, domain: domain ?? m.domain, places, first_seen: m.first_seen ?? first_seen, last_seen });
      t.mints.set(mint, m);
      return wrote(1);
    },
    putWindow: ([mint, node, role, t_first, t_last, bytes, settled_bytes, disputed]) => {
      const k = wkey(mint, node, t_first), had = t.windows.get(k);
      const row = { mint, node, role, t_first, t_last, bytes, settled_bytes: settled_bytes ?? null, disputed: disputed ?? null };
      if (had && ['role', 't_last', 'bytes', 'settled_bytes', 'disputed'].every((f) => same(had[f], row[f]))) return wrote(0);
      t.windows.set(k, row);
      return wrote(1);
    },
    putCommitment: ([mint, window, root, count, signature, tt]) => {
      const k = ckey(mint, window), had = t.commitments.get(k);
      const row = { mint, window, root, count, signature, t: tt };
      if (had && ['root', 'count', 'signature', 't'].every((f) => same(had[f], row[f]))) return wrote(0);
      t.commitments.set(k, row);
      return wrote(1);
    },
    pruneWindows: ([mint, before]) => wrote(drop(t.windows, (w) => w.mint === mint && w.t_first < before)),
    pruneCommitments: ([mint, before]) => wrote(drop(t.commitments, (c) => c.mint === mint && c.window < before)),
    pruned: ([at, mint]) => { const m = t.mints.get(mint); if (!m) return wrote(0); m.pruned_at = at; return wrote(1); },
    bumpMeter: ([day, n]) => { t.meter.set(day, (t.meter.get(day) || 0) + n); return wrote(1); },

    latest: ([mint]) => rows(t.reports.has(mint) ? [pick(t.reports.get(mint), ['body', 'sig', 'received_at'])] : []),
    listed: () => rows([...t.mints.values()].filter((m) => m.listed === 1 && m.last_seen !== null)
      .sort((a, b) => cmp(a.name, b.name) || cmp(a.mint, b.mint))
      .map((m) => ({ ...pick(m, ['mint', 'name', 'domain', 'places', 'last_seen']),
        windows_settled: [...t.windows.values()].filter((w) => w.mint === m.mint && w.settled_bytes !== null).length }))),
    unlisted: () => rows([{ n: [...t.mints.values()].filter((m) => m.listed === 0 && m.last_seen !== null).length }]),
    windowsSince: ([mint, since]) => rows([...t.windows.values()].filter((w) => w.mint === mint && w.t_first >= since)
      .sort((a, b) => (a.t_first - b.t_first) || cmp(a.node, b.node)).map((w) => pick(w, ['node', 'role', 't_first', 't_last', 'bytes', 'settled_bytes', 'disputed']))),
    commitmentsSince: ([mint, since]) => rows([...t.commitments.values()].filter((c) => c.mint === mint && c.window >= since)
      .sort((a, b) => a.window - b.window).map((c) => pick(c, ['window', 'root', 'count', 'signature', 't']))),
    map: () => rows(t.map ? [{ ...t.map }] : []),

    putMap: ([body, signer, at]) => { t.map = { body, signer, at }; return wrote(1); },
    unlistAll: () => { let n = 0; for (const m of t.mints.values()) if (m.listed === 1) { m.listed = 0; n++; } return wrote(n); },
    listMint: ([mint, name, domain]) => {
      const m = t.mints.get(mint) || { mint, name: null, domain: null, places: '[]', first_seen: null, last_seen: null, listed: 0, pruned_at: null };
      Object.assign(m, { listed: 1, name: m.name ?? name ?? null, domain: m.domain ?? domain ?? null });
      t.mints.set(mint, m);
      return wrote(1);
    },
  };

  function statement(name, args) {
    const go = () => ops[name](args);
    return {
      bind: (...a) => statement(name, a),
      first: async (col) => { const r = go().results[0] ?? null; return col === undefined ? r : (r ? r[col] ?? null : null); },
      all: async () => ({ success: true, ...go() }),
      run: async () => { const r = go(); return { success: true, meta: r.meta }; },
      _go: go,
    };
  }
  return {
    prepare(text) {
      const name = byText.get(text);
      if (!name) throw new Error('the fake D1 has no statement with this text: ' + text.slice(0, 80));
      return statement(name, []);
    },
    async batch(stmts) { return stmts.map((s) => ({ success: true, ...s._go() })); },
    tables: t,
  };
}

const rows = (results) => ({ results, meta: { rows_written: 0 } });
const wrote = (n) => ({ results: [], meta: { rows_written: n, changes: n } });
const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k] ?? null]));
const cmp = (a, b) => (a === b ? 0 : a === null ? -1 : b === null ? 1 : a < b ? -1 : 1);
function drop(map, when) { let n = 0; for (const [k, v] of map) if (when(v)) { map.delete(k); n++; } return n; }
