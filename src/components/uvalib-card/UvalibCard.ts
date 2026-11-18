import { css, html, nothing, unsafeCSS } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { property } from 'lit/decorators.js';
import { precedingHeadingLevel } from '../../base/heading-level.js';
import { trackEvent } from '../../base/analytics.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { accessible } from '../../styles/accessible.js';

const DEFAULT_LEVEL = 3;

/** Schemes a card may link to; anything else (`javascript:`, `data:`, …) is not a link. */
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * Kept with `no-style`: the card is a column that fills its grid cell, the heading link's
 * box stretches over the card (the link itself is not positioned), empty regions stay
 * hidden, and `[hidden]` hides. `host` is `:host` (shadow) or the tag (light DOM).
 */
/** `:host(:dir(rtl))` in shadow, `uvalib-card:dir(rtl)` in a document sheet. */
const hostFn = (host: string, pseudo: string) =>
  host === ':host' ? `:host(${pseudo})` : `${host}${pseudo}`;

const structuralRules = (host: string) => `
  ${host} {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
    max-width: 100%;
  }
  ${host} .card {
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-width: 0;
    min-height: 100%;
    overflow: hidden;
  }
  ${host} .title { margin: 0; }
  ${host} .title-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    min-height: 1.5rem;
    text-decoration: none;
  }
  ${host} .title-link::after { content: ""; position: absolute; inset: 0; z-index: 1; }
  ${host} .title-text { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
  ${host} .arrow { flex: none; }
  ${hostFn(host, ':dir(rtl)')} .arrow,
  ${hostFn(host, '[dir="rtl"]')} .arrow { transform: scaleX(-1); }
  ${host} .body { display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; }
  ${host} .excerpt { margin: 0; overflow-wrap: anywhere; }
  ${host} .media { position: relative; }
  ${host} .media img, ${host} .media video {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 3 / 2;
    object-fit: cover;
  }
  ${host} .badge { position: absolute; z-index: 0; }
  ${host} .card-source { display: none !important; }
  ${host}[hidden], ${host} [hidden] { display: none !important; }
`;
const shadowStructure = unsafeCSS(structuralRules(':host'));

/**
 * Light DOM only, unlayered. The Drupal theme gives `h3` a large top margin; this keeps the
 * card title flush whatever `heading-level` is. Unlayered, and more specific than a bare
 * `h3`, so it beats the page's heading rules. `::slotted` is not used here: it is invalid
 * in a document sheet and would drop the rule.
 */
const lightTitleMargin = (tag: string) => unsafeCSS(`${tag} .title { margin-block: 0; }`);

const CONTENT: MutationObserverInit = {
  attributeFilter: ['slot'],
  attributes: true,
  childList: true,
  subtree: true,
};

const arrow = html`<svg
  class="arrow"
  viewBox="0 0 20 20"
  width="1em"
  height="1em"
  aria-hidden="true"
  focusable="false"
>
  <path
    d="M4 10h12M12 6l4 4-4 4"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
  ></path>
</svg>`;

