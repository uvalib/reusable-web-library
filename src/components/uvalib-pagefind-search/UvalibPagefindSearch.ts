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

type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain =>
  typeof v === 'object' && v !== null && Object.getPrototypeOf(v) === Object.prototype;

/** Parse a JSON attribute; `check` says whether the value has the right shape. */
const json = <T>(text: string | null, fallback: T, check: (v: unknown) => boolean): T => {
  if (!text) return fallback;
  try {
    const v: unknown = JSON.parse(text);
    if (check(v)) return v as T;
  } catch {
    // reported below
  }
  console.warn(`${TAG}: ignoring an attribute that is not the expected JSON`, text);
  return fallback;
};

/** A bundle path always ends in `/`: Pagefind appends file names to it. */
export const withSlash = (path: string): string => (path.endsWith('/') ? path : `${path}/`);

/** Pagefind's English "many results" message, used to read the count back out of it. */
const MANY_RESULTS_EN = '[COUNT] results for [SEARCH_TERM]';
const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The total count in Pagefind's message, or undefined. With the message's template (`[COUNT]`
 * and `[SEARCH_TERM]`), the query is matched in its own place, so digits in the query never
 * leak into the count; without one, only the query's last occurrence is taken out.
 */
export function countFromMessage(
  message: string,
  query: string,
  template?: string,
): number | undefined {
  let rest: string | undefined;
  if (template?.includes('[COUNT]')) {
    const re = new RegExp(
      `^${escapeRe(template)
        .replace(escapeRe('[COUNT]'), '(.+?)')
        .replace(escapeRe('[SEARCH_TERM]'), escapeRe(query))}$`,
    );
    rest = message.match(re)?.[1];
  }
  if (rest === undefined) {
    const at = message.lastIndexOf(query);
    rest = at < 0 ? message : message.slice(0, at) + ' ' + message.slice(at + query.length);
  }
  const digits = rest.match(/\d[\d.,\s\u00a0\u202f]*/);
  return digits ? Number(digits[0].replace(/\D/g, '')) : undefined;
}

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
 * hidden from screen readers; `?q=` read at start (and on Back and Forward) and the settled
 * query written back with `history.replaceState`, so a search can be shared; and reports to `<site-analytics>`. The
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
 * @fires search-results - Results settled: `detail` is `{ query, count }`; `{ query: '', count: 0 }` when the field is emptied after a search. Does not bubble.
 * @fires uvalib-analytics-search - For `<site-analytics>`: the settled query, category `Pagefind` and its result count, once per query and filter set. Bubbles and is composed.
 * @fires uvalib-analytics-event - For `<site-analytics>`: `['uvalib-pagefind-search', 'filter-change', '<filter>: <value>', 1 | 0]` (checked or unchecked), and `['uvalib-pagefind-search', 'error', 'load']` if Pagefind cannot be loaded. Bubbles and is composed.
 */
export class UvalibPagefindSearch extends HTMLElement {
  /** Bumped by each start and teardown, so a start still loading after removal stops. */
  private generation = 0;
  private started = false;
  private _ui?: PagefindUIInstance;
  private resolveReady!: (ui: PagefindUIInstance) => void;
  private _ready: Promise<PagefindUIInstance> = this.newReady();
  private readonly uid = `${TAG}-${++instanceCounter}`;
  private container = document.createElement('div');
  private readonly status = document.createElement('p');
  private observer?: MutationObserver;
  private settleTimer?: ReturnType<typeof setTimeout>;
  private lastAnnounced = '';
  private lastTracked = '';
  /** The "many results" template, to read the count back out of Pagefind's message. */
  private manyResults?: string;
  /** After "Load more results": the index of the first new result, to focus once it loads. */
  private focusIndex?: number;
  private readonly onPopState = () => this.followUrl();

  private newReady(): Promise<PagefindUIInstance> {
    const { promise, resolve } = Promise.withResolvers<PagefindUIInstance>();
    this.resolveReady = resolve;
    return promise;
  }

