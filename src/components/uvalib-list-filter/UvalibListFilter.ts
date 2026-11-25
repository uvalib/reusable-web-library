import { css, html, nothing, svg, unsafeCSS, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { trackEvent } from '../../base/analytics.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { hrefWithParam, paramFromLocation } from '../../base/url-param.js';
import { accessible } from '../../styles/accessible.js';
import { message } from '../../styles/message.js';

/** What `uvalib-list-filter-change` carries. */
export interface ListFilterChangeDetail {
  /** The text in the field, as typed. */
  query: string;
  /** How many items match (are shown). */
  shown: number;
  /** How many items the list has. */
  total: number;
}

const TAG = 'uvalib-list-filter';

/**
 * How long (ms) the filter must stay put before it is announced and reported to analytics
 * (as `<uvalib-results-count>` and the date range settle), and before it is written to the
 * URL. Tests may shorten them.
 */
export const listFilterTiming = { settle: 1000, url: 250 };
/** How long an announcement stays in the live region before it is cleared. */
const CLEAR_MS = 5000;
let uid = 0;

const MARKS = /\p{M}/gu;
/** Case- and accent-insensitive form: “Ébène” and “ebene” match. */
export const fold = (s: string): string => s.normalize('NFD').replace(MARKS, '').toLowerCase();
/** The query's words, folded: every one must appear in an item, in any order. */
export const queryWords = (q: string): string[] => fold(q).split(/\s+/).filter(Boolean);
/** The same words in any case or order are the same query (for analytics). */
const queryKey = (q: string): string => queryWords(q).toSorted().join(' ');

const count = (n: number) => n.toLocaleString('en-US');

/** The items as read from the page, with their folded text and what the filter last did. */
interface Index {
  items: HTMLElement[];
  /** Folded text per item, read on the first non-empty query. */
  text?: string[];
  hidden: boolean[];
  /** Each item's `[data-filter-group]` ancestor, if any. */
  group: (HTMLElement | null)[];
  groups: HTMLElement[];
}

/**
 * Hidden items stay hidden whatever `display` the page gives them: one unlayered sheet per
 * root (document or shadow root). It only reaches the direct children of the item and group
 * parents this element marks, so other `[hidden]` content on the page is left alone.
 */
const guards = new WeakMap<Document | ShadowRoot, CSSStyleSheet>();
const MARK = 'data-uvalib-list-filter';
function installGuard(root: Document | ShadowRoot): void {
  let sheet = guards.get(root);
  if (!sheet) {
    const doc = (root as ShadowRoot).ownerDocument ?? (root as Document);
    const Ctor =
      (doc.defaultView as (Window & typeof globalThis) | null)?.CSSStyleSheet ?? CSSStyleSheet;
    sheet = new Ctor();
    sheet.replaceSync(`:where([${MARK}]) > [hidden] { display: none !important; }`);
    guards.set(root, sheet);
  }
  if (!root.adoptedStyleSheets.includes(sheet))
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
}

const CLEAR_ICON = svg`<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

/**
 * Kept with `no-style`: the label above a 44px field, the 44px clear button inside its end,
 * the visually hidden text, and `[hidden]`. `host` is `:host` or the tag.
 */
const structuralRules = (host: string) => `
  ${host} { display: block; max-width: 100%; font-size: 1rem; line-height: 1.5; }
  ${host} .label { display: block; margin-block-end: 0.25rem; }
  ${host} .field { position: relative; }
  ${host} .input {
    display: block;
    box-sizing: border-box;
    inline-size: 100%;
    min-block-size: 44px;
    margin: 0;
    padding-inline-end: 44px;
    font: inherit;
    line-height: 1.2;
  }
  ${host} .input::-webkit-search-cancel-button { -webkit-appearance: none; appearance: none; }
  ${host} .clear {
    position: absolute;
    inset-block-start: 0;
    inset-inline-end: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    inline-size: 44px;
    block-size: 44px;
    margin: 0;
    padding: 0;
    cursor: pointer;
  }
  ${host} .count { margin: 0.25rem 0 0; }
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
`;
const shadowStructure = unsafeCSS(structuralRules(':host'));

const BORDER = unsafeCSS('var(--uva-color-control-border, var(--uva-grey, #808080))');
const MUTED = unsafeCSS('var(--uva-color-text-muted, var(--uva-grey-A, #4f4f4f))');
const TEXT = unsafeCSS('var(--uva-color-input-text, var(--uva-grey-darkest, #2b2b2b))');
const RAISED = unsafeCSS('var(--uva-color-surface-raised, #ffffff)');

/**
 * A text field that filters a long list on the page as you type: a collection's 473 texts, a
 * staff directory, a table of databases. The list is the page's own markup and stays fully
 * visible without the script.
 *
 * `for` is the id of the list: any element whose children are the items (a `<ul>` or `<ol>`,
 * a `<dl>` of `<div>` rows, a grid of cards; for a `<table>`, the rows of its bodies).
 * `selector` picks the items instead (inside `for` when both are set, else in the page).
 * An item matches when every word typed appears in its `data-filter-text`, or else its text,
 * in any order, ignoring case and accents (“eneide” finds “Énéide”). Items that do not match
 * get the `hidden` attribute (kept hidden whatever `display` the page gives them); clearing
 * the field shows them all again. Thousands of items filter at once on every keystroke: the
 * text is read once, and only items whose state changes are touched.
 *
 * Groups: give each group's wrapper `data-filter-group` (a `<section>` with its heading and
 * its list) and point `selector` at the items; a group whose items are all hidden is hidden
 * too, heading and all.
 *
 * The visible `label` (default “Filter”; `hide-label` hides it visually) names the field, and
 * a Clear button (“Clear <label>”, 44px, shown only with text) or Escape empties it, keeping
 * focus in the field. Under the field a count follows at once (“Showing 12 of 473 texts”;
 * `noun`, plural, and `singular` name the items), and a polite status announces it once the
 * typing settles (a second after the last keystroke), never on every key or at load. When
 * nothing matches, a message says “No texts match “…”.” To put the count elsewhere, point
 * `results-count` at a `<uvalib-results-count>` (give it `total` and `noun` in the markup):
 * the element then sets its `shown` and `total` and leaves the count and announcement to it.
 *
 * With `query-param` (bare: `filter`) the filter is read from that URL parameter at start
 * and written back with `history.replaceState` as you type, so a filtered list can be shared
 * and Back returns to it. The list's content is read once; call `refresh()` after changing an
 * item's text in script (added or removed items and `data-filter-text` changes are noticed).
 *
 * Before it upgrades, `base.css` holds the label, field and count's height, so nothing moves.
 *
 * @tagname uvalib-list-filter
 * @fires uvalib-list-filter-change - The filter was applied with a new query (typing, Clear, Escape, `value` set in script, the URL at start, Back and Forward). `detail` is `{ query, shown, total }`. Not fired at load without a query. Bubbles and is composed.
 * @fires uvalib-analytics-event - For `<site-analytics>`, on the visitor's actions only: `['uvalib-list-filter', 'filter', '', <shown>]` once the typing settles on a new query, and `['uvalib-list-filter', 'clear']` when the visitor empties the field. Never the typed text. Bubbles and is composed.
 * @csspart label - The visible label.
 * @csspart field - The box around the field and its clear button.
 * @csspart input - The text field.
 * @csspart clear - The clear button.
 * @csspart count - The visible count under the field.
 * @csspart empty - The “No … match” message.
 * @cssprop --uva-color-surface-raised - Dark-mode role token: field background (else #fff).
 * @cssprop --uva-color-control-border - Dark-mode role token: field border (else `--uva-grey`, #808080).
 * @cssprop --uva-color-input-text - Dark-mode role token: field text (else #2b2b2b).
 * @cssprop --uva-color-text - Dark-mode role token: label text (else #2b2b2b).
 * @cssprop --uva-color-text-muted - Dark-mode role token: placeholder, count and the clear icon (else #4f4f4f).
 * @cssprop --uva-color-alert-info-bg - Dark-mode role token: the no-match message background.
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 */
export class UvalibListFilter extends UvalibElement {
  static styles = [
    accessible,
    shadowStructure,
    message,
    css`
      :host {
        color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
      }
      .label {
        font-weight: 600;
      }
      .field {
        max-inline-size: 36rem;
      }
      .input {
        padding-block: 0.5rem;
        padding-inline-start: 0.75rem;
        border: 1px solid ${BORDER};
        border-radius: 5px;
        background: ${RAISED};
        color: ${TEXT};
      }
      .input::placeholder {
        color: ${MUTED};
        opacity: 1;
      }
      .clear {
        border: 0;
        border-radius: 5px;
        background: none;
        color: ${MUTED};
      }
      .clear:hover {
        color: ${TEXT};
      }
      .clear:focus-visible {
        outline-offset: -4px;
      }
      .count {
        color: ${MUTED};
      }
      .uvalib-message {
        margin-block: 0.75rem 0;
      }
      @media (forced-colors: active) {
        .input {
          border-color: CanvasText;
        }
        .clear {
          color: ButtonText;
        }
      }
    `,
  ];

  /** The id of the list whose children are the items (for a table, its body rows). */
  @property({ type: String, attribute: 'for' }) htmlFor = '';

  /** A CSS selector for the items, inside `for` when it is set, else in the page. */
  @property({ type: String }) selector = '';

  /** The field's visible label and accessible name. */
  @property({ type: String }) label = 'Filter';

  /** Hide the label visually (it still names the field), when a heading beside it says it. */
  @property({ type: Boolean, reflect: true, attribute: 'hide-label' }) hideLabel = false;

  /** Placeholder text in the empty field, such as “Title or author”. */
  @property({ type: String }) placeholder = '';

  /** What the items are, plural: “items” by default. */
  @property({ type: String }) noun = 'items';

  /** What one item is. Default: “item” when `noun` is unset, else `noun`. */
  @property({ type: String }) singular = '';

  /** The id of a `<uvalib-results-count>` to drive instead of the element's own count. */
  @property({ type: String, attribute: 'results-count' }) resultsCount = '';

  /**
   * The URL parameter to read the filter from and write it to; a bare attribute uses
   * `filter`. Off by default.
   */
  @property({ type: String, attribute: 'query-param' }) queryParam: string | null = null;

  /** The text in the field. Setting it filters the list (not reported to analytics). */
  @property({ type: String }) value = '';

  @state() private shownCount = 0;
  @state() private totalCount = 0;
  /** The query the shown counts belong to. */
  @state() private appliedQuery = '';
  @state() private announcement = '';

  private readonly uid = `${TAG}-${++uid}`;
  private index?: Index;
  private started = false;
  private warned = false;
  private observer?: MutationObserver;
  private observed?: Element;
  /** The words of the last query reported to analytics (or restored), joined. */
  private reported = '';
  private settleTimer?: ReturnType<typeof setTimeout>;
  private urlTimer?: ReturnType<typeof setTimeout>;
  private clearing?: ReturnType<typeof setTimeout>;

  /** How many items match now. */
  get shown(): number {
    return this.shownCount;
  }

  /** How many items the list has. */
  get total(): number {
    return this.totalCount;
  }

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
    window.addEventListener('popstate', this.onPopState);
    window.addEventListener('pagehide', this.flushUrl);
    // Moved in the page: read the list again and filter it as before.
    if (this.started) this.reset();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this.onPopState);
    window.removeEventListener('pagehide', this.flushUrl);
    clearTimeout(this.settleTimer);
    clearTimeout(this.clearing);
    this.flushUrl();
    this.observer?.disconnect();
    this.observed = undefined;
    // Without the field there is no way to clear the filter: show the whole list again.
    this.showAll();
  }

  /** The list may come after the element in a page still loading: wait for it then. */
  private begin(): void {
    if (document.readyState === 'loading' && !this.collect())
      document.addEventListener('DOMContentLoaded', () => this.start(), { once: true });
    else this.start();
  }

  private start(): void {
    if (this.started || !this.isConnected) return;
    this.started = true;
    const fromUrl = this.urlQuery();
    if (fromUrl !== null) this.value = fromUrl;
    this.reported = queryKey(this.value);
    this.apply();
  }

  // Filtering in willUpdate: the counts it sets render in the same update.
  protected override willUpdate(changed: PropertyValues<this>): void {
    if (!this.hasUpdated) return this.begin();
    if (!this.started) return;
    if (changed.has('htmlFor') || changed.has('selector')) this.reset();
    else if (changed.has('value') && this.value !== this.appliedQuery) this.apply();
  }

  /** Read the list again (an item's text changed in script) and filter it with the current text. */
  refresh(): void {
    if (this.started) this.reset();
  }

  private reset(): void {
    this.showAll();
    this.index = undefined;
    this.apply();
  }

  // ---- the list

  private lookupRoot(): Document | ShadowRoot {
    const node = this.getRootNode();
    return node instanceof ShadowRoot || node instanceof Document ? node : document;
  }

  /** The `for` element, if any. */
  private target(): Element | null {
    return this.htmlFor ? this.lookupRoot().getElementById(this.htmlFor) : null;
  }

  private collect(): HTMLElement[] | null {
    const scope = this.target();
    if (this.htmlFor && !scope) return null;
    let found: Element[];
    if (this.selector) {
      try {
        found = [...(scope ?? this.lookupRoot()).querySelectorAll(this.selector)];
      } catch {
        return null;
      }
    } else if (!scope) return null;
    else if (scope instanceof HTMLTableElement)
      found = [...scope.tBodies].flatMap((b) => [...b.rows]);
    else found = [...scope.children];
    return found.filter((e): e is HTMLElement => e instanceof HTMLElement);
  }

  private build(): Index | undefined {
    const items = this.collect();
    if (!items) {
      if (!this.warned) {
        this.warned = true;
        console.warn(
          `<${TAG}>: no list found; set "for" to the id of the list, or "selector" to its items.`,
        );
      }
      return undefined;
    }
    const group = items.map(
      (el) => el.parentElement?.closest<HTMLElement>('[data-filter-group]') ?? null,
    );
    const groups = [...new Set(group.filter((g): g is HTMLElement => g !== null))];
    const root = items[0]?.getRootNode();
    if (root instanceof Document || root instanceof ShadowRoot) installGuard(root);
    for (const parent of new Set([...items, ...groups].map((e) => e.parentElement)))
      parent?.setAttribute(MARK, '');
    this.observe();
    return { items, hidden: items.map((el) => el.hidden), group, groups };
  }

  /** Added or removed items, and data-filter-text changes, read the list again. */
  private observe(): void {
    const scope = this.target();
    if (!scope || scope === this.observed) return;
    this.observer?.disconnect();
    this.observer ??= new MutationObserver(() => {
      this.index = undefined;
      this.apply();
    });
    this.observer.observe(scope, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-filter-text'],
    });
    this.observed = scope;
  }

  private textOf(idx: Index): string[] {
    idx.text ??= idx.items.map((el) => fold(el.dataset.filterText ?? el.textContent ?? ''));
    return idx.text;
  }

  /** Show or hide every item for the current text (`user`: typed, so settle, report and write the URL). */
  private apply(user = false): void {
    this.index ??= this.build();
    const idx = this.index;
    const query = this.value;
    const prevQuery = this.appliedQuery;
    this.appliedQuery = query;
    if (!idx) {
      this.shownCount = this.totalCount = 0;
      return;
    }
    const words = queryWords(query);
    const text = words.length ? this.textOf(idx) : [];
    const { items, hidden, group } = idx;
    const visible = new Map<HTMLElement, number>();
    let shown = 0;
    for (let i = 0; i < items.length; i++) {
      let hide = false;
      if (words.length) {
        const t = text[i]!;
        for (const w of words) {
          if (!t.includes(w)) {
            hide = true;
            break;
          }
        }
      }
      if (hidden[i] !== hide) {
        hidden[i] = hide;
        items[i]!.hidden = hide;
      }
      if (!hide) {
        shown++;
        const g = group[i];
        if (g) visible.set(g, (visible.get(g) ?? 0) + 1);
      }
    }
    for (const g of idx.groups) {
      const hide = !visible.has(g);
      if (g.hidden !== hide) g.hidden = hide;
    }
    const changed =
      query !== prevQuery || shown !== this.shownCount || items.length !== this.totalCount;
    this.shownCount = shown;
    this.totalCount = items.length;
    this.driveResultsCount();
    if (changed && (query || prevQuery))
      this.dispatchEvent(
        new CustomEvent<ListFilterChangeDetail>('uvalib-list-filter-change', {
          detail: { query, shown, total: items.length },
          bubbles: true,
          composed: true,
        }),
      );
    if (user) {
      clearTimeout(this.settleTimer);
      this.settleTimer = setTimeout(() => this.settle(), listFilterTiming.settle);
      clearTimeout(this.urlTimer);
      this.urlTimer = setTimeout(this.flushUrl, listFilterTiming.url);
    }
  }

  private showAll(): void {
    const idx = this.index;
    if (!idx) return;
    idx.items.forEach((el, i) => {
      if (idx.hidden[i]) el.hidden = idx.hidden[i] = false;
    });
    for (const g of idx.groups) g.hidden = false;
  }

  private externalCount(): (HTMLElement & { shown?: number; total?: number }) | null {
    return this.resultsCount ? this.lookupRoot().getElementById(this.resultsCount) : null;
  }

  private driveResultsCount(): void {
    const rc = this.externalCount();
    if (!rc) return;
    rc.total = this.totalCount;
    rc.shown = this.shownCount;
  }

  // ---- what the visitor sees and hears

  private word(n: number): string {
    const plural = this.noun.trim() || 'items';
    if (n !== 1) return plural;
    return this.singular.trim() || (plural === 'items' ? 'item' : plural);
  }

  /** The visible count: “Showing 12 of 473 texts”, “Showing all 473 texts”. */
  get countText(): string {
    const total = this.totalCount;
    const shown = this.shownCount;
    if (!total) return this.started && this.index ? `No ${this.word(0)}` : '';
    if (shown < total) return `Showing ${count(shown)} of ${count(total)} ${this.word(total)}`;
    if (total === 1) return `Showing 1 ${this.word(1)}`;
    return `Showing all ${count(total)} ${this.word(total)}`;
  }

  private get emptyText(): string {
    const q = this.appliedQuery.trim();
    return this.totalCount && !this.shownCount && q ? `No ${this.word(0)} match “${q}”.` : '';
  }

  /** The typing settled: announce the count, and report a new query. */
  private settle(): void {
    if (!this.externalCount()) this.announce(this.emptyText || this.countText);
    const key = queryKey(this.value);
    if (key === this.reported) return;
    if (key) trackEvent(this, [TAG, 'filter', '', this.shownCount]);
    else trackEvent(this, [TAG, 'clear']);
    this.reported = key;
  }

  private announce(text: string): void {
    if (!text) return;
    clearTimeout(this.clearing);
    const say = () => {
      this.announcement = text;
      this.clearing = setTimeout(() => (this.announcement = ''), CLEAR_MS);
    };
    // The same words still in the region would not be read again: empty it first.
    if (this.announcement === text) {
      this.announcement = '';
      void this.updateComplete.then(() => requestAnimationFrame(say));
    } else say();
  }

  private get input(): HTMLInputElement | null {
    return (this.renderRoot as ParentNode).querySelector<HTMLInputElement>(`#${this.uid}-input`);
  }

  private onInput = (e: Event): void => {
    e.stopPropagation();
    this.value = (e.target as HTMLInputElement).value;
    this.apply(true);
  };

  private onKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || !this.value) return;
    e.preventDefault();
    this.clear();
  };

  private clear = (): void => {
    const input = this.input;
    if (input) input.value = '';
    this.value = '';
    this.apply(true);
    input?.focus();
    trackEvent(this, [TAG, 'clear']);
    this.reported = '';
  };

  // ---- the URL

  private get param(): string {
    const p = this.queryParam;
    return p === null ? '' : p.trim() || 'filter';
  }

  /** The filter in the URL, or null with `query-param` off or the parameter missing. */
  private urlQuery(): string | null {
    const name = this.param;
    return name ? paramFromLocation(location, name) : null;
  }

  private flushUrl = (): void => {
    if (this.urlTimer === undefined) return;
    clearTimeout(this.urlTimer);
    this.urlTimer = undefined;
    const name = this.param;
    if (!name) return;
    const q = this.value.trim();
    if ((paramFromLocation(location, name) ?? '') === q) return;
    try {
      history.replaceState(history.state, '', hrefWithParam(location, name, q || null));
    } catch {
      // A document whose URL cannot change (about:srcdoc), or too many changes: skip the URL.
    }
  };

  /** Back and Forward: follow the URL's filter. */
  private onPopState = (): void => {
    if (!this.started || !this.param) return;
    const q = this.urlQuery() ?? '';
    if (q === this.value) return;
    this.value = q;
    this.reported = queryKey(q);
    this.apply();
  };

  protected override render() {
    const id = this.uid;
    const label = this.label.trim() || 'Filter';
    const own = !this.resultsCount;
    const empty = this.emptyText;
    return html`<label
        class="label ${this.hideLabel ? 'visually-hidden' : ''}"
        part="label"
        for="${id}-input"
        >${label}</label
      >
      <div class="field" part="field">
        <input
          id="${id}-input"
          class="input"
          part="input"
          type="search"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          enterkeyhint="search"
          placeholder=${this.placeholder || nothing}
          .value=${this.value}
          @input=${this.onInput}
          @keydown=${this.onKeydown}
          @change=${(e: Event) => e.stopPropagation()}
        /><button
          type="button"
          class="clear"
          part="clear"
          aria-label="Clear ${label}"
          ?hidden=${!this.value}
          @mousedown=${(e: MouseEvent) => e.preventDefault()}
          @click=${this.clear}
        >
          ${CLEAR_ICON}
        </button>
      </div>
      ${own ? html`<p class="count" part="count">${this.countText}</p>` : nothing}
      <p class="uvalib-message" part="empty" ?hidden=${!empty}>${empty}</p>
      ${
        own
          ? html`<span class="visually-hidden" role="status" aria-live="polite" aria-atomic="true"
              >${this.announcement}</span
            >`
          : nothing
      }`;
  }
}
