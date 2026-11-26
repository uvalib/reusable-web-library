import { css, unsafeCSS } from 'lit';

/**
 * `<uvalib-metadata>` long lists before it upgrades (issue #34): a list of more than N values
 * shows its first N and a line for its "Show all" button (4px above a 32px button), as the
 * upgraded element does. CSS cannot read N from the attribute into :nth-child(), so the rules
 * are written out for limits 1 to 12; a page with a larger limit adds its own (README). A row's
 * own data-limit on its <dd> wins over list-limit (data-limit="0" shows them all); a data-limit
 * on the list itself works once upgraded but is not held before.
 */
const METADATA_LIMITS = Array.from({ length: 12 }, (_, i) => i + 1);
const metadataLimits = unsafeCSS(
  METADATA_LIMITS.map((n) => {
    const lists = [
      `uvalib-metadata[list-limit="${n}"]:not(:defined) > dl > dd:not([data-limit]) > :is(ul, ol):not([data-limit])`,
      `uvalib-metadata:not(:defined) > dl > dd[data-limit="${n}"] > :is(ul, ol)`,
    ];
    return (
      `${lists.map((l) => `${l} > li:nth-child(n + ${n + 1})`).join(',\n')} { display: none; }\n` +
      `${lists.map((l) => `${l}:has(> li:nth-child(${n + 1}))::after`).join(',\n')} { content: ''; display: block; block-size: 2.25rem; }`
    );
  }).join('\n'),
);

/**
 * `<uvalib-pager>` before it upgrades (issue #39): it draws everything from attributes, so the
 * hold draws it too, invisibly, laid out as the upgraded pager is, and nothing below moves.
 * Load-more wins over numbered pages, which win over previous/next, as in the element.
 *
 * Previous/next: each side a box of its title (from prev-label/next-label, on one line, at
 * most 48% wide, 2.75rem tall at least) under its kicker's line (0.75rem, or the text size
 * with no-style) and 0.15rem gap, side by side 1rem apart or stacked when they do not fit,
 * as the links are. Without a label, the side is its kicker. The kicker's line height is
 * worked out from the title's (exact when line-height is a number or normal).
 *
 * Numbered pages: one 2.75rem row, or two (0.25rem apart) when the pager is narrower than its
 * items: 1 to 7 pages are all shown; more show five numbers and one or two ellipses (one
 * near the start; near the end cannot be told from the attributes, so two are assumed).
 *
 * Load more: the "Showing N of M" line and the 44px button beside it (wrapping as they
 * wrap); the button is left out only for has-more="false" (a shown that has reached total
 * cannot be compared in CSS).
 *
 * The drawn boxes stay hidden after the two-second reveal (they are not links): if the script
 * never loads, the space stays empty.
 */
const OFF = ':defined, [hidden]';
const NOPAGES = `[pages=''], [pages='0'], [pages^='-']`;
const LOAD = `[mode='load-more' i]`;
const FEW = [1, 2, 3, 4, 5, 6, 7].map((n) => `[pages='${n}']`).join(', ');
const SECTIONS = `uvalib-pager:not(${OFF}, ${LOAD}, [pages]:not(${NOPAGES}))`;
/** A side's box (prev ::before, next ::after), with `extra` on the host. */
const side = (s: 'prev' | 'next', extra = '') =>
  `${SECTIONS}[${s}-href]:not([${s}-href=''])${extra}::${s === 'prev' ? 'before' : 'after'}`;
const sides = (extra = '') => `${side('prev', extra)}, ${side('next', extra)}`;
const noLabel = (s: 'prev' | 'next', extra = '') =>
  side(s, `${extra}:is(:not([${s}-label]), [${s}-label=''])`);
