import { css, nothing, unsafeCSS, type CSSResult, type PropertyValues } from 'lit';
import { html, unsafeStatic, type StaticValue } from 'lit/static-html.js';
import { property, state } from 'lit/decorators.js';
import { precedingHeadingLevel } from '../../base/heading-level.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { accessible } from '../../styles/accessible.js';
import type { TextRun } from './bento-data.js';

/**
 * `loading` until the first answer, then `ready` (results shown), `empty` (none found, or no
 * query) or `error` (they could not be loaded).
 */
export type BentoState = 'loading' | 'ready' | 'empty' | 'error';

/** What a section's source answers. */
export interface SectionResults<T> {
  items: T[];
  total?: number;
  /** The source's own "see all" URL, when it sends one. */
  seeAll?: string;
}

const DEFAULT_LIMIT = 5;
const DEFAULT_LEVEL = 3;
const MAX_LIMIT = 50;

/**
 * Rules every section needs even with `no-style`, where the Drupal theme styles it: the host
 * is a block, placeholder entries are invisible, the message sits over the list's first entry
 * (both in one grid cell, so it never moves anything), titles and teasers keep a fixed number
 * of lines (the whole text stays in the DOM), and `[hidden]` hides. `host` is `:host`
 * (shadow) or the tag name (light DOM, so they stay scoped).
 */
const structuralRules = (host: string) => `
  ${host} { display: block; }
  ${host} .bs-results--placeholder { visibility: hidden; }
  ${host} .bs-results--stack { display: grid; }
  ${host} .bs-results--stack > * { grid-area: 1 / 1; min-width: 0; }
  ${host} .bs-results--message { align-self: start; z-index: 1; }
  ${host} .bs-results--see-all { display: inline; }
  ${host} .bs-results--guide { font-weight: normal; }
  ${host} .bs-results--title,
  ${host} .bento-section-title,
  ${host} .bs-results--highlights {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    min-height: 3em;
    min-height: 2lh;
  }
  ${host} .bento-section-desc {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
    min-height: 4.5em;
    min-height: 3lh;
  }
  ${host} .bs-results--author,
  ${host} .bs-results--date,
  ${host} .bs-results--format,
  ${host} .bs-results--byline {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  ${host}[hidden], ${host} [hidden] { display: none !important; }
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
`;
const shadowStructure = unsafeCSS(structuralRules(':host'));

/** Render text runs, the matched words in `<mark>` (all as text, never as HTML). */
export const renderRuns = (runs: readonly TextRun[]) =>
  runs.map((r) => (r.mark ? html`<mark>${r.text}</mark>` : r.text));

/**
 * The shared behaviour of the four `<bento-box>` sections: a header (heading and "see all"),
 * a description, and an `ol.bs-results--list` of results, with loading, empty and error
 * states, in the DOM and classes the Drupal theme styles. Not registered itself.
 *
 * @fires bento-state - Whenever `state` changes (bubbles, composed); `<bento-box>` listens to announce "Results updated" once every section has settled.
 * @cssprop --uva-color-text - Dark-mode role token: text (else #2b2b2b).
 * @cssprop --uva-color-link - Dark-mode role token: titles, links and buttons (else `--uva-brand-blue`).
 * @cssprop --uva-color-border - Dark-mode role token: the block's border and entry rules (else #dadada).
 * @cssprop --uva-color-surface-raised - Dark-mode role token: background (else #fff).
 * @cssprop --uva-color-surface-hover - Dark-mode role token: the header band (else #dadada).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 */
export abstract class BentoSection<T> extends UvalibElement {
  static styles = [
    accessible,
    shadowStructure,
    css`
      :host {
        color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
        background: var(--uva-color-surface-raised, #fff);
        border: 1px solid var(--uva-color-border, var(--uva-grey-100, #dadada));
        border-top: none;
        line-height: 1.5;
        min-width: 0;
      }
      a {
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
      }
      /* One line whatever the count's length, so the header keeps its height. */
      .bs-results--header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem 1rem;
        padding: 0.5rem 1rem;
        background: var(--uva-color-surface-hover, var(--uva-grey-100, #dadada));
      }
      .bs-results--header > :is(h1, h2, h3, h4, h5, h6) {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin: 0;
        font-size: 1.0625rem;
        line-height: 1.5;
        text-transform: uppercase;
      }
      .bs-results--body {
        padding: 1rem;
      }
      .bs-results--body > p {
        margin: 0 0 1rem;
      }
      .bs-results--list {
        margin: 0 0 1rem;
        padding-inline-start: 1.5rem;
      }
      .bs-results--list--entry,
      .bs-results--list > li {
        border-bottom: 1px solid var(--uva-color-border, var(--uva-grey-100, #dadada));
        margin-bottom: 1rem;
        padding-bottom: 1rem;
      }
      .bs-results--list > li:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }
      .bs-results--title,
      .bento-section-title {
        font-weight: 700;
      }
      .ul-0,
      .ul-1 {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .ul-1 {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
      }
      .ul-1 > li {
        min-width: 0;
      }
      .bs-results--teaser {
        padding: 0.5rem 0;
      }
      .bs-results--message {
        margin: 0;
      }
      .uvalib-button {
        display: inline-block;
        white-space: nowrap;
        font: inherit;
        line-height: 1.5;
        padding: 0.1rem 0.75rem;
        border: 1px solid var(--uva-color-link, var(--uva-brand-blue, #232d4b));
        border-radius: 0.3rem;
        background: var(--uva-color-surface-raised, #fff);
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
        text-decoration: none;
        cursor: pointer;
      }
      .bs-results--message .uvalib-button {
        margin-inline-start: 0.5rem;
      }
      .uvalib-button[aria-disabled='true'] {
        cursor: progress;
      }
    `,
  ];

