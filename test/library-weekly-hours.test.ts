import { expect, fixture, waitUntil } from '@open-wc/testing';
import '../src/components/library-weekly-hours/library-weekly-hours.js';
import type { LibraryWeeklyHours } from '../src/components/library-weekly-hours/LibraryWeeklyHours.js';
import { hoursEndpoints, hoursTiming } from '../src/components/library-hours/hours-data.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import {
  holdFetches,
  recordFetches,
  resetHours,
  setClock,
  settled,
  useHoursHost,
} from './helpers/hours.js';

// Saturday 14 November 2026, noon in Charlottesville.
const NOW = '2026-11-14T17:00:00Z';

const MODES = {
  shadow: '',
  'shadow no-style': 'no-style',
  // Before plain light mode: once the styled rules are in the document they also apply here.
  'light no-style': 'no-shadow-dom no-style',
  light: 'no-shadow-dom',
} as const;

const root = (el: LibraryWeeklyHours): ParentNode => el.shadowRoot ?? el;
const text = (n: Element | null | undefined) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();

async function make(attrs: string): Promise<LibraryWeeklyHours> {
  const el = await fixture<LibraryWeeklyHours>(
    `<library-weekly-hours ${attrs}></library-weekly-hours>`,
  );
  await settled(el);
  return el;
}

/** The text of a td without its mobile date block. */
const cellText = (td: Element) => {
  const clone = td.cloneNode(true) as Element;
  clone.querySelector('.date--mobile')?.remove();
  return text(clone);
};

