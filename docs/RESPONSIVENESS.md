# Responsiveness

The interface carries dense data — a 24-hour radial dial, a 138-month roll, a 205-node force
graph, a printed receipt. Each of those stops being readable at a *different* width, so they
get their own breakpoints rather than sharing three generic ones.

## Signals used

| Signal | Used for |
| --- | --- |
| `@container stage (…)` | panels that resize because the inspector opened, not because the window did |
| `min-width` ladder | 360 / 480 / 640 / 768 / 900 / 1200 / 1600 px |
| `max-width` queries | the two structural flips: rail → bottom bar, two columns → one |
| `orientation` + `max-height` | landscape phones, which have almost no vertical room |
| `pointer: coarse` | 44 px minimum targets, hover states disabled |
| `hover: hover` | affordances that only exist with a real cursor |
| `prefers-color-scheme` | the paper theme |
| `prefers-reduced-motion` | particles land instantly, receipt prints at once, map stops pulsing |
| `prefers-contrast: more` | dim text promoted to full contrast, borders thickened |
| `forced-colors: active` | Windows High Contrast — grain removed, borders restored |
| `prefers-reduced-data` | grain layer dropped |
| `print` | the receipt prints as an actual 80 mm receipt, interface removed |

## Container queries

`.stage` is a query container. The panels inside it — the rhythm split, the tape readout, the
atlas footer, the printer — respond to the space they actually have. This is the correct
signal: opening the inspector drawer narrows those panels without changing the viewport, and a
viewport query cannot see that.

## Fluid rather than stepped

Type and spacing are `clamp()`-based scales defined once in `tokens.css`, so most of the range
is covered continuously and breakpoints only handle genuine *structural* changes — a column
count, the rail flipping from vertical to horizontal.

## Structural flips

- **≤900 px** — the rail becomes a horizontal, scrollable bottom bar with the hints dropped;
  `flex-direction: column-reverse` puts it under the thumb. Safe-area insets are honoured.
- **≤1100 px** — two-column readouts collapse to one; the accessible node list drops to a
  single column.
- **≤560 px** — receipt gutters narrow, grids retune to the smallest legible column widths.

## Units

`100dvh` and `100svh` with `100vh` fallbacks, so mobile browser chrome collapsing does not
cause a jump. `min-width: 0` on every grid child that contains text, which is what actually
prevents horizontal overflow in CSS grid. Wide content scrolls inside its own container so the
page body never scrolls sideways.

## Touch

Every interactive element reaches 44 × 44 px under `pointer: coarse`, per WCAG 2.5.5. Canvases
use `touch-action: none` with explicit pointer handling, and the constellation supports
two-finger pinch zoom alongside zoom buttons for anyone who would rather tap.
