import { css, html, nothing, svg, unsafeCSS, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { trackEvent } from '../../base/analytics.js';
import { copyText, selectContents } from '../../base/clipboard.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { inlineCopy } from '../../base/inline-copy.js';
import { normalize, safeHref, SourceChildren } from '../../base/source-children.js';
import { accessible } from '../../styles/accessible.js';

/** One format's citation, for apps: plain `text`, or `html` with inline emphasis only. */
export interface CitationItem {
  /** The format's name, shown on its radio and in the status: `MLA`, `APA`, `Chicago`… */
  format: string;
  /** The citation as plain text (never parsed as HTML). */
  text?: string;
  /**
   * The citation with inline markup such as `<i>` for a title. Only inline elements (`i`,
   * `em`, `b`, `strong`, `span`, `cite`…) are kept, without attributes other than `lang` and
   * `dir`; anything else is reduced to its text. Wins over `text`.
   */
  html?: string;
}

/** A format as drawn: its name, the safe copy of its citation, and that copy's key. */
interface Format {
  name: string;
  nodes: Node[];
  key: string;
  rich: boolean;
}

const TAG = 'uvalib-citation';
/** The visitor's last format with `remember` (localStorage is per origin: per site). */
export const STORAGE_KEY = 'uvalib-citation-format';
const STATUS_MS = 5000;
/**
 * Format changes within `settle` ms count as one for analytics (arrowing through the radios
 * reports once, for the format the visitor ends on; nothing when it is where they started).
 * Tests may shorten it.
 */
export const citationTiming = { settle: 1000 };
let uid = 0;

/** The tick on the selected format, so the state never rests on colour alone. */
const CHECK = svg`<svg class="check" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/**
 * Kept with `no-style`: the stacking, each radio laid over its 44px segment, the visually
 * hidden text, and `[hidden]`. `host` is `:host` or the tag.
 */
const structuralRules = (host: string) => `
  ${host} { display: block; min-width: 0; }
  /* Its own formatting context: the format bar's negative margin (focus-ring room) stays in. */
  ${host} .wrap { display: flow-root; }
  ${host} .formats {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    min-width: 0;
  }
  ${host} .format {
    position: relative;
    display: inline-flex;
    flex: none;
    box-sizing: border-box;
    min-width: 44px;
    min-height: 44px;
    margin: 0;
    cursor: pointer;
  }
  ${host} .format input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: inherit;
  }
  ${host} .face {
    display: inline-flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    white-space: nowrap;
  }
  ${host} .check { flex: none; width: 1em; height: 1em; }
  ${host} .format input:not(:checked) + .face .check { display: none; }
  ${host} .format input:focus-visible + .face {
    outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
    outline-offset: 2px;
  }
  ${host} .actions { display: flex; flex-wrap: wrap; align-items: center; }
  ${host} .extra { display: contents; }
  ${host} .uvalib-button { box-sizing: border-box; min-height: 44px; }
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
const LINK = unsafeCSS('var(--uva-color-link, var(--uva-brand-blue, #232d4b))');
const ACCENT = unsafeCSS('var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b))');

