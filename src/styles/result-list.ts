import { css } from 'lit';

// A lightweight results list for long result sets (issue #13), in base.css only (composed
// into `controls`): plain `<ul>` / `<li>` rows a page can render by the thousand, with no
// element per row. A row holds optional meta (badges, a date), the title (the row's one
// link), a snippet with the search terms in `<mark>`, and optional secondary actions, which
// sit at the end of the row on wide screens and wrap below it on phones.
//
// Speed: each row has `content-visibility: auto`, so the browser skips layout and paint for
// rows off screen, with `contain-intrinsic-block-size: auto 7rem` (a typical row) so the
// scroll bar stays steady and a row keeps its measured height once seen. Skipped rows stay in
// the DOM and the accessibility tree, and find-in-page and fragment links still reach them
// (the browser renders a row when it is found). That property also adds paint containment,
// which clips at the row's padding box: the rows keep 0.5rem of inline padding so the focus
// ring (3px plus its 2px offset) of the title link and the actions is never clipped.
//
// Highlights: `<mark>` in a snippet reads --uva-color-highlight and --uva-color-on-highlight
// (library.virginia.edu's orange-200 with dark text, 9.5:1; in dark, a dark orange with white
// text, 7.6:1), and is bold, so it never rests on colour alone; in forced colors it is drawn
// in the system Highlight colours.
export const resultList = css`
  .uvalib-result-list {
    display: block;
    margin: 0 0 1rem;
    padding: 0;
    list-style: none;
  }
  .uvalib-result {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: 1rem;
    align-items: start;
    margin: 0;
    padding: 0.75rem 0.5rem;
    border-block-end: 1px solid var(--uva-color-track, #e5e7eb);
    line-height: 1.5;
    overflow-wrap: anywhere;
    content-visibility: auto;
    contain-intrinsic-block-size: auto 7rem;
  }
  .uvalib-result > * {
    grid-column: 1;
    min-inline-size: 0;
    margin: 0;
  }
  .uvalib-result__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 0.75rem;
    color: var(--uva-color-text-muted, var(--uva-grey-A, #4f4f4f));
    font-size: 0.875rem;
  }
  /* Only as wide as its text, so the space beside a short title is not a link. */
  .uvalib-result__title {
    display: block;
    justify-self: start;
    font-size: 1.125rem;
    font-weight: 600;
    line-height: 1.4;
  }
  :is(a.uvalib-result__title, .uvalib-result__title a) {
    color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.15em;
  }
  :is(a.uvalib-result__title, .uvalib-result__title a):hover {
    text-decoration-thickness: 3px;
  }
  :is(a.uvalib-result__title, .uvalib-result__title a):focus-visible {
    outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
    outline-offset: 2px;
  }
  .uvalib-result__snippet {
    display: block;
    margin-block-start: 0.25rem;
  }
  .uvalib-result__snippet mark {
    padding-inline: 0.1em;
    border-radius: 2px;
    background: var(--uva-color-highlight, var(--uva-brand-orange-200, #ffc999));
    color: var(--uva-color-on-highlight, var(--uva-grey-darkest, #2b2b2b));
    font-weight: 700;
  }
  /* Wide: the actions at the end of the row, beside its first lines. */
  .uvalib-result > .uvalib-result__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.5rem;
    grid-column: 2;
    grid-row: 1 / span 4;
  }
  /* Phones: the actions below the row's text, wrapping. */
  @media (max-width: 40em) {
    .uvalib-result > .uvalib-result__actions {
      justify-content: flex-start;
      grid-column: 1;
      grid-row: auto;
      margin-block-start: 0.5rem;
    }
  }
  @media (forced-colors: active) {
    .uvalib-result__snippet mark {
      forced-color-adjust: none;
      background: Highlight;
      color: HighlightText;
    }
  }
`;
