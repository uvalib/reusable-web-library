// What the library's own components report for <site-analytics>: they only fire events, so
// these tests listen on `document` with no analytics element (nothing is loaded or sent).
import { expect, fixture, nextFrame, waitUntil } from '@open-wc/testing';
import '../src/components/bento-box/bento-box.js';
import '../src/components/site-main-nav/site-main-nav.js';
import '../src/components/site-header/site-header.js';
import type { BentoBox } from '../src/components/bento-box/BentoBox.js';
import type { BentoSection } from '../src/components/bento-box/BentoSection.js';
import type { SiteMainNav } from '../src/components/site-main-nav/SiteMainNav.js';
import type { SiteHeader } from '../src/components/site-header/SiteHeader.js';
import { COLOR_SCHEME_ATTR, COLOR_SCHEME_STORAGE_KEY } from '../src/base/color-scheme.js';
import { resetBento, useBentoHost } from './helpers/bento.js';
import { recordAnalytics } from './helpers/analytics.js';

type Section = BentoSection<unknown>;
const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const sections = (box: BentoBox) => [
  ...root(box).querySelectorAll<Section>('.bs-results-container > .bs-results--block'),
];
// Test-only hosts of test/helpers/bento-intercept.mjs.
const BENTO_EMPTY_HOST = 'bento-empty.test';
const BENTO_FAIL_HOST = 'bento-fail.test';
const NAMES = ['Virgo catalog', 'Virgo articles', 'Subject guides', 'Library website'];

async function settled(box: BentoBox) {
  await box.updateComplete;
  await waitUntil(() => sections(box).every((s) => s.state !== 'loading'), 'still loading', {
    timeout: 4000,
  });
  for (const s of sections(box)) await s.updateComplete;
}

/** The count a section shows in its "See all" button, or undefined. */
const shownTotal = (s: Section) => {
  const t = root(s).querySelector('.bs-results--qty')?.textContent;
  return t ? Number(t.replace(/,/g, '')) : undefined;
};

let rec: ReturnType<typeof recordAnalytics>;
/** Clicks would navigate the test page: cancel them once they reach `document`. */
const cancel = (e: Event) => {
  const nav = e
    .composedPath()
    .some(
      (n) =>
        n instanceof HTMLAnchorElement || (n instanceof HTMLButtonElement && n.type === 'submit'),
    );
  if (nav) e.preventDefault();
};

describe('analytics from the components', () => {
  beforeEach(() => {
    rec = recordAnalytics();
    document.addEventListener('click', cancel);
  });
  afterEach(() => {
    rec.restore();
    document.removeEventListener('click', cancel);
  });

  for (const mode of ['shadow', 'light'] as const) {
    describe(`bento-box (${mode})`, () => {
      beforeEach(resetBento);
      after(resetBento);
      const make = async (query = 'test') => {
        const box = await fixture<BentoBox>(
          `<bento-box ${mode === 'light' ? 'no-shadow-dom' : ''} query="${query}"></bento-box>`,
        );
        await settled(box);
        return box;
      };

      it('one site search per section, with its total, once per load', async () => {
        const box = await make();
        const searches = rec.of('uvalib-analytics-search');
        expect(searches.map((d) => d.searchCategory)).to.have.members(NAMES);
        for (const s of sections(box)) {
          const d = searches.find((x) => x.searchCategory === s.analyticsName)!;
          expect(d.searchQuery).to.equal('test');
          expect(d.resultCount, s.analyticsName).to.equal(shownTotal(s));
        }
        // Re-rendering reports nothing new.
        box.requestUpdate();
        for (const s of sections(box)) s.requestUpdate();
        await settled(box);
        await nextFrame();
        expect(rec.of('uvalib-analytics-search')).to.have.length(4);
        // A new query (as Back or Forward sets it) is a new results view.
        box.query = 'history';
        await nextFrame();
        await settled(box);
        const again = rec.of('uvalib-analytics-search').slice(4);
        expect(again.map((d) => d.searchQuery)).to.deep.equal(Array(4).fill('history'));
      });

      it('nothing found counts 0; an error is not a search', async () => {
        useBentoHost(BENTO_EMPTY_HOST, ['catalog', 'articles']);
        useBentoHost(BENTO_FAIL_HOST, ['guides', 'website']);
        const box = await make('nothing-here');
        expect(sections(box).map((s) => s.state)).to.deep.equal([
          'empty',
          'empty',
          'error',
          'error',
        ]);
        expect(
          rec.of('uvalib-analytics-search').map((d) => [d.searchCategory, d.resultCount]),
        ).to.deep.equal([
          ['Virgo catalog', 0],
          ['Virgo articles', 0],
        ]);
      });

      it('result and see-all clicks: section and 1-based position, no titles or URLs', async () => {
        const box = await make();
        const [catalog, , guides] = sections(box);
        const links = (s: Section, n: number) =>
          root(s).querySelectorAll<HTMLAnchorElement>(
            `ol.bs-results--list > li:nth-child(${n}) a[href]`,
          );
        links(catalog!, 3)[0]!.click();
        // Any link in an entry counts for that entry (a guide's author, here).
        const guideLinks = links(guides!, 2);
        guideLinks[guideLinks.length - 1]!.click();
        root(guides!).querySelector<HTMLButtonElement>('.bs-results--see-all button')!.click();
        // Not a result: the description and the header.
        root(catalog!).querySelector<HTMLElement>('.bs-results--body > p')!.click();
        expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
          ['bento-box', 'result-click', 'Virgo catalog', 3],
          ['bento-box', 'result-click', 'Subject guides', 2],
          ['bento-box', 'see-all-click', 'Subject guides'],
        ]);
      });
    });
  }

  it('site-main-nav: a menu opening (not closing) with its label', async () => {
    const nav = await fixture<SiteMainNav>('<site-main-nav></site-main-nav>');
    await nav.updateComplete;
    const buttons = [...root(nav).querySelectorAll<HTMLButtonElement>('nav.main-nav button')];
    buttons[0]!.click();
    await nav.updateComplete;
    buttons[0]!.click(); // close
    await nav.updateComplete;
    buttons[1]!.click();
    await nav.updateComplete;
    expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
      ['site-main-nav', 'menu-open', buttons[0]!.textContent!.trim()],
      ['site-main-nav', 'menu-open', buttons[1]!.textContent!.trim()],
    ]);
  });

  describe('site-header colour scheme', () => {
    afterEach(() => {
      document.documentElement.removeAttribute(COLOR_SCHEME_ATTR);
      document.documentElement.style.removeProperty('color-scheme');
      localStorage.removeItem(COLOR_SCHEME_STORAGE_KEY);
    });

    it("the visitor's choices, not the initial value", async () => {
      const header = await fixture<SiteHeader>('<site-header color-scheme-switch></site-header>');
      await header.updateComplete;
      const radio = (v: string) =>
        root(header).querySelector<HTMLInputElement>(
          `fieldset.color-scheme.inline input[value="${v}"]`,
        )!;
      expect(rec.events).to.deep.equal([]);
      radio('dark').click();
      await header.updateComplete;
      radio('system').click();
      await header.updateComplete;
      expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
        ['site-header', 'color-scheme', 'dark'],
        ['site-header', 'color-scheme', 'system'],
      ]);
    });
  });
});
