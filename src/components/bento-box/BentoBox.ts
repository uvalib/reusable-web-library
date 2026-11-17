import { css, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { html, unsafeStatic } from 'lit/static-html.js';
import { property, state } from 'lit/decorators.js';
import { precedingHeadingLevel } from '../../base/heading-level.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { accessible } from '../../styles/accessible.js';
import type { BentoSection } from './BentoSection.js';
import { bentoEndpoints, setBentoEndpoints, type BentoEndpoints } from './bento-data.js';

/** The sections a `<bento-box>` can show, in the default order. */
export const BENTO_BOXES = ['catalog', 'articles', 'libguides', 'website'] as const;
export type BentoBoxName = (typeof BENTO_BOXES)[number];

const DEFAULT_LEVEL = 2;

/**
 * `boxes` from an attribute: a comma (or space) separated list, or a JSON array. Unknown and
 * repeated names are dropped; nothing usable gives the default.
 */
export function parseBoxes(value: unknown): BentoBoxName[] {
  let list: unknown = value;
  if (typeof value === 'string') {
    const text = value.trim();
    try {
      list = text.startsWith('[') ? JSON.parse(text) : text.split(/[\s,]+/);
    } catch {
      list = [];
    }
  }
  const known = new Set<string>(BENTO_BOXES);
  const out = [
    ...new Set(
      (Array.isArray(list) ? list : [])
        .map((b) => (typeof b === 'string' ? b.trim().toLowerCase() : ''))
        .filter((b) => known.has(b)),
    ),
  ] as BentoBoxName[];
  return out.length ? out : [...BENTO_BOXES];
}

/** The query in the page URL: `?q=` (preferred) or the old `?query=`; null when neither. */
export function urlQuery(search = location.search): string | null {
  const p = new URLSearchParams(search);
  return p.get('q') ?? p.get('query');
}

/**
 * Rules the box needs even with `no-style`: the host is a block, the status line is visually
 * hidden (it only speaks), and `[hidden]` hides.
 */
const structuralRules = (host: string) => `
  ${host} { display: block; }
  ${host} .bs-results-container > * { min-width: 0; }
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

const SEARCH_ICON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M10 2a8 8 0 0 1 6.32 12.9l5.39 5.4-1.41 1.41-5.4-5.39A8 8 0 1 1 10 2zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z'/%3E%3C/svg%3E")`;

let instances = 0;

/**
 * The library's search results page (library.virginia.edu/search): a search bar and, for the
 * query, a grid of result sections from Virgo's catalog and articles, the subject guides and
 * the library website. The query comes from the page URL (`?q=`, or the old `?query=`), else
 * the `query` attribute; searching pushes `?q=` to the history, and Back and Forward restore
 * the query. With no query only the search bar shows and nothing is fetched. Light DOM output
 * keeps the classes the Drupal theme styles under `.uvalib-bento-search`.
 *
 * Registers `catalog-section`, `articles-section`, `libguides-section` and `website-section`.
 *
 * @tagname bento-box
 * @cssprop --uva-color-text - Dark-mode role token: text (else #2b2b2b).
 * @cssprop --uva-color-control-border - Dark-mode role token: the search input's border (else #808080).
 * @cssprop --uva-color-input-text - Dark-mode role token: the search input's text (else #1f2937).
 * @cssprop --uva-color-surface-raised - Dark-mode role token: the search input's background (else #fff).
 * @cssprop --uva-color-accent-bg - Dark-mode role token: the search button (else `--uva-brand-blue`).
 * @cssprop --uva-color-on-accent - Dark-mode role token: the search button's icon (else #fff).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 */
export class BentoBox extends UvalibElement {
  static styles = [
    accessible,
    shadowStructure,
    css`
      :host {
        container-type: inline-size;
        color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
        line-height: 1.5;
      }
      .bento-search-bar {
        display: block;
        margin: 2rem 0;
      }
      .bento-search-bar form {
        display: flex;
        max-width: 40rem;
        margin: 0 auto;
      }
      .bento-search-bar input {
        flex: 1;
        min-width: 0;
        min-height: 3rem;
        box-sizing: border-box;
        padding: 0.5rem 1rem;
        font: inherit;
        font-size: max(1rem, 1em);
        color: var(--uva-color-input-text, #1f2937);
        background: var(--uva-color-surface-raised, #fff);
        border: 1px solid var(--uva-color-control-border, var(--uva-grey, #808080));
        border-inline-end: 0;
        border-radius: 0.3rem 0 0 0.3rem;
      }
      .bento-search-bar button {
        padding: 0 0.75rem;
        border: 1px solid var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
        border-radius: 0 0.3rem 0.3rem 0;
        background: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
        color: var(--uva-color-on-accent, #fff);
        cursor: pointer;
      }
      .bento-search-bar button::before {
        content: '';
        display: block;
        width: 1.5rem;
        height: 1.5rem;
        background: currentColor;
        mask: ${unsafeCSS(SEARCH_ICON)} center / contain no-repeat;
      }
      .bento-search-bar p {
        margin: 1rem 0 0;
        text-align: center;
      }
      .bs-header > :is(h1, h2, h3, h4, h5, h6) {
        margin: 2rem 0 0;
        font-size: 1.5rem;
        font-weight: 500;
        line-height: 1.3;
      }
      .bs-search-term {
        font-style: italic;
      }
      .bs-header p {
        margin: 1rem 0;
        font-size: 1.25rem;
      }
      .bs-results-container {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 2rem;
      }
      @container (width < 48rem) {
        .bs-results-container {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `,
  ];

  /**
   * The URLs shared by every `<bento-box>` and section: `authorize`, `catalog`, `articles`,
   * `guides` and `website`. Assigning an object (or setting a key) changes them from the next
   * search on. To repoint before elements already in the HTML fetch, set
   * `window.uvalibBentoEndpoints` before the define script runs.
   */
  static get endpoints(): BentoEndpoints {
    return bentoEndpoints;
  }
  static set endpoints(value: Partial<BentoEndpoints>) {
    setBentoEndpoints(value);
  }

  /** The search text when the page URL has none (`?q=` or `?query=` win). */
  @property({ type: String })
  query = '';

  /** How many results each section shows (at most). */
  @property({ type: Number })
  limit = 5;

  /** The line under the search bar. */
  @property({ type: String, attribute: 'search-describe' })
  searchDescribe =
    'This page searches Virgo, Virgo articles, subject guides, and the Library website.';

  /** What a section says when it finds nothing. */
  @property({ type: String, attribute: 'no-result-describe' })
  noResultDescribe = 'No results found.';

  /** The search input's placeholder. */
  @property({ type: String })
  placeholder = 'Search anything...';

  /**
   * The sections, in order: `catalog`, `articles`, `libguides`, `website`, as a comma list
   * (`boxes="catalog,articles"`) or a JSON array. Default: all four.
   */
  @property({ converter: { fromAttribute: parseBoxes } })
  boxes: BentoBoxName[] = ['catalog', 'articles', 'libguides', 'website'];

  /**
   * The level of the "You searched for" heading, 1 to 6; the sections' headings are one
   * below. Unset (the default), it is one below the nearest heading before the element in the
   * page (the page's `<h1>` gives `<h2>`, then `<h3>` sections), or 2 when there is none.
   */
  @property({ type: Number, attribute: 'heading-level' })
  headingLevel?: number;

  @state() private inferredLevel = DEFAULT_LEVEL;
  /** The polite status line's text. */
  @state() private status = '';

  private readonly uid = `bento-box-${++instances}`;
  /** The `query` attribute's value when connected, restored when the URL has no query. */
  private fallbackQuery?: string;
  /** A search is waiting for its sections to settle, to say so once. */
  private announcePending = false;

  private readonly onPopState = () => {
    this.query = urlQuery() ?? this.fallbackQuery ?? '';
  };

  private readonly onSectionState = () => {
    const sections = this.sections();
    if (sections.some((s) => s.state === 'loading')) {
      this.announcePending = true;
      this.status = '';
      return;
    }
    if (!this.announcePending) return;
    this.announcePending = false;
    this.status = sections.some((s) => s.state === 'error')
      ? 'Results updated. Some results are unavailable.'
      : 'Results updated.';
  };

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
        unsafeCSS(structuralRules(this.localName)),
        { root, scope: false },
      );
    }
    // The URL wins over the attribute.
    this.fallbackQuery ??= this.query;
    const fromUrl = urlQuery();
    if (fromUrl !== null) this.query = fromUrl;
    window.addEventListener('popstate', this.onPopState);
    this.addEventListener('bento-state', this.onSectionState);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this.onPopState);
    this.removeEventListener('bento-state', this.onSectionState);
  }

  private get level(): number {
    const n = Math.trunc(this.headingLevel ?? Number.NaN);
    return n >= 1 && n <= 6 ? n : this.inferredLevel;
  }

  private get q(): string {
    return (this.query ?? '').trim();
  }

  /** The section elements now rendered. */
  private sections(): BentoSection<unknown>[] {
    return [
      ...this.renderRoot.querySelectorAll<BentoSection<unknown>>(
        '.bs-results-container > .bs-results--block',
      ),
    ];
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    if (changed.has('query')) {
      this.status = '';
      this.announcePending = !!this.q;
    }
  }

  private search(e: SubmitEvent) {
    e.preventDefault();
    const input = (e.currentTarget as HTMLFormElement).elements.namedItem('q') as HTMLInputElement;
    const q = input.value.trim();
    if (q === this.q) return;
    const url = new URL(location.href);
    url.searchParams.delete('query');
    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    history.pushState({ query: q }, '', url);
    this.query = q;
  }

  private renderSection(box: BentoBoxName, level: number) {
    const tag = unsafeStatic(`${box}-section`);
    return html`<${tag}
      class="bs-results--block"
      ?no-shadow-dom=${this.lightDom}
      ?no-style=${this.noStyle}
      .query=${this.q}
      .limit=${this.limit}
      .noResultDescribe=${this.noResultDescribe}
      .headingLevel=${level}
    ></${tag}>`;
  }

  render() {
    const level = this.level;
    const h = unsafeStatic(`h${level}`);
    const q = this.q;
    const boxes = parseBoxes(this.boxes);
    const input = `${this.uid}-q`;
    const describe = `${this.uid}-describe`;
    return html`<bento-search class="bento-search-bar">
        <search>
          <form action="https://search.lib.virginia.edu/search" method="get" @submit=${this.search}>
            <span class="icon-search" aria-hidden="true"></span>
            <label class="visually-hidden" for=${input}>Search</label>
            <input
              id=${input}
              name="q"
              type="search"
              placeholder=${this.placeholder}
              .value=${q}
              aria-describedby=${describe}
              enterkeyhint="search"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
            />
            <button type="submit" class="uvalib-button-home-search">
              <span class="visually-hidden">Search</span>
            </button>
          </form>
        </search>
        <p id=${describe}>${this.searchDescribe}</p>
      </bento-search>
      ${
        q
          ? html`<div class="bs-header">
                <${h}>You searched for <span class="bs-search-term">${q}</span></${h}>
                <p>Here are the results:</p>
              </div>
              <div class="bs-results-container">
                ${boxes.map((b) => this.renderSection(b, Math.min(level + 1, 6)))}
              </div>`
          : nothing
      }
      <div class="visually-hidden" role="status">${this.status}</div>`;
  }
}
