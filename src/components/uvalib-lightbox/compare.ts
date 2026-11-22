/**
 * Versions of an image compared over the photo: Switch, Reveal (a wipe) and Fade. Loaded by
 * `<uvalib-lightbox>` the first time an open image has versions, so pages without them never
 * load it.
 */
import { html, nothing, unsafeCSS } from 'lit';
import { trackEvent } from '../../base/analytics.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { parseXywh } from '../uvalib-image-regions/regions.js';

export type CompareMode = 'switch' | 'wipe' | 'fade';

const MODES: CompareMode[] = ['switch', 'wipe', 'fade'];
const MODE_NAMES: Record<CompareMode, string> = {
  switch: 'Switch',
  wipe: 'Reveal',
  fade: 'Fade',
};

/** How long (ms) after the last slider or drag change it counts as settled. Tests shorten it. */
export const compareTiming = { settle: 400 };

/** A box in percent: of a version (its `frame`), or of the box that holds every version. */
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Version {
  label: string;
  href: string;
  note: string;
  /** Where the original sits in this version, in percent of the version; null: the same framing. */
  frame: Box | null;
}

/**
 * Versions with a different framing: every version's box (and the original's, first) in
 * percent of the box that holds them all, at the original's scale; `uw` × `uh` is that box in
 * original widths and heights; `covers` says whether a version covers the whole original.
 */
interface Framing {
  boxes: Box[];
  uw: number;
  uh: number;
  covers: boolean[];
}

/** The largest side of the sizer (a canvas never drawn on, so nothing is allocated). */
const MAX_SIDE = 4096;

function framing(list: Version[]): Framing | null {
  if (!list.some((v) => v.frame)) return null;
  // Each version's extent in original units: the original is 0..1 across and down.
  const ext = list.map(({ frame: f }) =>
    f ? { x: -f.x / f.w, y: -f.y / f.h, w: 100 / f.w, h: 100 / f.h } : { x: 0, y: 0, w: 1, h: 1 },
  );
  const x0 = Math.min(...ext.map((e) => e.x));
  const y0 = Math.min(...ext.map((e) => e.y));
  const uw = Math.max(...ext.map((e) => e.x + e.w)) - x0;
  const uh = Math.max(...ext.map((e) => e.y + e.h)) - y0;
  return {
    uw,
    uh,
    boxes: ext.map((e) => ({
      x: ((e.x - x0) / uw) * 100,
      y: ((e.y - y0) / uh) * 100,
      w: (e.w / uw) * 100,
      h: (e.h / uh) * 100,
    })),
    // A version covers the original when the original's box lies inside it.
    covers: list.map(
      ({ frame: f }) =>
        !f || (f.x >= -0.001 && f.y >= -0.001 && f.x + f.w <= 100.001 && f.y + f.h <= 100.001),
    ),
  };
}

const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
/** Custom properties placing a layer (numbers, percent of the stack). */
const place = (b: Box) =>
  `--uvalib-frame-x: ${r4(b.x)}; --uvalib-frame-y: ${r4(b.y)}; --uvalib-frame-w: ${r4(b.w)}; --uvalib-frame-h: ${r4(b.h)}`;

/** What the lightbox lends the comparison. */
export interface CompareHost {
  el: HTMLElement;
  light: boolean;
  root: Node;
  noStyle: boolean;
  /** The `compare` attribute: the first mode. */
  mode(): string;
  /** The URL the viewer would load for `href` ('' when it may not be shown). */
  size(href: string): string;
  /** Write the comparison to `version-param` (replaceState). */
  write(value: string | null): void;
  update(): void;
}

/** The parts of a lightbox slide the comparison reads. */
export interface CompareSlide {
  id: string;
  href: string;
  versions: string | unknown[] | null;
  /** `data-version`: the comparison the image opens on (the `version-param` format). */
  start?: string | null;
}

/** A comparison state: `version-param`'s value, parsed. */
interface State {
  mode: CompareMode;
  /** The version shown (Switch). */
  shown: number;
  /** The version compared (Reveal, Fade), and the percentage of it shown. */
  other: number;
  value: number;
}

const norm = (s: unknown) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '');
const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

/**
 * Kept with `no-style`: the stacked layers, the clip and fade, the divider and its handle
 * (white inside black, so it shows on any photo), the side labels and the control layout.
 * `h` is `:host` (shadow) or the tag (light DOM).
 */
