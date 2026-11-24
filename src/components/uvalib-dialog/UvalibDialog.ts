import { css, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { html, unsafeStatic } from 'lit/static-html.js';
import { property } from 'lit/decorators.js';
import { trackEvent } from '../../base/analytics.js';
import { attachStateInternals, setState } from '../../base/states.js';
import { UvalibElement } from '../../base/UvalibElement.js';

const TAG = 'uvalib-dialog';
const DEFAULT_LABEL = 'Dialog';
const SIZES = { small: '30rem', medium: '40rem', large: '60rem' } as const;
/** Openers anywhere in the document: `<button data-uvalib-dialog="<id>">`. */
const OPENER = 'data-uvalib-dialog';
/** Buttons inside the content that close it: `<button data-uvalib-dialog-close value="…">`. */
const CLOSER = 'data-uvalib-dialog-close';
/** Invoker commands (`commandfor` + `command`) that open or close it. */
const SHOW_COMMANDS = new Set(['show-modal', '--show-modal', '--show']);
const CLOSE_COMMANDS = new Set(['close', 'request-close', '--close']);

/**
 * Why the dialog closed: its Close button, a `data-uvalib-dialog-close` (or invoker close)
 * button in the content, Escape (or another close request, such as Android's Back), a click on
 * the backdrop, a `<form method="dialog">` submitted, `close()` or `open = false` from script,
 * or the element leaving the page while open.
 */
export type DialogCloseReason =
  'close-button' | 'button' | 'escape' | 'backdrop' | 'form' | 'api' | 'removed';

/** How the dialog opened: a visitor's button (`data-uvalib-dialog` or an invoker), or script. */
export type DialogOpenReason = 'button' | 'api';

export interface DialogOpenDetail {
  reason: DialogOpenReason;
}
export interface DialogCloseDetail {
  reason: DialogCloseReason;
  returnValue: string;
}

/** Closes the visitor makes (reported to analytics); script closes and removal are not. */
const VISITOR: ReadonlySet<DialogCloseReason> = new Set([
  'close-button',
  'button',
  'escape',
  'backdrop',
  'form',
]);

const squash = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

let instances = 0;

/** The focused element, through open shadow roots. */
function deepActive(): Element | null {
  let a = document.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a;
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

/** Whether a click at (x, y) is outside `el`'s box: on the backdrop of a modal dialog. */
function outside(el: Element, x: number, y: number): boolean {
  const r = el.getBoundingClientRect();
  return x < r.left || x > r.right || y < r.top || y > r.bottom;
}

/** The first element in the event's path (across shadow roots) that has `attr`. */
function pathWith(e: Event, attr: string): Element | undefined {
  for (const n of e.composedPath()) {
    if (n instanceof Element && n.hasAttribute(attr)) return n;
    if (n === document) break;
  }
  return undefined;
}

/** The `<uvalib-dialog>` with `id`, in the opener's own root first, then the document. */
function dialogById(from: Node, id: string): UvalibDialog | undefined {
  if (!id) return undefined;
  const root = from.getRootNode() as Document | ShadowRoot;
  const el = root.getElementById?.(id) ?? document.getElementById(id);
  return el instanceof UvalibDialog ? el : undefined;
}

/** One delegated click listener for every opener in the document, also those added later. */
let delegated = false;
function delegateOpeners(): void {
  if (delegated) return;
  delegated = true;
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0) return;
    const opener = pathWith(e, OPENER);
    if (!opener) return;
    const dialog = dialogById(opener, squash(opener.getAttribute(OPENER)));
    if (!dialog) return;
    if (opener instanceof HTMLAnchorElement) e.preventDefault(); // never navigate
    dialog.openFrom(opener);
  });
}

