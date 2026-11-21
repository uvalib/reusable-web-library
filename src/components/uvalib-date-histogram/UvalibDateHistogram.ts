import { html, nothing, unsafeCSS, type PropertyValues, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { trackEvent } from '../../base/analytics.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { SourceChildren } from '../../base/source-children.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { accessible } from '../../styles/accessible.js';

/** One dated count. `date` is `YYYY`, `YYYY-MM`, or an odd value such as a day or "undated". */
export interface HistogramItem {
  date: string;
  count: number;
}

/** The analytics category. */
const TAG = 'uvalib-date-histogram';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const SHORT_MONTHS = MONTHS.map((m) => m.slice(0, 3));

/** Element ids share the document id space in light DOM, so each instance gets its own prefix. */
let instanceCounter = 0;

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date `YYYY-MM-DD`. Parsed in UTC so a time zone cannot shift the year. */
function isIsoDate(s: unknown): s is string {
  const m = typeof s === 'string' ? ISO_DAY.exec(s) : null;
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  date.setUTCFullYear(y);
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Last calendar day of `month` (1–12), as `YYYY-MM-DD`. */
function lastDay(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function monthIndex(token: string): number {
  const t = token.toLowerCase();
  const full = MONTHS.findIndex((m) => m.toLowerCase() === t);
  if (full >= 0) return full + 1;
  const brief = SHORT_MONTHS.findIndex((m) => m.toLowerCase() === t);
  if (brief >= 0) return brief + 1;
  const n = Number(t);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : 0;
}

type DateKind = 'year' | 'month' | 'decade' | 'odd';

/** The bars drawn: one per month, year or decade. */
type Grain = 'year' | 'month' | 'decade';

/** A decade key, `1810s`. */
const DECADE = /^(\d{3}0)s$/;

const decadeKey = (year: number): string =>
  `${String(Math.floor(year / 10) * 10).padStart(4, '0')}s`;

/** The `selected` value a decade bar sets: its first and last year (`1810/1819`). */
function decadeSelection(key: string): string {
  const d = Number(key.slice(0, 4));
  return `${key.slice(0, 4)}/${String(d + 9).padStart(4, '0')}`;
}

/**
 * `granularity="auto"`: month bars when every dated count is a month and they span at most
 * 3 years (36 bars), year bars up to 30 years, decades beyond.
 */
const AUTO_MONTH_YEARS = 3;
const AUTO_YEAR_YEARS = 30;

/** `YYYY`, `YYYY-MM` and `YYYYs` (a decade) are buckets. A day, a month name or anything else is an odd date. */
function parseDate(raw: string): { key: string; kind: DateKind } | null {
  const s = raw.replace(/\s+/g, ' ').trim();
  if (!s) return null;
  if (DECADE.test(s)) return { key: s, kind: 'decade' };
  if (ISO_DAY.test(s)) return { key: isIsoDate(s) ? s : s, kind: 'odd' };
  const month = /^(\d{4})-(\d{2})$/.exec(s);
  if (month) {
    const mo = Number(month[2]);
    return mo >= 1 && mo <= 12
      ? { key: `${month[1]}-${month[2]}`, kind: 'month' }
      : { key: s, kind: 'odd' };
  }
  if (/^\d{4}$/.test(s)) return { key: s, kind: 'year' };
  const named = /^([A-Za-z]+)\s+(\d{4})$/.exec(s) ?? /^(\d{4})\s+([A-Za-z]+)$/.exec(s);
  if (named) {
    const year = /^\d{4}$/.test(named[1]!) ? named[1]! : named[2]!;
    const word = year === named[1] ? named[2]! : named[1]!;
    const mo = monthIndex(word);
    if (mo) return { key: `${year}-${String(mo).padStart(2, '0')}`, kind: 'month' };
  }
  return { key: s, kind: 'odd' };
}

/** Inclusive ISO span of a bucket key, or null when `key` is not a decade, year, month or day. */
function keyToSpan(key: string): { from: string; to: string } | null {
  if (isIsoDate(key)) return { from: key, to: key };
  const month = /^(\d{4})-(\d{2})$/.exec(key);
  if (month && Number(month[2]) >= 1 && Number(month[2]) <= 12) {
    return { from: `${key}-01`, to: lastDay(Number(month[1]), Number(month[2])) };
  }
  if (/^\d{4}$/.test(key)) return { from: `${key}-01-01`, to: `${key}-12-31` };
  const decade = DECADE.exec(key);
  if (decade) {
    const last = String(Number(decade[1]) + 9).padStart(4, '0');
    return { from: `${decade[1]}-01-01`, to: `${last}-12-31` };
  }
  return null;
}

function splitSelection(raw: string): string[] {
  return raw
    .trim()
    .split(/\s*(?:\.\.|\/|\u2013|\u2014)\s*/)
    .filter(Boolean);
}

/**
 * The inclusive span `selected` covers. A range is split only when every part is a
 * year, month or day. An odd phrase that itself contains `/`, `..` or a dash stays one token.
 */
function parseSelected(raw: string): { from: string; to: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parts = splitSelection(trimmed);
  if (parts.length >= 2 && parts.every((p) => keyToSpan(p) !== null)) {
    const spans = parts.map((p) => keyToSpan(p)!);
    const from = spans.reduce((a, s) => (s.from < a ? s.from : a), spans[0]!.from);
    const to = spans.reduce((a, s) => (s.to > a ? s.to : a), spans[0]!.to);
    return { from, to };
  }
  return keyToSpan(trimmed) ?? { from: trimmed, to: trimmed };
}

/** The first year of the half-century a year is in (decade rows are 1800–1849, 1850–1899, …). */
const halfCentury = (year: number): number => Math.floor(year / 50) * 50;

/** Years touched by two ISO dates, inclusive. */
function yearCount(min: string, max: string): number | null {
  const a = /^(\d{4})/.exec(min.trim());
  const b = /^(\d{4})/.exec(max.trim());
  if (!a || !b) return null;
  return Math.abs(Number(b[1]) - Number(a[1])) + 1;
}

function isoToSelected(from: string, to: string, grain: 'year' | 'month'): string {
  if (!isIsoDate(from) || !isIsoDate(to)) return '';
  const [a, b] = from <= to ? [from, to] : [to, from];
  if (grain === 'year') {
    const ya = a.slice(0, 4);
    const yb = b.slice(0, 4);
    return ya === yb ? ya : `${ya}/${yb}`;
  }
  const ma = a.slice(0, 7);
  const mb = b.slice(0, 7);
  return ma === mb ? ma : `${ma}/${mb}`;
}

/** Plural `unit`, with a trailing s dropped for a count of one (`photos` → `photo`). `series` stays. */
function unitWord(count: number, unit: string): string {
  const word = unit.trim() || 'items';
  if (count === 1 && /[^s]s$/i.test(word) && !/ies$/i.test(word)) return word.slice(0, -1);
  return word;
}

function bucketName(key: string, count: number, unit: string): string {
  const n = count.toLocaleString('en-US');
  const word = unitWord(count, unit);
  const month = /^(\d{4})-(\d{2})$/.exec(key);
  if (month) return `${MONTHS[Number(month[2]) - 1]} ${month[1]}: ${n} ${word}`;
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (day && isIsoDate(key))
    return `${Number(day[3])} ${MONTHS[Number(day[2]) - 1]} ${day[1]}: ${n} ${word}`;
  return `${key}: ${n} ${word}`;
}

interface Bar {
  key: string;
  count: number;
  year: number;
  month: number;
}

interface Odd {
  key: string;
  count: number;
}

interface Model {
  bars: Bar[];
  odds: Odd[];
  max: number;
}

function addOdd(odds: Map<string, number>, key: string, count: number) {
  odds.set(key, (odds.get(key) ?? 0) + count);
}

/** Each valid item as a parsed date and a count. */
function parsedItems(items: HistogramItem[]): { key: string; kind: DateKind; count: number }[] {
  const out: { key: string; kind: DateKind; count: number }[] = [];
  for (const item of items) {
    if (!item || typeof item.date !== 'string') continue;
    const count = typeof item.count === 'number' ? item.count : Number(item.count);
    if (!Number.isFinite(count) || count < 0) continue;
    const parsed = parseDate(item.date);
    if (parsed) out.push({ ...parsed, count });
  }
  return out;
}

/** The grain `granularity="auto"` draws. `span` is the years to cover when there are no counts yet. */
function autoGrain(items: HistogramItem[], span: number | null): Grain {
  const dated = parsedItems(items).filter((p) => p.kind !== 'odd');
  if (!dated.length) return span != null && span > AUTO_YEAR_YEARS ? 'decade' : 'year';
  const years = dated.map((p) => Number(p.key.slice(0, 4)));
  const width = Math.max(...years) - Math.min(...years) + 1;
  if (dated.every((p) => p.kind === 'month') && width <= AUTO_MONTH_YEARS) return 'month';
  if (dated.some((p) => p.kind === 'decade')) return 'decade';
  return width <= AUTO_YEAR_YEARS ? 'year' : 'decade';
}

/** Continuous buckets from the earliest date to the latest, with the months, years or decades between filled in. */
function buildModel(items: HistogramItem[], grain: Grain): Model {
  const buckets = new Map<string, number>();
  const odds = new Map<string, number>();
  for (const parsed of parsedItems(items)) {
    const { count } = parsed;
    if (
      parsed.kind === 'odd' ||
      (grain === 'month' && parsed.kind === 'year') ||
      (grain !== 'decade' && parsed.kind === 'decade')
    ) {
      addOdd(odds, parsed.key, count);
      continue;
    }
    const key =
      grain === 'year'
        ? parsed.key.slice(0, 4)
        : grain === 'decade'
          ? decadeKey(Number(parsed.key.slice(0, 4)))
          : parsed.key;
    buckets.set(key, (buckets.get(key) ?? 0) + count);
  }
  const bars: Bar[] = [];
  const keys = [...buckets.keys()].sort();
  if (keys.length) {
    const first = Number(keys[0]!.slice(0, 4));
    const last = Number(keys[keys.length - 1]!.slice(0, 4));
    for (let year = first; year <= last; year += grain === 'decade' ? 10 : 1) {
      if (grain === 'decade') {
        const key = decadeKey(year);
        bars.push({ key, count: buckets.get(key) ?? 0, year, month: 0 });
      } else if (grain === 'year') {
        const key = String(year);
        bars.push({ key, count: buckets.get(key) ?? 0, year, month: 0 });
      } else {
        for (let month = 1; month <= 12; month++) {
          const key = `${year}-${String(month).padStart(2, '0')}`;
          bars.push({ key, count: buckets.get(key) ?? 0, year, month });
        }
      }
    }
  }
  const max = bars.reduce((m, b) => (b.count > m ? b.count : m), 0);
  return {
    bars,
    odds: [...odds.entries()].map(([key, count]) => ({ key, count })),
    max,
  };
}

function barPercent(count: number, max: number, log: boolean): number {
  if (count <= 0 || max <= 0) return 0;
  if (log) return (Math.log1p(count) / Math.log1p(max)) * 100;
  return (count / max) * 100;
}

function parseCount(text: string | null | undefined): number | null {
  if (text == null) return null;
  const t = text.replace(/,/g, '').trim();
  if (!t) return null;
  // A dash in a count cell is zero, so a boundary year of dashes is still drawn.
  if (t === '\u2014' || t === '-' || t === '\u2013') return 0;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** A header row has `<th>`, sits in `<thead>`, or its count cell is not a number (a dash is zero, so data). */
function isHeaderRow(row: HTMLTableRowElement, countCol: number): boolean {
  const cells = [...row.cells];
  if (cells.some((c) => c.tagName === 'TH')) return true;
  if (row.parentElement?.tagName === 'THEAD') return true;
  return parseCount(cells[countCol]?.textContent) == null;
}

/** A child `<table>`: two columns (date, count) or a year-by-month grid. */
function parseTable(table: HTMLTableElement): HistogramItem[] {
  const rows = [...table.rows];
  if (!rows.length) return [];
  const header = [...rows[0]!.cells].map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim());
  const headerMonths = header.map((h) => monthIndex(h));
  // A count of 1–12 in a two-column table is not a month heading. A grid has several columns.
  const matrix = header.length >= 3 && headerMonths.filter((m) => m > 0).length >= 2;
  const items: HistogramItem[] = [];
  if (matrix) {
    for (const row of rows.slice(1)) {
      const cells = [...row.cells];
      const year = (cells[0]?.textContent ?? '').trim();
      if (!/^\d{4}$/.test(year)) continue;
      headerMonths.forEach((mo, i) => {
        if (!mo) return;
        const count = parseCount(cells[i]?.textContent);
        if (count == null) return;
        items.push({ date: `${year}-${String(mo).padStart(2, '0')}`, count });
      });
    }
    return items;
  }
  const lower = header.map((h) => h.toLowerCase());
  let dateCol = lower.findIndex((h) => /date|month|year/.test(h));
  let countCol = lower.findIndex((h) => /count|photo|total|number|item/.test(h));
  if (dateCol < 0) dateCol = 0;
  if (countCol < 0) countCol = dateCol === 0 ? 1 : 0;
  // "undated" matches /date/, so a header is a `<th>` row or a count cell that is not a number.
  const body = isHeaderRow(rows[0]!, countCol) ? rows.slice(1) : rows;
  for (const row of body) {
    const cells = [...row.cells];
    const date = (cells[dateCol]?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const count = parseCount(cells[countCol]?.textContent);
    if (!date || count == null) continue;
    items.push({ date, count });
  }
  return items;
}

/** A `<uvalib-date-range>` this histogram can read and write, without importing that module. */
interface RangePartner extends HTMLElement {
  min: string;
  max: string;
  value: string[];
}

/**
 * Kept with `no-style`: the bar tracks keep a fixed height (so drawing the bars does not move
 * the page), each bar is at least 24px, a selection is an inset ring rather than a colour,
 * bars keep a border in forced colors, and a wide month row scrolls inside the component.
 * `host` is `:host` or the tag.
 */
const structuralRules = (host: string) => {
  const attr = (sel: string) => (host === ':host' ? `:host(${sel})` : `${host}${sel}`);
  return `
  ${host} { display: block; max-width: 100%; min-width: 0; box-sizing: border-box; }
  ${host} .scroller { overflow-x: auto; max-width: 100%; overscroll-behavior-x: contain; }
  ${host} :is(.by-month, .by-decade) .scroller { scroll-padding-inline-start: 4rem; }
  ${host} .year {
    display: grid;
    grid-template-columns: 3.5rem minmax(0, 1fr);
    column-gap: 0.5rem;
    align-items: end;
    margin: 0 0 0.5rem;
  }
  ${host} .year-label {
    position: sticky;
    inset-inline-start: 0;
    z-index: 1;
    text-align: end;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    background: var(--uva-color-surface, #fff);
    color: var(--uva-color-text, #2b2b2b);
  }
  ${host} .bars {
    display: grid;
    grid-template-columns: repeat(12, minmax(1.5rem, 1fr));
    gap: 2px;
    block-size: var(--uvalib-date-histogram-bar-size, 8rem);
    min-inline-size: calc(12 * 1.5rem + 11 * 2px);
  }
  ${host} .by-decade .bars {
    grid-template-columns: repeat(5, minmax(1.5rem, 1fr));
    min-inline-size: calc(5 * 1.5rem + 4 * 2px);
  }
  ${host} .bar {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: stretch;
    min-inline-size: 1.5rem;
    min-block-size: 1.5rem;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 1px solid var(--uva-color-control-border, #808080);
    background: var(--uva-color-track, #e5e7eb);
    font: inherit;
    color: inherit;
    cursor: pointer;
  }
  ${host} .bar::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
  }
  ${host} .fill {
    display: block;
    width: 100%;
    min-height: 0;
    background: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
    border: 1px solid var(--uva-color-text, #2b2b2b);
    box-sizing: border-box;
  }
  ${host} .bar.is-empty .fill { background: transparent; border-color: transparent; }
  ${host} .bar[aria-pressed='true']::after {
    box-shadow: inset 0 0 0 3px var(--uva-color-text, #2b2b2b);
    background-image: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 3px,
      var(--uva-color-on-accent, #fff) 3px,
      var(--uva-color-on-accent, #fff) 4px
    );
  }
  ${host} .by-year .bars {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    align-content: flex-end;
    min-inline-size: 0;
    block-size: auto;
    min-block-size: var(--uvalib-date-histogram-bar-size, 8rem);
  }
  ${host} .by-year .bar {
    flex: 1 1 1.5rem;
    max-inline-size: 3rem;
    height: auto;
    block-size: var(--uvalib-date-histogram-bar-size, 8rem);
  }
  ${host} .strip {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    block-size: var(--uvalib-date-histogram-strip-size, 1.5rem);
    max-width: 100%;
  }
  ${host} .strip-bar {
    flex: 1 1 0;
    min-inline-size: 0;
    box-sizing: border-box;
    background: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
    border: 1px solid var(--uva-color-text, #2b2b2b);
  }
  ${host} .strip-bar.is-empty { background: transparent; }
  ${host} .strip-bar.is-selected {
    box-shadow: inset 0 0 0 2px var(--uva-color-text, #2b2b2b);
    background-image: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 2px,
      var(--uva-color-on-accent, #fff) 2px,
      var(--uva-color-on-accent, #fff) 3px
    );
  }
  ${host} .outliers { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0.5rem 0; }
  ${host} .chip {
    box-sizing: border-box;
    min-block-size: 1.5rem;
    min-inline-size: 1.5rem;
    margin: 0;
    padding: 0.15rem 0.6rem;
    border: 1px solid var(--uva-color-control-border, #808080);
    border-radius: 999px;
    background: var(--uva-color-surface-raised, #fff);
    color: var(--uva-color-text, #2b2b2b);
    font: inherit;
    cursor: pointer;
  }
  ${host} .chip[aria-pressed='true'] {
    box-shadow: inset 0 0 0 2px var(--uva-color-text, #2b2b2b);
    font-weight: 700;
  }
  ${host} .scroll-hint {
    margin: 0 0 0.35rem;
    font-size: 0.875rem;
    color: var(--uva-color-text-muted, #4b5563);
  }
  ${host} .plot { min-block-size: var(--uvalib-date-histogram-bar-size, 8rem); }
  ${host} .empty { margin: 0; color: var(--uva-color-text-muted, #4b5563); }
  ${host} .table-wrap { overflow-x: auto; max-width: 100%; }
  ${host} table { border-collapse: collapse; }
  ${host} th, ${host} td {
    border: 1px solid var(--uva-color-control-border, #808080);
    padding: 0.2rem 0.4rem;
    text-align: end;
    color: var(--uva-color-text, #2b2b2b);
  }
  ${host} th[scope='row'], ${host} caption { text-align: start; }
  ${host} caption { font-weight: 600; }
  ${host} .visually-hidden {
    position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
    overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
  }
  ${host} :is(button, summary, [tabindex]):focus-visible {
    outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
    outline-offset: 2px;
  }
  ${host}[hidden], ${host} [hidden] { display: none !important; }
  ${attr("[variant='strip']")} .chart { min-block-size: var(--uvalib-date-histogram-strip-size, 1.5rem); }
  @media (forced-colors: active) {
    ${host} .bar, ${host} .strip-bar, ${host} .fill, ${host} .chip, ${host} th, ${host} td {
      forced-color-adjust: none;
      border: 1px solid ButtonText;
      background: Canvas;
      color: ButtonText;
    }
    ${host} .fill, ${host} .strip-bar { background: ButtonText; }
    ${host} .bar.is-empty .fill, ${host} .strip-bar.is-empty { background: transparent; }
    ${host} .bar[aria-pressed='true'], ${host} .chip[aria-pressed='true'], ${host} .strip-bar.is-selected {
      outline: 3px solid Highlight;
      outline-offset: -4px;
    }
    ${host} :is(.bar, .chip, summary, [tabindex]):focus-visible {
      outline: 3px solid Highlight;
      outline-offset: 2px;
    }
  }
`;
};
const shadowStructure = unsafeCSS(structuralRules(':host'));

/** The tag stays on one line so the caption text is the label, not the template's indentation. */
function tableCaption(text: string): TemplateResult {
  // prettier-ignore
  return html`<caption>${text}</caption>`;
}

/**
 * Monthly, yearly or per-decade counts as bars: a date distribution for a search page, an
 * archive timeline or a card. Give `items` (`{ date, count }`, `date` a `YYYY` or `YYYY-MM`)
 * or a child `<table>` (the no-JS fallback). `granularity="month"` draws twelve bars for every
 * year from the first date to the last, including months with a count of zero. A year-only
 * count in a month chart, a day, or any other date is a chip beside the chart.
 *
 * `granularity="decade"` is for a long span (two centuries of minutes): one bar per decade
 * ("1810s: 22 meetings"), an empty decade a gap, five decades to a row labelled with its
 * first year (1800, 1850, …), the decades lined up in columns. Choosing a decade selects
 * its first to last year (`selected="1810/1819"`, `select` `{ from: '1810-01-01', to:
 * '1819-12-31' }`); up and down arrows move 50 years. `granularity="auto"` draws months
 * when every count is a month within 3 years (at most 36 bars), years up to 30 years, and
 * decades beyond. A year row that scrolls sideways is not offered: 200 years at the 24px
 * minimum bar is over 5,000px, so a sidebar would show ten years at a time and lose the
 * shape that decades show whole.
 *
 * Each bar is a button named like "October 2015: 5,311 photos". Arrow keys move between
 * bars; Enter or Space selects. `selected` is one bucket (`2015-10`, `2015`) or a range
 * (`2015-03/2016-01`, also `..` or an en dash). The selection is `aria-pressed`, an inset
 * ring and a stripe, not colour alone. Choosing a bar fires `select` with `{ from, to }`
 * as ISO dates (a month runs from its first day to its last). Choosing the selected bar
 * again clears it (`from` and `to` are empty strings).
 *
 * `range-for` is the id of a `<uvalib-date-range>`. A bar click sets that element's
 * `value`. Whenever the range's value changes, from its controls or set in script (a Clear
 * button, Back/Forward, a restored URL), this element highlights the buckets that overlap it
 * (it listens for `uvalib-date-range-value`). A value that is exactly the range's own `min`
 * and `max` is no selection. On connect or reconnect, or when the range is added later, the
 * range's value wins when it holds a selection or changed while this element was away;
 * otherwise `selected` is written to it. A range value is never rounded to whole buckets
 * and written back. Setting `selected` here updates the date range.
 *
 * `variant="strip"` is the small per-year row for a card: not interactive, `role="img"`,
 * one bar per year, or per decade with `decade` (or `auto` over more than 30 years).
 *
 * The chart reserves its height before the counts arrive: one bar track, or one track
 * per year (per half-century for decades) when those years are already known from the
 * data, a linked date range or the table (`--uvalib-date-histogram-bar-size`, 8rem, plus
 * the row gap). Filling the bars in does not move the page. On a narrow screen a month row
 * scrolls inside the component; "Scroll sideways to see more." shows while it overflows.
 * Years wrap; a decade row fits 320px.
 *
 * @tagname uvalib-date-histogram
 * @slot - A `<table>` of dates and counts: two columns (date, count) or a year-by-month grid. Without JavaScript it is the fallback. With JavaScript it supplies the counts when `items` is empty. Show as table lists those counts, including odd dates; once `items` is set it lists `items` instead.
 * @fires select - A bar or an odd-date chip was chosen, or the current one chosen again to clear it. `detail` is `{ from, to }` (ISO dates, or the odd token). Empty strings clear the selection. Not fired when `selected` is set in script or when a linked date range changes. Bubbles and is composed.
 * @fires uvalib-analytics-event - For `<site-analytics>`: `['uvalib-date-histogram', 'select', '<from>–<to>']` when both ends are ISO dates, or `'other'` for any other choice. Not fired when the selection is cleared, set in script, or restored from a date range. Bubbles and is composed.
 * @csspart chart - The bar chart (shadow mode).
 * @csspart bar - A bar button, or a strip segment (shadow mode).
 * @csspart table - The generated table in Show as table (shadow mode).
 * @cssprop [--uvalib-date-histogram-bar-size=8rem] - Height of each bar track. The chart reserves one track, or one per known year, before the counts arrive.
 * @cssprop [--uvalib-date-histogram-strip-size=1.5rem] - Height of `variant="strip"`.
 * @cssprop [--uva-brand-blue=#232d4b] - Bar fill.
 * @cssprop [--uva-brand-orange=#e57200] - Focus ring when `--uva-color-focus` is unset.
 * @cssprop [--uva-font-family=inherit] - Font family.
 * @cssprop --uva-color-accent-bg - Dark-mode role token: bar fill (else `--uva-brand-blue`).
 * @cssprop --uva-color-on-accent - Dark-mode role token: the selection stripe (else #fff).
 * @cssprop --uva-color-text - Dark-mode role token: labels and the selection ring (else #2b2b2b).
 * @cssprop --uva-color-text-muted - Dark-mode role token: the scroll hint (else #4b5563).
 * @cssprop --uva-color-track - Dark-mode role token: the empty part of a bar (else #e5e7eb).
 * @cssprop --uva-color-surface - Dark-mode role token: the sticky year label (else #fff).
 * @cssprop --uva-color-surface-raised - Dark-mode role token: odd-date chips (else #fff).
 * @cssprop --uva-color-control-border - Dark-mode role token: bar, chip and table borders (else #808080).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 */
export class UvalibDateHistogram extends UvalibElement {
  static styles = [
    accessible,
    shadowStructure,
    unsafeCSS(`
      :host { font-family: var(--uva-font-family, inherit); }
      .year-label { background: var(--uva-color-surface, #fff); color: var(--uva-color-text, #2b2b2b); }
      .bar {
        border-color: var(--uva-color-control-border, #808080);
        background: var(--uva-color-track, #e5e7eb);
      }
      .fill {
        background: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
        border-color: var(--uva-color-text, #2b2b2b);
        transition: height 0.2s ease;
      }
      .bar[aria-pressed='true']::after {
        box-shadow: inset 0 0 0 3px var(--uva-color-text, #2b2b2b);
        background-image: repeating-linear-gradient(
          -45deg,
          transparent,
          transparent 3px,
          var(--uva-color-on-accent, #fff) 3px,
          var(--uva-color-on-accent, #fff) 4px
        );
      }
      .strip-bar { background: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b)); border-color: var(--uva-color-text, #2b2b2b); }
      .strip-bar.is-selected {
        box-shadow: inset 0 0 0 2px var(--uva-color-text, #2b2b2b);
        background-image: repeating-linear-gradient(-45deg, transparent, transparent 2px, var(--uva-color-on-accent, #fff) 2px, var(--uva-color-on-accent, #fff) 3px);
      }
      .chip {
        background: var(--uva-color-surface-raised, #fff);
        color: var(--uva-color-text, #2b2b2b);
        border-color: var(--uva-color-control-border, #808080);
      }
      .chip[aria-pressed='true'] { box-shadow: inset 0 0 0 2px var(--uva-color-text, #2b2b2b); }
      .scroll-hint { color: var(--uva-color-text-muted, #4b5563); }
      .empty { margin: 0; color: var(--uva-color-text-muted, #4b5563); }
      th, td { border-color: var(--uva-color-control-border, #808080); color: var(--uva-color-text, #2b2b2b); }
      caption { color: var(--uva-color-text, #2b2b2b); }
      @media (prefers-reduced-motion: reduce) {
        .fill { transition: none; }
      }
    `),
  ];

  /** Counts to draw. When non-empty, wins over the child table. Set a new array to update. */
  @property({ type: Array })
  items: HistogramItem[] = [];

  /**
   * `month` (twelve bars per year), `year`, `decade` (one bar per decade, five to a row), or
   * `auto`: months when every count is a month within 3 years, years up to 30 years, else
   * decades. Anything else is month, with one console warning.
   */
  @property({ type: String })
  granularity: 'year' | 'month' | 'decade' | 'auto' = 'month';

  /** `log` scales bar height by log(count + 1). Anything else is linear. */
  @property({ type: String })
  scale: 'linear' | 'log' = 'linear';

  /**
   * One bucket (`2015-10` or `2015`) or a range (`2015-03/2016-01`). A linked date range
   * writes a range here. Empty when nothing is selected.
   */
  @property({ type: String })
  selected = '';

  /** Id of a `<uvalib-date-range>` to keep in step with, both ways. */
  @property({ type: String, attribute: 'range-for' })
  rangeFor = '';

  /** `strip`: a non-interactive per-year row (`role="img"`). Anything else is the bar chart. */
  @property({ type: String })
  variant = '';

  /** Word after the count in each bar's name. Plural; a count of one drops a trailing s. */
  @property({ type: String })
  unit = 'items';

  /** Accessible name of the bar group, and the start of the strip's summary. */
  @property({ type: String })
  label = 'Dates';

  @state() private tableItems: HistogramItem[] = [];
  @state() private authorTable = false;
  @state() private overflowing = false;
  @state() private activeKey = '';

  private readonly uid = `uvalib-date-histogram-${++instanceCounter}`;
  private tableKey = '';
  private warnedGrain = false;
  private partner: RangePartner | null = null;
  /** The next update came from the linked date range, so it must not write back. */
  private echo = false;
  private seen = false;
  /** True while `choose()` assigns `selected`, so that click keeps the roving tab stop. */
  private choosing = false;
  private ro?: ResizeObserver;
  private observed?: Element;
  private partnerObserver?: MutationObserver;
  /** The date range's value when this element last read or wrote it, and which range that was. */
  private lastSeen?: string;
  private lastSeenEl?: RangePartner;
  private drawnGrain?: Grain;

  constructor() {
    super();
    new SourceChildren(
      this,
      () => this.lightDom,
      (nodes) => this.readTable(nodes),
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
    this.bindPartner();
    // A reconnect schedules no update, so take up the date range here.
    if (this.hasUpdated) {
      this.seen = true;
      this.syncOnBind();
    }
    this.measureOverflow();
    if (!customElements.get('uvalib-date-range')) {
      void customElements.whenDefined('uvalib-date-range').then(() => {
        if (!this.isConnected) return;
        this.bindPartner();
        this.syncOnBind();
      });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unlisten(this.partner);
    this.partner = null;
    this.ro?.disconnect();
    this.ro = undefined;
    this.observed = undefined;
    this.partnerObserver?.disconnect();
    this.partnerObserver = undefined;
    this.seen = false;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (
      !this.warnedGrain &&
      changed.has('granularity') &&
      !['year', 'month', 'decade', 'auto'].includes(this.granularity)
    ) {
      this.warnedGrain = true;
      console.warn(
        `<${TAG}>: granularity must be "month", "year", "decade" or "auto"; using "month".`,
      );
    }
    if (changed.has('selected') && !this.choosing) this.activeKey = '';
    this.choosing = false;
  }

  protected override updated(changed: PropertyValues<this>): void {
    const echoing = this.echo;
    this.echo = false;
    const before = this.partner;
    this.bindPartner();
    const appeared = this.partner != null && this.partner !== before;
    if (!this.seen || changed.has('rangeFor') || appeared) {
      this.seen = true;
      if (!echoing || this.selected) this.syncOnBind();
    } else if (changed.has('selected') && !echoing) {
      this.pushPartner();
    }
    // With `auto`, counts arriving can change the grain, so a range read before them is read again.
    const grain = this.grain;
    if (this.drawnGrain && grain !== this.drawnGrain && this.partner) this.pullPartner();
    this.drawnGrain = grain;
    this.watchForPartner();
    this.measureOverflow();
  }

  private get grain(): Grain {
    const g = this.granularity;
    if (g === 'year' || g === 'decade') return g;
    if (g === 'auto') return autoGrain(this.data, this.partnerSpan());
    return 'month';
  }

  /** The strip is one bar per year, or per decade for `decade` (or `auto` over a long span). */
  private get stripGrain(): Grain {
    if (this.granularity === 'decade') return 'decade';
    if (this.granularity === 'auto') return this.grain === 'decade' ? 'decade' : 'year';
    return 'year';
  }

  /** Years from the linked date range's `min` to its `max`, or null. */
  private partnerSpan(): number | null {
    const partner = this.partner ?? this.findPartner();
    if (!partner) return null;
    return yearCount(
      partner.min || partner.getAttribute('min') || '',
      partner.max || partner.getAttribute('max') || '',
    );
  }

  private get strip(): boolean {
    return this.variant === 'strip';
  }

  private get log(): boolean {
    return this.scale === 'log';
  }

  private get labelText(): string {
    return this.label.trim() || 'Dates';
  }

  private get data(): HistogramItem[] {
    return this.items.length ? this.items : this.tableItems;
  }

  private readTable(nodes: Node[]): void {
    const tables = nodes.filter((n): n is HTMLTableElement => n instanceof HTMLTableElement);
    const items = tables.flatMap((table) => parseTable(table));
    const key = JSON.stringify(items);
    const author = tables.length > 0;
    if (key === this.tableKey && author === this.authorTable) return;
    this.tableKey = key;
    this.tableItems = items;
    this.authorTable = author;
    if (this.hasUpdated) this.requestUpdate();
  }

  private findPartner(): RangePartner | null {
    const id = this.rangeFor.trim();
    if (!id) return null;
    const root = this.getRootNode();
    const found =
      (root instanceof Document || root instanceof ShadowRoot ? root.getElementById(id) : null) ??
      this.ownerDocument.getElementById(id);
    if (!found || found.localName !== 'uvalib-date-range') return null;
    return found as RangePartner;
  }

  private bindPartner(): void {
    const el = this.findPartner();
    if (el === this.partner) return;
    this.unlisten(this.partner);
    this.partner = el;
    // `uvalib-date-range-value` also covers a `value` set in script; `date-range-change`
    // is kept for a date range from an older release.
    el?.addEventListener('uvalib-date-range-value', this.onPartner);
    el?.addEventListener('date-range-change', this.onPartner);
  }

  private unlisten(el: RangePartner | null): void {
    el?.removeEventListener('uvalib-date-range-value', this.onPartner);
    el?.removeEventListener('date-range-change', this.onPartner);
  }

  /**
   * On connect, or when the date range appears: the range's value wins when it holds a
   * selection or changed while this element was away; otherwise `selected` is written to it.
   */
  private syncOnBind(): void {
    const el = this.partner;
    if (!el) return;
    const r = this.partnerRange();
    const changedAway =
      !!r && this.lastSeenEl === el && this.lastSeen != null && r.join('/') !== this.lastSeen;
    this.lastSeenEl = el;
    if (!this.selected || changedAway || (r && !this.isFullSpan(r[0], r[1]))) this.pullPartner();
    else this.pushPartner();
  }

  /** While the named date range is not in the tree yet, take its value when it appears. */
  private watchForPartner(): void {
    if (!this.isConnected || !this.rangeFor.trim() || this.partner) {
      this.partnerObserver?.disconnect();
      this.partnerObserver = undefined;
      return;
    }
    if (this.partnerObserver) return;
    const root = this.getRootNode();
    if (!(root instanceof Document) && !(root instanceof ShadowRoot)) return;
    this.partnerObserver = new MutationObserver(() => {
      if (!this.isConnected || this.partner) return;
      this.bindPartner();
      if (!this.partner) return;
      this.partnerObserver?.disconnect();
      this.partnerObserver = undefined;
      this.syncOnBind();
      this.requestUpdate();
    });
    this.partnerObserver.observe(root, { childList: true, subtree: true });
  }

  private partnerEnds(): { min: string; max: string } | null {
    const el = this.partner;
    if (!el) return null;
    return {
      min: el.min || el.getAttribute('min') || '',
      max: el.max || el.getAttribute('max') || '',
    };
  }

  /** `[min, max]` is the date range's empty state (a cleared selection, or the host's initial value). */
  private isFullSpan(from: string, to: string): boolean {
    const ends = this.partnerEnds();
    if (!ends?.min || !ends.max) return false;
    return from === ends.min && to === ends.max;
  }

  /** The date range's value as it shows it: missing ends are `min` / `max`, both clamped to them. */
  private partnerRange(): [string, string] | null {
    const el = this.partner;
    const ends = this.partnerEnds();
    if (!el || !ends) return null;
    const value = Array.isArray(el.value) ? el.value : [];
    const bounded = isIsoDate(ends.min) && isIsoDate(ends.max) && ends.min <= ends.max;
    const clamp = (iso: string) =>
      !bounded ? iso : iso < ends.min ? ends.min : iso > ends.max ? ends.max : iso;
    const a = isIsoDate(value[0]) ? clamp(value[0]) : bounded ? ends.min : '';
    const b = isIsoDate(value[1]) ? clamp(value[1]) : bounded ? ends.max : '';
    if (!a || !b) return null;
    return a <= b ? [a, b] : [b, b];
  }

  private onPartner = (): void => {
    this.pullPartner();
  };

  /** Show the date range's value. A `selected` that already spans it exactly is kept as written. */
  private pullPartner(): void {
    const r = this.partnerRange();
    if (!r) return;
    this.lastSeen = r.join('/');
    const [from, to] = r;
    if (this.isFullSpan(from, to)) {
      if (this.selected) {
        this.echo = true;
        this.selected = '';
      }
      return;
    }
    // Compared as the range shows it, so a decade from before `min` (1810–1819 with a
    // 1817 minimum) stays as chosen.
    const cur = this.selected ? parseSelected(this.selected) : null;
    const ends = this.partnerEnds();
    const clamp = (iso: string) =>
      ends && isIsoDate(ends.min) && isIsoDate(ends.max)
        ? iso < ends.min
          ? ends.min
          : iso > ends.max
            ? ends.max
            : iso
        : iso;
    if (cur && clamp(cur.from) === from && clamp(cur.to) === to) return;
    const next = isoToSelected(from, to, this.grain === 'month' ? 'month' : 'year');
    if (!next || next === this.selected) return;
    this.echo = true;
    this.selected = next;
  }

  /**
   * Write `selected` to the date range. A `selected` that is only the range's own value
   * rounded to this chart's buckets is not written back (that would widen the range),
   * unless `force` (a visitor chose that bar again to take the whole bucket).
   */
  private pushPartner(force = false): void {
    const el = this.partner;
    if (!el) return;
    const span = this.selected ? parseSelected(this.selected) : null;
    let next: [string, string] | null = null;
    if (span && isIsoDate(span.from) && isIsoDate(span.to)) next = [span.from, span.to];
    else if (!this.selected && isIsoDate(el.min) && isIsoDate(el.max)) next = [el.min, el.max];
    if (!next) return;
    const cur = el.value;
    if (Array.isArray(cur) && cur[0] === next[0] && cur[1] === next[1]) return;
    const r = this.partnerRange();
    if (
      !force &&
      r &&
      this.selected &&
      !this.isFullSpan(r[0], r[1]) &&
      isoToSelected(r[0], r[1], this.grain === 'month' ? 'month' : 'year') === this.selected.trim()
    ) {
      this.lastSeen = r.join('/');
      return;
    }
    el.value = next;
    this.lastSeen = next.join('/');
  }

  private emit(from: string, to: string): void {
    this.dispatchEvent(
      new CustomEvent('select', { detail: { from, to }, bubbles: true, composed: true }),
    );
    if (from && to) {
      const name = isIsoDate(from) && isIsoDate(to) ? `${from}\u2013${to}` : 'other';
      trackEvent(this, [TAG, 'select', name]);
    }
  }

  private choose(key: string): void {
    this.activeKey = key;
    const token = this.selected.trim();
    const bucket = keyToSpan(key);
    // A decade selects its first to last year, the form a linked date range writes back.
    const pick = this.grain === 'decade' && DECADE.test(key) ? decadeSelection(key) : key;
    // A second click on the same token clears it. A stored month that only names part
    // of the linked range (October 5–20 shown as 2015-10) expands to the whole bucket
    // instead: assigning the same `selected` string would not run `pushPartner()`.
    if (token === key || token === pick) {
      const value = this.partner?.value;
      const partial =
        !!bucket &&
        Array.isArray(value) &&
        value.length >= 2 &&
        (value[0] !== bucket.from || value[1] !== bucket.to);
      if (partial && bucket) {
        this.pushPartner(true);
        this.emit(bucket.from, bucket.to);
        return;
      }
      this.choosing = true;
      this.selected = '';
      this.emit('', '');
      return;
    }
    this.choosing = true;
    this.selected = pick;
    const span = parseSelected(pick);
    this.emit(span?.from ?? key, span?.to ?? key);
  }

  private onBarClick(e: Event): void {
    const key = (e.currentTarget as HTMLElement).dataset.date ?? '';
    if (key) this.choose(key);
  }

  private onBarKeydown(e: KeyboardEvent): void {
    const keys = this.flatKeys();
    const i = keys.indexOf((e.currentTarget as HTMLElement).dataset.date ?? '');
    if (i < 0) return;
    const grain = this.grain;
    const step = grain === 'month' ? 12 : 1;
    // Decade rows are half-centuries that may start part-way, so up and down move 50 years.
    const row = (dir: number) =>
      grain === 'decade'
        ? keys.indexOf(decadeKey(Number(keys[i]!.slice(0, 4)) + dir * 50))
        : i + dir * step;
    let next = -1;
    switch (e.key) {
      case 'ArrowRight':
        next = i + 1;
        break;
      case 'ArrowLeft':
        next = i - 1;
        break;
      case 'ArrowDown':
        next = row(1);
        break;
      case 'ArrowUp':
        next = row(-1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = keys.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    if (next < 0 || next >= keys.length || next === i) return;
    this.activeKey = keys[next]!;
    void this.updateComplete.then(() => this.focusBar(this.activeKey));
  }

  private flatKeys(): string[] {
    return buildModel(this.data, this.grain).bars.map((b) => b.key);
  }

  private focusBar(key: string): void {
    const btn = this.renderRoot.querySelector<HTMLButtonElement>(
      `button.bar[data-date="${CSS.escape(key)}"]`,
    );
    if (!btn) return;
    btn.focus();
    const scroller = btn.closest('.scroller');
    if (!scroller) return;
    const bar = btn.getBoundingClientRect();
    const box = scroller.getBoundingClientRect();
    const labelRight = btn
      .closest('.year')
      ?.querySelector('.year-label')
      ?.getBoundingClientRect().right;
    // 5px keeps the 3px outline and its 2px offset clear of the sticky year label.
    const leftEdge = labelRight == null ? box.left : labelRight + 5;
    if (bar.right > box.right) scroller.scrollLeft += bar.right - box.right;
    else if (bar.left < leftEdge) scroller.scrollLeft -= leftEdge - bar.left;
  }

  private measureOverflow(): void {
    const scroller = this.renderRoot.querySelector('.scroller');
    if (!(scroller instanceof HTMLElement)) {
      if (this.overflowing) this.overflowing = false;
      return;
    }
    if (typeof ResizeObserver !== 'undefined') {
      this.ro ??= new ResizeObserver(() => this.measureOverflow());
      if (this.observed !== scroller) {
        this.ro.disconnect();
        this.ro.observe(scroller);
        this.observed = scroller;
      }
    }
    const on = scroller.scrollWidth > scroller.clientWidth + 1;
    if (on !== this.overflowing) this.overflowing = on;
  }

  /**
   * A lone odd token (a year chip on a month chart, a day, "undated", "c. 1910–1920")
   * highlights only itself. A bucket at this grain, or a range of dates, highlights overlaps.
   */
  private selectionHighlights(): boolean {
    const trimmed = this.selected.trim();
    if (!trimmed) return false;
    const parts = splitSelection(trimmed);
    if (parts.length >= 2 && parts.every((p) => keyToSpan(p) !== null)) return true;
    if (parts.length !== 1) return false;
    const grain = this.grain;
    if (grain === 'decade') return /^\d{4}$/.test(trimmed) || DECADE.test(trimmed);
    return grain === 'year' ? /^\d{4}$/.test(trimmed) : /^\d{4}-\d{2}$/.test(trimmed);
  }

  private overlaps(key: string, span: { from: string; to: string } | null): boolean {
    if (!span || !isIsoDate(span.from) || !isIsoDate(span.to)) return false;
    const own = keyToSpan(key);
    if (!own) return false;
    return own.from <= span.to && own.to >= span.from;
  }

  private pressed(key: string, span: { from: string; to: string } | null): boolean {
    if (this.selected.trim() === key) return true;
    if (!this.selectionHighlights()) return false;
    return this.overlaps(key, span);
  }

  /** An odd chip matches its own key, or an ISO day inside a multi-bucket range. */
  private chipOn(key: string, span: { from: string; to: string } | null): boolean {
    if (this.selected.trim() === key) return true;
    if (!isIsoDate(key)) return false;
    const parts = splitSelection(this.selected.trim());
    if (parts.length < 2 || parts.some((p) => keyToSpan(p) === null)) return false;
    return this.overlaps(key, span);
  }

  private focusKey(bars: Bar[]): string {
    const keys = bars.map((b) => b.key);
    if (this.activeKey && keys.includes(this.activeKey)) return this.activeKey;
    const span = parseSelected(this.selected);
    const selected = bars.find((b) => this.pressed(b.key, span));
    return selected?.key ?? keys[0] ?? '';
  }

  private barTemplate(
    bar: Bar,
    tab: string,
    span: { from: string; to: string } | null,
    max: number,
    column = 0,
  ) {
    const pct = barPercent(bar.count, max, this.log);
    const on = this.pressed(bar.key, span);
    return html`
      <button
        type="button"
        class="bar ${bar.count ? '' : 'is-empty'}"
        part="bar"
        style=${column ? `grid-column-start: ${column}` : nothing}
        data-date=${bar.key}
        tabindex=${bar.key === tab ? '0' : '-1'}
        aria-pressed=${on ? 'true' : 'false'}
        aria-label=${bucketName(bar.key, bar.count, this.unit)}
        @click=${this.onBarClick}
        @keydown=${this.onBarKeydown}
      >
        <span class="fill" aria-hidden="true" style="height: ${pct}%"></span>
      </button>
    `;
  }

  private renderBars(model: Model, span: { from: string; to: string } | null): TemplateResult {
    const tab = this.focusKey(model.bars);
    const grain = this.grain;
    if (grain === 'decade') {
      const rows = [...new Set(model.bars.map((b) => halfCentury(b.year)))];
      return html`
        <div class="scroller" role="group" aria-label=${this.labelText}>
          ${rows.map((start) => {
            const inRow = model.bars.filter((b) => halfCentury(b.year) === start);
            // The first decade keeps its column, so decades line up from row to row.
            const column = (inRow[0]!.year - start) / 10 + 1;
            return html`
              <div class="year">
                <span class="year-label" aria-hidden="true">${start}</span>
                <div class="bars" role="group" aria-label=${`${start} to ${start + 49}`}>
                  ${repeat(
                    inRow,
                    (b) => b.key,
                    (b, i) => this.barTemplate(b, tab, span, model.max, i === 0 ? column : 0),
                  )}
                </div>
              </div>
            `;
          })}
        </div>
      `;
    }
    if (grain === 'year') {
      return html`
        <div class="scroller" role="group" aria-label=${this.labelText}>
          <div class="bars">
            ${repeat(
              model.bars,
              (b) => b.key,
              (b) => this.barTemplate(b, tab, span, model.max),
            )}
          </div>
        </div>
      `;
    }
    const years = [...new Set(model.bars.map((b) => b.year))];
    return html`
      <div class="scroller" role="group" aria-label=${this.labelText}>
        ${years.map(
          (year) => html`
            <div class="year">
              <span class="year-label" id=${`${this.uid}-${year}`}>${year}</span>
              <div class="bars" role="group" aria-labelledby=${`${this.uid}-${year}`}>
                ${repeat(
                  model.bars.filter((b) => b.year === year),
                  (b) => b.key,
                  (b) => this.barTemplate(b, tab, span, model.max),
                )}
              </div>
            </div>
          `,
        )}
      </div>
    `;
  }

  private renderOdds(
    odds: Odd[],
    span: { from: string; to: string } | null,
  ): TemplateResult | typeof nothing {
    if (!odds.length) return nothing;
    return html`
      <div class="outliers" role="group" aria-label="Other dates">
        ${odds.map((odd) => {
          const name = bucketName(odd.key, odd.count, this.unit);
          const on = this.chipOn(odd.key, span);
          return html`
            <button
              type="button"
              class="chip"
              data-date=${odd.key}
              aria-pressed=${on ? 'true' : 'false'}
              @click=${this.onBarClick}
            >
              ${name}
            </button>
          `;
        })}
      </div>
    `;
  }

  private generatedTable(model: Model): TemplateResult {
    const caption = this.labelText;
    if (this.grain === 'month' && model.bars.length) {
      const years = [...new Set(model.bars.map((b) => b.year))];
      return html`
        <table part="table">
          ${tableCaption(caption)}
          <thead>
            <tr>
              <th scope="col">Year</th>
              ${SHORT_MONTHS.map((m) => html`<th scope="col">${m}</th>`)}
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            ${years.map((year) => {
              const cells = model.bars.filter((b) => b.year === year);
              const total = cells.reduce((s, b) => s + b.count, 0);
              return html`
                <tr>
                  <th scope="row">${year}</th>
                  ${cells.map((b) => html`<td>${b.count.toLocaleString('en-US')}</td>`)}
                  <td>${total.toLocaleString('en-US')}</td>
                </tr>
              `;
            })}
          </tbody>
        </table>
        ${this.oddsTable(model)}
      `;
    }
    return html`
      <table part="table">
        ${tableCaption(caption)}
        <thead>
          <tr>
            <th scope="col">${{ year: 'Year', decade: 'Decade', month: 'Date' }[this.grain]}</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          ${model.bars.map(
            (b) => html`
              <tr>
                <th scope="row">${b.key}</th>
                <td>${b.count.toLocaleString('en-US')}</td>
              </tr>
            `,
          )}
          ${model.odds.map(
            (o) => html`
              <tr>
                <th scope="row">${o.key}</th>
                <td>${o.count.toLocaleString('en-US')}</td>
              </tr>
            `,
          )}
        </tbody>
      </table>
    `;
  }

  private oddsTable(model: Model): TemplateResult | typeof nothing {
    if (!model.odds.length) return nothing;
    return html`
      <table part="table">
        ${tableCaption('Other dates')}
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          ${model.odds.map(
            (o) => html`
              <tr>
                <th scope="row">${o.key}</th>
                <td>${o.count.toLocaleString('en-US')}</td>
              </tr>
            `,
          )}
        </tbody>
      </table>
    `;
  }

  private renderDisclosure(model: Model): TemplateResult | typeof nothing {
    if (!this.authorTable && !model.bars.length && !model.odds.length) return nothing;
    const generated = this.lightDom || !this.authorTable || this.items.length > 0;
    return html`
      <details class="as-table">
        <summary>Show as table</summary>
        <div
          class="table-wrap"
          role="region"
          tabindex="0"
          aria-label="${this.labelText} as a table"
        >
          ${generated ? this.generatedTable(model) : nothing}
          ${generated || this.lightDom ? nothing : html`<slot></slot>`}
        </div>
      </details>
    `;
  }

  /** One bar track, or one per year when the span is already known, so late `items` do not shift the page. */
  private reserveStyle(): string {
    const size = 'var(--uvalib-date-histogram-bar-size, 8rem)';
    if (this.grain === 'year') return `min-block-size: ${size}`;
    return `min-block-size: calc(${this.reservedRows()} * (${size} + 0.5rem))`;
  }

  /** Rows: one per year for months, one per half-century for decades. */
  private reservedRows(): number {
    const grain = this.grain;
    const rowOf = (year: number) => (grain === 'decade' ? halfCentury(year) : year);
    const model = buildModel(this.data, grain);
    if (model.bars.length) return new Set(model.bars.map((b) => rowOf(b.year))).size;
    const partner = this.partner ?? this.findPartner();
    if (!partner) return 1;
    const a = /^(\d{4})/.exec((partner.min || partner.getAttribute('min') || '').trim());
    const b = /^(\d{4})/.exec((partner.max || partner.getAttribute('max') || '').trim());
    if (!a || !b) return 1;
    const [lo, hi] = [Number(a[1]), Number(b[1])].sort((x, y) => x - y) as [number, number];
    return grain === 'decade' ? (rowOf(hi) - rowOf(lo)) / 50 + 1 : hi - lo + 1;
  }

  private renderStrip(model: Model): TemplateResult {
    const years = model.bars;
    const total = years.reduce((s, b) => s + b.count, 0);
    const span = parseSelected(this.selected);
    // A year bar's key is the year, a decade bar's is `1810s`.
    const range =
      years.length === 0
        ? ''
        : years.length === 1
          ? years[0]!.key
          : `${years[0]!.key} to ${years[years.length - 1]!.key}`;
    let name = years.length
      ? `${this.labelText}: ${range}, ${total.toLocaleString('en-US')} ${unitWord(total, this.unit)}`
      : `${this.labelText}: no dates`;
    if (span && years.some((b) => this.pressed(b.key, span))) {
      const on = years.filter((b) => this.pressed(b.key, span));
      const a = on[0]!.key;
      const b = on[on.length - 1]!.key;
      name += a === b ? `. Selected ${a}.` : `. Selected ${a} to ${b}.`;
    }
    return html`
      <div class="strip" part="chart" role="img" aria-label=${name}>
        ${years.map((bar) => {
          const pct = barPercent(bar.count, model.max, this.log);
          const on = this.pressed(bar.key, span);
          return html`<span
            class="strip-bar ${bar.count ? '' : 'is-empty'} ${on ? 'is-selected' : ''}"
            part="bar"
            style="height: ${pct}%"
          ></span>`;
        })}
      </div>
    `;
  }

  override render() {
    const model = buildModel(this.data, this.strip ? this.stripGrain : this.grain);
    if (this.strip) return this.renderStrip(model);
    const span = parseSelected(this.selected);
    const chartClass = `by-${this.grain}`;
    return html`
      <div class="chart ${chartClass}" part="chart">
        <p class="scroll-hint" ?hidden=${!this.overflowing}>Scroll sideways to see more.</p>
        <div class="plot" style=${this.reserveStyle()}>
          ${
            model.bars.length
              ? this.renderBars(model, span)
              : html`<p class="empty">No dates to show.</p>`
          }
        </div>
      </div>
      ${this.renderOdds(model.odds, span)} ${this.renderDisclosure(model)}
    `;
  }
}