/**
 * One record's citation in several formats (MLA, APA, Chicago, Bluebook…), a radio group to
 * choose one, and a Copy citation button, as in Virgo's Cite dialog. Inline on a record page
 * or inside a dialog: it assumes nothing about where it sits.
 *
 * Give each format as a child, `<blockquote data-format="MLA">…</blockquote>` (any element
 * with `data-format`), so the page reads the same before the script loads (with `base.css`,
 * only the first shows then, and the chooser's and button's space is held). Inline markup in
 * a citation (`<i>` or `<em>` for a title) is kept; other elements are reduced to their text
 * and nothing is parsed as HTML. Apps set the `citations` property instead (`[{ format, text,
 * html? }]`, winning over the children while set); `html` keeps only inline elements, too.
 *
 * The formats are native radios drawn as one segmented bar (`role="radiogroup"`, "Citation
 * format"): one tab stop, the arrow keys move and select, and the selected one is filled and
 * ticked. `format` names the selected one (default the first). With `remember`, the visitor's
 * last choice is kept in localStorage (per site) and wins over `format` on their next record.
 *
 * The selected citation is shown as selectable text in a region named "<format> citation".
 * Copy citation copies it as plain text and as HTML where the browser allows (so an italic
 * title stays italic when pasted into a word processor) and says "MLA citation copied" in a
 * polite status next to the button, in the text colour (AAA), not in a toast. If the clipboard
 * is unavailable, the citation is selected and the status says to copy it with the keyboard.
 *
 * `ris-href` adds a "Download RIS" link (`ris-label`) with a `download` attribute. Other export
 * links go in the `actions` slot (`<a slot="actions" href="…" download>EndNote</a>`), after it.
 *
 * @tagname uvalib-citation
 * @slot actions - More export links or buttons, after Copy citation and Download RIS.
 * @fires uvalib-citation-format - The visitor chose another format: `detail` is `{ format }`. Not fired when the app sets `format`. Bubbles and is composed.
 * @fires uvalib-analytics-event - For `<site-analytics>`, on the visitor's actions only: `['uvalib-citation', 'format', '<format>']` (once the visitor settles on one, a second after the last change), `['uvalib-citation', 'copy', '<format>']` and `['uvalib-citation', 'download', 'ris']`. Never the citation. Bubbles and is composed.
 * @cssprop --uva-color-text - Dark-mode role token: label, citation and status colour (else `--uva-grey-darkest`).
 * @cssprop --uva-color-border - Dark-mode role token: the citation's border (else #dadada).
 * @cssprop --uva-color-surface-raised - Dark-mode role token: the citation's, segments' and buttons' background (else #fff).
 * @cssprop --uva-color-control-border - Dark-mode role token: segment border (else `--uva-grey`, #808080).
 * @cssprop --uva-color-link - Dark-mode role token: segment and button text, button border (else `--uva-brand-blue`).
 * @cssprop --uva-color-accent-bg - Dark-mode role token: the selected segment (else `--uva-brand-blue`).
 * @cssprop --uva-color-on-accent - Dark-mode role token: the selected segment's text (else #fff).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 */
export class UvalibCitation extends UvalibElement {
  static styles = [
    accessible,
    shadowStructure,
    css`
      :host {
        font-size: 1rem;
        line-height: 1.5;
        color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
      }
      .label {
        margin: 0 0 0.5rem;
        font-weight: 700;
      }
      /* The padding keeps the focus ring inside the scroll box; the bar itself is 44px. */
      .formats {
        padding: 0.375rem;
        margin: -0.375rem -0.375rem 0.375rem;
      }
      .face {
        padding: 0.25rem 0.75rem;
        border: 1px solid ${BORDER};
        background: var(--uva-color-surface-raised, #fff);
        color: ${LINK};
        font-size: 0.875rem;
        font-weight: 600;
        line-height: 1.3;
      }
      .format + .format {
        margin-inline-start: -1px;
      }
      .format:first-child .face {
        border-start-start-radius: 0.3rem;
        border-end-start-radius: 0.3rem;
      }
      .format:last-child .face {
        border-start-end-radius: 0.3rem;
        border-end-end-radius: 0.3rem;
      }
      .format:hover input:not(:checked) + .face {
        position: relative;
        border-color: ${LINK};
      }
      .format input:checked + .face {
        position: relative;
        border-color: ${ACCENT};
        background: ${ACCENT};
        color: var(--uva-color-on-accent, #fff);
      }
      .format input:focus-visible + .face {
        position: relative;
        z-index: 1;
      }
      .citation {
        margin: 0;
        padding: 0.75rem 1rem;
        border: 1px solid var(--uva-color-border, var(--uva-grey-100, #dadada));
        border-radius: 0.3rem;
        background: var(--uva-color-surface-raised, #fff);
        overflow-wrap: anywhere;
        text-wrap: pretty;
      }
      .actions {
        gap: 0.5rem 0.75rem;
        margin-top: 0.75rem;
      }
      .uvalib-button {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.75rem;
        border: 1px solid ${LINK};
        border-radius: 0.3rem;
        background: var(--uva-color-surface-raised, #fff);
        color: ${LINK};
        font: inherit;
        text-decoration: none;
        cursor: pointer;
      }
      a.uvalib-button {
        text-decoration: underline;
      }
      .uvalib-button:hover {
        text-decoration: underline;
      }
      slot[name='actions']::slotted(*) {
        min-height: 44px;
      }
      .status {
        color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
        font-weight: 600;
      }
      @media (forced-colors: active) {
        .face,
        .citation,
        .uvalib-button {
          border-color: ButtonText;
        }
        .face,
        button.uvalib-button {
          color: ButtonText;
        }
        a.uvalib-button {
          color: LinkText;
        }
        .format input:checked + .face {
          forced-color-adjust: none;
          border-color: Highlight;
          background: Highlight;
          color: HighlightText;
        }
        .format input:focus-visible + .face {
          outline-color: Highlight;
        }
      }
    `,
  ];

