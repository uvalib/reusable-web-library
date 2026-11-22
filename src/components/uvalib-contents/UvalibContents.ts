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
const DEFAULT_LEVELS = '2-3';
const DEFAULT_MIN = 2;
let uid = 0;

/** What is watched in the `headings-from` element: headings added, removed or retitled. */
const HEADINGS: MutationObserverInit = { childList: true, characterData: true, subtree: true };

/**
 * An id from a heading's text: lowercase ASCII (accents dropped), runs of anything else as
 * one `-`, none at either end; `section` when nothing is left.
 */
const slugify = (text: string): string =>
  text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';

/** A heading's text, leaving out what is hidden from assistive technology (a `#` permalink). */
const headingText = (h: Element): string => {
  let text = '';
  const walk = (n: Node) => {
    if (n instanceof Element && n.getAttribute('aria-hidden') === 'true') return;
    if (n.nodeType === Node.TEXT_NODE) text += n.textContent;
    else n.childNodes.forEach(walk);
  };
  walk(h);
  return normalize(text);
};

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
 * A table of contents for a long document: `headings-from="#article"` builds the list from the
 * headings in that element (`levels`, `2-3` by default; nothing shown below `min` top-level
 * entries, 2 by default). Headings without text or hidden with `aria-hidden` are skipped;
 * one without an id gets one from its text (`budget-report`, then `budget-report-2`), and
 * existing ids are kept, so links to sections keep working. It follows headings added,
 * removed or retitled; `refresh()` reads them again after other changes. The children and
 * `items` win while they give a list. Without JavaScript there is no list: a list rendered
 * at build time, as children, works everywhere.
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
      /* Balanced, but not when narrow: the headline is then a bordered button, and balanced
         lines would leave empty space inside its box. */
      :host(:not([data-narrow])) .headline {
        text-wrap: balance;
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

  /**
   * Build the list from the headings in the element this selector names (`#article`): each
   * heading at `levels` gets an entry linking to it (an id is added when it has none), the
   * lower levels nested under the heading before them. The children and `items` win while
   * they give a list.
   */
  @property({ type: String, attribute: 'headings-from' }) headingsFrom?: string;

  /** With `headings-from`: the heading levels to list, `2-3` (the default) or one level, `2`. */
  @property({ type: String }) levels = DEFAULT_LEVELS;

  /**
   * With `headings-from`: the fewest top-level entries worth a list (default 2). With fewer,
   * nothing is shown.
   */
  @property({ type: Number }) min = DEFAULT_MIN;

  /** The entries built from the headings (`headings-from`). */
  @state() private headingItems: Entry[] = [];
  private headingsObserver?: MutationObserver;
  private headingsScope?: Element | null;
  private headingsQueued = false;
  private scrolledToHash = false;

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
    // Reconnected: the headings may have changed meanwhile (the first time, willUpdate reads).
    if (this.hasUpdated) this.refresh();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.headingsObserver?.disconnect();
    this.headingsScope = undefined;
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

  /**
   * With `headings-from`: read the headings again, adding ids to new ones. Headings added,
   * removed or retitled are followed by themselves; call this after other changes (an
   * `aria-hidden` set or a heading's level changed).
   */
  refresh(): void {
    const sel = normalize(this.headingsFrom);
    let scope: Element | null = null;
    if (sel) {
      const root = this.getRootNode();
      const finder =
        root instanceof Document || root instanceof ShadowRoot ? root : this.ownerDocument;
      try {
        scope = finder.querySelector(sel);
      } catch {
        scope = null;
      }
      if (!scope && this.ownerDocument.readyState === 'loading') {
        // Still parsing: try again once the document is read.
        this.ownerDocument.addEventListener('DOMContentLoaded', () => this.refresh(), {
          once: true,
        });
      } else if (!scope) {
        this.warnOnce('headings-from', `no element matches headings-from="${sel}".`);
      }
    }
    if (scope !== this.headingsScope) {
      this.headingsScope = scope;
      this.headingsObserver?.disconnect();
      if (scope) {
        this.headingsObserver ??= new MutationObserver(() => this.queueHeadings());
        this.headingsObserver.observe(scope, HEADINGS);
      }
    }
    const items = scope ? this.fromHeadings(scope) : [];
    if (entriesKey(items) !== entriesKey(this.headingItems)) this.headingItems = items;
  }

  /** Several changes at once read the headings once. */
  private queueHeadings(): void {
    if (this.headingsQueued) return;
    this.headingsQueued = true;
    queueMicrotask(() => {
      this.headingsQueued = false;
      if (this.isConnected) this.refresh();
    });
  }

  /** The heading levels to list, from `levels`. */
  private get headingRange(): [number, number] {
    const m = /^\s*([1-6])\s*(?:-\s*([1-6]))?\s*$/.exec(String(this.levels ?? ''));
    if (!m) {
      this.warnOnce(
        'levels',
        `ignoring levels="${this.levels}" (use a level, 2, or a range, 2-3).`,
      );
      return [2, 3];
    }
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    return [Math.min(a, b), Math.max(a, b)];
  }

  /**
   * The entries for the headings in `scope`, in document order: empty and `aria-hidden` ones
   * and those inside this element skipped; an id added to each without one (a slug of its
   * text, unique with `-2`, `-3`…); each nested under the previous higher-level heading.
   * Fewer than `min` top-level entries: none.
   */
  private fromHeadings(scope: Element): Entry[] {
    const [lo, hi] = this.headingRange;
    const selector = Array.from({ length: hi - lo + 1 }, (_, i) => `h${lo + i}`).join(', ');
    const root = scope.getRootNode() as Document | ShadowRoot;
    const top: Entry[] = [];
    const open: { level: number; entry: Entry }[] = [];
    const added: Element[] = [];
    for (const h of scope.querySelectorAll(selector)) {
      if (this.contains(h) || h.closest('[aria-hidden="true"]')) continue;
      const label = headingText(h);
      if (!label) continue;
      if (!h.id) {
        const base = slugify(label);
        let id = base;
        for (let n = 2; root.getElementById(id); n++) id = `${base}-${n}`;
        h.id = id;
        added.push(h);
      }
      const level = Number(h.localName.slice(1));
      const entry: Entry = { label, href: `#${h.id}`, children: [] };
      while (open.length && open[open.length - 1]!.level >= level) open.pop();
      (open.length ? open[open.length - 1]!.entry.children : top).push(entry);
      open.push({ level, entry });
    }
    this.scrollToAdded(added);
    const min = Number.isFinite(Number(this.min)) ? Math.trunc(Number(this.min)) : DEFAULT_MIN;
    return top.length >= min ? top : [];
  }

  /**
   * The page was opened at a section whose heading had no id until now: go there, as the
   * browser would have (once).
   */
  private scrollToAdded(added: Element[]): void {
    if (this.scrolledToHash || !added.length) return;
    const hash = this.ownerDocument.defaultView?.location.hash.slice(1);
    if (!hash) return;
    let id = hash;
    try {
      id = decodeURIComponent(hash);
    } catch {
      /* keep it as written */
    }
    const h = added.find((a) => a.id === id);
    if (!h) return;
    this.scrolledToHash = true;
    requestAnimationFrame(() => h.scrollIntoView());
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
    return clean(
      this.items
        ? this.fromItems(this.items)
        : this.fromHeadingsNow
          ? this.headingItems
          : this.childItems,
    );
  }

  /** Whether the list shown is the one built from the headings (no items, no child list). */
  private get fromHeadingsNow(): boolean {
    return !this.items && !this.childItems.length && !!this.headingItems.length;
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
    if (
      (changed.has('headingsFrom') || changed.has('levels') || changed.has('min')) &&
      this.isConnected
    )
      this.refresh();
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
    // role="list": Safari drops the list semantics of a list styled without markers. A list
    // built from headings is an <ol>: the document's order.
    return this.ordered || this.fromHeadingsNow
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
