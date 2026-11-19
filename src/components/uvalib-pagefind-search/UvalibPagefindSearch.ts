import { trackError, trackEvent, trackSearch } from '../../base/analytics.js';

/** The part of Pagefind's `PagefindUI` this element uses (pagefind-ui.js, 1.x). */
export interface PagefindUIInstance {
  triggerSearch(term: string): void;
  triggerFilters(filters: Record<string, string | string[]>): void;
  destroy(): void;
}
type PagefindUIConstructor = new (options: Record<string, unknown>) => PagefindUIInstance;
type PagefindWindow = Window & { PagefindUI?: PagefindUIConstructor };

/** The analytics category. */
const TAG = 'uvalib-pagefind-search';

/** How long results must stay put before they are announced, reported and put in the URL. */
export const SETTLE_MS = 1000;

/** Each script URL is loaded once, however many elements ask for it. */
const scripts = new Map<string, Promise<PagefindUIConstructor>>();
function loadPagefindUI(src: string): Promise<PagefindUIConstructor> {
  const win = window as PagefindWindow;
  if (win.PagefindUI) return Promise.resolve(win.PagefindUI);
  let p = scripts.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () =>
        win.PagefindUI ? resolve(win.PagefindUI) : reject(new Error('no PagefindUI'));
      script.onerror = () => reject(new Error(`could not load ${src}`));
      document.head.append(script);
    });
    p.catch(() => scripts.delete(src));
    scripts.set(src, p);
  }
  return p;
}

/** Hidden from sight but read by screen readers; inline, so it holds without pagefind.css. */
const VISUALLY_HIDDEN: Partial<CSSStyleDeclaration> = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: '0',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: '0',
};

let instanceCounter = 0;

const json = <T>(text: string | null, fallback: T): T => {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    console.warn(`${TAG}: ignoring invalid JSON`, text);
    return fallback;
  }
};

/**
 * Pagefind's default search UI (`PagefindUI`, from the site's own Pagefind bundle) with the
 * library's defaults and the accessibility fixes that need script. Use it with pagefind.css,
 * in place of Pagefind's pagefind-ui.css. It renders in light DOM, so the page's styles reach
 * Pagefind's markup. It loads `<bundle-path>pagefind-ui.js` unless `window.PagefindUI`
 * already exists.
 *
 * What it adds to the stock UI: a visible `<label>` for the field (the stock field is named
 * only by its title); a polite status region that announces the result count ("12 results
 * for virginia") once results settle (the stock message is not a live region); focus kept in
 * the field after Clear or Escape (the stock UI blurs it, dropping focus to the page) and
 * moved to the first new result after "Load more results"; the loading placeholders' dots
 * hidden from screen readers; `?q=` read at start and the settled query written back with
 * `history.replaceState`, so a search can be shared; and reports to `<site-analytics>`. The
 * `ui` property is the `PagefindUI` instance (for `triggerFilters`), and `ready` resolves
 * with it. Attributes are read once, when the element is first connected.
 *
 * @tagname uvalib-pagefind-search
 * @attr {string} [bundle-path=/pagefind/] - The Pagefind bundle's URL path, ending in `/`.
 * @attr {string} merge-index - JSON array of more indexes to search together: `[{"bundlePath": "/pagefind/s1/"}]`.
 * @attr {number} [page-size=10] - Results shown before "Load more results".
 * @attr {number} excerpt-length - Words per excerpt (Pagefind's default: 30, or 12 with sub-results).
 * @attr {boolean} show-sub-results - Also list the matching sections of each page.
 * @attr {boolean} show-images - Show each result's `image` metadata (off by default).
 * @attr {string} [placeholder=Search] - The field's placeholder.
 * @attr {string} label - The field's visible label. Empty (the default) uses the placeholder.
 * @attr {boolean} label-hidden - Keep the label for screen readers only.
 * @attr {string} translations - JSON of Pagefind UI strings to override (`{"zero_results": "…"}`).
 * @attr {string} options - JSON of any other `PagefindUI` options (`{"openFilters": ["author"]}`), applied last.
 * @attr {string} [query-param=q] - The URL parameter that holds the query; empty turns it off.
 * @fires search-results - Results settled: `detail` is `{ query, count }`. Does not bubble.
 * @fires uvalib-analytics-search - For `<site-analytics>`: the settled query, category `Pagefind` and its result count, once per query and filter set. Bubbles and is composed.
 * @fires uvalib-analytics-event - For `<site-analytics>`: `['uvalib-pagefind-search', 'filter-change', '<filter>: <value>', 1 | 0]` (checked or unchecked), and `['uvalib-pagefind-search', 'error', 'load']` if Pagefind cannot be loaded. Bubbles and is composed.
 */
