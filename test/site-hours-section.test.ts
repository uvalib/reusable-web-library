import { expect, fixture, waitUntil } from '@open-wc/testing';
import '../src/components/site-hours-section/site-hours-section.js';
import { LibraryWeeklyHours } from '../src/components/library-weekly-hours/LibraryWeeklyHours.js';
import type { SiteHoursSection } from '../src/components/site-hours-section/SiteHoursSection.js';
import { hoursEndpoints, hoursTiming } from '../src/components/library-hours/hours-data.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { recordFetches, resetHours, setClock, settled, useHoursHost } from './helpers/hours.js';

// Saturday 14 November 2026, noon in Charlottesville.
const NOW = '2026-11-14T17:00:00Z';

const MODES = {
  shadow: '',
  'shadow no-style': 'no-style',
  'light no-style': 'no-shadow-dom no-style',
  light: 'no-shadow-dom',
} as const;

const root = (el: SiteHoursSection): ParentNode => el.shadowRoot ?? el;
const text = (n: Element | null | undefined) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();

async function make(attrs: string): Promise<SiteHoursSection> {
  const el = await fixture<SiteHoursSection>(`<site-hours-section ${attrs}></site-hours-section>`);
  await settled(el);
  return el;
}

/** [dt text, dd text] pairs. */
const pairs = (el: SiteHoursSection) =>
  [...root(el).querySelectorAll('dl > dt')].map((dt) => [text(dt), text(dt.nextElementSibling)]);

const LIMITED = [
  ['Ask a Librarian chat', '10am - 6pm'],
  ['Brown', '9am - 6pm'],
  ['Clemons', '9am - 12am'],
  ['Fine Arts', 'closed'],
  ['Harrison/Small', 'closed'],
  ['Music', 'closed'],
  ['Shannon', '9am - 6pm'],
];