/**
 * One card: a collection (title and “N texts”), a photo (image, count, date, category,
 * title, excerpt) or any other raised summary. With `href`, the heading is the link and a
 * pseudo-element stretches that link over the card, so the whole card is one click. The
 * arrow is only a visual aid. The card is never wrapped in an `<a>`.
 *
 * A clickable card must not contain any other link or button: the stretched link covers
 * them, and a link inside a link is invalid. A static card (no `href`, or an empty or
 * unsafe one) has no stretch, so its excerpt may contain links.
 *
 * Regions are light-DOM children. Give `slot="media"`, `slot="badge"`, `slot="heading"`,
 * `slot="meta"` or `slot="chip"`; anything else (including text) is the excerpt. An image
 * needs a real alt, or `alt=""` when the heading already names it. A date belongs in
 * `<time>` in the meta slot. One element per chip.
 *
 * The heading level defaults like `<events-section>`: one below the nearest heading before
 * the card, or 3 when there is none. `heading-level` (1–6) wins. An invalid value is
 * ignored.
 *
 * @tagname uvalib-card
 * @slot media - Image or other media. An `<img>` needs a real alt, or `alt=""` when the heading names it.
 * @slot badge - Short label drawn over the media, such as “13 photos”.
 * @slot heading - The card title. With `href`, this heading’s link is the card.
 * @slot meta - Date (`<time>`) or byline, under the title.
 * @slot chip - Category. One element per chip.
 * @slot - Excerpt. A static card may put links here; a clickable card must not.
 * @fires uvalib-analytics-event - For `<site-analytics>`: a click on the card link, `['uvalib-card', 'card-click', 'single']` or, inside `<uvalib-card-grid>`, `['uvalib-card', 'card-click', '<n>', <n>]` (n from 1, the card’s place in that grid). Never the title or URL. Bubbles and is composed.
 * @fires uvalib-card-navigate - A plain click on the card link: `detail` is `{ href, position }` (`position` is `'single'` or `'1'`, `'2'`, …). Cancel it (`preventDefault()`) to route in the app; the click’s default is then prevented. Bubbles and is composed.
 * @cssprop [--uva-brand-blue=#232d4b] - Badge background, and the title link when `--uva-color-link` is unset.
 * @cssprop [--uva-blue-alt-300=#BFE7F7] - Chip background. With `--uva-blue-alt-dark` this pair is 6.13:1 (WCAG AA for normal text, short of AAA’s 7:1).
 * @cssprop [--uva-blue-alt-dark=#005679] - Chip text.
 * @cssprop [--uva-grey-100=#DADADA] - Hover shadow colour.
 * @cssprop --uva-color-surface-raised - Dark-mode role token: card background (else #fff).
 * @cssprop --uva-color-border - Dark-mode role token: card border (else `--uva-grey-100`).
 * @cssprop --uva-color-text - Dark-mode role token: body text (else `--uva-grey-darkest`).
 * @cssprop --uva-color-text-muted - Dark-mode role token: meta line (else #4f4f4f).
 * @cssprop --uva-color-link - Dark-mode role token: title link (else `--uva-brand-blue`).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring on the card (else `--uva-brand-orange`).
 */
export class UvalibCard extends UvalibElement {
  static styles = [
    accessible,
    shadowStructure,
    css`
      :host {
        color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
      }
      .card {
        background: var(--uva-color-surface-raised, #fff);
        border: 1px solid var(--uva-color-border, var(--uva-grey-100, #dadada));
        border-radius: 0.3rem;
        transition: box-shadow 0.25s ease;
      }
      :host(:hover) .card,
      :host(:focus-within) .card {
        box-shadow: 0 0 20px 0 var(--uva-grey-100, #dadada);
      }
      /* The ring is on the card, not the heading link. :has() on .card sees the link
         in this tree; :host(:has()) would look outside the shadow root and miss it. */
      .card:has(.title-link:focus-visible) {
        outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
        outline-offset: 2px;
      }
      .title-link:focus-visible {
        outline: none;
      }
      .body {
        padding: 1rem 1.25rem;
        flex: 1 1 auto;
      }
      .title {
        font-size: 1.25rem;
        line-height: 1.3;
        font-weight: 600;
      }
      .title-link {
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
        font: inherit;
        font-weight: inherit;
      }
      .title-link:hover .title-text {
        text-decoration: underline;
      }
      .meta {
        color: var(--uva-color-text-muted, #4f4f4f);
        font-size: 0.875rem;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.375rem;
      }
      .badge {
        inset-block-start: 0.5rem;
        inset-inline-start: 0.5rem;
        max-width: calc(100% - 1rem);
        padding: 0.15rem 0.5rem;
        border-radius: 0.25rem;
        background: var(--uva-brand-blue, #232d4b);
        color: #fff;
        font-size: 0.875rem;
        line-height: 1.4;
      }
      .media:has([data-region='badge']:not([hidden])) {
        min-height: 2.5rem;
      }
      @media (prefers-reduced-motion: reduce) {
        .card {
          transition: none;
        }
      }
      @media (forced-colors: active) {
        .card {
          background: Canvas;
          border-color: CanvasText;
          box-shadow: none;
        }
        :host(:hover) .card,
        :host(:focus-within) .card {
          box-shadow: none;
        }
        .card:has(.title-link:focus-visible) {
          outline-color: Highlight;
        }
        .badge {
          background: CanvasText;
          color: Canvas;
        }
      }
    `,
    // ::slotted is its own rule. Combining it with a light-DOM selector drops both in
    // engines that reject the whole rule when one selector is invalid.
    css`
      ::slotted(img),
      ::slotted(video) {
        display: block;
        width: 100%;
        height: auto;
        aspect-ratio: 3 / 2;
        object-fit: cover;
      }
      ::slotted([slot='chip']) {
        background: var(--uva-blue-alt-300, #bfe7f7);
        color: var(--uva-blue-alt-dark, #005679);
        border-radius: 999px;
        padding: 0.1rem 0.6rem;
        font-size: 0.875rem;
        line-height: 1.4;
      }
    `,
    css`
      [data-region='chip'] > * {
        background: var(--uva-blue-alt-300, #bfe7f7);
        color: var(--uva-blue-alt-dark, #005679);
        border-radius: 999px;
        padding: 0.1rem 0.6rem;
        font-size: 0.875rem;
        line-height: 1.4;
      }
    `,
  ];

