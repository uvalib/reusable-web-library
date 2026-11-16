import { expect, fixture, waitUntil } from '@open-wc/testing';
import '../src/components/bento-box/bento-box.js';
import type { CatalogSection } from '../src/components/bento-box/CatalogSection.js';
import { formatPublished } from '../src/components/bento-box/bento-data.js';
import { resetBento } from './helpers/bento.js';

// Runs twice, in wtr groups whose browser contexts use America/New_York and Asia/Tokyo (see
// web-test-runner.config.mjs). Virgo's published dates are calendar dates: no zone may shift
// them a day, and no month is off by one.
const text = (n: Element | null | undefined) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

describe(`bento-box dates in ${zone}`, () => {
  beforeEach(resetBento);
  after(resetBento);

  it('runs in a zone far from UTC', () => {
    expect(['America/New_York', 'Asia/Tokyo']).to.include(zone);
  });

  it('formats bare years, months and full dates without shifting them', () => {
    expect(formatPublished('1998')).to.equal('1998');
    expect(formatPublished('2026-01-01')).to.equal('Jan 1, 2026');
    expect(formatPublished('2026-07-28')).to.equal('Jul 28, 2026');
    expect(formatPublished('2026-12-31')).to.equal('Dec 31, 2026');
    expect(formatPublished('2026-07')).to.equal('Jul 2026');
  });

  it('shows the catalog dates as Virgo sends them', async () => {
    const el = await fixture<CatalogSection>(
      '<catalog-section no-shadow-dom no-style query="test" limit="4"></catalog-section>',
    );
    await waitUntil(() => el.state !== 'loading', 'still loading', { timeout: 4000 });
    await el.updateComplete;
    const dates = [...el.querySelectorAll('.bs-results--list--entry .bs-results--date time')];
    expect(dates.map((t) => [t.getAttribute('datetime'), text(t)])).to.deep.equal([
      ['2026-07-28', 'Jul 28, 2026'],
      ['1998', '1998'],
      ['1993', '1993'],
      ['2009', '2009'],
    ]);
  });
});