const structure = (h: string) => `
  ${h} .stack { isolation: isolate; }
  ${h} .stack > img.top {
    position: absolute; inset: 0; width: 100%; height: 100%;
    max-width: none; max-height: none; margin: 0; opacity: 0; pointer-events: none;
  }
  ${h} .stack > img.top.on { opacity: 1; }
  ${h} .compare-fade > img.top.on { opacity: var(--uvalib-compare-opacity, 1); }
  ${h} .compare-wipe > img.top.on { clip-path: inset(0 calc(100% - var(--uvalib-compare, 50%)) 0 0); }
  ${h} .compare-wipe:dir(rtl) > img.top.on { clip-path: inset(0 0 0 calc(100% - var(--uvalib-compare, 50%))); }
  ${h} .compare-wipe { touch-action: pan-y; user-select: none; -webkit-user-select: none; cursor: col-resize; }
  ${h} .compare-wipe img { -webkit-user-drag: none; }
  ${h} .stack.framed > img {
    position: absolute; inset: auto;
    left: calc(var(--uvalib-frame-x) * 1%); top: calc(var(--uvalib-frame-y) * 1%);
    width: calc(var(--uvalib-frame-w) * 1%); height: calc(var(--uvalib-frame-h) * 1%);
    max-width: none; max-height: none; margin: 0;
  }
  ${h} .stack.framed > canvas.frame-box {
    display: block; width: auto; height: auto; max-width: 100%; max-height: 70dvh; margin: auto;
  }
  ${h} .stack.framed.hide-base > img:not(.top) { opacity: 0; }
  ${h} .stack.framed.compare-fade > img.top.on { opacity: 1; }
  ${h} .stack.framed.compare-fade.top-on > img:not(.top) {
    z-index: 1; opacity: calc(1 - var(--uvalib-compare-opacity, 1));
  }
  ${h} .stack.framed.compare-wipe > img.top.on {
    clip-path: inset(0 max(0%, calc((var(--uvalib-frame-x) + var(--uvalib-frame-w) - var(--uvalib-compare-n, 50)) / var(--uvalib-frame-w) * 100%)) 0 0);
  }
  ${h} .stack.framed.compare-wipe:dir(rtl) > img.top.on {
    clip-path: inset(0 0 0 max(0%, calc((100 - var(--uvalib-compare-n, 50) - var(--uvalib-frame-x)) / var(--uvalib-frame-w) * 100%)));
  }
  ${h} .stack.framed.compare-wipe.top-part > img:not(.top) {
    clip-path: inset(0 0 0 max(0%, calc((var(--uvalib-compare-n, 50) - var(--uvalib-frame-x)) / var(--uvalib-frame-w) * 100%)));
  }
  ${h} .stack.framed.compare-wipe.top-part:dir(rtl) > img:not(.top) {
    clip-path: inset(0 max(0%, calc((var(--uvalib-compare-n, 50) + var(--uvalib-frame-x) + var(--uvalib-frame-w) - 100) / var(--uvalib-frame-w) * 100%)) 0 0);
  }
  ${h} .divider {
    position: absolute; inset-block: 0; inset-inline-start: var(--uvalib-compare, 50%);
    width: 0; pointer-events: none; forced-color-adjust: none;
  }
  ${h} .divider::before {
    content: ''; position: absolute; inset-block: 0; inset-inline-start: -2px; width: 4px;
    background: #fff; outline: 1px solid #000;
  }
  ${h} .handle {
    position: absolute; top: 50%; inset-inline-start: -22px; box-sizing: border-box;
    width: 44px; height: 44px; margin-top: -22px; border: 3px solid #000; border-radius: 50%;
    background: #fff; outline: 2px solid #fff;
  }
  ${h} .handle::before, ${h} .handle::after {
    content: ''; position: absolute; top: 50%; margin-top: -6px;
    border-block: 6px solid transparent;
  }
  ${h} .handle::before { left: 7px; border-right: 8px solid #000; }
  ${h} .handle::after { right: 7px; border-left: 8px solid #000; }
  ${h} .side {
    position: absolute; inset-block-end: 0.5rem; max-width: 40%; overflow: hidden;
    padding: 0.125rem 0.5rem; background: #000; color: #fff; outline: 1px solid #fff;
    font-size: 0.875rem; font-weight: 700; line-height: 1.3; white-space: nowrap;
    text-overflow: ellipsis; pointer-events: none; forced-color-adjust: none;
  }
  ${h} .side-start { inset-inline-start: 0.5rem; }
  ${h} .side-end { inset-inline-end: 0.5rem; }
  ${h} .compare { display: flex; flex-direction: column; gap: 0.5rem; margin-block-start: 0.75rem; }
  ${h} .compare-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; }
  ${h} .mode-panels { display: grid; flex: 1 1 auto; min-width: 0; }
  ${h} .mode-panel { grid-area: 1 / 1; display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; }
  ${h} .mode-panel[data-off] { visibility: hidden; }
  ${h} .seg-group { display: flex; flex-wrap: wrap; }
  ${h} .slider { display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem 0.75rem; flex: 1 1 14rem; min-width: 0; }
  ${h} .slider input { flex: 1 1 8rem; min-width: 0; min-height: 44px; margin: 0; }
  ${h} .note { margin: 0; overflow-wrap: anywhere; }
  ${h} .note[data-off] { visibility: hidden; }
  ${h} .compare button.hold { -webkit-touch-callout: none; user-select: none; -webkit-user-select: none; touch-action: none; }
  @media (forced-colors: active) {
    ${h} .divider::before { background: CanvasText; outline-color: Canvas; }
    ${h} .handle { background: Canvas; border-color: Highlight; outline-color: Canvas; }
    ${h} .handle::before { border-right-color: CanvasText; }
    ${h} .handle::after { border-left-color: CanvasText; }
    ${h} .side { background: CanvasText; color: Canvas; outline-color: Canvas; }
  }
`;

