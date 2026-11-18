import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import { LitElement } from 'lit';
import { findMatomoId } from '../src/data/sites.js';
import '../src/components/site-analytics/site-analytics.js';
import '../src/components/uvalib-analytics/uvalib-analytics.js';
import type { SiteAnalytics } from '../src/components/site-analytics/SiteAnalytics.js';
import { SiteAnalyticsMixin } from '../src/components/site-analytics/SiteAnalyticsMixin.js';
import { UvalibAnalytics } from '../src/components/uvalib-analytics/UvalibAnalytics.js';
import { UvalibAnalyticsMixin } from '../src/components/uvalib-analytics/UvalibAnalyticsMixin.js';
import { define } from '../src/base/define.js';
import { trackContent } from '../src/base/analytics.js';
import { resetAnalytics, paq, matomoScripts, stub, fire } from './helpers/analytics.js';

const MATOMO = 'https://analytics.lib.virginia.edu/';
const DOWNLOADS = 'epub|mobi|csv|tsv|json|xml|zip|tar|gz|mp3|mp4|m4a|tif|tiff|jp2|mrc|ris|bib|txt';

describe('findMatomoId', () => {
  it('matches by url prefix', () => {
    expect(findMatomoId('https://avalon.lib.virginia.edu/media/1')).to.equal(42);
  });
  it('falls back to the matomoDefault site', () => {
    expect(findMatomoId('https://example.org/')).to.equal(23);
  });
});

const commands = (name: string) => paq().filter((c) => c[0] === name);

