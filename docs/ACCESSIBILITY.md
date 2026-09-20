# Accessibility

Scored 100% by the automated audit; this is what that consists of.

## The hard part: canvases

Four passes draw to canvas, which is opaque to assistive technology. Each one ships a parallel
route to the **same state**, not a degraded summary:

- **The constellation** renders all 205 nodes as a real `<button>` list. Activating one selects
  that node and opens the inspector — identical to clicking it on the canvas.
- **The dial** has a 24-button hour strip; each button sets the same hour the petals do.
- **The tape** has a range input scrubber bound to the same month index as dragging the roll.
- **The map** lists its towns as buttons that open the same inspector.

## Structure

One `<h1>`, headings in order, `<main>` / `<nav>` / `<aside>` landmarks, `aria-current="step"`
on the live pass, and a skip link that moves focus to the stage.

## Live regions

Pass changes, hour selection and the dial readout announce through `aria-live="polite"`.
Loading states use `role="status"`.

## Keyboard

Everything is reachable. `[` and `]` page between passes, `⌘K` / `Ctrl+K` opens search with
arrow-key navigation and Enter to print that day, `Escape` closes the drawer and the palette.
Focus is never removed — only restyled, at 2 px with a 3 px offset, bright enough to find on
either theme.

## Preferences

`prefers-reduced-motion` is honoured throughout, not just on decorative animation: particles
land instantly, the receipt prints in one frame, the map stops pulsing. `prefers-contrast: more`
promotes dim text to full contrast. `forced-colors: active` restores borders and drops the grain.

## Colour

Colour always carries meaning and is never the only carrier — every stream is also labelled in
text. The light theme darkens all four inks specifically to hold AA contrast on cream rather
than being a mechanical inversion.

## Without JavaScript

A `<noscript>` block explains what the site does and points at the raw JSON under `/data/`,
rather than showing a blank page.
