# Data pipeline

`build_data.py` turns the three raw CSVs into the five JSON bundles the app reads.
It runs **offline, before the build** — the deployed site is pure static files.

```bash
pip install pandas numpy
python3 build_data.py
```

Input is expected at `/home/claude/data/` (adjust `RAW` at the top of the file):

- `archive/spotify_history.csv`
- `archive__1_/Daily Household Transactions.csv`
- `archive__2_/Augmented_IndiaTransactMultiFacet2024.csv`

Output lands in `../public/data/`.

## What it does

1. **Normalises** three very different schemas onto one day spine (4,179 days).
2. **Detects eras** from measured shifts — device changes, the 368-day silence, the point
   the ledger stops and the card starts.
3. **Computes every figure** quoted anywhere in the interface, so no copy is hand-written:
   clock and weekday profiles, monthly series, artist lifespans, the headline findings, and
   the anomaly measurements (hourly correlation, per-category disputed share, towns at the
   extremes).
4. **Weaves the constellation** by scoring day co-occurrence with lift rather than raw counts,
   then letting each node keep its own strongest ties. See the README for why.
5. **Geocodes** the card trail against a hand-built table of ~240 Indian city coordinates,
   falling back to state centroids with deterministic jitter.
6. **Compresses**: rows become tuples, strings are dictionary-encoded into a shared table.
   39 MB of CSV becomes 0.8 MB of JSON, ~200 KB over the wire.

`shots.mjs` is a Playwright smoke test that walks all seven passes at two viewports and reports
console errors.

## Visual audits (optional, not part of the build)

`responsive-audit.mjs`, `smoke.mjs` and `probe.mjs` drive a real browser to check
for horizontal overflow, sub-11px text and console errors across twelve
viewport widths and all eight passes.

Playwright is **deliberately not a dependency** — it downloads ~150 MB of
browser binaries on install, which has no place in a build that only needs to
produce static files. Install it on demand:

```bash
npm run audit:visual
```
