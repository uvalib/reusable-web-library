import { expect, fixture, nextFrame } from '@open-wc/testing';
import { emulateMedia, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-results-count/uvalib-results-count.js';
import type { UvalibResultsCount } from '../src/components/uvalib-results-count/UvalibResultsCount.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { recordAnalytics } from './helpers/analytics.js';
import { inDarkMode } from './helpers/dark.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const visible = (el: Element) => root(el).querySelector<HTMLElement>('.text')!.textContent;
const live = (el: Element) => root(el).querySelector<HTMLElement>('[role="status"]')!;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Record every text the live region holds, as a screen reader would hear it. */
function listen(el: Element) {
  const heard: string[] = [];
  const region = live(el);
  const obs = new MutationObserver(() => {
    const t = region.textContent!.trim();
    if (t) heard.push(t);
  });
  obs.observe(region, { childList: true, characterData: true, subtree: true });
  return { heard, stop: () => obs.disconnect() };
}

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-results-count (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = (attrs = 'shown="48" total="3694" noun="shoots" announce-delay="60"') =>
      fixture<UvalibResultsCount>(`<uvalib-results-count ${attr} ${attrs}></uvalib-results-count>`);

    it('shows the summary with thousands separators', async () => {
      const el = await make();
      expect(visible(el)).to.equal('Showing 48 of 3,694 shoots');
    });

    it('words every case', async () => {
      const el = await make('noun="shoots" singular="shoot"');
      const cases: [number | undefined, number | undefined, string][] = [
        [48, 3694, 'Showing 48 of 3,694 shoots'],
        [12, 12, 'Showing all 12 shoots'],
        [undefined, 12, 'Showing all 12 shoots'],
        [1, 1, 'Showing 1 shoot'],
        [0, 0, 'No shoots'],
        [48, undefined, 'Showing 48 shoots'],
        [undefined, undefined, ''],
      ];
      for (const [shown, total, text] of cases) {
        el.shown = shown;
        el.total = total;
        await el.updateComplete;
        expect(visible(el), `${shown}/${total}`).to.equal(text);
      }
      const plain = await make('total="1"');
      expect(visible(plain)).to.equal('Showing 1 result');
      plain.total = 2;
      await plain.updateComplete;
      expect(visible(plain)).to.equal('Showing all 2 results');
    });

    it('never announces the first render', async () => {
      const el = await make();
      const region = live(el);
      expect(region.getAttribute('aria-live')).to.equal('polite');
      expect(region.getAttribute('aria-atomic')).to.equal('true');
      await wait(150);
      expect(region.textContent!.trim()).to.equal('');
    });

    it('keeps the visible text in sync at once, and announces once the count settles', async () => {
      const el = await make();
      const { heard, stop } = listen(el);
      for (const n of [40, 30, 20]) {
        el.shown = n;
        await el.updateComplete;
        expect(visible(el)).to.equal(`Showing ${n} of 3,694 shoots`);
        await wait(20);
      }
      expect(heard).to.deep.equal([]);
      await wait(120);
      expect(heard).to.deep.equal(['Showing 20 of 3,694 shoots']);
      stop();
    });

    it('does not announce a count that came back to the last one announced', async () => {
      const el = await make();
      const { heard, stop } = listen(el);
      el.shown = 10;
      await el.updateComplete;
      el.shown = 48;
      await el.updateComplete;
      await wait(150);
      expect(heard).to.deep.equal([]);
      el.total = 100;
      await el.updateComplete;
      await wait(150);
      expect(heard).to.deep.equal(['Showing 48 of 100 shoots']);
      stop();
    });

    it('waits one second by default', async () => {
      const el = await make('shown="1" total="9"');
      el.shown = 2;
      await el.updateComplete;
      await wait(600);
      expect(live(el).textContent!.trim()).to.equal('');
      await wait(600);
      expect(live(el).textContent!.trim()).to.equal('Showing 2 of 9 results');
    }).timeout(4000);

    it('sends no analytics', async () => {
      const rec = recordAnalytics();
      try {
        const el = await make();
        el.shown = 1;
        await el.updateComplete;
        await wait(120);
        expect(rec.events).to.deep.equal([]);
      } finally {
        rec.restore();
      }
    });

    it('passes axe, light and dark, with AAA text', async () => {
      const el = await make();
      el.shown = 2;
      await el.updateComplete;
      await wait(120);
      await expectNoAxeViolations(el);
      expect(getComputedStyle(root(el).querySelector('.text')!).color).to.equal('rgb(79, 79, 79)');
      await inDarkMode(async () => {
        const dark = await make();
        expect(getComputedStyle(root(dark).querySelector('.text')!).color).to.equal(
          'rgb(173, 173, 173)',
        );
        await expectNoAxeViolations(dark);
      });
    });

    it('wraps at 320px and keeps its text in forced colors', async () => {
      await setViewport({ width: 320, height: 640 });
      await emulateMedia({ forcedColors: 'active' });
      try {
        const el = await make('shown="1234567" total="98765432" noun="photographs and negatives"');
        await nextFrame();
        expect(el.getBoundingClientRect().right).to.be.at.most(320);
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
        expect(visible(el)).to.equal('Showing 1,234,567 of 98,765,432 photographs and negatives');
      } finally {
        await emulateMedia({ forcedColors: 'none' });
        await setViewport({ width: 800, height: 600 });
      }
    });

    it('keeps the live region hidden with no-style', async () => {
      const el = await make('total="3" no-style');
      expect(getComputedStyle(live(el)).position).to.equal('absolute');
    });
  });
}