  /** Makes the card one link: the heading stretches over the card. Empty is not a link. */
  @property({ type: String }) href?: string;

  /**
   * Heading level of the title, 1–6. Unset, it is one below the nearest heading before
   * this card, or 3 when there is none. Any other value is ignored.
   */
  @property({ type: Number, attribute: 'heading-level' }) headingLevel?: number;

  /** One below the nearest preceding heading. A field, so the first render can use it. */
  private inferred = DEFAULT_LEVEL;
  private warnedHref = false;
  private warnedNested = false;
  private observer?: MutationObserver;
  /** Author nodes captured before the first light-DOM render. */
  private saved: Node[] = [];
  /** Set once the author's children have been lifted off the host, including a reconnect before the first render. */
  private captured = false;
  /** Light DOM nodes this element rendered (Lit markers and the card), never author content. */
  private own = new WeakSet<Node>();
  private placing = false;

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    const root = super.createRenderRoot();
    if (root instanceof ShadowRoot && this.noStyle) {
      const sheet = shadowStructure.styleSheet;
      if (sheet) root.adoptedStyleSheets = [sheet];
    }
    return root;
  }

  override connectedCallback(): void {
    const light = this.hasAttribute('no-shadow-dom') || this.noShadowDom;
    // Before super: the first update is a microtask, and a light-DOM render would drop
    // the author's children. On reconnect they are already parked in the card.
    // A grid may move the card (disconnect and reconnect) before the first render.
    // Capturing again would replace `saved` with an empty child list and drop the content.
    if (light && !this.hasUpdated && !this.captured) {
      this.captured = true;
      this.saved = [...this.childNodes];
      for (const n of this.saved) n.parentNode?.removeChild(n);
    }
    this.infer();
    super.connectedCallback();
    if (this.lightDom) {
      const node = this.getRootNode();
      const root = node instanceof ShadowRoot || node instanceof Document ? node : undefined;
      if (this.noStyle)
        installLightDomStyles(
          `${this.localName}::structure`,
          unsafeCSS(structuralRules(this.localName)),
          { root, scope: false },
        );
      installLightDomStyles(`${this.localName}::title-margin`, lightTitleMargin(this.localName), {
        root,
        scope: false,
        layer: false,
      });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.observer?.disconnect();
    // A grid assigns slot="card-N". Left on the card, that name hides it inside
    // <site-page>, whose default slot only shows unslotted children.
    if (this.hasAttribute('data-grid-slot')) {
      this.removeAttribute('slot');
      this.removeAttribute('data-grid-slot');
    }
  }

  private get level(): number {
    const n = Math.trunc(this.headingLevel ?? Number.NaN);
    return n >= 1 && n <= 6 ? n : this.inferred;
  }

  /** The href when it may be a link; null when absent, blank or an unsafe scheme. */
  private get linkHref(): string | null {
    const raw = this.href ?? '';
    if (!raw.trim()) return null;
    return this.safe(raw.trim()) ? raw.trim() : null;
  }

  private infer(): void {
    if (!this.isConnected) return;
    const above = precedingHeadingLevel(this);
    const next = above === null ? DEFAULT_LEVEL : Math.min(above + 1, 6);
    this.inferred = next;
  }

  private safe(href: string): boolean {
    let ok = false;
    try {
      ok = SAFE_SCHEMES.has(new URL(href, this.ownerDocument.baseURI).protocol);
    } catch {
      ok = false;
    }
    if (!ok && !this.warnedHref) {
      this.warnedHref = true;
      console.warn(
        `${this.localName}: not linking a card whose href is not http(s), mailto, tel or relative.`,
      );
    }
    return ok;
  }

  /** A named shadow slot, or nothing in light DOM (the regions are filled by moving nodes). */
  private renderSlot(name?: string) {
    if (this.lightDom) return nothing;
    return name
      ? html`<slot name=${name} @slotchange=${this.onSlotChange}></slot>`
      : html`<slot @slotchange=${this.onSlotChange}></slot>`;
  }

  private onSlotChange = (): void => {
    this.syncHidden();
    this.warnNested();
  };

  /** Place among the cards of the nearest grid, from 1, or `'single'` when there is none. */
  private position(): { name: string; value?: number } {
    const grid = this.closest('uvalib-card-grid');
    if (!grid) return { name: 'single' };
    const direct = [...grid.querySelectorAll(':scope > uvalib-card')];
    const cards = direct.length
      ? direct
      : [...grid.querySelectorAll(':scope > ul > li > uvalib-card')];
    const index = cards.indexOf(this);
    if (index < 0) return { name: 'single' };
    return { name: String(index + 1), value: index + 1 };
  }

  /**
   * A plain click on the card link fires a cancelable `uvalib-card-navigate`. Tracking
   * happens first, including modified clicks (which do not fire the navigate event).
   */
  private onClick(e: MouseEvent): void {
    const node = e.target instanceof Node ? e.target : null;
    const el = node instanceof Element ? node : node?.parentElement;
    const a = el?.closest('a.title-link');
    if (!a || !this.renderRoot.contains(a)) return;
    const pos = this.position();
    trackEvent(
      this,
      pos.value === undefined
        ? ['uvalib-card', 'card-click', pos.name]
        : ['uvalib-card', 'card-click', pos.name, pos.value],
    );
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    const go = new CustomEvent('uvalib-card-navigate', {
      detail: { href: a.getAttribute('href'), position: pos.name },
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    if (!this.dispatchEvent(go)) e.preventDefault();
  }

  private sourceEl(): HTMLElement | null {
    return this.renderRoot.querySelector('.card-source');
  }

  private regions(): HTMLElement[] {
    return [...this.renderRoot.querySelectorAll<HTMLElement>('[data-region]')];
  }

  /** Move light-DOM region children back to the source before Lit may recreate the heading. */
  private reclaim(): void {
    const source = this.sourceEl();
    if (!source) return;
    for (const region of this.regions()) {
      while (region.firstChild) source.appendChild(region.firstChild);
    }
  }

  /** Author nodes appended to the host later, not the nodes this element rendered. */
  private ingest(): void {
    const source = this.sourceEl();
    if (!source) return;
    const incoming = [...this.childNodes].filter((n) => !this.own.has(n) && n !== source);
    if (incoming.length) source.append(...incoming);
  }

  private hasContent(n: Node): boolean {
    if (n.nodeType === Node.TEXT_NODE) return !!n.textContent?.trim();
    if (n instanceof Element) {
      if (n.matches('img, svg, picture, video')) return true;
      return !!n.textContent?.trim() || !!n.querySelector('img, svg, picture, video');
    }
    return false;
  }

  private isEmpty(region: Element | null): boolean {
    if (!region) return true;
    if (!this.lightDom) {
      const slot = region.querySelector('slot');
      const nodes = slot ? slot.assignedNodes({ flatten: true }) : [...region.childNodes];
      return !nodes.some((n) => this.hasContent(n));
    }
    return ![...region.childNodes].some((n) => this.hasContent(n));
  }

  /** Put each author node in the region its slot names; the rest is the excerpt. */
  private distribute(): void {
    const source = this.sourceEl();
    if (!source) return;
    const byName = new Map<string, HTMLElement>();
    for (const region of this.regions()) {
      const name = region.dataset.region;
      if (name) byName.set(name, region);
    }
    const excerpt = byName.get('excerpt');
    for (const n of [...source.childNodes]) {
      if (n.nodeType === Node.COMMENT_NODE) continue;
      if (n.nodeType === Node.TEXT_NODE && !n.textContent?.trim()) continue;
      const slot = n instanceof Element ? n.getAttribute('slot') : null;
      const dest = (slot && byName.get(slot)) || excerpt;
      if (dest) dest.appendChild(n);
    }
  }

  private syncHidden(): void {
    const root = this.renderRoot;
    for (const region of this.regions()) {
      const empty = this.isEmpty(region);
      region.toggleAttribute('hidden', empty);
      if (region.dataset.region === 'heading')
        region.closest('.title')?.toggleAttribute('hidden', empty);
    }
    const media = root.querySelector('.media');
    if (media instanceof HTMLElement) {
      const empty =
        this.isEmpty(root.querySelector('[data-region="media"]')) &&
        this.isEmpty(root.querySelector('[data-region="badge"]'));
      media.toggleAttribute('hidden', empty);
    }
  }

  private warnNested(): void {
    if (!this.linkHref || this.warnedNested) return;
    const nested = [...this.querySelectorAll('a[href], button')].filter(
      (n) => !n.classList.contains('title-link'),
    );
    if (!nested.length) return;
    this.warnedNested = true;
    console.warn(
      `${this.localName}: a clickable card (one with href) must not contain other links or buttons; the card link covers them.`,
    );
  }

  private arm(): void {
    if (!this.lightDom) return;
    this.observer ??= new MutationObserver(() => this.onAuthorChange());
    const source = this.sourceEl();
    const card = this.renderRoot.querySelector('.card');
    if (source) this.observer.observe(source, CONTENT);
    if (card) this.observer.observe(card, CONTENT);
    this.observer.observe(this, { childList: true });
  }

  private onAuthorChange(): void {
    if (this.placing || !this.lightDom) return;
    this.placing = true;
    this.observer?.disconnect();
    try {
      this.ingest();
      this.reclaim();
      this.distribute();
      this.syncHidden();
      this.warnNested();
    } finally {
      this.placing = false;
      this.arm();
    }
  }

  protected override willUpdate(): void {
    this.infer();
    if (this.lightDom && this.hasUpdated && !this.placing) {
      this.observer?.disconnect();
      this.reclaim();
    }
  }

  protected override firstUpdated(): void {
    if (this.lightDom) for (const n of this.childNodes) this.own.add(n);
  }

  protected override updated(): void {
    if (!this.lightDom) {
      this.syncHidden();
      this.warnNested();
      return;
    }
    if (this.placing) return;
    this.placing = true;
    this.observer?.disconnect();
    try {
      const source = this.sourceEl();
      if (source && this.saved.length) {
        source.append(...this.saved);
        this.saved = [];
      }
      this.ingest();
      this.distribute();
      this.syncHidden();
      this.warnNested();
    } finally {
      this.placing = false;
      this.arm();
    }
  }

  private headingEl(inner: unknown) {
    const tag = unsafeStatic(`h${this.level}`);
    const href = this.linkHref;
    if (href)
      return staticHtml`<${tag} class="title"><a class="title-link" href=${href}>${inner}${arrow}</a></${tag}>`;
    return staticHtml`<${tag} class="title">${inner}</${tag}>`;
  }

  protected override render() {
    const heading = html`<span class="title-text" data-region="heading"
      >${this.renderSlot('heading')}</span
    >`;
    return html`${this.lightDom ? html`<div class="card-source" hidden></div>` : nothing}
      <div class="card" @click=${this.onClick}>
        <div class="media">
          <div data-region="media">${this.renderSlot('media')}</div>
          <div class="badge" data-region="badge">${this.renderSlot('badge')}</div>
        </div>
        <div class="body">
          ${this.headingEl(heading)}
          <div class="meta" data-region="meta">${this.renderSlot('meta')}</div>
          <div class="chips" data-region="chip">${this.renderSlot('chip')}</div>
          <div class="excerpt" data-region="excerpt">${this.renderSlot()}</div>
        </div>
      </div>`;
  }
}
