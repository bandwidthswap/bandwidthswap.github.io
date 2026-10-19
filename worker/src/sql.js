// Every SQL statement the Worker runs, by name. test.mjs runs the Worker against a fake D1 that implements each
// statement by this name and refuses any other text, so the Worker cannot use SQL the tests do not know; the local
// smoke (smoke.mjs, through `wrangler dev --local`) runs this real text in workerd against migrations/0001.sql.
//
// Writes are counted in rows by D1's free plan, so every upsert that could be a no-op says so in its WHERE: an
// unchanged window or commitment is not written. `IS NOT` compares NULLs as values.
export const SQL = {
  // before a write
  report: 'SELECT generated_at, received_at FROM reports WHERE mint = ?',
  mintRow: 'SELECT first_seen, last_seen, listed, pruned_at FROM mints WHERE mint = ?',
  meter: 'SELECT writes FROM meter WHERE day = ?',

  // the write, one batch
  putReport: 'INSERT INTO reports (mint, name, domain, generated_at, received_at, body, sig) VALUES (?, ?, ?, ?, ?, ?, ?)'
    + ' ON CONFLICT(mint) DO UPDATE SET name = excluded.name, domain = excluded.domain, generated_at = excluded.generated_at,'
    + ' received_at = excluded.received_at, body = excluded.body, sig = excluded.sig',
  seenMint: 'INSERT INTO mints (mint, name, domain, places, first_seen, last_seen) VALUES (?, ?, ?, ?, ?, ?)'
    + ' ON CONFLICT(mint) DO UPDATE SET name = COALESCE(excluded.name, mints.name), domain = COALESCE(excluded.domain, mints.domain),'
    + ' places = excluded.places, first_seen = COALESCE(mints.first_seen, excluded.first_seen), last_seen = excluded.last_seen',
  putWindow: 'INSERT INTO windows (mint, node, role, t_first, t_last, bytes, settled_bytes, disputed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    + ' ON CONFLICT(mint, node, t_first) DO UPDATE SET role = excluded.role, t_last = excluded.t_last, bytes = excluded.bytes,'
    + ' settled_bytes = excluded.settled_bytes, disputed = excluded.disputed'
    + ' WHERE windows.role IS NOT excluded.role OR windows.t_last IS NOT excluded.t_last OR windows.bytes IS NOT excluded.bytes'
    + ' OR windows.settled_bytes IS NOT excluded.settled_bytes OR windows.disputed IS NOT excluded.disputed',
  putCommitment: 'INSERT INTO commitments (mint, window, root, count, signature, t) VALUES (?, ?, ?, ?, ?, ?)'
    + ' ON CONFLICT(mint, window) DO UPDATE SET root = excluded.root, count = excluded.count, signature = excluded.signature, t = excluded.t'
    + ' WHERE commitments.root IS NOT excluded.root OR commitments.count IS NOT excluded.count'
    + ' OR commitments.signature IS NOT excluded.signature OR commitments.t IS NOT excluded.t',
  pruneWindows: 'DELETE FROM windows WHERE mint = ? AND t_first < ?',
  pruneCommitments: 'DELETE FROM commitments WHERE mint = ? AND window < ?',
  pruned: 'UPDATE mints SET pruned_at = ? WHERE mint = ?',
  // after the batch: the rows it wrote, plus this one
  bumpMeter: 'INSERT INTO meter (day, writes) VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET writes = meter.writes + excluded.writes',

  // the GETs
  latest: 'SELECT body, sig, received_at FROM reports WHERE mint = ?',
  listed: 'SELECT m.mint, m.name, m.domain, m.places, m.last_seen,'
    + ' (SELECT COUNT(*) FROM windows w WHERE w.mint = m.mint AND w.settled_bytes IS NOT NULL) AS windows_settled'
    + ' FROM mints m WHERE m.listed = 1 AND m.last_seen IS NOT NULL ORDER BY m.name, m.mint',
  unlisted: 'SELECT COUNT(*) AS n FROM mints WHERE listed = 0 AND last_seen IS NOT NULL',
  windowsSince: 'SELECT node, role, t_first, t_last, bytes, settled_bytes, disputed FROM windows WHERE mint = ? AND t_first >= ? ORDER BY t_first, node',
  commitmentsSince: 'SELECT window, root, count, signature, t FROM commitments WHERE mint = ? AND window >= ? ORDER BY window',
  map: 'SELECT body, signer, at FROM map WHERE id = 1',

  // the map
  putMap: 'INSERT INTO map (id, body, signer, at) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET body = excluded.body, signer = excluded.signer, at = excluded.at',
  unlistAll: 'UPDATE mints SET listed = 0 WHERE listed = 1',
  listMint: 'INSERT INTO mints (mint, name, domain, listed) VALUES (?, ?, ?, 1)'
    + ' ON CONFLICT(mint) DO UPDATE SET listed = 1, name = COALESCE(mints.name, excluded.name), domain = COALESCE(mints.domain, excluded.domain)',
};
