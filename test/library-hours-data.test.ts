import { expect } from '@open-wc/testing';
import {
  addDays,
  formatDay,
  formatTime,
  fullDate,
  hoursEndpoints,
  loadHours,
  loadLibraries,
  longDate,
  parseLibraries,
  sanitizeHoursHtml,
  shortDate,
  shortWeekday,
  sortLibraries,
  todayInNewYork,
  weekHeadingDate,
  weekStart,
  type LibraryInfo,
} from '../src/components/library-hours/hours-data.js';
import { recordFetches, resetHours, useHoursHost } from './helpers/hours.js';

describe('library hours data', () => {
  beforeEach(resetHours);
  after(resetHours);

  describe('dates', () => {
    it('gives today in America/New_York, whatever the browser zone', () => {
      expect(todayInNewYork(Date.parse('2026-11-15T04:30:00Z'))).to.equal('2026-11-14'); // 23:30 EST
      expect(todayInNewYork(Date.parse('2026-11-15T05:00:00Z'))).to.equal('2026-11-15');
      expect(todayInNewYork(Date.parse('2026-07-01T03:59:00Z'))).to.equal('2026-06-30'); // 23:59 EDT
      expect(todayInNewYork(Date.parse('2026-07-01T04:00:00Z'))).to.equal('2026-07-01');
    });

    it('adds days across months, years and DST changes', () => {
      expect(addDays('2026-11-01', 6)).to.equal('2026-11-07');
      expect(addDays('2026-12-28', 7)).to.equal('2027-01-04');
      expect(addDays('2027-03-14', -7)).to.equal('2027-03-07');
      expect(addDays('2028-02-28', 1)).to.equal('2028-02-29');
    });

    it('starts weeks on Sunday', () => {
      expect(weekStart('2026-11-14')).to.equal('2026-11-08'); // Saturday
      expect(weekStart('2026-11-08')).to.equal('2026-11-08'); // Sunday
      expect(weekStart('2026-11-01')).to.equal('2026-11-01');
      expect(weekStart('2027-03-16')).to.equal('2027-03-14');
      expect(weekStart('2027-01-01')).to.equal('2026-12-27');
    });

    it('formats ISO dates without a time-zone shift', () => {
      expect(longDate('2026-11-09')).to.equal('Monday, November 9');
      expect(shortDate('2026-11-09')).to.equal('Nov 9');
      expect(shortWeekday('2026-11-09')).to.equal('Mon');
      expect(fullDate('2026-11-14')).to.equal('Saturday, November 14, 2026');
      // The live week heading format ("Nov 08. 2026"), kept for Drupal.
      expect(weekHeadingDate('2026-11-08')).to.equal('Nov 08. 2026');
      expect(weekHeadingDate('2027-01-02')).to.equal('Jan 02. 2027');
    });
  });

  describe('hours text', () => {
    it('drops :00 and keeps other minutes', () => {
      expect(formatTime('9:00am')).to.equal('9am');
      expect(formatTime('12:00am')).to.equal('12am');
      expect(formatTime('5:30PM')).to.equal('5:30pm');
      expect(formatTime('noon')).to.equal('noon');
    });

    it('formats a day: ranges, 24 hours, status text and nothing', () => {
      expect(formatDay({ status: 'open', hours: [{ from: '9:00am', to: '12:00am' }] })).to.equal(
        '9am - 12am',
      );
      expect(formatDay({ status: 'open', hours: [{ from: '10:00am', to: '2:00am' }] })).to.equal(
        '10am - 2am',
      );
      expect(
        formatDay({
          status: 'open',
          hours: [
            { from: '10:00am', to: '1:00pm' },
            { from: '4:00pm', to: '5:30pm' },
          ],
        }),
      ).to.equal('10am - 1pm, 4pm - 5:30pm');
      expect(formatDay({ status: '24hours' })).to.equal('24 Hours');
      expect(formatDay({ status: 'closed' })).to.equal('closed');
      expect(formatDay({ status: 'ByApp' })).to.equal('By Appt');
      expect(formatDay(undefined)).to.equal('');
    });
  });

  describe('libraries', () => {
    const raw = (attributes: Record<string, unknown>, parent?: string) => ({
      id: String(attributes.field_slug),
      attributes: { title: 'T', ...attributes },
      relationships: { field_parent: { data: parent ? { id: parent } : null } },
    });

    it('parses the JSON:API fields the components use', () => {
      const [lib, child, other] = parseLibraries({
        data: [
          raw({
            field_slug: 'clemons',
            title: 'Clemons Library',
            field_short_title: 'Clemons',
            field_libcal_id: '3638',
            field_type_basic: 'Library',
            field_priority_placement: 5,
            field_library_site_link: null,
            field_hours_information: null,
          }),
          raw(
            {
              field_slug: 'rmc',
              field_libcal_id: '4170',
              field_library_site_link: { uri: 'internal:/rmc/' },
            },
            'clemons',
          ),
          raw({
            field_slug: 'law',
            field_libcal_id: null,
            field_library_site_link: { uri: 'entity:node/807' },
            field_hours_information: { processed: '<p>See</p>' },
          }),
        ],
      });
      expect(lib).to.deep.include({
        id: 'clemons',
        title: 'Clemons Library',
        shortTitle: 'Clemons',
        slug: 'clemons',
        calId: 3638,
        placeType: 'Library',
        priorityPlacement: 5,
      });
      expect(lib!.siteLink).to.equal(undefined);
      expect(lib!.parent).to.equal(undefined);
      expect(child).to.deep.include({ calId: 4170, siteLink: '/rmc/', parent: 'clemons' });
      // As Library.ts does: only `internal:` is rewritten.
      expect(other).to.deep.include({
        siteLink: 'entity:node/807',
        hoursInformation: '<p>See</p>',
      });
      expect(other!.calId).to.equal(undefined);
    });

    it('sorts by priority placement (missing last), then title', () => {
      const libs = [
        { id: 'a', title: 'Zeta' },
        { id: 'b', title: 'Beta', priorityPlacement: 5 },
        { id: 'c', title: 'Alpha', priorityPlacement: 5 },
        { id: 'd', title: 'Chat', priorityPlacement: 1 },
        { id: 'e', title: 'Alpha' },
      ] as LibraryInfo[];
      expect(sortLibraries(libs).map((l) => l.id)).to.deep.equal(['d', 'c', 'b', 'e', 'a']);
      expect(libs[0]!.id).to.equal('a'); // not sorted in place
    });

    it('fetches the library list once however many callers', async () => {
      const rec = recordFetches();
      try {
        const [a, b] = await Promise.all([loadLibraries(), loadLibraries()]);
        const c = await loadLibraries();
        expect(a).to.equal(b);
        expect(c).to.equal(a);
        expect(a.length).to.equal(16);
        expect(rec.urls.filter((u) => u.includes('/jsonapi/'))).to.have.length(1);
        expect(rec.urls[0]).to.match(
          /\/jsonapi\/index\/default_index\?filter\[type\]=library&page\[limit\]=100$/,
        );
      } finally {
        rec.restore();
      }
    });

    it('retries a bounded number of times, then rejects and lets a later call retry', async () => {
      useHoursHost('hours-fail.test');
      const rec = recordFetches();
      try {
        await loadLibraries().then(
          () => expect.fail('resolved'),
          (e: Error) => expect(e).to.be.an('error'),
        );
        expect(rec.urls).to.have.length(3);
        hoursEndpoints.libraries =
          '/jsonapi/index/default_index?filter[type]=library&page[limit]=100';
        expect((await loadLibraries()).length).to.equal(16);
      } finally {
        rec.restore();
      }
    });
  });

  describe('LibCal hours', () => {
    it('requests the ids and range, keyed by calendar id', async () => {
      const rec = recordFetches();
      try {
        const hours = await loadHours([4170, 3638], '2026-11-08', '2026-11-14');
        expect(rec.urls).to.have.length(1);
        const url = new URL(rec.urls[0]!);
        expect(url.host).to.equal('cal.lib.virginia.edu');
        expect(url.pathname).to.equal('/api/1.0/hours/3638,4170');
        expect(url.searchParams.get('from')).to.equal('2026-11-08');
        expect(url.searchParams.get('to')).to.equal('2026-11-14');
        expect(url.searchParams.get('iid')).to.equal('863');
        expect(url.searchParams.get('key')).to.match(/^[0-9a-f]{32}$/);
        expect(hours.get(3638)!['2026-11-14']).to.deep.equal({
          status: 'open',
          hours: [{ from: '9:00am', to: '12:00am' }],
        });
        expect(Object.keys(hours.get(4170)!)).to.have.length(7);
      } finally {
        rec.restore();
      }
    });

    it('shares identical requests and refetches only when older than maxAge', async () => {
      const rec = recordFetches();
      try {
        const [a, b] = await Promise.all([
          loadHours([3638], '2026-11-14', '2026-11-14'),
          loadHours([3638], '2026-11-14', '2026-11-14'),
        ]);
        expect(a).to.equal(b);
        await loadHours([3638], '2026-11-14', '2026-11-14', 60_000);
        expect(rec.urls).to.have.length(1);
        await loadHours([3638], '2026-11-14', '2026-11-14', 0);
        expect(rec.urls).to.have.length(2);
        await loadHours([3638], '2026-11-15', '2026-11-15');
        expect(rec.urls).to.have.length(3);
      } finally {
        rec.restore();
      }
    });

    it('resolves to an empty map without a request when there are no ids', async () => {
      const rec = recordFetches();
      try {
        expect((await loadHours([], '2026-11-14', '2026-11-14')).size).to.equal(0);
        expect(rec.urls).to.have.length(0);
      } finally {
        rec.restore();
      }
    });

    it('rejects after the retries when LibCal fails', async () => {
      useHoursHost('hours-fail.test');
      const rec = recordFetches();
      try {
        await loadHours([3638], '2026-11-14', '2026-11-14').then(
          () => expect.fail('resolved'),
          (e: Error) => expect(e).to.be.an('error'),
        );
        expect(rec.urls).to.have.length(3);
      } finally {
        rec.restore();
      }
    });
  });

  describe('sanitizeHoursHtml', () => {
    const html = (input: string) => {
      const div = document.createElement('div');
      div.append(sanitizeHoursHtml(input));
      return div.innerHTML;
    };

    it('keeps the allowlist: a[href], p, br, strong, em', () => {
      expect(
        html(
          '<p>See:&nbsp;<a href="https://x.test/h" title="t">Hours</a><br><strong>s</strong><em>e</em></p>',
        ),
      ).to.equal(
        '<p>See:&nbsp;<a href="https://x.test/h">Hours</a><br><strong>s</strong><em>e</em></p>',
      );
    });

    it('drops scripts, handlers, styles and unsafe URLs; unwraps other elements', () => {
      expect(
        html(
          '<p onclick="x()" style="color:red">a<script>alert(1)</script><img src=x onerror=alert(1)>' +
            '<a href="javascript:alert(1)">j</a><span><b>kept</b></span><style>p{}</style></p>',
        ),
      ).to.equal('<p>a<a>j</a>kept</p>');
    });

    it('keeps relative, mailto and tel links', () => {
      expect(
        html('<a href="/hours">h</a><a href="mailto:a@b.c">m</a><a href="tel:1">t</a>'),
      ).to.equal('<a href="/hours">h</a><a href="mailto:a@b.c">m</a><a href="tel:1">t</a>');
    });
  });
});
