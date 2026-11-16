import { expect } from '@open-wc/testing';
import {
  eventWhen,
  eventsEndpoints,
  eventsTiming,
  eventsUrl,
  loadEvents,
  parseEvents,
  upcoming,
  type EventItem,
} from '../src/components/events-section/events-data.js';
import { recordFetches, setClock } from './helpers/hours.js';
import { resetEvents, useEventsHost } from './helpers/events.js';

const ev = (start: string, end: string, extra: Partial<EventItem> = {}): EventItem => ({
  title: 'An event',
  url: 'https://cal.lib.virginia.edu/event/1',
  start: Date.parse(start),
  end: Date.parse(end),
  allDay: false,
  ...extra,
});

const raw = (over: Record<string, unknown> = {}) => ({
  id: 1,
  title: 'Workshop',
  allday: false,
  start: '2026-11-16T11:00:00-05:00',
  end: '2026-11-16T12:00:00-05:00',
  url: { public: 'https://cal.lib.virginia.edu/event/1' },
  description: '<p>x</p>',
  owner: { name: 'Someone', email: 'someone@example.edu' },
  ...over,
});

describe('events data', () => {
  beforeEach(resetEvents);
  after(resetEvents);

  describe('eventsUrl', () => {
    it('asks LibCal 1.0 for 30 days of calendar 4299, ten more than the limit', () => {
      const url = new URL(eventsUrl({ limit: 8 }));
      expect(url.origin + url.pathname).to.equal('https://cal.lib.virginia.edu/api/1.0/events');
      const p = url.searchParams;
      expect(p.get('key')).to.equal('c45a1428103ed000ba4025e9970edf54');
      expect(p.get('iid')).to.equal('863');
      expect(p.get('cal_id')).to.equal('4299');
      expect(p.get('days')).to.equal('30');
      expect(p.get('limit')).to.equal('18');
      expect(p.has('category')).to.equal(false);
      expect(p.has('search')).to.equal(false);
      const names = [...p.keys()];
      expect(names.length).to.equal(new Set(names).size);
    });

    it('caps the fetch at 100 and needs at least one event', () => {
      expect(new URL(eventsUrl({ limit: 95 })).searchParams.get('limit')).to.equal('100');
      expect(new URL(eventsUrl({ limit: 0 })).searchParams.get('limit')).to.equal('11');
    });

    it('adds the category, encoded', () => {
      expect(
        new URL(eventsUrl({ limit: 6, category: '51597' })).searchParams.get('category'),
      ).to.equal('51597');
      expect(eventsUrl({ limit: 6, category: '1,2' })).to.include('&category=1,2');
      expect(eventsUrl({ limit: 6, category: 'a&b=c' })).to.include('&category=a%26b%3Dc');
    });

    it('uses event_search with an encodeURIComponent search for a query', () => {
      const s = eventsUrl({ limit: 8, query: 'R & D/3D? yes' });
      const url = new URL(s);
      expect(url.pathname).to.equal('/api/1.0/event_search');
      expect(s).to.include('&search=R%20%26%20D%2F3D%3F%20yes');
      expect(url.searchParams.get('search')).to.equal('R & D/3D? yes');
      expect(url.searchParams.get('cal_id')).to.equal('4299');
    });

    it('never sends a parameter twice, even when an override already has it', () => {
      eventsEndpoints.events =
        'https://events-empty.test/api/1.0/events?key=k&limit=3&iid=863&category=9&search=x';
      const url = new URL(eventsUrl({ limit: 2, category: '7' }));
      const names = [...url.searchParams.keys()];
      expect(names.length).to.equal(new Set(names).size);
      expect(url.searchParams.get('limit')).to.equal('12');
      expect(url.searchParams.get('category')).to.equal('7');
      expect(url.searchParams.has('search')).to.equal(false);
    });

    it('keeps an override URL whole when it has a second ?', () => {
      eventsEndpoints.events = 'https://events-empty.test/api/1.0/events?key=k&next=/a?b=1';
      expect(eventsUrl({ limit: 1 })).to.equal(
        'https://events-empty.test/api/1.0/events?key=k&next=/a?b=1&limit=11',
      );
    });

    it('reads window.uvalibEventsEndpoints at the first fetch', () => {
      window.uvalibEventsEndpoints = { events: 'https://events-empty.test/api/1.0/events?key=w' };
      expect(eventsUrl({ limit: 1 })).to.match(
        /^https:\/\/events-empty\.test\/api\/1\.0\/events\?/,
      );
    });
  });

  describe('parseEvents', () => {
    it('keeps only the title, public URL, start, end and all-day flag', () => {
      const [e] = parseEvents({ events: [raw()] });
      expect(e).to.deep.equal({
        title: 'Workshop',
        url: 'https://cal.lib.virginia.edu/event/1',
        start: Date.parse('2026-11-16T16:00:00Z'),
        end: Date.parse('2026-11-16T17:00:00Z'),
        allDay: false,
      });
      expect(parseEvents({ events: [raw({ allday: true })] })[0]!.allDay).to.equal(true);
    });

    it('skips malformed events instead of failing the list', () => {
      const events = parseEvents({
        events: [
          null,
          'x',
          raw({ title: '' }),
          raw({ title: 3 }),
          raw({ url: null }),
          raw({ url: { public: 'javascript:alert(1)' } }),
          raw({ start: undefined }),
          raw({ end: '' }),
          raw({ start: 'not a date' }),
          raw({ end: '2026-11-16T10:00:00-05:00' }), // ends before it starts
          raw({ title: 'Kept' }),
        ],
      });
      expect(events.map((e) => e.title)).to.deep.equal(['Kept']);
    });

    it('returns nothing for a response without an events array', () => {
      expect(parseEvents(null)).to.deep.equal([]);
      expect(parseEvents({})).to.deep.equal([]);
      expect(parseEvents({ events: {} })).to.deep.equal([]);
      expect(parseEvents([])).to.deep.equal([]);
    });
  });

  describe('upcoming', () => {
    const list = [
      ev('2026-11-16T09:00:00-05:00', '2026-11-16T10:00:00-05:00', { title: 'ended' }),
      ev('2026-11-16T09:00:00-05:00', '2026-11-16T12:00:00-05:00', { title: 'running' }),
      ev('2026-11-17T09:00:00-05:00', '2026-11-17T10:00:00-05:00', { title: 'b' }),
      ev('2026-11-16T13:00:00-05:00', '2026-11-16T14:00:00-05:00', { title: 'a' }),
    ];
    const now = Date.parse('2026-11-16T11:00:00-05:00');

    it('drops events that have ended, keeps running ones, sorts by start, then limits', () => {
      expect(upcoming(list, 10, now).map((e) => e.title)).to.deep.equal(['running', 'a', 'b']);
      expect(upcoming(list, 2, now).map((e) => e.title)).to.deep.equal(['running', 'a']);
    });

    it('keeps an event ending right now out', () => {
      expect(
        upcoming(list, 10, Date.parse('2026-11-16T12:00:00-05:00')).map((e) => e.title),
      ).to.not.include('running');
    });
  });

  describe('eventWhen (America/New_York)', () => {
    it('gives the date column and the time line', () => {
      expect(eventWhen(ev('2026-11-16T11:00:00-05:00', '2026-11-16T12:00:00-05:00'))).to.deep.equal(
        {
          datetime: '2026-11-16',
          month: 'Nov',
          day: '16',
          weekday: 'Mon',
          fullDate: 'Monday, November 16',
          time: '11:00 AM - 12:00 PM EST',
        },
      );
    });

    it('uses the New York date for an evening event that is already tomorrow in UTC', () => {
      const w = eventWhen(ev('2026-11-23T20:30:00-05:00', '2026-11-23T21:30:00-05:00'));
      expect([w.datetime, w.month, w.day, w.weekday]).to.deep.equal([
        '2026-11-23',
        'Nov',
        '23',
        'Mon',
      ]);
      expect(w.time).to.equal('8:30 PM - 9:30 PM EST');
    });

    it('says EDT for an event in daylight saving time', () => {
      const w = eventWhen(ev('2027-03-15T10:00:00-04:00', '2027-03-15T11:00:00-04:00'));
      expect(w.fullDate).to.equal('Monday, March 15');
      expect(w.time).to.equal('10:00 AM - 11:00 AM EDT');
    });

    it('says "All day" for an all-day event', () => {
      const w = eventWhen(
        ev('2026-11-20T00:00:00-05:00', '2026-11-20T23:59:00-05:00', { allDay: true }),
      );
      expect(w.time).to.equal('All day');
      expect(w.fullDate).to.equal('Friday, November 20');
    });

    it('gives a multi-day event its start date and a time range with the end date', () => {
      const w = eventWhen(ev('2026-11-20T09:00:00-05:00', '2026-11-21T17:00:00-05:00'));
      expect([w.month, w.day, w.weekday]).to.deep.equal(['Nov', '20', 'Fri']);
      expect(w.time).to.equal('Nov 20, 9:00 AM - Nov 21, 5:00 PM EST');
      const overnight = eventWhen(ev('2026-11-23T19:00:00-05:00', '2026-11-24T01:00:00-05:00'));
      expect(overnight.time).to.equal('Nov 23, 7:00 PM - Nov 24, 1:00 AM EST');
      const allDays = eventWhen(
        ev('2026-11-20T00:00:00-05:00', '2026-11-22T23:59:00-05:00', { allDay: true }),
      );
      expect(allDays.time).to.equal('Nov 20 - Nov 22, all day');
    });

    it('uses plain spaces (no narrow no-break spaces from Intl)', () => {
      const { time } = eventWhen(ev('2026-11-16T11:00:00-05:00', '2026-11-16T12:00:00-05:00'));
      expect(/[  ]/.test(time)).to.equal(false);
    });
  });

  describe('loadEvents', () => {
    before(() => setClock('2026-11-16T14:00:00Z'));

    it('parses the LibCal response', async () => {
      const events = await loadEvents({ limit: 8 });
      expect(events.length).to.be.greaterThan(8);
      expect(events[0]!.title).to.equal('3D Printing Training');
    });

    it('shares one fetch between identical requests', async () => {
      const rec = recordFetches();
      try {
        const [a, b] = await Promise.all([loadEvents({ limit: 8 }), loadEvents({ limit: 8 })]);
        expect(a).to.equal(b);
        await loadEvents({ limit: 8 });
        expect(rec.urls).to.have.length(1);
        await loadEvents({ limit: 8, category: '38740' });
        expect(rec.urls).to.have.length(2);
      } finally {
        rec.restore();
      }
    });

    it('fetches again once the cached answer is older than maxAge', async () => {
      const rec = recordFetches();
      try {
        await loadEvents({ limit: 3 });
        await loadEvents({ limit: 3 }, 60_000);
        expect(rec.urls).to.have.length(1);
        await new Promise((r) => setTimeout(r, 20));
        await loadEvents({ limit: 3 }, 10);
        expect(rec.urls).to.have.length(2);
      } finally {
        rec.restore();
      }
    });

    it('does not cache a failure', async () => {
      eventsTiming.timeout = 50;
      eventsTiming.retries = 1;
      useEventsHost('events-hang.test');
      const rec = recordFetches();
      try {
        let failed = 0;
        await loadEvents({ limit: 1 }).catch(() => failed++);
        await loadEvents({ limit: 1 }).catch(() => failed++);
        expect(failed).to.equal(2);
        expect(rec.urls).to.have.length(2);
      } finally {
        rec.restore();
      }
    });

    it('retries a failed fetch', async () => {
      useEventsHost('events-fail.test');
      const rec = recordFetches();
      try {
        await loadEvents({ limit: 1 }).then(
          () => expect.fail('resolved'),
          () => {},
        );
        expect(rec.urls).to.have.length(eventsTiming.retries);
      } finally {
        rec.restore();
      }
    });
  });
});
