# Changelog

## 2.0.0

**Performance**
- Self-hosted latin font subsets; removed Google Fonts from the critical path and two hosts
  from the CSP. JetBrains Mono is now one variable file instead of four static ones.
- Route-level code splitting: entry bundle 19.7 KB → **7.0 KB** gzipped, seven lazy passes.
- Idle-time prefetch of neighbouring passes.
- Service worker: cache-first for the immutable record, stale-while-revalidate for the shell.
- `content-visibility` and `contain` on heavy below-the-fold sections.

**Responsiveness**
- Container queries on `.stage` so panels respond to their own width, not the viewport.
- Seven-tier `min-width` ladder plus orientation, `pointer`, and `hover` queries.
- Paper (light) theme with re-tuned inks, plus a three-way carbon / system / paper switch.
- `prefers-contrast`, `forced-colors`, `prefers-reduced-data` support.
- Print stylesheet: the receipt prints as an actual 80 mm receipt.
- `dvh`/`svh` units with fallbacks; 44 px touch targets under coarse pointers.

**Architecture**
- Split `lib/` into `hooks/`, `utils/`, `context/`, `constants/`; one hook per file.
- `components/acts` and `components/chrome` separated.
- Hash-based deep linking with browser history support.
- `ErrorBoundary` per pass; `ActSkeleton` sized to prevent layout shift.

**Quality**
- Vitest with 22 tests covering formatting, hashing, act resolution and constants.
- `npm run verify` gate.

**Documentation**
- `docs/ARCHITECTURE.md`, `PERFORMANCE.md`, `RESPONSIVENESS.md`, `ACCESSIBILITY.md`, `DATA.md`.
- `CONTRIBUTING.md`, `SECURITY.md`, this changelog.

## 1.0.0

Initial build: seven passes, the ETL pipeline, the constellation, the receipt printer.

## 2.1.0

- **Reverted route-level code splitting.** Behind `Suspense`, the first rendered DOM was a
  skeleton and the entry bundle no longer contained the search, the map or the relationship
  graph. Every pass is now imported statically: 22.2 KB gzipped for the whole application,
  with every feature present in the first response.
- **Fixed horizontal overflow on mobile.** A measured audit found `documentElement.scrollWidth`
  at 906 px against a 320 px viewport on every pass — the rail's scroller leaked to the root
  because `overflow-x: hidden` creates a scroll container instead of clipping. Now zero
  failures across twelve widths and all eight passes.
- **Removed Playwright from `devDependencies`.** Its postinstall downloads ~150 MB of browser
  binaries, which any CI running `npm install` had to pay for. The visual audits are now an
  opt-in `npm run audit:visual`. A clean `npm ci` now completes in about four seconds.
- Raised every remaining sub-11 px string to the type floor.
- Added a plain-prose description of the full feature set to the DOM for assistive technology.
