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
} from '../../base/url-param.js';

/** One chip: the value reported in events, its visible label, and optionally a count and link. */
export interface ChipItem {
  value: string;
  label: string;
  /** Shown in a smaller muted span and read as part of the name (`2005, 213 shoots`). */
  count?: number | string;
  /** `links` mode: the chip is a link. Without it the chip is a button that fires `select`. */
  href?: string;
  disabled?: boolean;
  /**
   * A CSS colour for a small square before the label, so the chips can be a chart's or map's
   * colour key. Decorative (`aria-hidden`): the name stays the label.
   */
  swatch?: string;
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
  ${host} { display: flow-root; min-width: 0; max-width: 100%; }
  ${host} .chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 0.5rem;
    min-width: 0;
  }
  ${host} .chips.scroll {
    flex-wrap: nowrap;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    padding: 0.375rem;
    scroll-padding-inline: 2.5rem;
  }
  ${host} .chips.scroll > .chip { flex: none; }
  ${host} .rail { position: relative; min-width: 0; }
  ${host} .chips.segmented {
    flex-wrap: nowrap;
    column-gap: 0;
    overflow-x: auto;
    padding: 0.375rem;
  }
  /* The padding only keeps the focus ring inside the scroll box: the bar stays 44px tall. */
  ${host} .chips.segmented:not(.scroll) { margin-block: -0.375rem; }
  ${host} .chips.segmented:not(.scroll) > .chip { flex: 0 1 auto; min-width: 44px; }
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
    overflow-wrap: break-word;
  }
  ${host} .text { min-width: 0; }
  ${host} .check { flex: none; width: 1em; height: 1em; }
  /* A key's colour is content, not look: kept with no-style. Its border is the chip's text
     colour, which contrasts with the chip in every state (selected, disabled, dark). */
  ${host} .swatch {
    flex: none;
    box-sizing: border-box;
    width: 0.75em;
    height: 0.75em;
    border: 1px solid currentColor;
    border-radius: 2px;
  }
  /* Forced colors would flatten the fill: the key keeps its colour (it matches the chart or
     map) and its border stays the chip's system text colour. */
  @media (forced-colors: active) {
    ${host} .swatch { forced-color-adjust: none; }
  }
  ${host} .chip:focus-visible { outline: none; }
  ${host} :is(.chip:focus-visible > .face, .chip input:focus-visible + .face) {
    position: relative;
    z-index: 1;
    outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
    outline-offset: 2px;
  }
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

