import { css, unsafeCSS } from 'lit';
import { results } from './results.js';
import { message } from './message.js';
import { resultList } from './result-list.js';
import { table } from './table.js';
import { layout } from './layout.js';
import { hidden } from './hidden.js';
import { fieldText } from './field-text.js';

// Buttons, toggles and form fields for host content, in base.css only: no component
// installs them, so no component bundle carries them. Like the rest of base.css they are
// unlayered, so a host reset such as `button { background: none }` does not undo a class
// the page asked for; a host restyles them with a more specific selector.
//
// The look is library.virginia.edu's (the Drupal theme's .uvalib-button family): a
// --uva-blue-alt fill with white text and a 5px radius, an outline ("secondary") and a pale
// blue "subtle" variant, and small and large sizes. Borders, not the theme's inset
// box-shadows, so the outlines survive forced-colors mode. Changes for accessibility: a
// 44px minimum target (small: 32px), the library focus ring, readable disabled text, and
// no full-width buttons on phones (the theme's) or outer margins.
//
// The components that render their own `.uvalib-button` (bento-box, its four section
// elements, events-section, library-weekly-hours) keep their compact outline look in light
// DOM too: these rules skip their descendants. Keep this list in step with them.
export const OWN_BUTTON_TAGS = [
  'bento-box',
  'catalog-section',
  'articles-section',
  'libguides-section',
  'website-section',
  'events-section',
  'library-weekly-hours',
];
const BUTTON = `.uvalib-button:not(${OWN_BUTTON_TAGS.map((t) => `${t} *`).join(', ')})`;
/** Not disabled: hover and active never change a disabled button. */
const ON = ":not(:disabled, [aria-disabled='true'])";
const B = unsafeCSS(BUTTON);

/**
 * The outline look: the secondary variant, and a toggle while it is not pressed (pressed, it
 * is filled). Zero extra specificity, so the hover, active and disabled rules after it win.
 */
const S = unsafeCSS(
  `${BUTTON}:where(.uvalib-button--secondary:not([aria-pressed='true']), [aria-pressed]:not([aria-pressed='true']))`,
);

/** The subtle variant; a pressed toggle is filled whatever its variant. */
const SUB = unsafeCSS(`${BUTTON}:where(.uvalib-button--subtle:not([aria-pressed='true']))`);

// Every state rule is as specific as :hover (one pseudo-class past the base rule), so the
// later rule wins: disabled comes last and beats hover and active.
export const controls = css`
  ${B} {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    box-sizing: border-box;
    min-block-size: 44px;
    margin: 0;
    padding: 0.5rem 1.25rem;
    border: 2px solid var(--uva-color-button-bg, var(--uva-blue-alt, #007bac));
    border-radius: 5px;
    background: var(--uva-color-button-bg, var(--uva-blue-alt, #007bac));
    color: var(--uva-color-button-text, #ffffff);
    font: inherit;
    font-size: 1rem;
    font-weight: 400;
    line-height: 1.2;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
  }
  ${B}:visited {
    color: var(--uva-color-button-text, #ffffff);
  }
  ${B}${unsafeCSS(ON)}:hover {
    border-color: var(--uva-color-button-hover-bg, var(--uva-blue-alt-A, #005679));
    background: var(--uva-color-button-hover-bg, var(--uva-blue-alt-A, #005679));
  }
  ${B}${unsafeCSS(ON)}:active {
    border-color: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
    background: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
  }
  ${S},
  ${S}:visited {
    background: transparent;
    color: var(--uva-color-button-bg, var(--uva-blue-alt, #007bac));
  }
  ${S}${unsafeCSS(ON)}:hover {
    background: transparent;
    color: var(--uva-color-button-hover-bg, var(--uva-blue-alt-A, #005679));
  }
  ${S}${unsafeCSS(ON)}:active {
    background: transparent;
    color: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
  }
  ${SUB},
  ${SUB}:visited {
    background: var(--uva-color-button-subtle-bg, var(--uva-blue-alt-300, #bfe7f7));
    color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
  }
  ${SUB}${unsafeCSS(ON)}:is(:hover, :active) {
    border-color: var(--uva-color-button-bg, var(--uva-blue-alt, #007bac));
    background: var(--uva-color-button-subtle-hover-bg, var(--uva-blue-alt-200, #91d8f2));
  }
  ${B}.uvalib-button--small {
    min-block-size: 32px;
    padding: 0.25rem 0.875rem;
    border-radius: 0.25rem;
    font-size: 0.85rem;
  }
  ${B}.uvalib-button--large {
    min-block-size: 52px;
    padding: 0.75rem 1.5rem;
    border-radius: 0.25rem;
    font-size: 1.33rem;
  }
  /* A toggle (aria-pressed): an outline with an empty box when off, filled with a ticked box
     when on, so the state never rests on colour alone. */
  ${B}[aria-pressed]::before {
    content: '';
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    inline-size: 1em;
    block-size: 1em;
    border: 2px solid currentColor;
    border-radius: 3px;
    font-size: 0.9em;
    font-weight: 700;
    line-height: 1;
  }
  ${B}[aria-pressed='true']::before {
    content: '\\2713';
    content: '\\2713' / '';
  }
  .uvalib-button:focus-visible,
  .uvalib-input:focus-visible {
    outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
    outline-offset: 2px;
  }
  ${B}:is(:disabled, [aria-disabled='true']) {
    border-color: var(--uva-color-track, var(--uva-grey-100, #dadada));
    background: var(--uva-color-track, var(--uva-grey-100, #dadada));
    color: var(--uva-color-text-muted, var(--uva-grey-A, #4f4f4f));
    cursor: not-allowed;
    pointer-events: none;
  }
  .uvalib-input {
    box-sizing: border-box;
    min-block-size: 44px;
    max-inline-size: 100%;
    margin: 0;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--uva-color-control-border, var(--uva-grey, #808080));
    border-radius: 5px;
    background: var(--uva-color-surface-raised, #ffffff);
    color: var(--uva-color-input-text, var(--uva-grey-darkest, #2b2b2b));
    font: inherit;
    line-height: 1.2;
  }
  .uvalib-input:disabled {
    background: var(--uva-color-track, var(--uva-grey-200, #f1f1f1));
    color: var(--uva-color-text-muted, var(--uva-grey-A, #4f4f4f));
    cursor: not-allowed;
  }
  /* Label, field and button in one row, wrapping on phones. */
  .uvalib-search-form {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
  .uvalib-search-form .uvalib-input {
    flex: 1 1 12rem;
    min-inline-size: 0;
  }
  @media (forced-colors: active) {
    ${B} {
      border-color: ButtonText;
    }
    a${B} {
      border-color: LinkText;
      color: LinkText;
    }
    ${B}[aria-pressed='true'] {
      forced-color-adjust: none;
      border-color: Highlight;
      background: Highlight;
      color: HighlightText;
    }
    /* Hover and active: a Highlight outline and text, as forced colors drop the fills. */
    ${B}${unsafeCSS(ON)}:is(:hover, :active) {
      border-color: Highlight;
      color: Highlight;
    }
    ${B}[aria-pressed='true']${unsafeCSS(ON)}:is(:hover, :active) {
      border-color: CanvasText;
      color: HighlightText;
    }
    ${B}${unsafeCSS(ON)}:active {
      border-style: dashed;
    }
    ${B}:is(:disabled, [aria-disabled='true']),
    a${B}:is(:disabled, [aria-disabled='true']) {
      border-color: GrayText;
      color: GrayText;
    }
  }
  ${results}
  ${message}
  ${resultList}
  ${table}
  ${layout}
  ${hidden}
  ${fieldText}
`;