/**
 * A modal dialog for content and short forms: search tips, Cite, a sign-in prompt, a request
 * form. Use it instead of a hand-built modal, a `role="dialog"` div or a framework's dialog.
 *
 * The children are the content. In shadow DOM they are slotted, never moved, so the page's CSS,
 * ids, listeners and framework-rendered nodes keep working; with `no-shadow-dom` they are moved
 * into the dialog (the same nodes, in the same document). It opens as a native `<dialog>` with
 * `showModal()`: everything else on the page, `<site-page>`'s shadow header included, is inert
 * while it is open, so focus stays inside without a trap script. The visible heading (`label`,
 * an `<h2>` unless `heading-level` says otherwise) names it, and a 44px Close button is always
 * shown; `description` (or a `slot="description"` child) is shown under the heading and is the
 * dialog's description.
 *
 * Open it with a button anywhere in the page, `<button type="button" data-uvalib-dialog="<id>">`
 * (one delegated listener, so buttons rendered later work too), with an invoker button
 * (`commandfor="<id>" command="--show-modal"`) where the browser has invoker commands, with
 * `show()`, or by setting `open`. On open, focus goes to the content's `[autofocus]` element
 * when it has one (a form dialog: the first field), else to the heading, so a screen reader
 * reads the dialog from the top and long content starts in view. On every close (Close,
 * Escape, the backdrop, a `data-uvalib-dialog-close` button, a `<form method="dialog">`
 * submitted, `close()`) focus returns to the element that opened it; if that is gone, to
 * `return-focus` (a selector, or an element set as the property).
 *
 * Escape always closes it. A click on the backdrop closes it too (the native
 * `closedby="any"`, or the same check in script where the browser lacks it), except with
 * `persistent`, and never when a press starts inside the dialog and ends on the backdrop (a
 * text selection or a drag). A `<form method="dialog">` in the content closes it on submit
 * with the submitter's `value` as `returnValue`; other forms submit as usual.
 *
 * `size` is `small` (30rem), `medium` (the default, 40rem) or `large` (60rem) at most, and
 * never wider or taller than the viewport less 16px on each side; the content scrolls inside
 * it under a header that stays in view.
 *
 * @tagname uvalib-dialog
 * @slot - The content: text, links, a form.
 * @slot description - A short description under the heading, read as the dialog's description (instead of the `description` attribute).
 * @fires uvalib-dialog-open - The dialog opened: `detail` is `{ reason }`, `button` (a visitor's opener) or `api` (`show()` or `open`). Bubbles and is composed.
 * @fires uvalib-dialog-close - The dialog closed: `detail` is `{ reason, returnValue }`, `reason` one of `close-button`, `button` (a `data-uvalib-dialog-close` or invoker close button), `escape`, `backdrop`, `form` (a `<form method="dialog">`), `api` (`close()` or `open = false`) or `removed` (taken out of the page while open). Bubbles and is composed.
 * @fires uvalib-analytics-event - For `<site-analytics>`: `['uvalib-dialog', 'open', '<label>']` when a visitor's button opens it, and `['uvalib-dialog', 'close', '<label>']` when the visitor closes it (Close, a close button, Escape, the backdrop or a dialog form); never on `show()`, `close()` or `open` from script, and never the content. Bubbles and is composed.
 * @cssstate open - The dialog is open.
 * @csspart dialog - The `<dialog>`.
 * @csspart header - The heading row (the heading and Close).
 * @csspart heading - The heading.
 * @csspart close - The Close button.
 * @csspart description - The description under the heading.
 * @csspart body - The scrolling wrapper of the content.
 * @cssprop --uvalib-dialog-width - The dialog's widest inline size, instead of `size`'s (still never wider than the viewport less 16px on each side).
 * @cssprop --uva-color-surface - Dark-mode role token: dialog background (else #fff).
 * @cssprop --uva-color-text - Dark-mode role token: dialog text (else `--uva-grey-darkest`, #2b2b2b).
 * @cssprop --uva-color-text-muted - Dark-mode role token: the description (else #4b5563, 7.5:1 on white).
 * @cssprop --uva-color-border - Dark-mode role token: dialog edge and heading rule (else #dadada).
 * @cssprop --uva-color-button-bg - Dark-mode role token: Close's border and text (else `--uva-blue-alt`, #007bac).
 * @cssprop --uva-color-button-hover-bg - Dark-mode role token: hovered Close (else `--uva-blue-alt-A`, #005679).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 */