  /** The search text. Empty: nothing is fetched and the section is `empty`. */
  @property({ type: String })
  query = '';

  /** How many results to show (at most). */
  @property({ type: Number })
  limit = 5;

  /** The message shown when nothing is found. */
  @property({ type: String, attribute: 'no-result-describe' })
  noResultDescribe = 'No results found.';

  /**
   * The level of the section's heading, 1 to 6. Unset (the default), it is one below the
   * nearest heading before the element in the page, or 3 when there is none. `<bento-box>`
   * sets it one below its own heading.
   */
  @property({ type: Number, attribute: 'heading-level' })
  headingLevel?: number;

  /** The section's heading ("Virgo Catalog"). */
  protected abstract readonly heading: string;
  /** What the source holds, shown under the header. */
  protected abstract readonly describe: string;
  /** The source's name inside a sentence ("Virgo catalog"), for "See all" and errors. */
  protected abstract readonly sourceName: string;
  /** Where "See all … results in ___" searches; the source name unless a section says otherwise. */
  protected get seeAllIn(): string {
    return this.sourceName;
  }
  /** The link shown instead of "See all" when nothing was found: its text and URL. */
  protected abstract readonly home: { text: string; url: string };

  /** Fetch the results for `query`. */
  protected abstract fetchResults(
    query: string,
    limit: number,
    signal: AbortSignal,
  ): Promise<SectionResults<T>>;
  /** The source's own search for `query`. */
  protected abstract seeAllUrl(query: string): string;
  /** One result: an `li` of the list. */
  protected abstract renderItem(item: T): unknown;
  /** An entry with the real classes and typical text, for placeholders. */
  protected abstract renderPlaceholderBody(): unknown;
  /** The class of each result's `li` (the website's carry none, as before). */
  protected entryClass = 'bs-results--list--entry';

  /** `loading` (the default, until the first answer), `ready`, `empty` or `error`. Read-only. */
  get state(): BentoState {
    return this._state;
  }

  @state() private _state: BentoState = 'loading';
  @state() private results?: SectionResults<T>;
  /** A Retry click's load is running: the button stays, disabled, so focus stays on it. */
  @state() private retrying = false;
  @state() private inferredLevel = DEFAULT_LEVEL;

