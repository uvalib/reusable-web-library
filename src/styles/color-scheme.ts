import { css, unsafeCSS } from 'lit';

// Hand-written (not generated): the opt-in dark mode. Nothing here applies until the page's
// root element has `data-uva-color-scheme` (set by `color-scheme-switch` or the documented
// inline snippet), and only in browsers with light-dark(); everywhere else the role tokens are
// undefined and every component falls back to its palette token or hex value, exactly as
// before. The palette tokens in tokens.ts are untouched.
//
// Role tokens are light-dark() pairs; the light half reads the palette token, so a host's
// own `:root { --uva-brand-*: … }` still applies in light mode. They are resolved where they
// are used, against that element's `color-scheme`, which every component sets from
// `--uva-color-scheme` (default `light`). Tokens with no single light value (the decorative
// border) are set in dark only.

/** Dark values for properties that have no one light value: each reader keeps its own. */
const darkOnly = `
  --uva-color-border: #7a84a0;
`;

const dark = unsafeCSS(darkOnly);

/**
 * Links in the pre-footer band are the site's own content: unstyled ones would keep the
 * browser's dark link colours (#9e9eff is 3.37:1 on the band). White is 8.05:1, visited too.
 * Layered like the rest of this sheet, so a site's own link colours still win.
 */
const preFooterLinks = 'color: var(--uva-color-pre-footer-text, #ffffff);';

export const colorScheme = css`
  @supports (color: light-dark(#000, #fff)) {
    :root[data-uva-color-scheme] {
      --uva-color-surface: light-dark(#ffffff, #10172b);
      --uva-color-surface-raised: light-dark(#ffffff, #232d4b);
      --uva-color-surface-hover: light-dark(var(--uva-grey-100, #dadada), #2c3858);
      --uva-color-text: light-dark(var(--uva-grey-darkest, #2b2b2b), #e8e8e8);
      --uva-color-text-muted: light-dark(#4b5563, #adadad);
      --uva-color-link: light-dark(var(--uva-brand-blue, #232d4b), #87b9d9);
      --uva-color-utility-link: light-dark(var(--uva-blue-alt-dark, #005679), #91d8f2);
      --uva-color-focus: light-dark(var(--uva-brand-orange, #e57200), #ffb370);
      --uva-color-current: light-dark(var(--uva-brand-orange, #e57200), #e57200);
      --uva-color-accent-bg: light-dark(var(--uva-brand-blue, #232d4b), #87b9d9);
      --uva-color-on-accent: light-dark(#ffffff, #10172b);
      --uva-color-control-border: light-dark(var(--uva-grey, #808080), #7a84a0);
      --uva-color-input-text: light-dark(#1f2937, #e8e8e8);
      --uva-color-track: light-dark(#e5e7eb, #2c3858);
      --uva-color-shadow: light-dark(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.6));
      --uva-color-pre-footer-bg: light-dark(var(--uva-blue-alt-300, #bfe7f7), #005679);
      --uva-color-pre-footer-text: light-dark(var(--uva-grey-darkest, #2b2b2b), #ffffff);
      /* <site-alerts>: library.virginia.edu's alert colours, and a muted dark palette. Text
         is 7:1 or more (WCAG AAA) on every alert background in both schemes. */
      --uva-color-alert-text: light-dark(var(--uva-grey-darkest, #2b2b2b), #e8e8e8);
      --uva-color-alert-link: light-dark(var(--uva-blue-alt-B, #141e3c), #ffffff);
      --uva-color-alert-header-bg: light-dark(var(--uva-teal, #25cad3), #0e4a57);
      --uva-color-alert-header-text: light-dark(#000000, #e8e8e8);
      --uva-color-alert-critical-bg: light-dark(var(--uva-red-100, #fbcfda), #4a1622);
      --uva-color-alert-critical-border: light-dark(var(--uva-red-B, #b30000), #ef3f6b);
      --uva-color-alert-warning-bg: light-dark(var(--uva-yellow-100, #fef6c8), #3d3510);
      --uva-color-alert-warning-border: light-dark(var(--uva-yellow, #ecc602), #ecc602);
      --uva-color-alert-info-bg: light-dark(var(--uva-blue-alt-300, #bfe7f7), #0d3247);
      --uva-color-alert-info-border: light-dark(var(--uva-blue-alt, #007bac), #55c4ec);
      --uva-color-alert-regional-bg: light-dark(var(--uva-yellow-100, #fef6c8), #3d3510);
      --uva-color-alert-regional-border: light-dark(var(--uva-yellow, #ecc602), #ecc602);
      --uva-color-alert-regional-info-bg: light-dark(var(--uva-teal-200, #c8f2f4), #0f3a3d);
      --uva-color-alert-regional-info-border: light-dark(var(--uva-teal, #25cad3), #25cad3);
    }
    :root[data-uva-color-scheme='system'] {
      color-scheme: light dark;
      --uva-color-scheme: light dark;
    }
    :root[data-uva-color-scheme='light'] {
      color-scheme: light;
      --uva-color-scheme: light;
    }
    :root[data-uva-color-scheme='dark'] {
      color-scheme: dark;
      --uva-color-scheme: dark;
      ${dark}
    }
    :root[data-uva-color-scheme='dark'] [slot='pre-footer'] a {
      ${unsafeCSS(preFooterLinks)}
    }
    @media (prefers-color-scheme: dark) {
      :root[data-uva-color-scheme='system'] {
        ${dark}
      }
      :root[data-uva-color-scheme='system'] [slot='pre-footer'] a {
        ${unsafeCSS(preFooterLinks)}
      }
    }
  }
`;