describe('site-hours-section', () => {
  before(() => setClock(NOW));
  beforeEach(resetHours);
  after(resetHours);

  for (const [mode, attrs] of Object.entries(MODES)) {
    describe(mode, () => {
      it('renders the live DOM structure with today’s hours', async () => {
        const el = await make(`limited ${attrs}`);
        const r = root(el);
        expect(el.state).to.equal('ready');
        const block = r.querySelector('div.home-hours-block')!;
        expect(block.parentNode).to.equal(el.shadowRoot ?? el);
        const [date, head, dl, seeAll] = [...block.children].filter(
          (c) => c.getAttribute('role') !== 'status',
        );
        expect(date!.matches('div#homehoursdate.home-hour-date')).to.equal(true);
        expect(text(date)).to.equal('Saturday, November 14, 2026');
        expect(head!.matches('h3.hour-head')).to.equal(true);
        expect(text(head)).to.equal("Today's hours");
        expect(dl!.matches('dl.dl--inline.hours-locations')).to.equal(true);
        expect([...dl!.children].map((c) => c.localName + '.' + c.className)).to.deep.equal(
          LIMITED.flatMap(() => ['dt.location', 'dd.hours']),
        );
        expect(pairs(el)).to.deep.equal(LIMITED);
        expect(seeAll!.matches('p.hours-see-all')).to.equal(true);
        expect(seeAll!.querySelector('a')!.getAttribute('href')).to.equal('/hours');
        const html = el.shadowRoot ? el.shadowRoot.innerHTML : el.innerHTML;
        expect(html).to.not.include('[object Object]');
      });

      it('passes axe', async () => {
        const el = await make(attrs);
        await expectNoAxeViolations(el);
      });
    });
  }

  it('lists every library without limited, with site links, sanitised hours information and a calm fallback', async () => {
    const el = await make('');
    const got = pairs(el);
    expect(got.slice(0, 7)).to.deep.equal(LIMITED);
    expect(got.slice(7).map(([dt]) => dt)).to.deep.equal([
      'Darden',
      'Harrison/Small Building',
      'Health Sciences Library',
      'Ivy Library',
      'JAG School Library',
      'Law Library',
      'Robertson Media Center',
      'Scholars’ Lab Makerspace',
      'Special Collections',
    ]);
    const dd = (name: string) =>
      [...root(el).querySelectorAll('dt')].find((dt) => text(dt) === name)!.nextElementSibling!;
    expect(dd('Darden').innerHTML.replace(/<!--[^>]*-->/g, '')).to.equal(
      '<p>See:&nbsp;<a href="https://www.darden.virginia.edu/current-students/camp-library">Darden Library webpage</a></p>',
    );
    expect(dd('JAG School Library').querySelector('a')!.getAttribute('href')).to.equal(
      'https://guides.lib.virginia.edu/jag-library',
    );
    expect(text(dd('JAG School Library'))).to.equal('See site');
    // Ivy has a LibCal calendar with no hours for today.
    expect(text(dd('Ivy Library'))).to.equal('Hours unavailable. See all hours');
    expect(dd('Ivy Library').querySelector('a')!.getAttribute('href')).to.equal('/hours');
    expect(text(dd('Robertson Media Center'))).to.equal('10am - 10pm');
  });

  it('filters by place-type, reactively', async () => {
    const el = await make('place-type="space"');
    expect(pairs(el).map(([dt]) => dt)).to.deep.equal([
      'Harrison/Small Building',
      'Robertson Media Center',
      'Scholars’ Lab Makerspace',
      'Special Collections',
    ]);
    el.placeType = 'other-professional';
    el.limited = false;
    await settled(el);
    expect(pairs(el).map(([dt]) => dt)).to.deep.equal([
      'Darden',
      'Health Sciences Library',
      'JAG School Library',
      'Law Library',
    ]);
    el.setAttribute('limited', '');
    await settled(el);
    expect(pairs(el)).to.deep.equal([]);
  });

  it('makes one LibCal request for today', async () => {
    const rec = recordFetches();
    try {
      await make('limited');
      const libcal = rec.urls.filter((u) => u.includes('cal.lib.virginia.edu'));
      expect(libcal).to.have.length(1);
      const url = new URL(libcal[0]!);
      expect(url.searchParams.get('from')).to.equal('2026-11-14');
      expect(url.searchParams.get('to')).to.equal('2026-11-14');
    } finally {
      rec.restore();
    }
  });

  it('fires got-library-hours and got-libraries (bubbling, composed)', async () => {
    const events: CustomEvent[] = [];
    const listen = (e: Event) => events.push(e as CustomEvent);
    document.addEventListener('got-library-hours', listen);
    document.addEventListener('got-libraries', listen);
    try {
      await make('limited');
      await waitUntil(() => events.length === 2);
      expect(events.map((e) => [e.type, e.bubbles, e.composed])).to.deep.equal([
        ['got-library-hours', true, true],
        ['got-libraries', true, true],
      ]);
      expect(events[0]!.detail).to.deep.equal({ message: 'fetched hours for libraries' });
      expect(events[1]!.detail).to.deep.equal({ message: 'fetched libraries' });
    } finally {
      document.removeEventListener('got-library-hours', listen);
      document.removeEventListener('got-libraries', listen);
    }
  });

  it('shows a polite loading status', async () => {
    const original = window.fetch;
    window.fetch = () => new Promise<Response>(() => {});
    try {
      const el = await fixture<SiteHoursSection>('<site-hours-section></site-hours-section>');
      expect(el.state).to.equal('loading');
      expect(text(root(el).querySelector('[role=status]'))).to.equal('Loading hours…');
      expect(root(el).querySelector('.hours-see-all a[href="/hours"]')).to.not.equal(null);
    } finally {
      window.fetch = original;
    }
  });

  for (const host of ['hours-fail.test', 'hours-empty.test']) {
    it(`shows a calm message when data is unavailable (${host})`, async () => {
      useHoursHost(host);
      const el = await make('limited');
      expect(el.state).to.equal(host === 'hours-fail.test' ? 'error' : 'ready');
      const status = root(el).querySelector('[role=status]')!;
      expect(text(status)).to.match(/^Hours are unavailable right now\./);
      expect(status.querySelector('a[href="/hours"]')).to.not.equal(null);
      expect(text(root(el).querySelector('h3'))).to.equal("Today's hours");
      await expectNoAxeViolations(el);
    });
  }

  it('exposes the shared endpoints on the element class for repointing', async () => {
    const ctor = customElements.get('site-hours-section') as unknown as {
      endpoints: typeof hoursEndpoints;
    };
    expect(ctor.endpoints).to.equal(hoursEndpoints);
    expect(LibraryWeeklyHours.endpoints).to.equal(hoursEndpoints);
    ctor.endpoints.libraries = 'https://hours-empty.test/jsonapi/index/default_index?x';
    const el = await make('');
    expect(pairs(el)).to.deep.equal([]);
    expect(text(root(el).querySelector('[role=status]'))).to.match(/^Hours are unavailable/);
  });

  it('marks libraries with a calendar unavailable when LibCal fails', async () => {
    hoursEndpoints.hours = 'https://hours-fail.test/api/1.0/hours/{ids}?key=x';
    const el = await make('limited');
    expect(pairs(el).map(([, dd]) => dd)).to.deep.equal(
      LIMITED.map(() => 'Hours unavailable. See all hours'),
    );
  });

  it('refreshes when the New York date rolls over', async () => {
    hoursTiming.tick = 20;
    await setClock('2026-11-15T04:30:00Z'); // 23:30 Saturday in New York
    try {
      const el = await make('limited');
      expect(text(root(el).querySelector('#homehoursdate'))).to.equal(
        'Saturday, November 14, 2026',
      );
      await setClock('2026-11-15T05:00:30Z'); // 00:00:30 Sunday
      await waitUntil(
        () => text(root(el).querySelector('#homehoursdate')) === 'Sunday, November 15, 2026',
        'date did not roll over',
        { timeout: 2000 },
      );
      await settled(el);
      expect(pairs(el)[0]).to.deep.equal(['Ask a Librarian chat', '10am - 9pm']);
    } finally {
      await setClock(NOW);
    }
  });
});
