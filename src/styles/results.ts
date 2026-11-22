import { css } from 'lit';

// Badges, a results toolbar, an empty state and loading placeholders for host content, in
// base.css only (composed into `controls`): no behaviour, so no element. Unlayered like the
// rest of base.css; a host restyles them with a more specific selector.
//
// Colours: the base badge is neutral (the track grey with body text, AAA in both schemes); the
// category badge is the uvalib-card chip (blue-alt-300 with blue-alt-dark text, 6.13:1), the
// same in both schemes as the chip is, with the chip's shape and size. Count badges sit on
// media: near-black at 82% with white text, at least 11:1 over any image (AAA). Status badges
// read the alert role tokens (7:1 or more in both schemes) plus two success tokens, and always
// carry a text label; an icon is decorative. Every badge has a transparent border that shows
// in forced colors, where backgrounds are dropped.
//
// The toolbar stacks by its own width, not the viewport's: it is a named size container
// (`container: uvalib-toolbar / inline-size`), so in a sidebar or a drawer it stacks as on a
// phone. It is a block-level box, so inline-size containment (it no longer sizes to its
// content across) changes nothing in normal flow; inside a shrink-wrapped flex or grid item,
// give it a width. 30em in `@container` is 30 of the toolbar's own ems (the old media query
// read the browser's initial font size): 480px at the usual 16px.
//
// The empty state's heading is balanced and its sentence wraps with `text-wrap: pretty`;
// both are ignored where unsupported. Badges are never balanced: a balanced line in a box
// leaves empty space inside it.
export const results = css`
  .uvalib-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
    box-sizing: border-box;
    max-inline-size: 100%;
    margin: 0;
    padding: 0.1rem 0.6rem;
    border: 1px solid transparent;
    border-radius: 999px;
    background: var(--uva-color-track, var(--uva-grey-200, #f1f1f1));
    color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
    font-size: 0.875rem;
    font-weight: 400;
    line-height: 1.4;
    overflow-wrap: anywhere;
    vertical-align: middle;
  }
  .uvalib-badge--category {
    background: var(--uva-blue-alt-300, #bfe7f7);
    color: var(--uva-blue-alt-dark, #005679);
  }
  .uvalib-badge--body {
    font-size: 1rem;
  }
  .uvalib-badge > :is(svg, img, .uvalib-badge__icon) {
    flex: none;
    inline-size: 1em;
    block-size: 1em;
  }
  .uvalib-badge--count {
    border-radius: 5px;
    background: rgb(14 17 23 / 0.82);
    color: #ffffff;
    font-weight: 600;
  }
  .uvalib-badge--status {
    font-weight: 600;
  }
  .uvalib-badge:is(
    .uvalib-badge--success,
    .uvalib-badge--warning,
    .uvalib-badge--danger,
    .uvalib-badge--info
  ) {
    color: var(--uva-color-alert-text, var(--uva-grey-darkest, #2b2b2b));
  }
  .uvalib-badge--success {
    border-color: var(--uva-color-status-success-border, var(--uva-green-A, #4e9737));
    background: var(--uva-color-status-success-bg, var(--uva-green-200, #ddefdc));
  }
  .uvalib-badge--warning {
    border-color: var(--uva-color-alert-warning-border, var(--uva-yellow, #ecc602));
    background: var(--uva-color-alert-warning-bg, var(--uva-yellow-100, #fef6c8));
  }
  .uvalib-badge--danger {
    border-color: var(--uva-color-alert-critical-border, var(--uva-red-B, #b30000));
    background: var(--uva-color-alert-critical-bg, var(--uva-red-100, #fbcfda));
  }
  .uvalib-badge--info {
    border-color: var(--uva-color-alert-info-border, var(--uva-blue-alt, #007bac));
    background: var(--uva-color-alert-info-bg, var(--uva-blue-alt-300, #bfe7f7));
  }
  .uvalib-badge--new {
    background: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
    color: var(--uva-color-on-accent, #ffffff);
    font-weight: 700;
  }
  /* Badges over an image: the wrapper is the positioning box; the badge sits top-start. */
  .uvalib-media {
    position: relative;
    display: block;
  }
  .uvalib-media > :is(img, video, picture) {
    display: block;
    inline-size: 100%;
    block-size: auto;
  }
  .uvalib-media > :is(.uvalib-badge, .uvalib-media__badges) {
    position: absolute;
    inset-block-start: 0.5rem;
    inset-inline-start: 0.5rem;
    max-inline-size: calc(100% - 1rem);
  }
  .uvalib-media__badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  /* A results toolbar: search, selects, chip groups and the count, wrapping on phones. */
  .uvalib-toolbar {
    container: uvalib-toolbar / inline-size;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.75rem 1rem;
    margin-block: 0 1rem;
  }
  .uvalib-toolbar > * {
    min-inline-size: 0;
    max-inline-size: 100%;
    margin-block: 0;
  }
  .uvalib-toolbar__field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .uvalib-toolbar__field > .uvalib-input {
    inline-size: 100%;
  }
  /* :where keeps it as specific as the narrow rule below, which then wins. */
  .uvalib-toolbar > :where(.uvalib-toolbar__field--grow, .uvalib-search-form) {
    flex: 1 1 16rem;
  }
  .uvalib-toolbar__group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
  .uvalib-toolbar__summary {
    align-self: center;
    margin-inline-start: auto;
    color: var(--uva-color-text-muted, var(--uva-grey-A, #4f4f4f));
  }
  /* A narrow toolbar (a phone, a sidebar, a drawer): every item on its own line. */
  @container uvalib-toolbar (width <= 30em) {
    .uvalib-toolbar > * {
      flex: 1 1 100%;
    }
    .uvalib-toolbar__summary {
      margin-inline-start: 0;
    }
  }

  /* No results: an optional decorative icon, a heading, a sentence and an action. */
  .uvalib-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    margin-block: 1rem;
    padding: 2.5rem 1rem;
    border: 1px dashed var(--uva-color-control-border, var(--uva-grey, #808080));
    border-radius: 0.3rem;
    text-align: center;
  }
  .uvalib-empty-state > * {
    margin: 0;
    max-inline-size: 40rem;
  }
  .uvalib-empty-state__icon {
    inline-size: 3rem;
    block-size: 3rem;
    color: var(--uva-color-text-muted, var(--uva-grey-A, #4f4f4f));
  }
  .uvalib-empty-state > :is(h2, h3, h4, .uvalib-empty-state__heading) {
    font-size: 1.25rem;
    line-height: 1.3;
    text-wrap: balance;
  }
  .uvalib-empty-state > p {
    color: var(--uva-color-text-muted, var(--uva-grey-A, #4f4f4f));
    text-wrap: pretty;
  }

  /* Loading placeholders: a box (give it a height or an aspect ratio) and a text line, which
     reserves one line of text (1em plus the 0.25em above and below at line-height 1.5). */
  .uvalib-skeleton,
  .uvalib-skeleton-text {
    display: block;
    border-radius: 0.3rem;
    background-color: var(--uva-color-track, var(--uva-grey-200, #f1f1f1));
    background-image: linear-gradient(
      90deg,
      transparent 0%,
      color-mix(in srgb, currentColor 9%, transparent) 50%,
      transparent 100%
    );
    background-repeat: no-repeat;
    background-size: 50% 100%;
    animation: uvalib-skeleton-shimmer 1.6s linear infinite;
  }
  .uvalib-skeleton {
    min-block-size: 1em;
  }
  .uvalib-skeleton--media {
    aspect-ratio: 3 / 2;
  }
  .uvalib-skeleton-text {
    block-size: 1em;
    margin-block: 0.25em;
    border-radius: 0.2rem;
  }
  .uvalib-skeleton-text:last-child:not(:first-child) {
    inline-size: 60%;
  }
  @keyframes uvalib-skeleton-shimmer {
    from {
      background-position: -100% 0;
    }
    to {
      background-position: 200% 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .uvalib-skeleton,
    .uvalib-skeleton-text {
      animation: none;
      background-image: none;
    }
  }
  @media (forced-colors: active) {
    .uvalib-badge {
      border-color: CanvasText;
    }
    /* Over a photo, which keeps its pixels: an opaque system-colour box, as the card badge. */
    .uvalib-badge--count {
      forced-color-adjust: none;
      border-color: Canvas;
      background: CanvasText;
      color: Canvas;
    }
    .uvalib-skeleton,
    .uvalib-skeleton-text {
      border: 1px solid GrayText;
      animation: none;
    }
  }
`;