const ACCENT = 'var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b))';
const LINK = 'var(--uva-color-link, var(--uva-brand-blue, #232d4b))';

/** The look: segmented buttons like `<uvalib-chip-group segmented>`, the slider's accent. */
const look = (h: string) => `
  ${h} .compare button.seg, ${h} .compare button.jump, ${h} .compare button.hold {
    display: inline-flex; align-items: center; justify-content: center;
    border: 1px solid var(--uva-color-control-border, var(--uva-grey, #808080));
    background: var(--uva-color-surface-raised, var(--uva-color-surface, #fff));
    color: ${LINK}; font-size: 0.9375rem; font-weight: 600; line-height: 1.3;
  }
  ${h} .seg-group > button + button { margin-inline-start: -1px; }
  ${h} .seg-group > button:first-child { border-start-start-radius: 0.3rem; border-end-start-radius: 0.3rem; }
  ${h} .seg-group > button:last-child { border-start-end-radius: 0.3rem; border-end-end-radius: 0.3rem; }
  ${h} .compare button.seg[aria-pressed='true'] {
    position: relative; border-color: ${ACCENT}; background: ${ACCENT};
    color: var(--uva-color-on-accent, #fff);
  }
  ${h} .compare button.seg[aria-pressed='true']::before {
    content: ''; box-sizing: border-box; width: 0.375rem; height: 0.75rem;
    margin-inline-end: 0.5rem; border: solid currentColor; border-width: 0 2px 2px 0;
    transform: translateY(-0.0625rem) rotate(45deg);
  }
  ${h} .compare button:hover { border-color: ${LINK}; }
  ${h} .compare button.seg[aria-pressed='true']:hover { border-color: ${ACCENT}; }
  ${h} .compare button.hold[data-held] { background: var(--uva-color-surface-hover, #f1f1f1); }
  ${h} .slider label { font-weight: 600; }
  ${h} .slider input { accent-color: ${ACCENT}; }
  ${h} .slider input:focus-visible {
    outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
    outline-offset: 2px;
  }
  ${h} .note { font-size: 0.9375rem; line-height: 1.5; }
  ${h} .stack.framed:not(.starting) {
    background: repeating-linear-gradient(135deg, transparent 0 7px, rgb(128 128 128 / 0.2) 7px 9px);
  }
  @media (prefers-reduced-motion: no-preference) {
    ${h} .compare-switch > img.top, ${h} .compare-switch.framed > img { transition: opacity 0.2s ease; }
  }
  @media (forced-colors: active) {
    ${h} .compare button.seg, ${h} .compare button.jump, ${h} .compare button.hold { border-color: ButtonText; }
    ${h} .compare button.seg[aria-pressed='true'] { background: Highlight; color: HighlightText; border-color: Highlight; }
  }
`;

/** Shadow roots that already have the comparison's sheets. */
const styled = new WeakSet<Node>();

function install(host: CompareHost): void {
  const root = host.root;
  if (host.light) {
    const opts = { root: root as Document | ShadowRoot, scope: false };
    installLightDomStyles(
      'uvalib-lightbox::compare-structure',
      unsafeCSS(structure('uvalib-lightbox')),
      opts,
    );
    if (!host.noStyle)
      installLightDomStyles('uvalib-lightbox::compare', unsafeCSS(look('uvalib-lightbox')), opts);
    return;
  }
  if (!(root instanceof ShadowRoot) || styled.has(root)) return;
  styled.add(root);
  const text = structure(':host') + (host.noStyle ? '' : look(':host'));
  const sheet = unsafeCSS(text).styleSheet;
  if (sheet) root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
}

let nextId = 0;

