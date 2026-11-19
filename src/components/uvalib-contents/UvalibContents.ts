import { css, nothing, unsafeCSS, type PropertyValues, type TemplateResult } from 'lit';
import { html, unsafeStatic } from 'lit/static-html.js';
import { property, state } from 'lit/decorators.js';
import { trackEvent } from '../../base/analytics.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { inlineCopy, langDir } from '../../base/inline-copy.js';
import { normalize, safeHref, SourceChildren } from '../../base/source-children.js';
import { accessible } from '../../styles/accessible.js';

/** One entry of the contents: its text, a link (optional for a group label) and sub-entries. */
export interface ContentsItem {
  label: string;
  href?: string;
  children?: ContentsItem[];
}

/**
 * An entry as drawn: `mark` is a valid `aria-current` the author gave its source link;
 * `lang`/`dir` come from the link and `itemLang`/`itemDir` from the `<li>`. `nodes` is a safe inline copy of the label (`em`, `cite`, `code`, `abbr`…),
 * cloned for each render; `rich` describes it, so two reads can be compared.
 */
interface Entry {
  label: string;
  href?: string;
  children: Entry[];
  mark?: Current;
  lang?: string;
  dir?: string;
  itemLang?: string;
  itemDir?: string;
  rich?: string;
  nodes?: Node[];
}

/** An `aria-current` value an author may give: `page`, `location`, or `true` (a page). */
const markOf = (v: string | null | undefined): Current | undefined => {
  const t = v?.trim().toLowerCase();
  return t === 'page' || t === 'true' ? 'page' : t === 'location' ? 'location' : undefined;
};

/** Compare two reads, leaving out the copied nodes (their `rich` key stands for them). */
const entriesKey = (items: Entry[]) =>
  JSON.stringify(items, (k, v: unknown) => (k === 'nodes' ? undefined : v));

type Current = 'page' | 'location';

const DEFAULT_LABEL = 'Contents';
const DEFAULT_COLLAPSE = '64rem';
const DEFAULT_LEVEL = 2;
let uid = 0;

/**
 * The rules kept with `no-style`: unmarked lists, the disclosure's closed panel hidden, and
 * `[hidden]` hides. `host` is `:host` (shadow) or the tag name (light DOM, so they stay scoped).
 */
const structuralRules = (host: string) => `
  ${host} { display: block; }
  ${host} :is(ol, ul) { list-style: none; margin: 0; padding: 0; }
  ${host} li :is(ol, ul) { padding-inline-start: 1rem; }
  ${host}[hidden], ${host} [hidden] { display: none !important; }
`;
const shadowStructure = unsafeCSS(structuralRules(':host'));

/** A comparable form of a URL: origin and path, without a trailing slash or index.html. */
const pageKey = (u: URL) =>
  u.origin + (u.pathname.replace(/\/index\.html?$/i, '/').replace(/(.)\/$/, '$1') || '/');

/** The query string as a sorted, comparable form (`?b=2&a=1` is `?a=1&b=2`). */
const queryKey = (u: URL) => {
  const q = new URLSearchParams(u.search);
  q.sort();
  return q.toString();
};

