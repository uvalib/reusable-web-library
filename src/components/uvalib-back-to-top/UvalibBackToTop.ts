import { css, html, svg, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { trackEvent } from '../../base/analytics.js';
import { UvalibElement } from '../../base/UvalibElement.js';

const TAG = 'uvalib-back-to-top';
const DEFAULT_LABEL = 'Back to top';
const DEFAULT_OFFSET = 400;
/** Natively focusable: no tabindex needed to take focus. */
const FOCUSABLE =
  'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable]';

const squash = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

const arrow = svg`<svg class="btt-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 2.5 2.5 8l1.4 1.4L7 6.3V14h2V6.3l3.1 3.1L13.5 8z" fill="currentColor"/></svg>`;

/**
 * A “Back to top” button for long pages: minutes, finding aids, transcriptions, long result
 * lists.
 *
 * It stays hidden (`visibility: hidden`, so it is neither a tab stop nor in the accessibility
 * tree) until the top `offset` pixels of the page (default 400) have scrolled out of view,
 * watched with an IntersectionObserver on a small sentinel at the top of the page, never a
 * scroll listener. If it has focus as it hides, focus moves to the target. Activating it
 * scrolls to the top (smoothly unless the visitor prefers reduced motion) and moves focus to
 * the page's `<h1>` (the first in `<main>`, else the first anywhere, else `#top`), or to
 * `target` (a selector), adding `tabindex="-1"` when it is not focusable, so keyboard and
 * screen reader users land at the top too.
 *
 * The button is fixed in the bottom corner (end side), inside the safe-area insets. The
 * element itself is an empty block 4.75rem tall: put it last in the page's main content and
 * that is the space the button needs, so the last lines can always scroll clear of it. When
 * that space comes into view the button sits in it instead of floating, so it never covers
 * the footer either. It is hidden in print.
 *
 * @tagname uvalib-back-to-top
 * @fires uvalib-analytics-event - For `<site-analytics>`: `['uvalib-back-to-top', 'click']` when activated. Bubbles and is composed.
 * @csspart button - The button.
 * @cssprop [--uvalib-back-to-top-space=4.75rem] - The height the element keeps for the button at the end of the content.
 * @cssprop --uva-color-surface-raised - Dark-mode role token: button background (else #fff).
 * @cssprop --uva-color-button-bg - Dark-mode role token: button border and text (else `--uva-blue-alt`, #007bac).
 * @cssprop --uva-color-button-hover-bg - Dark-mode role token: hovered button (else `--uva-blue-alt-A`, #005679).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 * @cssprop --uva-color-shadow - Dark-mode role token: the floating button's shadow.
 */
export class UvalibBackToTop extends UvalibElement {
  static styles = css`
    :host {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      box-sizing: border-box;
      block-size: var(--uvalib-back-to-top-space, 4.75rem);
      padding-block: 1rem;
    }
    :host([hidden]) {
      display: none;
    }
    .btt-button {
      position: fixed;
      inset-inline-end: max(1rem, env(safe-area-inset-right));
      inset-block-end: max(1rem, env(safe-area-inset-bottom));
      z-index: 20;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      box-sizing: border-box;
      min-block-size: 44px;
      min-inline-size: 44px;
      margin: 0;
      padding: 0.5rem 1rem;
      border: 2px solid var(--uva-color-button-bg, var(--uva-blue-alt, #007bac));
      border-radius: 5px;
      background: var(--uva-color-surface-raised, #fff);
      color: var(--uva-color-button-bg, var(--uva-blue-alt, #007bac));
      box-shadow: 0 2px 6px var(--uva-color-shadow, rgb(0 0 0 / 0.2));
      font: inherit;
      font-size: 1rem;
      line-height: 1.2;
      white-space: nowrap;
      cursor: pointer;
      visibility: hidden;
      opacity: 0;
    }
    .btt-button:dir(rtl) {
      inset-inline-end: max(1rem, env(safe-area-inset-left));
    }
    .btt-button.shown {
      visibility: visible;
      opacity: 1;
    }
    .btt-button.docked {
      position: static;
      box-shadow: none;
    }
    .btt-button:hover {
      border-color: var(--uva-color-button-hover-bg, var(--uva-blue-alt-A, #005679));
      color: var(--uva-color-button-hover-bg, var(--uva-blue-alt-A, #005679));
    }
    .btt-button:focus-visible {
      outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
      outline-offset: 2px;
    }
    .btt-icon {
      flex: none;
    }
    @media (prefers-reduced-motion: no-preference) {
      .btt-button {
        transition:
          opacity 0.2s,
          visibility 0.2s;
      }
    }
    @media (forced-colors: active) {
      .btt-button {
        border-color: ButtonText;
        background: ButtonFace;
        color: ButtonText;
      }
    }
    @media print {
      :host {
        display: none;
      }
    }
  `;

  /** The button's text. */
  @property({ type: String }) label = DEFAULT_LABEL;

  /** How many pixels at the top of the page must scroll out of view before the button shows. */
  @property({ type: Number }) offset = DEFAULT_OFFSET;

  /** A selector for where focus goes (default: the page's `<h1>`, else `#top`). */
  @property({ type: String }) target = '';

  /** Whether the top of the page has scrolled out of view. */
  @state() private shown = false;

  /** Whether the element's own space is fully in view (the button sits in it). */
  @state() private docked = false;

  private sentinel?: HTMLDivElement;
  private topObserver?: IntersectionObserver;
  private dockObserver?: IntersectionObserver;

  private get button(): HTMLButtonElement | null {
    return (this.renderRoot as ParentNode).querySelector<HTMLButtonElement>('button.btt-button');
  }

  private get px(): number {
    const n = Number(this.offset);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_OFFSET;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    const doc = this.ownerDocument;
    const sentinel = (this.sentinel ??= doc.createElement('div'));
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.dataset.uvalibBackToTop = '';
    sentinel.style.cssText = `position:absolute;top:0;left:0;width:1px;height:${this.px}px;margin:0;padding:0;border:0;pointer-events:none;visibility:hidden`;
    doc.body.append(sentinel);
    this.topObserver = new IntersectionObserver((entries) => {
      const last = entries[entries.length - 1];
      if (last) this.setShown(!last.isIntersecting);
    });
    this.topObserver.observe(sentinel);
    this.dockObserver = new IntersectionObserver(
      (entries) => {
        const last = entries[entries.length - 1];
        if (last) this.docked = last.intersectionRatio >= 0.99;
      },
      { threshold: [0, 0.99, 1] },
    );
    this.dockObserver.observe(this);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.topObserver?.disconnect();
    this.dockObserver?.disconnect();
    this.sentinel?.remove();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('offset') && this.sentinel) this.sentinel.style.height = `${this.px}px`;
  }

  private setShown(shown: boolean): void {
    if (shown === this.shown) return;
    const button = this.button;
    const focused =
      !!button &&
      (this.renderRoot instanceof ShadowRoot
        ? this.renderRoot.activeElement === button
        : document.activeElement === button);
    this.shown = shown;
    if (!shown && focused) this.focusTarget();
  }

  /** Where focus goes: `target`, else the page's `<h1>`, else `#top`. */
  private findTarget(): HTMLElement | null {
    const doc = this.ownerDocument;
    const sel = squash(this.target);
    if (sel) {
      try {
        const el = doc.querySelector<HTMLElement>(sel);
        if (el) return el;
      } catch {
        // Not a valid selector: fall back to the heading.
      }
    }
    return (
      doc.querySelector<HTMLElement>('main h1') ??
      doc.querySelector<HTMLElement>('h1') ??
      doc.getElementById('top')
    );
  }

  private focusTarget(): void {
    const el = this.findTarget();
    if (!el) return;
    if (!el.matches(FOCUSABLE)) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }

  private readonly onClick = (): void => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    this.focusTarget();
    trackEvent(this, [TAG, 'click']);
  };

  protected override render() {
    const label = squash(this.label) || DEFAULT_LABEL;
    return html`<button
      type="button"
      class="btt-button ${this.shown ? 'shown' : ''} ${this.docked ? 'docked' : ''}"
      part="button"
      @click=${this.onClick}
    >
      ${arrow}<span>${label}</span>
    </button>`;
  }
}
