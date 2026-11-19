import { colorScheme } from '../../src/styles/color-scheme.js';

/**
 * Run `fn` with the page in the opt-in dark mode: the role tokens' sheet adopted, the root's
 * `data-uva-color-scheme="dark"` and the body on the dark surface (as base.css sets it).
 */
export async function inDarkMode(fn: () => Promise<void>): Promise<void> {
  const sheet = colorScheme.styleSheet!;
  const before = document.adoptedStyleSheets;
  document.adoptedStyleSheets = [...before, sheet];
  const root = document.documentElement;
  root.setAttribute('data-uva-color-scheme', 'dark');
  const { background, color } = document.body.style;
  document.body.style.background = 'var(--uva-color-surface)';
  document.body.style.color = 'var(--uva-color-text)';
  try {
    await fn();
  } finally {
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== sheet);
    root.removeAttribute('data-uva-color-scheme');
    Object.assign(document.body.style, { background, color });
  }
}
