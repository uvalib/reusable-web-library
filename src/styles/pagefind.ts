import { css, unsafeCSS } from 'lit';

// pagefind.css: a UVA Library theme for Pagefind's default search UI (pagefind-ui.js, the
// `new PagefindUI({ element })` widget, 1.x). It replaces Pagefind's own pagefind-ui.css,
// which a page should no longer link: those rules carry Svelte hash classes (three to five
// classes of specificity) that would fight these. Pagefind's script and markup are unchanged.
//
// The look follows the library's own search: the field and the Clear button like base.css's
// .uvalib-input and a small outline .uvalib-button, the filters like <uvalib-filter> (a
// fieldset of checkbox rows, "value (count)"), result titles in the link colour, excerpts
// with library.virginia.edu's <mark> colour, and "Load more results" as a .uvalib-button.
//
// Fixes to the stock UI's accessibility that CSS can make: 16px+ text (the stock scale is
// 0.8, so 12.8px), readable placeholder text (stock: 20% opacity), a visible focus ring on
// every control, a hidden Clear button that can no longer be focused (stock: opacity 0 but
// still in the tab order), native checkboxes (the stock ones are drawn with `appearance:
// none` and vanish in forced colors), 44px targets for the filter headings (stock 19px),
// checkboxes and buttons, no fixed heights that clip text when it is zoomed or spaced, no
// decorative arrow read out before sub-result links, and a 320px reflow (fieldsets can
// shrink). The gaps that need script are handled by <uvalib-pagefind-search>.
//
// Colours: the dark-mode role tokens, each with its palette token or hex fallback, so the
// sheet is readable without tokens.css and follows `data-uva-color-scheme` (emit-css copies
// the role tokens it reads into pagefind.css, as it does for base.css).

const P = '.pagefind-ui';
const p = unsafeCSS(P);

/** The search field's height: the Clear button sits inside it, 6px from each edge (44px). */
const FIELD = 56;

/**
 * Pagefind's own custom properties, mapped to the library's tokens. On :root like
 * Pagefind's, so a site can still set them; this theme reads them in its own rules.
 */
const props = css`
  :root {
    --pagefind-ui-scale: 1;
    --pagefind-ui-primary: var(--uva-color-button-bg, var(--uva-blue-alt, #007bac));
    --pagefind-ui-text: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
    --pagefind-ui-background: var(--uva-color-surface-raised, #ffffff);
    --pagefind-ui-border: var(--uva-color-control-border, var(--uva-grey, #808080));
    --pagefind-ui-tag: var(--uva-color-track, #e5e7eb);
    --pagefind-ui-border-width: 1px;
    --pagefind-ui-border-radius: 5px;
    --pagefind-ui-image-border-radius: 5px;
    --pagefind-ui-image-box-ratio: 3 / 2;
    --pagefind-ui-font: var(--uva-font-family, franklin-gothic-urw, Arial, Helvetica, sans-serif);
  }
`;

