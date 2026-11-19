import { expect, fixture } from '@open-wc/testing';
import { emulateMedia, sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-date-histogram/uvalib-date-histogram.js';
import type { UvalibDateHistogram } from '../src/components/uvalib-date-histogram/UvalibDateHistogram.js';
import '../src/components/uvalib-date-range/uvalib-date-range.js';
import {
  dateRangeTiming,
  type UvalibDateRange,
} from '../src/components/uvalib-date-range/UvalibDateRange.js';
import { recordAnalytics } from './helpers/analytics.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { inDarkMode } from './helpers/dark.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const bars = (el: Element) => [...root(el).querySelectorAll<HTMLButtonElement>('button.bar')];
const chips = (el: Element) => [...root(el).querySelectorAll<HTMLButtonElement>('button.chip')];
const focused = (el: HTMLElement): HTMLElement | null =>
  (el.shadowRoot?.activeElement ?? document.activeElement) as HTMLElement | null;

const PHOTOS = [
  { date: '2015-01', count: 10 },
  { date: '2015-10', count: 5311 },
  { date: '2016-02', count: 1 },
];

/** Collect console.warn calls made while `fn` runs. */
async function warnings<T>(fn: () => Promise<T>): Promise<{ result: T; warns: string[] }> {
  const orig = console.warn;
  const warns: string[] = [];
  console.warn = (...a: unknown[]) => void warns.push(a.join(' '));
  try {
    return { result: await fn(), warns };
  } finally {
    console.warn = orig;
  }
}

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-date-histogram (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = (extra = '') =>
      fixture<UvalibDateHistogram>(
        `<uvalib-date-histogram ${attr} ${extra}></uvalib-date-histogram>`,
      );

    async function withItems(items = PHOTOS, extra = 'unit="photos" label="Photos by date"') {
      const el = await make(extra);
      el.items = items;
      await el.updateComplete;
      return el;
    }

    it('draws a month for every year in the span, naming each bar and keeping a zero as a gap', async () => {
      const el = await withItems();
      const buttons = bars(el);
      expect(buttons).to.have.length(24);
      expect(buttons.map((b) => b.dataset.date)).to.deep.equal([
        ...Array.from({ length: 12 }, (_, i) => `2015-${String(i + 1).padStart(2, '0')}`),
        ...Array.from({ length: 12 }, (_, i) => `2016-${String(i + 1).padStart(2, '0')}`),
      ]);
      const oct = buttons[9]!;
      expect(oct.getAttribute('aria-label')).to.equal('October 2015: 5,311 photos');
      expect(oct.getAttribute('aria-pressed')).to.equal('false');
      const march = buttons[2]!;
      expect(march.getAttribute('aria-label')).to.equal('March 2015: 0 photos');
      expect(march.classList.contains('is-empty')).to.equal(true);
      expect((march.querySelector('.fill') as HTMLElement).style.height).to.equal('0%');
      expect(buttons[13]!.getAttribute('aria-label')).to.equal('February 2016: 1 photo');
      const group = root(el).querySelector('[role="group"]')!;
      expect(group.getAttribute('aria-label')).to.equal('Photos by date');
      expect(group.getAttribute('role')).to.equal('group');
      // One tab stop. The rest are reached with the arrows.
      expect(buttons.filter((b) => b.tabIndex === 0)).to.have.length(1);
      expect(buttons.filter((b) => b.tabIndex === -1)).to.have.length(23);
    });

    it('rolls months into years, and fills the years between', async () => {
      const el = await withItems(
        [
          { date: '2014-06', count: 2 },
          { date: '2016', count: 5 },
          { date: 'October 2016', count: 3 },
        ],
        'granularity="year" unit="items"',
      );
      expect(bars(el).map((b) => [b.dataset.date, b.getAttribute('aria-label')])).to.deep.equal([
        ['2014', '2014: 2 items'],
        ['2015', '2015: 0 items'],
        ['2016', '2016: 8 items'],
      ]);
      expect(chips(el)).to.have.length(0);
    });

    it('keeps a bare year, a day and an unparsed date as chips in a month chart', async () => {
      const el = await withItems([
        { date: '2015-10', count: 4 },
        { date: '2015', count: 9 },
        { date: '2015-10-03', count: 2 },
        { date: 'undated', count: 7 },
        { date: 'Oct 2015', count: 1 },
        { date: 'nope', count: -3 },
        { date: 'also', count: Number.NaN },
      ]);
      expect(
        bars(el)
          .find((b) => b.dataset.date === '2015-10')!
          .getAttribute('aria-label'),
      ).to.equal('October 2015: 5 photos');
      expect(chips(el).map((c) => c.textContent!.trim())).to.deep.equal([
        '2015: 9 photos',
        '3 October 2015: 2 photos',
        'undated: 7 photos',
      ]);
      expect(chips(el)[2]!.getAttribute('aria-label')).to.equal(null);
    });

    it('scales a log bar by log(count + 1) and a linear bar by the count', async () => {
      const el = await withItems(
        [
          { date: '2015-01', count: 100 },
          { date: '2015-02', count: 1 },
        ],
        'style="--uvalib-date-histogram-bar-size: 100px" unit="photos"',
      );
      const fill = (i: number) => bars(el)[i]!.querySelector('.fill') as HTMLElement;
      const pct = (i: number) => parseFloat(fill(i).style.height);
      expect(pct(0)).to.equal(100);
      expect(pct(1)).to.equal(1);
      const track = root(el).querySelector('.bars') as HTMLElement;
      expect(track.getBoundingClientRect().height).to.be.closeTo(100, 1);
      // The fill's border sits inside its height, so a full bar is a pixel or two under the track.
      expect(fill(0).getBoundingClientRect().height).to.be.closeTo(100, 3);
      el.scale = 'log';
      await el.updateComplete;
      expect(pct(0)).to.equal(100);
      expect(pct(1)).to.be.closeTo((Math.log1p(1) / Math.log1p(100)) * 100, 0.01);
      expect(track.getBoundingClientRect().height).to.be.closeTo(100, 1);
      // The track height does not change when the counts are redrawn.
      expect(track.getBoundingClientRect().height).to.be.closeTo(100, 1);
    });

    it('selects a month on click, clears it on a second click, and reports only the choice', async () => {
      const el = await withItems();
      const rec = recordAnalytics();
      const seen: { from: string; to: string }[] = [];
      let composed = false;
      const on = (e: Event) => {
        seen.push((e as CustomEvent).detail);
        composed = e.composed && e.bubbles;
      };
      document.addEventListener('select', on);
      try {
        bars(el)[9]!.click();
        expect(seen).to.deep.equal([{ from: '2015-10-01', to: '2015-10-31' }]);
        expect(composed).to.equal(true);
        await el.updateComplete;
        expect(el.selected).to.equal('2015-10');
        expect(bars(el)[9]!.getAttribute('aria-pressed')).to.equal('true');
        expect(bars(el)[8]!.getAttribute('aria-pressed')).to.equal('false');
        const pressed = bars(el)[9]!;
        const mark = getComputedStyle(pressed, '::after');
        expect(mark.boxShadow).to.not.equal('none');
        expect(mark.backgroundImage).to.contain('linear-gradient');
        expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
          ['uvalib-date-histogram', 'select', '2015-10-01\u20132015-10-31'],
        ]);
        bars(el)[9]!.click();
        expect(seen[1]).to.deep.equal({ from: '', to: '' });
        await el.updateComplete;
        expect(el.selected).to.equal('');
        expect(bars(el)[9]!.getAttribute('aria-pressed')).to.equal('false');
        expect(rec.of('uvalib-analytics-event')).to.have.length(1);
      } finally {
        rec.restore();
        document.removeEventListener('select', on);
      }
    });

    it('does not fire select or analytics when selected is set in script', async () => {
      const el = await withItems();
      const rec = recordAnalytics();
      let fired = false;
      el.addEventListener('select', () => (fired = true));
      try {
        el.selected = '2015-10/2016-03';
        await el.updateComplete;
        expect(fired).to.equal(false);
        expect(rec.of('uvalib-analytics-event')).to.have.length(0);
        const on = bars(el).filter((b) => b.getAttribute('aria-pressed') === 'true');
        expect(on.map((b) => b.dataset.date)).to.deep.equal([
          '2015-10',
          '2015-11',
          '2015-12',
          '2016-01',
          '2016-02',
          '2016-03',
        ]);
      } finally {
        rec.restore();
      }
    });

    it('chooses an odd date as itself', async () => {
      const el = await withItems([{ date: 'undated', count: 4 }]);
      let detail: { from: string; to: string } | undefined;
      el.addEventListener('select', (e) => (detail = (e as CustomEvent).detail));
      const rec = recordAnalytics();
      try {
        chips(el)[0]!.click();
        expect(detail).to.deep.equal({ from: 'undated', to: 'undated' });
        expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
          ['uvalib-date-histogram', 'select', 'other'],
        ]);
      } finally {
        rec.restore();
      }
    });

    it('honours no-analytics on itself and on an ancestor, and still fires select', async () => {
      const rec = recordAnalytics();
      try {
        const el = await withItems(PHOTOS, 'unit="photos" no-analytics');
        let fired = false;
        el.addEventListener('select', () => (fired = true));
        bars(el)[9]!.click();
        expect(fired).to.equal(true);
        const wrap = await fixture<HTMLDivElement>(
          `<div no-analytics><uvalib-date-histogram ${attr} unit="photos"></uvalib-date-histogram></div>`,
        );
        const inner = wrap.querySelector('uvalib-date-histogram') as UvalibDateHistogram;
        inner.items = PHOTOS;
        await inner.updateComplete;
        bars(inner)[9]!.click();
        document.documentElement.setAttribute('data-uvalib-analytics', 'off');
        const page = await withItems();
        bars(page)[9]!.click();
        expect(rec.of('uvalib-analytics-event')).to.have.length(0);
      } finally {
        document.documentElement.removeAttribute('data-uvalib-analytics');
        rec.restore();
      }
    });

    it('moves between bars with the arrow keys, Home and End', async () => {
      const el = await withItems();
      const first = bars(el)[0]!;
      first.focus();
      await sendKeys({ press: 'ArrowRight' });
      expect(focused(el)!.dataset.date).to.equal('2015-02');
      await sendKeys({ press: 'ArrowDown' });
      expect(focused(el)!.dataset.date).to.equal('2016-02');
      await sendKeys({ press: 'ArrowUp' });
      expect(focused(el)!.dataset.date).to.equal('2015-02');
      await sendKeys({ press: 'End' });
      expect(focused(el)!.dataset.date).to.equal('2016-12');
      await sendKeys({ press: 'Home' });
      expect(focused(el)!.dataset.date).to.equal('2015-01');
      expect(
        bars(el)
          .filter((b) => b.tabIndex === 0)
          .map((b) => b.dataset.date),
      ).to.deep.equal(['2015-01']);
      const down = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      });
      focused(el)!.dispatchEvent(down);
      expect(down.defaultPrevented).to.equal(true);
      await el.updateComplete;
      expect(focused(el)!.dataset.date).to.equal('2016-01');
      await sendKeys({ press: 'Space' });
      await el.updateComplete;
      expect(el.selected).to.equal('2016-01');
    });

    it('reads a two-column table and a year-by-month grid, and lets items win', async () => {
      const el = await fixture<UvalibDateHistogram>(`<uvalib-date-histogram ${attr} unit="photos">
        <table>
          <caption>Ignored once read</caption>
          <tr><th>Month</th><th>Photos</th></tr>
          <tr><td>2015-10</td><td>5,311</td></tr>
          <tr><td>2015-11</td><td>—</td></tr>
          <tr><td>undated</td><td>4</td></tr>
        </table>
      </uvalib-date-histogram>`);
      await el.updateComplete;
      expect(bars(el)[9]!.getAttribute('aria-label')).to.equal('October 2015: 5,311 photos');
      expect(bars(el)[10]!.getAttribute('aria-label')).to.equal('November 2015: 0 photos');
      expect(chips(el).map((c) => c.textContent!.trim())).to.deep.equal(['undated: 4 photos']);
      el.items = [{ date: '2016-01', count: 8 }];
      await el.updateComplete;
      expect(bars(el).map((b) => b.dataset.date)[0]).to.equal('2016-01');
      expect(chips(el)).to.have.length(0);

      const grid = await fixture<UvalibDateHistogram>(`<uvalib-date-histogram ${attr} unit="photos">
        <table>
          <tr><th>Year</th><th>Jan</th><th>October</th></tr>
          <tr><th>2015</th><td>2</td><td>5</td></tr>
        </table>
      </uvalib-date-histogram>`);
      await grid.updateComplete;
      expect(bars(grid)[0]!.getAttribute('aria-label')).to.equal('January 2015: 2 photos');
      expect(bars(grid)[9]!.getAttribute('aria-label')).to.equal('October 2015: 5 photos');
    });

    it('shows the counts again in Show as table', async () => {
      const el = await withItems();
      const summary = root(el).querySelector('summary')!;
      expect(summary.textContent!.trim()).to.equal('Show as table');
      const details = summary.parentElement as HTMLDetailsElement;
      expect(details.open).to.equal(false);
      details.open = true;
      await el.updateComplete;
      const table = root(el).querySelector('table')!;
      expect(table.querySelector('caption')!.textContent).to.equal('Photos by date');
      const head = [...table.querySelectorAll('thead th')].map((th) => th.textContent);
      expect(head.slice(0, 3)).to.deep.equal(['Year', 'Jan', 'Feb']);
      expect(head.at(-1)).to.equal('Total');
      const row2015 = [...table.querySelectorAll('tbody tr')][0]!;
      const cells = [...row2015.querySelectorAll('td')].map((td) => td.textContent);
      expect(cells[0]).to.equal('10');
      expect(cells[9]).to.equal('5,311');
      expect(cells[2]).to.equal('0');
      expect(row2015.querySelector('th')!.getAttribute('scope')).to.equal('row');
    });

    it('slots the author table in shadow DOM and builds an equivalent one in light DOM', async () => {
      const el = await fixture<UvalibDateHistogram>(`<uvalib-date-histogram ${attr} unit="photos">
        <table><tr><td>2015-10</td><td>4</td></tr></table>
      </uvalib-date-histogram>`);
      await el.updateComplete;
      const details = root(el).querySelector('details') as HTMLDetailsElement;
      details.open = true;
      const generated = root(el).querySelector('[part="table"]');
      const author = el.querySelector('table')!;
      if (mode === 'shadow') {
        expect(generated).to.equal(null);
        const slot = root(el).querySelector('slot') as HTMLSlotElement;
        expect(slot.assignedElements().includes(author)).to.equal(true);
      } else {
        expect(generated).to.not.equal(null);
        expect(author.closest('[hidden]') !== null).to.equal(true);
        expect(generated!.textContent).to.contain('4');
      }
    });

    it('is a labelled image in the strip variant, with no buttons and no events', async () => {
      const el = await withItems(PHOTOS, 'variant="strip" unit="photos" label="Photos by year"');
      const strip = root(el).querySelector('.strip')!;
      expect(strip.getAttribute('role')).to.equal('img');
      expect(bars(el)).to.have.length(0);
      expect(root(el).querySelector('summary')).to.equal(null);
      expect(strip.getAttribute('aria-label')).to.equal(
        'Photos by year: 2015 to 2016, 5,322 photos',
      );
      el.selected = '2015';
      await el.updateComplete;
      expect(strip.getAttribute('aria-label')).to.equal(
        'Photos by year: 2015 to 2016, 5,322 photos. Selected 2015.',
      );
      expect(root(el).querySelectorAll('.strip-bar.is-selected')).to.have.length(1);
      const rec = recordAnalytics();
      let fired = false;
      el.addEventListener('select', () => (fired = true));
      try {
        (root(el).querySelector('.strip-bar') as HTMLElement).click();
        expect(fired).to.equal(false);
        expect(rec.of('uvalib-analytics-event')).to.have.length(0);
      } finally {
        rec.restore();
      }
    });

    it('says when there is nothing to draw, and warns once for a bad granularity', async () => {
      const el = await make();
      expect(root(el).querySelector('.empty')!.textContent).to.equal('No dates to show.');
      expect(root(el).querySelector('summary')).to.equal(null);
      const { warns } = await warnings(async () => {
        el.setAttribute('granularity', 'decade');
        await el.updateComplete;
        el.setAttribute('granularity', 'fortnight');
        await el.updateComplete;
      });
      expect(warns.filter((w) => w.includes('granularity'))).to.have.length(1);
      expect(bars(await withItems())).to.have.length(24);
    });

    it('keeps the bar borders with no-style', async () => {
      const el = await withItems(PHOTOS, `${attr} no-style unit="photos"`.trim());
      const bar = bars(el)[9]!;
      const cs = getComputedStyle(bar);
      expect(cs.borderTopStyle).to.equal('solid');
      expect(parseFloat(cs.borderTopWidth)).to.be.at.least(1);
      expect(cs.display).to.equal('flex');
    });

    it('passes axe closed and open, and in dark mode', async () => {
      const el = await withItems([...PHOTOS, { date: 'undated', count: 2 }]);
      await expectNoAxeViolations(el);
      (root(el).querySelector('details') as HTMLDetailsElement).open = true;
      await expectNoAxeViolations(el);
      await inDarkMode(async () => {
        const fill = bars(el)[9]!.querySelector('.fill') as HTMLElement;
        expect(getComputedStyle(fill).backgroundColor).to.equal('rgb(135, 185, 217)');
        expect(getComputedStyle(bars(el)[9]!).backgroundColor).to.equal('rgb(44, 56, 88)');
        await expectNoAxeViolations(el);
      });
      expect(getComputedStyle(bars(el)[9]!.querySelector('.fill')!).backgroundColor).to.equal(
        'rgb(35, 45, 75)',
      );
    });

    it('does not scroll the page at 320px, and says when the months scroll inside', async () => {
      await setViewport({ width: 320, height: 640 });
      try {
        const el = await withItems();
        await el.updateComplete;
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
        const scroller = root(el).querySelector('.scroller') as HTMLElement;
        expect(scroller.scrollWidth > scroller.clientWidth).to.equal(true);
        const hint = root(el).querySelector('.scroll-hint') as HTMLElement;
        expect(hint.hidden).to.equal(false);
        expect(hint.textContent!.trim()).to.equal('Scroll sideways to see more.');
        for (const bar of bars(el)) {
          const box = bar.getBoundingClientRect();
          expect(box.width).to.be.at.least(24);
          expect(box.height).to.be.at.least(24);
        }
        el.granularity = 'year';
        await el.updateComplete;
        await el.updateComplete;
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
    });

    it('does not press an overlapping chip for one bucket, and toggles an odd phrase', async () => {
      const el = await withItems([
        { date: '2015-10', count: 4 },
        { date: '2015', count: 9 },
        { date: '2015-10-03', count: 2 },
        { date: 'c. 1910\u20131920', count: 3 },
        { date: 'undated / unknown', count: 1 },
        { date: '2015-02-30', count: 1 },
        { date: '2015-02-01?', count: 1 },
      ]);
      const oct = bars(el).find((b) => b.dataset.date === '2015-10')!;
      const feb = bars(el).find((b) => b.dataset.date === '2015-02')!;
      oct.click();
      await el.updateComplete;
      expect(oct.getAttribute('aria-pressed')).to.equal('true');
      expect(chips(el).every((c) => c.getAttribute('aria-pressed') === 'false')).to.equal(true);
      const year = chips(el).find((c) => c.dataset.date === '2015')!;
      year.click();
      await el.updateComplete;
      expect(year.getAttribute('aria-pressed')).to.equal('true');
      expect(oct.getAttribute('aria-pressed')).to.equal('false');
      const bogus = chips(el).find((c) => c.dataset.date === '2015-02-30')!;
      bogus.click();
      await el.updateComplete;
      expect(feb.getAttribute('aria-pressed')).to.equal('false');
      expect(
        bars(el)
          .find((b) => b.dataset.date === '2015-01')!
          .getAttribute('aria-pressed'),
      ).to.equal('false');
      const phrase = chips(el).find((c) => c.dataset.date === 'c. 1910\u20131920')!;
      phrase.click();
      await el.updateComplete;
      expect(el.selected).to.equal('c. 1910\u20131920');
      phrase.click();
      await el.updateComplete;
      expect(el.selected).to.equal('');
      const slash = chips(el).find((c) => c.dataset.date === 'undated / unknown')!;
      slash.click();
      await el.updateComplete;
      expect(el.selected).to.equal('undated / unknown');
      slash.click();
      await el.updateComplete;
      expect(el.selected).to.equal('');
      el.selected = '2015-10/2016-03';
      await el.updateComplete;
      const day = chips(el).find((c) => c.dataset.date === '2015-10-03')!;
      expect(day.getAttribute('aria-pressed')).to.equal('true');
      expect(year.getAttribute('aria-pressed')).to.equal('false');
      expect(phrase.getAttribute('aria-pressed')).to.equal('false');
    });

    it('paints the selection above an empty bar and names the month group and the table', async () => {
      const el = await withItems();
      el.selected = '2015-03';
      await el.updateComplete;
      const march = bars(el).find((b) => b.dataset.date === '2015-03')!;
      const mark = getComputedStyle(march, '::after');
      expect(mark.boxShadow).to.not.equal('none');
      expect(mark.backgroundImage).to.contain('linear-gradient');
      const monthBars = root(el).querySelector('.year .bars')!;
      expect(monthBars.getAttribute('role')).to.equal('group');
      expect(monthBars.getAttribute('aria-labelledby')).to.equal(
        root(el).querySelector('.year-label')!.id,
      );
      const details = root(el).querySelector('details') as HTMLDetailsElement;
      details.open = true;
      const wrap = root(el).querySelector('.table-wrap')!;
      expect(wrap.getAttribute('role')).to.equal('region');
      expect(wrap.getAttribute('aria-label')).to.equal('Photos by date as a table');
      el.granularity = 'year';
      await el.updateComplete;
      expect(root(el).querySelector('.bars')!.getAttribute('role')).to.equal(null);
    });

    it('uses the focus token on a bar and on Show as table', async () => {
      const el = await withItems();
      el.style.setProperty('--uva-color-focus', 'rgb(1, 2, 3)');
      bars(el)[0]!.focus();
      await sendKeys({ press: 'Tab' });
      const summary = focused(el)!;
      expect(summary.tagName).to.equal('SUMMARY');
      const cs = getComputedStyle(summary);
      expect(cs.outlineStyle).to.equal('solid');
      expect(cs.outlineColor).to.equal('rgb(1, 2, 3)');
      summary.focus();
      await sendKeys({ press: 'Shift+Tab' });
      expect(getComputedStyle(focused(el)!).outlineColor).to.equal('rgb(1, 2, 3)');
    });

    it('lists odd dates in Show as table, and lists items when they replace the child table', async () => {
      const el = await withItems([
        { date: '2015-10', count: 4 },
        { date: 'undated', count: 7 },
        { date: '2015-10-03', count: 2 },
      ]);
      const details = root(el).querySelector('details') as HTMLDetailsElement;
      details.open = true;
      const text = root(el).querySelector('.table-wrap')!.textContent ?? '';
      expect(text.includes('undated')).to.equal(true);
      expect(text.includes('2015-10-03')).to.equal(true);
      const replaced =
        await fixture<UvalibDateHistogram>(`<uvalib-date-histogram ${attr} unit="photos">
        <table><tr><td>2015-10</td><td>4</td></tr></table>
      </uvalib-date-histogram>`);
      await replaced.updateComplete;
      replaced.items = [{ date: '2016-03', count: 9 }];
      await replaced.updateComplete;
      (root(replaced).querySelector('details') as HTMLDetailsElement).open = true;
      const counts = [...root(replaced).querySelector('.table-wrap')!.querySelectorAll('td')].map(
        (td) => td.textContent,
      );
      expect(counts.includes('9')).to.equal(true);
      expect(counts.includes('4')).to.equal(false);
    });

    it('keeps a headerless undated row and a year whose cells are dashes', async () => {
      const el = await fixture<UvalibDateHistogram>(`<uvalib-date-histogram ${attr} unit="photos">
        <table>
          <tr><td>undated</td><td>4</td></tr>
          <tr><td>2015-10</td><td>2</td></tr>
        </table>
      </uvalib-date-histogram>`);
      await el.updateComplete;
      expect(chips(el).map((c) => c.textContent!.trim())).to.deep.equal(['undated: 4 photos']);
      expect(
        bars(el)
          .find((b) => b.dataset.date === '2015-10')!
          .getAttribute('aria-label'),
      ).to.equal('October 2015: 2 photos');
      const grid = await fixture<UvalibDateHistogram>(`<uvalib-date-histogram ${attr} unit="photos">
        <table>
          <tr><th>Year</th><th>Jan</th><th>Oct</th></tr>
          <tr><td>2014</td><td>-</td><td>\u2014</td></tr>
          <tr><td>2015</td><td></td><td>5</td></tr>
        </table>
      </uvalib-date-histogram>`);
      await grid.updateComplete;
      expect(
        bars(grid)
          .find((b) => b.dataset.date === '2014-01')!
          .getAttribute('aria-label'),
      ).to.equal('January 2014: 0 photos');
      expect(
        bars(grid)
          .find((b) => b.dataset.date === '2015-10')!
          .getAttribute('aria-label'),
      ).to.equal('October 2015: 5 photos');
    });

    it('moves the roving tab stop when selected is set in script', async () => {
      const el = await withItems();
      bars(el)[0]!.focus();
      await sendKeys({ press: 'ArrowRight' });
      expect(
        bars(el)
          .filter((b) => b.tabIndex === 0)
          .map((b) => b.dataset.date),
      ).to.deep.equal(['2015-02']);
      el.selected = '2015-10';
      await el.updateComplete;
      expect(
        bars(el)
          .filter((b) => b.tabIndex === 0)
          .map((b) => b.dataset.date),
      ).to.deep.equal(['2015-10']);
      expect(bars(el)[1]!.tabIndex).to.equal(-1);
    });

    it('keeps a focused January clear of the sticky year label at 320px', async () => {
      await setViewport({ width: 320, height: 640 });
      try {
        const el = await withItems([
          { date: '2015-01', count: 1 },
          { date: '2015-12', count: 1 },
        ]);
        bars(el)[0]!.focus();
        await sendKeys({ press: 'End' });
        await el.updateComplete;
        const scroller = root(el).querySelector('.scroller') as HTMLElement;
        expect(scroller.scrollLeft).to.be.greaterThan(0);
        await sendKeys({ press: 'Home' });
        await el.updateComplete;
        const jan = bars(el)[0]!.getBoundingClientRect().left;
        const label = root(el).querySelector('.year-label')!.getBoundingClientRect().right;
        expect(jan).to.be.at.least(label);
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
    });

    it('reserves the chart height before items arrive', async () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const el = await make();
      await el.updateComplete;
      const plot = root(el).querySelector('.plot') as HTMLElement;
      expect(plot.getBoundingClientRect().height).to.be.at.least(8 * rem - 1);
      const partner = document.createElement('uvalib-date-range') as UvalibDateRange;
      partner.id = 'hist-reserve';
      partner.min = '2015-01-01';
      partner.max = '2017-12-31';
      document.body.append(partner);
      try {
        await partner.updateComplete;
        el.rangeFor = 'hist-reserve';
        await el.updateComplete;
        const before = plot.getBoundingClientRect().height;
        expect(before).to.be.at.least(3 * (8 * rem + 0.5 * rem) - 1);
        el.items = [
          { date: '2015-01', count: 1 },
          { date: '2017-06', count: 2 },
        ];
        await el.updateComplete;
        await el.updateComplete;
        expect(plot.getBoundingClientRect().height).to.be.closeTo(before, 2);
        el.granularity = 'year';
        await el.updateComplete;
        expect(plot.getBoundingClientRect().height).to.be.closeTo(8 * rem, 2);
      } finally {
        partner.remove();
      }
      const strip = await withItems(PHOTOS, 'variant="strip" unit="photos"');
      expect(root(strip).querySelector('.plot') === null).to.equal(true);
      expect(root(strip).querySelector('.strip')!.getBoundingClientRect().height).to.be.closeTo(
        1.5 * rem,
        1,
      );
    });

    it('passes axe for the strip and for an empty chart', async () => {
      await expectNoAxeViolations(
        await withItems(PHOTOS, 'variant="strip" unit="photos" label="Photos"'),
      );
      await expectNoAxeViolations(await make());
    });
  });
}

