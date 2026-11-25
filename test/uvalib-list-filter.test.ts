import { expect, fixture, nextFrame } from '@open-wc/testing';
import { emulateMedia, sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-list-filter/uvalib-list-filter.js';
import '../src/components/uvalib-results-count/uvalib-results-count.js';
import {
  fold,
  listFilterTiming,
  queryWords,
  type ListFilterChangeDetail,
  type UvalibListFilter,
} from '../src/components/uvalib-list-filter/UvalibListFilter.js';
import type { UvalibResultsCount } from '../src/components/uvalib-results-count/UvalibResultsCount.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { recordAnalytics } from './helpers/analytics.js';
import { inDarkMode } from './helpers/dark.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const input = (el: Element) => root(el).querySelector<HTMLInputElement>('input')!;
const clearButton = (el: Element) => root(el).querySelector<HTMLButtonElement>('button.clear')!;
const countText = (el: Element) => root(el).querySelector('.count')?.textContent?.trim() ?? '';
const status = (el: Element) => root(el).querySelector<HTMLElement>('[role="status"]')!;
const empty = (el: Element) => root(el).querySelector<HTMLElement>('[part="empty"]')!;
const isFocused = (node: Element) => {
  let a = document.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a === node;
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const TEXTS = [
  ['Amanda C. Armentrout to William F. Brand, August 17, 1866', 'amanda c. armentrout'],
  ['Angus to Kate Armentrout, March 3, 1860', ''],
  ['L’Énéide de Virgile', ''],
  ['Blair family records', 'blair family records booker, james'],
  ['Notes on the State of Virginia', 'notes on the state of virginia jefferson, thomas'],
];
const LIST = `<ol id="docs">${TEXTS.map(
  ([t, f]) =>
    `<li${f ? ` data-filter-text="${t.toLowerCase()} ${f}"` : ''}><a href="#x">${t}</a></li>`,
).join('')}</ol>`;

/** Type into the field as the visitor does: each character an input event. */
async function type(el: UvalibListFilter, text: string) {
  const field = input(el);
  for (const ch of text) {
    field.value += ch;
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }
  await el.updateComplete;
}
const visible = (list: Element) =>
  [...list.children]
    .filter((li) => !(li as HTMLElement).hidden)
    .map((li) => li.textContent!.trim());

/** A link click would navigate the test page: cancel it once it reaches `document`. */
const cancel = (e: Event) => {
  if (e.composedPath().some((n) => n instanceof HTMLAnchorElement)) e.preventDefault();
};

describe('uvalib-list-filter matching', () => {
  it('folds case and accents', () => {
    expect(fold('L’Énéide ÇA')).to.equal('l’eneide ca');
    expect(queryWords('  Kate   ARMENTROUT ')).to.deep.equal(['kate', 'armentrout']);
  });
});

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-list-filter (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const timing = { ...listFilterTiming };
    const make = async (attrs = 'for="docs" noun="texts" singular="text"', list = LIST) => {
      const wrap = await fixture<HTMLDivElement>(
        `<div><uvalib-list-filter ${attr} ${attrs}></uvalib-list-filter>${list}</div>`,
      );
      const el = wrap.querySelector<UvalibListFilter>('uvalib-list-filter')!;
      await el.updateComplete;
      await el.updateComplete;
      return { el, wrap, list: wrap.querySelector<HTMLElement>('#docs')! };
    };

    before(() => document.addEventListener('click', cancel));
    after(() => document.removeEventListener('click', cancel));
    beforeEach(() => {
      listFilterTiming.settle = 40;
      listFilterTiming.url = 10;
    });
    afterEach(() => Object.assign(listFilterTiming, timing));

    it('labels the field, shows the whole list and its count, announces nothing at load', async () => {
      const { el, list } = await make('for="docs" noun="texts" placeholder="Title or author"');
      const label = root(el).querySelector('label')!;
      expect(label.textContent!.trim()).to.equal('Filter');
      expect(label.htmlFor).to.equal(input(el).id);
      expect(input(el).placeholder).to.equal('Title or author');
      expect(visible(list).length).to.equal(5);
      expect(countText(el)).to.equal('Showing all 5 texts');
      expect(clearButton(el).hidden).to.equal(true);
      await wait(80);
      expect(status(el).textContent!.trim()).to.equal('');
    });

    it('filters by data-filter-text or text, case- and accent-insensitive', async () => {
      const { el, list } = await make();
      await type(el, 'JEFFERSON');
      expect(visible(list)).to.deep.equal(['Notes on the State of Virginia']);
      expect(countText(el)).to.equal('Showing 1 of 5 texts');
      input(el).value = '';
      await type(el, 'eneide');
      expect(visible(list)).to.deep.equal(['L’Énéide de Virgile']);
      expect(list.children[2]!.hasAttribute('hidden')).to.equal(false);
      expect(list.children[0]!.hasAttribute('hidden')).to.equal(true);
    });

    it('needs every word, in any order', async () => {
      const { el, list } = await make();
      await type(el, 'armentrout kate');
      expect(visible(list)).to.deep.equal(['Angus to Kate Armentrout, March 3, 1860']);
      input(el).value = '';
      await type(el, 'armentrout');
      expect(visible(list).length).to.equal(2);
    });

    it('Clear and Escape empty the field, show everything, keep focus in the field', async () => {
      const { el, list } = await make();
      input(el).focus();
      await type(el, 'blair');
      expect(clearButton(el).hidden).to.equal(false);
      expect(clearButton(el).getBoundingClientRect().height).to.be.at.least(44);
      expect(clearButton(el).getBoundingClientRect().width).to.be.at.least(44);
      expect(clearButton(el).getAttribute('aria-label')).to.equal('Clear Filter');
      clearButton(el).click();
      await el.updateComplete;
      expect(input(el).value).to.equal('');
      expect(visible(list).length).to.equal(5);
      expect(isFocused(input(el))).to.equal(true);
      await type(el, 'blair');
      expect(visible(list).length).to.equal(1);
      await sendKeys({ press: 'Escape' });
      await el.updateComplete;
      expect(input(el).value).to.equal('');
      expect(visible(list).length).to.equal(5);
      expect(isFocused(input(el))).to.equal(true);
    });

    it('works from the keyboard: type, Tab to Clear, Enter', async () => {
      const { el, list } = await make();
      input(el).focus();
      await sendKeys({ type: 'angus' });
      await el.updateComplete;
      expect(visible(list).length).to.equal(1);
      await sendKeys({ press: 'Tab' });
      expect(isFocused(clearButton(el))).to.equal(true);
      await sendKeys({ press: 'Enter' });
      await el.updateComplete;
      expect(visible(list).length).to.equal(5);
      expect(isFocused(input(el))).to.equal(true);
    });

    it('announces the count once the typing settles, not on each key', async () => {
      const { el } = await make();
      await type(el, 'a');
      await wait(10);
      await type(el, 'n');
      expect(status(el).textContent!.trim()).to.equal('');
      await wait(20);
      await type(el, 'gus');
      expect(status(el).textContent!.trim()).to.equal('');
      await wait(90);
      await el.updateComplete;
      expect(status(el).textContent!.trim()).to.equal('Showing 1 of 5 texts');
      expect(status(el).getAttribute('aria-live')).to.equal('polite');
    });

    it('says when nothing matches, with the message class', async () => {
      const { el, list } = await make();
      expect(empty(el).hidden).to.equal(true);
      await type(el, 'zzzz');
      expect(visible(list).length).to.equal(0);
      expect(empty(el).hidden).to.equal(false);
      expect(empty(el).classList.contains('uvalib-message')).to.equal(true);
      expect(empty(el).textContent!.trim()).to.equal('No texts match “zzzz”.');
      expect(countText(el)).to.equal('Showing 0 of 5 texts');
      await wait(90);
      await el.updateComplete;
      expect(status(el).textContent!.trim()).to.equal('No texts match “zzzz”.');
    });

    it('fires uvalib-list-filter-change with query, shown and total', async () => {
      const { el, wrap } = await make();
      const seen: ListFilterChangeDetail[] = [];
      wrap.addEventListener('uvalib-list-filter-change', (e) =>
        seen.push((e as CustomEvent<ListFilterChangeDetail>).detail),
      );
      await type(el, 'bl');
      el.value = '';
      await el.updateComplete;
      expect(seen).to.deep.equal([
        { query: 'b', shown: 2, total: 5 },
        { query: 'bl', shown: 1, total: 5 },
        { query: '', shown: 5, total: 5 },
      ]);
    });

    it('value set in script filters the list', async () => {
      const { el, list } = await make();
      el.value = 'virginia';
      await el.updateComplete;
      expect(visible(list)).to.deep.equal(['Notes on the State of Virginia']);
      expect(input(el).value).to.equal('virginia');
      expect(el.shown).to.equal(1);
      expect(el.total).to.equal(5);
    });

    it('query-param reads the filter at start and writes it back', async () => {
      const before = location.href;
      history.replaceState(history.state, '', '?filter=Kate#top');
      try {
        const { el, list } = await make('for="docs" query-param');
        expect(input(el).value).to.equal('Kate');
        expect(visible(list)).to.deep.equal(['Angus to Kate Armentrout, March 3, 1860']);
        input(el).value = '';
        await type(el, 'blair family');
        await wait(40);
        expect(new URLSearchParams(location.search).get('filter')).to.equal('blair family');
        expect(location.hash).to.equal('#top');
        clearButton(el).click();
        await wait(40);
        expect(new URLSearchParams(location.search).has('filter')).to.equal(false);
      } finally {
        history.replaceState(history.state, '', before);
      }
    });

    it('follows the URL on Back and Forward', async () => {
      const before = location.href;
      try {
        const { el, list } = await make('for="docs" query-param');
        history.replaceState(history.state, '', '?filter=angus');
        window.dispatchEvent(new PopStateEvent('popstate'));
        await el.updateComplete;
        expect(input(el).value).to.equal('angus');
        expect(visible(list).length).to.equal(1);
        history.replaceState(history.state, '', '?');
        window.dispatchEvent(new PopStateEvent('popstate'));
        await el.updateComplete;
        expect(visible(list).length).to.equal(5);
      } finally {
        history.replaceState(history.state, '', before);
      }
    });

    it('is off by default and takes a parameter name', async () => {
      const before = location.href;
      history.replaceState(history.state, '', '?filter=Kate&q=blair');
      try {
        const { el } = await make('for="docs"');
        expect(input(el).value).to.equal('');
        await type(el, 'x');
        await wait(40);
        expect(new URLSearchParams(location.search).get('filter')).to.equal('Kate');
        const named = await make('for="docs" query-param="q"');
        expect(input(named.el).value).to.equal('blair');
      } finally {
        history.replaceState(history.state, '', before);
      }
    });

    it('hides a group whose items are all hidden (data-filter-group)', async () => {
      const { el, wrap } = await make(
        'selector="#groups li" noun="people"',
        `<div id="groups">
          <section data-filter-group id="ga"><h2>A</h2><ul><li>Ada</li><li>Alan</li></ul></section>
          <section data-filter-group id="gb"><h2>B</h2><ul><li>Bruno</li></ul></section>
        </div>`,
      );
      expect(countText(el)).to.equal('Showing all 3 people');
      await type(el, 'bru');
      expect(wrap.querySelector<HTMLElement>('#ga')!.hidden).to.equal(true);
      expect(wrap.querySelector<HTMLElement>('#ga h2')!.getClientRects().length).to.equal(0);
      expect(wrap.querySelector<HTMLElement>('#gb')!.hidden).to.equal(false);
      el.value = '';
      await el.updateComplete;
      expect(wrap.querySelector<HTMLElement>('#ga')!.hidden).to.equal(false);
    });

    it('filters table rows, and keeps items hidden whatever display the page gives them', async () => {
      const { el, wrap } = await make(
        'for="tbl"',
        `<style>#tbl tr { display: flex; }</style><table id="tbl"><thead><tr><th>Name</th></tr></thead>
          <tbody><tr><td>Ada</td></tr><tr><td>Bruno</td></tr></tbody></table>`,
      );
      expect(countText(el)).to.equal('Showing all 2 items');
      await type(el, 'ada');
      const rows = [...wrap.querySelectorAll('tbody tr')];
      expect(rows.map((r) => r.getClientRects().length)).to.deep.equal([1, 0]);
      expect(wrap.querySelector('thead tr')!.getClientRects().length).to.equal(1);
    });

    it('follows added items and refresh()', async () => {
      const { el, list } = await make();
      await type(el, 'zola');
      expect(el.shown).to.equal(0);
      const li = document.createElement('li');
      li.textContent = 'Émile Zola';
      list.append(li);
      await wait(0);
      await el.updateComplete;
      expect(el.shown).to.equal(1);
      expect(el.total).to.equal(6);
      list.children[1]!.textContent = 'Zola letters';
      el.refresh();
      expect(el.shown).to.equal(2);
    });

    it('shows the whole list again when removed', async () => {
      const { el, list } = await make();
      await type(el, 'blair');
      el.remove();
      expect(visible(list).length).to.equal(5);
    });

    it('drives a uvalib-results-count instead of its own count', async () => {
      const { el, wrap } = await make(
        'for="docs" results-count="rc"',
        `<uvalib-results-count id="rc" total="5" noun="texts"></uvalib-results-count>${LIST}`,
      );
      const rc = wrap.querySelector<UvalibResultsCount>('#rc')!;
      expect(root(el).querySelector('.count')).to.equal(null);
      expect(root(el).querySelector('[role="status"]')).to.equal(null);
      await type(el, 'armentrout');
      await rc.updateComplete;
      expect(rc.text).to.equal('Showing 2 of 5 texts');
    });

    it('stays fast with 3,000 items', async () => {
      const rows = Array.from(
        { length: 3000 },
        (_, i) =>
          `<li data-filter-text="letter ${i} from correspondent number ${i % 97} to recipient ${i % 13}">Letter ${i}</li>`,
      ).join('');
      const { el, list } = await make('for="docs"', `<ol id="docs">${rows}</ol>`);
      expect(countText(el)).to.equal('Showing all 3,000 items');
      const times: number[] = [];
      for (const q of ['r', 're', 'rec', 'recipient 1', 'recipient 12', 'x', '']) {
        const t0 = performance.now();
        input(el).value = q;
        input(el).dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        await el.updateComplete;
        void list.getBoundingClientRect().height; // style and layout included
        times.push(performance.now() - t0);
      }
      // The first keystroke reads and folds every item's text once.
      expect(Math.max(...times), times.map(Math.round).join(', ')).to.be.below(150);
      expect(el.shown).to.equal(3000);
    });

    it('reports a settled query with the count, and clear; never the typed text', async () => {
      const rec = recordAnalytics();
      try {
        const { el } = await make();
        await wait(60);
        expect(rec.events, 'reported on render').to.deep.equal([]);
        await type(el, 'arm');
        await wait(10);
        await type(el, 'entrout');
        await wait(90);
        // The same words again (case, spaces): not a new query.
        input(el).value = '';
        await type(el, ' ARMENTROUT ');
        await wait(90);
        clearButton(el).click();
        await wait(90);
        await type(el, 'zz');
        input(el).value = '';
        await type(el, '');
        input(el).dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        await wait(90);
        expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
          ['uvalib-list-filter', 'filter', '', 2],
          ['uvalib-list-filter', 'clear'],
        ]);
        expect(JSON.stringify(rec.events)).to.not.match(/armentrout|zz/i);
      } finally {
        rec.restore();
      }
    });

    it('does not report a filter restored from the URL', async () => {
      const before = location.href;
      history.replaceState(history.state, '', '?filter=kate');
      const rec = recordAnalytics();
      try {
        await make('for="docs" query-param');
        await wait(90);
        expect(rec.events).to.deep.equal([]);
      } finally {
        rec.restore();
        history.replaceState(history.state, '', before);
      }
    });

    it('honours the analytics opt-out', async () => {
      const rec = recordAnalytics();
      try {
        const wrap = await fixture<HTMLDivElement>(
          `<div no-analytics><uvalib-list-filter ${attr} for="docs-off"></uvalib-list-filter>${LIST.replace('id="docs"', 'id="docs-off"')}</div>`,
        );
        const el = wrap.querySelector<UvalibListFilter>('uvalib-list-filter')!;
        await el.updateComplete;
        await type(el, 'kate');
        await wait(90);
        clearButton(el).click();
        expect(rec.events).to.deep.equal([]);
      } finally {
        rec.restore();
      }
    });

    it('has a visible focus ring on the field', async () => {
      const { el } = await make();
      input(el).focus();
      await sendKeys({ type: 'a' });
      expect(getComputedStyle(input(el)).outlineWidth).to.equal('3px');
    });

    it('keeps the field and clear icon visible in forced colors', async () => {
      const { el } = await make();
      await type(el, 'a');
      await emulateMedia({ forcedColors: 'active' });
      try {
        expect(getComputedStyle(input(el)).borderTopStyle).to.equal('solid');
        expect(getComputedStyle(input(el)).borderTopWidth).to.equal('1px');
        expect(clearButton(el).querySelector('svg')!.getBoundingClientRect().width).to.equal(16);
      } finally {
        await emulateMedia({ forcedColors: 'none' });
      }
    });

    it('passes axe, also with no matches', async () => {
      const { el, wrap } = await make();
      await expectNoAxeViolations(wrap);
      await type(el, 'zzzz');
      await expectNoAxeViolations(el);
    });

    it('passes axe in dark mode', async () => {
      await inDarkMode(async () => {
        const { el } = await make();
        await type(el, 'zzzz');
        await expectNoAxeViolations(el);
      });
    });

    it('reflows at 320px with no horizontal scroll', async () => {
      await setViewport({ width: 320, height: 640 });
      try {
        const { el } = await make('for="docs" noun="manuscripts" placeholder="Title or author"');
        await type(el, 'a-very-long-query-without-any-spaces-in-it-at-all');
        await nextFrame();
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
    });

    it('no-style keeps the structure: 44px field and clear button, hidden label', async () => {
      const { el } = await make('for="docs" no-style hide-label');
      await type(el, 'a');
      expect(input(el).getBoundingClientRect().height).to.be.at.least(44);
      expect(clearButton(el).getBoundingClientRect().height).to.be.at.least(44);
      expect(getComputedStyle(root(el).querySelector('label')!).position).to.equal('absolute');
      expect(empty(el).getClientRects().length).to.equal(0);
    });

    it('warns once and renders no count without a list', async () => {
      const warns: string[] = [];
      const orig = console.warn;
      console.warn = (m: string) => warns.push(m);
      try {
        const { el } = await make('for="nope"');
        await type(el, 'a');
        expect(countText(el)).to.equal('');
        expect(warns.filter((w) => w.includes('uvalib-list-filter')).length).to.equal(1);
      } finally {
        console.warn = orig;
      }
    });
  });
}