describe('library-weekly-hours', () => {
  before(() => setClock(NOW));
  beforeEach(resetHours);
  after(resetHours);

  for (const [mode, attrs] of Object.entries(MODES)) {
    describe(mode, () => {
      it('renders the live DOM structure for a week', async () => {
        const el = await make(`library-slug="clemons" ${attrs}`);
        const r = root(el);
        expect(el.state).to.equal('ready');

        const header = r.querySelector('div.weekly-hours-header-section')!;
        const [prev, heading, next] = [...header.children];
        expect(prev!.matches('button.uvalib-button.uvalib-button--basic')).to.equal(true);
        expect(text(prev)).to.equal('Previous week');
        expect(heading!.matches('div.heading-h2[role=heading][aria-level="2"]')).to.equal(true);
        expect(text(heading)).to.equal('Nov 08. 2026 - Nov 14. 2026');
        expect(next!.matches('button.uvalib-button.uvalib-button--basic')).to.equal(true);
        expect(text(next)).to.equal('Next week');

        const table = r.querySelector('table.weekly-hours-body-section')!;
        const cols = [...table.querySelectorAll('colgroup > col')];
        expect(cols).to.have.length(9);
        expect(cols[0]!.className).to.equal('location-column');

        const ths = [...table.querySelectorAll('thead > tr > th')];
        expect(ths).to.have.length(8);
        expect(ths[0]!.getAttribute('colspan')).to.equal('2');
        expect(ths[0]!.querySelector('.visually-hidden')!.textContent).to.equal('Day');
        const days = ths.slice(1);
        expect(days.map((th) => th.getAttribute('aria-label'))).to.deep.equal([
          'Sunday, November 8',
          'Monday, November 9',
          'Tuesday, November 10',
          'Wednesday, November 11',
          'Thursday, November 12',
          'Friday, November 13',
          'Saturday, November 14',
        ]);
        for (const th of days) {
          expect(th.getAttribute('scope')).to.equal('col');
          const mobile = th.querySelector(':scope > .date-header > .date--mobile')!;
          expect(mobile).to.not.equal(null);
          expect(mobile.querySelector('.date-header-day')).to.not.equal(null);
          expect(mobile.querySelector('.date-header-month')).to.not.equal(null);
        }
        expect(text(days[1]!.querySelector('.date-header-day'))).to.equal('Mon');
        expect(text(days[1]!.querySelector('.date-header-month'))).to.equal('Nov 9');

        // Today: class and aria-current on its column header only; no aria-current="false".
        expect(days[6]!.classList.contains('today')).to.equal(true);
        expect(days[6]!.getAttribute('aria-current')).to.equal('date');
        expect(table.querySelectorAll('[aria-current]')).to.have.length(1);

        const rows = [...table.querySelectorAll('tbody > tr')];
        expect(rows).to.have.length(2);
        const building = rows[0]!;
        expect(building.getAttribute('part')).to.equal('building-hours');
        expect(text(building.querySelector('th'))).to.equal('Building hours');
        const bTds = [...building.querySelectorAll('td')];
        expect(bTds.map(cellText)).to.deep.equal([
          '10am - 2am',
          '8am - 2am',
          '8am - 2am',
          '8am - 2am',
          '8am - 2am',
          '8am - 12am',
          '9am - 12am',
        ]);
        expect(bTds[6]!.classList.contains('today')).to.equal(true);
        expect(bTds[0]!.classList.contains('today')).to.equal(false);
        expect(bTds[6]!.getAttribute('aria-label')).to.equal('Saturday, November 14: 9am - 12am');
        expect(bTds[0]!.querySelector(':scope > .date--mobile > .date-header-day')).to.not.equal(
          null,
        );

        const rmc = rows[1]!;
        const link = rmc.querySelector('th a.lib-space-link')!;
        expect(link.getAttribute('href')).to.equal('/rmc/');
        expect(text(link)).to.equal('Robertson Media Center');
        expect(rmc.querySelectorAll('td')).to.have.length(7);
        expect(cellText(rmc.querySelectorAll('td')[1]!)).to.equal('10am - 10pm');

        const html = el.shadowRoot ? el.shadowRoot.innerHTML : el.innerHTML;
        expect(html).to.not.include('[object Object]');
      });

      it('passes axe', async () => {
        const el = await make(`library-slug="harrison" ${attrs}`);
        await expectNoAxeViolations(el);
      });

      it('keeps the structural CSS (host block, flex header, [hidden])', async () => {
        const el = await make(`library-slug="clemons" ${attrs}`);
        expect(getComputedStyle(el).display).to.equal('block');
        expect(getComputedStyle(el).minHeight).to.not.equal('100vh');
        const header = root(el).querySelector('.weekly-hours-header-section')!;
        const cs = getComputedStyle(header);
        expect(cs.display).to.equal('flex');
        expect(cs.justifyContent).to.equal('space-between');
        expect(cs.alignItems).to.equal('center');
        expect(getComputedStyle(header.querySelector('[role=heading]')!).flexGrow).to.equal('1');
        const hidden = document.createElement('span');
        hidden.className = 'uvalib-button';
        hidden.hidden = true;
        header.append(hidden);
        expect(getComputedStyle(hidden).display).to.equal('none');
        hidden.remove();
      });
    });
  }

  it('scopes the light structural CSS to the tag', async () => {
    await make('library-slug="clemons" no-shadow-dom no-style');
    const outside = document.createElement('div');
    outside.className = 'weekly-hours-header-section';
    document.body.append(outside);
    try {
      expect(getComputedStyle(outside).display).to.equal('block');
    } finally {
      outside.remove();
    }
  });

  it('hides the building row with hide-building-hours (Harrison shares its calendar)', async () => {
    const el = await make('library-slug="harrison" hide-building-hours');
    expect(el.hideBuildingHours).to.equal(true);
    const rows = [...root(el).querySelectorAll('tbody > tr')];
    expect(root(el).querySelector('[part=building-hours]')).to.equal(null);
    expect(rows.map((r) => text(r.querySelector('th')))).to.deep.equal([
      'Harrison/Small Building & Exhibitions',
      'Small Special Collections Reading Room',
    ]);
    expect(rows[1]!.querySelector('th span.lib-space')).to.not.equal(null);
    expect(cellText(rows[0]!.querySelectorAll('td')[0]!)).to.equal('closed');
    expect(cellText(rows[1]!.querySelectorAll('td')[1]!)).to.equal('1pm - 5pm');
  });

  it('pages weeks with the buttons, reflects week-count and announces the week', async () => {
    const el = await make('library-slug="clemons"');
    const [prev, , next] = [...root(el).querySelector('.weekly-hours-header-section')!.children];
    (next as HTMLButtonElement).click();
    await settled(el);
    expect(el.getAttribute('week-count')).to.equal('1');
    expect(text(root(el).querySelector('[role=heading]'))).to.equal('Nov 15. 2026 - Nov 21. 2026');
    expect(root(el).querySelectorAll('.today, [aria-current]')).to.have.length(0);
    expect(text(root(el).querySelector('[role=status]'))).to.equal(
      'Showing hours for Sunday, November 15, 2026 to Saturday, November 21, 2026',
    );
    (prev as HTMLButtonElement).click();
    (prev as HTMLButtonElement).click();
    await settled(el);
    expect(el.weekCount).to.equal(-1);
    expect(text(root(el).querySelector('[role=heading]'))).to.equal('Nov 01. 2026 - Nov 07. 2026');
  });

  it('renders 24 Hours', async () => {
    const el = await make('library-slug="clemons" week-count="-28"');
    expect(text(root(el).querySelector('[role=heading]'))).to.equal('Apr 26. 2026 - May 02. 2026');
    const rmc = root(el).querySelectorAll('tbody > tr')[1]!;
    expect(cellText(rmc.querySelectorAll('td')[4]!)).to.equal('24 Hours');
    expect(rmc.querySelectorAll('td')[4]!.getAttribute('aria-label')).to.equal(
      'Thursday, April 30: 24 Hours',
    );
  });

  it('renders days with several ranges', async () => {
    const el = await make('library-slug="main" week-count="-4"');
    const lab = root(el).querySelectorAll('tbody > tr')[1]!;
    expect(text(lab.querySelector('th'))).to.equal('Scholars’ Lab Makerspace');
    expect(cellText(lab.querySelectorAll('td')[5]!)).to.equal('10am - 1pm, 4pm - 5:30pm');
  });

  it('renders holiday closures', async () => {
    const el = await make('library-slug="clemons" week-count="6"');
    const cells = [...root(el).querySelectorAll('[part=building-hours] td')].map(cellText);
    expect(cells[4]).to.equal('closed'); // Thursday 24 December
    expect(cells[5]).to.equal('closed');
  });

  it('honours heading-level and the old headinglevelstart attribute', async () => {
    let el = await make('library-slug="clemons" heading-level="3"');
    expect(root(el).querySelector('div.heading-h3[role=heading][aria-level="3"]')).to.not.equal(
      null,
    );
    el = await make('library-slug="clemons" headinglevelstart="4"');
    expect(root(el).querySelector('div.heading-h4[role=heading][aria-level="4"]')).to.not.equal(
      null,
    );
  });

  describe('heading level from the page', () => {
    const heading = (el: LibraryWeeklyHours) => root(el).querySelector('[role=heading]')!;

    it("is one below the library's heading, and keeps the heading-h2 class", async () => {
      const wrap = await fixture<HTMLElement>(
        '<div><h2>Clemons Library</h2><library-weekly-hours library-slug="clemons"></library-weekly-hours></div>',
      );
      const el = wrap.querySelector('library-weekly-hours') as LibraryWeeklyHours;
      await settled(el);
      expect(heading(el).getAttribute('aria-level')).to.equal('3');
      expect(heading(el).classList.contains('heading-h2')).to.equal(true);
    });

    it('each table follows its own library heading, not the table before it', async () => {
      const wrap = await fixture<HTMLElement>(
        `<div>
          <h2>Clemons Library</h2><library-weekly-hours library-slug="clemons" no-shadow-dom></library-weekly-hours>
          <h2>Music Library</h2><library-weekly-hours library-slug="music" no-shadow-dom></library-weekly-hours>
        </div>`,
      );
      const [a, b] = [...wrap.querySelectorAll('library-weekly-hours')] as LibraryWeeklyHours[];
      await settled(a!);
      await settled(b!);
      for (const el of [a!, b!]) expect(heading(el).getAttribute('aria-level')).to.equal('3');
    });

    it('stays level 2 with no heading before it, and an explicit level sets both', async () => {
      let el = await make('library-slug="clemons"');
      expect(heading(el).getAttribute('aria-level')).to.equal('2');
      el = await make('library-slug="clemons" heading-level="4"');
      expect(heading(el).getAttribute('aria-level')).to.equal('4');
      expect(heading(el).classList.contains('heading-h4')).to.equal(true);
    });
  });

  it('shows a polite loading status while fetching, with the table header already laid out', async () => {
    const original = window.fetch;
    window.fetch = () => new Promise<Response>(() => {});
    try {
      const el = await fixture<LibraryWeeklyHours>(
        '<library-weekly-hours library-slug="clemons"></library-weekly-hours>',
      );
      expect(el.state).to.equal('loading');
      const status = root(el).querySelector('[role=status]')!;
      expect(text(status)).to.equal('Loading hours…');
      expect(root(el).querySelectorAll('thead th')).to.have.length(8);
      expect(root(el).querySelector('table')!.getAttribute('aria-busy')).to.equal('true');
      await expectNoAxeViolations(el);
    } finally {
      window.fetch = original;
    }
  });

  const retryButton = (el: LibraryWeeklyHours) =>
    root(el).querySelector<HTMLButtonElement>('[role=status] button')!;

  for (const host of ['hours-fail.test', 'hours-empty.test']) {
    it(`keeps the week header and offers Retry when data is unavailable (${host})`, async () => {
      useHoursHost(host);
      const el = await make('library-slug="clemons"');
      expect(el.state).to.equal('error');
      const status = root(el).querySelector('[role=status]')!;
      expect(text(status)).to.equal('Hours are unavailable right now. Retry');
      expect(retryButton(el).matches('button.uvalib-button[type=button]')).to.equal(true);
      expect(root(el).querySelectorAll('.weekly-hours-header-section button')).to.have.length(2);
      expect(root(el).querySelectorAll('thead th')).to.have.length(8);
      expect(root(el).querySelectorAll('tbody tr')).to.have.length(0);
      await expectNoAxeViolations(el);
    });
  }

  it('recovers from an error with Retry and announces the result', async () => {
    hoursEndpoints.hours = 'https://hours-fail.test/api/1.0/hours/{ids}?key=x';
    const el = await make('library-slug="clemons" refresh-every="0"');
    expect(el.state).to.equal('error');
    resetHours();
    retryButton(el).focus();
    retryButton(el).click();
    await settled(el);
    expect(el.state).to.equal('ready');
    expect(root(el).querySelectorAll('tbody tr')).to.have.length(2);
    expect(text(root(el).querySelector('[role=status]'))).to.equal(
      'Showing hours for Sunday, November 8, 2026 to Saturday, November 14, 2026',
    );
    // Focus stays in the element (the Retry button is gone).
    const active = el.shadowRoot ? el.shadowRoot.activeElement : document.activeElement;
    expect(text(active)).to.equal('Previous week');
  });

  it('recovers from an error on the refresh interval, without announcing', async () => {
    hoursEndpoints.hours = 'https://hours-fail.test/api/1.0/hours/{ids}?key=x';
    const el = await make('library-slug="clemons" refresh-every="40"');
    expect(el.state).to.equal('error');
    resetHours();
    await waitUntil(() => el.state === 'ready', 'did not recover', { timeout: 2000 });
    await el.updateComplete;
    expect(root(el).querySelectorAll('tbody tr')).to.have.length(2);
    expect(text(root(el).querySelector('[role=status]'))).to.equal('');
  });

  it('recovers from an error on the date check for other weeks too', async () => {
    hoursTiming.tick = 20;
    hoursEndpoints.hours = 'https://hours-fail.test/api/1.0/hours/{ids}?key=x';
    const el = await make('library-slug="clemons" week-count="1" refresh-every="0"');
    expect(el.state).to.equal('error');
    resetHours();
    hoursTiming.tick = 20;
    await waitUntil(() => el.state === 'ready', 'did not recover', { timeout: 2000 });
  });

  it('keeps the previous rows (aria-busy) while the next week loads, and announces only the result', async () => {
    const el = await make('library-slug="clemons"');
    const hold = holdFetches((u) => u.includes('cal.lib.virginia.edu'));
    try {
      const next = root(el).querySelectorAll<HTMLButtonElement>(
        '.weekly-hours-header-section button',
      )[1]!;
      next.click();
      await el.updateComplete;
      await waitUntil(() => hold.count === 1, 'LibCal not requested');
      expect(el.state).to.equal('loading');
      expect(root(el).querySelector('table')!.getAttribute('aria-busy')).to.equal('true');
      expect(root(el).querySelectorAll('tbody tr')).to.have.length(2);
      expect(text(root(el).querySelector('[role=status]'))).to.equal('');
      hold.release();
      await settled(el);
      expect(root(el).querySelector('table')!.hasAttribute('aria-busy')).to.equal(false);
      expect(root(el).querySelectorAll('thead th')[1]!.getAttribute('aria-label')).to.equal(
        'Sunday, November 15',
      );
      expect(text(root(el).querySelector('[role=status]'))).to.match(
        /^Showing hours for Sunday, November 15/,
      );
    } finally {
      hold.release();
      hold.restore();
    }
  });

  it('does not announce a week-count set from script', async () => {
    const el = await make('library-slug="clemons"');
    el.weekCount = 2;
    await settled(el);
    expect(text(root(el).querySelector('[role=status]'))).to.equal('');
    expect(text(root(el).querySelector('[role=heading]'))).to.equal('Nov 22. 2026 - Nov 28. 2026');
  });

  it('ignores a stale response that arrives after a newer request', async () => {
    const el = await make('library-slug="clemons"');
    const [, next] = root(el).querySelectorAll<HTMLButtonElement>(
      '.weekly-hours-header-section button',
    );
    const hold = holdFetches((u) => u.includes('from=2026-11-15'));
    try {
      next!.click(); // week +1: held
      await el.updateComplete;
      await waitUntil(() => hold.count === 1, 'week +1 not requested');
      next!.click(); // week +2: answered
      await settled(el);
      hold.release(); // the stale week +1 answer lands last
      await new Promise((r) => setTimeout(r, 50));
      await el.updateComplete;
      expect(el.weekCount).to.equal(2);
      expect(root(el).querySelectorAll('thead th')[1]!.getAttribute('aria-label')).to.equal(
        'Sunday, November 22',
      );
      expect(text(root(el).querySelector('[role=heading]'))).to.equal(
        'Nov 22. 2026 - Nov 28. 2026',
      );
    } finally {
      hold.release();
      hold.restore();
    }
  });

  it('shows the error when a fetch times out', async () => {
    hoursTiming.timeout = 50;
    useHoursHost('hours-hang.test');
    const el = await make('library-slug="clemons" refresh-every="0"');
    expect(el.state).to.equal('error');
  });

  it('shows a Building hours placeholder row before the library list arrives', async () => {
    resetHours();
    const hold = holdFetches((u) => u.includes('/jsonapi/'));
    try {
      const el = await fixture<LibraryWeeklyHours>(
        `<library-weekly-hours library-slug="clemons" refresh-every="0"></library-weekly-hours>`,
      );
      await waitUntil(() => hold.count === 1, 'library list not requested');
      await el.updateComplete;
      const rows = root(el).querySelectorAll('tbody tr');
      expect(rows).to.have.length(1);
      expect(text(rows[0]!.querySelector('th'))).to.equal('Building hours');
      expect(rows[0]!.querySelectorAll('.hours-placeholder')).to.have.length(7);
      hold.release();
      await settled(el);
      expect(root(el).querySelectorAll('tbody tr')).to.have.length(2);
      expect(root(el).querySelectorAll('tbody .hours-placeholder')).to.have.length(0);
    } finally {
      hold.release();
      hold.restore();
    }
  });

  it('holds the final table height with placeholder rows while the hours load', async () => {
    resetHours();
    const hold = holdFetches((u) => u.includes('cal.lib.virginia.edu'));
    try {
      const el = await fixture<LibraryWeeklyHours>(
        `<library-weekly-hours library-slug="clemons" refresh-every="0" style="width: 332px"></library-weekly-hours>`,
      );
      await waitUntil(() => hold.count === 1, 'LibCal not requested');
      await el.updateComplete;
      const table = root(el).querySelector('table')!;
      expect(table.getAttribute('aria-busy')).to.equal('true');
      // Building hours plus Clemons' one space, with hidden placeholder hours.
      const rows = root(el).querySelectorAll('tbody tr');
      expect(rows).to.have.length(2);
      const placeholders = root(el).querySelectorAll('tbody .hours-placeholder');
      expect(placeholders).to.have.length(14);
      for (const p of placeholders) {
        expect(p.getAttribute('aria-hidden')).to.equal('true');
        expect(getComputedStyle(p).visibility).to.equal('hidden');
      }
      expect(text(root(el).querySelector('[role=status]'))).to.equal('Loading hours…');
      const tableBefore = table.getBoundingClientRect().height;
      const elBefore = el.getBoundingClientRect().height;
      hold.release();
      await settled(el);
      expect(el.state).to.equal('ready');
      expect(root(el).querySelectorAll('tbody .hours-placeholder')).to.have.length(0);
      expect(root(el).querySelectorAll('tbody tr')).to.have.length(2);
      // The real hours replace the placeholders in place: the table keeps its height.
      const tableAfter = root(el).querySelector('table')!.getBoundingClientRect().height;
      expect(Math.abs(tableAfter - tableBefore)).to.be.below(2);
      // The status line keeps its height when "Loading hours…" empties, so the whole
      // element, and everything after it, stays put.
      expect(Math.abs(el.getBoundingClientRect().height - elBefore)).to.be.below(2);
    } finally {
      hold.release();
      hold.restore();
    }
  });

  it('reserves --library-weekly-hours-min-height only during its first load', async () => {
    resetHours();
    const hold = holdFetches((u) => u.includes('cal.lib.virginia.edu'));
    try {
      const el = await fixture<LibraryWeeklyHours>(
        `<library-weekly-hours library-slug="clemons" refresh-every="0" style="--library-weekly-hours-min-height: 600px"></library-weekly-hours>`,
      );
      await waitUntil(() => hold.count === 1, 'LibCal not requested');
      await el.updateComplete;
      expect(el.hasAttribute('loading')).to.equal(true);
      expect(el.getBoundingClientRect().height).to.be.at.least(600);
      hold.release();
      await settled(el);
      expect(el.state).to.equal('ready');
      expect(el.hasAttribute('loading')).to.equal(false);
      expect(el.getBoundingClientRect().height).to.be.below(600);
      // A later load keeps its rows on screen, so it reserves nothing.
      root(el)
        .querySelectorAll<HTMLButtonElement>('.weekly-hours-header-section button')[1]!
        .click();
      await waitUntil(() => hold.count === 1, 'next week not requested');
      await el.updateComplete;
      expect(el.state).to.equal('loading');
      expect(el.hasAttribute('loading')).to.equal(false);
      hold.release();
      await settled(el);
    } finally {
      hold.release();
      hold.restore();
    }
  });

  it('describes each week button by its own week heading', async () => {
    const a = await make('library-slug="clemons"');
    const b = await make('library-slug="main"');
    for (const el of [a, b]) {
      const heading = root(el).querySelector('[role=heading]')!;
      for (const button of root(el).querySelectorAll('.weekly-hours-header-section button'))
        expect(button.getAttribute('aria-describedby')).to.equal(heading.id);
    }
    expect(root(a).querySelector('[role=heading]')!.id).to.not.equal(
      root(b).querySelector('[role=heading]')!.id,
    );
  });

  it('exposes the shared endpoints as a static accessor that writes through', () => {
    const ctor = customElements.get('library-weekly-hours') as unknown as {
      endpoints: Partial<typeof hoursEndpoints>;
    };
    expect(ctor.endpoints).to.equal(hoursEndpoints);
    ctor.endpoints = { libraries: 'https://hours-empty.test/jsonapi/index/default_index' };
    expect(hoursEndpoints.libraries).to.equal(
      'https://hours-empty.test/jsonapi/index/default_index',
    );
    expect(hoursEndpoints.hours).to.include('cal.lib.virginia.edu');
  });

  it('refreshes the current week every refresh-every ms, and stops when disconnected', async () => {
    const rec = recordFetches();
    try {
      const el = await make('library-slug="clemons" refresh-every="40"');
      const libcal = () => rec.urls.filter((u) => u.includes('cal.lib.virginia.edu')).length;
      const first = libcal();
      await waitUntil(() => libcal() >= first + 2, 'did not refresh', { timeout: 2000 });
      el.remove();
      const after = libcal();
      await new Promise((r) => setTimeout(r, 200));
      expect(libcal()).to.be.at.most(after + 1);
    } finally {
      rec.restore();
    }
  });

  it('does not refresh other weeks on the interval', async () => {
    const rec = recordFetches();
    try {
      await make('library-slug="clemons" refresh-every="40" week-count="1"');
      const count = rec.urls.length;
      await new Promise((r) => setTimeout(r, 250));
      expect(rec.urls.length).to.equal(count);
    } finally {
      rec.restore();
    }
  });

  it('moves to the new week when the New York date rolls over', async () => {
    hoursTiming.tick = 20;
    await setClock('2026-11-15T04:59:30Z'); // 23:59:30 Saturday in New York
    try {
      const el = await make('library-slug="clemons"');
      expect(text(root(el).querySelector('[role=heading]'))).to.equal(
        'Nov 08. 2026 - Nov 14. 2026',
      );
      await setClock('2026-11-15T05:00:30Z'); // 00:00:30 Sunday
      await waitUntil(
        () => text(root(el).querySelector('[role=heading]')) === 'Nov 15. 2026 - Nov 21. 2026',
        'week did not roll over',
        { timeout: 2000 },
      );
      await settled(el);
      expect(root(el).querySelector('th[aria-current=date]')!.getAttribute('aria-label')).to.equal(
        'Sunday, November 15',
      );
      expect(text(root(el).querySelector('[role=status]'))).to.equal(''); // rollovers are silent
    } finally {
      await setClock(NOW);
    }
  });

  it('renders nothing without a library slug', async () => {
    const el = await fixture<LibraryWeeklyHours>('<library-weekly-hours></library-weekly-hours>');
    expect(root(el).querySelector('table')).to.equal(null);
    expect(el.state).to.equal('ready');
  });

  it('starts in the loading state', () => {
    const el = document.createElement('library-weekly-hours') as LibraryWeeklyHours;
    expect(el.state).to.equal('loading');
    expect(() => ((el as unknown as { state: string }).state = 'ready')).to.throw();
  });
});
