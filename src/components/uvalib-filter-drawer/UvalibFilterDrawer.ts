import { css, html, nothing, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { trackEvent } from '../../base/analytics.js';
import { UvalibElement } from '../../base/UvalibElement.js';

const TAG = 'uvalib-filter-drawer';
const DEFAULT_LABEL = 'Search and filters';
const DEFAULT_BREAKPOINT = '48rem';
/** A breakpoint is a plain length: `48rem`, `768px`, `40em`. */
const LENGTH = /^\d+(\.\d+)?(px|rem|em)$/;
/** How long a mirrored announcement stays in the drawer's live region. */
const CLEAR_MS = 5000;
/** What counts as a live region inside an element named in `live`. */
const LIVE = '[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"]';
/** Visually hidden, kept with `no-style` so the mirror never shows. */
const HIDDEN_STYLE =
  'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';

let instances = 0;

const squash = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

/** The text a live element would announce: its live regions' text (also in its open shadow root), else its own. */
function liveText(el: Element): string {
  if (el.matches(LIVE)) return squash(el.textContent);
  const regions = [
    ...el.querySelectorAll(LIVE),
    ...(el.shadowRoot ? el.shadowRoot.querySelectorAll(LIVE) : []),
  ];
  return regions.length
    ? squash(regions.map((r) => r.textContent).join(' '))
    : squash(el.textContent);
}

/** Move `node` into `parent` before `before`, keeping its state (`moveBefore`) where the browser can. */
function move(parent: Node, node: Node, before: Node | null = null): void {
  const p = parent as Node & { moveBefore?: (n: Node, c: Node | null) => void };
  if (p.moveBefore && parent.isConnected && node.isConnected) {
    try {
      p.moveBefore(node, before);
      return;
    } catch {
      // Not movable atomically (another document, say): insert instead.
    }
  }
  parent.insertBefore(node, before);
}

/** The focused element, through open shadow roots. */
function deepActive(): Element | null {
  let a = document.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a;
}

/**
 * A search page's form and filters: a plain sidebar on wide screens, and on narrow ones a
 * “Search and filters” button that opens them in a modal panel from the side.
 *
 * Put the page's search form, `<uvalib-filter>`s and other facets inside. Above `breakpoint`
 * (default `48rem`) they are shown as written: no button, no dialog role. At and below it only
 * the button is shown; it opens a native `<dialog>` (`showModal()`) with a visible heading (the
 * `label`) and a 44px Close button, which takes focus. Escape, Close and a click on the backdrop
 * close it, and focus returns to the button; widening the window past the breakpoint closes it
 * and keeps focus where it was. While it is open the rest of the page, including `<site-page>`'s
 * header, skip link and alerts, is inert (the browser's modal dialog), so focus cannot leave it
 * except to the browser itself, and nothing else is announced. The children are the same nodes
 * in both layouts (moved, never re-created): typed text, checked boxes, listeners and each
 * filter's state are kept.
 *
 * Inert content is not announced, so results counts and status notices outside the panel would
 * go silent while the visitor filters: name them in `live` (space-separated ids) and the drawer
 * repeats what they announce in its own polite live region while it is open.
 *
 * `count` (the page's number of active filters) is shown on the button when above 0. The
 * drawer never counts by itself: only the page knows which inputs are filters.
 *
 * @tagname uvalib-filter-drawer
 * @slot - The search form and filters. Shown as the sidebar on wide screens and inside the panel on narrow ones.
 * @fires open - The panel opened. Does not bubble.
 * @fires close - The panel closed (Close, Escape, the backdrop, `close()`, or the window widening past the breakpoint). Does not bubble.
 * @fires uvalib-analytics-event - For `<site-analytics>`: `['uvalib-filter-drawer', 'open', '<label>']` when the visitor opens the panel, and `['uvalib-filter-drawer', 'close', '<label>']` when they close it (Close, Escape or the backdrop; not when the window widens or a script closes it). Bubbles and is composed.
 * @csspart toggle - The “Search and filters” button (narrow screens only).
 * @csspart count - The number of active filters on the button.
 * @csspart sidebar - The wrapper of the children on wide screens.
 * @csspart dialog - The `<dialog>` panel.
 * @csspart header - The panel's heading row.
 * @csspart heading - The panel's heading.
 * @csspart close - The Close button.
 * @csspart body - The wrapper of the children, in the sidebar or the panel.
 * @cssprop [--uvalib-filter-drawer-width=min(24rem, 100% - 3rem)] - The panel's width.
 * @cssprop --uva-color-surface - Dark-mode role token: panel background (else #fff).
 * @cssprop --uva-color-text - Dark-mode role token: panel text (else #2b2b2b).
 * @cssprop --uva-color-border - Dark-mode role token: panel edge and heading rule (else #dadada).
 * @cssprop --uva-color-button-bg - Dark-mode role token: button border and text, the count's background (else `--uva-blue-alt`, #007bac).
 * @cssprop --uva-color-button-hover-bg - Dark-mode role token: hovered button (else `--uva-blue-alt-A`, #005679).
 * @cssprop --uva-color-button-text - Dark-mode role token: the count's text (else #fff).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 */
export class UvalibFilterDrawer extends UvalibElement {
  static styles = css`
    :host {
      display: block;
    }
    :host([hidden]) {
      display: none;
    }
    .fd-toggle,
    .fd-close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      box-sizing: border-box;
      min-block-size: 44px;
      min-inline-size: 44px;
      margin: 0;
      padding: 0.5rem 1.25rem;
      border: 2px solid var(--uva-color-button-bg, var(--uva-blue-alt, #007bac));
      border-radius: 5px;
      background: transparent;
      color: var(--uva-color-button-bg, var(--uva-blue-alt, #007bac));
      font: inherit;
      font-size: 1rem;
      line-height: 1.2;
      cursor: pointer;
    }
    /* Top-aligned, so the host's line is exactly the button's height whatever the page's font
       and line height (base.css holds that height before the element upgrades). */
    .fd-toggle {
      vertical-align: top;
    }
    .fd-close {
      padding-inline: 0.875rem;
    }
    .fd-toggle:hover,
    .fd-close:hover {
      border-color: var(--uva-color-button-hover-bg, var(--uva-blue-alt-A, #005679));
      color: var(--uva-color-button-hover-bg, var(--uva-blue-alt-A, #005679));
    }
    .fd-toggle[hidden] {
      display: none;
    }
    .fd-toggle:focus-visible,
    .fd-close:focus-visible {
      outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
      outline-offset: 2px;
    }
    .fd-count {
      display: inline-flex;
      justify-content: center;
      min-inline-size: 1.5em;
      padding: 0.1em 0.4em;
      box-sizing: border-box;
      border-radius: 999px;
      background: var(--uva-color-button-bg, var(--uva-blue-alt, #007bac));
      color: var(--uva-color-button-text, #fff);
      font-size: 0.875rem;
      font-weight: 700;
      line-height: 1.2;
    }
    .fd-vh {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      padding: 0;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .fd-dialog {
      box-sizing: border-box;
      position: fixed;
      inset: 0 auto 0 0;
      inline-size: var(--uvalib-filter-drawer-width, min(24rem, 100% - 3rem));
      max-inline-size: none;
      block-size: 100%;
      max-block-size: none;
      margin: 0;
      padding: 0;
      border: 0;
      border-inline-end: 1px solid var(--uva-color-border, #dadada);
      background: var(--uva-color-surface, #fff);
      color: var(--uva-color-text, #2b2b2b);
      overflow: auto;
      overscroll-behavior: contain;
    }
    .fd-dialog:dir(rtl) {
      inset: 0 0 0 auto;
    }
    .fd-dialog::backdrop {
      background: rgb(0 0 0 / 0.5);
    }
    .fd-panel {
      display: flex;
      flex-direction: column;
      min-block-size: 100%;
    }
    .fd-head {
      position: sticky;
      top: 0;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-block-end: 1px solid var(--uva-color-border, #dadada);
      background: var(--uva-color-surface, #fff);
    }
    .fd-heading {
      margin: 0;
      font-size: 1.25rem;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }
    .fd-panel > .fd-body {
      padding: 1rem;
    }
    @media (prefers-reduced-motion: no-preference) {
      .fd-dialog[open] {
        animation: uvalib-filter-drawer-in 0.2s ease-out;
      }
      .fd-dialog[open]:dir(rtl) {
        animation-name: uvalib-filter-drawer-in-rtl;
      }
    }
    @keyframes uvalib-filter-drawer-in {
      from {
        transform: translateX(-100%);
      }
    }
    @keyframes uvalib-filter-drawer-in-rtl {
      from {
        transform: translateX(100%);
      }
    }
    @media (forced-colors: active) {
      .fd-dialog {
        border-inline-end: 2px solid CanvasText;
      }
      .fd-count {
        border: 1px solid CanvasText;
      }
    }
  `;

  /** The button's text, the panel's heading and the dialog's name. */
  @property({ type: String }) label = DEFAULT_LABEL;

  /** The widest viewport that gets the button and panel (`48rem`, `768px`); wider gets the sidebar. */
  @property({ type: String }) breakpoint = DEFAULT_BREAKPOINT;

  /** Active filters, set by the page; shown on the button when above 0. */
  @property({ type: Number }) count = 0;

  /** Space-separated ids of live regions outside the drawer (a results count, a status notice) to keep announcing while the panel is open. */
  @property({ type: String }) live = '';

  /** Whether the viewport is at or below the breakpoint. */
  @state() private narrow = false;

  /** Whether the panel is open. */
  @state() private isOpen = false;

  private readonly uid = `${TAG}-${++instances}`;
  private media?: MediaQueryList;
  private body?: HTMLDivElement;
  /** Light mode: the nodes this element rendered (never adopted as content). */
  private own?: Set<Node>;
  private childObserver?: MutationObserver;
  private liveObserver?: MutationObserver;
  private liveLast = new Map<Element, string>();
  private clearTimer?: ReturnType<typeof setTimeout>;
  private warned = false;
  /** Why the panel is closing: the visitor (reported), a resize, or a script. */
  private closeReason?: 'visitor' | 'resize' | 'script';
  /** Focus to restore after a resize closes the panel. */
  private refocus?: Element | null;

  /** Whether the panel is open. */
  get open(): boolean {
    return this.isOpen;
  }

  private get root(): ParentNode {
    return this.renderRoot as ParentNode;
  }
  private get dialog(): HTMLDialogElement | null {
    return this.root.querySelector<HTMLDialogElement>('dialog.fd-dialog');
  }
  private get toggle(): HTMLButtonElement | null {
    return this.root.querySelector<HTMLButtonElement>('button.fd-toggle');
  }
  private get closeButton(): HTMLButtonElement | null {
    return this.root.querySelector<HTMLButtonElement>('button.fd-close');
  }
  private get mirror(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>('.fd-mirror');
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.body) {
      const body = this.ownerDocument.createElement('div');
      body.className = 'fd-body';
      body.setAttribute('part', 'body');
      this.body = body;
      if (this.lightDom) {
        this.prepend(body);
        for (const n of [...this.childNodes]) if (n !== body) move(body, n);
      } else {
        body.append(this.ownerDocument.createElement('slot'));
      }
    }
    if (this.lightDom && this.hasUpdated) this.watchChildren();
    this.watchMedia();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.media?.removeEventListener('change', this.onMedia);
    this.media = undefined;
    this.childObserver?.disconnect();
    this.stopMirror();
    if (this.isOpen) {
      this.isOpen = false;
      this.closeReason = undefined;
      this.dialog?.close();
      this.dispatchEvent(new Event('close'));
    }
  }

  /** Light mode: children the page adds later go into the body too. */
  private watchChildren(): void {
    this.childObserver ??= new MutationObserver(() => this.adopt());
    this.childObserver.observe(this, { childList: true });
    this.adopt();
  }

  private adopt(): void {
    const body = this.body;
    if (!body || !this.own) return;
    for (const n of [...this.childNodes]) {
      if (this.own.has(n) || n === body) continue;
      if (n.nodeType === Node.COMMENT_NODE) continue;
      if (n.nodeType === Node.TEXT_NODE && !squash(n.textContent)) continue;
      move(body, n);
    }
  }

  private get query(): string {
    const bp = squash(this.breakpoint);
    if (LENGTH.test(bp)) return `(max-width: ${bp})`;
    if (!this.warned) {
      this.warned = true;
      console.warn(
        `${TAG}: breakpoint "${this.breakpoint}" is not a length such as 48rem or 768px; using ${DEFAULT_BREAKPOINT}.`,
      );
    }
    return `(max-width: ${DEFAULT_BREAKPOINT})`;
  }

  private watchMedia(): void {
    this.media?.removeEventListener('change', this.onMedia);
    this.media = window.matchMedia(this.query);
    this.media.addEventListener('change', this.onMedia);
    this.setNarrow(this.media.matches);
  }

  private readonly onMedia = (e: MediaQueryListEvent): void => this.setNarrow(e.matches);

  private setNarrow(narrow: boolean): void {
    if (narrow === this.narrow) return;
    if (!narrow && this.isOpen) {
      this.refocus = deepActive();
      this.closeReason = 'resize';
      this.close();
    }
    this.narrow = narrow;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('breakpoint') && this.hasUpdated && this.isConnected) {
      this.warned = false;
      this.watchMedia();
    }
  }

  protected override firstUpdated(): void {
    if (this.lightDom) {
      this.own = new Set(this.childNodes);
      this.watchChildren();
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.place();
    if (changed.has('live') && this.isOpen) this.startMirror();
  }

  /** Put the body in the sidebar (wide) or the panel (narrow): the same nodes, moved. */
  private place(): void {
    const body = this.body;
    if (!body) return;
    const target = this.narrow
      ? this.root.querySelector('.fd-panel')
      : this.root.querySelector('.fd-sidebar');
    if (!target || body.parentNode === target) return;
    move(target, body, this.narrow ? this.mirror : null);
  }

  /** Open the panel (narrow screens only; wide screens always show the filters). */
  show(): void {
    const dialog = this.dialog;
    if (!this.narrow || this.isOpen || !dialog) return;
    this.place();
    dialog.showModal();
    this.isOpen = true;
    this.closeReason = undefined;
    this.closeButton?.focus();
    this.startMirror();
    this.dispatchEvent(new Event('open'));
  }

  /** Close the panel. */
  close(): void {
    if (!this.isOpen) return;
    this.closeReason ??= 'script';
    this.dialog?.close();
    this.closed();
  }

  private readonly onToggle = (): void => {
    if (this.isOpen) return;
    this.show();
    if (this.isOpen) trackEvent(this, [TAG, 'open', this.label]);
  };

  private readonly onCloseClick = (): void => {
    this.closeReason = 'visitor';
    this.close();
  };

  private readonly onCancel = (): void => {
    this.closeReason = 'visitor';
  };

  private readonly onDialogClick = (e: MouseEvent): void => {
    const dialog = this.dialog;
    if (!dialog || e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    const inside =
      e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (inside) return;
    this.closeReason = 'visitor';
    this.close();
  };

  /** The dialog's own close event: settles an Escape (or any close not made by `close()`). */
  private readonly onDialogClose = (): void => this.closed();

  /** The panel has closed, however it happened: report, restore focus, tell the page. */
  private closed(): void {
    if (!this.isOpen) return;
    // An Escape the browser closed without a cancel event is still the visitor's.
    const reason = this.closeReason ?? 'visitor';
    this.closeReason = undefined;
    this.isOpen = false;
    this.stopMirror();
    if (reason === 'visitor') trackEvent(this, [TAG, 'close', this.label]);
    if (reason === 'resize') {
      const back = this.refocus;
      this.refocus = undefined;
      void this.updateComplete.then(() => {
        if (back instanceof HTMLElement && back.isConnected) back.focus({ preventScroll: true });
      });
    } else if (this.narrow) {
      this.toggle?.focus();
    }
    this.dispatchEvent(new Event('close'));
  }

  // ---------------------------------------------------------------- live mirror

  private startMirror(): void {
    this.stopMirror();
    const root = this.getRootNode() as Document | ShadowRoot;
    const ids = squash(this.live).split(' ').filter(Boolean);
    if (!ids.length) return;
    const observer = new MutationObserver(() => this.checkLive());
    const opts: MutationObserverInit = { childList: true, subtree: true, characterData: true };
    for (const id of ids) {
      const el = root.getElementById?.(id) ?? document.getElementById(id);
      if (!el || this.contains(el)) continue; // inside the drawer it is not inert
      this.liveLast.set(el, liveText(el));
      observer.observe(el, opts);
      if (el.shadowRoot) observer.observe(el.shadowRoot, opts);
    }
    this.liveObserver = observer;
  }

  private stopMirror(): void {
    this.liveObserver?.disconnect();
    this.liveObserver = undefined;
    this.liveLast.clear();
    clearTimeout(this.clearTimer);
    const mirror = this.mirror;
    if (mirror) mirror.textContent = '';
  }

  private checkLive(): void {
    for (const [el, last] of this.liveLast) {
      const text = liveText(el);
      if (text === last) continue;
      this.liveLast.set(el, text);
      if (text) this.announce(text);
    }
  }

  private announce(text: string): void {
    const mirror = this.mirror;
    if (!mirror) return;
    clearTimeout(this.clearTimer);
    // The same words still in the region would not be read again: empty it first.
    mirror.textContent = '';
    requestAnimationFrame(() => {
      if (!this.isOpen) return;
      mirror.textContent = text;
      this.clearTimer = setTimeout(() => (mirror.textContent = ''), CLEAR_MS);
    });
  }

  protected override render() {
    const label = squash(this.label) || DEFAULT_LABEL;
    const count = Number.isFinite(this.count) && this.count > 0 ? Math.trunc(this.count) : 0;
    const dialogId = `${this.uid}-dialog`;
    const headingId = `${this.uid}-heading`;
    return html`<button
        type="button"
        class="fd-toggle"
        part="toggle"
        aria-haspopup="dialog"
        aria-expanded=${this.isOpen ? 'true' : 'false'}
        aria-controls=${dialogId}
        ?hidden=${!this.narrow}
        @click=${this.onToggle}
      >
        <span>${label}</span>${
          count
            ? html`<span class="fd-vh">, </span><span class="fd-count" part="count">${count}</span
                ><span class="fd-vh"> active</span>`
            : nothing
        }
      </button>
      <div class="fd-sidebar" part="sidebar"></div>
      <dialog
        id=${dialogId}
        class="fd-dialog"
        part="dialog"
        aria-labelledby=${headingId}
        @cancel=${this.onCancel}
        @close=${this.onDialogClose}
        @click=${this.onDialogClick}
      >
        <div class="fd-panel">
          <div class="fd-head" part="header">
            <h2 class="fd-heading" part="heading" id=${headingId}>${label}</h2>
            <button type="button" class="fd-close" part="close" @click=${this.onCloseClick}>
              Close
            </button>
          </div>
          <div
            class="fd-mirror"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            style=${HIDDEN_STYLE}
          ></div>
        </div>
      </dialog>`;
  }
}
