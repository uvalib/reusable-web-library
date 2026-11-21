import { css, html, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { trackEvent } from '../../base/analytics.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { accessible } from '../../styles/accessible.js';

/** One step of the trail: its visible text and, except perhaps for the current page, a link. */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  /**
   * The search page(s) this step returns to: a path, or several separated by spaces
   * (`data-return-from` on a child link). When the visitor came from one of them with a query
   * string, the step links back to that search.
   */
  returnFrom?: string;
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

/** What the observer watches in the author's trail: the links, their hrefs and text. */
const CONTENT: MutationObserverInit = {
  attributes: true,
  attributeFilter: ['href', 'data-return-from'],
  characterData: true,
  childList: true,
  subtree: true,
};

/** Schemes a breadcrumb may link to; anything else (javascript:, data:, …) is shown as text. */
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

const normalize = (s: unknown) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();

/** A comparable path: without `index.html` and a trailing slash (`/search/` is `/search`). */
const pathKey = (p: string) => p.replace(/\/index\.html?$/i, '/').replace(/(.)\/$/, '$1') || '/';

/**
 * The search the visitor came from, for a step with `returnFrom`: the referrer's path, query
 * and hash when it is on this site, at one of the given paths (resolved against `base`) and
 * has a query string; else undefined (`origin` is the page's). Nothing is stored or sent.
 */
function returnHref(
  returnFrom: string | undefined,
  referrer: string,
  base: string,
  origin = new URL(base).origin,
): string | undefined {
  const paths = normalize(returnFrom).split(' ').filter(Boolean);
  if (!paths.length || !referrer) return undefined;
  try {
    const from = new URL(referrer);
    if (from.origin !== origin || from.search.length < 2) return undefined;
    const key = pathKey(from.pathname);
    const match = paths.some((p) => {
      const u = new URL(p, base);
      return u.origin === origin && pathKey(u.pathname) === key;
    });
    return match ? from.pathname + from.search + from.hash : undefined;
  } catch {
    return undefined;
  }
}

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
 * A step back to a search: give its link `data-return-from` with the search page's path (or
 * several, separated by spaces), as in `<a href="/" data-return-from="/">Search</a>`. When the
 * visitor came from that page on this site with a query string (`document.referrer`; a
 * trailing slash or `index.html` does not matter), the step links back to that search
 * (path, query and hash) instead; its text stays the same. Otherwise, as when the result
 * was opened in a new tab or the site sends no referrer, it keeps its href. Nothing is
 * stored or sent. In `items`, the same is `returnFrom`.
 *
 * Inside `<site-page>`, give it `slot="breadcrumbs"`: it is placed between the header (and
 * alerts band) and `<main>`, with the page's gutters. It works anywhere else too.
 *
 * Single-page apps: the trail is drawn from copies of the children, so a router's own click
 * handlers on them do not run. Listen for `uvalib-breadcrumbs-navigate` and cancel it to route
 * in place; hash links need nothing.
 *
 * @tagname uvalib-breadcrumbs
 * @fires uvalib-analytics-event - For `<site-analytics>`: a click on a trail link, `['uvalib-breadcrumbs', 'link-click', 'level <N>', <N>]` (N from 1, the first step); never the label or URL. Bubbles and is composed.
 * @fires uvalib-breadcrumbs-navigate - A plain click on a trail link: `detail` is `{ href, index }` (href as written). Cancel it (`preventDefault()`) to navigate in the app; the click's default is then prevented. Bubbles and is composed.
 * @cssprop [--uva-blue-alt-dark=#005679] - Link colour.
 * @cssprop [--uva-grey-darkest=#2b2b2b] - Current page colour.
 * @cssprop [--uva-grey-dark=#4f4f4f] - Separator colour.
 * @cssprop --uva-color-utility-link - Dark-mode role token: link colour, #005679 in light as on library.virginia.edu (else `--uva-blue-alt-dark`).
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
        color: var(--uva-color-utility-link, var(--uva-blue-alt-dark, #005679));
        text-decoration: underline;
      }
      a[aria-current='page'] {
        color: inherit;
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
  private warnedHref = false;
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
      // Created after watch() ran (children added later): watch it too.
      if (this.observer && this.hasUpdated) this.observer.observe(this.holder, CONTENT);
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
      const item: BreadcrumbItem = href === null ? { label } : { label, href };
      const from = n.getAttribute('data-return-from');
      if (from !== null && href !== null) item.returnFrom = from;
      items.push(item);
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
    if (this.lightDom) {
      this.observer.observe(this, { childList: true });
      if (this.holder) this.observer.observe(this.holder, CONTENT);
    } else {
      this.observer.observe(this, CONTENT);
    }
  }

  /** What is shown: `items` while set, else the children; entries without a label left out. */
  private get trail(): BreadcrumbItem[] {
    const items = this.items
      ? this.items
          .filter((i) => normalize(i?.label))
          .map((i) => ({
            label: normalize(i.label),
            href: i.href ?? undefined,
            returnFrom: i.href == null ? undefined : (i.returnFrom ?? undefined),
          }))
      : this.childItems;
    const doc = this.ownerDocument;
    const origin = doc.defaultView?.location.origin;
    return items.map(({ label, href, returnFrom }) => {
      if (href === undefined || !this.safe(href)) return { label };
      // A step back to the search: the same-origin search the visitor came from, if any.
      const back =
        returnFrom && origin
          ? returnHref(returnFrom, doc.referrer, doc.baseURI, origin)
          : undefined;
      return { label, href: back ?? href };
    });
  }

  /**
   * Whether `href` may be a link: relative, hash and http(s), mailto and tel URLs are kept as
   * written; any other scheme (javascript:, data:, …) makes the step plain text, with a warning.
   */
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
        `${this.localName}: showing a breadcrumb as text: its href is not http(s), mailto, tel or relative.`,
      );
    }
    return ok;
  }

  /**
   * A plain click on a trail link fires a cancelable `uvalib-breadcrumbs-navigate`; a router
   * that cancels it navigates itself (the click's default is prevented too).
   */
  private onClick(e: MouseEvent): void {
    // Analytics: the link's level in the trail (1 is the first), never its label or URL.
    const step = (e.target as Element | null)?.closest?.('a[href]')?.closest('li');
    if (step && this.renderRoot.contains(step)) {
      const level = [...step.parentNode!.children].indexOf(step) + 1;
      trackEvent(this, ['uvalib-breadcrumbs', 'link-click', `level ${level}`, level]);
    }
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    const a = (e.target as Element | null)?.closest?.('a[href]');
    if (!a || !this.renderRoot.contains(a)) return;
    const links = [...this.renderRoot.querySelectorAll('nav a[href]')];
    const go = new CustomEvent('uvalib-breadcrumbs-navigate', {
      detail: { href: a.getAttribute('href'), index: links.indexOf(a) },
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    if (!this.dispatchEvent(go)) e.preventDefault();
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    // Lets <site-page> drop the trail's gutter while it shows nothing.
    this.toggleAttribute('data-empty', !this.trail.length);
  }

  protected override render() {
    const trail = this.trail;
    const last = trail.length - 1;
    // role="list": Safari drops the list semantics of a list styled without markers.
    return html`<nav
      aria-label=${this.label || DEFAULT_LABEL}
      ?hidden=${!trail.length}
      @click=${this.onClick}
    >
      <ol role="list">
        ${trail.map((item, i) => {
          const current = i === last ? 'page' : undefined;
          const step =
            item.href !== undefined
              ? html`<a href=${item.href} aria-current=${current ?? nothing}>${item.label}</a>`
              : html`<span aria-current=${current ?? nothing}>${item.label}</span>`;
          // The space before a separator is where a long trail wraps; the separator stays
          // with the item it introduces.
          return html`<li role="listitem">
            ${i ? html` <span class="separator" aria-hidden="true">/</span>` : nothing}${step}
          </li>`;
        })}
      </ol>
    </nav>`;
  }
}