describe('uvalib-date-histogram range-for', () => {
  const prev = dateRangeTiming.debounce;
  beforeEach(() => {
    dateRangeTiming.debounce = 1e9;
  });
  afterEach(() => {
    dateRangeTiming.debounce = prev;
    document.getElementById('hist-range')?.remove();
  });

  async function range(value?: [string, string]) {
    const el = document.createElement('uvalib-date-range') as UvalibDateRange;
    el.id = 'hist-range';
    el.min = '2000-01-01';
    el.max = '2020-12-31';
    if (value) el.value = value;
    document.body.append(el);
    await el.updateComplete;
    return el;
  }

  it('pulls a range on connect without writing it back or firing select', async () => {
    const partner = await range(['2015-10-05', '2015-10-20']);
    let fired = false;
    const el = await fixture<UvalibDateHistogram>(
      `<uvalib-date-histogram range-for="hist-range" unit="photos"></uvalib-date-histogram>`,
    );
    el.addEventListener('select', () => (fired = true));
    el.items = PHOTOS;
    await el.updateComplete;
    expect(el.selected).to.equal('2015-10');
    expect(partner.value).to.deep.equal(['2015-10-05', '2015-10-20']);
    expect(fired).to.equal(false);
    expect(bars(el)[9]!.getAttribute('aria-pressed')).to.equal('true');
  });

  it('writes the date range when a bar is chosen, and clears it back to min and max', async () => {
    const partner = await range();
    const el = await fixture<UvalibDateHistogram>(
      `<uvalib-date-histogram range-for="hist-range" unit="photos"></uvalib-date-histogram>`,
    );
    el.items = PHOTOS;
    await el.updateComplete;
    bars(el)[9]!.click();
    await el.updateComplete;
    expect(partner.value).to.deep.equal(['2015-10-01', '2015-10-31']);
    bars(el)[9]!.click();
    await el.updateComplete;
    expect(el.selected).to.equal('');
    expect(partner.value).to.deep.equal(['2000-01-01', '2020-12-31']);
  });

  it('follows date-range-change and ignores a value set in script', async () => {
    const partner = await range(['2015-01-01', '2015-01-31']);
    const el = await fixture<UvalibDateHistogram>(
      `<uvalib-date-histogram range-for="hist-range" unit="photos"></uvalib-date-histogram>`,
    );
    el.items = PHOTOS;
    await el.updateComplete;
    expect(el.selected).to.equal('2015-01');
    let fired = false;
    el.addEventListener('select', () => (fired = true));
    partner.value = ['2016-02-01', '2016-02-28'];
    await partner.updateComplete;
    await el.updateComplete;
    expect(el.selected).to.equal('2015-01');
    partner.value = ['2015-01-01', '2015-01-31'];
    await partner.updateComplete;
    const input = (partner.shadowRoot ?? partner).querySelectorAll(
      'input[type="date"]',
    )[1] as HTMLInputElement;
    input.value = '2016-02-28';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;
    expect(fired).to.equal(false);
    expect(el.selected).to.equal('2015-01/2016-02');
    expect(bars(el).filter((b) => b.getAttribute('aria-pressed') === 'true').length).to.equal(14);
  });

  it('pushes a selected set in script and does not fire select', async () => {
    const partner = await range();
    const rec = recordAnalytics();
    const el = await fixture<UvalibDateHistogram>(
      `<uvalib-date-histogram range-for="hist-range" selected="2016" granularity="year"></uvalib-date-histogram>`,
    );
    let fired = false;
    el.addEventListener('select', () => (fired = true));
    try {
      await el.updateComplete;
      expect(partner.value).to.deep.equal(['2016-01-01', '2016-12-31']);
      expect(fired).to.equal(false);
      expect(rec.of('uvalib-analytics-event')).to.have.length(0);
      el.selected = '2015/2016';
      await el.updateComplete;
      expect(partner.value).to.deep.equal(['2015-01-01', '2016-12-31']);
      expect(fired).to.equal(false);
    } finally {
      rec.restore();
    }
  });

  it('does not highlight every bar when the date range is its full span', async () => {
    await range(['2000-01-01', '2020-12-31']);
    const el = await fixture<UvalibDateHistogram>(
      `<uvalib-date-histogram range-for="hist-range" unit="photos"></uvalib-date-histogram>`,
    );
    el.items = PHOTOS;
    await el.updateComplete;
    expect(el.selected).to.equal('');
    expect(bars(el).some((b) => b.getAttribute('aria-pressed') === 'true')).to.equal(false);
  });

  it('expands a partial month instead of clearing it', async () => {
    const partner = await range(['2015-10-05', '2015-10-20']);
    const el = await fixture<UvalibDateHistogram>(
      `<uvalib-date-histogram range-for="hist-range" unit="photos"></uvalib-date-histogram>`,
    );
    el.items = PHOTOS;
    await el.updateComplete;
    expect(el.selected).to.equal('2015-10');
    bars(el)[9]!.click();
    await el.updateComplete;
    expect(el.selected).to.equal('2015-10');
    expect(partner.value).to.deep.equal(['2015-10-01', '2015-10-31']);
    expect(bars(el)[9]!.getAttribute('aria-pressed')).to.equal('true');
  });

  it('pulls a date range mounted after the histogram', async () => {
    const el = await fixture<UvalibDateHistogram>(
      `<uvalib-date-histogram range-for="hist-range" unit="photos"></uvalib-date-histogram>`,
    );
    el.items = PHOTOS;
    await el.updateComplete;
    expect(el.selected).to.equal('');
    await range(['2015-10-01', '2015-10-31']);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
    expect(el.selected).to.equal('2015-10');
    expect(bars(el)[9]!.getAttribute('aria-pressed')).to.equal('true');
  });

  it('keeps range-for in step after the histogram is moved', async () => {
    const partner = await range(['2016-02-01', '2016-02-28']);
    const el = await fixture<UvalibDateHistogram>(
      `<uvalib-date-histogram range-for="hist-range" unit="photos"></uvalib-date-histogram>`,
    );
    el.items = PHOTOS;
    await el.updateComplete;
    expect(el.selected).to.equal('2016-02');
    const parent = el.parentElement!;
    el.remove();
    parent.append(el);
    await el.updateComplete;
    const input = (partner.shadowRoot ?? partner).querySelectorAll(
      'input[type="date"]',
    )[1] as HTMLInputElement;
    input.value = '2016-06-30';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;
    expect(el.selected).to.equal('2016-02/2016-06');
  });

  it('leaves a February selection on the 29th in a leap year', async () => {
    const partner = await range();
    const el = await fixture<UvalibDateHistogram>(
      `<uvalib-date-histogram range-for="hist-range" unit="photos"></uvalib-date-histogram>`,
    );
    el.items = [
      { date: '2015-02', count: 1 },
      { date: '2016-02', count: 1 },
    ];
    await el.updateComplete;
    bars(el)[1]!.click();
    await el.updateComplete;
    expect(partner.value[1]).to.equal('2015-02-28');
    bars(el)[13]!.click();
    await el.updateComplete;
    expect(partner.value).to.deep.equal(['2016-02-01', '2016-02-29']);
  });
});

