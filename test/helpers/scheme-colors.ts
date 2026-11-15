// Computed colours of every component, as flat `{ "<what> <property>": value }` maps, so a
// test can compare a whole component against a palette (light parity with main, dark mode).

export type Colors = Record<string, string>;

/** `el.shadowRoot`, or `el` itself in light mode. */
export const rootOf = (el: Element): ParentNode => el.shadowRoot ?? el;

/** Follow `selectors` down through open shadow roots: each is queried in the previous match's root. */
export function deep(start: ParentNode, ...selectors: string[]): Element {
  let node: ParentNode = start;
  let found: Element | null = null;
  for (const sel of selectors) {
    found = node.querySelector(sel);
    if (!found) throw new Error(`deep(): no ${sel} (after ${selectors.join(' >> ')})`);
    node = rootOf(found);
  }
  return found!;
}

/** Read `props` of `el` (or its `pseudo` element) into `out` under `name`. */
export function read(
  out: Colors,
  name: string,
  el: Element,
  props: string[],
  pseudo?: string,
): Colors {
  const cs = getComputedStyle(el, pseudo);
  for (const p of props) out[`${name} ${p}`] = cs.getPropertyValue(p);
  return out;
}

const TEXT = ['color'];
const BG = ['background-color'];
const BOX = ['color', 'background-color', 'border-top-color'];

/** The page chrome: body, skip link, header (inline nav, popover), main nav, footer. */
export function pageColors(page: Element): Colors {
  const out: Colors = {};
  const r = rootOf(page);
  read(out, 'body', document.body, ['color', 'background-color']);
  read(out, 'skip-link', deep(r, '.skip-link'), ['color', 'background-color']);
  const header = deep(r, 'site-header');
  Object.assign(out, headerColors(header));
  const footer = deep(r, 'site-footer');
  const fr = rootOf(footer);
  read(out, 'footer pre', deep(fr, '.footer--pre'), ['color', 'background-color']);
  read(out, 'footer pre link', page.querySelector('.pre-link')!, TEXT);
  read(out, 'footer main', deep(fr, '.footer--main'), ['color', 'background-color']);
  read(out, 'footer link', deep(fr, '.footer--main a'), TEXT);
  read(out, 'footer post', deep(fr, '.footer--post'), ['color', 'background-color']);
  return out;
}

/** `<site-header>`: header, utility links, Menu button, popover and both main navs. */
export function headerColors(header: Element): Colors {
  const out: Colors = {};
  const hr = rootOf(header);
  read(out, 'header', deep(hr, 'header'), BG);
  read(out, 'utility link', deep(hr, 'nav.inline a'), TEXT);
  read(out, 'menu button', deep(hr, '.menu-toggle'), TEXT);
  read(out, 'popover', deep(hr, '[popover]'), ['background-color', 'border-top-color']);
  const rule = hr.querySelector('.menu-popover > nav.menu > ul');
  if (rule) read(out, 'popover rule', rule, ['border-top-color']);
  const bar = hr.querySelector('site-main-nav.bar');
  if (bar) Object.assign(out, mainNavColors(bar, 'bar'));
  return out;
}

/** `<site-main-nav>` in the bar layout. */
export function mainNavColors(nav: Element, name = 'main-nav'): Colors {
  const out: Colors = {};
  const nr = rootOf(nav);
  read(out, `${name} bar`, deep(nr, 'nav.main-nav'), ['background-color', 'border-bottom-color']);
  const toggle = deep(nr, '.toggle');
  read(out, `${name} toggle`, toggle, TEXT);
  read(out, `${name} chevron`, toggle, ['border-right-color'], '::after');
  read(out, `${name} panel`, deep(nr, '.panel'), ['background-color', 'box-shadow']);
  read(out, `${name} panel link`, deep(nr, '.panel a'), TEXT);
  return out;
}

/** `<uvalib-filter>` with scopes, the first one pressed. */
export function filterColors(el: Element): Colors {
  const out: Colors = {};
  const r = rootOf(el);
  read(out, 'filter divider', deep(r, '.scopes'), ['border-bottom-color']);
  read(out, 'filter chip', deep(r, '.scope[aria-pressed="false"]'), BOX);
  read(out, 'filter chip pressed', deep(r, '.scope[aria-pressed="true"]'), BOX);
  return out;
}

/** `<uvalib-date-range>`. */
export function dateRangeColors(el: Element): Colors {
  const out: Colors = {};
  const r = rootOf(el);
  read(out, 'date legend', deep(r, 'legend'), TEXT);
  read(out, 'date track', deep(r, '.slider-track'), BG);
  read(out, 'date range', deep(r, '.slider-highlight'), BG);
  read(out, 'date label', deep(r, '.input-label'), TEXT);
  read(out, 'date input', deep(r, '.date-input'), BOX);
  return out;
}

/** `<library-weekly-hours>`, loaded. */
export function weeklyHoursColors(el: Element): Colors {
  const out: Colors = {};
  const r = rootOf(el);
  read(out, 'weekly cell', deep(r, 'tbody td'), ['border-top-color']);
  read(out, 'weekly today', deep(r, 'th.today'), ['border-left-color']);
  read(out, 'weekly button', deep(r, '.uvalib-button'), BOX);
  read(out, 'weekly heading', deep(r, '[role=heading]'), TEXT);
  return out;
}

/** `<site-hours-section>`, loaded. */
export function hoursSectionColors(el: Element): Colors {
  const out: Colors = {};
  const r = rootOf(el);
  read(out, 'hours heading', deep(r, '.hour-head'), TEXT);
  read(out, 'hours link', deep(r, 'a'), TEXT);
  return out;
}

/** sRGB relative luminance of an `rgb()`/`rgba()` string. */
function luminance(rgb: string): number {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
}

/** WCAG contrast ratio of two `rgb()` colours. */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x! + 0.05) / (y! + 0.05);
}

/** `#rrggbb` to the `rgb(r, g, b)` form getComputedStyle returns. */
export const rgb = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
