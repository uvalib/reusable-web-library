import { css, html, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { trackEvent } from '../../base/analytics.js';
import { precedingHeadingLevel } from '../../base/heading-level.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { normalize, safeHref } from '../../base/source-children.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { accessible } from '../../styles/accessible.js';
import { parseXywh, toPercent, toRegion, type ImageRegion, type RegionBox } from './regions.js';

export type { ImageRegion } from './regions.js';

/** One region as drawn: what events carry, its box, its number and its list entry. */
interface Entry {
  item: ImageRegion;
  box: RegionBox | null;
  number: number;
  /** The author's list item (children mode); own items are found by index. */
  el: HTMLElement | null;
}

const DEFAULT_LABEL = 'Regions';
let nextId = 0;

/** Controls inside a list item, which are actions and not part of the region's name. */
const NOT_LABEL = 'button, input, select, textarea, ol, ul, [hidden], [aria-hidden="true"]';

/**
 * Kept with `no-style`: the layout (the image at its own width, at most the element's, and
 * the list beside it when at least 14rem is left, else under it: the same wrapping flex row
 * base.css gives the children before the element upgrades, so nothing moves), the overlay
 * over the image, and the double outlines and number badges (without them the regions are
 * not visible). `host` is `:host` (shadow) or the tag (light DOM).
 */
const structuralRules = (host: string) => `
  ${host} { display: block; }
  ${host} .layout {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-start;
  }
  ${host} .media {
    position: relative;
    flex: 0 1 auto;
    width: fit-content;
    min-width: 0;
    max-width: 100%;
    margin: 0;
  }
  ${host} .list { flex: 1 1 14rem; min-width: 0; }
  ${host} .media img, ${host} .img-host > picture${
    host === ':host' ? ', ::slotted(img), ::slotted(picture)' : ''
  } { display: block; max-width: 100%; height: auto; }
  ${host} .overlay {
    position: absolute;
    inset: 0;
    overflow: clip;
    overflow-clip-margin: 0.5rem;
    pointer-events: none;
    forced-color-adjust: none;
  }
  ${host} .region {
    position: absolute;
    box-sizing: border-box;
    border: 2px solid #fff;
    outline: 2px solid #000;
    pointer-events: auto;
    cursor: pointer;
  }
  ${host} .region.active { z-index: 1; border-width: 4px; outline-width: 4px; }
  ${host} .overlay.has-active .region:not(.active) { opacity: 0.6; }
  ${host} .badge {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    display: flex;
    gap: 0.375em;
    max-width: 16rem;
    padding: 0.0625rem 0.375rem;
    background: #000;
    color: #fff;
    font-size: 0.875rem;
    font-weight: 700;
    line-height: 1.25;
    white-space: nowrap;
  }
  ${host} .badge .name { overflow: hidden; text-overflow: ellipsis; }
  ${host} .region:not(.active) .badge .name, ${host} .badge:empty { display: none; }
  ${host} .region:not(.active) .badge.no-number { display: none; }
  ${host} .heading { margin: 0 0 0.5rem; }
  ${host} .items { margin: 0; }
  @media (forced-colors: active) {
    ${host} .region { border-color: Canvas; outline-color: CanvasText; }
    ${host} .region.active { outline-color: Highlight; }
    ${host} .badge { background: CanvasText; color: Canvas; }
    ${host} .region.active .badge { background: Highlight; color: HighlightText; }
  }
  ${host}[hidden], ${host} [hidden] { display: none !important; }
`;
const shadowStructure = unsafeCSS(structuralRules(':host'));

/**
 * A region's list entry: room for the highlight bar, and the bar (with a tint) while its
 * region is highlighted, so it is shown by more than colour. Shadow mode also installs
 * these in the page, scoped to the tag, for the author's own list items.
 */
const entryRules = (p: string) => `
  ${p}[data-uvalib-region] {
    box-sizing: border-box;
    padding-block: 0.5rem;
    padding-inline: calc(0.5rem + 0.375rem) 0.5rem;
    overflow-wrap: anywhere;
  }
  ${p}[data-uvalib-region][data-uvalib-active] {
    padding-inline-start: 0.5rem;
    border-inline-start: 0.375rem solid currentColor;
    background: var(--uva-color-surface-hover, #f1f1f1);
  }
  ${p}[data-uvalib-region]:focus-visible {
    outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
    outline-offset: 2px;
  }
  ${p}[data-uvalib-region][tabindex='-1']:focus:not(:focus-visible) { outline: none; }
  @media (forced-colors: active) {
    ${p}[data-uvalib-region][data-uvalib-active] { border-inline-start-color: Highlight; }
  }
`;
const entryStyles = unsafeCSS(entryRules(''));

/**
 * An image with numbered region outlines (people, objects, inscriptions) and a list of the
 * same regions beside it (under it on a narrow screen). The list is the way in: the
 * outlines are a visual aid, hidden from assistive technology and not in the tab order, so
 * no region is a second tab stop. Hovering or focusing a list entry (or anything in it)
 * highlights its region with a thicker double outline and its label, and dims the others;
 * hovering a region highlights its entry. Clicking a region moves focus to its entry.
 *
 * The image: an `<img>` (or `<picture>`) child, which keeps its `alt`, or `src` and `alt`.
 * Give it `width` and `height` so its space is reserved before it loads.
 *
 * The regions: an `<ol>` child whose `<li>` items carry `data-xywh` (IIIF / Media Fragments:
 * `percent:10,20,30,40`, or pixels `160,120,320,240` of the image's natural size). The list
 * is shown as written, so it works before the component loads or without JavaScript, and
 * any links and buttons in it stay the page's own (their events are the page's). Or set
 * the `items` property, and the component draws the list. Region numbers are the list's
 * numbers, from 1 (or the `<ol>`'s `start`).
 *
 * @tagname uvalib-image-regions
 * @slot - The region list (`<ol>` with `<li data-xywh>`), shown as written. Not used with `items`.
 * @slot image - The image. A first `<img>` or `<picture>` child is put here by itself.
 * @csspart layout - The grid holding the image and the list.
 * @csspart media - The image and its overlay.
 * @csspart overlay - The outlines over the image (`aria-hidden`).
 * @csspart region - One outline.
 * @csspart list - The heading and the list.
 * @fires highlight - The highlighted region changed by hover or focus: `detail` is `{ item, index }` (`item` null and `index` -1 when none is). Bubbles and is composed.
 * @fires select - A region's outline was clicked (focus moved to its list entry): `detail` is `{ item, index }`. Bubbles and is composed.
 * @fires uvalib-analytics-event - For `<site-analytics>`: `['uvalib-image-regions', 'select', '<label>', <number>]` when an outline is clicked (the list's `label`, and the region's number from 1). Never a region's label (it may be a person's name). Nothing on hover or focus. Bubbles and is composed.
 * @cssprop --uva-color-text - Dark-mode role token: text (else `--uva-grey-darkest`).
 * @cssprop --uva-color-surface-hover - Dark-mode role token: the highlighted entry's tint (else #f1f1f1).
 * @cssprop --uva-color-link - Dark-mode role token: entry links (else `--uva-brand-blue`).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 * @cssprop --uva-color-text-muted - Dark-mode role token: descriptions (else #4b5563).
 */
export class UvalibImageRegions extends UvalibElement {
  static styles = [
    accessible,
    shadowStructure,
    entryStyles,
    css`
      .list {
        color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
      }
      .heading {
        font-size: 1.125rem;
        font-weight: 700;
        line-height: 1.3;
      }
      .items {
        padding-inline-start: 1.75rem;
      }
      .items a {
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
      }
      .description {
        display: block;
        color: var(--uva-color-text-muted, #4b5563);
        font-size: 0.9375rem;
      }
      @media (prefers-reduced-motion: no-preference) {
        .region {
          transition: opacity 0.15s ease;
        }
      }
    `,
  ];

  /** The regions, when the component draws the list. Overrides the child list. */
  @property({ attribute: false }) items: ImageRegion[] | null = null;

  /** Image URL, when there is no `<img>` child. */
  @property({ type: String }) src = '';
  /** The image's alternative text (with `src`). */
  @property({ type: String }) alt = '';
  /** The image's width (with `src`), reserving its space. */
  @property({ type: Number }) width?: number;
  /** The image's height (with `src`). */
  @property({ type: Number }) height?: number;

  /**
   * The size pixel regions are measured in, when it is not the image's natural size (for
   * example a IIIF derivative of a larger original: the original's width and height).
   */
  @property({ type: Number, attribute: 'image-width' }) imageWidth?: number;
  /** The height pixel regions are measured in (with `image-width`). */
  @property({ type: Number, attribute: 'image-height' }) imageHeight?: number;

  /** The list's heading, and the analytics name. */
  @property({ type: String }) label = 'Regions';

  /** The heading's level (2 to 6). Default: one below the heading before the element. */
  @property({ type: Number, attribute: 'heading-level' }) headingLevel?: number;

  /** `numbers` (default) shows each region's number on its outline; `none` hides them. */
  @property({ type: String }) numbering: 'numbers' | 'none' = 'numbers';

  /** Hide the outlines (the list stays). */
  @property({ type: Boolean, reflect: true, attribute: 'hide-outlines' }) hideOutlines = false;

  @state() private entries: Entry[] = [];
  @state() private natural: { w: number; h: number } | null = null;
  @state() private active = -1;
  @state() private inferredLevel = 2;

  private hover = -1;
  private focused = -1;
  private readonly headingId = `uvalib-image-regions-heading-${++nextId}`;
  private observer?: MutationObserver;
  private watchedImg: HTMLImageElement | null = null;
  private key = '';

  constructor() {
    super();
    this.addEventListener('pointerover', this.onPointerOver);
    this.addEventListener('pointerleave', this.onPointerLeave);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
    this.addEventListener('click', this.onClick);
  }

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    const root = super.createRenderRoot();
    if (this.noStyle && root instanceof ShadowRoot && shadowStructure.styleSheet)
      root.adoptedStyleSheets = [shadowStructure.styleSheet];
    return root;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    const node = this.getRootNode();
    const root = node instanceof Document || node instanceof ShadowRoot ? node : undefined;
    if (this.lightDom && this.noStyle) {
      installLightDomStyles(
        `${this.localName}::structure`,
        unsafeCSS(structuralRules(this.localName)),
        { root, scope: false },
      );
    } else if (!this.lightDom && !this.noStyle) {
      // The author's list items are page content: their highlight is styled in the page.
      installLightDomStyles(
        `${this.localName}::entries`,
        unsafeCSS(entryRules(`${this.localName} `)),
        { root, scope: false },
      );
    }
    const above = precedingHeadingLevel(this);
    this.inferredLevel = above === null ? 2 : Math.min(Math.max(above + 1, 2), 6);
    this.sync();
    this.observer ??= new MutationObserver(() => this.sync());
    this.observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-xywh', 'data-label', 'data-id', 'href', 'start', 'src', 'srcset'],
      characterData: true,
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.observer?.disconnect();
    this.watchImage(null);
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has('items') || changed.has('src')) this.sync();
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.arrange();
    this.place();
    this.mark();
    // Reading the image's size may set state: not from inside this update.
    queueMicrotask(() => {
      if (this.isConnected) this.watchImage(this.imageEl());
    });
  }

  // ---------------------------------------------------------------- sources

  /** The author's image element (`<img>` or `<picture>`), wherever it is now. */
  private sourceImage(): HTMLElement | null {
    if (this.src) return null;
    const kids = this.lightDom
      ? [...this.children, ...(this.imgHost?.children ?? [])]
      : [...this.children];
    const named = kids.find((k) => k.getAttribute('slot') === 'image');
    const el = named ?? kids.find((k) => k.localName === 'img' || k.localName === 'picture');
    return el instanceof HTMLElement ? el : null;
  }

  /** The author's list (`<ol>` or `<ul>`), wherever it is now. */
  private sourceList(): HTMLOListElement | HTMLUListElement | null {
    const kids = this.lightDom
      ? [...this.children, ...(this.listHost?.children ?? [])]
      : [...this.children];
    const el = kids.find((k) => k.localName === 'ol' || k.localName === 'ul');
    return (el as HTMLOListElement | HTMLUListElement | undefined) ?? null;
  }

  private get imgHost(): HTMLElement | null {
    return this.lightDom ? this.querySelector(':scope > .layout .img-host') : null;
  }

  private get listHost(): HTMLElement | null {
    return this.lightDom ? this.querySelector(':scope > .layout .list-host') : null;
  }

  /** The `<img>` whose natural size measures pixel regions. */
  private imageEl(): HTMLImageElement | null {
    if (this.src) return this.renderRoot.querySelector<HTMLImageElement>('.media > img');
    const el = this.sourceImage();
    if (!el) return null;
    return el instanceof HTMLImageElement ? el : el.querySelector('img');
  }

  /** Re-read the regions (and in shadow mode put the image in its slot). */
  private sync(): void {
    const img = this.sourceImage();
    if (img && !this.lightDom && !img.hasAttribute('slot')) img.setAttribute('slot', 'image');
    const next = this.items ? this.fromItems(this.items) : this.fromList();
    const key = JSON.stringify(next.map((e) => [e.item, e.box, e.number]));
    const sameEls =
      next.length === this.entries.length && next.every((e, i) => e.el === this.entries[i]?.el);
    if (key === this.key && sameEls) return;
    this.key = key;
    this.entries = next;
    if (this.active >= next.length) this.active = -1;
  }

  private fromItems(items: unknown[]): Entry[] {
    const out: Entry[] = [];
    for (const raw of Array.isArray(items) ? items : []) {
      const item = toRegion(raw);
      if (!item) continue;
      const { x, y, w, h, unit = 'px' } = item;
      out.push({ item, box: { x, y, w, h, unit }, number: out.length + 1, el: null });
    }
    return out;
  }

  private fromList(): Entry[] {
    const list = this.sourceList();
    if (!list) return [];
    const start = list.localName === 'ol' ? Number(list.getAttribute('start') ?? 1) || 1 : 1;
    const out: Entry[] = [];
    [...list.children].forEach((li, i) => {
      if (li.localName !== 'li' || !(li instanceof HTMLElement)) return;
      const box = parseXywh(li.dataset.xywh);
      const link = li.querySelector('a[href]');
      const label = normalize(li.dataset.label) || normalize(link?.textContent) || this.text(li);
      const item: ImageRegion = box ? { label, ...box } : { label, x: 0, y: 0, w: 0, h: 0 };
      const id = normalize(li.dataset.id) || li.id;
      if (id) item.id = id;
      const href = link?.getAttribute('href');
      if (href) item.href = href;
      out.push({ item, box, number: start + i, el: li });
    });
    return out;
  }

  /** A list item's own text, without its actions (buttons, fields) or a nested list. */
  private text(li: Element): string {
    const parts: string[] = [];
    const walk = (n: Node) => {
      if (n.nodeType === Node.TEXT_NODE) parts.push(n.textContent ?? '');
      else if (n instanceof Element && !n.matches(NOT_LABEL)) n.childNodes.forEach(walk);
    };
    li.childNodes.forEach(walk);
    return normalize(parts.join(' '));
  }

  // ---------------------------------------------------------------- layout

  /** Light DOM: move the author's image and list into the layout (the same nodes). */
  private arrange(): void {
    if (!this.lightDom) return;
    const img = this.sourceImage();
    const imgHost = this.imgHost;
    if (img && imgHost && img.parentElement !== imgHost) imgHost.append(img);
    const list = this.items ? null : this.sourceList();
    const listHost = this.listHost;
    if (list && listHost && list.parentElement !== listHost) listHost.append(list);
  }

  private watchImage(img: HTMLImageElement | null): void {
    if (img === this.watchedImg) {
      if (img) this.measure();
      return;
    }
    this.watchedImg?.removeEventListener('load', this.onImageLoad);
    this.watchedImg = img;
    img?.addEventListener('load', this.onImageLoad);
    this.measure();
  }

  private readonly onImageLoad = (): void => this.measure();

  private measure(): void {
    const img = this.watchedImg;
    const w = img?.complete ? img.naturalWidth : 0;
    const h = img?.complete ? img.naturalHeight : 0;
    const next = w > 0 && h > 0 ? { w, h } : null;
    if (next?.w !== this.natural?.w || next?.h !== this.natural?.h) this.natural = next;
  }

  /** The size pixel regions are measured in. */
  private get space(): { w: number; h: number } {
    const w = Number(this.imageWidth);
    const h = Number(this.imageHeight);
    if (w > 0 && h > 0) return { w, h };
    return this.natural ?? { w: 0, h: 0 };
  }

  /** Position the outlines in percent of the image, so they scale with it (CSSOM, not markup). */
  private place(): void {
    const { w, h } = this.space;
    for (const el of this.renderRoot.querySelectorAll<HTMLElement>('.overlay > .region')) {
      const entry = this.entries[Number(el.dataset.index)];
      const box = entry?.box ? toPercent(entry.box, w, h) : null;
      el.hidden = !box;
      if (!box) continue;
      el.style.left = `${box.x}%`;
      el.style.top = `${box.y}%`;
      el.style.width = `${box.w}%`;
      el.style.height = `${box.h}%`;
    }
  }

  /** The list entry of region `i`. */
  private entryEl(i: number): HTMLElement | null {
    const entry = this.entries[i];
    if (!entry) return null;
    if (entry.el) return entry.el;
    return this.renderRoot.querySelector<HTMLElement>(`.items > li[data-index="${i}"]`);
  }

  /** Mark the entries (their padding) and the highlighted one. */
  private mark(): void {
    this.entries.forEach((e, i) => {
      const el = this.entryEl(i);
      if (!el) return;
      if (el.getAttribute('data-uvalib-region') !== String(e.number))
        el.setAttribute('data-uvalib-region', String(e.number));
      el.toggleAttribute('data-uvalib-active', i === this.active);
    });
  }

  // ---------------------------------------------------------------- interaction

  /** The region an event is about: its outline or its list entry (or anything inside it). */
  private indexFrom(e: Event): { i: number; outline: boolean } | null {
    for (const n of e.composedPath()) {
      if (n === this) break;
      if (!(n instanceof HTMLElement)) continue;
      if (n.classList.contains('region') && n.parentElement?.classList.contains('overlay'))
        return { i: Number(n.dataset.index), outline: true };
      const at = this.entries.findIndex((en, i) => (en.el ?? this.entryEl(i)) === n);
      if (at >= 0) return { i: at, outline: false };
    }
    return null;
  }

  private setActive(): void {
    const next = this.hover >= 0 ? this.hover : this.focused;
    if (next === this.active) return;
    this.active = next;
    const item = this.entries[next]?.item ?? null;
    this.dispatchEvent(
      new CustomEvent('highlight', {
        detail: { item, index: item ? next : -1 },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private readonly onPointerOver = (e: PointerEvent): void => {
    this.hover = this.indexFrom(e)?.i ?? -1;
    this.setActive();
  };

  private readonly onPointerLeave = (): void => {
    this.hover = -1;
    this.setActive();
  };

  private readonly onFocusIn = (e: FocusEvent): void => {
    this.focused = this.indexFrom(e)?.i ?? -1;
    this.setActive();
  };

  private readonly onFocusOut = (e: FocusEvent): void => {
    const to = e.relatedTarget;
    if (to instanceof Node && (this.contains(to) || this.renderRoot.contains(to))) return;
    this.focused = -1;
    this.setActive();
  };

  private readonly onClick = (e: MouseEvent): void => {
    const hit = this.indexFrom(e);
    if (!hit?.outline) return;
    this.choose(hit.i);
  };

  /** An outline was clicked: focus its entry, and say so. */
  private choose(i: number): void {
    const entry = this.entries[i];
    const el = this.entryEl(i);
    if (!entry || !el) return;
    if (!el.hasAttribute('tabindex')) el.tabIndex = -1;
    el.focus();
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    this.dispatchEvent(
      new CustomEvent('select', {
        detail: { item: entry.item, index: i },
        bubbles: true,
        composed: true,
      }),
    );
    const name = normalize(this.label) || DEFAULT_LABEL;
    trackEvent(this, ['uvalib-image-regions', 'select', name, entry.number]);
  }

  // ---------------------------------------------------------------- render

  private get level(): number {
    const n = Math.trunc(Number(this.headingLevel));
    return n >= 2 && n <= 6 ? n : this.inferredLevel;
  }

  private renderOwnList() {
    const base = this.ownerDocument.baseURI;
    return html`<ol class="items" aria-labelledby=${this.headingId}>
      ${this.entries.map(({ item }, i) => {
        const href = item.href && safeHref(item.href, base) ? item.href : '';
        return html`<li data-index=${i}>
          ${href ? html`<a href=${href}>${item.label}</a>` : html`<span>${item.label}</span>`}
          ${item.description ? html`<span class="description">${item.description}</span>` : nothing}
        </li>`;
      })}
    </ol>`;
  }

  protected override render() {
    const light = this.lightDom;
    const numbers = this.numbering !== 'none';
    const image = this.src
      ? html`<img
          part="image"
          src=${this.src}
          alt=${this.alt}
          width=${this.width ?? nothing}
          height=${this.height ?? nothing}
          @load=${this.onImageLoad}
        />`
      : light
        ? html`<div class="img-host"></div>`
        : html`<slot name="image" @slotchange=${() => this.requestUpdate()}></slot>`;
    const list = this.items
      ? this.renderOwnList()
      : light
        ? html`<div class="list-host"></div>`
        : html`<slot @slotchange=${() => this.sync()}></slot>`;
    const hasActive = this.active >= 0 && !!this.entries[this.active]?.box;
    return html`<div class="layout" part="layout">
      <div class="media" part="media">
        ${image}
        <div
          class="overlay ${hasActive ? 'has-active' : ''}"
          part="overlay"
          aria-hidden="true"
          ?hidden=${this.hideOutlines}
        >
          ${this.entries.map((e, i) =>
            e.box
              ? html`<div
                  class="region ${i === this.active ? 'active' : ''}"
                  part="region"
                  data-index=${i}
                >
                  <span class="badge ${numbers ? '' : 'no-number'}"
                    >${numbers ? html`<span class="number">${e.number}</span>` : nothing}${
                      e.item.label ? html`<span class="name">${e.item.label}</span>` : nothing
                    }</span
                  >
                </div>`
              : nothing,
          )}
        </div>
      </div>
      <div class="list" part="list">
        <div class="heading" role="heading" aria-level=${this.level} id=${this.headingId}>
          ${normalize(this.label) || DEFAULT_LABEL}
        </div>
        ${list}
      </div>
    </div>`;
  }
}