export class UvalibDialog extends UvalibElement {
  static styles = css`
    :host {
      display: contents;
    }
    :host([hidden]) {
      display: none;
    }
    .dlg {
      --dlg-size: ${unsafeCSS(SIZES.medium)};
      box-sizing: border-box;
      inline-size: min(var(--uvalib-dialog-width, var(--dlg-size)), 100% - 32px);
      max-inline-size: none;
      max-block-size: calc(100% - 32px);
      margin: auto;
      padding: 0;
      border: 1px solid var(--uva-color-border, #dadada);
      background: var(--uva-color-surface, #fff);
      color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
      font-size: 1rem;
      line-height: 1.5;
      overflow: hidden;
    }
    :host([size='small']) .dlg {
      --dlg-size: ${unsafeCSS(SIZES.small)};
    }
    :host([size='large']) .dlg {
      --dlg-size: ${unsafeCSS(SIZES.large)};
    }
    .dlg[open] {
      display: flex;
      flex-direction: column;
    }
    .dlg::backdrop {
      background: rgb(0 0 0 / 0.5);
    }
    .dlg-head {
      flex: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem 1rem 0.75rem 1.25rem;
      border-block-end: 1px solid var(--uva-color-border, #dadada);
    }
    .dlg-heading {
      margin: 0;
      font-size: 1.25rem;
      line-height: 1.2;
      overflow-wrap: anywhere;
      text-wrap: balance;
    }
    .dlg-heading:focus {
      outline: none;
    }
    .dlg-heading:focus-visible {
      outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
      outline-offset: 2px;
    }
    .dlg-close {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      min-block-size: 44px;
      min-inline-size: 44px;
      margin: 0;
      padding: 0.5rem 0.875rem;
      border: 2px solid var(--uva-color-button-bg, var(--uva-blue-alt, #007bac));
      border-radius: 5px;
      background: transparent;
      color: var(--uva-color-button-bg, var(--uva-blue-alt, #007bac));
      font: inherit;
      font-size: 1rem;
      line-height: 1.2;
      cursor: pointer;
    }
    .dlg-close:hover {
      border-color: var(--uva-color-button-hover-bg, var(--uva-blue-alt-A, #005679));
      color: var(--uva-color-button-hover-bg, var(--uva-blue-alt-A, #005679));
    }
    .dlg-close:focus-visible {
      outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
      outline-offset: 2px;
    }
    .dlg-body {
      flex: 1 1 auto;
      min-block-size: 0;
      padding: 1rem 1.25rem 1.25rem;
      overflow: auto;
      overscroll-behavior: contain;
      overflow-wrap: break-word;
    }
    .dlg-desc {
      margin: 0 0 1rem;
      color: var(--uva-color-text-muted, #4b5563);
    }
    .dlg-desc[hidden] {
      display: none;
    }
    @media (prefers-reduced-motion: no-preference) {
      .dlg[open] {
        animation: uvalib-dialog-in 0.15s ease-out;
      }
    }
    @keyframes uvalib-dialog-in {
      from {
        opacity: 0;
        transform: translateY(0.5rem);
      }
    }
    @media (forced-colors: active) {
      .dlg {
        border: 2px solid CanvasText;
      }
      .dlg-close {
        border-color: ButtonText;
      }
    }
  `;

  /** The visible heading and the dialog's accessible name. */
  @property({ type: String }) label = '';

  /** The heading's level, 1 to 6 (default 2). */
  @property({ type: Number, attribute: 'heading-level' }) headingLevel = 2;

  /** A short description under the heading (or a `slot="description"` child), read as the dialog's description. */
  @property({ type: String }) description = '';

  /** The widest the dialog gets: `small` (30rem), `medium` (40rem) or `large` (60rem). */
  @property({ type: String, reflect: true }) size: 'small' | 'medium' | 'large' = 'medium';

  /** Whether it is open. Reflected; setting it opens or closes the dialog (as `show()` and `close()`). */
  @property({ type: Boolean, reflect: true }) open = false;

  /** A click on the backdrop does not close it (Escape and Close still do). For forms that would lose typed text. */
  @property({ type: Boolean }) persistent = false;

  /** Where focus goes on close when the opener is gone: a selector (in the dialog's root, then the document) or an element. */
  @property({ attribute: 'return-focus' }) returnFocus: string | HTMLElement | null = null;

  /** The Close button's text. */
  @property({ type: String, attribute: 'close-label' }) closeLabel = 'Close';

