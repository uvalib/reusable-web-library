import { expect, fixture } from '@open-wc/testing';
import '../src/components/library-weekly-hours/library-weekly-hours.js';
import '../src/components/site-hours-section/site-hours-section.js';
import type { LibraryWeeklyHours } from '../src/components/library-weekly-hours/LibraryWeeklyHours.js';
import type { SiteHoursSection } from '../src/components/site-hours-section/SiteHoursSection.js';
import { recordFetches, resetHours, setClock, settled } from './helpers/hours.js';

// Runs twice, in wtr groups whose browser contexts use America/New_York and Asia/Tokyo (see
// web-test-runner.config.mjs). Whatever the browser's zone, "today" and the week are the
// library's: America/New_York.
const text = (n: Element | null | undefined) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();

interface Case {
  name: string;
  /** The instant, UTC. */
  at: string;
  /** Today in New York. */
  today: string;
  /** Long label of today's column. */
  todayLabel: string;
  heading: string;
  /** The week's Sunday. */
  sunday: string;
  /** The section's date line. */
  date: string;
  /** Clemons building hours today. */
  clemons: string;
}

const CASES: Case[] = [
  {
    name: '23:30 on a Saturday in New York (Sunday in UTC and Tokyo)',
    at: '2026-11-15T04:30:00Z',
    today: '2026-11-14',
    sunday: '2026-11-08',
    date: 'Saturday, November 14, 2026',
    todayLabel: 'Saturday, November 14',
    heading: 'Nov 08. 2026 - Nov 14. 2026',
    clemons: '9am - 12am',
  },
  {
    name: 'a Saturday evening (19:00, already Sunday in UTC)',
    at: '2026-11-15T00:00:00Z',
    today: '2026-11-14',
    sunday: '2026-11-08',
    date: 'Saturday, November 14, 2026',
    todayLabel: 'Saturday, November 14',
    heading: 'Nov 08. 2026 - Nov 14. 2026',
    clemons: '9am - 12am',
  },
  {
    name: 'the Sunday clocks go back (00:30 EDT, before the change)',
    at: '2026-11-01T04:30:00Z',
    today: '2026-11-01',
    sunday: '2026-11-01',
    date: 'Sunday, November 1, 2026',
    todayLabel: 'Sunday, November 1',
    heading: 'Nov 01. 2026 - Nov 07. 2026',
    clemons: '10am - 2am',
  },
  {
    name: 'the Saturday ending the week clocks went back (23:30 EST)',
    at: '2026-11-08T04:30:00Z',
    today: '2026-11-07',
    sunday: '2026-11-01',
    date: 'Saturday, November 7, 2026',
    todayLabel: 'Saturday, November 7',
    heading: 'Nov 01. 2026 - Nov 07. 2026',
    clemons: '9am - 12am',
  },
  {
    name: 'the Sunday clocks go forward (03:30 EDT, just after the change)',
    at: '2027-03-14T07:30:00Z',
    today: '2027-03-14',
    sunday: '2027-03-14',
    date: 'Sunday, March 14, 2027',
    todayLabel: 'Sunday, March 14',
    heading: 'Mar 14. 2027 - Mar 20. 2027',
    clemons: '10am - 2am',
  },
  {
    name: 'the Saturday before clocks go forward (23:30 EST)',
    at: '2027-03-14T04:30:00Z',
    today: '2027-03-13',
    sunday: '2027-03-07',
    date: 'Saturday, March 13, 2027',
    todayLabel: 'Saturday, March 13',
    heading: 'Mar 07. 2027 - Mar 13. 2027',
    clemons: '',
  },
];

describe(`library hours in ${Intl.DateTimeFormat().resolvedOptions().timeZone}`, () => {
  beforeEach(resetHours);
  after(resetHours);

  it('runs in New York or Tokyo', () => {
    expect(['America/New_York', 'Asia/Tokyo']).to.include(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
  });

  for (const c of CASES) {
    describe(c.name, () => {
      beforeEach(() => setClock(c.at));

      it('library-weekly-hours shows the New York week with today marked', async () => {
        const rec = recordFetches();
        try {
          const el = await fixture<LibraryWeeklyHours>(
            '<library-weekly-hours library-slug="clemons" no-shadow-dom></library-weekly-hours>',
          );
          await settled(el);
          expect(text(el.querySelector('[role=heading]'))).to.equal(c.heading);
          const today = el.querySelectorAll('thead th[aria-current=date]');
          expect(today).to.have.length(1);
          expect(today[0]!.getAttribute('aria-label')).to.equal(c.todayLabel);
          const cell = el.querySelector('[part=building-hours] td.today')!;
          expect(cell.getAttribute('aria-label')).to.equal(
            c.clemons ? `${c.todayLabel}: ${c.clemons}` : c.todayLabel,
          );
          const libcal = new URL(rec.urls.find((u) => u.includes('cal.lib.virginia.edu'))!);
          expect(libcal.searchParams.get('from')).to.equal(c.sunday);
        } finally {
          rec.restore();
        }
      });

      it('site-hours-section shows the New York date and its hours', async () => {
        const rec = recordFetches();
        try {
          const el = await fixture<SiteHoursSection>(
            '<site-hours-section limited no-shadow-dom no-style></site-hours-section>',
          );
          await settled(el);
          expect(text(el.querySelector('#homehoursdate'))).to.equal(c.date);
          const libcal = new URL(rec.urls.find((u) => u.includes('cal.lib.virginia.edu'))!);
          expect(libcal.searchParams.get('from')).to.equal(c.today);
          expect(libcal.searchParams.get('to')).to.equal(c.today);
          const clemons = [...el.querySelectorAll('dt')].find((dt) => text(dt) === 'Clemons')!;
          expect(text(clemons.nextElementSibling)).to.equal(
            c.clemons || 'Hours unavailable. See all hours',
          );
        } finally {
          rec.restore();
        }
      });
    });
  }
});