  private loadId = 0;
  private controller?: AbortController;

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
    const above = precedingHeadingLevel(this);
    this.inferredLevel = above === null ? DEFAULT_LEVEL : Math.min(above + 1, 6);
    if (this.lightDom && this.noStyle) {
      const node = this.getRootNode();
      const root = node instanceof ShadowRoot || node instanceof Document ? node : undefined;
      installLightDomStyles(
        `${this.localName}::structure`,
        unsafeCSS(structuralRules(this.localName)) as CSSResult,
        { root, scope: false },
      );
    }
    // Reconnected after a disconnect (which aborts the load): catch up.
    if (this.hasUpdated && this._state === 'loading') void this.load();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.controller) {
      // Abandon the load: its abort must not land as an error, and reconnecting reloads.
      this.loadId++;
      this.controller.abort();
      this.controller = undefined;
      this._state = 'loading';
    }
  }

  protected get count(): number {
    const n = Math.trunc(this.limit);
    return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_LIMIT) : DEFAULT_LIMIT;
  }

  private get level(): number {
    const n = Math.trunc(this.headingLevel ?? Number.NaN);
    return n >= 1 && n <= 6 ? n : this.inferredLevel;
  }

  private get q(): string {
    return (this.query ?? '').trim();
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    if (!this.isConnected) return;
    if (!this.hasUpdated || changed.has('query') || changed.has('limit')) void this.load();
  }

  protected override updated(changed: PropertyValues<this>) {
    if ((changed as Map<PropertyKey, unknown>).has('_state'))
      this.dispatchEvent(new Event('bento-state', { bubbles: true, composed: true }));
  }

  /**
   * Load the results. An older load still running is aborted, and its answer, should it land
   * anyway, is ignored: the newest query always wins.
   */
  private async load() {
    const id = ++this.loadId;
    this.controller?.abort();
    const query = this.q;
    if (!query) {
      this.controller = undefined;
      this.results = undefined;
      this._state = 'empty';
      return;
    }
    const controller = (this.controller = new AbortController());
    this._state = 'loading';
    this.results = undefined;
    try {
      const results = await this.fetchResults(query, this.count, controller.signal);
      if (id !== this.loadId) return; // a newer load owns the element
      this.results = { ...results, items: results.items.slice(0, this.count) };
      this._state = this.results.items.length ? 'ready' : 'empty';
    } catch {
      if (id !== this.loadId) return;
      this.results = undefined;
      this._state = 'error';
    } finally {
      if (this.controller === controller) this.controller = undefined;
    }
  }

  /** Load again (after an error), keeping keyboard focus in the section. */
  async retry(): Promise<void> {
    if (this.retrying) return;
    const hadFocus = this.focusedInside();
    this.retrying = true;
    try {
      await this.load();
    } finally {
      this.retrying = false;
    }
    await this.updateComplete;
    if (!hadFocus) return;
    const r = this.renderRoot;
    if (this._state === 'ready')
      r.querySelector<HTMLAnchorElement>('.bs-results--list a[href]')?.focus();
    else if (this._state === 'error')
      r.querySelector<HTMLButtonElement>('.bs-results--message button')?.focus();
    else r.querySelector<HTMLElement>('.bs-results--message')?.focus();
  }

  private focusedInside(): boolean {
    const active =
      this.renderRoot instanceof ShadowRoot
        ? this.renderRoot.activeElement
        : document.activeElement;
    return !!active && (this.renderRoot as Node).contains(active) && active !== this;
  }

  /** "See all 138,420 results", naming the source for assistive technology. */
  private renderSeeAll() {
    const url = new URL(this.results?.seeAll ?? this.seeAllUrl(this.q));
    const params = [...url.searchParams];
    url.search = '';
    const total = this._state === 'ready' ? this.results?.total : undefined;
    return html`<form class="bs-results--see-all" action=${url.href} method="get">
      ${params.map(([name, value]) => html`<input type="hidden" name=${name} .value=${value} />`)}
      <button type="submit" class="uvalib-button">
        See all
        ${
          total === undefined
            ? nothing
            : html`<span class="bs-results--qty">${total.toLocaleString('en-US')}</span>`
        }
        results<span class="visually-hidden"> in ${this.seeAllIn}</span>
      </button>
    </form>`;
  }

  private renderMessage() {
    if (this.retrying || this._state === 'error')
      return html`${this.sourceName[0]!.toUpperCase()}${this.sourceName.slice(1)} results are
        unavailable right now.
        <button
          type="button"
          class="uvalib-button"
          aria-disabled=${this.retrying ? 'true' : nothing}
          @click=${this.retry}
        >
          ${this.retrying ? 'Retrying…' : 'Retry'}<span class="visually-hidden">
            ${this.sourceName}</span
          >
        </button>`;
    if (this._state === 'empty') return this.noResultDescribe;
    return nothing;
  }

  private renderPlaceholder() {
    return html`<li class="${this.entryClass} bs-results--placeholder" aria-hidden="true">
      ${this.renderPlaceholderBody()}
    </li>`;
  }

  /** The `li` for one result, with the entry class. */
  protected entry(body: unknown) {
    return html`<li class=${this.entryClass || nothing}>${body}</li>`;
  }

  render() {
    const h: StaticValue = unsafeStatic(`h${this.level}`);
    const loading = this._state === 'loading';
    const items = this._state === 'ready' ? (this.results?.items ?? []) : [];
    // Before the answer: the limit's worth of placeholders, so the section has its final
    // height. Empty, failed or retrying: one entry's height, under the message.
    const placeholders = items.length ? 0 : loading && !this.retrying ? this.count : 1;
    const message = this.renderMessage();
    const found = loading || this._state === 'ready';
    return html`<div class="bs-results--header">
        <${h}>${this.heading}</${h}>
        ${
          found && this.q
            ? this.renderSeeAll()
            : html`<div><a href=${this.home.url} class="uvalib-button">${this.home.text}</a></div>`
        }
      </div>
      <div class="bs-results--body">
        <p>${this.describe}</p>
        <div class="bs-results--stack">
          <ol class="bs-results--list" aria-busy=${loading ? 'true' : 'false'}>
            ${items.map((i) => this.renderItem(i))}
            ${Array.from({ length: placeholders }, () => this.renderPlaceholder())}
          </ol>
          ${
            message === nothing
              ? nothing
              : html`<p class="bs-results--message" tabindex="-1">${message}</p>`
          }
        </div>
      </div>`;
  }
}