/** The tick on a selected chip, so the state never rests on colour alone. */
const CHECK = svg`<svg class="check" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** The visual target of each face: selected (a radio checked or a toggle pressed). */
const ON = unsafeCSS(".chip[aria-pressed='true'] > .face, .chip input:checked + .face");
/** Disabled and not selected (a selected disabled chip keeps the selected fill and text). */
const OFF_DISABLED = unsafeCSS(
  ".chip:disabled:not([aria-pressed='true']) > .face, .chip[aria-disabled='true'] > .face, .chip input:disabled:not(:checked) + .face",
);
/** Hover, never on a disabled chip. */
const HOVER = unsafeCSS(
  ".chip:not(:disabled, [aria-disabled='true']):hover > .face, .chip:hover input:not(:disabled) + .face",
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
 * disabled?, swatch? }`), which wins over the children while set. The chips follow later changes to
 * the children.
 *
 * `single`: native radios drawn as chips, in a `role="radiogroup"` named by `label`. Tab
 * enters the group at the selected chip, the arrow keys move and select (as any radio group),
 * and `value` is the selected chip's value. `multi`: toggle buttons with `aria-pressed`, and
 * `value` is an array (as an attribute, comma-separated). `links`: links, or buttons that fire
 * `select`, with no selected state; a chip whose href is unsafe (`javascript:`) is plain text,
 * and an empty href is a button.
 *
 * `data-swatch` (or `swatch` in `items`) is a CSS colour drawn as a small bordered square
 * before the label, so the chips double as a chart's or map's colour key. It is decorative
 * (`aria-hidden`) and never the only cue: the name stays the label. An invalid colour is
 * ignored with one warning. In forced colors the square keeps its colour.
 *
 * A count is shown in a smaller muted span after the label and read as part of the name: “2005,
 * 213 items”, with `count-label` in place of “items”. A selected chip is filled, keeps its
 * border and shows a tick. Chips wrap on a narrow screen; `scroll` keeps them on one row that
 * scrolls sideways, with its scrollbar shown and a fade at an edge with more chips. Each chip
 * is a target at least 44px square. `segmented` joins the chips into one bar that does not
 * wrap (a long label wraps inside its segment), like the header's Light / Dark / System control.
 *
 * `url-param` (for example `year`) keeps the value in the address (`?year=2005`, a multi
 * value comma-separated, inside the hash on a hash route). It is read on connect; the
 * markup's `value` stands for the address without the parameter, and any other value is
 * written, an empty one as `?year=`. Each change is one `pushState`: in `multi` at once, in
 * `single` once the visitor settles (a second after the last change, so arrowing through a
 * year rail adds one entry, none if it ends where it started). Back and Forward are followed
 * and fire `change` with `restored: true`.
 *
 * @tagname uvalib-chip-group
 * @fires change - The visitor changed the selection (`single`, `multi`), or Back or Forward changed it through `url-param`: `detail` is `{ value, restored? }` (a string in `single`, an array in `multi`; `restored` is true for Back and Forward). Not fired when the app sets `value`. Bubbles and is composed.
 * @fires select - `links` mode: a chip was chosen. `detail` is `{ value, href? }`. For a link, a plain primary click fires it cancelable: cancel it (`preventDefault()`) to route in the app, and the click's default is prevented too. Bubbles and is composed.
 * @fires uvalib-analytics-event - For `<site-analytics>`, on the visitor's actions only: `['uvalib-chip-group', 'change', '<label>: <chip label>', <count>?]` (in `single`, one second after the last change, for the chip then selected; in `multi`, for the chip toggled), and `['uvalib-chip-group', 'select', '<label>']` in `links` mode (never the chip or its URL). The count is sent when it is a number. Bubbles and is composed.
 * @csspart swatch - The colour square before a chip's label (`data-swatch`, `swatch`).
 * @cssprop --uva-color-surface-raised - Dark-mode role token: chip background (else #fff).
 * @cssprop --uva-color-control-border - Dark-mode role token: chip border (else `--uva-grey`, #808080).
 * @cssprop --uva-color-link - Dark-mode role token: chip text and hover border (else `--uva-brand-blue`).
 * @cssprop --uva-color-text-muted - Dark-mode role token: the count (else #4f4f4f).
 * @cssprop --uva-color-accent-bg - Dark-mode role token: selected chip background and border (else `--uva-brand-blue`).
 * @cssprop --uva-color-on-accent - Dark-mode role token: selected chip text (else #fff).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 * @cssprop --uva-color-surface - Dark-mode role token: the page background the scrolling row fades into at an edge with more chips (else #fff).
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
        padding-inline: 0.625rem;
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
      ${HOVER} {
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
      /* One row that scrolls: the scrollbar stays visible, and the edge with more chips
         fades out. */
      .chips.scroll {
        scrollbar-width: thin;
        scrollbar-color: ${unsafeCSS(BORDER)} transparent;
      }
      .rail::before,
      .rail::after {
        content: '';
        position: absolute;
        inset-block: 0 0.75rem;
        z-index: 2;
        width: 2.5rem;
        pointer-events: none;
        opacity: 0;
      }
      .rail::before {
        left: 0;
        background: linear-gradient(to right, var(--uva-color-surface, #fff), transparent);
      }
      .rail::after {
        right: 0;
        background: linear-gradient(to left, var(--uva-color-surface, #fff), transparent);
      }
      .rail[data-more-left]::before,
      .rail[data-more-right]::after {
        opacity: 1;
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
        ${HOVER} {
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
        /* Forced colors keep gradients: a light fade would cover the edge chips. */
        .rail::before,
        .rail::after {
          display: none;
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
   * The chips as data: `{ value, label, count?, href?, disabled?, swatch? }`. Wins over the children
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
  /** `scroll`: whether more chips lie beyond the left and right edges. */
  @state() private more = { left: false, right: false };
  private resize?: ResizeObserver;
  private observed?: HTMLElement;

  private readonly uid = `${TAG}-${++uid}`;
  private warned = new Set<string>();
  /** The value before the address was read: what a URL without the parameter means. */
  private initial?: string | string[];
  /** Whether the parameter lives in the hash (a hash route), fixed at the first read. */
  private hashMode?: boolean;
  /** The last value this element set itself: any other change to `value` is the app's. */
  private ownValue?: string | string[];
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
    // Moved in the page: observe the scrolling row again.
    if (this.hasUpdated) this.requestUpdate();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this.onPop);
    // Detached, it could not report through the page (nor honour an ancestor's
    // no-analytics), and its address may belong to another route by now: drop it.
    this.cancel();
    this.resize?.disconnect();
    this.observed = undefined;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('urlParam') && this.urlParam) this.readUrl();
    if (changed.has('value') && this.value !== this.ownValue) {
      // Set by the app (or read from the address): a pending change is no longer the visitor's.
      this.cancel();
      if (this.kind === 'multi' && !Array.isArray(this.value)) this.value = this.selected;
    }
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
      const swatch = n.getAttribute('data-swatch');
      if (swatch !== null) item.swatch = swatch;
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
        swatch: this.colour(i.swatch),
      }));
  }

  /** A valid CSS colour, else nothing (one warning). Only ever set as a style property. */
  private colour(c: unknown): string | undefined {
    const v = typeof c === 'string' ? c.trim() : '';
    if (!v && (c === undefined || c === null || c === '')) return undefined;
    if (v && CSS.supports('color', v)) return v;
    this.warnOnce('swatch', `ignoring a swatch that is not a CSS colour: ${String(c)}`);
    return undefined;
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
    if (typeof count === 'number') return Number.isFinite(count) ? count : undefined;
    // '' and ',' are not 0.
    if (!/^\s*\d[\d,]*(\.\d+)?\s*$/.test(count)) return undefined;
    return Number(count.replace(/,/g, ''));
  }

  /* ---------- the address ---------- */

  private loc(): PageLocation {
    return { pathname: location.pathname, search: location.search, hash: location.hash };
  }

  private urlValue(): string | string[] | null {
    const loc = this.loc();
    // A hash route keeps its parameter in the hash, even once the hash has no query left.
    const raw =
      this.hashMode && !usesHashParam(loc.hash) ? null : paramFromLocation(loc, this.urlParam);
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
    this.hashMode ??= usesHashParam(location.hash);
    const v = this.urlValue();
    if (v !== null) this.value = v;
  }

  private onPop = (): void => {
    if (!this.urlParam || this.kind === 'links') return;
    this.cancel();
    this.initial ??= Array.isArray(this.value) ? [...this.value] : this.value;
    const v = this.urlValue() ?? this.initial ?? '';
    const before = this.selected.join('\u0000');
    this.value = Array.isArray(v) ? [...v] : v;
    if (this.selected.join('\u0000') === before) return;
    this.emitChange(true);
  };

  /** The value as it is written in the address. */
  private encode(v: string | string[] | undefined): string {
    if (Array.isArray(v)) return v.join(',');
    if (this.kind === 'multi')
      return String(v ?? '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
        .join(',');
    return String(v ?? '');
  }

  /**
   * Push the value into the address. The markup's value is the address without the
   * parameter; any other value is written, an empty one as `?year=`.
   */
  private writeUrl(): void {
    if (!this.urlParam) return;
    this.initial ??= '';
    this.hashMode ??= usesHashParam(location.hash);
    const value = this.encode(this.selected);
    const id = value === this.encode(this.initial) ? null : value;
    const next = hrefWithParam(this.loc(), this.urlParam, id, this.hashMode, true);
    const now = location.pathname + location.search + location.hash;
    if (next === now) return;
    try {
      history.pushState(history.state, '', next);
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

  /**
   * Multi: report the toggled chip and write the address now. Single: once changes settle
   * (arrowing through a year rail), report the chip then selected and push one history entry,
   * unless the visitor ended where they started.
   */
  private track(item: ChipItem, from: string): void {
    if (this.kind === 'multi') {
      this.writeUrl();
      this.send(item);
      return;
    }
    this.pending = { from: this.pending?.from ?? from, item };
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), chipGroupTiming.settle);
  }

  private flush(): void {
    const p = this.pending;
    this.cancel();
    if (!p || p.item.value === p.from || this.selected[0] !== p.item.value) return;
    this.writeUrl();
    this.send(p.item);
  }

  /** Forget a single-select change that has not settled, without reporting it. */
  private cancel(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.pending = undefined;
  }

  private onRadio(e: Event, item: ChipItem): void {
    // The radio's own change event must not reach the page as this element's `change` (in
    // light DOM it would bubble through the host).
    e.stopPropagation();
    const input = e.target as HTMLInputElement;
    if (!input.checked) return;
    const from = this.selected[0] ?? '';
    this.value = this.ownValue = item.value;
    this.track(item, from);
    this.emitChange();
  }

  private onToggle(item: ChipItem): void {
    const now = this.selected;
    const on = now.includes(item.value);
    this.value = this.ownValue = on ? now.filter((v) => v !== item.value) : [...now, item.value];
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
      >${on ? CHECK : nothing}${
        item.swatch
          ? html`<span
              class="swatch"
              part="swatch"
              aria-hidden="true"
              data-colour=${item.swatch}
            ></span>`
          : nothing
      }<span class="text">${item.label}</span>${
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
      return html`<span class="chip" role="link" aria-disabled="true"
        >${this.face(item, false)}</span
      >`;
    const href = item.href?.trim();
    if (href) {
      if (safeHref(href, this.ownerDocument.baseURI))
        return html`<a
          class="chip"
          href=${item.href!}
          @click=${(e: MouseEvent) => this.onSelect(e, item, true)}
          >${this.face(item, false)}</a
        >`;
      this.warnOnce(
        'href',
        'showing a chip as text: its href is not http(s), mailto, tel or relative.',
      );
      return html`<span class="chip">${this.face(item, false)}</span>`;
    }
    return html`<button
      type="button"
      class="chip"
      @click=${(e: MouseEvent) => this.onSelect(e, item, false)}
    >
      ${this.face(item, false)}
    </button>`;
  }

  /** `scroll`: which edges have more chips beyond them (in either writing direction). */
  private measure = (): void => {
    const g = this.renderRoot.querySelector<HTMLElement>('.chips.scroll');
    if (!g) return;
    const max = g.scrollWidth - g.clientWidth;
    const x = Math.abs(g.scrollLeft);
    const rtl = getComputedStyle(g).direction === 'rtl';
    const before = x > 1;
    const after = x < max - 1;
    const more = { left: rtl ? after : before, right: rtl ? before : after };
    if (more.left !== this.more.left || more.right !== this.more.right) this.more = more;
  };

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    // The checked colour is set as a style property, never written as CSS text.
    for (const s of this.renderRoot.querySelectorAll<HTMLElement>('.chips .swatch'))
      s.style.backgroundColor = s.dataset.colour!;
    const g = this.renderRoot.querySelector<HTMLElement>('.chips.scroll') ?? undefined;
    if (g !== this.observed) {
      this.resize?.disconnect();
      this.observed = g;
      if (g) {
        this.resize ??= new ResizeObserver(() => this.measure());
        this.resize.observe(g);
      }
    }
    // New or changed chips can widen the row without resizing it.
    if (g) requestAnimationFrame(this.measure);
  }

  protected override render() {
    const chips = this.chips;
    const classes = ['chips', this.scrollRow ? 'scroll' : '', this.segmented ? 'segmented' : '']
      .filter(Boolean)
      .join(' ');
    const row = html`<div
      class=${classes}
      role=${this.kind === 'single' ? 'radiogroup' : 'group'}
      aria-label=${this.label.trim() || nothing}
      ?hidden=${!chips.length}
      @scroll=${this.scrollRow ? this.measure : nothing}
    >
      ${chips.map((item) => this.renderChip(item))}
    </div>`;
    if (!this.scrollRow) return row;
    return html`<div
      class="rail"
      ?data-more-left=${this.more.left}
      ?data-more-right=${this.more.right}
    >
      ${row}
    </div>`;
  }
}
