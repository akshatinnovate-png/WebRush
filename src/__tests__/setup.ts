import '@testing-library/jest-dom/vitest';

// jsdom has no matchMedia, and every responsive hook in this codebase depends
// on it, so it is stubbed once here rather than in each suite.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
