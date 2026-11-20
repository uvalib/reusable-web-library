import { css, html, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { trackEvent } from '../../base/analytics.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { accessible } from '../../styles/accessible.js';
import {
  hrefWithParam,
  iiifIdentifier,
  paramFromLocation,
  sizedIiifUrl,
  usableImageUrl,
  usesHashParam,
  viewportIiifSize,
  type PageLocation,
} from './media.js';

/** One image in the set, in document order. */
interface Slide {
  el: HTMLAnchorElement;
  /** Deep-link id: `data-id`, else the element's id, else the IIIF identifier, else the position. */
  id: string;
  /** The href as written. */
  href: string;
  caption: string;
  alt: string;
  /** `data-details-id`, when the slide has its own details element. */
  detailsId: string | null;
}

const normalize = (s: unknown) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Kept with `no-style`: the triggers stay put, `[hidden]` hides, the dialog hugs its panel
 * (so a click outside it is the backdrop), controls are at least 44px, and the image stays
 * within the viewport. `host` is `:host` (shadow) or the tag (light DOM).
 */
const structuralRules = (host: string) => `
  ${host} { display: block; }
  ${host} .viewer { display: contents; }
  ${host} dialog {
    margin: auto;
    padding: 0;
    border: none;
    background: transparent;
    width: min(72rem, calc(100% - 2rem));
    max-height: calc(100% - 2rem);
  }
  ${host} .panel {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: calc(100dvh - 2rem);
    overflow: auto;
    overscroll-behavior: contain;
    padding: 0.75rem;
  }
  ${host} .head, ${host} .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
  ${host} .head { justify-content: space-between; }
  ${host} .caption { margin: 0; min-width: 0; overflow-wrap: anywhere; }
  ${host} .figure { margin: 0; }
  ${host} dialog img { display: block; max-width: 100%; max-height: 70dvh; width: auto; height: auto; margin: auto; }
  ${host} .count, ${host} .status { margin: 0; }
  ${host} dialog button, ${host} dialog .full {
    box-sizing: border-box;
    min-width: 44px;
    min-height: 44px;
    padding: 0.5rem 0.75rem;
    font: inherit;
  }
  ${host} .details:empty { display: none; }
  ${host} > [slot="details"] { display: none; }
  ${host}[hidden], ${host} [hidden] { display: none !important; }
`;
const shadowStructure = unsafeCSS(structuralRules(':host'));

let nextCaption = 0;

/**
 * An accessible image viewer over a set of plain links. With JavaScript a primary click opens
 * a modal dialog; without it (or with a modified click) the link opens the image as before.
 * Wrap the links, or point at them with `selector` (for example `a.pb-image` on a reading
 * page). There is no autoplay and no carousel.
 *
 * The dialog is labelled by the caption (`data-caption`, else the image alt, else the link
 * text). Focus moves to Close on open and back to the trigger on close. Escape and a click on
 * the backdrop close it. With more than one image, Previous and Next and the arrow keys move
 * through the set (wrapping), and a polite “3 of 13” counter is shown. Full size opens the
 * original image in a new tab. A IIIF Image API URL keeps its region; only the size becomes
 * `!W,H` for the viewport. TIFF and JPEG2000 URLs are left as written. `url-param` (for
 * example `photo`) keeps `?photo=<id>` in sync, including on a hash route
 * (`#/text?photo=<id>`): opening pushes a history entry, stepping replaces it, and
 * Back closes.
 *
 * Optional details: children with `slot="details"` (and `data-for` equal to the item's id or
 * its position from 1; without `data-for` they show for every image), or `data-details-id` on
 * a link pointing at an element elsewhere on the page. Either is shown inside the dialog and
 * put back when the viewer moves on or closes.
 *
 * @tagname uvalib-lightbox
 * @slot - The image links. A plain click opens the viewer; without JavaScript they open the image.
 * @slot details - Details for the open image. `data-for` selects one item by its id or position (from 1); without it the details show for every image.
 * @csspart dialog - The modal dialog.
 * @csspart panel - The surface inside the dialog.
 * @csspart caption - The caption that names the dialog.
 * @csspart image - The image.
 * @csspart controls - Previous, Next, the counter and Full size.
 * @csspart details - The details panel.
 * @fires uvalib-analytics-event - For `<site-analytics>`: `['uvalib-lightbox', 'open'|'next'|'previous'|'full-size', 'image N', N]` (N from 1, the image's place in the set). Never the URL or the caption. Not fired for a viewer restored from the URL or from Back and Forward. Bubbles and is composed.
 * @cssprop --uva-color-surface-raised - Dark-mode role token: dialog surface (else `--uva-color-surface`, else #fff).
 * @cssprop --uva-color-surface - Dark-mode role token: the figure behind the image (else #fff).
 * @cssprop --uva-color-text - Dark-mode role token: text (else `--uva-grey-darkest`).
 * @cssprop --uva-color-shadow - Dark-mode role token: the backdrop scrim (else rgba(16, 23, 43, 0.72)).
 * @cssprop --uva-color-border - Dark-mode role token: dialog border (else `--uva-grey-100`).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 * @cssprop --uva-color-link - Dark-mode role token: Full size text when it is not the filled control (else `--uva-brand-blue`).
 * @cssprop --uva-color-accent-bg - Dark-mode role token: Close and Full size background (else `--uva-brand-blue`).
 * @cssprop --uva-color-on-accent - Text on those controls (else #fff).
 * @cssprop [--uva-brand-orange=#e57200] - Focus ring when `--uva-color-focus` is unset.
 * @cssprop [--uva-brand-blue=#232d4b] - Control background when `--uva-color-accent-bg` is unset.
 * @cssprop [--uva-grey-darkest=#2b2b2b] - Text when `--uva-color-text` is unset.
 * @cssprop [--uva-grey-100=#dadada] - Border when `--uva-color-border` is unset.
 */
export class UvalibLightbox extends UvalibElement {
  static styles = [
    accessible,
    shadowStructure,
    css`
      .panel {
        background: var(--uva-color-surface-raised, var(--uva-color-surface, #fff));
        color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
        border: 1px solid var(--uva-color-border, var(--uva-grey-100, #dadada));
      }
      dialog::backdrop {
        background: var(--uva-color-shadow, rgba(16, 23, 43, 0.72));
      }
      .details a {
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
      }
      .figure {
        background: var(--uva-color-surface, #fff);
      }
      .caption {
        font-size: 1.125rem;
        line-height: 1.4;
        font-weight: 600;
      }
      .count {
        font-variant-numeric: tabular-nums;
      }
      dialog button,
      dialog .full {
        padding: 0.5rem 0.75rem;
        border: 2px solid transparent;
        text-decoration: none;
        cursor: pointer;
        color: var(--uva-color-on-accent, #fff);
        background: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
      }
      dialog button:focus-visible,
      dialog .full:focus-visible {
        outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
        outline-offset: 2px;
      }
      dialog button.prev,
      dialog button.next {
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
        background: var(--uva-color-surface, #fff);
        border-color: var(--uva-color-border, var(--uva-grey-100, #dadada));
      }
      .status {
        font-size: 1rem;
      }
      @media (prefers-reduced-motion: no-preference) {
        .panel {
          animation: uvalib-lightbox-in 0.15s ease;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        dialog,
        dialog * {
          animation: none !important;
          transition: none !important;
          scroll-behavior: auto !important;
        }
      }
      @media (forced-colors: active) {
        .panel,
        dialog button,
        dialog .full {
          border: 1px solid CanvasText;
        }
      }
      @keyframes uvalib-lightbox-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `,
  ];

  /**
   * CSS selector for image links elsewhere in this root (the page, or the shadow root the
   * component sits in). Combined with any links inside the component. Example: `a.pb-image`.
   */
  @property({ type: String }) selector = '';

  /**
   * Query parameter kept in sync with the open image, for example `photo` → `?photo=<id>`.
   * The id is the link's `data-id`, else its `id`, else the IIIF identifier, else its position
   * from 1. On a hash route the parameter is written inside the hash. Empty: no deep link.
   */
  @property({ attribute: 'url-param' }) urlParam = '';

  @state() private slides: Slide[] = [];
  @state() private index = 0;
  @state() private open = false;
  @state() private status: 'loading' | 'ready' | 'error' = 'loading';
  @state() private fitW = 0;
  @state() private fitH = 0;

  private readonly captionId = `uvalib-lightbox-caption-${++nextCaption}`;
  /** Where the dialog is rendered. Light DOM renders here so the author's links stay put. */
  private mount?: HTMLElement;
  private trigger: HTMLAnchorElement | null = null;
  /** The open image pushed a history entry, so Back (and Close) returns to the page. */
  private historyPushed = false;
  /** The visitor closed the viewer; a later mutation must not reopen it from the URL. */
  private userClosed = false;
  /** Disconnect (and the dialog it closes) is not a visitor action, so it must not touch history. */
  private suppressClose = false;
  private warnedSelector = false;
  private lastSrc = '';
  private observer?: MutationObserver;
  private syncQueued = false;
  private resizeTimer = 0;
  /** A close event from the dialog we just shut must not dismiss the next open. */
  private ignoreClose = false;
  private dismissing = false;
  private revealTries = 0;
  private revealFrame = 0;
  private listened = false;
  /** The root `listen` bound, so disconnect can remove the listener after leaving a shadow root. */
  private listenRoot?: Document | ShadowRoot;
  /**
   * `dialog.close()` removes `open` now and fires `close` on a later task. The attribute
   * observer runs as a microtask, which is what a caller sees after `await updateComplete`.
   */
  private dialogObserver?: MutationObserver;
  private observedDialog?: HTMLDialogElement;
  /** `history.back()` from Close has not fired `popstate` yet. */
  private pendingBack = false;
  /** Whether that entry kept the parameter in the hash. The pop leaves a hash that may not say so. */
  private backInHash = false;
  /** An image chosen while that Back is still in flight, opened once the popstate arrives. */
  private queuedOpen: { i: number; slides: Slide[] } | null = null;
  /**
   * Set while a history traversal is opening the dialog. The traversal can close the
   * dialog it just showed; that close is not the visitor, so show it again.
   */
  private reopenGuard = false;
  /** Details elements moved into the dialog, and where they go back to. */
  private parked: { el: HTMLElement; parent: Node; next: ChildNode | null; hidden: boolean }[] = [];
  private parkedKey = '';

  /** Shadow mode follows the base class. Light mode renders into `.viewer`. */
  private get isLight(): boolean {
    return this.noShadowDom || this.hasAttribute('no-shadow-dom');
  }

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    if (!this.isLight) {
      const root = super.createRenderRoot();
      if (this.noStyle && root instanceof ShadowRoot) {
        const sheets = [accessible.styleSheet, shadowStructure.styleSheet].filter(
          (sheet): sheet is CSSStyleSheet => sheet != null,
        );
        root.adoptedStyleSheets = sheets;
      }
      return root;
    }
    const mount = this.ownerDocument.createElement('div');
    mount.className = 'viewer';
    this.mount = mount;
    this.append(mount);
    return mount;
  }

  override connectedCallback(): void {
    const light = this.isLight;
    super.connectedCallback();
    // A move in the DOM disconnects and reconnects. The disconnect guard must not stick,
    // or Escape would close the dialog and leave the viewer thinking it is still open.
    this.suppressClose = false;
    if (light) this.installLight(light);
    this.listen();
    this.slides = this.collect();
    this.watch();
    this.openFromUrl();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unlisten();
    this.observer?.disconnect();
    this.dialogObserver?.disconnect();
    this.dialogObserver = undefined;
    this.observedDialog = undefined;
    window.clearTimeout(this.resizeTimer);
    this.cancelReveal();
    this.restoreDetails();
    this.pendingBack = false;
    this.queuedOpen = null;
    this.reopenGuard = false;
    // Closing the dialog here fires `close` synchronously. That is not the visitor dismissing
    // it: do not run history.back(), which could leave the page. `open` goes false so a later
    // connect can open again from the URL.
    this.suppressClose = true;
    this.open = false;
    const dialog = this.dialogEl;
    if (dialog?.open) dialog.close();
    this.suppressClose = false;
    this.ignoreClose = false;
  }

  protected override willUpdate(): void {
    if (!this.open) {
      this.lastSrc = '';
      return;
    }
    const src = this.displaySrc;
    if (src !== this.lastSrc) {
      this.lastSrc = src;
      this.status = src ? 'loading' : 'error';
    } else if (!src && this.status !== 'error') {
      // A refused URL (javascript:) has an empty src. On the first open `lastSrc` is already
      // empty, so the change above does not run, and the status would stay "loading".
      this.status = 'error';
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (changed.has('selector')) this.watch();
    if (!this.open) {
      if (changed.has('open')) this.restoreDetails();
      return;
    }
    if (changed.has('open') || changed.has('index') || changed.has('slides')) this.placeDetails();
    this.bindDialogObserver();
    if (changed.has('open')) this.reveal();
    // Reading the image and writing `status` from inside `updated` makes Lit warn and schedule
    // a nested update. A microtask is still before the next paint.
    queueMicrotask(() => {
      if (this.isConnected) this.settleImage();
    });
  }

  private installLight(light: boolean): void {
    if (!light) return;
    const node = this.getRootNode();
    const root = node instanceof Document || node instanceof ShadowRoot ? node : undefined;
    if (this.noStyle) {
      installLightDomStyles(
        `${this.localName}::structure`,
        unsafeCSS(structuralRules(this.localName)),
        { root, scope: false },
      );
      installLightDomStyles(`${this.localName}::a11y`, accessible, { root });
      return;
    }
    installLightDomStyles(
      this.localName,
      (this.constructor as typeof UvalibElement).elementStyles,
      {
        root,
      },
    );
  }

  private get scope(): Document | ShadowRoot {
    const root = this.getRootNode();
    return root instanceof Document || root instanceof ShadowRoot ? root : this.ownerDocument;
  }

  private get base(): string {
    return this.ownerDocument.baseURI || location.href;
  }

  private loc(): PageLocation {
    return { pathname: location.pathname, search: location.search, hash: location.hash };
  }

  private listen(): void {
    if (this.listened) return;
    this.listened = true;
    this.listenRoot = this.scope;
    this.listenRoot.addEventListener('click', this.onClick, true);
    window.addEventListener('popstate', this.onPop);
    window.addEventListener('resize', this.onResize);
  }

  private unlisten(): void {
    if (!this.listened) return;
    this.listened = false;
    this.listenRoot?.removeEventListener('click', this.onClick, true);
    this.listenRoot = undefined;
    window.removeEventListener('popstate', this.onPop);
    window.removeEventListener('resize', this.onResize);
  }

  private watch(): void {
    this.observer?.disconnect();
    this.observer = new MutationObserver(() => this.scheduleSync());
    this.observer.observe(this, {
      attributes: true,
      attributeFilter: [
        'href',
        'id',
        'alt',
        'title',
        'data-caption',
        'data-id',
        'data-details-id',
        'slot',
      ],
      childList: true,
      subtree: true,
    });
    if (this.selector) this.observer.observe(this.scope, { childList: true, subtree: true });
  }

  /** Ignore mutations inside the viewer (the dialog, parked details) so a render cannot loop. */
  private scheduleSync(): void {
    if (this.syncQueued) return;
    this.syncQueued = true;
    queueMicrotask(() => {
      this.syncQueued = false;
      if (!this.isConnected) return;
      const next = this.collect();
      const same =
        next.length === this.slides.length &&
        next.every(
          (s, i) =>
            s.el === this.slides[i]?.el &&
            s.href === this.slides[i]?.href &&
            s.id === this.slides[i]?.id &&
            s.caption === this.slides[i]?.caption &&
            s.detailsId === this.slides[i]?.detailsId,
        );
      if (!same) {
        const current = this.current?.el;
        this.slides = next;
        if (this.open) {
          const at = current ? next.findIndex((s) => s.el === current) : -1;
          if (at >= 0) this.index = at;
          else if (!next.length) this.dismiss('empty');
          else this.index = Math.min(this.index, next.length - 1);
        }
      }
      if (!this.open) this.openFromUrl();
    });
  }

  private collect(): Slide[] {
    const found: HTMLAnchorElement[] = [];
    const detailRoots = new Set<Element>();
    const noteDetails = (a: Element) => {
      if (!(a instanceof HTMLAnchorElement)) return;
      const id = a.getAttribute('data-details-id');
      if (!id) return;
      const el = this.scope.getElementById(id);
      if (el) detailRoots.add(el);
    };
    const candidates: Element[] = [...this.querySelectorAll('a[href]')];
    if (this.selector) {
      try {
        candidates.push(...this.scope.querySelectorAll(this.selector));
      } catch {
        if (!this.warnedSelector) {
          this.warnedSelector = true;
          console.warn(
            `${this.localName}: selector ${JSON.stringify(this.selector)} is not a valid CSS selector.`,
          );
        }
      }
    }
    for (const a of candidates) noteDetails(a);
    const push = (a: Element) => {
      if (!(a instanceof HTMLAnchorElement) || !a.hasAttribute('href')) return;
      if (a.closest('[hidden]')) return;
      if (this.mount?.contains(a) || a.closest('dialog')) return;
      if (a.closest('[slot="details"]')) return;
      for (const root of detailRoots) {
        if (root.contains(a)) return;
      }
      const owner = a.closest('uvalib-lightbox');
      if (owner && owner !== this) return;
      found.push(a);
    };
    for (const a of candidates) push(a);
    const unique = [...new Set(found)];
    unique.sort((a, b) => {
      if (a === b) return 0;
      const pos = a.compareDocumentPosition(b);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
    return unique.map((el, i) => this.slide(el, i));
  }

  private slide(el: HTMLAnchorElement, index: number): Slide {
    const href = el.getAttribute('href') ?? '';
    const img = el.querySelector('img');
    const alt = normalize(img?.getAttribute('data-uvalib-alt') || img?.getAttribute('alt'));
    const text = this.linkText(el);
    const caption =
      normalize(el.dataset.caption) ||
      alt ||
      text ||
      normalize(el.getAttribute('title')) ||
      'Image';
    const id =
      normalize(el.dataset.id) || el.id || iiifIdentifier(href, this.base) || String(index + 1);
    return {
      el,
      id,
      href,
      caption,
      alt: alt || caption,
      detailsId: normalize(el.dataset.detailsId) || null,
    };
  }

  /** The link's own text, not the alt of its image and not a details subtree. */
  private linkText(el: HTMLAnchorElement): string {
    const parts: string[] = [];
    const walk = (n: Node) => {
      if (n instanceof HTMLImageElement) return;
      if (
        n instanceof HTMLElement &&
        (n.hidden ||
          n.getAttribute('slot') === 'details' ||
          n.getAttribute('slot') === 'badge' ||
          n.classList.contains('badge') ||
          n.classList.contains('visually-hidden') ||
          n.hasAttribute('data-uvalib-generated-badge') ||
          n.hasAttribute('data-uvalib-badge-sep'))
      )
        return;
      if (n.nodeType === Node.TEXT_NODE) {
        parts.push(n.textContent ?? '');
        return;
      }
      n.childNodes.forEach(walk);
    };
    el.childNodes.forEach(walk);
    return normalize(parts.join(' '));
  }

  private get current(): Slide | undefined {
    return this.slides[this.index];
  }

  private get multiple(): boolean {
    return this.slides.length > 1;
  }

  /** The URL the `<img>` should load: a viewport-sized IIIF request, or the href itself. */
  private get displaySrc(): string {
    const href = this.current?.href ?? '';
    if (!usableImageUrl(href, this.base)) return '';
    const w = this.fitW || viewportIiifSize(window).w;
    const h = this.fitH || viewportIiifSize(window).h;
    return sizedIiifUrl(href, this.base, w, h) ?? href;
  }

  private measure(): void {
    const { w, h } = viewportIiifSize(window);
    if (w !== this.fitW) this.fitW = w;
    if (h !== this.fitH) this.fitH = h;
  }

  private readonly onResize = (): void => {
    if (!this.open) return;
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      if (this.isConnected && this.open) this.measure();
    }, 150);
  };

  private readonly onClick = (e: Event): void => {
    if (
      !(e instanceof MouseEvent) ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    )
      return;
    const link = this.linkFrom(e);
    if (!link) return;
    const slides = this.collect();
    const i = slides.findIndex((s) => s.el === link);
    if (i < 0) return;
    e.preventDefault();
    this.activate(i, slides);
  };

  private linkFrom(e: Event): HTMLAnchorElement | null {
    for (const n of e.composedPath()) {
      if (n instanceof HTMLAnchorElement) return n;
    }
    const t = e.target;
    return t instanceof Element ? t.closest('a[href]') : null;
  }

  /** A visitor chose `slides[i]`. The first open pushes a history entry; a later choice replaces it. */
  private activate(i: number, slides: Slide[]): void {
    const already = this.open;
    if (already && this.index === i) return;
    this.slides = slides;
    this.index = i;
    this.trigger = slides[i]?.el ?? null;
    this.userClosed = false;
    this.measure();
    this.open = true;
    if (this.pendingBack) {
      // Close already asked for history.back(). Writing now would push on the entry that
      // popstate is about to remove, and that pop would shut the viewer again.
      this.queuedOpen = { i, slides };
    } else if (this.urlParam) {
      const id = slides[i]?.id ?? null;
      const hashMode = usesHashParam(location.hash);
      if (already) this.writeParam(id, 'replace', hashMode);
      else {
        // The address can already carry this param (a leftover entry). Replace it away
        // on the current entry, then push, so Back still closes onto this page. Both
        // writes share hashMode: stripping `?photo` from `#chapter?photo=1` leaves
        // `#chapter`, which would otherwise fall out of the hash.
        if (paramFromLocation(this.loc(), this.urlParam))
          this.writeParam(null, 'replace', hashMode);
        this.historyPushed = this.writeParam(id, 'push', hashMode);
      }
    }
    trackEvent(this, ['uvalib-lightbox', 'open', `image ${i + 1}`, i + 1]);
  }

  /** Restore a viewer the URL already points at. No analytics: it is not a new action. */
  private openFromUrl(): void {
    if (this.open || this.userClosed || !this.urlParam) return;
    const id = paramFromLocation(this.loc(), this.urlParam);
    if (!id) return;
    const slides = this.slides.length ? this.slides : this.collect();
    const i = slides.findIndex((s) => s.id === id);
    if (i < 0) return;
    this.slides = slides;
    this.index = i;
    this.trigger = slides[i]?.el ?? null;
    this.measure();
    // Make Back close the viewer onto this page instead of leaving it. Remember the hash
    // route before the first write removes the `?` that marked it.
    const hashMode = usesHashParam(location.hash);
    this.writeParam(null, 'replace', hashMode);
    this.historyPushed = this.writeParam(id, 'push', hashMode);
    this.open = true;
  }

  private step(delta: number): void {
    const n = this.slides.length;
    if (n < 2) return;
    const i = (this.index + delta + n) % n;
    this.index = i;
    this.trigger = this.slides[i]?.el ?? this.trigger;
    if (this.urlParam) this.writeParam(this.slides[i]?.id ?? null, 'replace');
    const action = delta < 0 ? 'previous' : 'next';
    trackEvent(this, ['uvalib-lightbox', action, `image ${i + 1}`, i + 1]);
  }

  /**
   * Close. `ui` is Close, Escape or the backdrop (Back when this viewer pushed, else drop the
   * param). `pop` is the browser already moving: the URL is already right. `empty` is the
   * last image leaving the page: drop the param and do not reopen from it.
   */
  private dismiss(source: 'ui' | 'pop' | 'empty'): void {
    if (this.dismissing) return;
    const dialog = this.dialogEl;
    if (!this.open && !dialog?.open) return;
    this.dismissing = true;
    try {
      const pushed = this.historyPushed;
      this.historyPushed = false;
      this.ignoreClose = true;
      this.cancelReveal();
      this.open = false;
      if (source === 'ui' || source === 'empty') this.userClosed = true;
      this.restoreDetails();
      if (dialog?.open) dialog.close();
      this.focusTrigger();
      if (source === 'ui' && this.urlParam) {
        if (pushed) {
          this.backInHash = usesHashParam(location.hash);
          this.pendingBack = true;
          history.back();
        } else this.writeParam(null, 'replace', usesHashParam(location.hash));
      } else if (source === 'empty' && this.urlParam) {
        this.pendingBack = false;
        this.queuedOpen = null;
        this.writeParam(null, 'replace', usesHashParam(location.hash));
      }
    } finally {
      // Leave `ignoreClose` set. `dialog.close()` can queue a second close event for the
      // next task; clearing the guard here lets that event dismiss a viewer that has
      // already been opened again. `reveal` clears it once `showModal` has succeeded, which
      // is still before a later Escape. A throw while restoring details must not leave the
      // viewer stuck dismissing.
      this.dismissing = false;
    }
  }

  /** Returns false when this document cannot change the address (for example an iframe srcdoc). */
  private writeParam(id: string | null, mode: 'push' | 'replace', hashMode?: boolean): boolean {
    if (!this.urlParam) return false;
    const next = hrefWithParam(this.loc(), this.urlParam, id, hashMode);
    const now = location.pathname + location.search + location.hash;
    if (next === now) return false;
    const prev = history.state && typeof history.state === 'object' ? history.state : {};
    try {
      history[mode === 'push' ? 'pushState' : 'replaceState'](
        { ...prev, uvalibLightbox: this.urlParam },
        '',
        next,
      );
      return true;
    } catch {
      // A sandboxed document (an iframe srcdoc) cannot take a history entry. The viewer
      // still opens; the address is left as it is.
      return false;
    }
  }

  private readonly onPop = (): void => {
    if (!this.urlParam) return;
    if (this.pendingBack) {
      this.pendingBack = false;
      const queued = this.queuedOpen;
      this.queuedOpen = null;
      if (!this.isConnected || !queued) return;
      this.slides = queued.slides;
      this.index = queued.i;
      this.trigger = queued.slides[queued.i]?.el ?? null;
      this.userClosed = false;
      this.measure();
      const id = queued.slides[queued.i]?.id ?? null;
      this.historyPushed = this.writeParam(id, 'push', this.backInHash);
      if (!this.open) this.open = true;
      return;
    }
    const id = paramFromLocation(this.loc(), this.urlParam);
    if (!id) {
      this.historyPushed = false;
      if (this.open) this.dismiss('pop');
      return;
    }
    this.userClosed = false;
    const slides = this.collect();
    const i = slides.findIndex((s) => s.id === id);
    if (i < 0) {
      if (this.open) this.dismiss('pop');
      return;
    }
    this.slides = slides;
    this.index = i;
    this.trigger = slides[i]?.el ?? null;
    this.historyPushed = true;
    this.measure();
    this.armReopenGuard();
    if (!this.open) this.open = true;
  };

  /** Ignore the close event a history traversal fires on the dialog it just opened. */
  private armReopenGuard(): void {
    this.reopenGuard = true;
    const view = this.ownerDocument.defaultView;
    if (!view) return;
    view.requestAnimationFrame(() => {
      this.reopenGuard = false;
    });
  }

  private readonly onKey = (e: KeyboardEvent): void => {
    if (!this.multiple || this.typing(e)) return;
    // Left is previous in LTR and next in RTL, so the key matches the direction of the set.
    const rtl = getComputedStyle(this).direction === 'rtl';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    if (e.key !== back && e.key !== forward) return;
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    this.step(e.key === forward ? 1 : -1);
  };

  private typing(e: KeyboardEvent): boolean {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return false;
    return t.isContentEditable || !!t.closest('input, textarea, select');
  }

  private readonly onDialogClick = (e: MouseEvent): void => {
    if (e.target === this.dialogEl) this.dismiss('ui');
  };

  /** The dialog element is stable across renders. Watch `open` on whichever node is current. */
  private bindDialogObserver(): void {
    const dialog = this.dialogEl;
    if (!dialog || dialog === this.observedDialog) return;
    this.dialogObserver?.disconnect();
    this.observedDialog = dialog;
    const observer = new MutationObserver(() => this.onNativeClose());
    observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    this.dialogObserver = observer;
  }

  private readonly onDialogClose = (): void => {
    this.onNativeClose();
  };

  /**
   * Escape, the backdrop's close, and a direct `dialog.close()` all clear `open`. The
   * event itself is a later task; the attribute change is observable on the microtask
   * that `await updateComplete` flushes. A close that leaves the dialog open (a queued
   * event after `showModal`, or a history traversal) is not the visitor dismissing it.
   */
  private onNativeClose(): void {
    if (this.ignoreClose || this.suppressClose || !this.open) return;
    if (this.dialogEl?.open) return;
    if (this.reopenGuard) {
      const view = this.ownerDocument.defaultView;
      view?.queueMicrotask(() => {
        if (this.open && this.isConnected && !this.dialogEl?.open) this.reveal();
      });
      return;
    }
    this.dismiss('ui');
  }

  private readonly onFullSize = (): void => {
    const i = this.index;
    trackEvent(this, ['uvalib-lightbox', 'full-size', `image ${i + 1}`, i + 1]);
  };

  private get dialogEl(): HTMLDialogElement | null {
    return this.renderRoot.querySelector('dialog');
  }

  private get closeBtn(): HTMLButtonElement | null {
    return this.renderRoot.querySelector('button.close');
  }

  private get detailsBox(): HTMLElement | null {
    return this.renderRoot.querySelector('.details');
  }

  private focusTrigger(): void {
    const trigger = this.trigger;
    if (trigger?.isConnected) trigger.focus();
  }

  /**
   * Open the dialog and focus Close. `showModal` can throw while a dialog is still leaving
   * the top layer (a reopen from Back/Forward, or the first paint), so try again on the next
   * frames. Those frames are queued before a test's own `nextFrame`.
   */
  /** History restore can drop the light-DOM mount or orphan a shadow root. Put it back. */
  private ensureRoot(): void {
    const root = this.renderRoot;
    if (!this.isConnected) return;
    if (root instanceof HTMLElement && !root.isConnected) this.append(root);
    if (root instanceof ShadowRoot && this.shadowRoot && root !== this.shadowRoot) {
      (this as unknown as { renderRoot: ShadowRoot }).renderRoot = this.shadowRoot;
      this.requestUpdate();
    }
  }

  private cancelReveal(): void {
    const view = this.ownerDocument.defaultView;
    if (this.revealFrame && view) view.cancelAnimationFrame(this.revealFrame);
    this.revealFrame = 0;
  }

  private reveal(): void {
    this.ensureRoot();
    const dialog = this.dialogEl;
    if (!this.open || !dialog) return;
    const again = () => {
      if (this.revealTries++ > 8) {
        this.ignoreClose = false;
        return;
      }
      const view = this.ownerDocument.defaultView;
      if (!view) return;
      this.revealFrame = view.requestAnimationFrame(() => {
        this.revealFrame = 0;
        if (this.open) this.reveal();
      });
    };
    if (!dialog.isConnected) {
      again();
      return;
    }
    if (!dialog.open) {
      try {
        dialog.showModal();
      } catch {
        again();
        return;
      }
    }
    this.revealTries = 0;
    this.cancelReveal();
    // A close event already queued by the dialog we shut must not dismiss this open.
    // Clearing the guard here is synchronous, so Escape after this update still closes.
    this.ignoreClose = false;
    // A later reveal (a retry, or the history traversal showing the dialog again) must
    // not pull focus back to Close after the visitor has moved it inside the dialog.
    const active = this.shadowRoot?.activeElement ?? this.ownerDocument.activeElement;
    if (!active || !dialog.contains(active)) this.closeBtn?.focus();
  }

  /** A cached image may already be complete before the load listener runs. */
  private settleImage(): void {
    const img = this.renderRoot.querySelector('img');
    if (!img || this.status !== 'loading') return;
    if (img.complete && img.naturalWidth > 0) this.status = 'ready';
    else if (img.complete && img.getAttribute('src') && img.naturalWidth === 0)
      this.status = 'error';
  }

  private readonly onLoad = (): void => {
    if (this.status === 'loading') this.status = 'ready';
  };

  private readonly onError = (): void => {
    this.status = 'error';
  };

  /** Stable identity for a details element, so parking it does not look like a new one. */
  private detailTokens = new WeakMap<HTMLElement, number>();
  private detailTokenSeq = 0;
  private detailToken(el: HTMLElement): string {
    let n = this.detailTokens.get(el);
    if (n === undefined) this.detailTokens.set(el, (n = ++this.detailTokenSeq));
    return String(n);
  }

  /**
   * Details for the open image: `slot="details"` children (honouring `data-for`) and the
   * element named by `data-details-id`. Elements already parked in the dialog stay in the
   * set, so this does not move them again.
   */
  private matchingDetails(): HTMLElement[] {
    const slide = this.current;
    const id = slide?.id ?? '';
    const position = String(this.index + 1);
    const pool: HTMLElement[] = [];
    const add = (el: HTMLElement | null) => {
      if (el && el !== this && !pool.includes(el)) pool.push(el);
    };
    for (const el of this.querySelectorAll(':scope > [slot="details"]')) {
      if (el instanceof HTMLElement) add(el);
    }
    for (const item of this.parked) add(item.el);
    if (slide?.detailsId) add(this.scope.getElementById(slide.detailsId));
    return pool.filter((el) => {
      if (el.getAttribute('slot') === 'details') {
        const f = el.getAttribute('data-for');
        return !f || f === id || f === position;
      }
      return !!slide?.detailsId && el.id === slide.detailsId;
    });
  }

  private placeDetails(): void {
    const want = this.matchingDetails();
    const key = `${want.map((el) => this.detailToken(el)).join('|')}@${this.index}`;
    if (key === this.parkedKey) return;
    const keep = new Set(want);
    const still: typeof this.parked = [];
    for (const item of this.parked) {
      if (keep.has(item.el) && this.detailsBox?.contains(item.el)) still.push(item);
      else this.putBack(item);
    }
    this.parked = still;
    const box = this.detailsBox;
    if (box) {
      for (const el of want) {
        if (box.contains(el)) continue;
        const parent = el.parentNode;
        if (!parent) continue;
        this.parked.push({ el, parent, next: el.nextSibling, hidden: el.hidden });
        el.hidden = false;
        box.append(el);
      }
    }
    this.parkedKey = key;
  }

  /**
   * Put a parked element back. Restoring later siblings first keeps `next` inside `parent`;
   * if it is not (it was parked too), insert at the end instead of throwing NotFoundError.
   */
  private putBack(item: (typeof this.parked)[number]): void {
    item.el.hidden = item.hidden;
    const next = item.next?.parentNode === item.parent ? item.next : null;
    item.parent.insertBefore(item.el, next);
  }

  private restoreDetails(): void {
    for (let i = this.parked.length - 1; i >= 0; i--) this.putBack(this.parked[i]!);
    this.parked = [];
    this.parkedKey = '';
  }

  private get statusText(): string {
    if (!this.open) return '';
    if (this.status === 'loading') return 'Loading image.';
    if (this.status === 'error') return 'This image could not be loaded.';
    return '';
  }

  protected override render() {
    const slide = this.open ? this.current : undefined;
    const src = slide ? this.displaySrc : '';
    const full = slide && usableImageUrl(slide.href, this.base) ? slide.href : '';
    const shown = this.statusText;
    const counter = this.multiple
      ? html`<p class="count" aria-live="polite">${this.index + 1} of ${this.slides.length}</p>`
      : nothing;
    // Shadow mode needs a slot or the author's links are not rendered and cannot take focus.
    // Light mode renders into `.viewer`; a `<slot>` there would not show the siblings.
    return html`
      ${this.isLight ? nothing : html`<slot></slot><slot name="details" hidden></slot>`}
      <dialog
        part="dialog"
        aria-labelledby=${this.captionId}
        @click=${this.onDialogClick}
        @close=${this.onDialogClose}
        @keydown=${this.onKey}
      >
        <div class="panel" part="panel">
          <div class="head">
            <p class="caption" part="caption" id=${this.captionId}>${slide?.caption ?? 'Image'}</p>
            <button type="button" class="close" autofocus @click=${() => this.dismiss('ui')}>
              Close
            </button>
          </div>
          <figure class="figure">
            ${
              src
                ? html`<img
                    part="image"
                    alt=${slide?.alt ?? ''}
                    src=${src}
                    aria-busy=${this.status === 'loading' ? 'true' : 'false'}
                    @load=${this.onLoad}
                    @error=${this.onError}
                  />`
                : nothing
            }
          </figure>
          <p class="status ${shown ? '' : 'visually-hidden'}" role="status">${shown}</p>
          <div class="toolbar" part="controls">
            ${
              this.multiple
                ? html`<button type="button" class="prev" @click=${() => this.step(-1)}>
                      Previous
                    </button>
                    <button type="button" class="next" @click=${() => this.step(1)}>Next</button>
                    ${counter}`
                : nothing
            }
            ${
              full
                ? html`<a
                    class="full"
                    href=${full}
                    target="_blank"
                    rel="noopener noreferrer"
                    @click=${this.onFullSize}
                    >Full size<span class="visually-hidden"> (opens in a new tab)</span></a
                  >`
                : nothing
            }
          </div>
          <div class="details" part="details"></div>
        </div>
      </dialog>
    `;
  }
}