  private readonly uid = `${TAG}-${++instances}`;
  private readonly internals = attachStateInternals(this);
  /** Light mode: the content wrapper, created on connect. */
  private content?: HTMLDivElement;
  /** Light mode: the nodes this element rendered (never adopted as content). */
  private own?: Set<Node>;
  private childObserver?: MutationObserver;
  /** The element focused when it opened (or the button that opened it). */
  private opener: Element | null = null;
  /** Whether the dialog is showing, as far as this element has settled it. */
  private shown = false;
  /** Why the next close happens, when this element knows before the native close event. */
  private closeReason?: DialogCloseReason;
  /** The open reason for an open requested before the first render. */
  private pendingOpen?: { reason: DialogOpenReason; opener: Element | null };
  /** A press that started on the backdrop (not inside the dialog). */
  private downOnBackdrop = false;
  /** Whether the last pointer press, rather than a key, came last: a cancel then is the backdrop. */
  private pointerLast = false;
  /** Whether the last render had a description child. */
  private descChild = false;

  private get root(): ParentNode {
    return this.renderRoot as ParentNode;
  }
  private get dialog(): HTMLDialogElement | null {
    return this.root.querySelector<HTMLDialogElement>('dialog.dlg');
  }
  private get heading(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>('.dlg-heading');
  }

  /** The dialog's return value: the submitter's `value` of a `<form method="dialog">`, or what `close()` was given. Empty on open. */
  get returnValue(): string {
    return this.dialog?.returnValue ?? '';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    delegateOpeners();
    this.addEventListener('command', this.onCommand as EventListener);
    this.addEventListener('submit', this.onSubmit);
    this.addEventListener('click', this.onContentClick);
    if (this.lightDom && !this.content) {
      const content = this.ownerDocument.createElement('div');
      content.className = 'dlg-content';
      this.content = content;
      for (const n of [...this.childNodes]) move(content, n);
      this.append(content);
    }
    if (this.lightDom && this.hasUpdated) this.watchChildren();
  }