export class UvalibPagefindSearch extends HTMLElement {
  private started = false;
  private _ui?: PagefindUIInstance;
  private resolveReady!: (ui: PagefindUIInstance) => void;
  private readonly uid = `${TAG}-${++instanceCounter}`;
  private readonly container = document.createElement('div');
  private readonly status = document.createElement('p');
  private observer?: MutationObserver;
  private settleTimer?: ReturnType<typeof setTimeout>;
  private lastAnnounced = '';
  private lastTracked = '';
  /** After "Load more results": the index of the first new result, to focus once it loads. */
  private focusIndex?: number;

  /** Resolves with the `PagefindUI` instance once it is created. */
  readonly ready: Promise<PagefindUIInstance> = new Promise((r) => (this.resolveReady = r));

  /** The `PagefindUI` instance (for `triggerSearch` / `triggerFilters`), once created. */
  get ui(): PagefindUIInstance | undefined {
    return this._ui;
  }

  private get input(): HTMLInputElement | null {
    return this.container.querySelector('.pagefind-ui__search-input');
  }

  private get queryParam(): string {
    return this.getAttribute('query-param') ?? 'q';
  }

  connectedCallback(): void {
    if (this.started) return;
    this.started = true;
    void this.start();
  }

  disconnectedCallback(): void {
    // Moving the element keeps its search; removing it for good stops the timers.
    queueMicrotask(() => {
      if (this.isConnected) return;
      clearTimeout(this.settleTimer);
    });
  }

  private async start(): Promise<void> {
    const bundlePath = this.getAttribute('bundle-path') || '/pagefind/';
    const placeholder = this.getAttribute('placeholder') || 'Search';
    const label = document.createElement('label');
    label.className = `${TAG}__label`;
    label.htmlFor = `${this.uid}-input`;
    label.textContent = this.getAttribute('label') || placeholder;
    if (this.hasAttribute('label-hidden')) Object.assign(label.style, VISUALLY_HIDDEN);
    this.container.className = `${TAG}__ui`;
    this.status.className = `${TAG}__status`;
    this.status.setAttribute('role', 'status');
    Object.assign(this.status.style, VISUALLY_HIDDEN);
    this.append(label, this.container, this.status);

    let PagefindUI: PagefindUIConstructor;
    try {
      PagefindUI = await loadPagefindUI(`${bundlePath}pagefind-ui.js`);
    } catch {
      trackError(this, TAG, 'load');
      label.remove();
      const p = document.createElement('p');
      p.className = `${TAG}__error`;
      p.textContent = 'Search is not available right now. Please try again later.';
      this.container.append(p);
      return;
    }
    const num = (name: string, fallback?: number) => {
      const n = Number.parseInt(this.getAttribute(name) ?? '', 10);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };
    const options: Record<string, unknown> = {
      element: this.container,
      bundlePath,
      mergeIndex: json(this.getAttribute('merge-index'), []),
      pageSize: num('page-size', 10),
      showSubResults: this.hasAttribute('show-sub-results'),
      showImages: this.hasAttribute('show-images'),
      translations: { placeholder, ...json(this.getAttribute('translations'), {}) },
      ...json(this.getAttribute('options'), {}),
    };
    const excerpt = num('excerpt-length');
    if (excerpt) options.excerptLength ??= excerpt;
    const ui = new PagefindUI(options);
    this._ui = ui;
    // Svelte renders synchronously, so the field exists now.
    const input = this.input;
    if (input) input.id = `${this.uid}-input`;
    this.listen();
    const q = this.queryParam && new URLSearchParams(location.search).get(this.queryParam);
    if (q) ui.triggerSearch(q);
    this.resolveReady(ui);
  }

