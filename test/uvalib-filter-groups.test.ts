// Filter-group features of <uvalib-filter> (Virgo round): collapsible, searchable, sortable,
// clearable, apply-button and match. Each is opt-in; test/uvalib-filter.test.ts covers the
// filter without them.
import { expect, fixture, waitUntil } from '@open-wc/testing';
import { emulateMedia, sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-filter/uvalib-filter.js';
import {
  filterTiming,
  SEARCH_CAP,
  type UvalibFilter,
} from '../src/components/uvalib-filter/UvalibFilter.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { inDarkMode } from './helpers/dark.js';
import { recordAnalytics } from './helpers/analytics.js';

const SUBJECTS = [
  ['History', 40],
  ['Écologie', 12],
  ['Architecture', 25],
  ['Economics', 12],
  ['Poetry', 3],
  ['Zoology', 25],
] as const;
const subject = (list: readonly (readonly [string, number])[] = SUBJECTS) => ({
  name: 'subject',
  title: 'Subject',
  position: 0,
  buckets: list.map(([key, doc_count]) => ({ key, doc_count, selected: false })),
});

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const q = <T extends Element = HTMLElement>(el: Element, sel: string) =>
  root(el).querySelector<T>(sel);
const boxes = (el: Element) => [
  ...root(el).querySelectorAll<HTMLInputElement>('input[type=checkbox]'),
];
const keys = (el: Element) => boxes(el).map((b) => b.value);
const part = (el: Element, name: string) => q<HTMLButtonElement>(el, `[part="${name}"]`);
const labelOf = (el: Element, box: HTMLInputElement) =>
  q(el, `label[for="${box.id}"]`)!.textContent!.replace(/\s+/g, ' ').trim();
const radios = (el: Element) => [
  ...root(el).querySelectorAll<HTMLInputElement>('.sort input[type=radio]'),
];

/** Type into the search field as a visitor would. */
async function type(el: UvalibFilter, text: string) {
  const input = part(el, 'search') as unknown as HTMLInputElement;
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await el.updateComplete;
}

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-filter groups (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const active = (el: Element) =>
      mode === 'shadow' ? el.shadowRoot!.activeElement : document.activeElement;
    const make = async (attrs = '', props: Partial<UvalibFilter> = {}): Promise<UvalibFilter> => {
      const el = await fixture<UvalibFilter>(`<uvalib-filter ${attr} ${attrs}></uvalib-filter>`);
      Object.assign(el, { filter: subject(), ...props });
      await el.updateComplete;
      return el;
    };

    describe('without the options', () => {
      it('renders no toggle, search, sort, clear, apply or match text, in the data order', async () => {
        const el = await make('', { value: ['History'] });
        for (const p of ['toggle', 'search', 'clear', 'apply', 'reset'])
          expect(part(el, p), p).to.equal(null);
        expect(radios(el)).to.have.length(0);
        expect(q(el, '.match')).to.equal(null);
        expect(q(el, 'legend')!.className).to.equal('');
        expect(q(el, 'fieldset')!.hasAttribute('aria-describedby')).to.equal(false);
        expect(keys(el)).to.deep.equal(SUBJECTS.map(([k]) => k));
      });
    });

    describe('collapsible', () => {
      it('makes the legend a disclosure button that controls the group', async () => {
        const el = await make('collapsible');
        const toggle = part(el, 'toggle')!;
        expect(toggle.closest('legend')).to.not.equal(null);
        expect(toggle.type).to.equal('button');
        expect(toggle.getAttribute('aria-expanded')).to.equal('true');
        const body = q(el, `#${toggle.getAttribute('aria-controls')}`)!;
        expect(body.contains(boxes(el)[0]!)).to.equal(true);
        expect(body.hidden).to.equal(false);
        // No heading by default (the legend alone, as before).
        expect(q(el, 'legend :is(h1, h2, h3, h4, h5, h6)')).to.equal(null);
      });

      it('collapsed starts closed, reflects, and toggles with click, Enter and Space', async () => {
        const el = await make('collapsible collapsed');
        const toggle = part(el, 'toggle')!;
        const body = q(el, `#${toggle.getAttribute('aria-controls')}`)!;
        expect(toggle.getAttribute('aria-expanded')).to.equal('false');
        expect(body.hidden).to.equal(true);
        expect(boxes(el)[0]!.getClientRects().length).to.equal(0);
        const seen: boolean[] = [];
        el.addEventListener('toggle', (e) => seen.push((e as unknown as CustomEvent).detail.open));
        toggle.click();
        await el.updateComplete;
        expect(el.collapsed).to.equal(false);
        expect(el.hasAttribute('collapsed')).to.equal(false);
        expect(body.hidden).to.equal(false);
        toggle.focus();
        await sendKeys({ press: 'Enter' });
        await el.updateComplete;
        expect(el.hasAttribute('collapsed')).to.equal(true);
        expect(toggle.getAttribute('aria-expanded')).to.equal('false');
        await sendKeys({ press: 'Space' });
        await el.updateComplete;
        expect(toggle.getAttribute('aria-expanded')).to.equal('true');
        expect(seen).to.deep.equal([true, false, true]);
        expect(active(el) === toggle, 'focus stays on the toggle').to.equal(true);
      });

      it('shows the selected count in the header while collapsed only', async () => {
        const el = await make('collapsible collapsed', { value: ['History', 'Poetry'] });
        const toggle = part(el, 'toggle')!;
        expect(toggle.textContent!.replace(/\s+/g, ' ').trim()).to.equal('Subject, 2 selected');
        expect(q(el, '.selected-count')!.getClientRects().length).to.be.greaterThan(0);
        toggle.click();
        await el.updateComplete;
        expect(toggle.textContent!.trim()).to.equal('Subject');
        toggle.click();
        el.value = [];
        await el.updateComplete;
        expect(toggle.textContent!.trim()).to.equal('Subject');
      });

      it('heading-level wraps the button (or the plain legend text) in that heading', async () => {
        const el = await make('collapsible heading-level="3"');
        const h = q(el, 'legend h3')!;
        expect(h.contains(part(el, 'toggle'))).to.equal(true);
        const plain = await make('heading-level="4"');
        expect(q(plain, 'legend h4')!.textContent).to.equal('Subject');
        const bad = await make('heading-level="9"');
        expect(q(bad, 'legend :is(h1, h2, h3, h4, h5, h6)')).to.equal(null);
      });

      it('a collapsed group is one 44px row', async () => {
        const el = await make('collapsible collapsed', { value: ['History'] });
        expect(el.getBoundingClientRect().height).to.equal(44);
        expect(part(el, 'toggle')!.getBoundingClientRect().height).to.equal(44);
      });

      it("uses the library's caret, turned over when open, and never animates", async () => {
        const el = await make('collapsible collapsed');
        const toggle = part(el, 'toggle')!;
        const caret = () => getComputedStyle(toggle, '::after');
        const closed = caret().transform;
        expect(caret().borderRightStyle).to.equal('solid');
        expect(caret().borderBottomStyle).to.equal('solid');
        toggle.click();
        await el.updateComplete;
        expect(caret().transform).to.not.equal(closed);
        expect(caret().transitionDuration).to.equal('0s');
        await emulateMedia({ reducedMotion: 'reduce' });
        try {
          expect(caret().transitionDuration).to.equal('0s');
          expect(caret().animationName).to.equal('none');
        } finally {
          await emulateMedia({ reducedMotion: 'no-preference' });
        }
      });

      it('collapsed is ignored without collapsible', async () => {
        const el = await make('collapsed');
        expect(part(el, 'toggle')).to.equal(null);
        expect(boxes(el)[0]!.getClientRects().length).to.equal(1);
      });
    });

    describe('searchable', () => {
      const saved = { ...filterTiming };
      before(() => Object.assign(filterTiming, { announce: 30, track: 60 }));
      after(() => Object.assign(filterTiming, saved));

      it('labels the field "Search <title>", or search-label', async () => {
        const el = await make('searchable');
        const input = part(el, 'search') as unknown as HTMLInputElement;
        expect(input.type).to.equal('search');
        expect(input.name).to.equal('');
        expect(q(el, `label[for="${input.id}"]`)!.textContent).to.equal('Search Subject');
        el.searchLabel = 'Find a subject';
        await el.updateComplete;
        expect(q(el, `label[for="${input.id}"]`)!.textContent).to.equal('Find a subject');
      });

      it('filters accent- and case-insensitively and marks the match', async () => {
        const el = await make('searchable unit="subjects"');
        await type(el, 'ECO');
        expect(keys(el)).to.deep.equal(['Écologie', 'Economics']);
        const marks = [...root(el).querySelectorAll('label mark')].map((m) => m.textContent);
        expect(marks).to.deep.equal(['Éco', 'Eco']);
        // Not colour alone: bold and underlined.
        const style = getComputedStyle(q(el, 'label mark')!);
        expect(style.fontWeight).to.equal('700');
        expect(style.textDecorationLine).to.equal('underline');
        expect(labelOf(el, boxes(el)[0]!)).to.equal('Écologie (12)');
        expect(q(el, '.search-status')!.textContent!.trim()).to.equal('2 of 6 subjects');
      });

      it('announces the count politely once typing settles', async () => {
        const el = await make('searchable unit="subjects"');
        const live = q(el, '.search [role=status]')!;
        expect(live.getAttribute('aria-live')).to.equal('polite');
        await type(el, 'o');
        await type(el, 'og');
        expect(live.textContent!.trim()).to.equal('');
        await waitUntil(() => live.textContent!.trim() !== '', 'announced');
        expect(live.textContent!.trim()).to.equal('2 of 6 subjects');
      });

      it('keeps checked values visible, pinned at the top, while searching', async () => {
        const el = await make('searchable', { value: ['Poetry'] });
        await type(el, 'zoo');
        expect(keys(el)).to.deep.equal(['Poetry', 'Zoology']);
        expect(boxes(el)[0]!.checked).to.equal(true);
        await type(el, 'nothing like it');
        expect(keys(el)).to.deep.equal(['Poetry']);
        expect(q(el, '.search-status')!.textContent!.trim()).to.equal('0 of 6 values');
      });

      it('Escape clears the search (and does not reach a surrounding dialog)', async () => {
        const el = await make('searchable');
        let outside = 0;
        const count = () => outside++;
        document.addEventListener('keydown', count);
        try {
          await type(el, 'his');
          expect(keys(el)).to.deep.equal(['History']);
          const input = part(el, 'search') as unknown as HTMLInputElement;
          input.focus();
          await sendKeys({ press: 'Escape' });
          await el.updateComplete;
          expect(input.value).to.equal('');
          expect(keys(el)).to.have.length(6);
          expect(outside).to.equal(0);
          expect(q(el, '.search-status')).to.equal(null);
          // An empty field lets Escape through.
          await sendKeys({ press: 'Escape' });
          expect(outside).to.equal(1);
        } finally {
          document.removeEventListener('keydown', count);
        }
      });

      it('shows every match (up to the cap) without See more, and the limit again after', async () => {
        const many = Array.from({ length: 150 }, (_, i) => [`Topic ${i + 1}`, 200 - i] as const);
        const el = await make('searchable limit="5"', { filter: subject(many) });
        expect(boxes(el)).to.have.length(5);
        await type(el, 'topic 1');
        // Topic 1, 10–19, 100–150: 62 matches, all shown.
        expect(boxes(el)).to.have.length(62);
        expect(part(el, 'see-more')).to.equal(null);
        await type(el, 'topic');
        expect(boxes(el)).to.have.length(SEARCH_CAP);
        expect(q(el, '.search-status')!.textContent).to.match(
          /150 of 150 values\. Showing the first 100; type more to narrow them\./,
        );
        await type(el, '');
        expect(boxes(el)).to.have.length(5);
        expect(part(el, 'see-more')).to.not.equal(null);
      });
    });

    describe('sortable', () => {
      it('offers Count | Name (A–Z) as labelled native radios, Count by default', async () => {
        const el = await make('sortable');
        const group = q(el, '[role=radiogroup]')!;
        const label = q(el, `#${group.getAttribute('aria-labelledby')}`)!;
        expect(label.textContent).to.equal('Sort by');
        expect(radios(el).map((r) => r.closest('label')!.textContent!.trim())).to.deep.equal([
          'Count',
          'Name (A–Z)',
        ]);
        expect(radios(el).map((r) => r.checked)).to.deep.equal([true, false]);
        expect(new Set(radios(el).map((r) => r.name)).size).to.equal(1);
        expect(radios(el).every((r) => r.form === null)).to.equal(true);
        // Count: most first, ties in the data's order.
        expect(keys(el)).to.deep.equal([
          'History',
          'Architecture',
          'Zoology',
          'Écologie',
          'Economics',
          'Poetry',
        ]);
      });

      it('arrow keys choose Name: A–Z, the sort event, the reflected attribute', async () => {
        const el = await make('sortable');
        const seen: string[] = [];
        el.addEventListener('sort', (e) => seen.push((e as CustomEvent).detail.sort));
        radios(el)[0]!.focus();
        await sendKeys({ press: 'ArrowRight' });
        await el.updateComplete;
        expect(seen).to.deep.equal(['name']);
        expect(el.getAttribute('sort')).to.equal('name');
        expect(keys(el)).to.deep.equal([
          'Architecture',
          'Écologie',
          'Economics',
          'History',
          'Poetry',
          'Zoology',
        ]);
        expect(radios(el).map((r) => r.checked)).to.deep.equal([false, true]);
      });

      it('shows the current sort the same way on every group (filled and ticked)', async () => {
        const wrap = await fixture<HTMLDivElement>(`<div>
          <uvalib-filter ${attr} sortable></uvalib-filter>
          <uvalib-filter ${attr} sortable sort="name"></uvalib-filter></div>`);
        const els = [...wrap.querySelectorAll<UvalibFilter>('uvalib-filter')];
        for (const e of els) e.filter = subject();
        await Promise.all(els.map((e) => e.updateComplete));
        for (const e of els) {
          const faces = [...root(e).querySelectorAll('.face')];
          const ticked = faces.map((f) => f.querySelector('svg.check') !== null);
          const current = radios(e).map((r) => r.checked);
          expect(ticked).to.deep.equal(current);
          expect(current.filter(Boolean)).to.have.length(1);
          const on = faces[current.indexOf(true)]!;
          const off = faces[current.indexOf(false)]!;
          expect(getComputedStyle(on).backgroundColor).to.not.equal(
            getComputedStyle(off).backgroundColor,
          );
        }
        expect(keys(els[1]!)[0]).to.equal('Architecture');
        // One tab stop per group: the checked radio.
        expect(radios(els[0]!)[0]!.tabIndex).to.equal(0);
      });

      it('sort="name" alone sorts A–Z without the control; count alone keeps the data order', async () => {
        const named = await make('sort="name"');
        expect(radios(named)).to.have.length(0);
        expect(keys(named)[0]).to.equal('Architecture');
        const plain = await make('sort="count"');
        expect(keys(plain)).to.deep.equal(SUBJECTS.map(([k]) => k));
      });

      it('segments are 44px targets', async () => {
        const el = await make('sortable');
        for (const r of radios(el)) {
          const box = r.closest('label')!.getBoundingClientRect();
          expect(box.height).to.be.at.least(44);
          expect(box.width).to.be.at.least(44);
        }
      });
    });

    describe('clearable', () => {
      it('shows a 44px "Clear Subject filters" only while something is selected', async () => {
        const el = await make('clearable');
        expect(part(el, 'clear')).to.equal(null);
        el.value = ['History'];
        await el.updateComplete;
        const clear = part(el, 'clear')!;
        expect(clear.textContent!.replace(/\s+/g, ' ').trim()).to.equal('Clear Subject filters');
        expect(clear.type).to.equal('button');
        const r = clear.getBoundingClientRect();
        expect(r.height).to.be.at.least(44);
        expect(r.width).to.be.at.least(44);
      });

      it('fires one filter-change with an empty value and moves focus to the first checkbox', async () => {
        const el = await make('clearable', { value: ['History', 'Poetry'] });
        const details: unknown[] = [];
        el.addEventListener('filter-change', (e) => details.push((e as CustomEvent).detail));
        part(el, 'clear')!.focus();
        part(el, 'clear')!.click();
        await el.updateComplete;
        await el.updateComplete;
        expect(details).to.deep.equal([{ name: 'subject', value: [] }]);
        expect(boxes(el).some((b) => b.checked)).to.equal(false);
        expect(part(el, 'clear')).to.equal(null);
        expect(active(el) === boxes(el)[0], 'first checkbox focused').to.equal(true);
      });
    });

    describe('apply-button', () => {
      it('stages changes: no filter-change, a visible note, a polite status and the count on Apply', async () => {
        const el = await make('apply-button', { value: ['Poetry'] });
        const details: unknown[] = [];
        el.addEventListener('filter-change', (e) => details.push((e as CustomEvent).detail));
        const status = q(el, '.apply-status')!;
        expect(status.getAttribute('role')).to.equal('status');
        expect(status.textContent!.trim()).to.equal('');
        expect(part(el, 'apply')!.getAttribute('aria-disabled')).to.equal('true');
        boxes(el)[0]!.click(); // History on
        boxes(el)[4]!.click(); // Poetry off
        boxes(el)[1]!.click(); // Écologie on
        await el.updateComplete;
        expect(details).to.deep.equal([]);
        expect(status.textContent!.trim()).to.equal('3 changes not applied yet');
        const apply = part(el, 'apply')!;
        expect(apply.textContent!.replace(/\s+/g, ' ').trim()).to.equal(
          'Apply 3 changes to Subject',
        );
        expect(apply.getAttribute('aria-disabled')).to.equal('false');
        // Staged rows say so in words, not colour alone.
        expect(labelOf(el, boxes(el)[0]!)).to.equal('History (40)not applied');
        expect(q(el, '.pending')!.getClientRects().length).to.be.greaterThan(0);
        // Unchecking a staged box again takes it out of the count.
        boxes(el)[1]!.click();
        await el.updateComplete;
        expect(status.textContent!.trim()).to.equal('2 changes not applied yet');
        apply.click();
        await el.updateComplete;
        expect(details).to.deep.equal([{ name: 'subject', value: ['History'] }]);
        expect(el.value).to.deep.equal(['History']);
        expect(status.textContent!.trim()).to.equal('');
        expect(q(el, '.pending')).to.equal(null);
        expect(apply.getAttribute('aria-disabled')).to.equal('true');
        expect(apply.textContent!.replace(/\s+/g, ' ').trim()).to.equal('Apply to Subject');
        // Apply with nothing staged does nothing.
        apply.click();
        expect(details).to.have.length(1);
      });

      it('Reset goes back to the applied state, and keeps focus', async () => {
        const el = await make('apply-button', { value: ['Poetry'] });
        boxes(el)[0]!.click();
        boxes(el)[4]!.click();
        await el.updateComplete;
        const reset = part(el, 'reset')!;
        expect(reset.textContent!.replace(/\s+/g, ' ').trim()).to.equal('Reset Subject');
        reset.focus();
        await sendKeys({ press: 'Enter' });
        await el.updateComplete;
        expect(boxes(el).map((b) => b.checked)).to.deep.equal([
          false,
          false,
          false,
          false,
          true,
          false,
        ]);
        expect(reset.getAttribute('aria-disabled')).to.equal('true');
        expect(active(el) === reset).to.equal(true);
      });

      it('keeps staged changes when the page re-sets the same value, drops them for a new one', async () => {
        const el = await make('apply-button', { value: ['Poetry'] });
        boxes(el)[0]!.click();
        await el.updateComplete;
        el.value = ['poetry'];
        el.filter = subject();
        await el.updateComplete;
        expect(boxes(el)[0]!.checked).to.equal(true);
        el.value = ['Zoology'];
        await el.updateComplete;
        expect(boxes(el)[0]!.checked).to.equal(false);
        expect(boxes(el)[5]!.checked).to.equal(true);
        expect(q(el, '.apply-status')!.textContent!.trim()).to.equal('');
      });

      it('Clear applies at once and drops staged changes', async () => {
        const el = await make('apply-button clearable', { value: ['Poetry'] });
        const details: unknown[] = [];
        el.addEventListener('filter-change', (e) => details.push((e as CustomEvent).detail));
        boxes(el)[0]!.click();
        await el.updateComplete;
        part(el, 'clear')!.click();
        await el.updateComplete;
        expect(details).to.deep.equal([{ name: 'subject', value: [] }]);
        expect(boxes(el).some((b) => b.checked)).to.equal(false);
        expect(q(el, '.apply-status')!.textContent!.trim()).to.equal('');
      });
    });

    describe('match', () => {
      it('says how values combine under the legend and describes the group', async () => {
        const el = await make('match="any"');
        const p = q(el, '.match')!;
        expect(p.textContent!.trim()).to.equal('Matches any selected value');
        expect(q(el, 'fieldset')!.getAttribute('aria-describedby')).to.equal(p.id);
        el.match = 'all';
        await el.updateComplete;
        expect(q(el, '.match')!.textContent!.trim()).to.equal('Matches all selected values');
        el.match = 'nonsense' as 'all';
        await el.updateComplete;
        expect(q(el, '.match')).to.equal(null);
      });
    });

    describe('everything on', () => {
      const ALL =
        'collapsible heading-level="3" searchable sortable clearable apply-button match="any" unit="subjects" limit="4"';

      it('has no axe violations, light and dark, collapsed, open, searching and staged', async () => {
        const el = await make(`${ALL} collapsed`, { value: ['History'] });
        await expectNoAxeViolations(el);
        part(el, 'toggle')!.click();
        await el.updateComplete;
        await type(el, 'o');
        boxes(el)[1]!.click();
        await el.updateComplete;
        await expectNoAxeViolations(el);
        await inDarkMode(async () => {
          await el.updateComplete;
          expect(getComputedStyle(part(el, 'search')!).backgroundColor).to.not.equal(
            'rgb(255, 255, 255)',
          );
          await expectNoAxeViolations(el);
        });
      });

      it('reflows at 320px without sideways scrolling', async () => {
        await setViewport({ width: 320, height: 640 });
        try {
          const long = [
            ...SUBJECTS,
            ['Very long subject heading without spaces'.repeat(2), 1],
          ] as const;
          const el = await make(ALL, { value: ['History'], filter: subject(long) });
          await type(el, 'e');
          boxes(el)[2]!.click();
          await el.updateComplete;
          expect(el.getBoundingClientRect().right).to.be.at.most(320);
          expect(document.documentElement.scrollWidth).to.be.at.most(320);
          const tools = q(el, '.tools')!;
          expect(tools.scrollWidth).to.be.at.most(tools.clientWidth);
        } finally {
          await setViewport({ width: 800, height: 600 });
        }
      });

      it('forced colors: the current sort, Apply and staged rows stay distinct', async () => {
        await emulateMedia({ forcedColors: 'active' });
        try {
          const el = await make(ALL, { value: ['History'] });
          boxes(el)[1]!.click();
          await el.updateComplete;
          const faces = [...root(el).querySelectorAll<HTMLElement>('.face')];
          expect(getComputedStyle(faces[0]!).backgroundColor).to.not.equal(
            getComputedStyle(faces[1]!).backgroundColor,
          );
          expect(faces[0]!.querySelector('svg.check')).to.not.equal(null);
          expect(getComputedStyle(q(el, '.pending')!).borderTopStyle).to.equal('dashed');
          expect(getComputedStyle(part(el, 'toggle')!, '::after').borderRightStyle).to.equal(
            'solid',
          );
        } finally {
          await emulateMedia({ forcedColors: 'none' });
        }
      });

      it('works with no-style (unstyled, still functional)', async () => {
        const el = await make(`${ALL} no-style`, { value: ['History'] });
        part(el, 'toggle')!.click();
        await el.updateComplete;
        expect(el.collapsed).to.equal(true);
        part(el, 'toggle')!.click();
        await el.updateComplete;
        await type(el, 'zoo');
        expect(keys(el)).to.deep.equal(['History', 'Zoology']);
      });

      it('two groups have no duplicate ids', async () => {
        const wrap = await fixture<HTMLDivElement>(`<div>
          <uvalib-filter ${attr} ${ALL}></uvalib-filter>
          <uvalib-filter ${attr} ${ALL}></uvalib-filter></div>`);
        const els = [...wrap.querySelectorAll<UvalibFilter>('uvalib-filter')];
        for (const e of els) e.filter = subject();
        await Promise.all(els.map((e) => e.updateComplete));
        const ids = els.flatMap((e) => [...root(e).querySelectorAll('[id]')].map((n) => n.id));
        expect(new Set(ids).size, ids.join()).to.equal(ids.length);
        expect(new Set(els.map((e) => radios(e)[0]!.name)).size).to.equal(2);
      });
    });

    describe('analytics', () => {
      let rec: ReturnType<typeof recordAnalytics>;
      const saved = { ...filterTiming };
      beforeEach(() => {
        rec = recordAnalytics();
        Object.assign(filterTiming, { announce: 20, track: 40 });
      });
      afterEach(() => {
        rec.restore();
        Object.assign(filterTiming, saved);
      });
      const events = () => rec.of('uvalib-analytics-event').map((d) => d.event);

      it('reports one search per settled query (the match count, never the text)', async () => {
        const el = await make('searchable');
        await type(el, 'e');
        await type(el, 'ec');
        await type(el, 'eco');
        await waitUntil(() => events().length === 1, 'search reported');
        await type(el, 'eco ');
        await new Promise((r) => setTimeout(r, 80));
        await type(el, '');
        await new Promise((r) => setTimeout(r, 80));
        expect(events()).to.deep.equal([['uvalib-filter', 'search', 'Subject', 2]]);
        expect(JSON.stringify(events())).to.not.include('eco');
      });

      it('sends nothing with no-analytics', async () => {
        const wrap = await fixture<HTMLDivElement>(
          `<div no-analytics><uvalib-filter ${attr} collapsible sortable clearable searchable></uvalib-filter></div>`,
        );
        const el = wrap.firstElementChild as UvalibFilter;
        el.filter = subject();
        el.value = ['History'];
        await el.updateComplete;
        part(el, 'toggle')!.click();
        part(el, 'toggle')!.click();
        await el.updateComplete;
        radios(el)[1]!.click();
        await type(el, 'his');
        part(el, 'clear')!.click();
        await new Promise((r) => setTimeout(r, 80));
        expect(rec.events).to.deep.equal([]);
      });
    });
  });
}