  /** The group's visible label and accessible name. */
  @property({ type: String }) label = 'Cite this item';

  /** Hide the label visually (it still names the group), for a dialog whose heading says it. */
  @property({ type: Boolean, reflect: true, attribute: 'hide-label' }) hideLabel = false;

  /** The selected format's name (default the first). Reflected when the visitor chooses one. */
  @property({ type: String, reflect: true }) format = '';

  /** Keep the visitor's last format in localStorage (per site), winning over `format`. */
  @property({ type: Boolean }) remember = false;

  /**
   * The citations as data, for apps: `{ format, text?, html? }`. Wins over the children while
   * set; `undefined` goes back to them.
   */
  @property({ attribute: false }) citations?: CitationItem[];

  /** A RIS file for the record: adds a download link. */
  @property({ type: String, attribute: 'ris-href' }) risHref = '';

  /** The RIS link's text. */
  @property({ type: String, attribute: 'ris-label' }) risLabel = 'Download RIS';

  @state() private childFormats: Format[] = [];
  @state() private status = '';

  private readonly uid = `${TAG}-${++uid}`;
  private readonly source: SourceChildren;
  private sourceKey = '';
  private restored = false;
  private warned = new Set<string>();
  private timer?: ReturnType<typeof setTimeout>;
  /** The format change waiting to settle: where the burst started. */
  private pending?: string;
  private settleTimer?: ReturnType<typeof setTimeout>;
  /** The `citations` array the formats below were made from. */
  private madeFrom?: CitationItem[];
  private made: Format[] = [];

  constructor() {
    super();
    this.source = new SourceChildren(
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
      installLightDomStyles(`${TAG}::structure`, unsafeCSS(structuralRules(TAG)), {
        root: node instanceof ShadowRoot || node instanceof Document ? node : undefined,
        scope: false,
      });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this.timer);
    this.flushFormat();
    this.status = '';
  }

  private warnOnce(kind: string, message: string): void {
    if (this.warned.has(kind)) return;
    this.warned.add(kind);
    console.warn(`${TAG}: ${message}`);
  }

  /** Read the formats from the children with `data-format` (not the `actions` slot). */
  private read(nodes: Node[]): void {
    const formats: Format[] = [];
    for (const n of nodes) {
      if (!(n instanceof Element) || !n.hasAttribute('data-format')) continue;
      const name = normalize(n.getAttribute('data-format'));
      if (!name) {
        this.warnOnce('format', 'ignoring a citation with an empty data-format.');
        continue;
      }
      formats.push({ name, ...inlineCopy(n.childNodes, this.ownerDocument) });
    }
    const unique = this.unique(formats);
    const key = unique.map((f) => `${f.name}\u0000${f.key}`).join('\u0001');
    if (key === this.sourceKey) return;
    this.sourceKey = key;
    this.childFormats = unique;
  }

  /** The first of each name, with one warning for the others. */
  private unique(formats: Format[]): Format[] {
    const seen = new Set<string>();
    return formats.filter((f) => {
      const k = f.name.toLowerCase();
      if (seen.has(k)) {
        this.warnOnce('duplicate', `ignoring a second citation named "${f.name}".`);
        return false;
      }
      seen.add(k);
      return true;
    });
  }

  /** The formats from `citations`, made once per array. */
  private fromItems(items: readonly CitationItem[]): Format[] {
    if (items === this.madeFrom) return this.made;
    const doc = this.ownerDocument;
    const formats: Format[] = [];
    for (const i of items) {
      const name = normalize(i?.format);
      if (!name) {
        this.warnOnce('format', 'ignoring a citation with no format.');
        continue;
      }
      let source: Node[];
      if (typeof i.html === 'string') {
        // A template's content is inert: nothing in it runs or loads.
        const t = doc.createElement('template');
        t.innerHTML = i.html;
        source = [...t.content.childNodes];
      } else source = [doc.createTextNode(i.text == null ? '' : String(i.text))];
      formats.push({ name, ...inlineCopy(source, doc) });
    }
    this.madeFrom = items as CitationItem[];
    this.made = this.unique(formats);
    return this.made;
  }

  private get formats(): Format[] {
    return this.citations ? this.fromItems(this.citations) : this.childFormats;
  }

