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
// border, the alerts component's properties) are set in dark only.

/** Dark values for properties that have no one light value: each reader keeps its own. */
const darkOnly = `
  --uva-color-border: #7a84a0;
  --uvalib-alerts-text: #e8e8e8;
  --uvalib-alerts-header-bg: #0e4a57;
  --uvalib-alerts-alert1-bg: #4a1622;
  --uvalib-alerts-alert1-border: #ef3f6b;
  --uvalib-alerts-alert2-bg: #3d3510;
  --uvalib-alerts-alert2-border: #ecc602;
  --uvalib-alerts-alert3-bg: #0d3247;
  --uvalib-alerts-alert3-border: #55c4ec;
  --uvalib-alerts-regional-bg: #0f3a3d;
  --uvalib-alerts-regional-border: 0.2em solid #25cad3;
`;

const dark = unsafeCSS(darkOnly);

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
      --uva-color-control-border: light-dark(#808080, #7a84a0);
      --uva-color-track: light-dark(#e5e7eb, #2c3858);
      --uva-color-shadow: light-dark(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.6));
      --uva-color-pre-footer-bg: light-dark(var(--uva-blue-alt-300, #bfe7f7), #005679);
      --uva-color-pre-footer-text: light-dark(var(--uva-grey-darkest, #2b2b2b), #ffffff);
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
    @media (prefers-color-scheme: dark) {
      :root[data-uva-color-scheme='system'] {
        ${dark}
      }
    }
  }
`;
