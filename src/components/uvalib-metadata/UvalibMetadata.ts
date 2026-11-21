import { css, html, nothing, unsafeCSS, type PropertyValues, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { trackEvent } from '../../base/analytics.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { langDir } from '../../base/inline-copy.js';
import { normalize, safeHref, SourceChildren } from '../../base/source-children.js';
import { accessible } from '../../styles/accessible.js';
import { rightsName, specialCollectionsCitation } from './rights.js';

/** A link value: a download when it has `download` or a `size` ("EPUB · 184 KB"). */
export interface MetadataLink {
  label: string;
  href: string;
  /** The file's size as shown, such as `184 KB`. */
  size?: string;
  /** The `download` attribute: `true` for an empty one, a string for a file name. */
  download?: boolean | string;
}

/** One value: text, or a link. */
export type MetadataValue = string | number | MetadataLink;

/** A row: its label and one value, or several (shown as a list). */
export interface MetadataItem {
  label: string;
  value: MetadataValue | MetadataValue[];
  /** A list value: show this many and a “Show all N” button (0: no limit). Wins over `list-limit`. */
  limit?: number;
  /** The noun in “Show all 34 participants”, instead of the label with a lowercase first letter. */
  limitLabel?: string;
}

/**
 * A value as drawn: a template or text (from `items`), or `source`, prepared copies of an
 * author's `<dd>` content that are never inserted themselves (each render set clones them).
 * `lang`/`dir` come from the source `<dd>`.
 */
interface Value {
  content?: TemplateResult | string;
  source?: Node[];
  lang?: string;
  dir?: string;
  /** A list value: how many `<li>` it has. */
  count?: number;
  /** The row's own limit (`data-limit`), winning over `list-limit`. */
  limit?: number;
  /** The noun in the toggle (`data-limit-label`). */
  limitLabel?: string;
}

/** A row as drawn; `lang`/`dir` come from the source `<dt>`. */
interface Row {
  label: string;
  lang?: string;
  dir?: string;
  values: Value[];
}

const RIGHTS_INFO_TEXT = 'More about rights and permissions';
const STATUS_MS = 5000;
/** The list in a value: a `<ul>` or `<ol>` that is a direct child of the `<dd>`. */
const LIST = ':scope > ul, :scope > ol';
/** What takes focus inside a revealed value, before the value itself. */
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** A limit: a whole number of at least 0, else undefined. */
const limitOf = (v: unknown): number | undefined => {
  if (v === null || v === undefined || (typeof v === 'string' && !v.trim())) return undefined;
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? Math.max(0, n) : undefined;
};

let instances = 0;

/**
 * The rules kept with `no-style`: unmarked value lists, the terms and values stacked, the
 * visually hidden text hidden, and `[hidden]` hides.
 */
const structuralRules = (host: string) => `
  ${host} { display: block; }
  ${host} dl, ${host} dd { margin: 0; }
  ${host} dd :is(ul, ol) { list-style: none; margin: 0; padding: 0; }
  ${host} :where(.more) {
    display: inline-flex;
    align-items: center;
    box-sizing: border-box;
    min-height: 24px;
    min-width: 24px;
    margin-top: 0.25rem;
  }
  ${host}[hidden], ${host} [hidden] { display: none !important; }
`;
const shadowStructure = unsafeCSS(structuralRules(':host'));

/**
 * A record's details as a description list, as on the library's digital collections: label
 * and value side by side on wide screens (the element's own width, 36rem and up), stacked on
 * narrow ones. Values may be text, links or lists (subjects).
 *
 * Give the rows as a `<dl>` child (so the page reads the same before the script loads):
 * `<dt>` labels and `<dd>` values, optionally wrapped in a `<div>` per row; several `<dd>`
 * after one `<dt>` are several values. The values are copied as written (links, lists,
 * `download` attributes kept); a link with `data-size="184 KB"` is shown as a download,
 * "EPUB · 184 KB". The list follows changes to the children. Apps set the `items`
 * property instead (`{ label, value }`, winning over the children while set).
 *
 * Built-in rows for credit and rights (as Special Collections asks): `creator` and
 * `organization` come first; `rights` (a rightsstatements.org or Creative Commons URL, shown
 * as its short name linked to it, or plain text) and `citation` ("How to cite", with a Copy
 * citation button that announces "Copied" politely) come last. `citation-title` builds the
 * Special Collections citation, "<title>, Albert and Shirley Small Special Collections
 * Library, University of Virginia".
 *
 * Long lists: `list-limit="8"` shortens every value that is a list (a `<ul>`/`<ol>` in the
 * `<dd>`) of more than 8 items to its first 8 and a “Show all 34 participants” button
 * (`aria-expanded`, `aria-controls`) that reveals the rest in place and moves focus to the
 * first one; it then reads “Show fewer”. `data-limit` on a `<dd>` or its list sets that row's
 * own limit (`0`: none); the noun is the label with a lowercase first letter, or
 * `data-limit-label`. Every value stays in the markup (the hidden ones `hidden`).
 *
 * @tagname uvalib-metadata
 * @fires uvalib-analytics-event - For `<site-analytics>`: the Copy citation button, `['uvalib-metadata', 'copy-citation']`, and a list's toggle, `['uvalib-metadata', 'show-all'|'show-fewer', 'row N']` (N from 1, the row's place in the list; never its label or values). Downloads are left to Matomo's own download tracking. Bubbles and is composed.
 * @cssprop [--uva-blue-alt-dark=#005679] - Link colour.
 * @cssprop [--uva-grey-darkest=#2b2b2b] - Value colour.
 * @cssprop --uva-color-utility-link - Dark-mode role token: link colour (else `--uva-blue-alt-dark`).
 * @cssprop --uva-color-text - Dark-mode role token: value colour (else `--uva-grey-darkest`).
 * @cssprop --uva-color-text-muted - Dark-mode role token: label and status colour (else #4b5563).
 * @cssprop --uva-color-border - Dark-mode role token: row dividers (else #dadada).
 * @cssprop --uva-color-link - Dark-mode role token: the buttons' text and the Copy citation button's border (else `--uva-brand-blue`).
 * @cssprop --uva-color-surface-raised - Dark-mode role token: the button's background (else #fff).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 */
export class UvalibMetadata extends UvalibElement {
  static styles = [
    accessible,
    shadowStructure,
    css`
      :host {
        container-type: inline-size;
        font-size: 1rem;
        line-height: 1.5;
        color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
        overflow-wrap: anywhere;
      }
      .row {
        display: grid;
        grid-template-columns: minmax(7rem, 12rem) minmax(0, 1fr);
        column-gap: 1.5rem;
        padding-block: 0.5rem;
        border-top: 1px solid var(--uva-color-border, var(--uva-grey-100, #dadada));
      }
      .row:first-child {
        border-top: 0;
      }
      dt {
        grid-column: 1;
        color: var(--uva-color-text-muted, #4b5563);
        font-weight: 700;
      }
      dd {
        grid-column: 2;
      }
      @container (width < 36rem) {
        .row {
          grid-template-columns: minmax(0, 1fr);
        }
        dt,
        dd {
          grid-column: 1;
        }
      }
      dd li + li {
        margin-top: 0.25rem;
      }
      a {
        color: var(--uva-color-utility-link, var(--uva-blue-alt-dark, #005679));
        text-decoration: underline;
      }
      .citation {
        margin: 0 0 0.5rem;
      }
      .copy {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem 0.75rem;
      }
      .uvalib-button {
        min-height: 44px;
        padding: 0.25rem 0.75rem;
        border: 1px solid var(--uva-color-link, var(--uva-brand-blue, #232d4b));
        border-radius: 0.3rem;
        background: var(--uva-color-surface-raised, #fff);
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
        font: inherit;
        cursor: pointer;
      }
      .status {
        color: var(--uva-color-text-muted, #4b5563);
      }
      /* As <uvalib-tag-list>'s Show all: an underlined text button, 2rem square at least. */
      .more {
        min-height: 2rem;
        min-width: 2rem;
        padding: 0.15rem 0;
        border: 0;
        background: none;
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
        font: inherit;
        text-align: start;
        text-decoration: underline;
        cursor: pointer;
      }
      @media (forced-colors: active) {
        .more {
          color: ButtonText;
        }
      }
    `,
  ];

  /** The creator (author, photographer…), shown first. */
  @property({ type: String }) creator?: string;

  /** The organization holding or crediting the item, shown after the creator. */
  @property({ type: String }) organization?: string;

  /**
   * The rights statement: a rightsstatements.org or Creative Commons URL (shown as its short
   * name, linked), another http(s) URL (shown as `rights-label`, or "Rights statement"), or
   * plain text.
   */
  @property({ type: String }) rights?: string;

  /** The link text for a `rights` URL, instead of its short name. */
  @property({ type: String, attribute: 'rights-label' }) rightsLabel?: string;

  /**
   * A "More about rights and permissions" link under the statement, such as
   * `https://www.library.virginia.edu/policies/use-of-materials`.
   */
  @property({ type: String, attribute: 'rights-info' }) rightsInfo?: string;

  /** "How to cite": the citation, as written. Wins over `citation-title`. */
  @property({ type: String }) citation?: string;

  /**
   * A title or collection name for the Special Collections citation: "<title>, Albert and
   * Shirley Small Special Collections Library, University of Virginia".
   */
  @property({ type: String, attribute: 'citation-title' }) citationTitle?: string;

  /**
   * The rows as data, for apps that build them in JavaScript: `{ label, value }`, a value
   * being text, a link `{ label, href, size?, download? }` or an array of them (a list).
   * Wins over the children while set; `undefined` goes back to them.
   */
  @property({ attribute: false }) items?: MetadataItem[];

  /**
   * Shorten every list value of more than this many items to its first ones and a “Show all
   * N” button. Zero or empty shows every item. A row's `data-limit` wins.
   */
  @property({ type: Number, attribute: 'list-limit' }) listLimit?: number;

  @state() private childRows: Row[] = [];
  /** The list values shown in full (after Show all), by `row-value` place. */
  private open = new Set<string>();
  /** The items this element hid, so that only those are shown again. */
  private hid = new WeakSet<Element>();
  private readonly uid = `uvalib-metadata-${++instances}`;
  /** The Copy citation button's result, announced politely. */
  @state() private status = '';

  private sourceKey = '';
  private warned = new Set<string>();
  private timer?: ReturnType<typeof setTimeout>;

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
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this.timer);
    this.status = '';
  }

  private warnOnce(kind: string, message: string): void {
    if (this.warned.has(kind)) return;
    this.warned.add(kind);
    console.warn(`${this.localName}: ${message}`);
  }

  /** Read the rows from the first `<dl>` among the children. */
  private read(nodes: Node[]): void {
    let dl: Element | null = null;
    for (const n of nodes) {
      if (!(n instanceof Element)) continue;
      dl = n.localName === 'dl' ? n : n.querySelector('dl');
      if (dl) break;
    }
    const key = dl?.outerHTML ?? '';
    // Only a real change re-renders.
    if (key === this.sourceKey) return;
    this.sourceKey = key;
    this.childRows = dl ? this.parse(dl) : [];
  }

  private parse(dl: Element): Row[] {
    const cells = [...dl.children].flatMap((c) => (c.localName === 'div' ? [...c.children] : [c]));
    const rows: Row[] = [];
    let row: Row | undefined;
    for (const c of cells) {
      if (c.localName === 'dt') {
        const label = normalize(c.textContent);
        if (!label) continue;
        // Several <dt> before their values name one row.
        if (row && !row.values.length) row.label += ` / ${label}`;
        else rows.push((row = { label, values: [], ...langDir(c) }));
      } else if (c.localName === 'dd') {
        if (!row) {
          this.warnOnce('dd', 'ignoring a <dd> with no <dt> before it.');
          continue;
        }
        const value: Value = { source: [...c.childNodes].map((n) => this.copy(n)), ...langDir(c) };
        const list = c.querySelector(LIST);
        if (list) {
          value.count = list.querySelectorAll(':scope > li').length;
          const limit = limitOf(c.getAttribute('data-limit') ?? list.getAttribute('data-limit'));
          if (limit !== undefined) value.limit = limit;
          const noun = normalize(
            c.getAttribute('data-limit-label') ?? list.getAttribute('data-limit-label'),
          );
          if (noun) value.limitLabel = noun;
        }
        row.values.push(value);
      }
    }
    return rows.filter((r) => r.values.length);
  }

  /**
   * A copy of an author's node: links with an unsafe href (javascript:, data:, …) replaced
   * by their content, with one warning; sizes added to downloads once (not when the link's
   * text already ends with it), `data-size` dropped; ids dropped in light DOM.
   */
  private copy(n: Node): Node {
    const clone = n.cloneNode(true);
    if (!(clone instanceof Element)) return clone;
    const base = this.ownerDocument.baseURI;
    const unsafe: Element[] = [];
    for (const el of [clone, ...clone.querySelectorAll('*')]) {
      if (this.lightDom) el.removeAttribute('id');
      el.removeAttribute('data-limit');
      el.removeAttribute('data-limit-label');
      if (el.localName !== 'a') continue;
      const href = el.getAttribute('href');
      if (href !== null && !safeHref(href, base)) {
        this.warnOnce(
          'href',
          'showing a link as text: its href is not http(s), mailto, tel or relative.',
        );
        unsafe.push(el);
      }
      const size = normalize(el.getAttribute('data-size'));
      el.removeAttribute('data-size');
      if (size && !normalize(el.textContent).endsWith(size)) el.append(this.sizeNodes(size));
    }
    // An unsafe link keeps only its content (in a <span> when it is the copied node itself).
    for (const a of unsafe.reverse()) {
      if (a !== clone) {
        a.replaceWith(...a.childNodes);
        continue;
      }
      const span = this.ownerDocument.createElement('span');
      span.append(...a.childNodes);
      return span;
    }
    return clone;
  }

  /** " · 184 KB", read as ", 184 KB". */
  private sizeNodes(size: string): DocumentFragment {
    const doc = this.ownerDocument;
    const frag = doc.createDocumentFragment();
    const dot = doc.createElement('span');
    dot.setAttribute('aria-hidden', 'true');
    dot.textContent = ' · ';
    const comma = doc.createElement('span');
    comma.className = 'visually-hidden';
    comma.textContent = ', ';
    frag.append(dot, comma, size);
    return frag;
  }

  private renderValue(v: MetadataValue): TemplateResult | string {
    if (v === null || v === undefined) return '';
    if (typeof v !== 'object') return String(v);
    const label = normalize(v.label);
    const href = v.href == null ? '' : String(v.href);
    if (!href || !safeHref(href, this.ownerDocument.baseURI)) {
      if (href)
        this.warnOnce(
          'href',
          'showing a link as text: its href is not http(s), mailto, tel or relative.',
        );
      return label;
    }
    const size = normalize(v.size);
    const download = v.download === true ? '' : v.download || undefined;
    return html`<a href=${href} download=${download ?? nothing}
      >${label}${
        size
          ? html`<span aria-hidden="true"> · </span><span class="visually-hidden">, </span>${size}`
          : nothing
      }</a
    >`;
  }

  private fromItems(items: readonly MetadataItem[]): Row[] {
    const rows: Row[] = [];
    for (const i of items) {
      const label = normalize(i?.label);
      if (!label) {
        this.warnOnce('label', 'ignoring rows with no label.');
        continue;
      }
      const value = Array.isArray(i.value)
        ? html`<ul role="list">
            ${i.value.map((v) => html`<li>${this.renderValue(v)}</li>`)}
          </ul>`
        : this.renderValue(i.value);
      const v: Value = { content: value };
      if (Array.isArray(i.value)) {
        v.count = i.value.length;
        const limit = limitOf(i.limit);
        if (limit !== undefined) v.limit = limit;
        const noun = normalize(i.limitLabel);
        if (noun) v.limitLabel = noun;
      }
      rows.push({ label, values: [v] });
    }
    return rows;
  }

  /** The citation text: `citation`, else the Special Collections one for `citation-title`. */
  private get citationText(): string {
    const own = normalize(this.citation);
    if (own) return own;
    const title = normalize(this.citationTitle);
    return title ? specialCollectionsCitation(title) : '';
  }

  private renderRights(): TemplateResult | typeof nothing {
    const rights = normalize(this.rights);
    if (!rights) return nothing;
    const base = this.ownerDocument.baseURI;
    const isUrl = /^https?:\/\//i.test(rights);
    const statement = isUrl
      ? html`<a href=${rights} rel="license"
          >${normalize(this.rightsLabel) || rightsName(rights) || 'Rights statement'}</a
        >`
      : rights;
    const info = normalize(this.rightsInfo);
    const more =
      info && safeHref(info, base)
        ? html`<div><a href=${info}>${RIGHTS_INFO_TEXT}</a></div>`
        : nothing;
    return html`<div class="row">
      <dt>Rights</dt>
      <dd>
        <div>${statement}</div>
        ${more}
      </dd>
    </div>`;
  }

  private renderCitation(): TemplateResult | typeof nothing {
    const text = this.citationText;
    if (!text) return nothing;
    return html`<div class="row">
      <dt>How to cite</dt>
      <dd>
        <p class="citation">${text}</p>
        <div class="copy">
          <button type="button" class="uvalib-button" @click=${this.copyCitation}>
            Copy citation
          </button>
          <span class="status" role="status">${this.status}</span>
        </div>
      </dd>
    </div>`;
  }

  /** Copy the citation; on failure select it, so the keyboard can copy it. */
  private async copyCitation(): Promise<void> {
    trackEvent(this, ['uvalib-metadata', 'copy-citation']);
    clearTimeout(this.timer);
    // Cleared first, so a second copy is announced again.
    this.status = '';
    await this.updateComplete;
    let message = 'Copied';
    try {
      await navigator.clipboard.writeText(this.citationText);
    } catch {
      const p = this.renderRoot.querySelector('.citation');
      if (p) this.ownerDocument.getSelection()?.selectAllChildren(p);
      message = 'Could not copy: the citation is selected, copy it with your keyboard';
    }
    this.status = message;
    this.timer = setTimeout(() => (this.status = ''), STATUS_MS);
  }

  private get rows(): Row[] {
    return this.items ? this.fromItems(this.items) : this.childRows;
  }

  /** The rows' source the clones below were made for. */
  private clonedFor?: unknown;
  private clones = new WeakMap<Node[], Node[]>();

  /**
   * A value's nodes: fresh clones of its prepared source whenever the rows shown change
   * (new markup, or back from `items`), reused by unrelated updates (the citation status) so
   * that focus in a value is not lost.
   */
  private nodesOf(source: Node[]): Node[] {
    let c = this.clones.get(source);
    if (!c) this.clones.set(source, (c = source.map((n) => n.cloneNode(true))));
    return c;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.toggleAttribute('data-empty', !this.renderRoot.querySelector('.row'));
    this.applyLimits();
  }

  /** The rendered `<dl>` (in light DOM, not the author's source). */
  private get list(): HTMLElement | null {
    const root = this.renderRoot;
    return root instanceof ShadowRoot
      ? root.querySelector('dl')
      : (root as HTMLElement).querySelector(':scope > dl');
  }

  /**
   * Hide the items past each shortened list's limit (until Show all), and show again the
   * ones this element hid when the list is open or no longer shortened.
   */
  private applyLimits(): void {
    const dl = this.list;
    if (!dl) return;
    for (const dd of dl.querySelectorAll<HTMLElement>(':scope > .row > dd')) {
      const list = dd.querySelector(LIST);
      if (!list) continue;
      const key = dd.dataset.key;
      const limit = key === undefined ? Infinity : Number(dd.dataset.limit);
      const open = key !== undefined && this.open.has(key);
      [...list.children].forEach((li, i) => {
        if (!(li instanceof HTMLElement) || li.localName !== 'li') return;
        if (!open && i >= limit) {
          if (!li.hidden) this.hid.add(li);
          li.hidden = true;
        } else if (this.hid.has(li)) {
          li.hidden = false;
          this.hid.delete(li);
        }
      });
      if (key === undefined) continue;
      if (!list.id) list.id = `${this.uid}-list-${key}`;
      dd.querySelector(':scope > .more')?.setAttribute('aria-controls', list.id);
    }
  }

  /** A value's limit: its own, else `list-limit`; 0 for none. */
  private limitFor(v: Value): number {
    return v.limit ?? limitOf(this.listLimit) ?? 0;
  }

  private get locale(): string {
    return this.closest('[lang]')?.getAttribute('lang') || 'en';
  }

  /** The toggle's noun: `data-limit-label`, else the label with a lowercase first letter
   * (kept as written when it starts with an acronym, “ORCID iDs”). */
  private noun(r: Row, v: Value): TemplateResult | string {
    if (v.limitLabel) return v.limitLabel;
    const l = r.label;
    let lower = l;
    if (!/^\p{Lu}{2}/u.test(l)) {
      const first = l.charAt(0);
      try {
        lower = first.toLocaleLowerCase(r.lang || this.locale) + l.slice(1);
      } catch {
        lower = first.toLowerCase() + l.slice(1);
      }
    }
    return r.lang || r.dir
      ? html`<span lang=${r.lang ?? nothing} dir=${r.dir ?? nothing}>${lower}</span>`
      : lower;
  }

  private formatCount(n: number): string {
    try {
      return n.toLocaleString(this.locale);
    } catch {
      return n.toLocaleString('en');
    }
  }

  private async toggleList(e: Event, key: string, limit: number): Promise<void> {
    const button = e.currentTarget as HTMLElement;
    const open = !this.open.has(key);
    if (open) this.open.add(key);
    else this.open.delete(key);
    const row = button.closest('.row');
    const place = row?.parentElement ? [...row.parentElement.children].indexOf(row) + 1 : 1;
    trackEvent(this, ['uvalib-metadata', open ? 'show-all' : 'show-fewer', `row ${place}`]);
    this.requestUpdate();
    await this.updateComplete;
    if (!button.isConnected) return;
    if (!open) {
      button.focus();
      return;
    }
    const li = button.parentElement?.querySelector(LIST)?.children[limit];
    if (!(li instanceof HTMLElement)) return;
    let target = li.querySelector<HTMLElement>(FOCUSABLE);
    if (!target) {
      li.tabIndex = -1;
      target = li;
    }
    target.focus();
  }

  private renderToggle(r: Row, v: Value, key: string, limit: number) {
    const open = this.open.has(key);
    const noun = this.noun(r, v);
    return html`<button
      type="button"
      class="more"
      aria-expanded=${open ? 'true' : 'false'}
      @click=${(e: Event) => this.toggleList(e, key, limit)}
    >
      ${
        open
          ? html`Show fewer<span class="visually-hidden"> ${noun}</span>`
          : html`Show all ${this.formatCount(v.count ?? 0)} ${noun}`
      }
    </button>`;
  }

  protected override render() {
    const text = (label: string, value?: string) => {
      const v = normalize(value);
      return v
        ? html`<div class="row">
            <dt>${label}</dt>
            <dd>${v}</dd>
          </div>`
        : nothing;
    };
    const shownFrom = this.items ?? this.childRows;
    if (shownFrom !== this.clonedFor) {
      this.clonedFor = shownFrom;
      this.clones = new WeakMap();
      this.open = new Set();
    }
    return html`<dl>
      ${text('Creator', this.creator)}${text('Organization', this.organization)}
      ${this.rows.map(
        (r, ri) =>
          html`<div class="row">
            <dt lang=${r.lang ?? nothing} dir=${r.dir ?? nothing}>${r.label}</dt>
            ${r.values.map((v, vi) => {
              const limit = this.limitFor(v);
              const key = limit > 0 && (v.count ?? 0) > limit ? `${ri}-${vi}` : undefined;
              return html`<dd
                lang=${v.lang ?? nothing}
                dir=${v.dir ?? nothing}
                data-key=${key ?? nothing}
                data-limit=${key ? limit : nothing}
              >
                ${v.source ? this.nodesOf(v.source) : v.content}${
                  key ? this.renderToggle(r, v, key, limit) : nothing
                }
              </dd>`;
            })}
          </div>`,
      )}
      ${this.renderRights()}${this.renderCitation()}
    </dl>`;
  }
}
