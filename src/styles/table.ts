import { css, unsafeCSS } from 'lit';

// Data tables for host content, in base.css only (composed into `controls`): no behaviour, so
// no element. Unlayered like the rest of base.css; a host restyles them with a more specific
// selector.
//
// The look is library.virginia.edu's W3.CSS tables (w3-table, w3-striped): left-aligned cells
// padded 8px with the first column 16px from the start edge, aligned to the top, a light rule
// between rows (the #dadada border <library-weekly-hours> draws), and #f1f1f1 stripes. In rem
// (0.5rem / 1rem) like the library's own components: 8.5px / 17px at the site's 17px root.
//
// Accessibility: every table needs an accessible name, its <caption> (shown as a bold line
// above the table) or aria-labelledby; header cells are <th> with scope. Cells wrap long
// values anywhere (`overflow-wrap: anywhere` also lowers a column's min-content width), so a
// long barcode, call number or URL never pushes a table past a phone's width (Virgo's Law
// holdings overflowed). Inside the scroll wrapper they break only where they must
// (break-word keeps each word's width), so a wide table scrolls instead of squeezing.
//
// Colours: two role tokens, --uva-color-table-border and --uva-color-table-stripe. Body text
// on a stripe is 12.5:1 in light and 12.6:1 in dark (AAA); muted text 6.7:1 and 6.9:1, links
// 12:1 and 7.3:1. Rules are decorative (the cell text and headers carry the structure), so
// they are light; forced colors draws them in CanvasText and drops the stripes, print draws
// them black.
//
// The stack variant (.uvalib-table--stack inside a .uvalib-table-stack wrapper) turns each
// row into a block below 30em of the wrapper's own width (a named size container), each cell
// labelled from its data-label. Changing a table's display can drop its table semantics in
// some browsers (WebKit), so a stacked table must carry explicit roles (table, rowgroup, row,
// columnheader, rowheader, cell); the scroll wrapper is the default for wide data.

/** Every cell of a .uvalib-table (thead, tbody and tfoot; the parser always adds a tbody). */
const CELL = (table: string) => `${table} > :is(thead, tbody, tfoot) > tr > :is(th, td)`;
const C = unsafeCSS(CELL('.uvalib-table'));
const STACK = '.uvalib-table-stack .uvalib-table--stack';
const S = unsafeCSS(STACK);

export const table = css`
  .uvalib-table {
    inline-size: 100%;
    margin-block: 0 1rem;
    border-collapse: collapse;
    border-spacing: 0;
    color: inherit;
  }
  .uvalib-table > caption {
    caption-side: top;
    padding-block: 0 0.5rem;
    font-size: 1.125rem;
    font-weight: 700;
    line-height: 1.3;
    text-align: start;
  }
  ${C} {
    padding: 0.5rem;
    border-block-end: 1px solid var(--uva-color-table-border, var(--uva-grey-100, #dadada));
    text-align: start;
    vertical-align: top;
    overflow-wrap: anywhere;
  }
  ${C}:first-child {
    padding-inline-start: 1rem;
  }
  .uvalib-table th {
    font-weight: 700;
  }
  .uvalib-table > thead > tr > :is(th, td) {
    border-block-end-width: 2px;
    vertical-align: bottom;
  }
  .uvalib-table--striped > tbody > tr:nth-child(even) {
    background-color: var(--uva-color-table-stripe, var(--uva-grey-200, #f1f1f1));
  }
  ${unsafeCSS(CELL('.uvalib-table.uvalib-table--compact'))} {
    padding: 0.25rem 0.5rem;
  }
  ${unsafeCSS(CELL('.uvalib-table.uvalib-table--compact'))}:first-child {
    padding-inline-start: 0.5rem;
  }
  /* Numbers: right-aligned (end), with digits of equal width so columns line up. */
  .uvalib-table .uvalib-table__num {
    text-align: end;
    font-variant-numeric: tabular-nums;
  }

  /* A wide table scrolls inside its wrapper (role="region", tabindex="0", aria-labelledby the
     caption's id), never the page. */
  .uvalib-table-scroll {
    display: block;
    max-inline-size: 100%;
    margin-block: 0 1rem;
    overflow-x: auto;
    overscroll-behavior-inline: contain;
  }
  .uvalib-table-scroll:focus-visible {
    outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
    outline-offset: 2px;
  }
  .uvalib-table-scroll > .uvalib-table {
    margin-block-end: 0;
  }
  ${unsafeCSS(CELL('.uvalib-table-scroll > .uvalib-table'))} {
    overflow-wrap: break-word;
  }

  /* Stacked rows on a narrow wrapper (opt-in; add explicit ARIA roles, see above). */
  .uvalib-table-stack {
    container: uvalib-table-stack / inline-size;
    margin-block: 0 1rem;
  }
  .uvalib-table-stack > .uvalib-table {
    margin-block-end: 0;
  }
  @container uvalib-table-stack (width <= 30em) {
    ${S},
    ${S} > :is(tbody, tfoot),
    ${S} > :is(tbody, tfoot) > tr,
    ${S} > :is(tbody, tfoot) > tr > :is(th, td),
    ${S} > caption {
      display: block;
    }
    /* The column headers stay for assistive technology; each cell shows its own label. */
    ${S} > thead {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    ${S} > :is(tbody, tfoot) > tr {
      padding-block: 0.5rem;
      border-block-end: 1px solid var(--uva-color-table-border, var(--uva-grey-100, #dadada));
    }
    ${S} > :is(tbody, tfoot) > tr > :is(th, td) {
      padding: 0.25rem 1rem;
      border: 0;
      text-align: start;
    }
    ${S} > :is(tbody, tfoot) > tr > [data-label]::before {
      content: attr(data-label);
      /* The label repeats the column header, so it is not read twice. */
      content: attr(data-label) / '';
      display: block;
      font-weight: 700;
    }
  }

  @media (forced-colors: active) {
    ${C},
    ${S} > :is(tbody, tfoot) > tr {
      border-color: CanvasText;
    }
  }
  @media print {
    ${C},
    ${S} > :is(tbody, tfoot) > tr {
      border-color: #000000;
    }
    .uvalib-table--striped > tbody > tr:nth-child(even) {
      background-color: transparent;
    }
    .uvalib-table-scroll {
      overflow: visible;
    }
  }
`;