/**
 * The comparison for one lightbox. State: the mode, the version shown (Switch) or compared
 * with the original (Reveal, Fade), and the percentage of it shown. Another version's image
 * is requested the first time it is needed, and drawn (and announced) once it has loaded.
 */
export class Compare {
  private list: Version[] = [];
  private slideKey = '';
  private id = '';
  private warned = false;
  private warnedFrame = false;
  private warnedStart = false;
  /** The image opened on another version (`data-version`): hidden until that version is drawn. */
  private startPending = false;
  private geo: Framing | null = null;
  private baseHref = '';
  /** The mode the visitor (or the address) chose; else the lightbox's `compare`. */
  private chosen: CompareMode | null = null;
  mode: CompareMode = 'switch';
  /** The version compared with the original (Reveal, Fade), from 1. */
  private other = 1;
  /** The percentage of `other` shown (Reveal, Fade). */
  private value = 50;
  /** The version shown (Switch), from 0. */
  private shown = 0;
  private holding = false;
  private requested = new Set<number>();
  private ready = new Set<number>();
  private failed = new Set<number>();
  private message = '';
  private flip = false;
  private pendingAnnounce = false;
  private announceNext = false;
  private settleTimer = 0;
  private settled = '';
  private dragging = false;
  private dragEnd = 0;
  private readonly uid = `uvalib-compare-${++nextId}`;

  constructor(private readonly host: CompareHost) {
    install(host);
  }

  /** At least two usable versions. */
  get active(): boolean {
    return this.list.length > 1;
  }

  /** Follow the open image: a new one starts again (in the current mode); `restore` is the address's value. */
  sync(slide: CompareSlide, index: number, restore: string | null): void {
    const key = `${index}\n${slide.href}\n${JSON.stringify(slide.versions)}`;
    if (key !== this.slideKey) {
      this.reset();
      this.slideKey = key;
      this.id = slide.id;
      this.list = this.parse(slide);
      this.geo = framing(this.list);
      this.baseHref = slide.href;
      this.mode =
        this.chosen ??
        (MODES.includes(this.host.mode() as CompareMode)
          ? (this.host.mode() as CompareMode)
          : 'switch');
      this.value = this.mode === 'wipe' ? 50 : 0;
      this.need();
      this.settled = this.encode();
      // The link's own start, unless the address says otherwise.
      const fromUrl = restore != null && this.active && this.parseState(restore, false);
      if (slide.start && this.active && !fromUrl) this.begin(slide.start);
    }
    if (restore != null && this.active) this.restore(restore);
  }

  /** Forget the open image (the viewer closed): report a change still settling first. */
  reset(): void {
    // Its event and analytics, but not the address: that is the next image's now.
    if (this.settleTimer) this.settle(false);
    this.slideKey = '';
    this.list = [];
    this.geo = null;
    this.other = 1;
    this.shown = 0;
    this.holding = false;
    this.dragging = false;
    this.requested = new Set();
    this.ready = new Set();
    this.failed = new Set();
    this.message = '';
    this.pendingAnnounce = false;
    this.startPending = false;
  }