const noLabels = (extra = '') => `${noLabel('prev', extra)}, ${noLabel('next', extra)}`;
const PAGES = `uvalib-pager[pages]:not(${OFF}, ${LOAD}, ${NOPAGES})`;
const MORE = `uvalib-pager${LOAD}:not(${OFF})`;
const pagesRow = (n: number) => `${n * 2.75 + (n - 1) * 0.25}rem`;
const pagerRules = unsafeCSS(`
  uvalib-pager:not(:defined) { line-height: inherit; }
  ${SECTIONS}:is([prev-href]:not([prev-href='']), [next-href]:not([next-href=''])) {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 1rem;
  }
  ${sides()} {
    display: block;
    max-width: 48%;
    min-width: 0;
    min-height: 2.75rem;
    padding-block-start: calc(0.75 * 1lh + 0.15rem);
    padding-block-start: calc(1lh * 0.75rem / 1em + 0.15rem);
    overflow: hidden;
    white-space: nowrap;
    visibility: hidden;
  }
  ${side('prev')} { content: attr(prev-label); }
  ${side('next')} { content: attr(next-label); margin-inline-start: auto; }
  ${sides('[no-style]')} { padding-block-start: calc(1lh + 0.15rem); }
  ${noLabels()} {
    padding-block-start: 0;
    font-size: 0.75rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  ${noLabel('prev')} { content: 'Previous'; }
  ${noLabel('next')} { content: 'Next'; }
  ${noLabels('[no-style]')} {
    padding-block-start: 0;
    font-size: inherit;
    letter-spacing: normal;
    text-transform: none;
  }
  ${PAGES} { container-type: inline-size; }
  ${PAGES}::before { content: ''; display: block; block-size: 2.75rem; }
  ${[4, 5, 6, 7]
    .map(
      (n) =>
        `@container (width < ${pagesRow(n)}) { uvalib-pager[pages='${n}']:not(${OFF}, ${LOAD})::before { block-size: 5.75rem; } }`,
    )
    .join('\n')}
  @container (width < 18.25rem) {
    ${PAGES}:not(${FEW})::before { block-size: 5.75rem; }
  }
  @container (16.5rem <= width < 18.25rem) {
    ${PAGES}:not(${FEW}):is(:not([page]), [page='1'], [page='2'], [page='3'])::before {
      block-size: 2.75rem;
    }
  }
  ${MORE} {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1rem;
  }
  ${MORE}::before {
    content: 'Showing ' attr(shown);
    min-width: 0;
    overflow-wrap: anywhere;
    visibility: hidden;
  }
  ${MORE}[total]:not([total=''], [total='0'])::before {
    content: 'Showing ' attr(shown) ' of ' attr(total);
  }
  ${MORE}:not([has-more='false' i])::after {
    content: 'Load more';
    display: block;
    min-width: 44px;
    min-height: 44px;
    padding: 0.5rem 1.25rem;
    border: 2px solid transparent;
    font: inherit;
    font-size: 1rem;
    line-height: 1.2;
    visibility: hidden;
  }
  ${MORE}[no-style]::after { border-width: 0; }
`);

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
    font-family: var(
      --uva-font-family,
      franklin-gothic-urw,
      'UVA Franklin Fallback',
      Arial,
      Helvetica,
      sans-serif
    );
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
  /* A description: one line of it (0.875rem at 1.5, 0.25rem below the row). */
  uvalib-chip-group[description]:not(:defined) {
    padding-block-end: 1.5625rem;
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
  ${pagerRules}
  /* The pre-upgrade rules here set display, which beats the hidden attribute's (issue #7).
     More specific than each of them (two pseudo-classes or attributes), so it needs no importance flag. */
  :where(
      site-page,
      uvalib-breadcrumbs,
      uvalib-card,
      uvalib-card-grid,
      uvalib-pager,
      uvalib-contents,
      uvalib-metadata,
      uvalib-chip-group,
      uvalib-tabs,
      uvalib-combobox,
      uvalib-image-regions,
      uvalib-map,
      uvalib-filter-drawer,
      uvalib-filter,
      uvalib-list-filter
    ):not(:defined)[hidden],
  :where(uvalib-combobox, uvalib-image-regions):not(:defined) > [hidden] {
    display: none;
  }
  /* A record's details before <uvalib-metadata> upgrades (issue #34): the rows already laid
     out as it lays them out (label beside value from 36rem of its own width, stacked below;
     8px above and below each row, a 1px rule between rows; lists without bullets, 4px apart),
     so the page does not move when it upgrades. Rows the attributes add (creator, rights,
     citation) are not in the page's <dl> and cannot be held. */
  uvalib-metadata:not(:defined) {
    container-type: inline-size;
    font-size: 1rem;
  }
  uvalib-metadata:not(:defined) > dl {
    display: grid;
    grid-template-columns: minmax(7rem, 12rem) minmax(0, 1fr);
    column-gap: 1.5rem;
    margin: 0;
  }
  uvalib-metadata:not(:defined) > dl > dt {
    grid-column: 1;
    margin: 0;
    padding-block: 0.5rem;
    font-weight: 700;
  }
  uvalib-metadata:not(:defined) > dl > dd {
    grid-column: 2;
    margin: 0;
    padding-block: 0.5rem;
  }
  uvalib-metadata:not(:defined) > dl > dt:not(:first-child),
  uvalib-metadata:not(:defined) > dl > dt:not(:first-child) + dd {
    border-block-start: 1px solid transparent;
  }
  uvalib-metadata:not(:defined) > dl > dd > :is(ul, ol) {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  uvalib-metadata:not(:defined) > dl > dd li + li {
    margin-block-start: 0.25rem;
  }
  @container (width < 36rem) {
    uvalib-metadata:not(:defined) > dl {
      grid-template-columns: minmax(0, 1fr);
    }
    uvalib-metadata:not(:defined) > dl > :is(dt, dd) {
      grid-column: 1;
    }
    uvalib-metadata:not(:defined) > dl > dt {
      padding-block-end: 0;
    }
    uvalib-metadata:not(:defined) > dl > dd {
      padding-block-start: 0;
    }
    uvalib-metadata:not(:defined) > dl > dt:not(:first-child) + dd {
      border-block-start: 0;
    }
  }
  ${metadataLimits}
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
  /* A list filter draws its label, a 44px field and a one-line count from attributes: hold
     their height (less the label with hide-label, less the count with results-count), so the
     list below does not move when it upgrades. The list itself is the page's and stays
     fully shown until then. */
  uvalib-list-filter:not(:defined) {
    display: block;
    font-size: 1rem;
    line-height: 1.5;
    min-block-size: calc(1.5em + 0.25rem + 44px + 0.25rem + 1.5em);
  }
  uvalib-list-filter[hide-label]:not(:defined) {
    min-block-size: calc(44px + 0.25rem + 1.5em);
  }
  uvalib-list-filter[results-count]:not(:defined) {
    min-block-size: calc(1.5em + 0.25rem + 44px);
  }
  uvalib-list-filter[hide-label][results-count]:not(:defined) {
    min-block-size: 44px;
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
  /* A collapsed filter group (<uvalib-filter collapsible collapsed>) draws only its 44px
     legend button once it upgrades: hold that height. Low specificity, so the [hidden] rule
     above still wins. */
  :where(uvalib-filter[collapsible][collapsed]):not(:defined) {
    display: block;
    min-block-size: 44px;
  }
  /* A filter drawer on a phone (the default 48rem breakpoint): once it upgrades only its 44px
     "Search and filters" button shows, so hold that height and keep the form and filters out
     of sight meanwhile; nothing moves when it upgrades. A page with its own breakpoint adds the
     same two rules in a media query of that width (see the README). Low specificity, so the
     [hidden] rule above still wins. */
  @media (max-width: 48rem) {
    :where(uvalib-filter-drawer:not([breakpoint])):not(:defined) {
      display: block;
      min-block-size: 44px;
    }
    :where(uvalib-filter-drawer:not([breakpoint])):not(:defined) > * {
      display: none;
    }
  }
  /* A contents list before <uvalib-contents> upgrades (a .uvalib-sidebar-layout sidebar): the
     headline's line held above, the links already padded as it pads them (the rules drawn
     transparent while hidden), so the list does not move. Narrow (the default 64rem
     collapse-below, closed): only its 44px button shows once it upgrades, so hold that and
     clip the list; the reveal releases it, so the list still shows if the script never loads.
     The [hidden] rule above still wins (it alone sets display). */
  uvalib-contents:not(:defined) {
    padding-block-start: calc(1.125rem * 1.3 + 0.5rem);
    animation-name: uvalib-contents-reveal;
  }
  /* With full-href (issue #38): the full-contents link's line held below the list (0.5rem
     above a 44px link). A window="N" list is not held: the whole list shows until it upgrades
     (in a sidebar beside the content, nothing else moves). */
  uvalib-contents[full-href]:not(:defined) {
    padding-block-end: calc(44px + 0.5rem);
  }
  :where(uvalib-contents):not(:defined) :is(ol, ul) {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  :where(uvalib-contents):not(:defined) > :is(ol, ul) {
    border-block: 1px solid transparent;
  }
  :where(uvalib-contents):not(:defined) > :is(ol, ul) > li + li {
    border-block-start: 1px solid transparent;
  }
  :where(uvalib-contents):not(:defined) li > a {
    display: block;
    padding: 0.5rem 0.75rem 0.5rem calc(0.75rem + 4px);
  }
  :where(uvalib-contents):not(:defined) li li > a {
    padding-block: 0.25rem;
  }
  :where(uvalib-contents):not(:defined) li :is(ol, ul) {
    padding-inline-start: 1rem;
    border-inline-start: 2px solid transparent;
  }
  /* In light DOM (no-shadow-dom) a nested list is indented by a margin, with 0.5rem below. */
  :where(uvalib-contents[no-shadow-dom]):not(:defined) li :is(ol, ul) {
    margin: 0 0 0.5rem 0.75rem;
    padding-inline-start: 0;
  }
  @media (max-width: 64rem) {
    uvalib-contents:not([collapse-below], [open]):not(:defined) {
      max-block-size: 44px;
      padding-block: 0;
      overflow: hidden;
    }
  }
  @keyframes uvalib-contents-reveal {
    to {
      visibility: visible;
      max-block-size: none;
      overflow: visible;
    }
  }
  /* A dialog before <uvalib-dialog> upgrades: its children are the dialog's content, never
     shown in the page, so nothing flashes or moves. Once defined, a closed dialog renders
     nothing (its host is display: contents around a closed <dialog>). */
  uvalib-dialog:not(:defined) {
    display: none;
  }
  /* A citation before <uvalib-citation> upgrades: only the first format's citation, boxed
     as it will be, with the label and 44px format bar held above it (none for hide-label)
     and the 44px Copy citation row below, so nothing moves when it upgrades (an app's
     citations property cannot be held). */
  uvalib-citation:not(:defined) {
    display: block;
    font-size: 1rem;
    line-height: 1.5;
  }
  uvalib-citation:not(:defined):has(> [data-format]) {
    padding-block: calc(2rem + 44px + 0.75rem) calc(0.75rem + 44px);
  }
  uvalib-citation[hide-label]:not(:defined):has(> [data-format]) {
    padding-block-start: calc(44px + 0.75rem);
  }
  uvalib-citation:not(:defined) > [data-format] {
    margin: 0;
    padding: 0.75rem 1rem;
    border: 1px solid transparent;
    overflow-wrap: anywhere;
    text-wrap: pretty;
  }
  uvalib-citation:not(:defined) > [data-format] ~ [data-format],
  uvalib-citation:not(:defined) > [slot] {
    display: none;
  }
  /* Printing a <site-page> (issue #20; its own styles leave out the chrome): a dark scheme
     prints light (the role tokens resolve to their light values), and the content's links
     are black and underlined, so they are told apart without colour. Content is <main> in
     light DOM and the unslotted children in shadow DOM. print-chrome keeps the page as it is
     shown, apart from the light scheme. */
  @media print {
    :root[data-uva-color-scheme]:has(site-page) {
      color-scheme: light;
      --uva-color-scheme: light;
    }
    /* Light DOM's trail, here too, as the pre-upgrade rule above (unlayered) would win. */
    site-page:not([print-chrome]) > [slot='breadcrumbs'] {
      display: none;
    }
    site-page:not([print-chrome]) > :not([slot], site-header, site-footer, .alerts-list) :any-link,
    site-page:not([print-chrome]) > :any-link:not([slot], .skip-link) {
      color: #000;
      text-decoration: underline;
    }
  }
  @keyframes uvalib-site-page-reveal {
    to {
      visibility: visible;
    }
  }
`;
