import { expect, fixture, nextFrame, waitUntil } from '@open-wc/testing';
import { emulateMedia, sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-chip-group/uvalib-chip-group.js';
import {
  chipGroupTiming,
  type UvalibChipGroup,
} from '../src/components/uvalib-chip-group/UvalibChipGroup.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { recordAnalytics } from './helpers/analytics.js';
import { inDarkMode } from './helpers/dark.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const group = (el: Element) => root(el).querySelector<HTMLElement>('.chips')!;
const chips = (el: Element) => [...group(el).querySelectorAll<HTMLElement>(':scope > .chip')];
const radios = (el: Element) => [...group(el).querySelectorAll<HTMLInputElement>('input')];
/** Each chip's text, as its accessible name reads (visually hidden parts included). */
const names = (el: Element) => chips(el).map((c) => c.textContent!.replace(/\s+/g, ' ').trim());
const face = (c: Element) => c.querySelector<HTMLElement>('.face')!;

/** A link click would navigate the test page: cancel it once it reaches `document`. */
const cancel = (e: Event) => {
  if (e.composedPath().some((n) => n instanceof HTMLAnchorElement)) e.preventDefault();
};

async function warnings(fn: () => Promise<void>): Promise<string[]> {
  const orig = console.warn;
  const warns: string[] = [];
  console.warn = (...a: unknown[]) => void warns.push(a.join(' '));
  try {
    await fn();
  } finally {
    console.warn = orig;
  }
  return warns;
}

const YEARS = `<button value="">All Years</button>
  <button value="2004" data-count="3694">2004</button>
  <button value="2005" data-count="213">2005</button>
  <button value="2006" data-count="12" disabled>2006</button>`;

const clean = () => history.replaceState(null, '', location.pathname);

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-chip-group (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = (attrs: string, children = YEARS) =>
      fixture<UvalibChipGroup>(
        `<uvalib-chip-group ${attr} ${attrs}>${children}</uvalib-chip-group>`,
      );
    const saved = chipGroupTiming.settle;

    beforeEach(() => {
      chipGroupTiming.settle = 60;
      clean();
      document.addEventListener('click', cancel);
    });
    afterEach(() => {
      chipGroupTiming.settle = saved;
      clean();
      document.removeEventListener('click', cancel);
    });

    it('single: a named radio group of chips, with counts read as part of the name', async () => {
      const el = await make('label="Year" count-label="shoots" value="2005"');
      expect(group(el).getAttribute('role')).to.equal('radiogroup');
      expect(group(el).getAttribute('aria-label')).to.equal('Year');
      expect(names(el)).to.deep.equal([
        'All Years',
        '2004, 3,694 shoots',
        '2005, 213 shoots',
        '2006, 12 shoots',
      ]);
      const r = radios(el);
      expect(r.map((i) => i.type)).to.deep.equal(['radio', 'radio', 'radio', 'radio']);
      expect(new Set(r.map((i) => i.name)).size).to.equal(1);
      expect(r.map((i) => i.checked)).to.deep.equal([false, false, true, false]);
      expect(r[3]!.disabled).to.equal(true);
      // The count is the muted span; the tick shows only on the selected chip.
      const count = chips(el)[2]!.querySelector('.count')!;
      expect(count.textContent).to.equal('213');
      expect(chips(el).map((c) => !!c.querySelector('svg.check'))).to.deep.equal([
        false,
        false,
        true,
        false,
      ]);
      // The author's buttons are not shown (shadow: unslotted; light: in a hidden holder).
      const author = el.querySelector('button[value="2004"]') as HTMLElement;
      expect(author.getClientRects().length).to.equal(0);
    });

    it('single: a click selects and fires one change with the value', async () => {
      const el = await make('label="Year"');
      const seen: unknown[] = [];
      el.addEventListener('change', (e) =>
        seen.push(e instanceof CustomEvent ? e.detail : 'native'),
      );
      chips(el)[2]!.click();
      await el.updateComplete;
      expect(el.value).to.equal('2005');
      expect(seen).to.deep.equal([{ value: '2005' }]);
      chips(el)[0]!.click();
      await el.updateComplete;
      expect(seen).to.deep.equal([{ value: '2005' }, { value: '' }]);
      // Setting the value from the app fires nothing.
      el.value = '2004';
      await el.updateComplete;
      expect(radios(el)[1]!.checked).to.equal(true);
      expect(seen).to.have.length(2);
    });

    it('single: Tab enters at the selected chip and the arrow keys move and select', async () => {
      const el = await make('label="Year" value="2004"');
      const before = document.createElement('button');
      before.textContent = 'before';
      el.before(before);
      const after = document.createElement('button');
      after.textContent = 'after';
      el.after(after);
      before.focus();
      await sendKeys({ press: 'Tab' });
      const r = radios(el);
      const active = () => (el.shadowRoot ? el.shadowRoot.activeElement : document.activeElement);
      expect(active() === r[1]).to.equal(true);
      expect(getComputedStyle(face(chips(el)[1]!)).outlineWidth).to.equal('3px');
      await sendKeys({ press: 'ArrowRight' });
      await el.updateComplete;
      expect(el.value).to.equal('2005');
      // The disabled chip is skipped, wrapping to the first.
      await sendKeys({ press: 'ArrowRight' });
      await el.updateComplete;
      expect(el.value).to.equal('');
      // Tab leaves the group: no trap.
      await sendKeys({ press: 'Tab' });
      expect(document.activeElement === after).to.equal(true);
      before.remove();
      after.remove();
    });

    it('multi: toggle buttons with aria-pressed and an array value', async () => {
      const el = await make('mode="multi" label="Category" value="2004, 2005"');
      expect(group(el).getAttribute('role')).to.equal('group');
      const pressed = () => chips(el).map((c) => c.getAttribute('aria-pressed'));
      expect(pressed()).to.deep.equal(['false', 'true', 'true', 'false']);
      const seen: unknown[] = [];
      el.addEventListener('change', (e) => seen.push((e as CustomEvent).detail));
      chips(el)[1]!.click();
      await el.updateComplete;
      chips(el)[0]!.focus();
      await sendKeys({ press: 'Space' });
      await el.updateComplete;
      expect(el.value).to.deep.equal(['2005', '']);
      expect(pressed()).to.deep.equal(['true', 'false', 'true', 'false']);
      expect(seen).to.deep.equal([{ value: ['2005'] }, { value: ['2005', ''] }]);
      expect((chips(el)[3] as HTMLButtonElement).disabled).to.equal(true);
    });

    it('links: links and buttons fire select; a canceled link click is routed in the app', async () => {
      const el = await make(
        'mode="links" label="Try"',
        '<a href="#snow">snow on the Lawn</a><button value="rotunda">the Rotunda</button><a href="javascript:alert(1)">bad</a>',
      );
      const [a, b, bad] = chips(el);
      expect(a!.localName).to.equal('a');
      expect(a!.getAttribute('href')).to.equal('#snow');
      expect(b!.localName).to.equal('button');
      expect(bad!.localName).to.equal('button');
      expect(chips(el).some((c) => c.hasAttribute('aria-pressed'))).to.equal(false);
      const seen: { detail: unknown; cancelable: boolean }[] = [];
      const route = (e: Event) => {
        seen.push({ detail: (e as CustomEvent).detail, cancelable: e.cancelable });
        e.preventDefault();
      };
      el.addEventListener('select', route);
      const click = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true });
      a!.dispatchEvent(click);
      expect(click.defaultPrevented).to.equal(true);
      b!.click();
      expect(seen).to.deep.equal([
        { detail: { value: 'snow on the Lawn', href: '#snow' }, cancelable: true },
        { detail: { value: 'rotunda' }, cancelable: false },
      ]);
      // A modified click is left to the browser.
      const mod = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        composed: true,
        ctrlKey: true,
      });
      a!.dispatchEvent(mod);
      expect(seen).to.have.length(2);
    });

    it('items win over the children; entries with no label are skipped with a warning', async () => {
      const warns = await warnings(async () => {
        const el = await make('label="Sort"', '<button>Ignored</button>');
        el.items = [
          { value: 'photos', label: 'Most photos' },
          { value: 'date', label: 'Date' },
          { value: 'title', label: 'Title A–Z' },
          { value: 'x', label: '  ' },
        ];
        el.value = 'date';
        await el.updateComplete;
        expect(names(el)).to.deep.equal(['Most photos', 'Date', 'Title A–Z']);
        expect(radios(el)[1]!.checked).to.equal(true);
        el.items = undefined;
        await el.updateComplete;
        expect(names(el)).to.deep.equal(['Ignored']);
      });
      expect(warns).to.deep.equal([]);
    });

    it('follows changes to the children', async () => {
      const el = await make('label="Year"', '<button value="1">One</button>');
      const b = document.createElement('button');
      b.value = '2';
      b.textContent = 'Two';
      el.append(b);
      await waitUntil(() => names(el).length === 2, 'new child not read');
      expect(names(el)).to.deep.equal(['One', 'Two']);
    });

    it('warns once without a label', async () => {
      const warns = await warnings(async () => {
        const el = await make('');
        el.requestUpdate();
        await el.updateComplete;
      });
      expect(warns.filter((w) => w.includes('label'))).to.have.length(1);
    });

    it('reports changes: single once settled, multi each toggle, links without the chip', async () => {
      const rec = recordAnalytics();
      try {
        const single = await make('label="Year" value="2004"');
        await nextFrame();
        expect(rec.events, 'reported on render').to.deep.equal([]);
        chips(single)[2]!.click();
        chips(single)[0]!.click();
        await waitUntil(() => rec.events.length === 1, 'no settled change');
        // Out and back again within the settle time: nothing.
        chips(single)[2]!.click();
        chips(single)[0]!.click();
        await new Promise((r) => setTimeout(r, 150));
        const multi = await make('mode="multi" label="Category"');
        chips(multi)[1]!.click();
        chips(multi)[1]!.click();
        const links = await make('mode="links" label="Try"', '<a href="#snow">snow</a>');
        chips(links)[0]!.click();
        expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
          ['uvalib-chip-group', 'change', 'Year: All Years'],
          ['uvalib-chip-group', 'change', 'Category: 2004', 3694],
          ['uvalib-chip-group', 'change', 'Category: 2004', 3694],
          ['uvalib-chip-group', 'select', 'Try'],
        ]);
      } finally {
        rec.restore();
      }
    });

    it('url-param: read on connect, pushed on change, followed on Back', async () => {
      history.replaceState(null, '', `${location.pathname}?year=2005`);
      const el = await make('label="Year" url-param="year" value="2004"');
      expect(el.value).to.equal('2005');
      const length = history.length;
      chips(el)[1]!.click();
      await el.updateComplete;
      expect(location.search).to.equal('?year=2004');
      expect(history.length).to.equal(length + 1);
      // A second change straight after replaces that entry.
      chips(el)[0]!.click();
      await el.updateComplete;
      expect(location.search).to.equal('');
      expect(history.length).to.equal(length + 1);
      const seen: unknown[] = [];
      el.addEventListener('change', (e) => seen.push((e as CustomEvent).detail));
      const popped = new Promise((r) => window.addEventListener('popstate', r, { once: true }));
      history.back();
      await popped;
      await el.updateComplete;
      expect(el.value).to.equal('2005');
      expect(radios(el)[2]!.checked).to.equal(true);
      expect(seen).to.deep.equal([{ value: '2005', restored: true }]);
    });

    it('url-param: multi values comma-separated, inside the hash on a hash route', async () => {
      history.replaceState(null, '', `${location.pathname}#/series?cat=2004`);
      const el = await make('mode="multi" label="Category" url-param="cat"');
      expect(el.value).to.deep.equal(['2004']);
      chips(el)[2]!.click();
      await el.updateComplete;
      expect(location.hash).to.equal('#/series?cat=2004%2C2005');
      expect(location.search).to.equal('');
    });

    it('targets of at least 44px, a tick and fill for the selected chip, and axe', async () => {
      const el = await make('label="Year" value="2005"');
      for (const c of chips(el)) {
        const box = c.getBoundingClientRect();
        expect(box.height).to.be.at.least(44);
        expect(box.width).to.be.at.least(44);
      }
      const on = getComputedStyle(face(chips(el)[2]!));
      const off = getComputedStyle(face(chips(el)[1]!));
      expect(on.backgroundColor).to.not.equal(off.backgroundColor);
      expect(on.borderTopStyle).to.equal('solid');
      await expectNoAxeViolations(el);
      const multi = await make('mode="multi" label="Category" value="2004"');
      await expectNoAxeViolations(multi);
      const links = await make(
        'mode="links" label="Try"',
        '<a href="#a">snow</a><a href="#b">Lawn</a>',
      );
      await expectNoAxeViolations(links);
    });

    it('passes axe in dark mode', async () => {
      await inDarkMode(async () => {
        const el = await make('label="Year" value="2005" segmented');
        const on = getComputedStyle(face(chips(el)[2]!));
        expect(on.color).to.not.equal(getComputedStyle(face(chips(el)[1]!)).color);
        await expectNoAxeViolations(el);
        await expectNoAxeViolations(await make('mode="multi" label="Category" value="2004"'));
      });
    });

    it('forced colors: the selected chip is Highlight and keeps its tick', async () => {
      await emulateMedia({ forcedColors: 'active' });
      try {
        const el = await make('label="Year" value="2005"');
        const on = getComputedStyle(face(chips(el)[2]!));
        const off = getComputedStyle(face(chips(el)[1]!));
        expect(on.backgroundColor).to.not.equal(off.backgroundColor);
        expect(off.borderTopStyle).to.equal('solid');
        expect(off.borderTopColor).to.not.equal('rgba(0, 0, 0, 0)');
        expect(chips(el)[2]!.querySelector('svg.check')).to.not.equal(null);
      } finally {
        await emulateMedia({ forcedColors: 'none' });
      }
    });

    it('wraps at 320px; scroll keeps one row that scrolls, with no trap', async () => {
      await setViewport({ width: 320, height: 640 });
      const many = Array.from(
        { length: 12 },
        (_, i) => `<button value="${1990 + i}" data-count="${i * 7}">${1990 + i}</button>`,
      ).join('');
      try {
        const el = await make('label="Year"', many);
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
        const tops = new Set(chips(el).map((c) => Math.round(c.getBoundingClientRect().top)));
        expect(tops.size).to.be.greaterThan(1);
        el.remove();
        const row = await make('label="Year" scroll', many);
        const g = group(row);
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
        expect(getComputedStyle(g).overflowX).to.equal('auto');
        expect(g.scrollWidth).to.be.greaterThan(g.clientWidth);
        const tops2 = new Set(chips(row).map((c) => Math.round(c.getBoundingClientRect().top)));
        expect(tops2.size).to.equal(1);
        // Focus scrolls the last chip into view, and Tab moves on past the group.
        const last = radios(row).at(-1)!;
        last.focus();
        await nextFrame();
        expect(g.scrollLeft).to.be.greaterThan(0);
        await expectNoAxeViolations(row);
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
    });

    it('keeps the layout and the hidden radios with no-style', async () => {
      const el = await make('no-style label="Year" scroll segmented value="2005"');
      expect(getComputedStyle(group(el)).display).to.equal('flex');
      expect(getComputedStyle(group(el)).overflowX).to.equal('auto');
      expect(getComputedStyle(radios(el)[0]!).opacity).to.equal('0');
      expect(chips(el)[0]!.getBoundingClientRect().height).to.be.at.least(44);
      const hidden = chips(el)[1]!.querySelector('.visually-hidden')!;
      expect(getComputedStyle(hidden).position).to.equal('absolute');
    });
  });
}
