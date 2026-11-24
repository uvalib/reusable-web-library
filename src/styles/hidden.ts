import { unsafeCSS } from 'lit';

// The `hidden` attribute for base.css's classes (issue #7). The browser hides `[hidden]` with
// a user-agent `display: none`, which any author `display` beats, so a class that sets
// `display` (`.uvalib-button` is inline-flex) would keep a hidden element on screen: still
// focusable and announced. This puts `display: none` back for exactly these classes.
//
// Scoped, not a global `[hidden] { display: none !important }` reset: base.css is linked by
// host pages that may show `[hidden]` content on purpose (an `until-found` section, an
// animated close, their own `[hidden]` rule), and a global reset would change those pages.
// `:where()` keeps it as specific as one attribute; `!important` makes it beat each class's
// own `display`, whatever its specificity (the button selector has several `:not()`s).
//
// Every class in base.css whose rules set a `display` other than `none` must be listed here
// (test/hidden.test.ts reads the built base.css and checks).
export const HIDDEN_CLASSES = [
  // Buttons and forms (controls.ts)
  'uvalib-button',
  'uvalib-input',
  'uvalib-search-form',
  // Badges, media, toolbar, empty state, skeletons (results.ts)
  'uvalib-badge',
  'uvalib-media',
  'uvalib-media__badges',
  'uvalib-toolbar',
  'uvalib-toolbar__field',
  'uvalib-toolbar__group',
  'uvalib-toolbar__summary',
  'uvalib-empty-state',
  'uvalib-skeleton',
  'uvalib-skeleton-text',
  // Messages (message.ts)
  'uvalib-message',
  'uvalib-message__icon',
  // Results list (result-list.ts)
  'uvalib-result-list',
  'uvalib-result',
  'uvalib-result__title',
  'uvalib-result__meta',
  'uvalib-result__snippet',
  'uvalib-result__actions',
  // Field help text (field-text.ts)
  'uvalib-help',
];

/** Children that base.css itself gives a `display`, by their parent's class. */
const HIDDEN_CHILDREN = ['.uvalib-media > :is(img, video, picture)'];

export const hidden = unsafeCSS(`
  /* hidden hides every base.css class, though each sets display (see hidden.ts). */
  :where(${HIDDEN_CLASSES.map((c) => `.${c}`).join(', ')})[hidden],
  :where(${HIDDEN_CHILDREN.join(', ')})[hidden] {
    display: none !important;
  }
`);