  /** Moved with `moveBefore()`: stay as it is (open or not). */
  connectedMoveCallback(): void {}

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('command', this.onCommand as EventListener);
    this.removeEventListener('submit', this.onSubmit);
    this.removeEventListener('click', this.onContentClick);
    this.childObserver?.disconnect();
    if (this.shown) {
      this.closeReason = 'removed';
      this.dialog?.close();
      this.closed();
    }
  }

  /** Open the dialog (modal). Focus returns to the element focused now when it closes. */
  show(): void {
    this.reveal('api', deepActive());
  }

  /** Close the dialog, with `returnValue` if given. Focus returns to the opener. */
  close(returnValue?: string): void {
    this.closeWith('api', returnValue);
  }

  /** @internal A visitor's button (`data-uvalib-dialog` or an invoker) opens it. */
  openFrom(opener: Element): void {
    if (this.shown) return;
    this.reveal('button', opener);
  }

  private reveal(reason: DialogOpenReason, opener: Element | null): void {
    if (this.shown) return;
    const dialog = this.dialog;
    if (!dialog || !this.isConnected) {
      // Not rendered yet: open once it is.
      this.pendingOpen = { reason, opener };
      this.open = true;
      return;
    }
    this.pendingOpen = undefined;
    try {
      dialog.returnValue = '';
      dialog.showModal();
    } catch (err) {
      console.warn(`${TAG}: could not open the dialog.`, err);
      this.open = false;
      return;
    }
    this.opener = opener && !this.contains(opener) ? opener : null;
    this.shown = true;
    this.closeReason = undefined;
    this.downOnBackdrop = false;
    this.pointerLast = false;
    this.open = true;
    setState(this.internals, 'open', true);
    this.focusInitial();
    if (reason === 'button') trackEvent(this, [TAG, 'open', this.name]);
    this.dispatchEvent(
      new CustomEvent<DialogOpenDetail>('uvalib-dialog-open', {
        detail: { reason },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private closeWith(reason: DialogCloseReason, returnValue?: string): void {
    if (!this.shown) {
      this.pendingOpen = undefined;
      this.open = false;
      return;
    }
    this.closeReason = reason;
    const dialog = this.dialog;
    if (dialog?.open) {
      if (returnValue === undefined) dialog.close();
      else dialog.close(returnValue);
    }
    this.closed();
  }

  /** The dialog has closed, however it happened: restore focus, report, tell the page. */
  private closed(): void {
    if (!this.shown) return;
    // A close the browser made without a cancel event first is still a close request.
    const reason = this.closeReason ?? 'escape';
    this.closeReason = undefined;
    this.shown = false;
    this.open = false;
    setState(this.internals, 'open', false);
    this.restoreFocus();
    if (VISITOR.has(reason)) trackEvent(this, [TAG, 'close', this.name]);
    this.dispatchEvent(
      new CustomEvent<DialogCloseDetail>('uvalib-dialog-close', {
        detail: { reason, returnValue: this.returnValue },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private get name(): string {
    return squash(this.label) || DEFAULT_LABEL;
  }

  /** The content's elements (slotted, or in the content wrapper in light mode). */
  private contentQuery(selector: string): HTMLElement | null {
    const scope: ParentNode | undefined = this.lightDom ? this.content : this;
    for (const el of scope?.querySelectorAll<HTMLElement>(selector) ?? []) {
      if (el.closest(TAG) !== this) continue; // a nested dialog's own content
      if (el.getClientRects().length === 0) continue;
      return el;
    }
    return null;
  }

  /**
   * APG: focus the first field of a form dialog (mark it `autofocus`), else a static element at
   * the top, the heading, so the start of the content stays in view and is read first.
   */
  private focusInitial(): void {
    const auto = this.contentQuery('[autofocus]');
    if (auto) {
      auto.focus();
      if (deepActive() === auto) return;
    }
    this.heading?.focus();
  }

  private restoreFocus(): void {
    const candidates: unknown[] = [this.opener, this.returnTarget()];
    this.opener = null;
    for (const c of candidates) {
      if (!(c instanceof HTMLElement) || !c.isConnected) continue;
      c.focus();
      if (deepActive() === c) return;
    }
  }

  private returnTarget(): Element | null {
    const r = this.returnFocus;
    if (r instanceof Element) return r;
    const sel = squash(typeof r === 'string' ? r : '');
    if (!sel) return null;
    try {
      const root = this.getRootNode() as Document | ShadowRoot;
      return root.querySelector(sel) ?? document.querySelector(sel);
    } catch {
      console.warn(`${TAG}: return-focus "${sel}" is not a valid selector.`);
      return null;
    }
  }

  // ------------------------------------------------------------------ events

  /** Invoker commands aimed at this element (`commandfor="<id>"`). */
  private readonly onCommand = (e: Event & { command?: string; source?: Element | null }): void => {
    const command = e.command ?? '';
    if (SHOW_COMMANDS.has(command)) {
      e.preventDefault();
      const src = e.source ?? deepActive();
      if (!this.shown) this.reveal('button', src);
    } else if (CLOSE_COMMANDS.has(command)) {
      e.preventDefault();
      this.closeWith('button');
    }
  };

  /** A `<form method="dialog">` in the content closes it with the submitter's value. */
  private readonly onSubmit = (e: SubmitEvent): void => {
    if (e.defaultPrevented || !this.shown) return;
    const form = e.target;
    if (!(form instanceof HTMLFormElement) || form.closest(TAG) !== this) return;
    const sub = e.submitter as HTMLButtonElement | HTMLInputElement | null;
    const method = sub?.hasAttribute('formmethod') ? sub.formMethod : form.method;
    if (method !== 'dialog') return;
    e.preventDefault();
    this.closeWith('form', sub?.hasAttribute('value') ? sub.value : undefined);
  };

  /** `data-uvalib-dialog-close` buttons in the content. */
  private readonly onContentClick = (e: MouseEvent): void => {
    if (!this.shown || e.defaultPrevented) return;
    const closer = pathWith(e, CLOSER);
    if (!closer || closer.closest(TAG) !== this) return;
    if ((closer as HTMLButtonElement).disabled) return;
    const value = closer.getAttribute(CLOSER) || closer.getAttribute('value') || undefined;
    this.closeWith('button', value ?? undefined);
  };

  private readonly onCloseClick = (): void => this.closeWith('close-button');

  /** Escape, or the native light dismiss (`closedby="any"`), asks to close. */
  private readonly onCancel = (): void => {
    this.closeReason = this.pointerLast && this.downOnBackdrop ? 'backdrop' : 'escape';
  };

  private readonly onKeydown = (): void => {
    this.pointerLast = false;
  };

  private readonly onPointerDown = (e: PointerEvent): void => {
    const dialog = this.dialog;
    this.pointerLast = true;
    this.downOnBackdrop = !!dialog && e.target === dialog && outside(dialog, e.clientX, e.clientY);
  };

  /** Without native `closedby`: a click whose press and release are both on the backdrop closes it. */
  private readonly onDialogClick = (e: MouseEvent): void => {
    const dialog = this.dialog;
    if (!dialog || !this.shown || this.persistent || nativeLightDismiss()) return;
    const started = this.downOnBackdrop;
    this.downOnBackdrop = false;
    if (!started || e.target !== dialog || !outside(dialog, e.clientX, e.clientY)) return;
    this.closeWith('backdrop');
  };

  /** The dialog's own close event: settles Escape, the native backdrop close, or any close not made by this element. */
  private readonly onDialogClose = (): void => {
    if (this.dialog?.open) return; // reopened before the event arrived
    this.closed();
  };

  // ------------------------------------------------------------------ light DOM

  /** Light mode: children the page adds later go into the content too. */
  private watchChildren(): void {
    this.childObserver ??= new MutationObserver(() => this.adopt());
    this.childObserver.observe(this, { childList: true });
    this.adopt();
  }

  private adopt(): void {
    const content = this.content;
    if (!content || !this.own) return;
    const desc = this.root.querySelector('.dlg-desc');
    for (const n of [...this.childNodes]) {
      if (this.own.has(n) || n === content) continue;
      if (n.nodeType === Node.COMMENT_NODE) continue;
      if (n.nodeType === Node.TEXT_NODE && !squash(n.textContent)) continue;
      move(content, n);
    }
    // slot="description" children go under the heading.
    let moved = false;
    for (const n of [...content.children]) {
      if (n.getAttribute('slot') === 'description' && desc) {
        move(desc, n);
        moved = true;
      }
    }
    if (moved) this.descriptionChanged();
  }

  /** Re-render when a description child appears or goes. */
  private descriptionChanged(): void {
    if (!!this.descriptionChild !== this.descChild) this.requestUpdate();
  }

  /** A `slot="description"` child of this dialog (not of a nested one). */
  private get descriptionChild(): Element | null {
    for (const el of this.querySelectorAll('[slot="description"]'))
      if (el.parentElement?.closest(TAG) === this) return el;
    return null;
  }

  protected override firstUpdated(): void {
    if (this.lightDom) {
      const body = this.root.querySelector('.dlg-body');
      if (body && this.content) move(body, this.content);
      this.own = new Set(this.childNodes);
      this.watchChildren();
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (!changed.has('open')) return;
    if (this.open && !this.shown) {
      const pending = this.pendingOpen ?? { reason: 'api' as const, opener: deepActive() };
      this.reveal(pending.reason, pending.opener);
    } else if (!this.open && this.shown) {
      this.closeWith('api');
    }
  }

  protected override render() {
    const label = this.name;
    const level = Math.min(6, Math.max(1, Math.trunc(this.headingLevel) || 2));
    const h = unsafeStatic(`h${level}`);
    const headingId = `${this.uid}-heading`;
    const descId = `${this.uid}-desc`;
    const desc = squash(this.description);
    this.descChild = !!this.descriptionChild;
    const hasDesc = !!desc || this.descChild;
    return html`<dialog
      class="dlg"
      part="dialog"
      aria-labelledby=${headingId}
      aria-describedby=${hasDesc ? descId : nothing}
      closedby=${this.persistent ? 'closerequest' : 'any'}
      @cancel=${this.onCancel}
      @close=${this.onDialogClose}
      @click=${this.onDialogClick}
      @pointerdown=${this.onPointerDown}
      @keydown=${this.onKeydown}
    >
      <div class="dlg-head" part="header">
        <${h} class="dlg-heading" part="heading" id=${headingId} tabindex="-1">${label}</${h}>
        <button type="button" class="dlg-close" part="close" @click=${this.onCloseClick}>
          ${squash(this.closeLabel) || 'Close'}
        </button>
      </div>
      <div class="dlg-body" part="body">
        <p class="dlg-desc" part="description" id=${descId} ?hidden=${!hasDesc}>${desc}${
          this.lightDom
            ? nothing
            : html`<slot name="description" @slotchange=${() => this.descriptionChanged()}></slot>`
        }</p>
        ${this.lightDom ? nothing : html`<slot></slot>`}
      </div>
    </dialog>`;
  }
}

/** Whether the browser closes a `closedby="any"` dialog on a backdrop click itself. */
function nativeLightDismiss(): boolean {
  return 'closedBy' in HTMLDialogElement.prototype;
}
