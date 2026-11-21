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
  uvalib-metadata:not(:defined),
  uvalib-tag-list:not(:defined) {
    display: block;
    line-height: 1.5;
    visibility: hidden;
    animation: uvalib-site-page-reveal 0s 2s forwards;
  }
  /* A chip row: hidden, one 44px row tall (with the scrolling row's padding), the raw
     children kept on one line so they cannot make it taller. */
  uvalib-chip-group:not(:defined) {
    display: block;
    min-height: 44px;
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    visibility: hidden;
    animation: uvalib-site-page-reveal 0s 2s forwards;
  }
  uvalib-chip-group[scroll]:not(:defined) {
    min-height: calc(44px + 0.75rem);
  }
  /* Its text is drawn from attributes: hold one line until it upgrades. */
  uvalib-results-count:not(:defined) {
    display: block;
    min-block-size: 1.5em;
  }
  uvalib-tag-list:not(:defined)[hidden],
  uvalib-results-count:not(:defined)[hidden] {
    display: none;
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
  /* A combobox: its label (from the attribute) and one 44px field (plus a one-line
     description) held, so nothing moves when it upgrades. A fallback <input list> child
     works meanwhile; the other children (options, a datalist) stay out of sight. */
  uvalib-combobox:not(:defined) {
    display: block;
    min-block-size: calc(1.5em + 0.25rem + 44px);
    line-height: 1.5;
  }
  uvalib-combobox[description]:not(:defined) {
    min-block-size: calc(3em + 0.5rem + 44px);
  }
  uvalib-combobox:not(:defined)::before {
    content: attr(label);
    display: block;
    margin-block-end: 0.25rem;
    font-weight: 600;
  }
  uvalib-combobox:not(:defined) > :not(input) {
    display: none;
  }
  uvalib-combobox:not(:defined) > input {
    display: block;
    box-sizing: border-box;
    inline-size: 100%;
    min-block-size: 44px;
    font: inherit;
    line-height: 1.2;
  }
  /* Image regions: the image at its own width and the list beside it (or under it), the
     layout the element keeps once it upgrades, so the image does not move. */
  uvalib-image-regions:not(:defined) {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-start;
  }
  uvalib-image-regions:not(:defined) > :is(img, picture) {
    display: block;
    flex: 0 1 auto;
    min-width: 0;
    max-width: 100%;
    height: auto;
  }
  uvalib-image-regions:not(:defined) > :is(ol, ul) {
    flex: 1 1 14rem;
    min-width: 0;
  }
  /* A map: its key instructions (the same text it shows) and the map's height held above
     the child list, so the list does not move when the map is drawn over the page's
     Leaflet. Padding, not margin, so it cannot collapse with the list's own top margin. */
  uvalib-map:not(:defined) {
    display: block;
  }
  uvalib-map:not(:defined)::before {
    content: 'Tab or arrow keys move between places; Enter opens one. With the map focused, arrow keys pan and + and − zoom.';
    display: block;
    padding-block-end: calc(0.5rem + max(12rem, var(--uvalib-map-height, min(24rem, 75vw))));
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--uva-color-text-muted, #4b5563);
  }
  @keyframes uvalib-site-page-reveal {
    to {
      visibility: visible;
    }
  }
`;