/**
 * Sub-navigation or a table of contents, as library.virginia.edu's sub-navigation: a
 * `<nav>` landmark (named by `label`, "Contents" by default) with the label as a visible
 * headline, and a nested list of links with dividers between the top-level entries and a bar
 * beside each nested level.
 *
 * Give the list as a child: an `<ol>` or `<ul>` of `<li>` elements, each with an `<a href>`
 * (or plain text for a group label) and, for sub-entries, a nested `<ol>`/`<ul>`, to any
 * depth. Other children (a heading) are ignored. The list follows changes to the children.
 * Apps set the `items` property instead (`{ label, href?, children? }`, winning over the
 * children while set).
 *
 * The current entry gets `aria-current`: `page` for the link to this page, `location` for the
 * link to the section of it in the URL's hash. It is found from the page URL (path, and hash
 * for in-page sections), followed through same-document navigations (`hashchange`,
 * `popstate` and the Navigation API), or from the `current` attribute (a URL, resolved like
 * the links). An entry whose href has a query string matches only that query (`?part=2`); one
 * without matches the page whatever its query. Hash-only hrefs are places on that page. With
 * `current` unset, a valid `aria-current` on a source link (`page`, `location` or `true`) is
 * used instead, the first of each kind. `lang` and `dir` on the source links and items, and
 * inline markup in their text (`em`, `cite`, `code`, `abbr`…, copied element by element,
 * never as HTML), are kept.
 *
 * On narrow screens the list collapses into a disclosure: the headline becomes a button with
 * `aria-expanded`, and the list starts closed (as the Electronic Text Collections' Contents
 * does on phones, so the text comes first) until the reader opens it, or while the `open`
 * attribute is set; opening it shows the current entry. Narrow means the viewport
 * (`collapse-below`, 64rem by default), not the element's own width: a contents sidebar is
 * always far narrower than 64rem, so a container query could not tell a phone from a
 * desktop. `sticky` keeps it in view in a sidebar on wide
 * screens; a list longer than the window then scrolls, and the current entry is scrolled
 * into view inside it (never the page).
 *
 * Single-page apps: the list is drawn from copies of the children, so a router's own click
 * handlers on them do not run. Listen for `uvalib-contents-navigate` and cancel it to route in
 * place; hash links need nothing.
 *
 * @tagname uvalib-contents
 * @fires uvalib-analytics-event - For `<site-analytics>`: a click on an entry, `['uvalib-contents', 'link-click', 'level <N>', <N>]` (N from 1, the top level), and opening or closing the disclosure, `['uvalib-contents', 'toggle', 'open' | 'close']`; never the label or URL. Bubbles and is composed.
 * @fires uvalib-contents-navigate - A plain click on an entry: `detail` is `{ href, level }` (href as written). Cancel it (`preventDefault()`) to navigate in the app; the click's default is then prevented. Bubbles and is composed.
 * @cssprop [--uvalib-contents-sticky-top=1rem] - With `sticky`: the gap kept above it.
 * @cssprop [--uvalib-contents-max-height=none] - The list's maximum height on wide screens (it scrolls beyond it); with `sticky`, the window's height less twice the sticky gap.
 * @cssprop [--uva-blue-alt-dark=#005679] - Link colour.
 * @cssprop [--uva-brand-blue=#232d4b] - The current entry's bar.
 * @cssprop [--uva-brand-orange=#e57200] - The nested levels' bar.
 * @cssprop [--uva-grey-darkest=#2b2b2b] - Text and current entry colour.
 * @cssprop --uva-color-utility-link - Dark-mode role token: link colour (else `--uva-blue-alt-dark`).
 * @cssprop --uva-color-text - Dark-mode role token: text and current entry (else `--uva-grey-darkest`).
 * @cssprop --uva-color-link - Dark-mode role token: the current entry's bar and the button's text (else `--uva-brand-blue`).
 * @cssprop --uva-color-current - Dark-mode role token: the nested levels' bar (else `--uva-brand-orange`).
 * @cssprop --uva-color-border - Dark-mode role token: dividers (else #dadada).
 * @cssprop --uva-color-control-border - Dark-mode role token: the button's border (else #808080).
 * @cssprop --uva-color-surface-raised - Dark-mode role token: the button's background (else #fff).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 */