describe('<uvalib-analytics> / <site-analytics>', () => {
  beforeEach(resetAnalytics);
  after(resetAnalytics);

  it('registers uvalib-analytics as a subclass of the same element', () => {
    expect(customElements.get('uvalib-analytics')).to.equal(UvalibAnalytics);
    expect(new UvalibAnalytics()).to.be.instanceOf(customElements.get('site-analytics')!);
  });

  it('legacy Drupal markup: the queue in order, one script, one page view', async () => {
    const el = await fixture<SiteAnalytics>(
      html`<uvalib-analytics matomoid="10"></uvalib-analytics>`,
    );
    // Lit lowercases matomoId to the `matomoid` attribute.
    expect(el.matomoId).to.equal(10);
    expect(paq()).to.deep.equal([
      ['setTrackerUrl', `${MATOMO}matomo.php`],
      ['setSiteId', '10'],
      ['addDownloadExtensions', DOWNLOADS],
      ['trackPageView'],
      ['enableLinkTracking'],
    ]);
    expect(matomoScripts().map((s) => s.src)).to.deep.equal([`${MATOMO}matomo.js`]);
    await waitUntil(
      () => JSON.stringify(stub()?.queue) === JSON.stringify(paq()),
      'the stub matomo.js did not run',
    );
  });

  it('matomourl and variables: dimensions before the page view', async () => {
    await fixture(
      html`<site-analytics
        matomoid="7"
        matomourl="https://matomo.test/"
        variables='{"1":"staff","3":"Alderman"}'
      ></site-analytics>`,
    );
    expect(paq()).to.deep.equal([
      ['setTrackerUrl', 'https://matomo.test/matomo.php'],
      ['setSiteId', '7'],
      ['setCustomDimension', '1', 'staff'],
      ['setCustomDimension', '3', 'Alderman'],
      ['addDownloadExtensions', DOWNLOADS],
      ['trackPageView'],
      ['enableLinkTracking'],
    ]);
    expect(matomoScripts().map((s) => s.src)).to.deep.equal(['https://matomo.test/matomo.js']);
  });

  it('without matomoid uses the site the page URL belongs to', async () => {
    await fixture(html`<site-analytics></site-analytics>`);
    expect(commands('setSiteId')).to.deep.equal([
      ['setSiteId', String(findMatomoId(location.href))],
    ]);
  });

  it('forwards both event families, detail.track, and unknown counts as false', async () => {
    const el = await fixture(html`<site-analytics matomoid="5"><span></span></site-analytics>`);
    const span = el.querySelector('span')!;
    fire(span, 'uvalib-analytics-event', { event: ['a', 'b', 'c', 2] });
    fire(span, 'site-analytics-event', { event: ['d', 'e'] });
    fire(span, 'uvalib-analytics-event', { track: ['old', 'name'] });
    fire(span, 'site-analytics-search', { searchQuery: 'q', resultCount: 3 });
    fire(span, 'uvalib-analytics-search', {
      searchQuery: 'r',
      searchCategory: 'Virgo catalog',
      resultCount: null,
    });
    fire(span, 'uvalib-analytics-search', { searchQuery: 's', searchCategory: 'x' });
    expect(commands('trackEvent')).to.deep.equal([
      ['trackEvent', 'a', 'b', 'c', 2],
      ['trackEvent', 'd', 'e'],
      ['trackEvent', 'old', 'name'],
    ]);
    expect(commands('trackSiteSearch')).to.deep.equal([
      ['trackSiteSearch', 'q', false, 3],
      ['trackSiteSearch', 'r', 'Virgo catalog', false],
      ['trackSiteSearch', 's', 'x', false],
    ]);
  });

  it('forwards content impressions and interactions (both families)', async () => {
    const el = await fixture(html`<site-analytics matomoid="5"><span></span></site-analytics>`);
    const span = el.querySelector('span')!;
    trackContent(span, { name: 'Library alert', piece: 'Warning: Wi-Fi down' });
    trackContent(span, { name: 'Banner', piece: 'Fall', target: '/fall' });
    trackContent(span, { name: 'Banner', piece: 'Fall', target: '/fall', interaction: 'click' });
    fire(span, 'site-analytics-content', { name: 'Library alert', piece: 'Critical: Closed' });
    fire(span, 'uvalib-analytics-content', { name: 'No piece' });
    expect(paq().filter((c) => String(c[0]).startsWith('trackContent'))).to.deep.equal([
      ['trackContentImpression', 'Library alert', 'Warning: Wi-Fi down'],
      ['trackContentImpression', 'Banner', 'Fall', '/fall'],
      ['trackContentInteraction', 'click', 'Banner', 'Fall', '/fall'],
      ['trackContentImpression', 'Library alert', 'Critical: Closed'],
    ]);
  });

  it('two elements: each content impression is forwarded once', async () => {
    await fixture(
      html`<div>
        <site-analytics matomoid="5"></site-analytics
        ><uvalib-analytics matomoid="5"></uvalib-analytics>
      </div>`,
    );
    trackContent(document.body, { name: 'Library alert', piece: 'Information: Hours' });
    expect(paq().filter((c) => c[0] === 'trackContentImpression').length).to.equal(1);
  });

  it('queues events fired before matomo.js loads (even before the first render)', async () => {
    const el = document.createElement('uvalib-analytics');
    el.setAttribute('matomoid', '10');
    document.body.append(el);
    try {
      fire(document, 'uvalib-analytics-event', { event: ['early', 'bird'] });
      // Not even the script yet: the event is queued, and matomo.js replays it.
      expect(matomoScripts()).to.have.length(0);
      expect(paq()).to.deep.equal([['trackEvent', 'early', 'bird']]);
      await waitUntil(
        () => stub()?.queue.some((c) => c[1] === 'early'),
        'the stub matomo.js did not run',
      );
      expect(stub()!.queue).to.deep.include(['setSiteId', '10']);
    } finally {
      el.remove();
    }
  });

  it('spa: no page view on load; pageview events set the title and referrer', async () => {
    await fixture(html`<site-analytics spa matomoid="41"></site-analytics>`);
    expect(paq()).to.deep.include(['setSiteId', '41']);
    expect(commands('trackPageView')).to.deep.equal([]);
    expect(commands('enableLinkTracking')).to.deep.equal([]);

    fire(document, 'site-analytics-pageview', { customTitle: 'Results', referrer: '/from' });
    fire(document, 'uvalib-analytics-pageview', {
      customTitle: 'Item',
      referrer: 'https://example.org/x',
    });
    fire(document, 'uvalib-analytics-pageview', undefined);
    expect(paq().slice(-9)).to.deep.equal([
      ['setDocumentTitle', 'Results'],
      ['setReferrerUrl', `${location.origin}/from`],
      ['trackPageView', 'Results'],
      ['setDocumentTitle', 'Item'],
      ['setReferrerUrl', 'https://example.org/x'],
      ['trackPageView', 'Item'],
      ['setDocumentTitle', document.title],
      ['setReferrerUrl', document.referrer],
      ['trackPageView', document.title],
    ]);
  });

  describe('one tracker per page', () => {
    it('two elements: one script, one page view, each event once', async () => {
      const el = await fixture(
        html`<div>
          <site-analytics matomoid="5"></site-analytics>
          <uvalib-analytics matomoid="5"></uvalib-analytics>
        </div>`,
      );
      await (el.lastElementChild as SiteAnalytics).updateComplete;
      expect(matomoScripts()).to.have.length(1);
      expect(commands('trackPageView')).to.have.length(1);
      expect(commands('setSiteId')).to.have.length(1);
      fire(document, 'uvalib-analytics-event', { event: ['x', 'y'] });
      fire(document, 'site-analytics-search', { searchQuery: 'q' });
      expect(commands('trackEvent')).to.have.length(1);
      expect(commands('trackSiteSearch')).to.have.length(1);
    });

    it('the next element takes over when the forwarding one is removed', async () => {
      const el = await fixture(
        html`<div>
          <site-analytics matomoid="5"></site-analytics>
          <uvalib-analytics matomoid="5"></uvalib-analytics>
        </div>`,
      );
      await (el.lastElementChild as SiteAnalytics).updateComplete;
      el.firstElementChild!.remove();
      fire(document, 'uvalib-analytics-event', { event: ['x', 'y'] });
      expect(commands('trackEvent')).to.have.length(1);
      el.firstElementChild!.remove();
      fire(document, 'uvalib-analytics-event', { event: ['x', 'y'] });
      expect(commands('trackEvent')).to.have.length(1);
    });

    it('a removed and re-appended element still forwards', async () => {
      const el = await fixture(html`<site-analytics matomoid="5"></site-analytics>`);
      const parent = el.parentElement!;
      el.remove();
      parent.append(el);
      fire(document, 'site-analytics-search', { searchQuery: 'q', resultCount: 3 });
      expect(commands('trackSiteSearch')).to.have.length(1);
    });

    it('a Matomo snippet already on the page: nothing loaded or recorded again', async () => {
      (window as unknown as { _paq: unknown[][] })._paq = [['trackPageView'], ['setSiteId', '3']];
      await fixture(html`<uvalib-analytics matomoid="10"></uvalib-analytics>`);
      expect(matomoScripts()).to.have.length(0);
      expect(paq()).to.deep.equal([['trackPageView'], ['setSiteId', '3']]);
      fire(document, 'uvalib-analytics-event', { event: ['x', 'y'] });
      expect(commands('trackEvent')).to.have.length(1);
    });

    it('a matomo.js script already on the page: no second script or page view', async () => {
      const s = document.createElement('script');
      s.src = `${MATOMO}matomo.js`;
      document.head.append(s);
      await fixture(html`<site-analytics matomoid="10"></site-analytics>`);
      expect(matomoScripts()).to.have.length(1);
      expect(commands('trackPageView')).to.have.length(0);
    });

    it('another copy of the library (shared state) already tracks: this one stands by', async () => {
      // What a second bundle copy sees: the state under the same Symbol.for key, with that
      // copy's element connected first and Matomo booted.
      const key = Symbol.for('@uvalib/web-components/analytics');
      const other = { off: false };
      (window as unknown as Record<symbol, unknown>)[key] = { trackers: [other], booted: true };
      await fixture(html`<site-analytics matomoid="10"></site-analytics>`);
      expect(matomoScripts()).to.have.length(0);
      expect(paq()).to.deep.equal([]);
      fire(document, 'uvalib-analytics-event', { event: ['x', 'y'] });
      expect(commands('trackEvent')).to.have.length(0);
      // The other copy's element leaves: this one takes over.
      const state = (window as unknown as Record<symbol, { trackers: unknown[] }>)[key]!;
      state.trackers.splice(state.trackers.indexOf(other), 1);
      fire(document, 'uvalib-analytics-event', { event: ['x', 'y'] });
      expect(commands('trackEvent')).to.have.length(1);
    });

    it('removed listeners: a disconnected element forwards nothing', async () => {
      const el = await fixture(html`<site-analytics matomoid="5"></site-analytics>`);
      el.remove();
      fire(document, 'site-analytics-search', { searchQuery: 'q' });
      expect(commands('trackSiteSearch')).to.have.length(0);
    });
  });

  describe('mixins', () => {
    class OldApp extends UvalibAnalyticsMixin(LitElement) {}
    class NewApp extends SiteAnalyticsMixin(LitElement) {}
    define('test-old-analytics-app', OldApp);
    define('test-new-analytics-app', NewApp);

    it('UvalibAnalyticsMixin fires uvalib-analytics-*, SiteAnalyticsMixin site-analytics-*', async () => {
      const el = await fixture(
        html`<div>
          <site-analytics matomoid="5"></site-analytics>
          <test-old-analytics-app></test-old-analytics-app>
          <test-new-analytics-app></test-new-analytics-app>
        </div>`,
      );
      const seen: string[] = [];
      const log = (e: Event) => seen.push(e.type);
      for (const t of [
        'uvalib-analytics-event',
        'uvalib-analytics-search',
        'site-analytics-event',
        'site-analytics-search',
      ])
        document.addEventListener(t, log);
      try {
        const old = el.querySelector<OldApp>('test-old-analytics-app')!;
        const neu = el.querySelector<NewApp>('test-new-analytics-app')!;
        old._analyticsEvent(['app', 'hold']);
        old._analyticsSearch('barcode', 'holds', 2);
        neu.analyticsEvent(['app', 'go']);
        neu.analyticsSearch('q');
        expect(seen).to.deep.equal([
          'uvalib-analytics-event',
          'uvalib-analytics-search',
          'site-analytics-event',
          'site-analytics-search',
        ]);
        expect(commands('trackEvent')).to.deep.equal([
          ['trackEvent', 'app', 'hold'],
          ['trackEvent', 'app', 'go'],
        ]);
        expect(commands('trackSiteSearch')).to.deep.equal([
          ['trackSiteSearch', 'barcode', 'holds', 2],
          ['trackSiteSearch', 'q', false, false],
        ]);
      } finally {
        for (const t of [
          'uvalib-analytics-event',
          'uvalib-analytics-search',
          'site-analytics-event',
          'site-analytics-search',
        ])
          document.removeEventListener(t, log);
      }
    });
  });
});
