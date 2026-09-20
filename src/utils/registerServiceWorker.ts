/**
 * Offline support.
 *
 * The record is 0.8 MB of static JSON that never changes between deploys, so
 * it is an ideal candidate for a cache-first worker: a second visit costs one
 * conditional request for the shell and nothing at all for the data. Failure
 * is silent by design — the site works perfectly without it.
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* unsupported or blocked; the site is fully functional regardless */
    });
  });
}
