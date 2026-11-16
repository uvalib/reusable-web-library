import { expect } from '@open-wc/testing';
import {
  SIGN_IN_TITLE,
  bentoEndpoints,
  bentoTiming,
  formatPublished,
  guestToken,
  guidesSearchUrl,
  parseGuides,
  parseVirgo,
  parseWebsite,
  searchGuides,
  searchVirgo,
  searchWebsite,
  textRuns,
  virgoBody,
  virgoSearchUrl,
  websiteParams,
  websiteSearchUrl,
} from '../src/components/bento-box/bento-data.js';
import { fetchJson, HttpError } from '../src/data/fetch-json.js';
import { holdFetches, recordFetches } from './helpers/hours.js';
import { resetBento, useBentoHost } from './helpers/bento.js';

const fixture = async (name: string) =>
  (await fetch(`/test/fixtures/bento/${name}`)).json() as Promise<unknown>;

describe('bento data', () => {
  beforeEach(resetBento);
  after(resetBento);

  describe('fetchJson', () => {
    it('takes a RequestInit and stops at once when its signal aborts', async () => {
      const controller = new AbortController();
      const p = fetchJson(
        'https://bento-hang.test/api/search',
        { retries: 3, retryDelay: 1, timeout: 5000 },
        { method: 'POST', body: '{}', signal: controller.signal },
      );
      controller.abort(new DOMException('gone', 'AbortError'));
      const e = await p.catch((x: unknown) => x);
      expect((e as DOMException).name).to.equal('AbortError');
    });

    it('throws an HttpError and retries a status only when retryStatus allows', async () => {
      const rec = recordFetches();
      try {
        const e = await fetchJson(
          'https://pool-eds-ws.internal.lib.virginia.edu/api/search',
          { retries: 3, retryDelay: 1, timeout: 5000 },
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong' },
            body: virgoBody('test', 1),
            retryStatus: (s) => s >= 500,
          },
        ).catch((x: unknown) => x);
        expect(e).to.be.instanceOf(HttpError);
        expect((e as HttpError).status).to.equal(401);
        expect(rec.urls).to.have.length(1);
      } finally {
        rec.restore();
      }
    });
  });

  describe('Virgo', () => {
    it('groups: the first record of each group, with its edition count', async () => {
      const { items, total } = parseVirgo(await fixture('virgo-catalog.json'), 'catalog');
      expect(total).to.equal(138420);
      expect(items.map((i) => [i.title, i.editions])).to.deep.equal([
        ['DB Test 11/7/25', 1],
        ['Test Anxiety: The State of the Art', 3],
        ['Differential Item Functioning', 2],
        ['Test Success in the Brain-compatible Classroom (2nd ed.)', 1],
      ]);
      const [first, second] = items;
      expect(first!.url).to.equal(
        'https://search.lib.virginia.edu/sources/uva_library/items/dataset_120880',
      );
      expect(first!.authors).to.deep.equal(['Author, Example A']);
      expect(first!.published).to.equal('2026-07-28');
      expect(first!.formats).to.deep.equal(['Computer Resource', 'Online', 'Dataset']);
      expect(second!.published).to.equal('1998');
      expect(second!.url).to.equal(
        'https://search.lib.virginia.edu/sources/uva_library/items/u8992136',
      );
    });

    it('articles: the sign-in record keeps its link with a neutral title; pub_type is the format', async () => {
      const { items, total } = parseVirgo(await fixture('virgo-articles.json'), 'articles');
      expect(total).to.equal(17262260);
      expect(items[0]!.title).to.equal(SIGN_IN_TITLE);
      expect(items[0]!.signIn).to.equal(true);
      expect(items[0]!.url).to.equal(
        'https://search.lib.virginia.edu/sources/articles/items/ccm_197059126',
      );
      expect(items[0]!.formats).to.deep.equal(['Academic Journal']);
      expect(items[1]!.signIn).to.equal(false);
      expect(items[1]!.authors).to.have.length(4);
    });

    it('truncates authors after five and skips records without a title or id', () => {
      const field = (type: string, value: string) => ({ type, name: type, value });
      const { items } = parseVirgo(
        {
          pagination: { total: 2 },
          group_list: [
            {
              count: 1,
              record_list: [
                {
                  fields: [
                    field('title', 'Many authors'),
                    field('identifier', 'a b/c'),
                    ...[1, 2, 3, 4, 5, 6, 7].map((n) => field('author', `A${n}`)),
                  ],
                },
              ],
            },
            { count: 1, record_list: [{ fields: [field('title', 'No id')] }] },
            { count: 1, record_list: [] },
            null,
          ],
        },
        'catalog',
      );
      expect(items).to.have.length(1);
      expect(items[0]!.authors).to.deep.equal(['A1', 'A2', 'A3', 'A4', 'A5', 'and 2 more']);
      expect(items[0]!.url).to.match(/\/items\/a%20b%2Fc$/);
    });

    it('formats published dates as calendar dates', () => {
      expect(formatPublished('1998')).to.equal('1998');
      expect(formatPublished('2026-07-28')).to.equal('Jul 28, 2026');
      expect(formatPublished('2026-01-01')).to.equal('Jan 1, 2026');
      expect(formatPublished('2026-12-31')).to.equal('Dec 31, 2026');
      expect(formatPublished('2026-07')).to.equal('Jul 2026');
      expect(formatPublished('2026-02-30')).to.equal('2026-02-30');
      expect(formatPublished('c1998')).to.equal('c1998');
    });

    it('sends the bento search body with a Bearer token, rows = limit', async () => {
      const rec = recordFetches();
      try {
        const { items } = await searchVirgo('catalog', 'test', 2);
        expect(items).to.have.length(2);
        expect(rec.urls).to.deep.equal([
          'https://search.lib.virginia.edu/authorize',
          'https://pool-solr-ws-uva-library.internal.lib.virginia.edu/api/search',
        ]);
        expect(JSON.parse(virgoBody('a & b', 3))).to.deep.equal({
          query: 'keyword: {a & b}',
          pagination: { start: 0, rows: 3 },
          sort: { sort_id: 'SortRelevance', order: 'desc' },
          filters: [{ pool_id: 'uva_library', facets: [] }],
        });
      } finally {
        rec.restore();
      }
    });

    it('fetches the guest token once for every search on the page', async () => {
      const rec = recordFetches();
      try {
        await Promise.all([
          searchVirgo('catalog', 'test', 3),
          searchVirgo('articles', 'test', 3),
          searchVirgo('catalog', 'other', 3),
        ]);
        await searchVirgo('articles', 'more', 3);
        expect(rec.urls.filter((u) => u.endsWith('/authorize'))).to.have.length(1);
      } finally {
        rec.restore();
      }
    });

    it('refetches the token once after a 401', async () => {
      useBentoHost('bento-stale.test', ['authorize']);
      expect(await guestToken()).to.equal('stale-guest-token');
      bentoEndpoints.authorize = 'https://search.lib.virginia.edu/authorize';
      const rec = recordFetches();
      try {
        const { items } = await searchVirgo('catalog', 'test', 1);
        expect(items).to.have.length(1);
        expect(rec.urls.map((u) => new URL(u).pathname)).to.deep.equal([
          '/api/search',
          '/authorize',
          '/api/search',
        ]);
      } finally {
        rec.restore();
      }
    });

    it('a 401 with a fresh token fails without looping', async () => {
      useBentoHost('bento-stale.test', ['authorize']);
      const rec = recordFetches();
      try {
        const e = await searchVirgo('catalog', 'test', 1).catch((x: unknown) => x);
        expect((e as HttpError).status).to.equal(401);
        expect(rec.urls.filter((u) => u.endsWith('/api/search'))).to.have.length(2);
      } finally {
        rec.restore();
      }
    });

    it('caches identical searches and forgets failures', async () => {
      const rec = recordFetches();
      try {
        await searchVirgo('catalog', 'test', 3);
        await searchVirgo('catalog', 'test', 3);
        expect(rec.urls.filter((u) => u.includes('/api/search'))).to.have.length(1);
        useBentoHost('bento-fail.test', ['articles']);
        bentoTiming.retries = 1;
        const fail = () => searchVirgo('articles', 'test', 3).catch((e: unknown) => e);
        expect(await fail()).to.be.instanceOf(Error);
        const n = rec.urls.length;
        expect(await fail()).to.be.instanceOf(Error);
        expect(rec.urls.length, 'the failure was not cached').to.equal(n + 1);
      } finally {
        rec.restore();
      }
    });

    it('aborts the shared fetch once every caller has aborted', async () => {
      const hold = holdFetches((u) => u.includes('/api/search'));
      try {
        const a = new AbortController();
        const b = new AbortController();
        const pa = searchVirgo('catalog', 'test', 3, a.signal).catch((e: unknown) => e);
        const pb = searchVirgo('catalog', 'test', 3, b.signal);
        a.abort(new DOMException('a', 'AbortError'));
        expect(((await pa) as DOMException).name).to.equal('AbortError');
        // b still waits, and gets the answer.
        await new Promise((r) => setTimeout(r, 50));
        hold.release();
        const { items } = await pb;
        expect(items).to.have.length(3);
      } finally {
        hold.release();
        hold.restore();
      }
    });

    it('see-all URLs encode the query', () => {
      expect(virgoSearchUrl('catalog', 'a&b #c+d')).to.equal(
        'https://search.lib.virginia.edu/?q=a%26b+%23c%2Bd&pool=uva_library',
      );
      const articles = new URL(virgoSearchUrl('articles', 'a&b #c+d'));
      expect(articles.searchParams.get('q')).to.equal('keyword: {a&b #c+d}');
      expect(articles.searchParams.get('pool')).to.equal('articles');
    });
  });

  describe('LibGuides', () => {
    it('reduces the proxy HTML to plain text and URLs', async () => {
      const { items, seeAll } = parseGuides(await fixture('libguides-proxy.json'));
      expect(seeAll).to.equal('https://guides.lib.virginia.edu/srch.php?default_lg=1&q=test');
      expect(items).to.have.length(3);
      expect(items[0]).to.deep.equal({
        title: 'Locate test instruments',
        url: 'https://guides.lib.virginia.edu/c.php?g=525427&p=11082160',
        guide: { text: 'Special Education', url: 'https://guides.lib.virginia.edu/sped' },
        author: {
          text: 'Example Librarian',
          url: 'https://guides.lib.virginia.edu/prf.php?id=00000000-0000-0000-0000-000000000000',
        },
        subjects: [
          {
            text: 'Education and Human Development',
            url: 'https://guides.lib.virginia.edu/educationHomepage',
          },
        ],
        highlights: [
          { text: 'Locate ' },
          { text: 'test', mark: true },
          {
            text: ' instruments Mental Measurements Yearbook Information about and reviews of all English-language',
          },
        ],
      });
      expect(items[2]!.title).to.equal('The CRAAP Test');
      expect(items[2]!.subjects).to.deep.equal([]);
    });

    it('drops javascript: links and keeps markup as text', () => {
      const { items } = parseGuides({
        data: {
          results: `<div class="s-srch-result"><div class="s-srch-result-title"><a href="https://guides.lib.virginia.edu/x">&lt;b&gt;Bold&lt;/b&gt; <img src=x onerror="window.__bentoXss=1">guide</a>
            <span class="s-srch-result-guide"><a href="javascript:alert(1)">Evil</a></span></div>
            <div class="s-srch-result-meta"></div><div class="s-srch-result-meta"><div class="s-srch-result-highlights"><script>window.__bentoXss=1</script>Hi <mark>there</mark></div></div></div>`,
          fulllink: 'javascript:alert(1)',
        },
      });
      expect(items[0]!.title).to.equal('<b>Bold</b> guide');
      expect(items[0]!.guide).to.equal(undefined);
      expect(items[0]!.highlights).to.deep.equal([{ text: 'Hi ' }, { text: 'there', mark: true }]);
      expect((window as { __bentoXss?: number }).__bentoXss).to.equal(undefined);
    });

    it('asks the us-east-1 proxy with q encoded, and slices to limit', async () => {
      const rec = recordFetches();
      try {
        const { items } = await searchGuides('a&b #c+d', 2);
        expect(items).to.have.length(2);
        expect(rec.urls[0]).to.equal(
          'https://qmo3jwybkg.execute-api.us-east-1.amazonaws.com/production/library/libguides-proxy?q=a%26b+%23c%2Bd',
        );
      } finally {
        rec.restore();
      }
      expect(guidesSearchUrl('a&b')).to.equal(
        'https://guides.lib.virginia.edu/srch.php?default_lg=1&q=a%26b',
      );
    });
  });

  describe('website', () => {
    it('reduces JSON:API results to titles, https links and marked excerpts', async () => {
      const { items, total } = parseWebsite(await fixture('drupal-search.json'));
      expect(total).to.equal(16);
      expect(items.map((i) => [i.title, i.url])).to.deep.equal([
        ['Printing & Photocopying', 'https://library.virginia.edu/services/printing-photocopying'],
        [
          '“Stolen books,” bad faith, and fair use',
          'https://library.virginia.edu/news/2024/stolen-books-bad-faith-and-fair-use',
        ],
        [
          'Library website offers new pathways to services',
          'https://library.virginia.edu/news/2023/library-website-offers-new-pathways-services',
        ],
      ]);
      expect(items[1]!.excerpt).to.deep.equal([
        { text: '… use. Some AI technologies are sure to pass the fair use ' },
        { text: 'test', mark: true },
        { text: ' from those cases, all else equal. But there is one …' },
      ]);
    });

    it('keeps hostile titles and excerpts as text; people fall back to their job title', () => {
      const { items } = parseWebsite({
        data: [
          {
            type: 'node--page',
            attributes: {
              drupal_internal__nid: 1,
              title: '<script>x</script> Page',
              path: { alias: '/p' },
            },
          },
          {
            type: 'node--person',
            attributes: {
              drupal_internal__nid: 2,
              title: 'A Person',
              path: { alias: '/staff/a' },
              field_uva_ldap_title: ['Librarian'],
            },
          },
          {
            type: 'node--page',
            attributes: {
              drupal_internal__nid: 3,
              title: 'Off site',
              path: { alias: '//evil.test/x' },
            },
          },
        ],
        meta: {
          count: 3,
          extra_data: {
            1: {
              excerpt: '<img src=x onerror="window.__bentoXss=1"><strong>hit</strong> &amp; more',
            },
          },
        },
      });
      expect(items.map((i) => i.title)).to.deep.equal(['<script>x</script> Page', 'A Person']);
      expect(items[0]!.excerpt).to.deep.equal([{ text: 'hit', mark: true }, { text: ' & more' }]);
      expect(items[1]!.excerpt).to.deep.equal([{ text: 'Librarian' }]);
      expect((window as { __bentoXss?: number }).__bentoXss).to.equal(undefined);
    });

    it('queries the index with the types group, encoded', async () => {
      const p = websiteParams('a&b #c+d', 3);
      expect(p.get('filter[fulltext]')).to.equal('a&b #c+d');
      expect(p.toString()).to.include('filter%5Bfulltext%5D=a%26b+%23c%2Bd');
      const rec = recordFetches();
      try {
        const { items } = await searchWebsite('test', 2);
        expect(items).to.have.length(2);
        expect(new URL(rec.urls[0]!, location.href).pathname).to.equal(
          '/jsonapi/index/default_index',
        );
      } finally {
        rec.restore();
      }
      expect(websiteSearchUrl('a&b')).to.equal(
        'https://library.virginia.edu/search/content?search_api_fulltext=a%26b',
      );
    });
  });

  it('textRuns merges adjacent runs and collapses whitespace', () => {
    const doc = new DOMParser().parseFromString(
      '<p>  a <b>b</b>\n <mark>c</mark><mark> d</mark> </p>',
      'text/html',
    );
    expect(textRuns(doc.querySelector('p')!, 'mark')).to.deep.equal([
      { text: 'a b ' },
      { text: 'c d', mark: true },
    ]);
  });

  it('reads window.uvalibBentoEndpoints at the first fetch', async () => {
    window.uvalibBentoEndpoints = {
      catalog: 'https://bento-empty.test/api/search',
      nope: 1,
    } as never;
    const { items, total } = await searchVirgo('catalog', 'test', 3);
    expect(items).to.deep.equal([]);
    expect(total).to.equal(0);
    expect(bentoEndpoints.catalog).to.equal('https://bento-empty.test/api/search');
  });
});
