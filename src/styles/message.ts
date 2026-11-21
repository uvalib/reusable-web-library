import { css } from 'lit';

// An inline message for a page's own content (issue #8), in base.css only (composed into
// `controls`): an error, a warning, a notice or a success, at the size of the content around
// it. The severity look is <site-alerts>' list alerts at inline size: the alert background,
// a thick start border in the severity colour, and the alert text and link colours, which are
// 7:1 or more (WCAG AAA) on every alert background in light and dark (the
// --uva-color-alert-* role tokens; success reads the two --uva-color-status-success-* ones).
//
// The severity is never colour alone: the author writes it in the text (`<strong
// class="uvalib-message__label">Error:</strong>`), optionally with a decorative icon. No
// CSS-generated prefix: generated content is read inconsistently by screen readers, is not
// translated with the page, and would double a word the author already wrote.
//
// In forced colors, where backgrounds are dropped, every message keeps a system-colour border
// (thicker at the start), as <site-alerts> does.
export const message = css`
  .uvalib-message {
    display: block;
    box-sizing: border-box;
    max-inline-size: 100%;
    margin-block: 1rem;
    padding: 0.75rem 1rem;
    border: 1px solid transparent;
    border-inline-start: 6px solid var(--uva-color-alert-info-border, var(--uva-blue-alt, #007bac));
    border-radius: 0.3rem;
    background: var(--uva-color-alert-info-bg, var(--uva-blue-alt-300, #bfe7f7));
    color: var(--uva-color-alert-text, var(--uva-grey-darkest, #2b2b2b));
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .uvalib-message > :first-child {
    margin-block-start: 0;
  }
  .uvalib-message > :last-child {
    margin-block-end: 0;
  }
  .uvalib-message a,
  .uvalib-message a:visited {
    color: var(--uva-color-alert-link, var(--uva-blue-alt-B, #141e3c));
    text-decoration: underline;
  }
  /* The ring follows the text colour, chosen to read on the message's own background. */
  .uvalib-message a:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
  .uvalib-message__label {
    font-weight: 700;
  }
  .uvalib-message__icon {
    display: inline-block;
    inline-size: 1.25em;
    block-size: 1.25em;
    margin-inline-end: 0.35em;
    vertical-align: -0.25em;
  }
  .uvalib-message--error {
    border-inline-start-color: var(--uva-color-alert-critical-border, var(--uva-red-B, #b30000));
    background: var(--uva-color-alert-critical-bg, var(--uva-red-100, #fbcfda));
  }
  .uvalib-message--warning {
    border-inline-start-color: var(--uva-color-alert-warning-border, var(--uva-yellow, #ecc602));
    background: var(--uva-color-alert-warning-bg, var(--uva-yellow-100, #fef6c8));
  }
  .uvalib-message:is(.uvalib-message--info, .uvalib-message--notice) {
    border-inline-start-color: var(--uva-color-alert-info-border, var(--uva-blue-alt, #007bac));
    background: var(--uva-color-alert-info-bg, var(--uva-blue-alt-300, #bfe7f7));
  }
  .uvalib-message--success {
    border-inline-start-color: var(--uva-color-status-success-border, var(--uva-green-A, #4e9737));
    background: var(--uva-color-status-success-bg, var(--uva-green-200, #ddefdc));
  }
  @media (forced-colors: active) {
    .uvalib-message {
      border-color: CanvasText;
    }
    .uvalib-message a:focus-visible {
      outline-color: Highlight;
    }
  }
`;