export const pagefind = css`
  ${props}
  ${p} {
    inline-size: 100%;
    color: var(--pagefind-ui-text);
    font-family: var(--pagefind-ui-font);
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  ${p} *,
  ${p} *::before,
  ${p} *::after {
    box-sizing: border-box;
  }
  ${p} .pagefind-ui__hidden {
    display: none !important;
  }
  /* The Clear button while the field is empty: hidden from sight, the tab order and screen
     readers (the stock opacity: 0 left an invisible, focusable button). It keeps its width,
     which Pagefind measures to pad the field. */
  ${p} .pagefind-ui__suppressed {
    visibility: hidden;
    pointer-events: none;
  }

  /* The field: .uvalib-input, taller, with the search icon inside it. */
  ${p} .pagefind-ui__form {
    position: relative;
    margin: 0;
  }
  ${p} .pagefind-ui__form::before {
    content: '';
    position: absolute;
    z-index: 1;
    inset-block-start: calc(${FIELD / 2}px - 0.55rem);
    inset-inline-start: 0.9rem;
    inline-size: 1.1rem;
    block-size: 1.1rem;
    background-color: var(--uva-color-text-muted, #4b5563);
    -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 18'%3E%3Cpath d='M12.75 11.25h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99 1.49-1.49-4.99-5Zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z'/%3E%3C/svg%3E")
      center / contain no-repeat;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 18'%3E%3Cpath d='M12.75 11.25h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99 1.49-1.49-4.99-5Zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z'/%3E%3C/svg%3E")
      center / contain no-repeat;
    pointer-events: none;
  }
  ${p} .pagefind-ui__search-input {
    display: block;
    inline-size: 100%;
    min-block-size: ${FIELD}px;
    margin: 0;
    padding: 0.5rem 5rem 0.5rem 2.6rem;
    border: var(--pagefind-ui-border-width) solid var(--pagefind-ui-border);
    border-radius: var(--pagefind-ui-border-radius);
    background: var(--pagefind-ui-background);
    color: var(--uva-color-input-text, var(--uva-grey-darkest, #2b2b2b));
    font: inherit;
    font-size: 1.1rem;
    line-height: 1.2;
    appearance: none;
  }
  ${p} .pagefind-ui__search-input::placeholder {
    color: var(--uva-color-text-muted, #4b5563);
    opacity: 1;
  }
  /* Clear: a small outline .uvalib-button inside the field's end. */
  ${p} .pagefind-ui__search-clear {
    position: absolute;
    z-index: 1;
    inset-block-start: 6px;
    inset-inline-end: 6px;
    display: inline-flex;
    align-items: center;
    min-block-size: ${FIELD - 12}px;
    min-inline-size: 44px;
    margin: 0;
    padding: 0.25rem 0.875rem;
    border: 2px solid currentColor;
    border-radius: 0.25rem;
    background: var(--pagefind-ui-background);
    color: var(--uva-color-utility-link, var(--uva-blue-alt-dark, #005679));
    font: inherit;
    font-size: 0.9rem;
    line-height: 1.2;
    cursor: pointer;
  }
  ${p} .pagefind-ui__search-clear:hover {
    background: var(--uva-color-surface-hover, var(--uva-grey-100, #dadada));
  }

  /* Filters on the start side and results beside them; stacked when there is no room. */
  ${p} .pagefind-ui__drawer {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 1rem 2.5rem;
  }
  ${p} fieldset {
    min-inline-size: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }
  ${p} .pagefind-ui__filter-panel {
    flex: 1 1 15rem;
    min-inline-size: min(15rem, 100%);
    margin-block-start: 1.25rem;
  }
  ${p} .pagefind-ui__filter-panel-label {
    margin: 0 0 0.25rem;
    padding: 0;
    font-size: 1.1rem;
    font-weight: 700;
  }
  ${p} .pagefind-ui__filter-block {
    border-block-end: 1px solid var(--pagefind-ui-tag);
  }
  ${p} .pagefind-ui__filter-name {
    display: list-item;
    min-block-size: 44px;
    padding: 0.6rem 0.25rem;
    font-weight: 700;
    cursor: pointer;
  }
  ${p} .pagefind-ui__filter-name:hover {
    color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
    text-decoration: underline;
  }
  /* The facet's own legend repeats the summary above it: kept for screen readers only. */
  ${p} .pagefind-ui__filter-group-label {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  /* A long facet (every author) scrolls in its own box; the padding keeps focus rings in. */
  ${p} .pagefind-ui__filter-group {
    max-block-size: 22rem;
    overflow-y: auto;
    padding: 0 6px 0.5rem;
  }
  ${p} .pagefind-ui__filter-value {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-block-size: 44px;
  }
  ${p} .pagefind-ui__filter-checkbox {
    flex: none;
    inline-size: 24px;
    block-size: 24px;
    margin: 0;
    accent-color: var(--pagefind-ui-primary);
    cursor: pointer;
  }
  ${p} .pagefind-ui__filter-label {
    display: flex;
    flex: 1;
    align-items: center;
    align-self: stretch;
    padding-block: 0.25rem;
    cursor: pointer;
  }
  ${p} .pagefind-ui__filter-value--checked .pagefind-ui__filter-label {
    font-weight: 700;
  }

  /* Results. */
  ${p} .pagefind-ui__results-area {
    flex: 1000 1 25rem;
    min-inline-size: min(25rem, 100%);
    margin-block-start: 1.25rem;
  }
  ${p} .pagefind-ui__message {
    margin: 0 0 0.75rem;
    padding-block: 0.6rem;
    font-weight: 700;
  }
  ${p} .pagefind-ui__results {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  ${p} .pagefind-ui__result {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin: 0;
    padding-block: 1.25rem;
    border-block-start: 1px solid var(--pagefind-ui-tag);
  }
  ${p} .pagefind-ui__result:last-of-type {
    border-block-end: 1px solid var(--pagefind-ui-tag);
  }
  ${p} .pagefind-ui__result-thumb {
    position: relative;
    flex: 0 0 min(7.5rem, 25%);
    aspect-ratio: var(--pagefind-ui-image-box-ratio);
  }
  ${p} .pagefind-ui__result-image {
    display: block;
    max-inline-size: 100%;
    max-block-size: 100%;
    margin-inline: auto;
    border-radius: var(--pagefind-ui-image-border-radius);
  }
  ${p} .pagefind-ui__result-inner {
    flex: 1;
    min-inline-size: 0;
  }
  ${p} .pagefind-ui__result-title {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 700;
    line-height: 1.3;
  }
  ${p} .pagefind-ui__result-link {
    color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.15em;
  }
  ${p} .pagefind-ui__result-link:hover {
    text-decoration-thickness: 3px;
  }
  ${p} .pagefind-ui__result-excerpt {
    margin: 0.35rem 0 0;
  }
  /* library.virginia.edu's <mark>: orange-200 with dark text (9.5:1). In the opt-in dark
     mode, a dark orange with white text (7.6:1). Here, not in tokens.css, so the header's
     colour-scheme switch does not carry it. */
  ${p} mark {
    padding-inline: 0.1em;
    border-radius: 2px;
    background: var(--uva-brand-orange-200, #ffc999);
    color: var(--uva-grey-darkest, #2b2b2b);
  }
  @supports (color: light-dark(#000, #fff)) {
    :root[data-uva-color-scheme] ${p} mark {
      background: light-dark(var(--uva-brand-orange-200, #ffc999), #854200);
      color: light-dark(var(--uva-grey-darkest, #2b2b2b), #ffffff);
    }
  }
  /* A page's sections (showSubResults): indented under the page, with no arrow glyph. */
  ${p} .pagefind-ui__result-nested {
    margin-block-start: 0.75rem;
    padding-inline-start: 1rem;
    border-inline-start: 3px solid var(--pagefind-ui-tag);
  }
  ${p} .pagefind-ui__result-nested .pagefind-ui__result-title {
    font-size: 1rem;
  }
  ${p} .pagefind-ui__result-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0.75rem 0 0;
    padding: 0;
    list-style: none;
  }
  ${p} .pagefind-ui__result-tag {
    padding: 0.1rem 0.6rem;
    border: 1px solid transparent;
    border-radius: var(--pagefind-ui-border-radius);
    background: var(--pagefind-ui-tag);
    font-size: 0.85rem;
  }
  /* The placeholder while a result loads: a grey bar (its dots hidden). */
  ${p} .pagefind-ui__loading {
    border-radius: var(--pagefind-ui-border-radius);
    background: var(--pagefind-ui-tag);
    color: transparent;
  }

  /* Load more results: .uvalib-button. */
  ${p} .pagefind-ui__button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-block-size: 44px;
    margin: 1.5rem 0 0;
    padding: 0.5rem 1.25rem;
    border: 2px solid var(--pagefind-ui-primary);
    border-radius: var(--pagefind-ui-border-radius);
    background: var(--pagefind-ui-primary);
    color: var(--uva-color-button-text, #ffffff);
    font: inherit;
    font-size: 1rem;
    line-height: 1.2;
    cursor: pointer;
  }
  ${p} .pagefind-ui__button:hover {
    border-color: var(--uva-color-button-hover-bg, var(--uva-blue-alt-A, #005679));
    background: var(--uva-color-button-hover-bg, var(--uva-blue-alt-A, #005679));
  }
  ${p} .pagefind-ui__button:active {
    border-color: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
    background: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
  }

  /* <uvalib-pagefind-search>: the field's label above it. */
  /* Before Pagefind's script has drawn the field, hold its height (the label's line and the
     field), so what follows does not jump. */
  uvalib-pagefind-search {
    display: block;
    min-block-size: calc(1.5em + 0.35rem + ${FIELD}px);
  }
  uvalib-pagefind-search[label-hidden] {
    min-block-size: ${FIELD}px;
  }
  .uvalib-pagefind-search__label {
    display: block;
    margin: 0 0 0.35rem;
    font-weight: 700;
    line-height: 1.5;
  }

  ${p} :is(a, button, input, summary):focus-visible {
    outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
    outline-offset: 2px;
  }

  @media (forced-colors: active) {
    ${p} .pagefind-ui__form::before {
      forced-color-adjust: none;
      background-color: CanvasText;
    }
    ${p} :is(.pagefind-ui__search-clear, .pagefind-ui__button) {
      border-color: ButtonText;
    }
    /* Forced colors drop the fills: tags keep a visible outline, and a loading result a
       grey outlined bar with its dots in GrayText. */
    ${p} .pagefind-ui__result-tag {
      border-color: CanvasText;
    }
    ${p} .pagefind-ui__loading {
      border: 1px solid GrayText;
      color: GrayText;
    }
    ${p} :is(.pagefind-ui__search-clear, .pagefind-ui__button):hover {
      border-color: Highlight;
      color: Highlight;
    }
  }
`;
