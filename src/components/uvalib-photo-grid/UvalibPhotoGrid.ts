import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { accessible } from '../../styles/accessible.js';

const normalize = (s: unknown) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The flex container. Slotted links become the items (`slot { display: contents }`); the
 * `::after` soaks up free space on a short last row and is too wide to join a full one.
 * `host` is `:host` (shadow) or the tag (light DOM).
 */
const structuralRules = (host: string) => `
  ${host} {
    --_row: var(--uvalib-photo-row, 220px);
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
  }
  @media (max-width: 767px) {
    ${host}:not([row-height]) { --_row: 140px; }
  }
  ${host}::after {
    content: "";
    flex-grow: 1000000000;
    min-width: var(--_row);
    height: 0;
  }
  ${host} > .mount { display: none !important; }
  ${host} slot { display: contents; }
  ${host}[hidden], ${host} [hidden] { display: none !important; }
`;
const shadowStructure = unsafeCSS(structuralRules(':host'));

/**
 * Rules for the thumbnails themselves. They live in light DOM, including inside a shadow
 * root's slot, so shadow CSS cannot reach the image. Kept even with `no-style`: the ratio
 * is what stops the page jumping.
 */
const descendantRules = (tag: string) => `
  ${tag} {
    --_row: var(--uvalib-photo-row, 220px);
  }
  @media (max-width: 767px) {
    ${tag}:not([row-height]) { --_row: 140px; }
  }
  ${tag} > a, ${tag} > button {
    flex: calc(var(--ar, 1) * 1000) 1 calc(var(--_row) * var(--ar, 1));
    width: calc(var(--_row) * var(--ar, 1));
    max-width: 100%;
    min-width: 0;
    min-height: 44px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
    text-decoration: none;
    font: inherit;
  }
  ${tag} > button {
    background: transparent;
    border: none;
    padding: 0;
    text-align: start;
    cursor: pointer;
  }
  ${tag} img {
    width: 100%;
    height: var(--_row, 220px);
    aspect-ratio: var(--ar, 1);
    object-fit: cover;
    display: block;
    background: var(--uva-color-surface, #fff);
  }
  ${tag} .caption {
    display: block;
    margin: 0.25rem 0 0;
    font-size: 0.875rem;
    line-height: 1.4;
    overflow-wrap: anywhere;
    color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }
  ${tag} > a,
  ${tag} > button {
    position: relative;
  }
  ${tag} .badge,
  ${tag} [slot='badge'] {
    position: absolute;
    z-index: 1;
    inset-block-start: 0.5rem;
    inset-inline-start: 0.5rem;
    max-width: calc(100% - 1rem);
    margin: 0;
    padding: 0.15rem 0.5rem;
    border-radius: 0.25rem;
    background: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
    color: var(--uva-color-on-accent, #fff);
    font-size: 0.875rem;
    line-height: 1.4;
    overflow-wrap: anywhere;
    pointer-events: none;
  }
  ${tag} > a:focus-visible, ${tag} > button:focus-visible {
    outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    ${tag}, ${tag} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    ${tag} > a:focus-visible, ${tag} > button:focus-visible { outline: 3px solid CanvasText; }
    ${tag} .badge,
    ${tag} [slot='badge'] {
      background: Canvas;
      color: CanvasText;
      border: 1px solid CanvasText;
    }
  }
`;

const LENGTH = /^\d+(\.\d+)?(px|rem|em|vh|vw|vmin|vmax|ch|%)?$/;

/**
 * Justified rows of thumbnails. Each direct child that is a link or a button is one photo;
 * its image keeps its shape from the `width` and `height` attributes, or from the loaded
 * image, so the row does not jump when the picture arrives. The row is about 220px tall and
 * shorter on a phone; `row-height` sets that height.
 *
 * Every item stays a real link or button. An image with no visible text gets a visible
 * caption from its alt (the caption is then the accessible name, and a repeated alt is
 * cleared). The original alt is kept in `data-uvalib-alt` so a lightbox still describes
 * the picture. An item with no name at all is captioned “Photo N” and warned about once;
 * that caption is renumbered when the photos change order. An `aria-label` is left as the
 * name: the grid does not add a caption that would disagree with it.
 * Put the grid inside `<uvalib-lightbox>` and a plain click opens the viewer.
 *
 * A badge sits on the thumbnail: `<span slot="badge">` inside the link or button, or
 * `data-badge` on that item (for example “seq” or “3 photos”). It is visible text, so it is
 * part of the item’s accessible name. When the item already has an `aria-label`, the badge
 * is appended to that label (the author’s words stay in `data-uvalib-label`). A badge does
 * not replace the alt caption.
 *
 * @tagname uvalib-photo-grid
 * @slot - The thumbnails: one `<a href>` or `<button>` per photo, each with an `<img>`. A `<span slot="badge">` inside an item is drawn over that thumbnail.
 * @cssprop --uva-color-text - Dark-mode role token: caption colour (else `--uva-grey-darkest`).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 * @cssprop --uva-color-surface - Dark-mode role token: the box behind an image that has not loaded (else #fff).
 * @cssprop [--uva-grey-darkest=#2b2b2b] - Caption colour when `--uva-color-text` is unset.
 * @cssprop [--uva-brand-orange=#e57200] - Focus ring when `--uva-color-focus` is unset.
 */
