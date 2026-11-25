import { css, unsafeCSS } from 'lit';

// edition.css: reading styles for TEI texts converted to class-annotated HTML (the
// Electronic Text Collections' reading pages, and any site whose converter writes the TEI
// element name as the class: `<div class="lg">`, `<span class="pb">`, `<ins class="add">`;
// TEI Boilerplate and most TEI-to-HTML stylesheets follow the same convention). A separate
// stylesheet like pagefind.css: no component installs it.
//
// Everything is under `.uvalib-edition` (the element holding the converted text) and inside
// `:where()`, so every rule has zero specificity and any rule of the site's own wins.
//
// The look is the library's, not a facsimile's: Franklin Gothic (`--uva-font-family`; serif
// body text is in the UX team's deprecated list), a readable measure (70ch) and generous line
// height, the theme's heading colour and scale, the theme's blockquote (1px orange start
// border, italic) for epigraphs and quotations, a centred muted ⁂ for ornaments, footnotes
// after a rule in smaller text, and page breaks as small muted labels (links to page images
// in the link colour, underlined, with the library focus ring).
//
// Accessibility: editorial marks never rest on colour or strike-through alone. Additions and
// deletions carry visually hidden generated text ("added:", "deleted:"), which screen readers
// announce; unclear text gets a visible [?] announced as "unclear"; an empty gap or deletion
// shows a visible bracket. Regularised and corrected readings (`title` on .orig, .reg, .sic,
// abbr) get a dotted underline; hover alone cannot reach a title, so a CSS-only toggle
// (.uvalib-edition__readings) and print show them inline. Line numbers are visual only
// (`content: … / ''`), as are ornaments.
//
// Original line breaks: a `<br>` cannot be given a space by CSS (browsers ignore `content`
// and pseudo-elements on it, and only `display: none` changes it), so prose reflows by hiding
// `br.lb`; converters must keep whitespace before it (ETC's do). `<span class="lb"></span>`
// is spaced by this sheet itself. A checkbox `.uvalib-edition__lines` (inside or before the
// edition) or the class `.uvalib-edition--lines` shows them; verse lines (.l) always break.
//
// Colours: the dark-mode role tokens, each with its light fallback, so the sheet works
// without tokens.css; emit-css copies the role tokens it reads into edition.css.

const E = unsafeCSS(':where(.uvalib-edition)');

/** Turn on lineation: the class, or a checked .uvalib-edition__lines inside or before it. */
const LINES = unsafeCSS(
  `:where(
    .uvalib-edition.uvalib-edition--lines,
    .uvalib-edition:has(input.uvalib-edition__lines:checked, .uvalib-edition__lines :checked),
    :is(input.uvalib-edition__lines:checked, .uvalib-edition__lines:has(:checked)) ~ .uvalib-edition,
    :not(.uvalib-edition):has(input.uvalib-edition__lines:checked, .uvalib-edition__lines :checked) ~ .uvalib-edition
  )`,
);

/** Show readings (titles) inline: the class, or a checked .uvalib-edition__readings. */
const READINGS = unsafeCSS(
  `:where(
    .uvalib-edition.uvalib-edition--readings,
    .uvalib-edition:has(input.uvalib-edition__readings:checked, .uvalib-edition__readings :checked),
    :is(input.uvalib-edition__readings:checked, .uvalib-edition__readings:has(:checked)) ~ .uvalib-edition,
    :not(.uvalib-edition):has(input.uvalib-edition__readings:checked, .uvalib-edition__readings :checked) ~ .uvalib-edition
  )`,
);

/** Elements with a title the reader may need: regularised, original, corrected, expanded. */
const TITLED = unsafeCSS(':where(.orig, .reg, .sic, .corr, abbr)[title]');

/** The toggles (a label wrapping a checkbox, or the checkbox itself). */
const TOGGLE = unsafeCSS(':where(.uvalib-edition__lines, .uvalib-edition__readings)');

/** Hidden from sight, read by screen readers (generated text inside a pseudo-element). */
const SR_ONLY = unsafeCSS(`position: absolute;
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    text-decoration: none;`);