export class UvalibContents extends UvalibElement {
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
      :host([sticky]:not([data-narrow])) {
        position: sticky;
        top: var(--uvalib-contents-sticky-top, 1rem);
        align-self: start;
      }
      .headline {
        margin: 0 0 0.5rem;
        font-size: 1.125rem;
        font-weight: 700;
        line-height: 1.3;
      }
      .panel {
        max-height: var(--uvalib-contents-max-height, none);
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      :host([sticky]:not([data-narrow])) .panel {
        max-height: var(
          --uvalib-contents-max-height,
          calc(100dvh - 2 * var(--uvalib-contents-sticky-top, 1rem) - 3rem)
        );
      }
      :host([data-narrow]) .panel {
        max-height: none;
        overflow: visible;
      }
      .panel > :is(ol, ul) {
        border-block: 1px solid var(--uva-color-border, var(--uva-grey-100, #dadada));
      }
      .panel > :is(ol, ul) > li + li {
        border-top: 1px solid var(--uva-color-border, var(--uva-grey-100, #dadada));
      }
      li :is(ol, ul) {
        margin: 0 0 0.5rem 0.75rem;
        padding: 0;
        border-inline-start: 2px solid var(--uva-color-current, var(--uva-brand-orange, #e57200));
      }
      a,
      .group {
        display: block;
        padding: 0.5rem 0.75rem 0.5rem calc(0.75rem + 4px);
      }
      li li > :is(a, .group) {
        padding-block: 0.25rem;
      }
      .group {
        font-weight: 700;
      }
      a {
        color: var(--uva-color-utility-link, var(--uva-blue-alt-dark, #005679));
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
      a[aria-current] {
        padding-inline-start: 0.75rem;
        border-inline-start: 4px solid var(--uva-color-link, var(--uva-brand-blue, #232d4b));
        color: inherit;
        font-weight: 700;
      }
      .panel a:focus-visible {
        outline-offset: -3px;
      }
      .toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        box-sizing: border-box;
        width: 100%;
        min-height: 44px;
        margin: 0;
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--uva-color-control-border, var(--uva-grey, #808080));
        border-radius: 0.3rem;
        background: var(--uva-color-surface-raised, #fff);
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
        font: inherit;
        font-weight: 700;
        text-align: start;
        cursor: pointer;
      }
      .toggle::after {
        content: '';
        flex: none;
        width: 0.5em;
        height: 0.5em;
        margin-block-end: 0.25em;
        border-inline-end: 2px solid currentColor;
        border-block-end: 2px solid currentColor;
        transform: rotate(45deg);
      }
      .toggle[aria-expanded='true']::after {
        margin-block: 0.25em 0;
        transform: rotate(225deg);
      }
      :host([data-narrow]) .headline {
        margin-bottom: 0;
      }
      :host([data-narrow]) .panel {
        margin-top: 0.5rem;
      }
    `,
  ];

  /** Accessible name of the navigation landmark, and its visible headline. */
  @property({ type: String }) label = DEFAULT_LABEL;

  /** The headline's level (2 to 6), for the page's outline. */
  @property({ type: Number, attribute: 'heading-level' }) headingLevel = DEFAULT_LEVEL;

  /**
   * The URL of the current entry (resolved like the links), for apps whose route is not the
   * page URL. Unset: the page URL, followed through same-document navigations.
   */
  @property({ type: String }) current?: string;

  /**
   * The viewport width at and below which the list collapses into a disclosure: a CSS length
   * (`64rem`, `800px`). `0` or `none` never collapses.
   */
  @property({ type: String, attribute: 'collapse-below' }) collapseBelow = DEFAULT_COLLAPSE;

  /** Whether the collapsed disclosure is open (no effect on wide screens). Toggled by its button. */
  @property({ type: Boolean, reflect: true }) open = false;

  /** Keep it in view while the page scrolls (a sidebar), on wide screens. */
  @property({ type: Boolean, reflect: true }) sticky = false;

  /**
   * The entries as data, for apps that build them in JavaScript: `{ label, href?, children? }`.
   * Wins over the children while set; `undefined` goes back to them. Entries without a label
   * are skipped (with their children) with one console warning.
   */
  @property({ attribute: false }) items?: ContentsItem[];

  /** The entries read from the children. */
  @state() private childItems: Entry[] = [];
  /** The root list's element in the source (`ol` or `ul`). */
  @state() private ordered = false;
  @state() private narrow = false;
  /** The page URL, updated on same-document navigations. */
  @state() private here = '';

  private warned = new Set<string>();
  private readonly panelId = `uvalib-contents-${++uid}`;
  private mql?: MediaQueryList;
  /** What was last scrolled into view, so the list is not scrolled again on every update. */
  private scrolledTo?: string;

  constructor() {
    super();
    new SourceChildren(
      this,
      () => this.lightDom,
      (nodes) => this.read(nodes),
    );
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
    this.here = this.ownerDocument.defaultView?.location.href ?? '';
    this.listenLocation(true);
    this.watchWidth();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.listenLocation(false);
    this.mql?.removeEventListener('change', this.onWidth);
    this.mql = undefined;
  }

  private onLocation = (): void => {
    this.here = this.ownerDocument.defaultView?.location.href ?? '';
  };

  private listening = false;
  private listenLocation(on: boolean): void {
    const win = this.ownerDocument.defaultView;
    if (!win || on === this.listening) return;
    this.listening = on;
    const nav = (win as Window & { navigation?: EventTarget }).navigation;
    const targets: [EventTarget, string][] = [
      [win, 'popstate'],
      [win, 'hashchange'],
      ...(nav ? [[nav, 'currententrychange'] as [EventTarget, string]] : []),
    ];
    for (const [t, type] of targets) {
      if (on) t.addEventListener(type, this.onLocation);
      else t.removeEventListener(type, this.onLocation);
    }
  }

  private onWidth = (): void => {
    this.narrow = !!this.mql?.matches;
  };

  /** Follow the viewport against `collapse-below`. */
  private watchWidth(): void {
    this.mql?.removeEventListener('change', this.onWidth);
    const win = this.ownerDocument.defaultView;
    const below = normalize(this.collapseBelow) || DEFAULT_COLLAPSE;
    this.mql =
      win && !/^(none|0+(\.0*)?[a-z%]*)$/i.test(below)
        ? win.matchMedia(`(max-width: ${below})`)
        : undefined;
    if (this.mql?.media === 'not all') {
      this.warnOnce('collapse', `ignoring collapse-below="${below}" (not a CSS length).`);
      this.mql = win?.matchMedia(`(max-width: ${DEFAULT_COLLAPSE})`);
    }
    this.mql?.addEventListener('change', this.onWidth);
    this.onWidth();
  }

  private warnOnce(kind: string, message: string): void {
    if (this.warned.has(kind)) return;
    this.warned.add(kind);
    console.warn(`${this.localName}: ${message}`);
  }

  /** Read the entries from the first list among the children. */
  private read(nodes: Node[]): void {
    let list: Element | null = null;
    for (const n of nodes) {
      if (!(n instanceof Element)) continue;
      list = n.matches('ol, ul') ? n : n.querySelector('ol, ul');
      if (list) break;
    }
    const items = list ? this.parse(list) : [];
    const ordered = list?.localName === 'ol';
    if (ordered !== this.ordered) this.ordered = ordered;
    // Only a real change re-renders.
    if (entriesKey(items) !== entriesKey(this.childItems)) this.childItems = items;
  }

  private parse(list: Element): Entry[] {
    const out: Entry[] = [];
    for (const li of list.children) {
      if (li.localName !== 'li') continue;
      const sub = [...li.children].find((c) => c.matches('ol, ul'));
      const a = [...li.querySelectorAll('a[href]')].find((x) => x.closest('li') === li);
      // The entry's own text: the link's, or the item's without its sub-list.
      const label = normalize(
        a
          ? a.textContent
          : [...li.childNodes]
              .filter((c) => c !== sub)
              .map((c) => c.textContent)
              .join(' '),
      );
      const children = sub ? this.parse(sub) : [];
      if (!label) {
        this.warnOnce('label', 'ignoring entries with no text (each needs a label).');
        continue;
      }
      const entry: Entry = { label, children };
      if (a) entry.href = a.getAttribute('href')!;
      const mark = markOf(a?.getAttribute('aria-current'));
      if (mark) entry.mark = mark;
      const own = langDir(a);
      if (own.lang !== undefined) entry.lang = own.lang;
      if (own.dir) entry.dir = own.dir;
      const item = langDir(li);
      if (item.lang !== undefined) entry.itemLang = item.lang;
      if (item.dir) entry.itemDir = item.dir;
      const copy = inlineCopy(
        a ? a.childNodes : [...li.childNodes].filter((c) => c !== sub),
        this.ownerDocument,
      );
      if (copy.rich) {
        entry.rich = copy.key;
        entry.nodes = copy.nodes;
      }
      out.push(entry);
    }
    return out;
  }

  private fromItems(items: readonly ContentsItem[]): Entry[] {
    const out: Entry[] = [];
    for (const i of items) {
      const label = normalize(i?.label);
      if (!label) {
        this.warnOnce('label', 'ignoring entries with no text (each needs a label).');
        continue;
      }
      const entry: Entry = { label, children: this.fromItems(i.children ?? []) };
      if (i.href != null) entry.href = String(i.href);
      out.push(entry);
    }
    return out;
  }

  /** What is shown: `items` while set, else the children; unsafe hrefs made plain text. */
  private get entries(): Entry[] {
    const base = this.ownerDocument.baseURI;
    const clean = (list: Entry[]): Entry[] =>
      list.map((e) => {
        const children = clean(e.children);
        if (e.href === undefined || safeHref(e.href, base)) return { ...e, children };
        this.warnOnce(
          'href',
          'showing an entry as text: its href is not http(s), mailto, tel or relative.',
        );
        const rest: Entry = { ...e, children };
        delete rest.href;
        delete rest.mark;
        return rest;
      });
    return clean(this.items ? this.fromItems(this.items) : this.childItems);
  }

  /** The current entries: the page's and its section's. */
  private currentOf(entries: Entry[]): Map<Entry, Current> {
    const flat: Entry[] = [];
    const walk = (l: Entry[]) => l.forEach((e) => (flat.push(e), walk(e.children)));
    walk(entries);
    const found = new Map<Entry, Current>();
    // The author's marks, on links only (a group or an unsafe link has none): the first
    // `page` and the first `location`.
    const marked = flat.filter((e) => e.mark && e.href !== undefined);
    if (!this.current && marked.length) {
      for (const kind of ['page', 'location'] as const) {
        const e = marked.find((m) => m.mark === kind);
        if (e) found.set(e, kind);
      }
      return found;
    }
    const base = this.ownerDocument.baseURI;
    const here = this.here || base;
    let target: URL;
    try {
      // A hash-only href is a place on this page, whatever the base URL (about:srcdoc frames).
      const c = this.current || here;
      target = new URL(c, c.startsWith('#') ? here : base);
    } catch {
      return found;
    }
    // Entries' hash-only hrefs are places on the target page (the current URL, or `current`).
    const resolve = (h: string) => new URL(h, h.startsWith('#') ? target.href : base);
    const key = pageKey(target);
    const query = queryKey(target);
    const same = flat.flatMap((e) => {
      if (e.href === undefined) return [];
      try {
        const u = resolve(e.href);
        // An entry with a query names that query (?part=2); one without matches the page
        // whatever its query (tracking parameters).
        if (pageKey(u) !== key || (u.search && queryKey(u) !== query)) return [];
        return [{ e, hash: u.hash }];
      } catch {
        return [];
      }
    });
    const page = same.find((s) => !s.hash);
    if (page) found.set(page.e, 'page');
    const section = target.hash && same.find((s) => s.hash === target.hash);
    if (section) found.set(section.e, 'location');
    return found;
  }

  private get level(): number {
    const n = Math.trunc(Number(this.headingLevel));
    return n >= 2 && n <= 6 ? n : DEFAULT_LEVEL;
  }

  private toggle(): void {
    this.open = !this.open;
    trackEvent(this, ['uvalib-contents', 'toggle', this.open ? 'open' : 'close']);
  }

  /**
   * A plain click on an entry fires a cancelable `uvalib-contents-navigate`; a router that
   * cancels it navigates itself (the click's default is prevented too).
   */
  private onClick(e: MouseEvent): void {
    const a = (e.target as Element | null)?.closest?.('a[href]');
    if (!a || !this.renderRoot.contains(a)) return;
    // Analytics: the entry's level (1 is the top), never its label or URL.
    const level = Number(a.getAttribute('data-level'));
    trackEvent(this, ['uvalib-contents', 'link-click', `level ${level}`, level]);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    const go = new CustomEvent('uvalib-contents-navigate', {
      detail: { href: a.getAttribute('href'), level },
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    if (!this.dispatchEvent(go)) e.preventDefault();
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has('collapseBelow') && this.isConnected) this.watchWidth();
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.toggleAttribute('data-narrow', this.narrow);
    this.toggleAttribute('data-empty', !this.entries.length);
    this.reveal();
  }

  /** Scroll the list (never the page) so the current entry shows, once per entry and opening. */
  private reveal(): void {
    const panel = this.renderRoot.querySelector<HTMLElement>(`#${this.panelId}`);
    const links = panel ? [...panel.querySelectorAll<HTMLElement>('a[aria-current]')] : [];
    const a = links.find((l) => l.getAttribute('aria-current') === 'location') ?? links[0];
    if (!panel || !a || panel.hidden) return;
    const key = `${a.getAttribute('href')}|${this.narrow}|${this.open}`;
    if (key === this.scrolledTo) return;
    this.scrolledTo = key;
    if (panel.scrollHeight <= panel.clientHeight) return;
    const p = panel.getBoundingClientRect();
    const r = a.getBoundingClientRect();
    if (r.top >= p.top && r.bottom <= p.bottom) return;
    panel.scrollTop += r.top - p.top - (p.height - r.height) / 2;
  }

  private renderList(
    entries: Entry[],
    current: Map<Entry, Current>,
    level: number,
  ): TemplateResult {
    const items = entries.map((e) => {
      const mark = current.get(e);
      // Fresh copies of the label's inline markup each render (a node can be in one place).
      const text = e.nodes ? e.nodes.map((n) => n.cloneNode(true)) : e.label;
      const own =
        e.href !== undefined
          ? html`<a
              href=${e.href}
              data-level=${level}
              aria-current=${mark ?? nothing}
              lang=${e.lang ?? nothing}
              dir=${e.dir ?? nothing}
              >${text}</a
            >`
          : html`<span class="group" lang=${e.lang ?? nothing} dir=${e.dir ?? nothing}
              >${text}</span
            >`;
      return html`<li role="listitem" lang=${e.itemLang ?? nothing} dir=${e.itemDir ?? nothing}>
        ${own}${e.children.length ? this.renderList(e.children, current, level + 1) : nothing}
      </li>`;
    });
    // role="list": Safari drops the list semantics of a list styled without markers.
    return this.ordered
      ? html`<ol role="list">
          ${items}
        </ol>`
      : html`<ul role="list">
          ${items}
        </ul>`;
  }

  protected override render() {
    const entries = this.entries;
    const label = normalize(this.label) || DEFAULT_LABEL;
    const h = unsafeStatic(`h${this.level}`);
    const collapsed = this.narrow && !this.open;
    const headline = this.narrow
      ? html`<button
          type="button"
          class="toggle"
          aria-expanded=${this.open ? 'true' : 'false'}
          aria-controls=${this.panelId}
          @click=${this.toggle}
        >
          ${label}
        </button>`
      : label;
    // The heading's tag changes the inner template only: the <nav> (in light DOM, a child
    // of the element) is never replaced.
    return html`<nav aria-label=${label} ?hidden=${!entries.length} @click=${this.onClick}>
      ${html`<${h} class="headline">${headline}</${h}>`}
      <div class="panel" id=${this.panelId} ?hidden=${collapsed}>
        ${this.renderList(entries, this.currentOf(entries), 1)}
      </div>
    </nav>`;
  }
}
