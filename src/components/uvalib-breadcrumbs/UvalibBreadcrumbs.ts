import { css, html, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { accessible } from '../../styles/accessible.js';

/** One step of the trail: its visible text and, except perhaps for the current page, a link. */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

const DEFAULT_LABEL = 'Breadcrumb';

/**
 * The rules kept with `no-style`: the list is a plain inline run (no bullets, no indent) that
 * wraps like text, the separators keep their spacing, and `[hidden]` hides. `host` is `:host`
 * (shadow) or the tag name (light DOM, so they stay scoped).
 */
const structuralRules = (host: string) => `
  ${host} { display: block; }
  ${host} ol { list-style: none; margin: 0; padding: 0; }
  ${host} li { display: inline; }
  ${host} .separator { margin-inline-end: 0.3em; }
  ${host}[hidden], ${host} [hidden] { display: none !important; }
`;
const shadowStructure = unsafeCSS(structuralRules(':host'));

const normalize = (s: unknown) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * A breadcrumb trail, as on library.virginia.edu: links separated by slashes, ending with the
 * current page, at body size. A `<nav aria-label="Breadcrumb">` holding an `<ol>`; the
 * separators are hidden from assistive technology and the last item has
 * `aria-current="page"` (a `<span>`, or a link when it has an href).
 *
 * Give the trail as children: `<a href>` elements, ending with the current page as a
 * text-only element (`<span>Hours</span>`) or a link (`<a href aria-current="page">`).
 * The last child is always the current page. An earlier child without an href is shown as
 * plain text. Children with no text are skipped with one console warning. Hrefs are used as
 * written, and the trail follows changes to the children (attributes and text too).
 *
 * Apps that build the trail in JavaScript set the `items` property instead (it then wins
 * over any children); assigning a new array re-renders.
 *
 * Inside `<site-page>`, give it `slot="breadcrumbs"`: it is placed between the header (and
 * alerts band) and `<main>`, with the page's gutters. It works anywhere else too.
 *
 * @tagname uvalib-breadcrumbs
 * @cssprop [--uva-blue-alt-dark=#005679] - Link colour.
 * @cssprop [--uva-grey-darkest=#2b2b2b] - Current page colour.
 * @cssprop [--uva-grey-dark=#4f4f4f] - Separator colour.
 * @cssprop --uva-color-link - Dark-mode role token: link colour (else `--uva-blue-alt-dark`).
 * @cssprop --uva-color-text - Dark-mode role token: current page colour (else `--uva-grey-darkest`).
 * @cssprop --uva-color-text-muted - Dark-mode role token: separator colour (else `--uva-grey-dark`).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 */
export class UvalibBreadcrumbs extends UvalibElement {
  static styles = [
    accessible,
    shadowStructure,
    css`
      :host {
        font-size: 1rem;
        line-height: 1.5;
        color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
        overflow-wrap: anywhere;
      }
      a {
        color: var(--uva-color-link, var(--uva-blue-alt-dark, #005679));
        text-decoration: underline;
      }
      .separator {
        color: var(--uva-color-text-muted, var(--uva-grey-dark, #4f4f4f));
      }
    `,
  ];

  /** Accessible name of the navigation landmark. */
  @property({ type: String }) label = 'Breadcrumb';

  /**
   * The trail as data, for apps that build it in JavaScript: `{ label, href? }` objects, the
   * last one the current page. Wins over the children while set; `undefined` goes back to
   * them. Entries without a label are skipped with one console warning.
   */
  @property({ attribute: false }) items?: BreadcrumbItem[];

  /** The trail read from the children. */
  @state() private childItems: BreadcrumbItem[] = [];
  private warned = false;
  private observer?: MutationObserver;
  /** Light mode: the hidden container this element owns for the author's children. */
  private holder?: HTMLDivElement;
  /** Light mode: nodes this element rendered itself (incl. Lit markers), never adopted. */
  private own = new WeakSet<Node>();

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    const root = super.createRenderRoot();
    if (root instanceof ShadowRoot && this.noStyle) {
      const sheet = shadowStructure.styleSheet;
      if (sheet) root.adoptedStyleSheets = [sheet];
    }
    return root;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.lightDom && this.noStyle) {
      const node = this.getRootNode();
      installLightDomStyles(
        `${this.localName}::structure`,
        unsafeCSS(structuralRules(this.localName)),
        {
          root: node instanceof ShadowRoot || node instanceof Document ? node : undefined,
          scope: false,
        },
      );
    }
    // Read before the first render, so it costs no second update.
    this.sync();
    if (this.hasUpdated) this.watch();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.observer?.disconnect();
  }

  protected override firstUpdated(): void {
    if (this.lightDom) for (const n of this.childNodes) if (n !== this.holder) this.own.add(n);
    this.sync();
    this.watch();
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has('items') && this.items) this.check(this.items);
  }

  private warn(): void {
    if (this.warned) return;
    this.warned = true;
    console.warn(
      `${this.localName}: ignoring breadcrumbs with no text (each needs a label; give the trail as <a href> children ending with the current page, or set items).`,
    );
  }

  /** Warn about `items` entries that cannot be shown. */
  private check(items: readonly BreadcrumbItem[]): void {
    if (items.some((i) => !normalize(i?.label))) this.warn();
  }

  /** Light mode has no slots: move the author's children into the hidden holder. */
  private adopt(): Node[] {
    const incoming = [...this.childNodes].filter((n) => n !== this.holder && !this.own.has(n));
    if (incoming.length && !this.holder) {
      this.holder = this.ownerDocument.createElement('div');
      this.holder.hidden = true;
      this.holder.className = 'breadcrumbs-source';
    }
    if (this.holder) {
      this.holder.append(...incoming);
      if (this.holder.parentNode !== this) this.prepend(this.holder);
    }
    return this.holder ? [...this.holder.childNodes] : [];
  }

  /** Read the trail from the children. */
  private sync(): void {
    const sources = this.lightDom ? this.adopt() : [...this.childNodes];
    const items: BreadcrumbItem[] = [];
    let invalid = false;
    for (const n of sources) {
      if (n.nodeType === Node.TEXT_NODE) {
        if (normalize(n.textContent)) invalid = true;
        continue;
      }
      if (!(n instanceof Element)) continue;
      const label = normalize(n.textContent);
      if (!label) {
        invalid = true;
        continue;
      }
      const href = n instanceof HTMLAnchorElement ? n.getAttribute('href') : null;
      items.push(href === null ? { label } : { label, href });
    }
    if (invalid) this.warn();
    // Only a real change re-renders.
    if (JSON.stringify(items) !== JSON.stringify(this.childItems)) this.childItems = items;
  }

  /**
   * Shadow mode: the observer watches the children, their attributes and text. Light mode:
   * the host for new children and the holder for everything inside it.
   */
  private watch(): void {
    this.observer ??= new MutationObserver(() => this.sync());
    this.observer.disconnect();
    const content = {
      attributes: true,
      attributeFilter: ['href'],
      characterData: true,
      childList: true,
      subtree: true,
    };
    if (this.lightDom) {
      this.observer.observe(this, { childList: true });
      if (this.holder) this.observer.observe(this.holder, content);
    } else {
      this.observer.observe(this, content);
    }
  }

  /** What is shown: `items` while set, else the children; entries without a label left out. */
  private get trail(): BreadcrumbItem[] {
    if (!this.items) return this.childItems;
    return this.items
      .filter((i) => normalize(i?.label))
      .map((i) => ({ label: normalize(i.label), href: i.href ?? undefined }));
  }

  protected override render() {
    const trail = this.trail;
    const last = trail.length - 1;
    return html`<nav aria-label=${this.label || DEFAULT_LABEL} ?hidden=${!trail.length}>
      <ol>
        ${trail.map((item, i) => {
          const current = i === last ? 'page' : undefined;
          const step =
            item.href !== undefined
              ? html`<a href=${item.href} aria-current=${current ?? nothing}>${item.label}</a>`
              : html`<span aria-current=${current ?? nothing}>${item.label}</span>`;
          // The space before a separator is where a long trail wraps; the separator stays
          // with the item it introduces.
          return html`<li>
            ${i ? html` <span class="separator" aria-hidden="true">/</span>` : nothing}${step}
          </li>`;
        })}
      </ol>
    </nav>`;
  }
}