  private listen(): void {
    const c = this.container;
    // Pagefind blurs the field on Clear and Escape; bring focus back to it.
    c.addEventListener('click', (e) => {
      const t = e.target as Element;
      if (t.closest('.pagefind-ui__search-clear')) this.refocus();
      if (t.closest('.pagefind-ui__button')) {
        this.focusIndex = c.querySelectorAll('.pagefind-ui__results > li').length;
      }
    });
    c.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && (e.target as Element).matches('.pagefind-ui__search-input'))
        this.refocus();
    });
    c.addEventListener('change', (e) => {
      const box = e.target as HTMLInputElement;
      if (!box.matches('.pagefind-ui__filter-checkbox')) return;
      trackEvent(this, [TAG, 'filter-change', `${box.name}: ${box.value}`, +box.checked]);
    });
    this.observer = new MutationObserver(() => this.onMutation());
    this.observer.observe(c, { childList: true, subtree: true, characterData: true });
  }

  private refocus(): void {
    setTimeout(() => this.input?.focus());
  }

  private onMutation(): void {
    const c = this.container;
    for (const el of c.querySelectorAll('.pagefind-ui__loading:not([aria-hidden])'))
      el.setAttribute('aria-hidden', 'true');
    if (this.focusIndex !== undefined) {
      const item = c.querySelectorAll('.pagefind-ui__results > li')[this.focusIndex];
      const link = item?.querySelector<HTMLElement>('.pagefind-ui__result-link');
      if (link) {
        this.focusIndex = undefined;
        link.focus();
      }
    }
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => this.settle(), SETTLE_MS);
  }

  /** The query in the field and the checked filters, or undefined while results load. */
  private settled(): { query: string; count: number; message: string; key: string } | undefined {
    const c = this.container;
    const query = (this.input?.value ?? '').trim();
    const area = c.querySelector('.pagefind-ui__results-area');
    const list = area?.querySelector('.pagefind-ui__results');
    if (!query || !list) return undefined;
    const message = area!.querySelector('.pagefind-ui__message')?.textContent?.trim() ?? '';
    const shown = list.children.length;
    let count = shown;
    if (area!.querySelector('.pagefind-ui__button')) {
      // More results than shown: the count is the number in the message ("[COUNT] results
      // for [SEARCH_TERM]"), once the query itself is taken out of it.
      const digits = message
        .split(query)
        .join(' ')
        .match(/\d[\d.,\s  ]*/);
      count = digits ? Number(digits[0].replace(/\D/g, '')) : shown;
    }
    const filters = [...c.querySelectorAll<HTMLInputElement>('.pagefind-ui__filter-checkbox')]
      .filter((b) => b.checked)
      .map((b) => `${b.name}:${b.value}`)
      .sort();
    return { query, count, message, key: JSON.stringify([query, filters]) };
  }

  private settle(): void {
    const s = this.settled();
    if (!s) {
      if (!(this.input?.value ?? '').trim()) {
        this.lastAnnounced = '';
        this.lastTracked = '';
        this.status.textContent = '';
        this.writeQuery('');
      }
      return;
    }
    if (s.message && s.message !== this.lastAnnounced) {
      this.lastAnnounced = s.message;
      this.status.textContent = s.message;
    }
    if (s.key === this.lastTracked) return;
    this.lastTracked = s.key;
    this.writeQuery(s.query);
    trackSearch(this, s.query, 'Pagefind', s.count);
    this.dispatchEvent(
      new CustomEvent('search-results', { detail: { query: s.query, count: s.count } }),
    );
  }

  private writeQuery(query: string): void {
    const param = this.queryParam;
    if (!param) return;
    const url = new URL(location.href);
    if ((url.searchParams.get(param) ?? '') === query) return;
    if (query) url.searchParams.set(param, query);
    else url.searchParams.delete(param);
    try {
      history.replaceState(history.state, '', url);
    } catch {
      // A document whose URL cannot change (about:srcdoc): keep the search, skip the URL.
    }
  }
}
