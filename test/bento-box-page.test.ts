import { expect, fixture, fixtureCleanup, nextFrame, waitUntil } from '@open-wc/testing';
import { emulateMedia } from '@web/test-runner-commands';
import '../src/components/site-page/site-page.js';
import '../src/components/bento-box/bento-box.js';
import type { BentoBox } from '../src/components/bento-box/BentoBox.js';
import type { BentoSection } from '../src/components/bento-box/BentoSection.js';
import { bentoTiming } from '../src/components/bento-box/bento-data.js';
import { COLOR_SCHEME_ATTR, COLOR_SCHEME_STORAGE_KEY } from '../src/base/color-scheme.js';
import { expectNoPageAxeViolations } from './helpers/axe.js';
import { contrast, rgb, rootOf } from './helpers/scheme-colors.js';
import { resetBento, useBentoHost } from './helpers/bento.js';

// <bento-box> in a whole page, as library.virginia.edu/search uses it: under the page's h1
// and followed by Drupal's Virgo links, in light and dark, styled and unstyled.
const MARKUP = (attrs: string) => `
  <h1>Search Library resources</h1>
  <bento-box limit="3" ${attrs}></bento-box>
  <div><a href="https://search.lib.virginia.edu/">Search Virgo</a> | <a href="https://search.lib.virginia.edu/search?mode=advanced">Advanced Virgo search</a></div>`;

const START = location.href;

async function mount(attrs: string, scheme: 'light' | 'dark'): Promise<BentoBox> {
  localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, scheme);
  const page = await fixture<HTMLElement>(
    `<site-page color-scheme-switch alerts-src="https://alerts.test/">${MARKUP(attrs)}</site-page>`,
  );
  await customElements.whenDefined('site-footer');
  const box = page.querySelector('bento-box') as BentoBox;
  await box.updateComplete;
  const sections = () => [
    ...rootOf(box).querySelectorAll<BentoSection<unknown>>('.bs-results--block'),
  ];
  await waitUntil(() => sections().every((s) => s.state !== 'loading'), 'still loading', {
    timeout: 4000,
  });
  for (const s of sections()) await s.updateComplete;
  await nextFrame();
  return box;
}

async function reset(): Promise<void> {
  document.documentElement.removeAttribute(COLOR_SCHEME_ATTR);
  localStorage.removeItem(COLOR_SCHEME_STORAGE_KEY);
  history.replaceState(null, '', START);
  await emulateMedia({ colorScheme: 'light' });
}

const color = (el: Element, prop = 'color') => getComputedStyle(el).getPropertyValue(prop);

describe('bento-box in a page', function () {
  this.timeout(20000);
  beforeEach(() => {
    resetBento();
    const url = new URL(START);
    url.searchParams.set('q', 'test');
    history.replaceState(null, '', url);
  });
  afterEach(reset);
  after(resetBento);

  for (const scheme of ['light', 'dark'] as const) {
    for (const [mode, attrs] of [
      ['shadow', ''],
      ['light DOM', 'no-shadow-dom'],
      ['light DOM no-style (Drupal)', 'no-shadow-dom no-style'],
    ] as const) {
      it(`${scheme}, ${mode}: passes axe at every impact level, loaded and failing`, async () => {
        await mount(attrs, scheme);
        await expectNoPageAxeViolations();
        fixtureCleanup();
        useBentoHost('bento-fail.test');
        bentoTiming.retries = 1;
        await mount(attrs, scheme);
        await expectNoPageAxeViolations();
      });
    }

    for (const [mode, attrs] of [
      ['shadow', ''],
      ['light DOM', 'no-shadow-dom'],
    ] as const) {
      it(`${scheme}, ${mode}: styled colours come from the role tokens and pass AA`, async () => {
        const box = await mount(attrs, scheme);
        const r = rootOf(box);
        const s = rootOf(r.querySelector('catalog-section')!);
        const block = r.querySelector('catalog-section')!;
        const bg = color(block, 'background-color');
        const band = color(s.querySelector('.bs-results--header')!, 'background-color');
        const button = r.querySelector('.bento-search-bar button')!;
        const pairs = {
          'heading on the band': [color(s.querySelector('.bs-results--header > *')!), band],
          'see all on its button': [
            color(s.querySelector('.bs-results--header button')!),
            color(s.querySelector('.bs-results--header button')!, 'background-color'),
          ],
          'title on the block': [color(s.querySelector('.bs-results--title')!), bg],
          'author on the block': [color(s.querySelector('.bs-results--author')!), bg],
          'search text in the input': [
            color(r.querySelector('.bento-search-bar input')!),
            color(r.querySelector('.bento-search-bar input')!, 'background-color'),
          ],
          'search icon on its button': [color(button), color(button, 'background-color')],
        };
        for (const [what, [fg, back]] of Object.entries(pairs))
          expect(contrast(fg!, back!), `${what}: ${fg} on ${back}`).to.be.at.least(4.5);
        if (scheme === 'dark') {
          expect(bg).to.equal(rgb('#232d4b'));
          expect(color(s.querySelector('.bs-results--title')!)).to.equal(rgb('#87b9d9'));
        } else {
          expect(bg).to.equal(rgb('#ffffff'));
          expect(color(s.querySelector('.bs-results--title')!)).to.equal(rgb('#232d4b'));
        }
      });
    }
  }
});