export class UvalibPhotoGrid extends UvalibElement {
  static styles = [accessible, shadowStructure];

  /**
   * Row height. A bare number is pixels (`220` is 220px); `px`, `rem`, `em`, `vh`, `vw`,
   * `vmin`, `vmax`, `ch` and `%` are kept. Empty uses 220px, or 140px when the viewport is
   * 767px or narrower.
   */
  @property({ attribute: 'row-height' }) rowHeight = '';

  private mount?: HTMLElement;
  private warned = false;
  private warnedName = false;
  private observer?: MutationObserver;

  private get isLight(): boolean {
    return this.noShadowDom || this.hasAttribute('no-shadow-dom');
  }

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    if (!this.isLight) {
      const root = super.createRenderRoot();
      if (this.noStyle && root instanceof ShadowRoot) {
        const sheet = shadowStructure.styleSheet;
        if (sheet) root.adoptedStyleSheets = [sheet];
      }
      return root;
    }
    const mount = this.ownerDocument.createElement('div');
    mount.className = 'mount';
    mount.hidden = true;
    this.mount = mount;
    this.append(mount);
    return mount;
  }

  override connectedCallback(): void {
    const light = this.isLight;
    super.connectedCallback();
    this.install(light);
    this.applyRow();
    this.layout();
    this.observer ??= new MutationObserver(() => this.layout());
    this.observer.disconnect();
    this.observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['width', 'height', 'alt', 'src', 'data-badge', 'slot'],
    });
    // `load` does not bubble; capture sees an image finish so a ratio can replace the default.
    this.addEventListener('load', this.onLoad, true);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.observer?.disconnect();
    this.removeEventListener('load', this.onLoad, true);
  }

  protected override updated(): void {
    this.applyRow();
    this.layout();
  }

  private install(light: boolean): void {
    const node = this.getRootNode();
    const root = node instanceof Document || node instanceof ShadowRoot ? node : undefined;
    installLightDomStyles(`${this.localName}::images`, unsafeCSS(descendantRules(this.localName)), {
      root,
      scope: false,
    });
    if (!light) return;
    installLightDomStyles(
      `${this.localName}::structure`,
      unsafeCSS(structuralRules(this.localName)),
      { root, scope: false },
    );
  }

  private applyRow(): void {
    const value = this.length(this.rowHeight);
    if (value) this.style.setProperty('--uvalib-photo-row', value);
    else this.style.removeProperty('--uvalib-photo-row');
  }

  /** A CSS length, or null when the attribute is empty or not a length. */
  private length(raw: string): string | null {
    const s = raw.trim();
    if (!s || !LENGTH.test(s)) return null;
    return /^\d+(\.\d+)?$/.test(s) ? `${s}px` : s;
  }

  private readonly onLoad = (e: Event): void => {
    if (e.target instanceof HTMLImageElement && this.contains(e.target)) this.layout();
  };

  private items(): HTMLElement[] {
    return [...this.children].filter((n): n is HTMLElement => {
      if (!(n instanceof HTMLElement) || n === this.mount) return false;
      return isPhoto(n);
    });
  }

  private layout(): void {
    let skipped = false;
    for (const n of this.children) {
      if (n === this.mount || n.nodeType !== Node.ELEMENT_NODE) continue;
      const el = n as HTMLElement;
      if (!isPhoto(el)) skipped = true;
    }
    if (skipped) this.warn();
    this.items().forEach((item, i) => {
      item.style.setProperty('--ar', this.ratio(item).toFixed(4));
      this.ensureBadge(item);
      this.ensureCaption(item, i);
    });
  }

  private warn(): void {
    if (this.warned) return;
    this.warned = true;
    console.warn(
      `${this.localName}: an item was skipped because it is not a link or a button. Each photo is an <a href> or a <button>.`,
    );
  }

  /** Aspect ratio from the width and height attributes, else the loaded image, else a square. */
  private ratio(item: HTMLElement): number {
    const img = item.querySelector('img');
    if (!img) return 1;
    const w = positive(img.getAttribute('width'));
    const h = positive(img.getAttribute('height'));
    if (w && h) return w / h;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) return img.naturalWidth / img.naturalHeight;
    return 1;
  }

  /**
   * An authored `<span slot="badge">` or a `data-badge` value, drawn over the thumbnail.
   * `data-badge` is copied into a generated `.badge`. The badge is skipped when deciding
   * whether the item already has a caption, then folded into an existing `aria-label`.
   */
  private ensureBadge(item: HTMLElement): void {
    const slotted = [...item.children].find(
      (n): n is HTMLElement =>
        n instanceof HTMLElement &&
        n.getAttribute('slot') === 'badge' &&
        !n.hasAttribute('data-uvalib-generated-badge'),
    );
    const slottedText = slotted ? normalize(slotted.textContent) : '';
    let generated = [...item.children].find(
      (n): n is HTMLElement =>
        n instanceof HTMLElement && n.hasAttribute('data-uvalib-generated-badge'),
    );
    let text = '';
    if (slotted && slottedText) {
      generated?.remove();
      text = slottedText;
    } else {
      const data = normalize(item.getAttribute('data-badge'));
      if (!data) generated?.remove();
      else {
        if (!generated) {
          generated = this.ownerDocument.createElement('span');
          generated.className = 'badge';
          generated.setAttribute('data-uvalib-generated-badge', '');
          item.insertBefore(generated, item.firstChild);
        }
        if (generated.textContent !== data) generated.textContent = data;
        text = data;
      }
    }
    this.syncBadgeName(item, text);
  }

  /**
   * A visible badge is already in the name. An `aria-label` replaces the contents, so the
   * badge is appended and the author’s label is kept in `data-uvalib-label`.
   */
  private syncBadgeName(item: HTMLElement, badge: string): void {
    const key = 'data-uvalib-label';
    const stored = item.getAttribute(key);
    const current = item.getAttribute('aria-label');
    if (!badge) {
      if (stored !== null) {
        if (stored) item.setAttribute('aria-label', stored);
        else item.removeAttribute('aria-label');
        item.removeAttribute(key);
      }
      return;
    }
    if (current === null && stored === null) return;
    const original = stored ?? current ?? '';
    if (stored === null) item.setAttribute(key, original);
    const next = original ? `${original}, ${badge}` : badge;
    if (current !== next) item.setAttribute('aria-label', next);
  }

  /**
   * A thumbnail needs a visible text alternative as well as its alt. When the link or button
   * has no visible text, the alt (or “Photo N”) is shown as a caption. An alt that repeats
   * that caption is cleared so the alternative is not announced twice; a different alt is kept.
   */
  private ensureCaption(item: HTMLElement, index: number): void {
    const img = item.querySelector('img');
    rememberAlt(img);
    const visible = visibleText(item);
    const aria = normalize(item.getAttribute('aria-label'));
    const caption = [...item.children].find((n) => n.classList.contains('caption'));
    // An aria-label is already the name. A caption with different text fails
    // label-content-name-mismatch, so do not add one.
    const name = visible || aria;
    if (name) {
      caption?.remove();
      if (img && normalize(img.getAttribute('alt')) === name) img.setAttribute('alt', '');
      return;
    }
    const alt = normalize(img?.getAttribute('data-uvalib-alt'));
    const text = alt || `Photo ${index + 1}`;
    let node = caption instanceof HTMLElement ? caption : null;
    if (!node) {
      node = this.ownerDocument.createElement('span');
      node.className = 'caption';
      item.append(node);
    }
    if (alt) node.removeAttribute('data-uvalib-generated');
    else node.setAttribute('data-uvalib-generated', '');
    if (node.textContent !== text) node.textContent = text;
    if (img && normalize(img.getAttribute('alt')) === text) img.setAttribute('alt', '');
    else if (img && !img.hasAttribute('alt')) img.setAttribute('alt', '');
    if (!alt) this.warnNameless();
  }

  private warnNameless(): void {
    if (this.warnedName) return;
    this.warnedName = true;
    console.warn(
      `${this.localName}: a photo has no accessible name. Give its image an alt, or put visible text in the link.`,
    );
  }

  protected override render() {
    return this.isLight ? html`` : html`<slot></slot>`;
  }
}

/** A photo is a button or a link that can actually be followed. */
function isPhoto(el: HTMLElement): boolean {
  return el.localName === 'button' || (el.localName === 'a' && el.hasAttribute('href'));
}

/** Keep the author's alt before a duplicate is cleared, so a lightbox can still read it. */
function rememberAlt(img: HTMLImageElement | null): void {
  if (!img) return;
  const current = img.getAttribute('alt');
  if (current && normalize(current)) img.setAttribute('data-uvalib-alt', current);
}

function positive(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Author-visible text inside `el`: not images, not hidden text, not a caption this grid added. */
function visibleText(el: HTMLElement): string {
  const parts: string[] = [];
  const walk = (n: Node) => {
    if (n instanceof HTMLImageElement) return;
    if (
      n instanceof HTMLElement &&
      (n.classList.contains('caption') ||
        n.classList.contains('badge') ||
        n.getAttribute('slot') === 'badge' ||
        n.hasAttribute('data-uvalib-generated-badge'))
    )
      return;
    if (
      n instanceof HTMLElement &&
      (n.hidden ||
        n.getAttribute('aria-hidden') === 'true' ||
        n.classList.contains('visually-hidden'))
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
