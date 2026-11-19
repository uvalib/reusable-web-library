import { css } from 'lit';

export const TYPEKIT_URL = 'https://use.typekit.net/oym8nvz.css';

// The body background has no fallback: without dark mode it stays transparent, as before.
//
// site-page:not(:defined) applies when base.css is linked in <head>, before the element
// upgrades: its own formatting context (flow-root), so a heading's top margin cannot collapse
// through to <body> and shift the page once the element upgrades, and invisible, so its
// content does not paint above where the header will go. If the script never loads, the
// content appears anyway after two seconds.
export const base = css`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  html,
  body {
    font-family: var(--uva-font-family, franklin-gothic-urw, Arial, Helvetica, sans-serif);
  }
  html {
    font-size: var(--uva-font-size-base, 17px);
  }
  body {
    margin: 0;
    line-height: 1.5;
    min-height: 100vh;
    color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
    background-color: var(--uva-color-surface);
  }
  site-page:not(:defined) {
    display: flow-root;
    visibility: hidden;
    animation: uvalib-site-page-reveal 0s 2s forwards;
  }
  uvalib-breadcrumbs:not(:defined),
  uvalib-card:not(:defined),
  uvalib-card-grid:not(:defined),
  uvalib-pager:not(:defined),
  uvalib-contents:not(:defined),
  uvalib-metadata:not(:defined) {
    display: block;
    line-height: 1.5;
    visibility: hidden;
    animation: uvalib-site-page-reveal 0s 2s forwards;
  }
  /* Tabs stay readable before the script runs: a block, one panel, and a gap the
     size of the tab row (44px) plus its 1rem margin, so the first panel does not
     jump when the element upgrades. Later data-tab panels stay hidden. */
  uvalib-tabs:not(:defined) {
    display: block;
    padding-block-start: calc(44px + 1rem);
  }
  uvalib-tabs:not(:defined) > [data-tab] ~ [data-tab] {
    display: none;
  }
  @keyframes uvalib-site-page-reveal {
    to {
      visibility: visible;
    }
  }
`;
