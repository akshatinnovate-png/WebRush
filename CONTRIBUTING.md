# Contributing

```bash
npm install
npm run dev
```

## Before opening a PR

```bash
npm run verify     # typecheck → lint → test → build
```

All four must pass. `lint` is expected to report **zero errors and zero warnings**.

## Conventions

- **One hook per file** in `src/hooks`, display-agnostic, exported through the barrel.
- **Acts never fetch or decode.** `DataProvider` owns that; acts receive props and context.
- **Every figure comes from the pipeline.** If you need a new number in the copy, compute it in
  `etl/build_data.py` and read it from the bundle. Do not type it into a component.
- **Comments explain why, not what.** The code says what it does.
- New behaviour gets a test in `src/__tests__`.

## Regenerating the data

```bash
pip install pandas numpy
python3 etl/build_data.py
```