const TEXT = unsafeCSS('var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b))');
const MUTED = unsafeCSS('var(--uva-color-text-muted, #4b5563)');
const LINK = unsafeCSS('var(--uva-color-link, var(--uva-brand-blue, #232d4b))');
const RULE = unsafeCSS('var(--uva-color-table-border, var(--uva-grey-100, #dadada))');
const FOCUS = unsafeCSS('3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200))');

export const edition = css`
  ${E} {
    display: block;
    max-inline-size: 70ch;
    color: ${TEXT};
    font-family: var(
      --uva-font-family,
      franklin-gothic-urw,
      'UVA Franklin Fallback',
      Arial,
      Helvetica,
      sans-serif
    );
    font-size: 1.125rem;
    line-height: 1.7;
    overflow-wrap: break-word;
    hyphens: auto;
  }
  ${E} :where([hidden]),
  :where(.uvalib-edition, .uvalib-edition__lines, .uvalib-edition__readings)[hidden] {
    display: none !important;
  }

  /* Divisions */
  ${E} :where(section, .div) {
    margin: 0;
  }
  ${E} :where(section.div, div.div) + :where(section.div, div.div) {
    margin-block-start: 2.5rem;
  }

  /* Headings: the theme's colour, weight and scale. */
  ${E} :where(h1, h2, h3, h4, h5, h6) {
    margin: 2rem 0 1rem;
    color: ${LINK};
    font-weight: 500;
    line-height: 1.15;
    text-wrap: balance;
  }
  ${E} :where(:is(h1, h2, h3, h4, h5, h6):first-child) {
    margin-block-start: 0;
  }
  ${E} :where(h1) {
    font-size: 2.488rem;
    font-weight: 700;
  }
  ${E} :where(h2) {
    font-size: 2.074rem;
    font-weight: 700;
  }
  ${E} :where(h3) {
    font-size: 1.728rem;
  }
  ${E} :where(h4) {
    font-size: 1.44rem;
  }
  ${E} :where(h5) {
    font-size: 1.2rem;
  }
  ${E} :where(h6) {
    font-size: 1rem;
  }
  ${E} :where(:is(.head, .list-head):not(h1, h2, h3, h4, h5, h6, .figure *, figure *)) {
    display: block;
    margin: 1.5em 0 0.5em;
    font-weight: 700;
    line-height: 1.3;
  }
  ${E} :where(.head-sub, .head-alt, .head-desc) {
    font-size: 0.85em;
    font-weight: 500;
  }

  /* Paragraphs */
  ${E} :where(p, div.p, div.ab) {
    margin: 0 0 1em;
    text-wrap: pretty;
  }

  /* Renditions */
  ${E} :where(.rend-italic, .rend-i, .rend-it) {
    font-style: italic;
  }
  ${E} :where(.rend-roman, .rend-normal) {
    font-style: normal;
  }
  ${E} :where(.rend-bold, .rend-b) {
    font-weight: 700;
  }
  ${E} :where(.rend-smallcaps, .rend-small-caps, .rend-sc) {
    font-variant: small-caps;
  }
  ${E} :where(.rend-underline, .rend-u) {
    text-decoration: underline;
  }
  ${E} :where(.rend-sup, .rend-superscript) {
    font-size: 0.75em;
    vertical-align: super;
    line-height: 0;
  }
  ${E} :where(.rend-sub, .rend-subscript) {
    font-size: 0.75em;
    vertical-align: sub;
    line-height: 0;
  }
  ${E} :where(.rend-center) {
    text-align: center;
  }
  ${E} :where(.rend-right) {
    text-align: end;
  }
  ${E} :where(.rend-left) {
    text-align: start;
  }
  ${E} :where(.rend-indent:not(.l)) {
    text-indent: 2em;
  }
  ${E} :where(.rend-indent2:not(.l)) {
    text-indent: 4em;
  }
  ${E} :where(.rend-indent3:not(.l)) {
    text-indent: 6em;
  }
  ${E} :where(.rend-no-indent, .rend-noindent) {
    text-indent: 0;
  }
  ${E} :where(.rend-hang) {
    padding-inline-start: 2em;
    text-indent: -2em;
  }
  ${E} :where(span.rend-hang) {
    display: inline-block;
  }

  /* Original line breaks: prose reflows; the toggle shows them. */
  ${E} :where(br.lb) {
    display: none;
  }
  ${E} :where(span.lb)::before {
    content: ' ';
  }
  ${LINES} :where(br.lb) {
    display: inline;
  }
  ${LINES} :where(span.lb)::before {
    content: '\\A';
    white-space: pre;
  }

  /* Verse: every line breaks; wrapped lines hang; line numbers from data-n, visual only. */
  ${E} :where(.lg) {
    margin: 0 0 1.25em;
  }
  ${E} :where(.lg) :where(.lg) {
    margin-block-end: 1em;
  }
  ${E} :where(.l) {
    display: block;
    position: relative;
    padding-inline-start: 2em;
    text-indent: -2em;
  }
  ${E} :where(.l.rend-indent) {
    padding-inline-start: 4em;
  }
  ${E} :where(.l.rend-indent2) {
    padding-inline-start: 6em;
  }
  ${E} :where(.l.rend-indent3) {
    padding-inline-start: 8em;
  }
  ${E} :where(.l.rend-indent4) {
    padding-inline-start: 10em;
  }
  ${E} :where(.lg:has(.l[data-n])) :where(.l) {
    padding-inline-end: 2.5rem;
  }
  ${E} :where(.l[data-n])::after {
    content: attr(data-n);
    content: attr(data-n) / '';
    position: absolute;
    inset-block-start: 0.35em;
    inset-inline-end: 0;
    color: ${MUTED};
    font-size: 0.75rem;
    font-style: normal;
    font-variant: normal;
    font-weight: 400;
    line-height: 1.5;
    text-indent: 0;
    font-variant-numeric: tabular-nums;
  }

  /* Drama */
  ${E} :where(.sp) {
    margin: 0 0 1em;
  }
  ${E} :where(.speaker) {
    margin: 0;
    font-variant: small-caps;
    font-weight: 700;
    letter-spacing: 0.03em;
  }
  ${E} :where(.sp) > :where(:not(.speaker, .stage)) {
    margin-inline-start: 1.5em;
  }
  ${E} :where(.stage) {
    color: ${MUTED};
    font-style: italic;
  }
  ${E} :where(p.stage, div.stage) {
    margin: 0.25em 0 0.75em 1.5em;
  }

  /* Letters: opener, dateline, salute, closer, signed, postscript. */
  ${E} :where(.opener, .closer) {
    margin: 1em 0;
  }
  ${E} :where(.dateline) {
    margin: 0 0 0.75em;
    text-align: end;
  }
  ${E} :where(.salute) {
    margin: 0 0 0.75em;
  }
  ${E} :where(.closer) {
    text-align: end;
  }
  ${E} :where(.signed) {
    margin: 0 0 0.75em;
    text-align: end;
  }
  ${E} :where(.postscript, .seg-postscript, .ps) {
    display: block;
    margin: 1.5em 0 1em;
    text-align: start;
  }

  /* Front matter and quotations: the theme's blockquote. */
  ${E} :where(blockquote, .epigraph, .cit, .quote, div.q) {
    margin: 0.5rem 1.5rem 1.5rem;
    padding: 0 0.5rem;
    border-inline-start: 1px solid var(--uva-brand-orange, #e57200);
    font-style: italic;
  }
  ${E} :where(.epigraph, .cit, .quote, div.q) :where(blockquote) {
    margin: 0;
    padding: 0;
    border: 0;
  }
  ${E} :where(blockquote, .epigraph, .cit) :where(p, div.p):last-child {
    margin-block-end: 0;
  }
  ${E} :where(.bibl) {
    display: block;
    font-style: normal;
  }
  ${E} :where(.epigraph, .cit) :where(.bibl) {
    margin-block-start: 0.25em;
    text-align: end;
  }
  ${E} :where(.argument) {
    margin: 0 1.5em 1.5em;
    font-style: italic;
  }
  ${E} :where(.byline, .trailer, .dedication, .docAuthor) {
    margin: 1em 0;
    text-align: center;
  }
  ${E} :where(.dedication) {
    font-style: italic;
  }

  /* Title pages */
  ${E} :where(.titlepage, .titlePage) {
    margin: 0 0 2rem;
    text-align: center;
  }
  ${E} :where(.titlePart, .docTitle) {
    display: block;
    margin: 0.5em 0;
    color: ${LINK};
    font-size: 1.44rem;
    font-weight: 500;
    line-height: 1.15;
  }
  ${E} :where(.titlePart-sub, .titlePart-subtitle) {
    font-size: 1.2rem;
  }
  ${E} :where(.docAuthor) {
    font-variant: small-caps;
  }
  ${E} :where(.docImprint, .docDate, .docEdition) {
    margin: 1em 0;
    color: ${MUTED};
  }

  /* Lists and tables */
  ${E} :where(ul.list, ol.list) {
    margin: 0 0 1em;
    padding-inline-start: 1.5em;
  }
  ${E} :where(.list-simple, .list-castlist) {
    padding-inline-start: 0;
    list-style: none;
  }
  ${E} :where(.list) :where(.label) {
    font-weight: 700;
  }
  ${E} :where(.table-wrap) {
    margin: 0 0 1.25em;
    overflow-x: auto;
  }
  ${E} :where(table) {
    border-collapse: collapse;
    font-size: 0.9em;
    line-height: 1.4;
  }
  ${E} :where(td, th) {
    padding: 0.25em 0.6em;
    border-block-end: 1px solid ${RULE};
    text-align: start;
    vertical-align: top;
  }

  /* Ornaments and section breaks: a centred muted ⁂, hidden from screen readers. */
  ${E} :where(.ornament, .textbreak) {
    display: block;
    block-size: auto;
    margin: 1.5em 0;
    border: 0;
    color: ${MUTED};
    text-align: center;
    overflow: visible;
  }
  ${E} :where(hr.ornament, hr.textbreak, .ornament:empty, .textbreak:empty)::before {
    content: '\\2042';
    content: '\\2042' / '';
    font-size: 1.25em;
    line-height: 1;
  }

  /* Page breaks: small muted labels; a link to the page image is underlined, in the link
     colour. Each at least 24px tall. Works with <uvalib-lightbox selector="a.pb-image">. */
  ${E} :where(.pb) {
    color: ${MUTED};
    font-size: 0.8125rem;
    font-style: normal;
    font-variant: normal;
    font-weight: 400;
    letter-spacing: normal;
    line-height: 1.2;
    text-indent: 0;
  }
  ${E} :where(.pb) :where(a, .pb-n) {
    display: inline-block;
    margin: 0 0.25em;
    padding: 0.2em 0.5em;
    border: 1px solid ${RULE};
    border-radius: 3px;
    white-space: nowrap;
    text-indent: 0;
  }
  ${E} :where(.pb) :where(a) {
    color: ${LINK};
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }
  ${E} :where(.pb) :where(a:hover) {
    border-color: currentColor;
    text-decoration-thickness: 2px;
  }
  ${E} :where(.pb) :where(a:focus-visible) {
    outline: ${FOCUS};
    outline-offset: 2px;
  }
  ${E} :where(section, .div) > :where(.pb:first-child:not(:empty)) {
    display: block;
    margin-block-end: 0.5em;
    text-align: end;
  }

  /* Figures */
  ${E} :where(.figure, figure) {
    display: block;
    margin: 1.5em 0;
    text-align: center;
  }
  ${E} :where(.figure, figure) :where(img) {
    display: block;
    max-inline-size: 100%;
    max-block-size: 80vh;
    inline-size: auto;
    block-size: auto;
    margin: 0 auto 0.5em;
  }
  ${E} :where(.figure, figure) :where(.head, .figDesc, figcaption) {
    display: block;
    color: ${MUTED};
    font-size: 0.875em;
    font-weight: 400;
    line-height: 1.4;
  }

  /* Editorial marks: never colour or strike-through alone. */
  ${E} :where(ins.add, .add) {
    font-size: 0.85em;
    text-decoration: none;
    vertical-align: super;
    line-height: 0;
  }
  ${E} :where(ins.add, .add)::before {
    content: 'added: ';
    ${SR_ONLY}
  }
  ${E} :where(ins.add, .add)::after {
    content: ' (end added)';
    ${SR_ONLY}
  }
  ${E} :where(del.del, .del) {
    text-decoration: line-through;
  }
  ${E} :where(del.del, .del)::before {
    content: 'deleted: ';
    ${SR_ONLY}
  }
  ${E} :where(del.del, .del)::after {
    content: ' (end deleted)';
    ${SR_ONLY}
  }
  /* A deletion with no text (illegible or not transcribed): a visible bracket, inline-block so
     the strike-through does not cross it. */
  ${E} :where(del.del:empty, .del:empty)::before {
    content: '[deletion]';
    position: static;
    display: inline-block;
    inline-size: auto;
    block-size: auto;
    margin: 0;
    overflow: visible;
    clip-path: none;
    color: ${MUTED};
    font-size: 0.85em;
  }
  ${E} :where(del.del:empty, .del:empty)::after {
    content: none;
  }
  ${E} ${TITLED} {
    text-decoration: underline dotted;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.2em;
    cursor: help;
  }
  ${READINGS} ${TITLED}::after {
    content: ' [' attr(title) ']';
    color: ${MUTED};
    font-size: 0.85em;
    font-style: normal;
  }
  ${E} :where(.unclear)::after {
    content: '[?]';
    content: '[?]' / '(unclear)';
    margin-inline-start: 0.1em;
    color: ${MUTED};
    font-size: 0.75em;
    font-style: normal;
    vertical-align: super;
    line-height: 0;
  }
  ${E} :where(.gap) {
    color: ${MUTED};
    font-style: italic;
  }
  ${E} :where(.gap:empty)::before {
    content: '[\\2026]';
    content: '[\\2026]' / 'gap in the text';
    font-style: normal;
  }

  /* Notes: superscript references, footnotes after a rule, notes in the flow as boxes. */
  ${E} :where(sup.noteref, .noteref) {
    padding: 0 0.1em;
    font-size: 0.75em;
    font-style: normal;
    line-height: 0;
    vertical-align: super;
  }
  ${E} :where(.noteref) :where(a) {
    color: ${LINK};
    text-underline-offset: 0.15em;
  }
  ${E} :where(.noteref) :where(a)::before {
    content: 'Note ';
    ${SR_ONLY}
  }
  ${E} :where(.footnotes) {
    margin-block-start: 3rem;
    padding-block-start: 1rem;
    border-block-start: 1px solid var(--uva-color-control-border, var(--uva-grey, #808080));
    font-size: 0.875em;
    line-height: 1.5;
  }
  ${E} :where(aside.note, .note-foot, .note-end) {
    display: flex;
    gap: 0.6em;
    margin: 0 0 0.75em;
  }
  ${E} :where(.note-n) {
    flex: none;
    min-inline-size: 1.75em;
    font-variant-numeric: tabular-nums;
  }
  ${E} :where(a.note-n) {
    display: inline-block;
    min-block-size: 24px;
    color: ${LINK};
  }
  ${E} :where(.note-body) > :where(:last-child) {
    margin-block-end: 0;
  }
  ${E} :where(aside.note-inline, aside.note:not(.note-foot, .note-end)) {
    display: block;
    margin: 0 0 1.25em;
    padding: 0.75em 1em;
    border-inline-start: 3px solid ${RULE};
    background: var(--uva-color-table-stripe, var(--uva-grey-200, #f1f1f1));
    font-size: 0.9em;
  }
  ${E} :where(span.note-inline) {
    color: ${MUTED};
    font-size: 0.9em;
  }
  ${E} :where(span.note-inline)::before {
    content: '[';
  }
  ${E} :where(span.note-inline)::after {
    content: ']';
  }
  ${E} :where(:focus-visible) {
    outline: ${FOCUS};
    outline-offset: 2px;
  }
  ${E} :where(:target) {
    scroll-margin-block-start: 2rem;
    background: var(--uva-color-highlight, var(--uva-brand-orange-200, #ffc999));
    color: var(--uva-color-on-highlight, var(--uva-grey-darkest, #2b2b2b));
  }

  /* The toggles: a label round a checkbox, drawn like base.css's outline toggle button
     (filled while checked). Outside the edition too, so not under .uvalib-edition. */
  :where(label)${TOGGLE} {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    box-sizing: border-box;
    min-block-size: 44px;
    margin: 0 0.5rem 1rem 0;
    padding: 0.25rem 0.875rem;
    border: 2px solid var(--uva-color-button-bg, var(--uva-blue-alt, #007bac));
    border-radius: 0.25rem;
    color: var(--uva-color-button-bg, var(--uva-blue-alt, #007bac));
    font-family: var(
      --uva-font-family,
      franklin-gothic-urw,
      'UVA Franklin Fallback',
      Arial,
      Helvetica,
      sans-serif
    );
    font-size: 0.9rem;
    line-height: 1.2;
    cursor: pointer;
  }
  :where(label)${TOGGLE}:hover {
    border-color: var(--uva-color-button-hover-bg, var(--uva-blue-alt-A, #005679));
    color: var(--uva-color-button-hover-bg, var(--uva-blue-alt-A, #005679));
  }
  :where(label)${TOGGLE}:has(:checked) {
    background: var(--uva-color-button-bg, var(--uva-blue-alt, #007bac));
    color: var(--uva-color-button-text, #ffffff);
  }
  :where(label)${TOGGLE}:has(:checked):hover {
    border-color: var(--uva-color-button-hover-bg, var(--uva-blue-alt-A, #005679));
    background: var(--uva-color-button-hover-bg, var(--uva-blue-alt-A, #005679));
  }
  ${TOGGLE} :where(input[type='checkbox']),
  :where(input[type='checkbox'])${TOGGLE} {
    inline-size: 1.125em;
    block-size: 1.125em;
    margin: 0;
    accent-color: var(--uva-color-button-bg, var(--uva-blue-alt, #007bac));
  }
  :where(label)${TOGGLE}:has(:checked) :where(input[type='checkbox']) {
    accent-color: var(--uva-color-button-text, #ffffff);
  }
  :where(label)${TOGGLE}:has(:focus-visible),
  :where(input)${TOGGLE}:focus-visible {
    outline: ${FOCUS};
    outline-offset: 2px;
  }
  ${TOGGLE} :where(input):focus-visible {
    outline: none;
  }

  @media (forced-colors: active) {
    :where(label)${TOGGLE} {
      border-color: ButtonText;
      color: ButtonText;
    }
    :where(label)${TOGGLE}:has(:checked) {
      forced-color-adjust: none;
      border-color: Highlight;
      background: Highlight;
      color: HighlightText;
    }
    ${E} :where(.pb) :where(a) {
      border-color: LinkText;
    }
    ${E} :where(.pb) :where(.pb-n),
    ${E} :where(aside.note-inline, aside.note:not(.note-foot, .note-end)) {
      border-color: CanvasText;
    }
    ${E} :where(aside.note-inline, aside.note:not(.note-foot, .note-end)) {
      border: 1px solid CanvasText;
    }
    ${E} :where(:target) {
      forced-color-adjust: none;
      background: Mark;
      color: MarkText;
    }
  }

  @media print {
    ${E} {
      max-inline-size: none;
      color: #000000;
      font-size: 11pt;
      line-height: 1.5;
    }
    ${TOGGLE} {
      display: none;
    }
    ${E} :where(h1, h2, h3, h4, h5, h6, .head, .speaker) {
      color: #000000;
      break-after: avoid;
    }
    ${E} :where(p, div.p) {
      orphans: 3;
      widows: 3;
    }
    ${E} :where(.lg, aside.note, .figure, figure) {
      break-inside: avoid;
    }
    ${E} :where(.pb, .stage, .gap, .docImprint, .docDate, .docEdition) {
      color: #000000;
    }
    ${E} :where(.pb) :where(a, .pb-n) {
      border-color: #000000;
      color: #000000;
    }
    ${E} :where(a) {
      color: #000000;
    }
    ${E} :where(aside.note-inline, aside.note:not(.note-foot, .note-end)) {
      border: 1px solid #000000;
      background: none;
    }
    /* A printed page cannot be hovered: every reading is shown. */
    ${E} ${TITLED}::after {
      content: ' [' attr(title) ']';
      font-size: 0.85em;
      font-style: normal;
    }
    ${E} :where(:target) {
      background: none;
      color: inherit;
    }
  }
`;