  /** The selected format: `format` (case-insensitive), else the first. */
  private get selected(): Format | undefined {
    const all = this.formats;
    const want = normalize(this.format);
    return (
      all.find((f) => f.name === want) ??
      all.find((f) => f.name.toLowerCase() === want.toLowerCase()) ??
      all[0]
    );
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    // With `remember`, the visitor's last format wins once, when this record has it.
    if (this.remember && !this.restored && this.formats.length) {
      this.restored = true;
      const stored = readStored();
      const match = stored && this.formats.find((f) => f.name.toLowerCase() === stored);
      if (match) this.format = match.name;
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.toggleAttribute('data-empty', !this.formats.length);
    if (this.lightDom) this.placeActions();
  }

  /** Light DOM has no slots: move `slot="actions"` children into the actions row. */
  private placeActions(): void {
    const row = this.querySelector(':scope > .wrap .extra');
    if (!row) return;
    for (const n of this.source.nodes())
      if (n instanceof Element && n.getAttribute('slot') === 'actions') row.append(n);
  }

  private choose(name: string): void {
    const before = this.selected?.name ?? '';
    if (name === before) return;
    this.format = name;
    clearTimeout(this.timer);
    this.status = '';
    if (this.remember) writeStored(name.toLowerCase());
    this.dispatchEvent(
      new CustomEvent('uvalib-citation-format', {
        detail: { format: name },
        bubbles: true,
        composed: true,
      }),
    );
    this.pending ??= before;
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => this.flushFormat(), citationTiming.settle);
  }

  /** Report the format the visitor settled on, unless it is where they started. */
  private flushFormat(): void {
    clearTimeout(this.settleTimer);
    const from = this.pending;
    this.pending = undefined;
    const now = this.selected?.name;
    if (from === undefined || !now || now === from) return;
    trackEvent(this, [TAG, 'format', now]);
  }

  private get citationEl(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('.citation');
  }

  private async copy(): Promise<void> {
    const f = this.selected;
    if (!f) return;
    trackEvent(this, [TAG, 'copy', f.name]);
    clearTimeout(this.timer);
    // Cleared first, so a second copy is announced again.
    this.status = '';
    await this.updateComplete;
    // The safe copy itself, not the rendered region (which holds Lit's markers).
    const box = this.ownerDocument.createElement('div');
    box.append(...f.nodes.map((n) => n.cloneNode(true)));
    const text = normalize(box.textContent);
    let message = `${f.name} citation copied`;
    try {
      await copyText(text, f.rich ? box.innerHTML.trim() : undefined);
      this.timer = setTimeout(() => (this.status = ''), STATUS_MS);
    } catch {
      selectContents(this.citationEl);
      message = `Could not copy: the ${f.name} citation is selected, copy it with your keyboard`;
    }
    this.status = message;
  }

  private download(): void {
    trackEvent(this, [TAG, 'download', 'ris']);
  }

  private renderRis() {
    const href = normalize(this.risHref);
    if (!href) return nothing;
    if (!safeHref(href, this.ownerDocument.baseURI)) {
      this.warnOnce('href', 'ignoring ris-href: it is not http(s) or relative.');
      return nothing;
    }
    return html`<a class="uvalib-button" href=${href} download @click=${this.download}
      >${normalize(this.risLabel) || 'Download RIS'}</a
    >`;
  }

  protected override render() {
    const formats = this.formats;
    const f = this.selected;
    if (!f) return nothing;
    const labelId = `${this.uid}-label`;
    return html`<div class="wrap" role="group" aria-labelledby=${labelId}>
      <p class="label ${this.hideLabel ? 'visually-hidden' : ''}" id=${labelId}>
        ${normalize(this.label) || 'Cite this item'}
      </p>
      <div class="formats" role="radiogroup" aria-label="Citation format">
        ${formats.map(
          (x) =>
            html`<label class="format"
              ><input
                type="radio"
                name="${this.uid}-format"
                .checked=${x === f}
                @change=${() => this.choose(x.name)}
              /><span class="face">${CHECK}<span>${x.name}</span></span></label
            >`,
        )}
      </div>
      <div class="citation" role="region" aria-label="${f.name} citation">${f.nodes}</div>
      <div class="actions">
        <button type="button" class="uvalib-button" @click=${this.copy}>Copy citation</button>
        ${this.renderRis()}
        <span class="extra">${this.lightDom ? nothing : html`<slot name="actions"></slot>`}</span>
        <span class="status" role="status">${this.status}</span>
      </div>
    </div>`;
  }
}

function readStored(): string | undefined {
  try {
    return localStorage.getItem(STORAGE_KEY)?.toLowerCase() || undefined;
  } catch {
    return undefined;
  }
}

function writeStored(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // Storage blocked (private mode, a sandbox): the choice lasts for this page only.
  }
}
