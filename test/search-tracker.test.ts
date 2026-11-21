// createSearchTracker (issue #18): one Matomo site search per search the visitor settles on.
// A short debounce keeps the tests quick; the timing rules are the same at the default 1 s.
import { expect, fixture, html } from '@open-wc/testing';
import { createSearchTracker } from '../src/analytics.js';
import { createSearchTracker as fromBase } from '../src/base.js';
import { recordAnalytics } from './helpers/analytics.js';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DEBOUNCE = 40;

describe('createSearchTracker', () => {
  let rec: ReturnType<typeof recordAnalytics>;
  const searches = () => rec.of('uvalib-analytics-search');
  beforeEach(() => {
    rec = recordAnalytics();
  });
  afterEach(() => {
    rec.restore();
    delete document.documentElement.dataset.uvalibAnalytics;
  });

  it('is exported from base.js and analytics.js', () => {
    expect(fromBase).to.equal(createSearchTracker);
  });

  it('typed: sends once the query has stayed the same for the debounce', async () => {
    const t = createSearchTracker({ debounce: DEBOUNCE });
    t.typed({ query: 'v', count: 90, category: 'Keyword' });
    await wait(DEBOUNCE / 2);
    t.typed({ query: 'vi', count: 40, category: 'Keyword' });
    await wait(DEBOUNCE / 2);
    t.typed({ query: 'vir', count: 12, category: 'Keyword' });
    expect(searches()).to.deep.equal([]);
    await wait(DEBOUNCE * 2);
    expect(searches()).to.deep.equal([
      { searchQuery: 'vir', searchCategory: 'Keyword', resultCount: 12 },
    ]);
  });

  it('defaults to a 1 s debounce', async () => {
    const t = createSearchTracker();
    t.typed({ query: 'virginia', count: 3 });
    await wait(300);
    expect(searches()).to.deep.equal([]);
    t.cancel();
  });

  it('settled: sends at once, and drops a typed search still waiting', async () => {
    const t = createSearchTracker({ debounce: DEBOUNCE });
    t.typed({ query: 'board', count: 5 });
    t.settled({ query: 'board of visitors', count: 0, category: 'Meaning' });
    expect(searches()).to.deep.equal([
      { searchQuery: 'board of visitors', searchCategory: 'Meaning', resultCount: 0 },
    ]);
    await wait(DEBOUNCE * 2);
    expect(searches()).to.have.length(1);
  });

  it('a count of 0 is sent; an unknown or invalid count is left out', () => {
    const t = createSearchTracker();
    t.settled({ query: 'a', count: 0 });
    t.settled({ query: 'b' });
    t.settled({ query: 'c', count: NaN });
    t.settled({ query: 'd', count: -1 });
    expect(searches().map((s) => s.resultCount)).to.deep.equal([
      0,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('never twice in a row for the same key (Enter again, a re-render)', async () => {
    const t = createSearchTracker({ debounce: DEBOUNCE });
    t.settled({ query: 'rotunda', count: 4, category: 'Keyword' });
    t.settled({ query: ' rotunda ', count: 4, category: 'Keyword' });
    t.typed({ query: 'rotunda', count: 4, category: 'Keyword' });
    await wait(DEBOUNCE * 2);
    expect(searches()).to.have.length(1);
    // Another category or key is another search; going back to the first counts again.
    t.settled({ query: 'rotunda', count: 2, category: 'Meaning' });
    t.settled({ query: 'rotunda', count: 1, category: 'Meaning', key: '["rotunda","1990s"]' });
    t.settled({ query: 'rotunda', count: 4, category: 'Keyword' });
    expect(searches().map((s) => s.searchCategory)).to.deep.equal([
      'Keyword',
      'Meaning',
      'Meaning',
      'Keyword',
    ]);
  });

  it('restored: a search from the URL or Back/Forward is not sent, nor the same one again', () => {
    const t = createSearchTracker();
    t.restored({ query: 'tuition', count: 7 });
    t.settled({ query: 'tuition', count: 7 });
    expect(searches()).to.deep.equal([]);
    t.settled({ query: 'tuition fees', count: 2 });
    expect(searches()).to.have.length(1);
  });

  it('cancel (a clear or an error) drops the waiting search; reset makes the same one count', async () => {
    const t = createSearchTracker({ debounce: DEBOUNCE });
    t.settled({ query: 'library', count: 9 });
    t.typed({ query: 'library hours', count: 1 });
    t.cancel();
    await wait(DEBOUNCE * 2);
    expect(searches()).to.have.length(1);
    t.settled({ query: 'library', count: 9 });
    expect(searches()).to.have.length(1);
    t.reset();
    t.settled({ query: 'library', count: 9 });
    expect(searches()).to.have.length(2);
  });

  it('an empty query is never sent, and typing one cancels the waiting search', async () => {
    const t = createSearchTracker({ debounce: DEBOUNCE });
    t.typed({ query: 'x', count: 1 });
    t.typed({ query: '  ', count: 0 });
    t.settled({ query: '', count: 0 });
    await wait(DEBOUNCE * 2);
    expect(searches()).to.deep.equal([]);
  });

  it('reports from `element`, so a no-analytics ancestor silences it', async () => {
    const el = await fixture<HTMLElement>(html`<div no-analytics><input /></div>`);
    createSearchTracker({ element: el.firstElementChild! }).settled({ query: 'q', count: 1 });
    expect(searches()).to.deep.equal([]);
    el.removeAttribute('no-analytics');
    createSearchTracker({ element: el.firstElementChild! }).settled({ query: 'q', count: 1 });
    expect(searches()).to.have.length(1);
  });

  it('follows the page opt-out', () => {
    document.documentElement.dataset.uvalibAnalytics = 'off';
    createSearchTracker().settled({ query: 'q', count: 1 });
    expect(searches()).to.deep.equal([]);
  });

  it('sends the query only as the site-search keyword, never as an event', () => {
    createSearchTracker().settled({ query: 'secret', count: 1, category: 'Keyword' });
    expect(rec.of('uvalib-analytics-event')).to.deep.equal([]);
  });
});
