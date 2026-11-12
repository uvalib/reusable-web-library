import { expect, fixture, html } from '@open-wc/testing';
import { findMatomoId } from '../src/data/sites.js';
import '../src/components/site-analytics/site-analytics.js';

describe('findMatomoId', () => {
  it('matches by url prefix', () => {
    expect(findMatomoId('https://avalon.lib.virginia.edu/media/1')).to.equal(42);
  });
  it('falls back to the matomoDefault site', () => {
    expect(findMatomoId('https://example.org/')).to.equal(23);
  });
});

describe('<site-analytics>', () => {
  const w = window as any;
  const realAppend = document.head.appendChild;
  let paq: any[];

  beforeEach(() => {
    paq = w._paq = [];
    // Never load the real matomo.js; a fake Matomo routes tracker calls into _paq.
    w.Matomo = {
      getTracker: () => ({
        trackSiteSearch: (...a: any[]) => paq.push(['trackSiteSearch', ...a]),
      }),
    };
    document.head.appendChild = function <T extends Node>(node: T): T {
      if ((node as unknown as HTMLElement).tagName === 'SCRIPT') return node;
      return realAppend.call(this, node) as T;
    };
  });
  afterEach(() => {
    document.head.appendChild = realAppend;
    delete w.Matomo;
    delete w._paq;
  });

  it('pushes setSiteId from matomoId attribute (case-insensitive)', async () => {
    await fixture(html`<site-analytics matomoId="5"></site-analytics>`);
    expect(paq).to.deep.include(['setSiteId', '5']);
  });

  it('tracks bubbling site-analytics-search events', async () => {
    const el = await fixture(html`<site-analytics matomoId="5"><span></span></site-analytics>`);
    el.querySelector('span')!.dispatchEvent(
      new CustomEvent('site-analytics-search', {
        detail: { searchQuery: 'q', resultCount: 3 },
        bubbles: true,
      }),
    );
    expect(paq.find((e) => e[0] === 'trackSiteSearch')).to.deep.equal([
      'trackSiteSearch',
      'q',
      undefined,
      '3',
    ]);
  });
});
