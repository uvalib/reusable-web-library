import { css, html, nothing, svg, unsafeCSS, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { trackEvent } from '../../base/analytics.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { normalize, safeHref, SourceChildren } from '../../base/source-children.js';
import { accessible } from '../../styles/accessible.js';
import {
  hrefWithParam,
  paramFromLocation,
  usesHashParam,
  type PageLocation,
} from '../uvalib-lightbox/media.js';

/** One chip: the value reported in events, its visible label, and optionally a count and link. */
export interface ChipItem {
  value: string;
  label: string;
  /** Shown in a smaller muted span and read as part of the name (`2005, 213 shoots`). */
  count?: number | string;
  /** `links` mode: the chip is a link. Without it the chip is a button that fires `select`. */
  href?: string;
  disabled?: boolean;
}

export type ChipGroupMode = 'single' | 'multi' | 'links';

const TAG = 'uvalib-chip-group';
const MODES = new Set<ChipGroupMode>(['single', 'multi', 'links']);
/**
 * Single-select changes within `settle` ms count as one: one analytics event (none when the
 * visitor ends where they started) and one history entry. Tests may shorten it.
 */
export const chipGroupTiming = { settle: 1000 };
let uid = 0;

/**
 * Kept with `no-style`: the wrapping (or scrolling) row, each chip's target of at least 44px,
 * the radio laid over its chip, the joined segments and the visually hidden text. `host` is
 * `:host` or the tag.
 */
const structuralRules = (host: string) => `
  ${host} { display: block; min-width: 0; max-width: 100%; }
  ${host} .chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    column-gap: 0.5rem;
    min-width: 0;
  }
  ${host} .chips.scroll {
    flex-wrap: nowrap;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    padding: 0 0.375rem;
    scroll-padding-inline: 2.5rem;
  }
  ${host} .chips.scroll > .chip { flex: none; }
  ${host} .chips.segmented { column-gap: 0; }
  ${host} .chips.segmented > .chip + .chip { margin-inline-start: -1px; }
  ${host} .chip {
    position: relative;
    display: inline-flex;
    align-items: center;
    box-sizing: border-box;
    min-width: 44px;
    min-height: 44px;
    max-width: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: start;
    text-decoration: none;
    cursor: pointer;
  }
  ${host} .chip input {
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
    box-sizing: border-box;
    min-width: 0;
    min-height: 2.25rem;
    overflow-wrap: anywhere;
  }
  ${host} .check { flex: none; width: 1em; height: 1em; }
  ${host} :is(.chip:disabled, .chip[aria-disabled='true'], .chip input:disabled) { cursor: not-allowed; }
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

const BORDER = 'var(--uva-color-control-border, var(--uva-grey, #808080))';
const LINK = 'var(--uva-color-link, var(--uva-brand-blue, #232d4b))';
const ACCENT = 'var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b))';
const FOCUS = 'var(--uva-color-focus, var(--uva-brand-orange, #e57200))';

/** The tick on a selected chip, so the state never rests on colour alone. */
const CHECK = svg`<svg class="check" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** The visual target of each face: selected (a radio checked or a toggle pressed). */
const ON = unsafeCSS(".chip[aria-pressed='true'] > .face, .chip input:checked + .face");
const OFF_DISABLED = unsafeCSS(
  ".chip:disabled > .face, .chip[aria-disabled='true'] > .face, .chip input:disabled + .face",
);
const FOCUSED = unsafeCSS('.chip:focus-visible > .face, .chip input:focus-visible + .face');

/**
 * A row of chips: a segmented control or single-select filter (`mode="single"`), filter chips
 * that toggle (`mode="multi"`), or suggestion chips that go somewhere (`mode="links"`), as in
 * a year rail with counts (“2005 213”), a sort toggle (“Most photos | Date | Title A–Z”) or
 * “Try: snow on the Lawn”.
 *
 * Give the chips as children, `<button value="2005" data-count="213">2005</button>` (the
 * value is the `value` attribute, else `data-value`, else the text; `disabled` disables), or
 * `<a href>` in `links` mode, or set the `items` property (`{ value, label, count?, href?,
 * disabled? }`), which wins over the children while set. The chips follow later changes to
 * the children.
 *
 * `single`: native radios drawn as chips, in a `role="radiogroup"` named by `label`. Tab
 * enters the group at the selected chip, the arrow keys move and select (as any radio group),
 * and `value` is the selected chip's value. `multi`: toggle buttons with `aria-pressed`, and
 * `value` is an array (as an attribute, comma-separated). `links`: links, or buttons that fire
 * `select`, with no selected state.
 *
 * A count is shown in a smaller muted span after the label and read as part of the name: “2005,
 * 213 items”, with `count-label` in place of “items”. A selected chip is filled, keeps its
 * border and shows a tick. Chips wrap on a narrow screen; `scroll` keeps them on one row that
 * scrolls sideways, with its scrollbar shown and shadows at an edge with more chips. Each chip
 * is a target at least 44px square. `segmented` joins the chips into one bar, like the
 * header's Light / Dark / System control.
 *
 * `url-param` (for example `year`) keeps the value in the address (`?year=2005`, a multi
 * value comma-separated, inside the hash on a hash route): read on connect, written with
 * `pushState` when the visitor changes it (changes less than a second apart replace that
 * entry), and followed on Back and Forward, which fire `change` with `restored: true`.
 *
 * @tagname uvalib-chip-group
 * @fires change - The visitor changed the selection (`single`, `multi`), or Back or Forward changed it through `url-param`: `detail` is `{ value, restored? }` (a string in `single`, an array in `multi`; `restored` is true for Back and Forward). Not fired when the app sets `value`. Bubbles and is composed.
 * @fires select - `links` mode: a chip was chosen. `detail` is `{ value, href? }`. For a link, a plain primary click fires it cancelable: cancel it (`preventDefault()`) to route in the app, and the click's default is prevented too. Bubbles and is composed.
 * @fires uvalib-analytics-event - For `<site-analytics>`, on the visitor's actions only: `['uvalib-chip-group', 'change', '<label>: <chip label>', <count>?]` (in `single`, one second after the last change, for the chip then selected; in `multi`, for the chip toggled), and `['uvalib-chip-group', 'select', '<label>']` in `links` mode (never the chip or its URL). The count is sent when it is a number. Bubbles and is composed.
 * @cssprop --uva-color-surface-raised - Dark-mode role token: chip background (else #fff).
 * @cssprop --uva-color-control-border - Dark-mode role token: chip border (else `--uva-grey`, #808080).
 * @cssprop --uva-color-link - Dark-mode role token: chip text and hover border (else `--uva-brand-blue`).
 * @cssprop --uva-color-text-muted - Dark-mode role token: the count (else #4f4f4f).
 * @cssprop --uva-color-accent-bg - Dark-mode role token: selected chip background and border (else `--uva-brand-blue`).
 * @cssprop --uva-color-on-accent - Dark-mode role token: selected chip text (else #fff).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 * @cssprop --uva-color-surface - Dark-mode role token: the scroll shadows' cover (else #fff).
 * @cssprop --uva-color-text - Dark-mode role token: the scroll shadows (mixed; else #2b2b2b).
 */
export class UvalibChipGroup extends UvalibElement {
  static styles = [
    accessible,
    shadowStructure,
    css`
      .face {
        padding: 0.25rem 0.875rem;
        border: 1px solid ${unsafeCSS(BORDER)};
        border-radius: 999px;
        background: var(--uva-color-surface-raised, #fff);
        color: ${unsafeCSS(LINK)};
        font-size: 0.875rem;
        font-weight: 600;
        line-height: 1.3;
      }
      .segmented .face {
        border-radius: 0;
      }
      .segmented > .chip:first-child .face {
        border-start-start-radius: 0.3rem;
        border-end-start-radius: 0.3rem;
      }
      .segmented > .chip:last-child .face {
        border-start-end-radius: 0.3rem;
        border-end-end-radius: 0.3rem;
      }
      .count {
        color: var(--uva-color-text-muted, #4f4f4f);
        font-size: 0.8125rem;
        font-weight: 400;
        font-variant-numeric: tabular-nums;
      }
      .chip:hover > .face,
      .chip:hover input + .face {
        position: relative;
        border-color: ${unsafeCSS(LINK)};
      }
      ${ON} {
        position: relative;
        border-color: ${unsafeCSS(ACCENT)};
        background: ${unsafeCSS(ACCENT)};
        color: var(--uva-color-on-accent, #fff);
      }
      .chip[aria-pressed='true'] .count,
      .chip input:checked + .face .count {
        color: inherit;
      }
      ${OFF_DISABLED} {
        border-style: dashed;
        color: var(--uva-color-text-muted, #4f4f4f);
      }
      .chip:focus-visible {
        outline: none;
      }
      ${FOCUSED} {
        position: relative;
        z-index: 1;
        outline: 3px solid ${unsafeCSS(FOCUS)};
        outline-offset: 2px;
      }
      /* One row that scrolls: the scrollbar stays visible, and a shadow shows at an edge with
         more chips (covers that scroll with the content hide it at either end). */
      .chips.scroll {
        padding-block: 0.375rem;
        scrollbar-width: thin;
        scrollbar-color: ${unsafeCSS(BORDER)} transparent;
        background:
          linear-gradient(to right, var(--uva-color-surface, #fff) 30%, transparent) left / 2rem
            100% no-repeat local,
          linear-gradient(to left, var(--uva-color-surface, #fff) 30%, transparent) right / 2rem
            100% no-repeat local,
          radial-gradient(
              farthest-side at 0 50%,
              color-mix(in srgb, var(--uva-color-text, #2b2b2b) 35%, transparent),
              transparent
            )
            left / 0.75rem 100% no-repeat scroll,
          radial-gradient(
              farthest-side at 100% 50%,
              color-mix(in srgb, var(--uva-color-text, #2b2b2b) 35%, transparent),
              transparent
            )
            right / 0.75rem 100% no-repeat scroll;
      }
      @media (forced-colors: active) {
        .face {
          border-color: ButtonText;
          color: ButtonText;
        }
        a.chip > .face {
          border-color: LinkText;
          color: LinkText;
        }
        .chip:hover > .face,
        .chip:hover input + .face {
          border-color: Highlight;
        }
        ${ON} {
          forced-color-adjust: none;
          border-color: Highlight;
          background: Highlight;
          color: HighlightText;
        }
        ${OFF_DISABLED} {
          border-color: GrayText;
          color: GrayText;
        }
        ${FOCUSED} {
          outline-color: Highlight;
        }
      }
    `,
  ];

  /** `single` (radios: one value), `multi` (toggles: an array of values) or `links`. */
  @property({ type: String, reflect: true }) mode: ChipGroupMode = 'single';

  /** The group's accessible name (required), also the first part of the analytics name. */
  @property({ type: String }) label = '';

  /**
   * The selection: a chip's value in `single`, an array of values in `multi` (as an
   * attribute, comma-separated). Setting it does not fire `change`. Unused in `links`.
   */
  @property({
    converter: { fromAttribute: (v: string | null) => v ?? '' },
  })
  value: string | string[] = '';

  /**
   * The chips as data: `{ value, label, count?, href?, disabled? }`. Wins over the children
   * while set; `undefined` goes back to them.
   */
  @property({ attribute: false }) items?: ChipItem[];

  /** The word after a count in each chip's accessible name: “2005, 213 items”. */
  @property({ type: String, attribute: 'count-label' }) countLabel = 'items';

  /** One row that scrolls sideways instead of wrapping. */
  @property({ type: Boolean, reflect: true, attribute: 'scroll' }) scrollRow = false;

  /** Join the chips into one segmented bar. */
  @property({ type: Boolean, reflect: true }) segmented = false;

  /** Query parameter that keeps the value in the address, for example `year` → `?year=2005`. */
  @property({ type: String, attribute: 'url-param' }) urlParam = '';

  @state() private childItems: ChipItem[] = [];

  private readonly uid = `${TAG}-${++uid}`;
  private warned = new Set<string>();
  /** The value before the address was read: what a URL without the parameter means. */
  private initial?: string | string[];
  private lastWrite = 0;
  /** The single-select change waiting to settle: where the burst started, and the chip now. */
  private pending?: { from: string; item: ChipItem };
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
    window.addEventListener('popstate', this.onPop);
    if (this.urlParam) this.readUrl();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this.onPop);
    this.flush();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('urlParam') && this.urlParam && this.hasUpdated) this.readUrl();
    if (!this.label.trim())
      this.warnOnce('label', 'set label: the group needs an accessible name.');
    if (!MODES.has(this.mode)) this.warnOnce('mode', 'mode must be single, multi or links.');
  }

  private warnOnce(kind: string, message: string): void {
    if (this.warned.has(kind)) return;
    this.warned.add(kind);
    console.warn(`${this.localName}: ${message}`);
  }

  private get kind(): ChipGroupMode {
    return MODES.has(this.mode) ? this.mode : 'single';
  }

  /** Read the chips from the children: each element with text is one chip. */
  private read(nodes: Node[]): void {
    const items: ChipItem[] = [];
    for (const n of nodes) {
      if (!(n instanceof Element)) continue;
      const label = normalize(n.textContent);
      if (!label) {
        this.warnOnce('empty', 'ignoring chips with no text.');
        continue;
      }
      const item: ChipItem = {
        value: n.getAttribute('value') ?? n.getAttribute('data-value') ?? label,
        label,
      };
      const count = n.getAttribute('data-count');
      if (count !== null && count.trim()) item.count = count.trim();
      if (n instanceof HTMLAnchorElement && n.hasAttribute('href'))
        item.href = n.getAttribute('href')!;
      if (n.hasAttribute('disabled') || n.getAttribute('aria-disabled') === 'true')
        item.disabled = true;
      items.push(item);
    }
    // Only a real change re-renders.
    if (JSON.stringify(items) !== JSON.stringify(this.childItems)) this.childItems = items;
  }

  /** What is shown: `items` while set, else the children; entries without a label left out. */
  private get chips(): ChipItem[] {
    const source = this.items ?? this.childItems;
    return source
      .filter((i) => i && normalize(i.label))
      .map((i) => ({
        ...i,
        label: normalize(i.label),
        value: String(i.value ?? normalize(i.label)),
      }));
  }

  /** The selected values, whatever shape `value` has. */
  private get selected(): string[] {
    const v = this.value;
    if (Array.isArray(v)) return v.map(String);
    if (v === null || v === undefined) return [];
    const s = String(v);
    if (this.kind === 'multi')
      return s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
    return [s];
  }

  private get locale(): string {
    return this.closest('[lang]')?.getAttribute('lang') || 'en';
  }

  private formatCount(count: number | string): string {
    const n = typeof count === 'number' ? count : Number(String(count).replace(/,/g, ''));
    if (typeof count === 'string' && !/^\s*[\d,]+(\.\d+)?\s*$/.test(count)) return count.trim();
    if (!Number.isFinite(n)) return String(count);
    try {
      return n.toLocaleString(this.locale);
    } catch {
      return n.toLocaleString('en');
    }
  }

  private numericCount(count: ChipItem['count']): number | undefined {
    if (count === undefined) return undefined;
    const n = typeof count === 'number' ? count : Number(String(count).replace(/,/g, ''));
    return Number.isFinite(n) ? n : undefined;
  }

  /* ---------- the address ---------- */

  private loc(): PageLocation {
    return { pathname: location.pathname, search: location.search, hash: location.hash };
  }

  private urlValue(): string | string[] | null {
    const raw = paramFromLocation(this.loc(), this.urlParam);
    if (raw === null) return null;
    return this.kind === 'multi'
      ? raw
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean)
      : raw;
  }

  /** On connect (and a new `url-param`): the address wins over the markup, quietly. */
  private readUrl(): void {
    this.initial ??= Array.isArray(this.value) ? [...this.value] : this.value;
    const v = this.urlValue();
    if (v !== null) this.value = v;
  }

  private onPop = (): void => {
    if (!this.urlParam || this.kind === 'links') return;
    this.initial ??= Array.isArray(this.value) ? [...this.value] : this.value;
    const v = this.urlValue() ?? this.initial ?? '';
    const before = this.selected.join('\u0000');
    this.value = Array.isArray(v) ? [...v] : v;
    if (this.selected.join('\u0000') === before) return;
    this.emitChange(true);
  };

  private writeUrl(): void {
    if (!this.urlParam) return;
    this.initial ??= '';
    const value = this.kind === 'multi' ? this.selected.join(',') : (this.selected[0] ?? '');
    const next = hrefWithParam(
      this.loc(),
      this.urlParam,
      value || null,
      usesHashParam(location.hash),
    );
    const now = location.pathname + location.search + location.hash;
    if (next === now) return;
    const recent = Date.now() - this.lastWrite < chipGroupTiming.settle;
    this.lastWrite = Date.now();
    try {
      history[recent ? 'replaceState' : 'pushState'](history.state, '', next);
    } catch {
      // A sandboxed document (an iframe srcdoc) cannot change its address.
    }
  }

  /* ---------- events ---------- */

  private emitChange(restored = false): void {
    const value = this.kind === 'multi' ? this.selected : (this.selected[0] ?? '');
    const detail: { value: string | string[]; restored?: boolean } = { value };
    if (restored) detail.restored = true;
    this.dispatchEvent(new CustomEvent('change', { detail, bubbles: true, composed: true }));
  }

  private send(item: ChipItem): void {
    const name = `${this.label.trim()}: ${item.label}`;
    const count = this.numericCount(item.count);
    trackEvent(this, count === undefined ? [TAG, 'change', name] : [TAG, 'change', name, count]);
  }

  /** Multi: report the toggled chip now. Single: report the chip selected once changes settle. */
  private track(item: ChipItem, from: string): void {
    if (this.kind === 'multi') return this.send(item);
    this.pending = { from: this.pending?.from ?? from, item };
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), chipGroupTiming.settle);
  }

  /** Send the single-select change that is waiting, unless it ended where it started. */
  private flush(): void {
    clearTimeout(this.timer);
    const p = this.pending;
    this.pending = undefined;
    if (p && p.item.value !== p.from) this.send(p.item);
  }

  private onRadio(e: Event, item: ChipItem): void {
    // The radio's own change event must not reach the page as this element's `change` (in
    // light DOM it would bubble through the host).
    e.stopPropagation();
    const input = e.target as HTMLInputElement;
    if (!input.checked) return;
    const from = this.selected[0] ?? '';
    this.value = item.value;
    this.writeUrl();
    this.track(item, from);
    this.emitChange();
  }

  private onToggle(item: ChipItem): void {
    const now = this.selected;
    const on = now.includes(item.value);
    this.value = on ? now.filter((v) => v !== item.value) : [...now, item.value];
    this.writeUrl();
    this.track(item, '');
    this.emitChange();
  }

  private onSelect(e: MouseEvent, item: ChipItem, link: boolean): void {
    if (e.defaultPrevented || e.button !== 0) return;
    trackEvent(this, [TAG, 'select', this.label.trim()]);
    if (link && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;
    const detail: { value: string; href?: string } = { value: item.value };
    if (link && item.href !== undefined) detail.href = item.href;
    const go = new CustomEvent('select', {
      detail,
      bubbles: true,
      composed: true,
      cancelable: link,
    });
    if (!this.dispatchEvent(go) && link) e.preventDefault();
  }

  /* ---------- render ---------- */

  private face(item: ChipItem, on: boolean) {
    const count = item.count === undefined ? '' : this.formatCount(item.count);
    return html`<span class="face"
      >${on ? CHECK : nothing}<span class="text">${item.label}</span>${
        count
          ? html`<span class="visually-hidden">, </span><span class="count">${count}</span
              ><span class="visually-hidden"> ${this.countLabel}</span>`
          : nothing
      }</span
    >`;
  }

  private renderChip(item: ChipItem) {
    const kind = this.kind;
    if (kind === 'single') {
      const on = this.selected[0] === item.value;
      return html`<label class="chip"
        ><input
          type="radio"
          name=${this.uid}
          .value=${item.value}
          .checked=${on}
          ?disabled=${!!item.disabled}
          @change=${(e: Event) => this.onRadio(e, item)}
        />${this.face(item, on)}</label
      >`;
    }
    if (kind === 'multi') {
      const on = this.selected.includes(item.value);
      return html`<button
        type="button"
        class="chip"
        aria-pressed=${on ? 'true' : 'false'}
        ?disabled=${!!item.disabled}
        @click=${() => this.onToggle(item)}
      >
        ${this.face(item, on)}
      </button>`;
    }
    if (item.disabled)
      return html`<span class="chip" aria-disabled="true">${this.face(item, false)}</span>`;
    if (item.href !== undefined) {
      if (safeHref(item.href, this.ownerDocument.baseURI))
        return html`<a
          class="chip"
          href=${item.href}
          @click=${(e: MouseEvent) => this.onSelect(e, item, true)}
          >${this.face(item, false)}</a
        >`;
      this.warnOnce(
        'href',
        'showing a chip as a button: its href is not http(s), mailto, tel or relative.',
      );
    }
    return html`<button
      type="button"
      class="chip"
      @click=${(e: MouseEvent) => this.onSelect(e, item, false)}
    >
      ${this.face(item, false)}
    </button>`;
  }

  protected override render() {
    const chips = this.chips;
    const classes = ['chips', this.scrollRow ? 'scroll' : '', this.segmented ? 'segmented' : '']
      .filter(Boolean)
      .join(' ');
    return html`<div
      class=${classes}
      role=${this.kind === 'single' ? 'radiogroup' : 'group'}
      aria-label=${this.label.trim() || nothing}
      ?hidden=${!chips.length}
    >
      ${chips.map((item) => this.renderChip(item))}
    </div>`;
  }
}