  private parse(slide: CompareSlide): Version[] {
    let raw: unknown = slide.versions;
    let bad = false;
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = null;
        bad = true;
      }
    }
    const out: Version[] = [];
    if (Array.isArray(raw)) {
      raw.forEach((v: unknown, i) => {
        const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
        const label = norm(o.label) || (i === 0 ? 'Original' : '');
        const href = i === 0 ? slide.href : norm(o.href);
        if (label && href && this.host.size(href))
          out.push({ label, href, note: norm(o.note), frame: this.frame(o, i) });
        else if (i === 0) out.length = 0;
        else bad = true;
      });
    } else bad = true;
    if (bad && !this.warned) {
      this.warned = true;
      console.warn(
        'uvalib-lightbox: data-versions (or the versions callback) has entries without a label or a usable href; they are left out.',
      );
    }
    return out.length > 1 ? out : [];
  }

  /**
   * A version's `frame`: the original's box in it, `percent:x,y,w,h`, or pixels
   * (`x,y,w,h` / `pixel:`) of the version's `width` × `height`. `x` and `y` may be negative
   * and `w` and `h` over the version (a crop: the original reaches past it); `w` and `h` must
   * be positive. Anything else is ignored (the same framing), with one warning.
   */
  private frame(o: Record<string, unknown>, i: number): Box | null {
    if (o.frame == null || o.frame === '') return null;
    const box = i > 0 && typeof o.frame === 'string' ? parseXywh(o.frame, { signed: true }) : null;
    const size = (v: unknown) => (typeof v === 'number' || typeof v === 'string' ? Number(v) : 0);
    const w = size(o.width);
    const h = size(o.height);
    if (box?.unit === 'percent') return { x: box.x, y: box.y, w: box.w, h: box.h };
    if (box && w > 0 && h > 0)
      return {
        x: (box.x / w) * 100,
        y: (box.y / h) * 100,
        w: (box.w / w) * 100,
        h: (box.h / h) * 100,
      };
    if (!this.warnedFrame) {
      this.warnedFrame = true;
      console.warn(
        "uvalib-lightbox: a version has a frame that is not usable (on the first version, not percent:x,y,w,h, or pixels without the version's width and height); it is shown with the original's framing.",
      );
    }
    return null;
  }

  /**
   * The original's natural size, once its image (the one rendered now) has loaded: the framed
   * layout needs it, and is used only from then on (before, the original sizes the stack).
   */
  private natural(): { w: number; h: number } | null {
    if (!this.geo) return null;
    const img = this.baseImg();
    if (!img?.complete || !img.naturalWidth || !img.naturalHeight) return null;
    return { w: img.naturalWidth, h: img.naturalHeight };
  }

  /**
   * `2`, `switch:2`, `wipe:40`, `fade:60`, `wipe:40:2` (the version compared, from 1), or
   * null. `strict` (`data-version`) refuses what the address forgives: a percentage over 100
   * or a version compared that does not exist.
   */
  private parseState(param: string, strict: boolean): State | null {
    const m = /^(?:(switch|wipe|fade):)?(\d{1,3})(?::(\d{1,3}))?$/.exec(param.trim().toLowerCase());
    if (!m) return null;
    const mode = (m[1] ?? 'switch') as CompareMode;
    const n = Number(m[2]);
    if (mode === 'switch')
      return n < this.list.length && !m[3]
        ? { mode, shown: n, other: this.other, value: this.value }
        : null;
    const other = m[3] ? Number(m[3]) : 1;
    const ok = other >= 1 && other < this.list.length;
    if (strict && (!ok || n > 100)) return null;
    return { mode, shown: this.shown, other: ok ? other : 1, value: clamp(n) };
  }

  private apply(st: State): void {
    this.mode = st.mode;
    this.shown = st.shown;
    this.other = st.other;
    this.value = st.value;
    this.need();
    this.settled = this.encode();
  }

  /** The comparison from the address: the visitor's mode from now on. */
  private restore(param: string): void {
    const st = this.parseState(param, false);
    if (!st) return;
    this.apply(st);
    this.chosen = st.mode;
  }

  /**
   * The link's starting version (`data-version`): not the visitor's change, so no event, no
   * analytics, nothing written to the address, and the mode chosen stays for other images.
   */
  private begin(start: string): void {
    const st = this.parseState(start, true);
    if (!st) {
      if (!this.warnedStart) {
        this.warnedStart = true;
        console.warn(
          `uvalib-lightbox: data-version "${start.slice(0, 40)}" is not a version of its image (1, wipe:50, fade:50, wipe:40:2); it opens on the original.`,
        );
      }
      return;
    }
    this.apply(st);
    this.startPending = this.amount > 0;
  }

  /** The open image's own image element (the original). */
  private baseImg(): HTMLImageElement | null {
    const scope = (this.host.light ? this.host.el : this.host.root) as ParentNode;
    const img = scope.querySelector<HTMLImageElement>('dialog .stack > img:not(.top)');
    return img && img.getAttribute('src') === this.host.size(this.baseHref) ? img : null;
  }

  /**
   * Opening on another version: the photo stays hidden until that version (and the
   * original, which sizes a framed stack) has loaded, so the original never flashes first.
   */
  private get starting(): boolean {
    if (!this.startPending || this.failed.has(this.top)) return false;
    return !(this.ready.has(this.top) && this.baseImg()?.complete);
  }

  /** The percentage of the top version named and noted: the start's at once, else what is drawn. */
  private get named(): number {
    return this.startPending && !this.failed.has(this.top) ? this.amount : this.seen;
  }

  private encode(): string {
    if (this.mode === 'switch') return String(this.shown);
    return `${this.mode}:${this.value}${this.other !== 1 ? `:${this.other}` : ''}`;
  }

  /** The version over the original: shown (Switch) or compared (Reveal, Fade). */
  private get top(): number {
    return this.mode === 'switch' ? this.shown : this.other;
  }

  /** The percentage of the top version asked for. */
  private get amount(): number {
    if (this.holding) return 0;
    if (this.mode === 'switch') return this.shown > 0 ? 100 : 0;
    return this.value;
  }

  /** The percentage of it on screen: none until its image has loaded. */
  private get seen(): number {
    return this.top > 0 && this.ready.has(this.top) ? this.amount : 0;
  }

  private label(i: number): string {
    return this.list[i]?.label ?? '';
  }

  /** Request the top version's image the first time it is needed. */
  private need(): void {
    if (this.amount > 0 && this.top > 0) this.requested.add(this.top);
  }

  // ------------------------------------------------------------ changes

  private set(v: number, announce: boolean): void {
    const next = clamp(v);
    if (next === this.value) return;
    this.startPending = false;
    this.value = next;
    this.need();
    this.host.update();
    this.announceNext ||= announce;
    window.clearTimeout(this.settleTimer);
    this.settleTimer = window.setTimeout(() => this.settle(), compareTiming.settle);
  }

  private change(fn: () => void): void {
    this.startPending = false;
    fn();
    this.need();
    this.host.update();
    this.announceNext = true;
    this.settle();
  }

  /** A visitor's change has settled: the event, analytics, the address and the announcement. */
  private settle(write = true): void {
    window.clearTimeout(this.settleTimer);
    this.settleTimer = 0;
    const state = this.encode();
    const announce = this.announceNext;
    this.announceNext = false;
    if (state === this.settled || !this.active) return;
    this.settled = state;
    const index = this.top;
    const el = this.host.el;
    el.dispatchEvent(
      new CustomEvent('uvalib-lightbox-version', {
        detail: {
          id: this.id,
          mode: this.mode,
          index,
          value: this.mode === 'switch' ? null : this.value,
        },
        bubbles: true,
        composed: true,
      }),
    );
    trackEvent(el, ['uvalib-lightbox', 'compare', this.mode, index + 1]);
    if (!write) return;
    this.host.write(state);
    if (!announce) return;
    if (this.amount > 0 && !this.ready.has(this.top)) this.pendingAnnounce = true;
    else this.say(this.stateText());
  }

  private say(text: string): void {
    this.pendingAnnounce = false;
    // A repeated message is still a change, so it is read again.
    this.flip = !this.flip;
    this.message = text + (this.flip ? ' ' : '');
    this.host.update();
  }

  private stateText(): string {
    const a = this.amount;
    if (a <= 0) return `${this.label(0)} shown`;
    if (a >= 100) return `${this.label(this.top)} shown`;
    return `${a}% ${this.label(this.top)}`;
  }

  private setMode(mode: CompareMode): void {
    if (mode === this.mode) return;
    this.change(() => {
      if (mode === 'switch') this.shown = this.value >= 50 ? this.other : 0;
      else if (this.mode === 'switch') {
        if (this.shown > 0) this.other = this.shown;
        this.value = mode === 'wipe' ? 50 : this.shown > 0 ? 100 : 0;
      }
      this.mode = this.chosen = mode;
    });
  }

  private hold(on: boolean): void {
    if (on === this.holding) return;
    this.holding = on;
    this.host.update();
  }

  private loaded(i: number): void {
    this.ready.add(i);
    this.host.update();
    if (this.pendingAnnounce && i === this.top) this.say(this.stateText());
  }

  private errored(i: number): void {
    this.failed.add(i);
    this.pendingAnnounce = false;
    this.say(`${this.label(i)} could not be loaded.`);
  }

  // ------------------------------------------------------------ input

  /** The `o` key held anywhere in the dialog shows the original. True when handled. */
  key(e: KeyboardEvent): boolean {
    if (!this.active || (e.key !== 'o' && e.key !== 'O') || e.altKey || e.ctrlKey || e.metaKey)
      return false;
    this.hold(e.type === 'keydown');
    return true;
  }

  /** A press on the photo in Reveal moves the divider there; a drag keeps moving it. */
  pointer(e: PointerEvent): void {
    if (!this.active || this.mode !== 'wipe') return;
    const stack = e.currentTarget as HTMLElement;
    if (e.type === 'pointerdown') {
      if (e.button !== 0 || !e.isPrimary) return;
      this.dragging = true;
      try {
        stack.setPointerCapture(e.pointerId);
      } catch {
        // A synthetic pointer cannot be captured; the press still moves the divider.
      }
      e.preventDefault();
    } else if (e.type !== 'pointermove') {
      if (this.dragging) this.dragEnd = performance.now();
      this.dragging = false;
      return;
    }
    if (!this.dragging) return;
    const r = stack.getBoundingClientRect();
    if (!r.width) return;
    const rtl = getComputedStyle(stack).direction === 'rtl';
    this.set(((rtl ? r.right - e.clientX : e.clientX - r.left) / r.width) * 100, true);
  }

  /** A drag that ended outside the photo must not count as a click on the backdrop. */
  dragged(): boolean {
    return this.dragging || performance.now() - this.dragEnd < 100;
  }

  private readonly onInput = (e: Event): void => {
    this.set(Number((e.target as HTMLInputElement).value), false);
  };

  /** Shift with an arrow, and Page Up / Page Down, move 10%. */
  private readonly onSliderKey = (e: KeyboardEvent): void => {
    const rtl = getComputedStyle(e.target as Element).direction === 'rtl';
    const k = e.key;
    let d = 0;
    if (k === 'PageUp') d = 10;
    else if (k === 'PageDown') d = -10;
    else if (e.shiftKey && (k === 'ArrowUp' || k === 'ArrowDown')) d = k === 'ArrowUp' ? 10 : -10;
    else if (e.shiftKey && (k === 'ArrowLeft' || k === 'ArrowRight'))
      d = (k === 'ArrowRight') !== rtl ? 10 : -10;
    if (!d) return;
    e.preventDefault();
    this.set(this.value + d, false);
  };

  private readonly onHold = (e: Event): void => {
    const t = e.type;
    if (t === 'keydown' || t === 'keyup') {
      const k = (e as KeyboardEvent).key;
      if (k !== ' ' && k !== 'Enter') return;
      this.hold(t === 'keydown');
    } else this.hold(t === 'pointerdown');
  };

  // ------------------------------------------------------------ render

  /** The image's accessible name ends with what is on screen. */
  alt(base: string): string {
    const a = this.named;
    const l0 = this.label(0);
    const lk = this.label(this.top);
    const what =
      a <= 0
        ? l0
        : a >= 100
          ? lk
          : `${l0} and ${lk}, ${this.mode === 'wipe' ? 'compared side by side' : 'blended'}`;
    return `${base} (${what})`;
  }

  get stackClass(): string {
    const starting = this.starting ? ' starting' : '';
    const geo = this.natural() ? this.geo : null;
    if (!geo) return `compare-${this.mode}${starting}`;
    const on = this.seen > 0;
    // A version that does not cover the whole original (a crop): Switch hides the original;
    // Reveal shows only the version on its side of the divider, the pattern around it.
    const part = on && !geo.covers[this.top];
    const hide = this.mode === 'switch' && part && this.seen >= 100;
    return `compare-${this.mode} framed${on ? ' top-on' : ''}${hide ? ' hide-base' : ''}${part && this.mode === 'wipe' ? ' top-part' : ''}${starting}`;
  }

  get stackStyle(): string {
    const a = this.mode === 'switch' ? 100 : this.value;
    const base = `--uvalib-compare: ${a}%; --uvalib-compare-opacity: ${a / 100}`;
    const geo = this.natural() ? this.geo : null;
    return geo ? `${base}; --uvalib-compare-n: ${a}; ${place(geo.boxes[0]!)}` : base;
  }

  /**
   * With a different framing, where the outlines of regions go: the original's box in the
   * stack, as `<uvalib-image-regions>`'s overlay inset. Empty otherwise.
   */
  get regionsStyle(): string {
    const geo = this.natural() ? this.geo : null;
    if (!geo) return '';
    const b = geo.boxes[0]!;
    return `--uvalib-image-regions-inset: ${r4(b.y)}% ${r4(100 - b.x - b.w)}% ${r4(100 - b.y - b.h)}% ${r4(b.x)}%`;
  }

  /** The other versions' images (each requested on first use), the divider and the side labels. */
  layers() {
    const top = this.top;
    const on = this.seen > 0;
    const size = this.natural();
    const geo = size ? this.geo : null;
    // The stack's size, reserved from the frames and the original: a canvas of the whole box
    // at the original's scale (never drawn on), sized like the image it stands for.
    const sizer =
      geo && size
        ? (() => {
            const w = size.w * geo.uw;
            const h = size.h * geo.uh;
            const k = Math.min(1, MAX_SIDE / Math.max(w, h));
            return html`<canvas
              class="frame-box"
              aria-hidden="true"
              width=${Math.max(1, Math.round(w * k))}
              height=${Math.max(1, Math.round(h * k))}
            ></canvas>`;
          })()
        : nothing;
    const layers = this.list.map((v, i) =>
      i === 0
        ? nothing
        : html`<img
            class="top ${i === top && on ? 'on' : ''}"
            style=${geo && v.frame ? place(geo.boxes[i]!) : nothing}
            data-version=${i}
            alt=""
            decoding="async"
            draggable="false"
            src=${this.requested.has(i) ? this.host.size(v.href) : nothing}
            @load=${() => this.loaded(i)}
            @error=${() => this.errored(i)}
          />`,
    );
    if (this.mode !== 'wipe') return html`${sizer}${layers}`;
    const a = this.seen;
    return html`${sizer}${layers}
      <div class="divider" aria-hidden="true"><span class="handle"></span></div>
      <span class="side side-start" aria-hidden="true" ?hidden=${a <= 0}>${this.label(top)}</span>
      <span class="side side-end" aria-hidden="true" ?hidden=${a >= 100}>${this.label(0)}</span>`;
  }

  /** Notes of the versions on screen, then the controls. `slot` puts them under regions' image. */
  controls(slot: string) {
    const a = this.named;
    const top = this.top;
    // Every note keeps its line (hidden while its version is not on screen), so showing
    // another version never moves the photo or the controls.
    const visible = (i: number) => (i === 0 ? a < 100 : i === top && a > 0);
    const notes = this.list.map((v, i) =>
      v.note
        ? html`<p class="note" ?data-off=${!visible(i)}><strong>${v.label}:</strong> ${v.note}</p>`
        : nothing,
    );
    const failed =
      this.failed.has(top) && this.amount > 0
        ? html`<p class="note">${this.label(top)} could not be loaded.</p>`
        : nothing;
    const seg = (pressed: boolean, text: string, onClick: () => void) =>
      html`<button
        type="button"
        class="seg"
        aria-pressed=${pressed ? 'true' : 'false'}
        @click=${onClick}
      >
        ${text}
      </button>`;
    const l0 = this.label(0);
    const lk = this.label(this.other);
    // Both panels are always drawn, in one grid cell: the row is as tall as the taller one,
    // so changing mode never moves the photo (the dialog re-centres on any height change).
    // The other panel is inert and hidden, out of the tab order and the accessibility tree.
    const switching = this.mode === 'switch';
    const panel = (on: boolean, body: unknown) =>
      html`<div class="mode-panel" ?inert=${!on} ?data-off=${!on}>${body}</div>`;
    const switchPanel = html`<div class="seg-group" role="group" aria-label="Version shown">
      ${this.list.map((v, i) =>
        seg(this.shown === i, v.label, () => this.change(() => (this.shown = i))),
      )}
    </div>`;
    const sliding = html`${
        this.list.length > 2
          ? html`<div class="seg-group" role="group" aria-label="Compare ${l0} with">
              ${this.list.map((v, i) =>
                i
                  ? seg(this.other === i, v.label, () => this.change(() => (this.other = i)))
                  : nothing,
              )}
            </div>`
          : nothing
      }
      <div class="slider">
        <label for=${this.uid}>${this.mode === 'fade' ? 'Fade to' : 'Reveal'} ${lk}</label>
        <input
          id=${this.uid}
          type="range"
          min="0"
          max="100"
          step="1"
          .value=${String(this.value)}
          aria-valuetext="${this.value}% ${lk}"
          @input=${this.onInput}
          @keydown=${this.onSliderKey}
        />
      </div>
      <div class="seg-group" role="group" aria-label="Jump to">
        ${[
          [0, l0],
          [50, '50/50'],
          [100, lk],
        ].map(
          ([v, text]) =>
            html`<button
              type="button"
              class="jump"
              @click=${() => this.change(() => (this.value = v as number))}
            >
              ${text}
            </button>`,
        )}
      </div>
      <button
        type="button"
        class="hold"
        aria-keyshortcuts="O"
        ?data-held=${this.holding}
        @pointerdown=${this.onHold}
        @pointerup=${this.onHold}
        @pointerleave=${this.onHold}
        @pointercancel=${this.onHold}
        @keydown=${this.onHold}
        @keyup=${this.onHold}
        @blur=${() => this.hold(false)}
        @contextmenu=${(e: Event) => e.preventDefault()}
      >
        Hold for ${l0}
      </button>`;
    return html`<div class="compare" part="compare" slot=${slot || nothing}>
      ${notes}${failed}
      <div class="compare-bar">
        <div class="seg-group" role="group" aria-label="Compare versions">
          ${MODES.map((m) => seg(this.mode === m, MODE_NAMES[m], () => this.setMode(m)))}
        </div>
        <div class="mode-panels">${panel(switching, switchPanel)}${panel(!switching, sliding)}</div>
      </div>
      <p class="visually-hidden" role="status">${this.message}</p>
    </div>`;
  }

  /**
   * Full size, in every mode: the original and the version shown (Switch) or compared (Reveal,
   * Fade), each named. The same two links in every mode keep the toolbar's height, so changing
   * mode never moves the photo; and a visitor can always open the original at full size.
   */
  full(): { href: string; label: string }[] {
    const k = this.mode === 'switch' ? this.shown || this.other : this.other;
    return [0, k].map((i) => ({ href: this.list[i]!.href, label: this.label(i) }));
  }
}