  /**
   * Resolves with the `PagefindUI` instance once it is created (a new promise after the
   * element is removed and inserted again).
   */
  get ready(): Promise<PagefindUIInstance> {
    return this._ready;
  }

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
    void this.start(++this.generation);
  }

  disconnectedCallback(): void {
    // Moving the element (removed and inserted in one task) keeps its search; removing it
    // for good destroys the Pagefind UI, so inserting it again starts afresh.
    queueMicrotask(() => {
      if (!this.isConnected && this.started) this.teardown();
    });
  }

  private teardown(): void {
    this.generation++;
    this.started = false;
    clearTimeout(this.settleTimer);
    this.observer?.disconnect();
    this.observer = undefined;
    window.removeEventListener('popstate', this.onPopState);
    try {
      this._ui?.destroy();
    } catch {
      // Pagefind's own teardown failing must not stop ours.
    }
    if (this._ui) this._ready = this.newReady();
    this._ui = undefined;
    this.container.remove();
    this.container = document.createElement('div');
    this.querySelector(`:scope > .${TAG}__label`)?.remove();
    this.status.remove();
    this.status.textContent = '';
    this.lastAnnounced = this.lastTracked = '';
    this.focusIndex = undefined;
  }

  private async start(generation: number): Promise<void> {
    const bundlePath = withSlash(this.getAttribute('bundle-path') || '/pagefind/');
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
      if (generation !== this.generation) return;
      trackError(this, TAG, 'load');
      label.remove();
      const p = document.createElement('p');
      p.className = `${TAG}__error`;
      p.textContent = 'Search is not available right now. Please try again later.';
      this.container.append(p);
      return;
    }
    if (generation !== this.generation) return; // removed while the script loaded
    const num = (name: string, fallback?: number) => {
      const n = Number.parseInt(this.getAttribute(name) ?? '', 10);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };
    const mergeIndex = json<unknown[]>(this.getAttribute('merge-index'), [], Array.isArray)
      .filter((m): m is Plain => isPlain(m) && typeof m.bundlePath === 'string')
      .map((m) => ({ ...m, bundlePath: withSlash(m.bundlePath as string) }));
    const translations: Plain = {
      placeholder,
      ...json<Plain>(this.getAttribute('translations'), {}, isPlain),
    };
    const extra = json<Plain>(this.getAttribute('options'), {}, isPlain);
    const options: Plain = {
      bundlePath,
      mergeIndex,
      pageSize: num('page-size', 10),
      showSubResults: this.hasAttribute('show-sub-results'),
      showImages: this.hasAttribute('show-images'),
      ...extra,
      translations,
      // Always this element's own container: the label, status and focus fixes live there.
      element: this.container,
    };
    if (typeof options.bundlePath === 'string') options.bundlePath = withSlash(options.bundlePath);
    const excerpt = num('excerpt-length');
    if (excerpt) options.excerptLength ??= excerpt;
    const lang = (document.documentElement.lang || 'en').toLowerCase();
    this.manyResults =
      typeof translations.many_results === 'string'
        ? translations.many_results
        : lang === 'en' || lang.startsWith('en-')
          ? MANY_RESULTS_EN
          : undefined;
    const ui = new PagefindUI(options);
    this._ui = ui;
    // Svelte renders synchronously, so the field exists now.
    const input = this.input;
    if (input) input.id = `${this.uid}-input`;
    this.listen();
    window.addEventListener('popstate', this.onPopState);
    const q = this.urlQuery();
    if (q) ui.triggerSearch(q);
    this.resolveReady(ui);
  }

  /** The query in the page URL, or '' (always '' with `query-param=""`). */
  private urlQuery(): string {
    return (this.queryParam && new URLSearchParams(location.search).get(this.queryParam)) || '';
  }

  /** Back and Forward: search for the URL's query, or clear the field when it has none. */
  private followUrl(): void {
    if (!this.queryParam || !this._ui) return;
    const q = this.urlQuery();
    const input = this.input;
    if (!input || input.value.trim() === q) return;
    if (q) {
      this._ui.triggerSearch(q);
    } else {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
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
    // Capture, so the field's value is read before Pagefind empties it. Escape in an empty
    // field is left alone: it leaves the field (and can close a surrounding dialog).
    c.addEventListener(
      'keydown',
      (e) => {
        const t = e.target as HTMLInputElement;
        if (e.key === 'Escape' && t.matches('.pagefind-ui__search-input') && t.value !== '')
          this.refocus();
      },
      true,
    );
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

  /**
   * The query in the field, its count and message, and a key for the query and checked
   * filters; undefined while results load (Pagefind's message is drawn before the results'
   * data, so a list with loading placeholders has not settled).
   */
  private settled(): { query: string; count: number; message: string; key: string } | undefined {
    const c = this.container;
    const query = (this.input?.value ?? '').trim();
    const area = c.querySelector('.pagefind-ui__results-area');
    const list = area?.querySelector('.pagefind-ui__results');
    if (!query || !list || list.querySelector('.pagefind-ui__loading')) return undefined;
    const message = area!.querySelector('.pagefind-ui__message')?.textContent?.trim() ?? '';
    const shown = list.children.length;
    // More results than shown: the count is the number in the message.
    const count = area!.querySelector('.pagefind-ui__button')
      ? (countFromMessage(message, query, this.manyResults) ?? shown)
      : shown;
    const filters = [...c.querySelectorAll<HTMLInputElement>('.pagefind-ui__filter-checkbox')]
      .filter((b) => b.checked)
      .map((b) => `${b.name}:${b.value}`)
      .sort();
    return { query, count, message, key: JSON.stringify([query, filters]) };
  }

  private settle(): void {
    const s = this.settled();
    if (!s) {
      if (!(this.input?.value ?? '').trim()) this.cleared();
      return;
    }
    if (s.message && (s.message !== this.lastAnnounced || s.key !== this.lastTracked)) {
      this.announce(s.message);
    }
    if (s.key === this.lastTracked) return;
    this.lastTracked = s.key;
    this.writeQuery(s.query);
    trackSearch(this, s.query, 'Pagefind', s.count);
    this.dispatchEvent(
      new CustomEvent('search-results', { detail: { query: s.query, count: s.count } }),
    );
  }

  /** The field was emptied: clear the status and the URL, and say so once. */
  private cleared(): void {
    this.lastAnnounced = '';
    this.status.textContent = '';
    this.writeQuery('');
    if (!this.lastTracked) return;
    this.lastTracked = '';
    this.dispatchEvent(new CustomEvent('search-results', { detail: { query: '', count: 0 } }));
  }

  /** Put `message` in the status region; the same text again is emptied first, so it is read. */
  private announce(message: string): void {
    this.lastAnnounced = message;
    if (this.status.textContent !== message) {
      this.status.textContent = message;
      return;
    }
    this.status.textContent = '';
    setTimeout(() => (this.status.textContent = message), 100);
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