describe('uvalib-date-histogram forced colors and reduced motion', () => {
  afterEach(async () => {
    await emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
  });

  it('keeps a border on the bars in forced colors, and an outline on the selected one', async () => {
    await emulateMedia({ forcedColors: 'active' });
    const el = await fixture<UvalibDateHistogram>(
      `<uvalib-date-histogram unit="photos" selected="2015-10"></uvalib-date-histogram>`,
    );
    el.items = PHOTOS;
    await el.updateComplete;
    const bar = bars(el)[0]!;
    const cs = getComputedStyle(bar);
    expect(cs.borderTopStyle).to.equal('solid');
    expect(parseFloat(cs.borderTopWidth)).to.be.at.least(1);
    expect(cs.borderTopColor).to.not.equal(cs.backgroundColor);
    const pressed = bars(el)[9]!;
    const outline = getComputedStyle(pressed);
    expect(outline.outlineStyle).to.equal('solid');
    expect(parseFloat(outline.outlineWidth)).to.be.at.least(3);
    bars(el)[10]!.focus();
    await sendKeys({ press: 'ArrowLeft' });
    const focusedBar = focused(el)!;
    expect(focusedBar.dataset.date).to.equal('2015-10');
    const focusedOutline = getComputedStyle(focusedBar);
    expect(focusedOutline.outlineStyle).to.equal('solid');
    expect(parseFloat(focusedOutline.outlineOffset)).to.be.at.least(2);
    await expectNoAxeViolations(el);
  });

  it('drops the height transition when motion is reduced', async () => {
    await emulateMedia({ reducedMotion: 'reduce' });
    const el = await fixture<UvalibDateHistogram>(
      `<uvalib-date-histogram unit="photos"></uvalib-date-histogram>`,
    );
    el.items = PHOTOS;
    await el.updateComplete;
    expect(getComputedStyle(bars(el)[9]!.querySelector('.fill')!).transitionDuration).to.equal(
      '0s',
    );
  });
});

describe('uvalib-date-histogram light DOM styles', () => {
  it('installs its styles in @layer uvalib', async () => {
    await fixture(`<uvalib-date-histogram no-shadow-dom></uvalib-date-histogram>`);
    const texts = document.adoptedStyleSheets.map((s) =>
      [...s.cssRules].map((r) => r.cssText).join('\n'),
    );
    const own = texts.filter((t) => t.includes('uvalib-date-histogram .bar'));
    expect(own.length).to.be.greaterThan(0);
    for (const t of own) expect(t.startsWith('@layer uvalib')).to.equal(true);
  });
});
