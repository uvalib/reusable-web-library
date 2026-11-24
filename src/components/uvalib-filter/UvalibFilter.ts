import { html, css, svg, unsafeCSS, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { trackEvent } from '../../base/analytics.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { accessible } from '../../styles/accessible.js';

/** One checkbox in a facet: a value, how many results it matches, and whether it is selected. */
export interface FilterBucket {
  key: string;
  doc_count: number;
  selected: boolean;
}

/** A facet: a machine name (used in events and input names), a title and its buckets. */
export interface FilterFacet {
  name: string;
  title: string;
  position: number;
  buckets: FilterBucket[];
}

/** One scope chip: the value reported in `scope-change` and the visible label. */
export interface FilterScopeOption {
  value: string;
  label: string;
}

/** The analytics category. */
const TAG = 'uvalib-filter';

/**
 * Timing of the search-within status, in milliseconds (exported for tests). `announce`: after
 * the last keystroke, the polite "12 of 340 subjects" is spoken. `track`: after the last
 * keystroke, one `search` analytics event (the number of matches, never the text) is sent.
 */
export const filterTiming = { announce: 500, track: 1500 };

/** While searching, at most this many matching values are listed ("Type more to narrow them"). */
export const SEARCH_CAP = 100;

/** Element ids share the document id space in light DOM, so each instance gets its own prefix. */
let instanceCounter = 0;

const MARKS = /\p{M}/gu;
/** Case- and accent-insensitive form: "Ébène" and "ebene" match. */
const fold = (s: string): string => s.normalize('NFD').replace(MARKS, '').toLowerCase();

/** `label` folded, with the index in `label` that each folded character came from. */
function foldMap(label: string): { text: string; map: number[] } {
  let text = '';
  const map: number[] = [];
  let i = 0;
  for (const ch of label) {
    const f = fold(ch);
    for (let k = 0; k < f.length; k++) map.push(i);
    text += f;
    i += ch.length;
  }
  map.push(i);
  return { text, map };
}

/** `label` with each match of the folded query `q` in a `<mark>`. */
function marked(label: string, q: string): unknown {
  if (!q) return label;
  const { text, map } = foldMap(label);
  const parts: unknown[] = [];
  let last = 0;
  for (let i = text.indexOf(q); i !== -1; i = text.indexOf(q, i + q.length)) {
    const s = map[i]!;
    const end = map[i + q.length]!;
    if (s > last) parts.push(label.slice(last, s));
    parts.push(html`<mark>${label.slice(s, end)}</mark>`);
    last = end;
  }
  parts.push(label.slice(last));
  return parts;
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
const lower = (s: string) => s.toLowerCase();
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const count = (n: number) => n.toLocaleString('en-US');

/** The tick on the current sort, so it never rests on colour alone. */
const CHECK = svg`<svg class="check" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** A heading of `level` (2 to 6) around `content`, or the content alone. */
function heading(level: number, content: unknown): unknown {
  switch (level) {
    case 2:
      return html`<h2 class="heading">${content}</h2>`;
    case 3:
      return html`<h3 class="heading">${content}</h3>`;
    case 4:
      return html`<h4 class="heading">${content}</h4>`;
    case 5:
      return html`<h5 class="heading">${content}</h5>`;
    case 6:
      return html`<h6 class="heading">${content}</h6>`;
    default:
      return content;
  }
}

const MUTED = 'var(--uva-color-text-muted, #4f4f4f)';
const BORDER = 'var(--uva-color-control-border, var(--uva-grey, #808080))';
const LINK = 'var(--uva-color-link, var(--uva-brand-blue, #232d4b))';
const ACCENT = 'var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b))';
const RAISED = 'var(--uva-color-surface-raised, #fff)';
const FOCUS = 'var(--uva-color-focus, var(--uva-brand-orange, #e57200))';

/**
 * A faceted-search filter: a fieldset of checkboxes (value plus result count), optional
 * toggle chips ("scopes") above them, and "See more" / "See less" buttons when `limit` is set.
 * It is controlled: set `filter`, `value` and `scopeValue` from your search state and listen
 * for the change events.
 *
 * Optional filter-group features, each off by default (without them the markup, events and
 * order are as before): `collapsible` (a caret disclosure button in the legend, with the
 * selected count while collapsed), `searchable` (search within the values), `sortable`
 * (Count | Name (A–Z)), `clearable` (a Clear button), `apply-button` (stage changes until
 * Apply) and `match` (says how the values combine).
 *
 * @tagname uvalib-filter
 * @fires filter-change - A checkbox was toggled, Clear was pressed, or (with `apply-button`) Apply was pressed. `detail` is `{ name, value }`: the facet name and the new array of selected keys (`[]` after Clear). Does not bubble.
 * @fires scope-change - A scope chip was toggled. `detail` is `{ value }`: the new array of pressed scope values. Does not bubble.
 * @fires toggle - With `collapsible`: the visitor opened or closed the group. `detail` is `{ open }`. Does not bubble.
 * @fires sort - With `sortable`: the visitor chose a sort. `detail` is `{ sort }` (`count` or `name`). Does not bubble.
 * @fires uvalib-analytics-event - For `<site-analytics>`, on the visitor's changes only: `['uvalib-filter', 'facet-change', '<title>: <value>', 1 | 0]` (checked or unchecked; with `apply-button`, one per value when Apply is pressed), `['uvalib-filter', 'scope-change', <scope label>, 1 | 0]` (pressed or not), `['uvalib-filter', 'see-more' | 'see-less', <title>]`, `['uvalib-filter', 'toggle', <title>, 1 | 0]` (opened or closed), `['uvalib-filter', 'sort', '<title>: count' | '<title>: name']`, `['uvalib-filter', 'clear', <title>, <number cleared>]`, `['uvalib-filter', 'apply', <title>, <number of changes>]` and `['uvalib-filter', 'search', <title>, <number of matches>]` once a search-within settles (never the typed text). Bubbles and is composed.
 * @csspart see-more - The "See more" button (shadow mode).
 * @csspart see-less - The "See less" button (shadow mode).
 * @csspart toggle - The disclosure button in the legend (`collapsible`).
 * @csspart search - The search-within field (`searchable`).
 * @csspart clear - The Clear button (`clearable`).
 * @csspart apply - The Apply button (`apply-button`).
 * @csspart reset - The Reset button (`apply-button`).
 * @cssprop [--uva-brand-blue=#232d4b] - Scope chip text, hover border and pressed background.
 * @cssprop [--uva-brand-orange=#e57200] - Focus ring colour (focus-visible outline).
 * @cssprop --uva-color-border - Dark-mode role token: divider under the scope chips (else #e5e7eb).
 * @cssprop --uva-color-control-border - Dark-mode role token: scope chip, search field, sort and button borders (else `--uva-grey`, #808080).
 * @cssprop --uva-color-surface-raised - Dark-mode role token: scope chip, search field, sort and button background (else #fff).
 * @cssprop --uva-color-link - Dark-mode role token: scope chip and button text, the caret, hover border (else `--uva-brand-blue`).
 * @cssprop --uva-color-accent-bg - Dark-mode role token: pressed chip, current sort and Apply background (else `--uva-brand-blue`).
 * @cssprop --uva-color-on-accent - Dark-mode role token: pressed chip, current sort and Apply text (else #fff).
 * @cssprop --uva-color-text-muted - Dark-mode role token: the match text, selected count, search status and staged note (else #4f4f4f).
 * @cssprop --uva-color-input-text - Dark-mode role token: search field text (else #1f2937).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 */
export class UvalibFilter extends UvalibElement {
  static styles = [
    accessible,
    css`
      :host {
        display: block;
      }
      fieldset {
        border: none;
        padding: 0;
        margin: 0;
        min-inline-size: 0;
      }
      legend {
        font-weight: bold;
        margin-bottom: 0.5rem;
      }
      .scopes {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        margin: 0 0 0.85rem;
        padding: 0 0 0.75rem;
        border-bottom: 1px solid var(--uva-color-border, #e5e7eb);
      }
      .scope {
        appearance: none;
        margin: 0;
        border: 1px solid var(--uva-color-control-border, var(--uva-grey, #808080));
        background: var(--uva-color-surface-raised, #fff);
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
        border-radius: 999px;
        padding: 0.2rem 0.7rem;
        font: inherit;
        font-size: 0.8rem;
        font-weight: 600;
        line-height: 1.4;
        cursor: pointer;
      }
      .scope:hover {
        border-color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
      }
      .scope[aria-pressed='true'] {
        background: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
        border-color: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
        color: var(--uva-color-on-accent, #fff);
      }
      .checkbox {
        margin: 0.5rem 0;
      }
      input[type='checkbox'] {
        margin-right: 0.5rem;
      }
      .scope:focus-visible,
      button[part]:focus-visible,
      input[type='checkbox']:focus-visible {
        outline: 2px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
        outline-offset: 2px;
      }

      /* ---- Filter-group features (each opt-in). ---- */
      legend.group {
        inline-size: 100%;
        margin: 0;
        padding: 0;
      }
      .heading {
        margin: 0;
        font: inherit;
      }
      .toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        box-sizing: border-box;
        inline-size: 100%;
        min-block-size: 44px;
        margin: 0;
        padding: 0.5rem 0.25rem 0.5rem 0;
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
        font-weight: 700;
        line-height: 1.5;
        text-align: start;
        cursor: pointer;
      }
      /* The library's caret (as in uvalib-contents and site-main-nav): a rotated border box,
         turned over when open. It flips at once: no motion. */
      .toggle::after {
        content: '';
        flex: none;
        inline-size: 0.5em;
        block-size: 0.5em;
        margin-block-end: 0.25em;
        border-inline-end: 2px solid ${unsafeCSS(LINK)};
        border-block-end: 2px solid ${unsafeCSS(LINK)};
        transform: rotate(45deg);
      }
      .toggle[aria-expanded='true']::after {
        margin-block: 0.25em 0;
        transform: rotate(225deg);
      }
      .selected-count {
        margin-inline-start: 0.5rem;
        color: ${unsafeCSS(MUTED)};
        font-size: 0.875rem;
        font-weight: 400;
      }
      .body.collapsible {
        padding-block-start: 0.25rem;
      }
      .match,
      .search-status,
      .apply-status {
        margin: 0 0 0.5rem;
        color: ${unsafeCSS(MUTED)};
        font-size: 0.875rem;
        line-height: 1.5;
      }
      .search {
        margin: 0 0 0.5rem;
      }
      .search label {
        display: block;
        margin-block-end: 0.25rem;
        font-size: 0.875rem;
        font-weight: 600;
      }
      .search input {
        box-sizing: border-box;
        inline-size: 100%;
        min-block-size: 44px;
        margin: 0;
        padding: 0.5rem 0.75rem;
        border: 1px solid ${unsafeCSS(BORDER)};
        border-radius: 0.3rem;
        background: ${unsafeCSS(RAISED)};
        color: var(--uva-color-input-text, #1f2937);
        font: inherit;
      }
      .search-status {
        margin: 0.25rem 0 0;
      }
      mark {
        background: none;
        color: inherit;
        font-weight: 700;
        text-decoration: underline;
        text-underline-offset: 0.15em;
      }
      .tools {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.25rem 0.75rem;
        margin: 0 0 0.25rem;
      }
      .sort {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
      }
      .sort-label {
        margin-inline-end: 0.5rem;
        font-size: 0.875rem;
      }
      .seg {
        position: relative;
        display: inline-flex;
        align-items: center;
        min-block-size: 44px;
        min-inline-size: 44px;
      }
      .seg + .seg {
        margin-inline-start: -1px;
      }
      .seg input {
        position: absolute;
        inset: 0;
        inline-size: 100%;
        block-size: 100%;
        margin: 0;
        opacity: 0;
        cursor: pointer;
      }
      .face {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        box-sizing: border-box;
        min-block-size: 2.25rem;
        padding: 0.25rem 0.625rem;
        border: 1px solid ${unsafeCSS(BORDER)};
        background: ${unsafeCSS(RAISED)};
        color: ${unsafeCSS(LINK)};
        font-size: 0.875rem;
        font-weight: 600;
        line-height: 1.3;
        white-space: nowrap;
      }
      .seg:first-of-type .face {
        border-start-start-radius: 0.3rem;
        border-end-start-radius: 0.3rem;
      }
      .seg:last-of-type .face {
        border-start-end-radius: 0.3rem;
        border-end-end-radius: 0.3rem;
      }
      .seg input:checked + .face {
        position: relative;
        border-color: ${unsafeCSS(ACCENT)};
        background: ${unsafeCSS(ACCENT)};
        color: var(--uva-color-on-accent, #fff);
      }
      .seg input:focus-visible {
        outline: none;
      }
      .seg input:focus-visible + .face,
      .search input:focus-visible {
        position: relative;
        z-index: 1;
        outline: 3px solid ${unsafeCSS(FOCUS)};
        outline-offset: 2px;
      }
      .check {
        flex: none;
        inline-size: 1em;
        block-size: 1em;
      }
      .button {
        box-sizing: border-box;
        min-block-size: 44px;
        min-inline-size: 44px;
        margin: 0;
        padding: 0.25rem 0.875rem;
        border: 1px solid ${unsafeCSS(BORDER)};
        border-radius: 0.3rem;
        background: ${unsafeCSS(RAISED)};
        color: ${unsafeCSS(LINK)};
        font: inherit;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
      }
      .button:hover {
        border-color: ${unsafeCSS(LINK)};
      }
      .clear {
        margin-inline-start: auto;
      }
      .button.primary {
        border-color: ${unsafeCSS(ACCENT)};
        background: ${unsafeCSS(ACCENT)};
        color: var(--uva-color-on-accent, #fff);
      }
      .button[aria-disabled='true'] {
        border-style: dashed;
        border-color: ${unsafeCSS(BORDER)};
        background: ${unsafeCSS(RAISED)};
        color: ${unsafeCSS(MUTED)};
        cursor: not-allowed;
      }
      .apply-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
        margin-block-start: 0.5rem;
      }
      .apply-status {
        flex: 1 1 100%;
        margin: 0;
      }
      .pending {
        margin-inline-start: 0.4rem;
        padding: 0 0.3rem;
        border: 1px dashed currentColor;
        border-radius: 0.25rem;
        color: ${unsafeCSS(MUTED)};
        font-size: 0.75rem;
        font-style: italic;
      }
      .staged {
        font-style: italic;
      }
      @media (forced-colors: active) {
        .seg input:checked + .face,
        .button.primary {
          forced-color-adjust: none;
          border-color: Highlight;
          background: Highlight;
          color: HighlightText;
        }
        .button[aria-disabled='true'] {
          forced-color-adjust: none;
          border-color: GrayText;
          background: Canvas;
          color: GrayText;
        }
        .toggle::after {
          border-color: ButtonText;
        }
      }
    `,
  ];

  /** The facet to show: `{ name, title, position, buckets: [{ key, doc_count, selected }] }`. */
  @property({ type: Object })
  filter: FilterFacet = { name: '', title: '', position: 0, buckets: [] };

  /** Selected bucket keys (matched case-insensitively). */
  @property({ type: Array })
  value: string[] = [];

  /** Optional toggle chips shown under the legend (for example attendee types): `[{ value, label }]`. */
  @property({ type: Array })
  scopes: FilterScopeOption[] = [];

  /** Pressed scope values (matched case-insensitively). */
  @property({ type: Array })
  scopeValue: string[] = [];

  /** Accessible name of the scope chip group. Empty (the default) means `Filter <title> by type`. */
  @property({ type: String, attribute: 'scopes-label' })
  scopesLabel = '';

  /** Maximum buckets to show at first; 0 shows all. "See more" doubles it, "See less" halves it back. */
  @property({ type: Number })
  limit = 0;

  /** The legend becomes a disclosure button (with the library's caret) that shows and hides the group. */
  @property({ type: Boolean, reflect: true })
  collapsible = false;

  /** With `collapsible`: the group is closed (its legend button and selected count only). The visitor's toggle updates it; nothing is remembered. */
  @property({ type: Boolean, reflect: true })
  collapsed = false;

  /** Wrap the legend's text (or disclosure button) in a heading of this level, 2 to 6. Unset (the default): no heading, as before. */
  @property({ type: Number, attribute: 'heading-level' })
  headingLevel = 0;

  /** A search field above the values that narrows them as the visitor types. */
  @property({ type: Boolean, reflect: true })
  searchable = false;

  /** The search field's visible label. Empty (the default) means `Search <title>`. */
  @property({ type: String, attribute: 'search-label' })
  searchLabel = '';

  /** What the values are, plural, for the search status ("12 of 340 subjects"). */
  @property({ type: String })
  unit = 'values';

  /** A "Sort by: Count | Name (A–Z)" control. */
  @property({ type: Boolean, reflect: true })
  sortable = false;

  /** The order: `count` (most results first; without `sortable`, the data's own order) or `name` (A–Z). The visitor's choice updates it. */
  @property({ type: String, reflect: true })
  sort: 'count' | 'name' = 'count';

  /** A Clear button, shown while something in the group is selected. */
  @property({ type: Boolean, reflect: true })
  clearable = false;

  /** Stage checkbox changes until the visitor presses Apply (with Reset back to the applied state); `filter-change` fires on Apply only. */
  @property({ type: Boolean, reflect: true, attribute: 'apply-button' })
  applyButton = false;

  /** Say how the selected values combine, under the legend: `any` ("Matches any selected value") or `all`. Unset: no text. */
  @property({ type: String, reflect: true })
  match?: 'any' | 'all';

  @state()
  private currentLimit = 0;

  /** The search-within text, as typed. */
  @state()
  private query = '';

  /** What the polite live region says (the settled search status). */
  @state()
  private announcement = '';

  /** With `apply-button`: keys (lower-cased) whose checkbox differs from `value`, and the state shown. */
  @state()
  private staged = new Map<string, { key: string; checked: boolean }>();

  private readonly uid = `uvalib-filter-${++instanceCounter}`;
  private announceTimer?: ReturnType<typeof setTimeout>;
  private trackTimer?: ReturnType<typeof setTimeout>;
  private lastTracked = '';

  private get buckets(): FilterBucket[] {
    return this.filter?.buckets ?? [];
  }

  private get facetTitle(): string {
    return this.filter?.title ?? '';
  }

  /** The buckets in display order: the data's order unless sorted (stable on ties). */
  private get ordered(): FilterBucket[] {
    const b = this.buckets;
    if (this.sort === 'name') return [...b].sort((x, y) => collator.compare(x.key, y.key));
    if (this.sortable) return [...b].sort((x, y) => y.doc_count - x.doc_count);
    return b;
  }

  /** Whether `key` is applied (in `value`). */
  private isApplied(key: string): boolean {
    return this.value.some((v) => lower(v) === lower(key));
  }

  /** Whether `key`'s checkbox is shown checked (applied, or staged with `apply-button`). */
  private isChecked(key: string): boolean {
    return this.staged.get(lower(key))?.checked ?? this.isApplied(key);
  }

  /** The selection as shown: `value` with the staged changes. */
  private get shownValue(): string[] {
    const kept = this.value.filter((v) => this.staged.get(lower(v))?.checked !== false);
    const added = [...this.staged.values()].filter((s) => s.checked).map((s) => s.key);
    return [...kept, ...added];
  }

  private onChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (this.applyButton) {
      const k = lower(input.value);
      const staged = new Map(this.staged);
      if (input.checked === this.isApplied(input.value)) staged.delete(k);
      else staged.set(k, { key: input.value, checked: input.checked });
      this.staged = staged;
      return;
    }
    const rest = this.value.filter((v) => v.toLowerCase() !== input.value.toLowerCase());
    this.value = input.checked ? [...rest, input.value] : rest;
    trackEvent(this, [TAG, 'facet-change', `${this.filter.title}: ${input.value}`, +input.checked]);
    this.emitChange();
  }

  private emitChange() {
    this.dispatchEvent(
      new CustomEvent('filter-change', { detail: { name: this.filter.name, value: this.value } }),
    );
  }

  private toggleScope(key: string, e: Event) {
    e.preventDefault();
    e.stopPropagation();
    const rest = this.scopeValue.filter((v) => v.toLowerCase() !== key.toLowerCase());
    const pressed = rest.length === this.scopeValue.length;
    this.scopeValue = pressed ? [...rest, key] : rest;
    const label = this.scopes.find((s) => s.value === key)?.label ?? key;
    trackEvent(this, [TAG, 'scope-change', label, +pressed]);
    this.dispatchEvent(new CustomEvent('scope-change', { detail: { value: this.scopeValue } }));
  }

  private toggleOpen() {
    this.collapsed = !this.collapsed;
    const open = !this.collapsed;
    trackEvent(this, [TAG, 'toggle', this.facetTitle, +open]);
    this.dispatchEvent(new CustomEvent('toggle', { detail: { open } }));
  }

  private onSort(e: Event) {
    const sort = (e.target as HTMLInputElement).value as 'count' | 'name';
    this.sort = sort;
    trackEvent(this, [TAG, 'sort', `${this.facetTitle}: ${sort}`]);
    this.dispatchEvent(new CustomEvent('sort', { detail: { sort } }));
  }

  private async clear() {
    const n = this.shownValue.length;
    const applied = this.value.length;
    this.staged = new Map();
    trackEvent(this, [TAG, 'clear', this.facetTitle, n]);
    if (applied) {
      this.value = [];
      this.emitChange();
    }
    await this.updateComplete;
    const root = this.renderRoot as ParentNode;
    (
      root.querySelector<HTMLElement>('input[type=checkbox]') ??
      root.querySelector<HTMLElement>('button[part=toggle]')
    )?.focus();
  }

  private apply() {
    const changes = [...this.staged.values()];
    if (!changes.length) return;
    this.value = this.shownValue;
    this.staged = new Map();
    for (const c of changes)
      trackEvent(this, [TAG, 'facet-change', `${this.facetTitle}: ${c.key}`, +c.checked]);
    trackEvent(this, [TAG, 'apply', this.facetTitle, changes.length]);
    this.emitChange();
  }

  private reset() {
    this.staged = new Map();
  }

  private onSearch(e: Event) {
    this.query = (e.target as HTMLInputElement).value;
    this.scheduleStatus();
  }

  private onSearchKey(e: KeyboardEvent) {
    if (e.key !== 'Escape' || !this.query) return;
    // Clear the search, and keep Escape from closing a surrounding dialog (the filter drawer).
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLInputElement).value = '';
    this.query = '';
    this.scheduleStatus();
  }

  /** The search results: the folded query, the matching buckets, and the status line. */
  private get search(): { q: string; matches: FilterBucket[] } {
    const q = this.searchable ? fold(this.query.trim()) : '';
    return { q, matches: q ? this.ordered.filter((b) => fold(b.key).includes(q)) : [] };
  }

  private statusText(n: number): string {
    return `${count(n)} of ${count(this.buckets.length)} ${this.unit}`;
  }

  private scheduleStatus() {
    clearTimeout(this.announceTimer);
    clearTimeout(this.trackTimer);
    if (!this.search.q) {
      this.announcement = '';
      return;
    }
    this.announceTimer = setTimeout(() => {
      const { q, matches } = this.search;
      if (q) this.announcement = this.statusText(matches.length);
    }, filterTiming.announce);
    this.trackTimer = setTimeout(() => {
      const { q, matches } = this.search;
      if (!q || q === this.lastTracked) return;
      this.lastTracked = q;
      trackEvent(this, [TAG, 'search', this.facetTitle, matches.length]);
    }, filterTiming.track);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this.announceTimer);
    clearTimeout(this.trackTimer);
  }

  private facetName?: string;

  /** The focused control inside this component (checkbox, scope chip or see more/less button). */
  private get focused(): HTMLElement | null {
    const active =
      this.renderRoot instanceof ShadowRoot
        ? this.renderRoot.activeElement
        : this.contains(document.activeElement)
          ? document.activeElement
          : null;
    return active instanceof HTMLElement ? active : null;
  }

  /** Identifies the focused control by something that survives re-rendering: `kind:key`. */
  private focusKey?: string;

  private findByFocusKey(key: string): HTMLElement | undefined {
    const [kind, ...rest] = key.split(':');
    const value = rest.join(':');
    const root = this.renderRoot as ParentNode;
    if (kind === 'part')
      return root.querySelector<HTMLElement>(`button[part="${value}"]`) ?? undefined;
    const selector = kind === 'box' ? 'input[type=checkbox]' : 'button.scope';
    return [...root.querySelectorAll<HTMLInputElement | HTMLButtonElement>(selector)].find(
      (n) => n.value === value,
    );
  }

  private keyOf(el: HTMLElement): string | undefined {
    if (el instanceof HTMLInputElement && el.type === 'checkbox') return `box:${el.value}`;
    if (el.classList.contains('scope')) return `scope:${(el as HTMLButtonElement).value}`;
    const part = el.getAttribute('part');
    return part ? `part:${part}` : undefined;
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // Moving a focused node (a reordered bucket) drops focus to <body>; remember it to restore.
    const focused = this.hasUpdated ? this.focused : null;
    this.focusKey = focused ? this.keyOf(focused) : undefined;
    // A new applied selection (from the page) replaces staged changes; the same one keeps them.
    if (changed.has('value') && this.staged.size) {
      const before = new Set(((changed.get('value') as string[] | undefined) ?? []).map(lower));
      const now = new Set(this.value.map(lower));
      if (before.size !== now.size || [...now].some((v) => !before.has(v))) this.staged = new Map();
    }
    if (changed.has('applyButton') && !this.applyButton) this.staged = new Map();
    if (!changed.has('limit') && !changed.has('filter')) return;
    const total = this.buckets.length;
    const name = this.filter?.name;
    if (this.limit <= 0) {
      this.currentLimit = total;
    } else if (changed.has('limit') || name !== this.facetName) {
      // A different facet or limit starts collapsed again.
      this.currentLimit = this.limit;
    } else {
      // The same facet with fresh data (BOV re-sets it after every search) stays expanded.
      this.currentLimit = Math.max(this.limit, Math.min(this.currentLimit, total));
    }
    this.facetName = name;
  }

  protected override updated() {
    const key = this.focusKey;
    this.focusKey = undefined;
    if (!key || this.focused) return; // focus is still inside, or was never ours
    this.findByFocusKey(key)?.focus({ preventScroll: true });
  }

  private showMore() {
    this.currentLimit = Math.min(this.currentLimit * 2, this.buckets.length);
    trackEvent(this, [TAG, 'see-more', this.filter.title]);
  }

  private showLess() {
    this.currentLimit = Math.max(Math.ceil(this.currentLimit / 2), this.limit);
    trackEvent(this, [TAG, 'see-less', this.filter.title]);
  }

  /** The legend's content: the title, or the disclosure button; in a heading if asked. */
  private renderLegend(title: string, bodyId: string, selected: number): unknown {
    const level = this.headingLevel >= 2 && this.headingLevel <= 6 ? this.headingLevel : 0;
    if (!this.collapsible) return heading(level, title);
    const open = !this.collapsed;
    return heading(
      level,
      html`<button
        type="button"
        part="toggle"
        class="toggle"
        aria-expanded=${open ? 'true' : 'false'}
        aria-controls=${bodyId}
        @click=${this.toggleOpen}
      >
        <span
          >${title}${
            !open && selected
              ? html`<span class="selected-count"
                  ><span class="visually-hidden">, </span>${selected} selected</span
                >`
              : nothing
          }</span
        >
      </button>`,
    );
  }

  private renderSort(): TemplateResult {
    const id = `${this.uid}-sort`;
    const options: ['count' | 'name', string][] = [
      ['count', 'Count'],
      ['name', 'Name (A–Z)'],
    ];
    // form= names no form: the radios group by name, and a surrounding form never submits them.
    return html`<div class="sort" role="radiogroup" aria-labelledby="${id}-label">
      <span class="sort-label" id="${id}-label">Sort by</span>
      ${options.map(
        ([value, label]) =>
          html`<label class="seg"
            ><input
              type="radio"
              name=${id}
              form="${id}-none"
              value=${value}
              .checked=${this.sort === value}
              @change=${this.onSort}
            /><span class="face">${this.sort === value ? CHECK : nothing}${label}</span></label
          >`,
      )}
    </div>`;
  }

  private renderBucket(bucket: FilterBucket, idx: number, q: string): TemplateResult {
    const id = `${this.uid}-${idx}`;
    const checked = this.isChecked(bucket.key);
    const staged = this.staged.has(lower(bucket.key));
    const text = bucket.key ? marked(bucket.key, q) : '(empty)';
    const n = bucket.doc_count;
    const note = staged ? html`<span class="pending">not applied</span>` : nothing;
    return html`<div class="checkbox">
      <input
        type="checkbox"
        id=${id}
        name=${this.filter.name}
        value=${bucket.key}
        @change=${this.onChange}
        .checked=${checked}
      />
      <label for=${id} class=${staged ? 'staged' : nothing}>${text} (${n})${note}</label>
    </div>`;
  }

  render() {
    const total = this.buckets.length;
    const title = this.facetTitle;
    const { q, matches } = this.search;
    const listId = `${this.uid}-list`;
    const bodyId = `${this.uid}-body`;
    const matchId = `${this.uid}-match`;
    const selected = this.shownValue.length;
    const pending = this.staged.size;
    const pendingText = pending ? `${plural(pending, 'change')} not applied yet` : '';
    const applyText = pending ? `Apply ${plural(pending, 'change')}` : 'Apply';
    const groupy = this.collapsible || this.headingLevel > 0;

    // While searching: every checked value first (so a selection never disappears), then the
    // unchecked matches, up to SEARCH_CAP. Otherwise: the first `currentLimit` values.
    let shownBuckets: FilterBucket[];
    let shown = 0;
    if (q) {
      const rest = matches.filter((b) => !this.isChecked(b.key));
      shownBuckets = [
        ...this.ordered.filter((b) => this.isChecked(b.key)),
        ...rest.slice(0, SEARCH_CAP),
      ];
    } else {
      shown = Math.min(this.currentLimit || total, total);
      shownBuckets = this.ordered.slice(0, shown);
    }
    const collapsible = this.limit > 0 && !q;
    const capped = q && matches.filter((b) => !this.isChecked(b.key)).length > SEARCH_CAP;

    const body = html`
      ${
        this.match === 'any' || this.match === 'all'
          ? html`<p class="match" id=${matchId}>
              ${this.match === 'all' ? 'Matches all selected values' : 'Matches any selected value'}
            </p>`
          : nothing
      }
      ${
        this.scopes.length
          ? html`<div
              class="scopes"
              role="group"
              aria-label=${this.scopesLabel || `Filter ${title} by type`}
            >
              ${this.scopes.map((scope) => {
                const pressed = this.scopeValue.some((v) => lower(v) === lower(scope.value));
                return html`<button
                  type="button"
                  class="scope"
                  value=${scope.value}
                  aria-pressed=${pressed ? 'true' : 'false'}
                  @click=${(e: Event) => this.toggleScope(scope.value, e)}
                >
                  ${scope.label}
                </button>`;
              })}
            </div>`
          : nothing
      }
      ${
        this.searchable
          ? html`<div class="search">
              <label for="${this.uid}-search">${this.searchLabel || `Search ${title}`}</label>
              <input
                id="${this.uid}-search"
                part="search"
                type="search"
                autocomplete="off"
                spellcheck="false"
                .value=${this.query}
                @input=${this.onSearch}
                @keydown=${this.onSearchKey}
              />
              ${
                q
                  ? html`<p class="search-status">
                      ${this.statusText(matches.length)}${
                        capped ? `. Showing the first ${SEARCH_CAP}; type more to narrow them.` : ''
                      }
                    </p>`
                  : nothing
              }
              <span class="visually-hidden" role="status" aria-live="polite" aria-atomic="true"
                >${this.announcement}</span
              >
            </div>`
          : nothing
      }
      ${
        this.sortable || (this.clearable && selected)
          ? html`<div class="tools">
              ${this.sortable ? this.renderSort() : nothing}
              ${
                this.clearable && selected
                  ? html`<button
                      type="button"
                      part="clear"
                      class="button clear"
                      @click=${this.clear}
                    >
                      Clear<span class="visually-hidden"> ${title} filters</span>
                    </button>`
                  : nothing
              }
            </div>`
          : nothing
      }
      <div id=${listId}>
        ${repeat(
          shownBuckets,
          (bucket) => bucket.key,
          (bucket, idx) => this.renderBucket(bucket, idx, q),
        )}
      </div>
      ${
        collapsible && shown < total
          ? html`<button
              type="button"
              part="see-more"
              aria-controls=${listId}
              @click=${this.showMore}
            >
              See more<span class="visually-hidden"> ${title}</span>
            </button>`
          : nothing
      }
      ${
        collapsible && shown > this.limit
          ? html`<button
              type="button"
              part="see-less"
              aria-controls=${listId}
              @click=${this.showLess}
            >
              See less<span class="visually-hidden"> ${title}</span>
            </button>`
          : nothing
      }
      ${
        this.applyButton
          ? html`<div class="apply-bar">
              <p class="apply-status" role="status" aria-live="polite">${pendingText}</p>
              <button
                type="button"
                part="apply"
                class="button primary"
                aria-disabled=${pending ? 'false' : 'true'}
                @click=${this.apply}
              >
                ${applyText}<span class="visually-hidden"> to ${title}</span>
              </button>
              <button
                type="button"
                part="reset"
                class="button"
                aria-disabled=${pending ? 'false' : 'true'}
                @click=${this.reset}
              >
                Reset<span class="visually-hidden"> ${title}</span>
              </button>
            </div>`
          : nothing
      }
    `;

    const legend = this.renderLegend(title, bodyId, selected);
    const describedBy = this.match === 'any' || this.match === 'all' ? matchId : undefined;
    return html`
      <fieldset aria-describedby=${ifDefined(describedBy)}>
        <legend class=${groupy ? 'group' : nothing}>${legend}</legend>
        ${
          this.collapsible
            ? html`<div class="body collapsible" id=${bodyId} ?hidden=${this.collapsed}>
                ${body}
              </div>`
            : body
        }
      </fieldset>
    `;
  }
}
