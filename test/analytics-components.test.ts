// What the library's own components report for <site-analytics>: they only fire events, so
// these tests listen on `document` with no analytics element (nothing is loaded or sent).
import { expect, fixture, nextFrame, waitUntil } from '@open-wc/testing';
import '../src/components/bento-box/bento-box.js';
import '../src/components/site-main-nav/site-main-nav.js';
import '../src/components/site-header/site-header.js';
import '../src/components/site-page/site-page.js';
import '../src/components/uvalib-analytics/uvalib-analytics.js';
import type { BentoBox } from '../src/components/bento-box/BentoBox.js';
import type { BentoSection } from '../src/components/bento-box/BentoSection.js';
import type { SiteMainNav } from '../src/components/site-main-nav/SiteMainNav.js';
import type { SiteHeader } from '../src/components/site-header/SiteHeader.js';
import type { SitePage } from '../src/components/site-page/SitePage.js';
import type { SiteAnalytics } from '../src/components/site-analytics/SiteAnalytics.js';
import { COLOR_SCHEME_ATTR, COLOR_SCHEME_STORAGE_KEY } from '../src/base/color-scheme.js';
import { trackEvent, trackSearch } from '../src/base/analytics.js';
import { analyticsState, bufferAnalytics } from '../src/base/analytics-state.js';
import { resetBento, useBentoHost } from './helpers/bento.js';
import { matomoScripts, paq, recordAnalytics, resetAnalytics } from './helpers/analytics.js';
import { expectNoPageAxeViolations } from './helpers/axe.js';

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
        // Reloading the same query for a new limit is not a new search.
        box.setAttribute('limit', '2');
        await nextFrame();
        await settled(box);
        expect(rec.of('uvalib-analytics-search')).to.have.length(4);
        // A new query (as Back or Forward sets it) is a new results view.
        box.query = 'history';
        await nextFrame();
        await settled(box);
        const again = rec.of('uvalib-analytics-search').slice(4);
        expect(again.map((d) => d.searchQuery)).to.deep.equal(Array(4).fill('history'));
        // Back to the first query counts it again.
        box.query = 'test';
        await nextFrame();
        await settled(box);
        expect(
          rec
            .of('uvalib-analytics-search')
            .slice(8)
            .map((d) => d.searchQuery),
        ).to.deep.equal(Array(4).fill('test'));
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

  for (const mode of ['shadow', 'light'] as const) {
    describe(`site-page matomo-id (${mode})`, () => {
      beforeEach(resetAnalytics);
      after(resetAnalytics);
      const make = (attrs: string) =>
        fixture<SitePage>(
          `<site-page ${mode === 'light' ? 'no-shadow-dom' : ''} no-alerts ${attrs}><h1>Page</h1><p>Body</p></site-page>`,
        );
      const analytics = () => {
        const page = document.querySelector('site-page')!;
        return [
          ...document.querySelectorAll('site-analytics, uvalib-analytics'),
          ...(page.shadowRoot?.querySelectorAll('site-analytics, uvalib-analytics') ?? []),
        ];
      };

      it('without it: no analytics element and nothing loaded', async () => {
        const page = await make('');
        await page.updateComplete;
        await nextFrame();
        expect(analytics()).to.have.length(0);
        expect(matomoScripts()).to.have.length(0);
      });

      it('adds one <site-analytics> for the id, outside <main>, and the page stays clean', async () => {
        const page = await make('matomo-id="10" matomo-url="https://matomo.test/"');
        await customElements.whenDefined('site-analytics');
        const [el, ...more] = analytics() as SiteAnalytics[];
        expect(more).to.have.length(0);
        await el!.updateComplete;
        expect(el!.localName).to.equal('site-analytics');
        expect(el!.closest('main')).to.equal(null);
        expect(el!.matomoId).to.equal(10);
        expect(paq()).to.deep.include(['setSiteId', '10']);
        expect(matomoScripts().map((s) => s.src)).to.deep.equal(['https://matomo.test/matomo.js']);
        // A re-render keeps the one element.
        page.requestUpdate();
        await page.updateComplete;
        expect(analytics()).to.deep.equal([el]);
        await expectNoPageAxeViolations();
      });

      it('with an analytics element already on the page, still one page view', async () => {
        const host = await fixture(
          `<div><uvalib-analytics matomoid="10"></uvalib-analytics><site-page ${mode === 'light' ? 'no-shadow-dom' : ''} no-alerts matomo-id="10"><h1>Page</h1></site-page></div>`,
        );
        await (host.querySelector('site-page') as SitePage).updateComplete;
        await customElements.whenDefined('site-analytics');
        await nextFrame();
        expect(matomoScripts()).to.have.length(1);
        expect(paq().filter((c) => c[0] === 'trackPageView')).to.have.length(1);
        // The page's own element records it (it may be the old v0.0.12 one, which does not
        // share the guard), so site-page adds none.
        expect(analytics().map((a) => a.localName)).to.deep.equal(['uvalib-analytics']);
      });
    });
  }

  describe('bufferAnalytics (site-page while the analytics code loads)', () => {
    beforeEach(resetAnalytics);
    after(resetAnalytics);

    it('keeps events nobody forwards, and fires them again on flush', () => {
      const buffer = bufferAnalytics(document);
      trackSearch(document.body, 'hours', 'Virgo catalog', 3);
      const seen: unknown[] = [];
      const see = (e: Event) => seen.push((e as CustomEvent).detail);
      document.addEventListener('uvalib-analytics-search', see);
      try {
        buffer.flush();
        expect(seen).to.deep.equal([
          { searchQuery: 'hours', searchCategory: 'Virgo catalog', resultCount: 3 },
        ]);
        // Stopped: later events are not kept.
        trackSearch(document.body, 'later');
        buffer.flush();
        expect(seen).to.have.length(2); // the live event itself, not a replay
      } finally {
        document.removeEventListener('uvalib-analytics-search', see);
      }
    });

    it('keeps nothing while an element forwards, and drop() forgets', () => {
      const state = analyticsState();
      const tracker = { off: false };
      state.trackers.push(tracker);
      const buffer = bufferAnalytics(document);
      trackEvent(document.body, ['a', 'b']);
      state.trackers.splice(state.trackers.indexOf(tracker), 1);
      trackEvent(document.body, ['c', 'd']);
      buffer.drop();
      const seen: unknown[] = [];
      const see = (e: Event) => seen.push(e);
      document.addEventListener('uvalib-analytics-event', see);
      try {
        buffer.flush();
        expect(seen).to.have.length(0);
      } finally {
        document.removeEventListener('uvalib-analytics-event', see);
      }
    });
  });
});
