import { css, html, nothing, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { trackEvent } from '../../base/analytics.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { accessible } from '../../styles/accessible.js';

/** Schemes a pager may link to; anything else is shown as text, not a link. */
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

const DEFAULT_TEMPLATE = '?page={page}';

/**
 * `has-more` is a boolean attribute that can also say no: present is true, and removing it
 * or `has-more="false"` (what many templates print for a false value) is false.
 */
const hasMoreConverter = {
  fromAttribute: (value: string | null): boolean =>
    value !== null && value.trim().toLowerCase() !== 'false',
};

/**
 * Kept with `no-style`: the previous/next row, the truncation of a long section title (the
 * full text stays in the accessible name), the page list, the “Page ” prefix hidden
 * visually, and a target at least 24px. `host` is `:host` or the tag.
 */
const structuralRules = (host: string) => `
  ${host} { display: block; min-width: 0; max-width: 100%; }
  ${host} nav.sections {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: stretch;
    gap: 1rem;
  }
  ${host} a.pager-prev, ${host} a.pager-next {
    display: inline-flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.15rem;
    max-width: 48%;
    min-width: 0;
    min-height: 2.75rem;
    overflow: hidden;
    text-decoration: none;
  }
  ${host} a.pager-next { margin-inline-start: auto; text-align: end; align-items: flex-end; }
  ${host} .pager-title {
    display: block;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  ${host} ol {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  ${host} ol a, ${host} ol .page {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.75rem;
    min-height: 2.75rem;
    padding: 0.25rem;
    box-sizing: border-box;
    text-decoration: none;
  }
  ${host} .more {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1rem;
    min-width: 0;
    max-width: 100%;
  }
  ${host} .status { margin: 0; min-width: 0; overflow-wrap: anywhere; }
  ${host} .uvalib-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-width: 44px;
    min-height: 44px;
    margin: 0;
    padding: 0.5rem 1.25rem;
    font: inherit;
    font-size: 1rem;
    line-height: 1.2;
    text-align: center;
    cursor: pointer;
  }
  ${host} .uvalib-button:focus-visible {
    outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
    outline-offset: 2px;
  }
  ${host} .visually-hidden {
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
  ${host}[hidden], ${host} [hidden] { display: none !important; }
  @media (forced-colors: active) {
    ${host} .uvalib-button { border: 2px solid ButtonText; }
    ${host} .uvalib-button:focus-visible { outline: 3px solid Highlight; }
  }
`;
const shadowStructure = unsafeCSS(structuralRules(':host'));

type Kind = 'next' | 'previous' | 'number';
type WindowItem = number | 'gap';

/**
 * Previous/next section links, as on a reading page, or a numbered page list.
 *
 * Previous/next: set `prev-href` and `next-href` (either may be omitted). Each link shows
 * a “Previous” or “Next” kicker and, when `prev-label` or `next-label` is set, that title.
 * A visually hidden “: ” sits between them, so the accessible name is punctuated even
 * when CSS is off. A long title truncates visually; the full text stays in the accessible
 * name. The links use `rel="prev"` and `rel="next"`. With neither href, nothing is rendered.
 *
 * Numbered pages: set `pages` (a positive count). `page` is the current page, clamped to
 * `1…pages`. Each link’s href comes from `href-template`, which must contain `{page}`
 * (the default is `?page={page}`). The current page is text with `aria-current="page"`,
 * not a link. Long ranges collapse to the first page, a window around the current page,
 * the last page, and an ellipsis where numbers are skipped. `pages` wins when previous/next
 * attributes are also set, with one console warning.
 *
 * Load more: `mode="load-more"` shows a “Load more” button and “Showing N of M” (`shown`
 * of `total`), or “Showing N” when `total` is unset or 0 (ranked search often cannot know
 * it). It wins over numbered pages and previous/next, with one warning when those
 * are also set. The button is not a link and the control is a group, not a navigation
 * landmark. Once `has-more` has been set (the attribute, or the `hasMore` property), it
 * alone decides whether the button shows: present (or `hasMore = true`) shows it; removed,
 * `has-more="false"` or `hasMore = false` hides it. Left unset, the button hides once
 * `shown` has reached a positive `total`, and stays with no total. `page` is the
 * last loaded page (default 1). A click fires `load-more` with `{ page }` set to the next
 * page and reports `['uvalib-pager', 'load-more', '', page]`. Nothing is reported on
 * render. Call `loaded(firstNewElement)`, or set `for` to a list id and call `loaded()`,
 * and focus moves to that new item.
 *
 * The landmark’s accessible name is `label`, or “Sections” for previous/next and
 * “Pagination” for numbered pages. Load more uses `label` or “More results”. An empty
 * `label` uses that default. Two pagers on one page need different labels: a repeated
 * landmark name fails the accessibility check.
 *
 * @tagname uvalib-pager
 * @fires uvalib-analytics-event - For `<site-analytics>`: a primary-button click that was not already canceled, including a modified click, on a page link `['uvalib-pager', 'page-change', 'number', <n>]`, on a section link `['uvalib-pager', 'page-change', 'next'|'previous']`, or on Load more `['uvalib-pager', 'load-more', '', <next page>]`. Never the label or URL. Nothing on render. Bubbles and is composed.
 * @fires load-more - A primary click on Load more: `detail` is `{ page }` (the next page). Bubbles and is composed.
 * @fires uvalib-pager-navigate - A plain click on a pager link: `detail` is `{ href, kind, page? }` (`kind` is `'next'`, `'previous'` or `'number'`; `page` is set for `'number'`). Cancel it (`preventDefault()`) to route in the app; the click’s default is then prevented. Bubbles and is composed.
 * @cssprop --uva-color-link - Dark-mode role token: link colour (else `--uva-brand-blue`).
 * @cssprop --uva-color-text - Dark-mode role token: current page (else `--uva-grey-darkest`).
 * @cssprop --uva-color-text-muted - Dark-mode role token: the Previous/Next kicker (else #4f4f4f).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 * @cssprop --uva-color-accent-bg - Dark-mode role token: current page background (else `--uva-brand-blue`).
 * @cssprop --uva-color-on-accent - Text on the current page background (else #fff).
 * @cssprop --uva-color-button-bg - Load more background (else `--uva-blue-alt`).
 * @cssprop --uva-color-button-text - Load more text (else #fff). Dark mode’s own text is dark on the light button.
 * @cssprop --uva-color-button-hover-bg - Load more hover background (else `--uva-blue-alt-A`).
 */
export class UvalibPager extends UvalibElement {
  static styles = [
    accessible,
    shadowStructure,
    css`
      a {
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
      }
      a:hover .pager-title,
      a:hover {
        text-decoration: underline;
      }
      .pager-dir {
        color: var(--uva-color-text-muted, #4f4f4f);
        font-size: 0.75rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .page[aria-current='page'] {
        background: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
        color: var(--uva-color-on-accent, #fff);
        border-radius: 0.25rem;
        font-weight: 600;
      }
      .ellipsis {
        display: inline-flex;
        align-items: center;
        min-height: 2.75rem;
        padding-inline: 0.25rem;
      }
      .status {
        color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
      }
      .uvalib-button {
        border: 2px solid var(--uva-color-button-bg, var(--uva-blue-alt, #007bac));
        border-radius: 5px;
        background: var(--uva-color-button-bg, var(--uva-blue-alt, #007bac));
        color: var(--uva-color-button-text, #ffffff);
      }
      .uvalib-button:hover {
        border-color: var(--uva-color-button-hover-bg, var(--uva-blue-alt-A, #005679));
        background: var(--uva-color-button-hover-bg, var(--uva-blue-alt-A, #005679));
      }
      .uvalib-button:active {
        border-color: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
        background: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
      }
      @media (forced-colors: active) {
        .page[aria-current='page'] {
          background: CanvasText;
          color: Canvas;
          forced-color-adjust: none;
        }
        a {
          color: LinkText;
        }
        .uvalib-button {
          background: ButtonFace;
          color: ButtonText;
          border: 2px solid ButtonText;
          forced-color-adjust: none;
        }
        .uvalib-button:focus-visible {
          outline: 3px solid Highlight;
        }
      }
    `,
  ];

  /** Href of the previous section. Omitted, that side is not shown. */
  @property({ type: String, attribute: 'prev-href' }) prevHref?: string;

  /** Title of the previous section, under the “Previous” kicker. */
  @property({ type: String, attribute: 'prev-label' }) prevLabel?: string;

  /** Href of the next section. Omitted, that side is not shown. */
  @property({ type: String, attribute: 'next-href' }) nextHref?: string;

  /** Title of the next section, under the “Next” kicker. */
  @property({ type: String, attribute: 'next-label' }) nextLabel?: string;

  /**
   * `load-more` shows a Load more button instead of previous/next or numbered pages.
   * Any other value, including empty, leaves the pager in its other modes.
   */
  @property({ type: String }) mode?: string;

  /** How many results are already shown. Used by `mode="load-more"` as N in “Showing N of M”. */
  @property({ type: Number }) shown?: number;

  /** How many results there are. Used by `mode="load-more"` as M in “Showing N of M”. Unset or 0 (an unknown total), the count reads “Showing N”. */
  @property({ type: Number }) total?: number;

  /**
   * Whether `mode="load-more"` has more to load, for when `total` is not known. Unset
   * (the default), the button follows `total`. Set, it decides: the attribute present
   * means true; removing it, `has-more="false"` or `hasMore = false` means false.
   * `hasMore = undefined` returns to following `total`.
   */
  @property({ attribute: 'has-more', converter: hasMoreConverter }) hasMore?: boolean;

  /**
   * Id of the list Load more appends to. `loaded()` focuses the first child added after
   * the click. Ignored when `loaded` is passed an element.
   */
  @property({ type: String, attribute: 'for' }) listFor?: string;

  /** Current page, from 1. Clamped to `pages`. Used when `pages` is set. In load-more, the last loaded page (default 1); a click asks for the next one. */
  @property({ type: Number }) page?: number;

  /**
   * How many pages. A positive number selects numbered pages and ignores previous/next.
   * Zero, negative or non-numeric does not.
   */
  @property({ type: Number }) pages?: number;

  /**
   * Href of each numbered page, with `{page}` where the number goes.
   * Default `?page={page}` when omitted. Without `{page}`, numbered links are not made.
   */
  @property({ type: String, attribute: 'href-template' }) hrefTemplate?: string;

  /**
   * Accessible name of the navigation landmark. Default “Pagination” for numbered pages
   * and “Sections” for previous/next. Empty uses that default. A second pager on the
   * page needs its own name.
   */
  @property({ type: String }) label?: string;

  private warnedHref = false;
  private warnedBoth = false;
  private warnedPages = false;
  private warnedTemplate = false;
  private warnedLoad = false;
  /** Child count of the `for` list at the last Load more click, or -1 when there was no list. */
  private pendingCount = -1;
  /** Load more had focus just before this update. */
  private buttonHadFocus = false;

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
  }

  /** Positive finite `pages` selects numbered mode. `Number("foo")` from the attribute is not. */
  private get pageCount(): number {
    const n = Math.trunc(this.pages ?? Number.NaN);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  private get numbered(): boolean {
    return this.pageCount > 0;
  }

  private get loadMore(): boolean {
    return (this.mode ?? '').trim().toLowerCase() === 'load-more';
  }

  private get currentPage(): number {
    const total = this.pageCount;
    const n = Math.trunc(this.page ?? 1);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(n, Math.max(total, 1));
  }

  private get navLabel(): string {
    const text = this.label?.trim() ?? '';
    if (text) return text;
    if (this.loadMore) return 'More results';
    return this.numbered ? 'Pagination' : 'Sections';
  }

  /** A non-negative integer, or 0 when the value is missing or not a positive count. */
  private count(value: number | undefined): number {
    const n = Math.trunc(value ?? Number.NaN);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  /** The page a Load more click asks for. `page` is the last loaded page and defaults to 1. */
  private nextPage(): number {
    const n = Math.trunc(this.page ?? Number.NaN);
    const current = Number.isFinite(n) && n >= 1 ? n : 1;
    return current + 1;
  }

  private hasPrevNext(): boolean {
    return (
      (this.prevHref ?? '').trim() !== '' ||
      (this.nextHref ?? '').trim() !== '' ||
      (this.prevLabel ?? '').trim() !== '' ||
      (this.nextLabel ?? '').trim() !== ''
    );
  }

  protected override willUpdate(): void {
    this.buttonHadFocus = !!this.renderRoot?.querySelector?.('.more button')?.matches(':focus');
    if (this.loadMore) {
      if ((this.numbered || this.hasPrevNext()) && !this.warnedLoad) {
        this.warnedLoad = true;
        console.warn(
          `${this.localName}: mode="load-more" is set, so previous/next and numbered pages are not shown.`,
        );
      }
      return;
    }
    if (this.hasAttribute('pages') && !this.numbered && !this.warnedPages) {
      this.warnedPages = true;
      console.warn(`${this.localName}: pages must be a positive number to show numbered pages.`);
    }
    if (this.numbered && this.hasPrevNext() && !this.warnedBoth) {
      this.warnedBoth = true;
      console.warn(
        `${this.localName}: pages is set, so numbered pages are shown and previous/next are ignored.`,
      );
    }
    if (this.numbered && !this.template().includes('{page}') && !this.warnedTemplate) {
      this.warnedTemplate = true;
      console.warn(`${this.localName}: href-template must contain {page}.`);
    }
  }

  /**
   * When Load more goes away while it has focus (the last page came in and `loaded()` was
   * not called first), focus would fall to the page. Move it to the first new item of the
   * `for` list, or else to the count.
   */
  protected override updated(): void {
    if (!this.buttonHadFocus) return;
    this.buttonHadFocus = false;
    if (this.renderRoot.querySelector('.more button')) return;
    if (this.firstNew()) {
      this.loaded();
      return;
    }
    const status = this.renderRoot.querySelector<HTMLElement>('.more .status');
    if (!status) return;
    status.tabIndex = -1;
    status.focus();
  }

  private template(): string {
    const raw = this.hrefTemplate?.trim() ?? '';
    return raw || DEFAULT_TEMPLATE;
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
        `${this.localName}: not linking a page whose href is not http(s), mailto, tel or relative.`,
      );
    }
    return ok;
  }

  private sideHref(href: string | undefined): string | null {
    const raw = href?.trim() ?? '';
    if (!raw || !this.safe(raw)) return null;
    return raw;
  }

  private hrefFor(n: number): string | null {
    const template = this.template();
    if (!template.includes('{page}')) return null;
    const href = template.replaceAll('{page}', String(n));
    return this.safe(href) ? href : null;
  }

  /**
   * Pages to show. At most seven steps stay whole. Otherwise: the first, the last, and a
   * window around the current page (pages 1–4 when near the start, the last four when near
   * the end), with a gap wherever numbers are skipped.
   */
  private window(): WindowItem[] {
    const total = this.pageCount;
    const current = this.currentPage;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const set = new Set<number>([1, total, current - 1, current, current + 1]);
    if (current <= 3) for (let i = 1; i <= 4; i++) set.add(i);
    if (current >= total - 2) for (let i = total - 3; i <= total; i++) set.add(i);
    const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
    const out: WindowItem[] = [];
    for (let i = 0; i < nums.length; i++) {
      const n = nums[i]!;
      if (i > 0 && n - nums[i - 1]! > 1) out.push('gap');
      out.push(n);
    }
    return out;
  }

  /**
   * A plain primary-button click fires a cancelable `uvalib-pager-navigate`. A click that
   * was already canceled, or that is not the primary button, is ignored. Modified clicks
   * are tracked and do not fire the navigate event.
   */
  private onClick(e: MouseEvent): void {
    const node = e.target instanceof Node ? e.target : null;
    const el = node instanceof Element ? node : node?.parentElement;
    const a = el?.closest('a[href]');
    if (!(a instanceof HTMLAnchorElement) || !this.renderRoot.contains(a)) return;
    const kind = a.dataset.kind as Kind | undefined;
    if (kind !== 'next' && kind !== 'previous' && kind !== 'number') return;
    if (e.defaultPrevented || e.button !== 0) return;
    const page = kind === 'number' ? Number(a.dataset.page) : undefined;
    if (kind === 'number' && page !== undefined && Number.isFinite(page))
      trackEvent(this, ['uvalib-pager', 'page-change', 'number', page]);
    else trackEvent(this, ['uvalib-pager', 'page-change', kind]);
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const detail: { href: string | null; kind: Kind; page?: number } = {
      href: a.getAttribute('href'),
      kind,
    };
    if (page !== undefined && Number.isFinite(page)) detail.page = page;
    const go = new CustomEvent('uvalib-pager-navigate', {
      detail,
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    if (!this.dispatchEvent(go)) e.preventDefault();
  }

  private pageBits(n: number) {
    return html`<span class="visually-hidden">Page </span>${n}`;
  }

  private renderNumbered() {
    const current = this.currentPage;
    return html`<nav class="pages" aria-label=${this.navLabel} @click=${this.onClick}>
      <ol role="list">
        ${this.window().map((item) =>
          item === 'gap'
            ? html`<li aria-hidden="true"><span class="ellipsis">…</span></li>`
            : html`<li role="listitem">
                ${
                  item === current
                    ? html`<span class="page" aria-current="page">${this.pageBits(item)}</span>`
                    : this.hrefFor(item)
                      ? html`<a href=${this.hrefFor(item)!} data-kind="number" data-page=${item}
                          >${this.pageBits(item)}</a
                        >`
                      : html`<span class="page">${this.pageBits(item)}</span>`
                }
              </li>`,
        )}
      </ol>
    </nav>`;
  }

  private renderSide(kind: 'previous' | 'next', href: string, label: string | undefined) {
    const kicker = kind === 'previous' ? 'Previous' : 'Next';
    const title = label?.trim() ?? '';
    const className = kind === 'previous' ? 'pager-prev' : 'pager-next';
    return html`<a
      class=${className}
      rel=${kind === 'previous' ? 'prev' : 'next'}
      href=${href}
      data-kind=${kind}
    >
      <span class="pager-dir">${kicker}</span>
      ${
        title
          ? html`<span class="visually-hidden">: </span><span class="pager-title">${title}</span>`
          : nothing
      }
    </a>`;
  }

  private renderSections() {
    const prev = this.sideHref(this.prevHref);
    const next = this.sideHref(this.nextHref);
    if (!prev && !next) return nothing;
    return html`<nav class="sections" aria-label=${this.navLabel} @click=${this.onClick}>
      ${prev ? this.renderSide('previous', prev, this.prevLabel) : nothing}
      ${next ? this.renderSide('next', next, this.nextLabel) : nothing}
    </nav>`;
  }

  private listEl(): HTMLElement | null {
    const id = (this.listFor ?? '').trim();
    if (!id) return null;
    const node = this.getRootNode();
    const root = node instanceof Document || node instanceof ShadowRoot ? node : null;
    const found = root?.getElementById(id) ?? this.ownerDocument.getElementById(id);
    return found instanceof HTMLElement ? found : null;
  }

  /** Cards in a grid live in its `<ul>`, not as host children once light DOM has placed them. */
  private entries(list: HTMLElement): HTMLElement[] {
    if (list.localName === 'uvalib-card-grid') {
      const ul = (list.shadowRoot ?? list).querySelector('ul');
      if (ul) return [...ul.children].filter((n): n is HTMLElement => n instanceof HTMLElement);
    }
    return [...list.children].filter((n): n is HTMLElement => n instanceof HTMLElement);
  }

  private firstNew(): HTMLElement | null {
    const list = this.listEl();
    if (!list || this.pendingCount < 0) return null;
    return this.entries(list)[this.pendingCount] ?? null;
  }

  private isDisabled(el: HTMLElement): boolean {
    return (
      (el instanceof HTMLButtonElement ||
        el instanceof HTMLInputElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLTextAreaElement) &&
      el.disabled
    );
  }

  private canFocus(el: HTMLElement): boolean {
    if (this.isDisabled(el)) return false;
    if (el.hasAttribute('tabindex')) return true;
    if (el instanceof HTMLAnchorElement) return el.hasAttribute('href');
    if (el instanceof HTMLButtonElement) return true;
    return (
      el.localName === 'summary' ||
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement
    );
  }

  /** A link or control inside a new list item, including one slotted into a card grid. */
  private focusIn(el: HTMLElement): HTMLElement | null {
    const roots: Element[] = [];
    const slot = el.querySelector('slot');
    if (slot) roots.push(...slot.assignedElements({ flatten: true }));
    else roots.push(el);
    for (const root of roots) {
      if (!(root instanceof HTMLElement)) continue;
      if (root !== el && this.canFocus(root)) return root;
      const inner = root.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary',
      );
      if (inner && this.canFocus(inner)) return inner;
    }
    return null;
  }

  /**
   * Move focus to `firstNew`, or to the first item added to the `for` list since the
   * click. A card grid counts the items in its list. An element that cannot take focus
   * gets `tabindex="-1"`. A disabled field is not treated as focusable. The target is
   * focused so its ring shows.
   */
  loaded(firstNew?: HTMLElement): void {
    const given = firstNew instanceof HTMLElement && firstNew.isConnected ? firstNew : null;
    let target = given ?? this.firstNew();
    if (!(target instanceof HTMLElement)) return;
    if (!given) target = this.focusIn(target) ?? target;
    if (this.isDisabled(target)) {
      target.tabIndex = -1;
      this.pendingCount = -1;
      return;
    }
    if (!this.canFocus(target)) target.tabIndex = -1;
    // lib.dom in this project has no focusVisible; the option is what draws the ring.
    target.focus({ focusVisible: true } as FocusOptions);
    this.pendingCount = -1;
  }

  private onLoadMore(e: MouseEvent): void {
    if (e.defaultPrevented || e.button !== 0) return;
    const page = this.nextPage();
    const list = this.listEl();
    this.pendingCount = list ? this.entries(list).length : -1;
    trackEvent(this, ['uvalib-pager', 'load-more', '', page]);
    this.dispatchEvent(
      new CustomEvent('load-more', { detail: { page }, bubbles: true, composed: true }),
    );
  }

  private renderLoadMore() {
    const shown = this.count(this.shown);
    const total = this.count(this.total);
    const done = typeof this.hasMore === 'boolean' ? !this.hasMore : total > 0 && shown >= total;
    return html`<div class="more" role="group" aria-label=${this.navLabel}>
      <div class="status" role="status">Showing ${shown}${total > 0 ? ` of ${total}` : ''}</div>
      ${
        done
          ? nothing
          : html`<button type="button" class="uvalib-button" @click=${this.onLoadMore}>
              Load more
            </button>`
      }
    </div>`;
  }

  protected override render() {
    if (this.loadMore) return this.renderLoadMore();
    return this.numbered ? this.renderNumbered() : this.renderSections();
  }
}
