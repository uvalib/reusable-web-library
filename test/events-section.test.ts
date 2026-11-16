import { expect, fixture, waitUntil } from '@open-wc/testing';
import { emulateMedia, sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/events-section/events-section.js';
import { define } from '../src/base/define.js';
import { EventsSection } from '../src/components/events-section/EventsSection.js';
import { eventsEndpoints, eventsTiming } from '../src/components/events-section/events-data.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { holdFetches, recordFetches, setClock } from './helpers/hours.js';
import { resetEvents, useEventsHost } from './helpers/events.js';

// Monday 16 November 2026, 9am in Charlottesville: every fixture event is still to come.
const NOW = '2026-11-16T14:00:00Z';

const MODES = {
  shadow: '',
  'shadow no-style': 'no-style',
  // Before plain light mode: once the styled rules are in the document they also apply here.
  'light no-style': 'no-shadow-dom no-style',
  light: 'no-shadow-dom',
} as const;

const root = (el: EventsSection): ParentNode => el.shadowRoot ?? el;
const text = (n: Node | null | undefined) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
const cards = (el: EventsSection) => [
  ...root(el).querySelectorAll<HTMLElement>('.event-container > .event:not(.event-placeholder)'),
];
const placeholders = (el: EventsSection) => [
  ...root(el).querySelectorAll<HTMLElement>('.event-container > .event-placeholder'),
];
const status = (el: EventsSection) => root(el).querySelector<HTMLElement>('[role=status]')!;
const titles = (el: EventsSection) => cards(el).map((c) => text(c.querySelector('.event-title')));

/**
 * The text assistive technology reads for `node`: its text without aria-hidden subtrees,
 * with a space between elements (as Chrome's name computation separates blocks).
 */
function spoken(node: Node): string {
  const parts: string[] = [];
  const walk = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) parts.push((n as Text).data);
    else if (n instanceof Element && n.getAttribute('aria-hidden') !== 'true') {
      parts.push(' ');
      n.childNodes.forEach(walk);
      parts.push(' ');
    }
  };
  node.childNodes.forEach(walk);
  return parts.join('').replace(/\s+/g, ' ').trim();
}

async function settled(el: EventsSection) {
  await el.updateComplete;
  await waitUntil(() => el.state !== 'loading', 'still loading', { timeout: 4000 });
  await el.updateComplete;
}

async function make(attrs: string): Promise<EventsSection> {
  const el = await fixture<EventsSection>(`<events-section ${attrs}></events-section>`);
  await settled(el);
  return el;
}

describe('events-section', () => {
  before(() => setClock(NOW));
  beforeEach(resetEvents);
  after(resetEvents);

  for (const [mode, attrs] of Object.entries(MODES)) {
    describe(mode, () => {
      it('renders the DOM and classes the Drupal theme styles', async () => {
        const el = await make(`limit="8" ${attrs}`);
        expect(el.state).to.equal('ready');
        const container = root(el).querySelector('div.event-container')!;
        expect(container.parentNode).to.equal(root(el));
        const list = cards(el);
        expect(list).to.have.length(8);
        expect(placeholders(el)).to.have.length(0);
        for (const card of list) {
          expect(card.matches('div.event')).to.equal(true);
          expect(card.children).to.have.length(1);
          const a = card.firstElementChild!;
          expect(a.matches('a.event-url[href]')).to.equal(true);
          const [h, date, time] = [...a.children];
          expect(a.children).to.have.length(3);
          expect(h!.matches('h3.event-title')).to.equal(true);
          expect(date!.matches('p.event-date')).to.equal(true);
          expect(time!.matches('p.event-time')).to.equal(true);
          const spans = [...date!.querySelectorAll(':scope > span')];
          expect(spans.map((s) => s.className)).to.deep.equal([
            'event--month',
            'event--day',
            'event--wkday',
          ]);
          for (const s of spans) expect(s.getAttribute('aria-hidden')).to.equal('true');
          expect(date!.querySelector(':scope > time.visually-hidden[datetime]')).to.not.equal(null);
        }
        const first = list[0]!.firstElementChild!;
        expect(first.getAttribute('href')).to.equal('https://cal.lib.virginia.edu/event/18006754');
        expect(text(first.querySelector('.event-title'))).to.equal('3D Printing Training');
        expect(text(first.querySelector('.event--month'))).to.equal('Nov');
        expect(text(first.querySelector('.event--day'))).to.equal('16');
        expect(text(first.querySelector('.event--wkday'))).to.equal('Mon');
        const time = first.querySelector('time')!;
        expect(time.getAttribute('datetime')).to.equal('2026-11-16');
        expect(text(time)).to.equal('Monday, November 16');
        expect(text(first.querySelector('.event-time'))).to.equal('11:00 AM - 12:00 PM EST');
        // The link reads title, full date, then time.
        expect(spoken(first)).to.equal(
          '3D Printing Training Monday, November 16 11:00 AM - 12:00 PM EST',
        );
        // No ids (the old homehoursMonth/Day/WeekDay were repeated per card), no slot.
        expect(root(el).querySelectorAll('[id]')).to.have.length(0);
        expect(root(el).querySelector('slot')).to.equal(null);
        expect(el.querySelector('slot')).to.equal(null);
        expect(text(status(el))).to.equal('');
        const html = el.shadowRoot ? el.shadowRoot.innerHTML : el.innerHTML;
        expect(html).to.not.include('[object Object]');
        expect(html).to.not.include('undefined');
      });

      it('passes axe', async () => {
        const el = await make(`limit="8" ${attrs}`);
        await expectNoAxeViolations(el);
      });

      it('keeps the structural CSS (host block, clamp, hidden placeholders, [hidden])', async () => {
        const el = await make(`limit="2" ${attrs}`);
        expect(getComputedStyle(el).display).to.equal('block');
        const title = root(el).querySelector('.event-title')!;
        const cs = getComputedStyle(title);
        expect(cs.getPropertyValue('-webkit-line-clamp')).to.equal('3');
        expect(cs.overflow).to.equal('hidden');
        const container = root(el).querySelector('.event-container')!;
        const extra = document.createElement('div');
        extra.className = 'event event-placeholder';
        container.append(extra);
        expect(getComputedStyle(extra).visibility).to.equal('hidden');
        extra.className = 'event';
        extra.hidden = true;
        expect(getComputedStyle(extra).display).to.equal('none');
        extra.remove();
        const vh = root(el).querySelector('time.visually-hidden')!;
        expect(getComputedStyle(vh).position).to.equal('absolute');
        expect(vh.getBoundingClientRect().width).to.be.at.most(1);
        expect(parseFloat(getComputedStyle(status(el)).minHeight)).to.be.greaterThan(0);
      });
    });
  }

  it('scopes the light structural CSS to the tag', async () => {
    await make('no-shadow-dom no-style limit="1"');
    const outside = document.createElement('div');
    outside.className = 'event-placeholder';
    document.body.append(outside);
    try {
      expect(getComputedStyle(outside).visibility).to.equal('visible');
    } finally {
      outside.remove();
    }
  });

  it('uses h3 titles by default and honours heading-level 1 to 6', async () => {
    let el = await make('limit="1"');
    expect(root(el).querySelector('.event-title')!.localName).to.equal('h3');
    el = await make('limit="1" heading-level="4"');
    expect(root(el).querySelector('.event-title')!.localName).to.equal('h4');
    el = await make('limit="1" heading-level="1"');
    expect(root(el).querySelector('.event-title')!.localName).to.equal('h1');
    el = await make('limit="1" heading-level="9"');
    expect(root(el).querySelector('.event-title')!.localName).to.equal('h3');
    el.headingLevel = 6;
    await el.updateComplete;
    expect(root(el).querySelector('.event-title')!.localName).to.equal('h6');
  });

  describe('titles', () => {
    const LONG =
      'A very long event title that should be truncated by max-title-length at fifty characters';

    it('clamps to three lines and keeps the whole title in the DOM', async () => {
      const el = await make('query="very long" style="width: 12rem"');
      const title = root(el).querySelector<HTMLElement>('.event-title')!;
      expect(text(title)).to.equal(LONG);
      const lh = parseFloat(getComputedStyle(title).lineHeight);
      const content = title.clientHeight - parseFloat(getComputedStyle(title).paddingTop);
      expect(content).to.be.at.most(3 * lh + 1);
      expect(title.scrollHeight).to.be.greaterThan(title.clientHeight);
      expect(spoken(title.closest('a')!)).to.match(new RegExp(`^${LONG} Sunday, November 22 `));
    });

    it('cuts at max-title-length for sighted users only, keeping the full title for AT', async () => {
      const el = await make('query="very long" max-title-length="50"');
      const title = root(el).querySelector('.event-title')!;
      const shown = title.querySelector('[aria-hidden=true]')!;
      expect(text(shown)).to.equal(`${LONG.slice(0, 50).trimEnd()}…`);
      expect(text(title.querySelector('.visually-hidden'))).to.equal(LONG);
      expect(spoken(title)).to.equal(LONG);
    });

    it('does not cut a title of exactly max-title-length characters', async () => {
      let el = await make(`query="very long" max-title-length="${LONG.length}"`);
      let title = root(el).querySelector('.event-title')!;
      expect(title.querySelector('[aria-hidden]')).to.equal(null);
      expect(text(title)).to.equal(LONG);
      el = await make(`query="very long" max-title-length="${LONG.length - 1}"`);
      title = root(el).querySelector('.event-title')!;
      expect(text(title.querySelector('[aria-hidden=true]'))).to.equal(
        `${LONG.slice(0, -1).trimEnd()}…`,
      );
    });

    it('shows & and other text as text', async () => {
      const el = await make('query="No category"');
      expect(titles(el)).to.deep.equal(['No category & entity']);
    });
  });

  it('hides events that have ended, then applies limit', async () => {
    await setClock('2026-11-17T17:30:00Z'); // 12:30 on Tuesday 17 November
    try {
      const el = await make('limit="3"');
      expect(titles(el)).to.deep.equal([
        'Origami free fold session',
        '3D Printing Training',
        'Workshop: Virtual reality object modeling to 3D print workflow',
      ]);
    } finally {
      await setClock(NOW);
    }
  });

  it('shows at most limit events and fetches ten more', async () => {
    const rec = recordFetches();
    try {
      const el = await make('limit="2"');
      expect(titles(el)).to.deep.equal([
        '3D Printing Training',
        'FREN 4854 - Introduction to ArcGIS StoryMaps',
      ]);
      expect(rec.urls).to.have.length(1);
      expect(new URL(rec.urls[0]!).searchParams.get('limit')).to.equal('12');
    } finally {
      rec.restore();
    }
  });

  it('filters by category', async () => {
    const rec = recordFetches();
    try {
      const el = await make('category="70846" limit="8"');
      expect(titles(el)).to.deep.equal([
        'Origami free fold session',
        'Workshop: Virtual reality object modeling to 3D print workflow',
      ]);
      const url = new URL(rec.urls[0]!);
      expect(url.pathname).to.equal('/api/1.0/events');
      expect(url.searchParams.get('category')).to.equal('70846');
    } finally {
      rec.restore();
    }
  });

  it('searches with query, encoded', async () => {
    const rec = recordFetches();
    try {
      const el = await make('query="printing training" limit="8"');
      expect(titles(el)).to.deep.equal(['3D Printing Training', '3D Printing Training']);
      expect(rec.urls[0]).to.include('/api/1.0/event_search?');
      expect(rec.urls[0]).to.include('&search=printing%20training');
      const amp = await make('query="category & entity"');
      expect(titles(amp)).to.deep.equal(['No category & entity']);
      expect(rec.urls[1]).to.include('&search=category%20%26%20entity');
    } finally {
      rec.restore();
    }
  });

  it('shares one fetch between two elements asking for the same events', async () => {
    const rec = recordFetches();
    try {
      const wrap = await fixture<HTMLElement>(
        `<div><events-section limit="4"></events-section><events-section limit="4" no-shadow-dom></events-section></div>`,
      );
      const [a, b] = [...wrap.querySelectorAll('events-section')] as EventsSection[];
      await settled(a!);
      await settled(b!);
      expect(titles(a!)).to.deep.equal(titles(b!));
      expect(rec.urls).to.have.length(1);
    } finally {
      rec.restore();
    }
  });

  it('ignores a stale response when the attributes change mid-fetch', async () => {
    const el = await make('limit="8"');
    const hold = holdFetches((u) => u.includes('category=38740'));
    try {
      el.category = '38740';
      await el.updateComplete;
      await waitUntil(() => hold.count === 1, 'category 38740 not requested');
      el.category = '70846';
      await settled(el);
      expect(titles(el)).to.deep.equal([
        'Origami free fold session',
        'Workshop: Virtual reality object modeling to 3D print workflow',
      ]);
      hold.release(); // the stale 38740 answer lands last
      await new Promise((r) => setTimeout(r, 50));
      await el.updateComplete;
      expect(titles(el)).to.have.length(2);
      expect(titles(el)[0]).to.equal('Origami free fold session');
    } finally {
      hold.release();
      hold.restore();
    }
  });

  describe('states', () => {
    it('starts in the loading state; state is read-only', () => {
      const el = document.createElement('events-section') as EventsSection;
      expect(el.state).to.equal('loading');
      expect(() => ((el as unknown as { state: string }).state = 'ready')).to.throw();
    });

    it('says "Loading events…" and draws limit invisible placeholder cards while loading', async () => {
      const hold = holdFetches((u) => u.includes('/api/1.0/events'));
      try {
        const el = await fixture<EventsSection>('<events-section limit="5"></events-section>');
        await waitUntil(() => hold.count === 1, 'not requested');
        await el.updateComplete;
        expect(el.state).to.equal('loading');
        expect(el.hasAttribute('loading')).to.equal(true);
        expect(text(status(el))).to.equal('Loading events…');
        const ph = placeholders(el);
        expect(ph).to.have.length(5);
        for (const p of ph) {
          expect(p.getAttribute('aria-hidden')).to.equal('true');
          expect(getComputedStyle(p).visibility).to.equal('hidden');
          // Same DOM and classes as a real card, but nothing focusable.
          expect(
            p.querySelector(':scope > a.event-url > .event-title + p.event-date + p.event-time'),
          ).to.not.equal(null);
          expect(p.querySelector('[href], [tabindex], button')).to.equal(null);
        }
        await expectNoAxeViolations(el);
        hold.release();
        await settled(el);
        expect(el.state).to.equal('ready');
        expect(el.hasAttribute('loading')).to.equal(false);
        expect(placeholders(el)).to.have.length(0);
        expect(cards(el)).to.have.length(5);
      } finally {
        hold.release();
        hold.restore();
      }
    });

    it('collapses when fewer events than limit come back', async () => {
      const el = await make('category="70846" limit="8"');
      expect(cards(el)).to.have.length(2);
      expect(placeholders(el)).to.have.length(0);
    });

    it('says "No upcoming events." and keeps one card row when there are none', async () => {
      useEventsHost('events-empty.test');
      const el = await make('limit="8"');
      expect(el.state).to.equal('empty');
      expect(text(status(el))).to.equal('No upcoming events.');
      expect(cards(el)).to.have.length(0);
      expect(placeholders(el)).to.have.length(1);
      expect(el.getBoundingClientRect().height).to.be.greaterThan(50);
      await expectNoAxeViolations(el);
    });

    it('says when every event has ended (empty)', async () => {
      await setClock('2027-06-01T12:00:00Z');
      try {
        const el = await make('limit="8"');
        expect(el.state).to.equal('empty');
      } finally {
        await setClock(NOW);
      }
    });

    const retry = (el: EventsSection) =>
      root(el).querySelector<HTMLButtonElement>('[role=status] button')!;

    const focused = (el: EventsSection) =>
      el.shadowRoot ? el.shadowRoot.activeElement : document.activeElement;

    for (const mode of ['', 'no-shadow-dom no-style']) {
      it(`offers Retry when events cannot be loaded, keeping one card row (${mode || 'shadow'})`, async () => {
        useEventsHost('events-fail.test');
        const el = await make(`limit="4" ${mode}`);
        expect(el.state).to.equal('error');
        expect(text(status(el))).to.equal('Events are unavailable right now. Retry');
        expect(retry(el).matches('button.uvalib-button[type=button]')).to.equal(true);
        expect(placeholders(el)).to.have.length(1);
        expect(el.getBoundingClientRect().height).to.be.greaterThan(50);
        await expectNoAxeViolations(el);
        resetEvents();
        retry(el).focus();
        retry(el).click();
        await settled(el);
        expect(el.state).to.equal('ready');
        expect(cards(el)).to.have.length(4);
        // Focus stays in the element (the Retry button is gone): the first event.
        expect(
          focused(el) === cards(el)[0]!.querySelector('a'),
          'focus on the first event',
        ).to.equal(true);
      });
    }

    it('keeps the Retry button, disabled, while retrying, and keeps focus on it when the retry fails', async () => {
      useEventsHost('events-fail.test');
      const el = await make('limit="4"');
      eventsTiming.timeout = 200;
      eventsTiming.retries = 1;
      useEventsHost('events-hang.test');
      try {
        const button = retry(el);
        button.focus();
        button.click();
        await el.updateComplete;
        expect(retry(el) === button, 'the same button').to.equal(true);
        expect(button.getAttribute('aria-disabled')).to.equal('true');
        expect(text(button)).to.equal('Retrying…');
        expect(focused(el) === button, 'focus on the button').to.equal(true);
        expect(placeholders(el)).to.have.length(1);
        button.click(); // ignored while retrying
        await settled(el);
        expect(el.state).to.equal('error');
        expect(retry(el).hasAttribute('aria-disabled')).to.equal(false);
        expect(text(retry(el))).to.equal('Retry');
        expect(focused(el) === retry(el), 'focus on Retry').to.equal(true);
      } finally {
        resetEvents();
      }
    });

    it('moves focus to the status line when a retry finds no events', async () => {
      useEventsHost('events-fail.test');
      const el = await make('limit="4" no-shadow-dom');
      useEventsHost('events-empty.test');
      retry(el).focus();
      retry(el).click();
      await settled(el);
      expect(el.state).to.equal('empty');
      expect(status(el).getAttribute('tabindex')).to.equal('-1');
      expect(focused(el) === status(el), 'focus on the status').to.equal(true);
      await expectNoAxeViolations(el);
    });

    it('retries quietly on an interval after an error', async () => {
      eventsTiming.retryEvery = 40;
      useEventsHost('events-fail.test');
      const el = await make('limit="2"');
      expect(el.state).to.equal('error');
      resetEvents();
      eventsTiming.retryEvery = 40;
      await waitUntil(() => el.state === 'ready', 'did not recover', { timeout: 2000 });
      await el.updateComplete;
      expect(cards(el)).to.have.length(2);
      expect(text(status(el))).to.equal('');
    });

    it('refetches quietly once its events are an hour old, keeping the cards on screen', async () => {
      eventsTiming.retryEvery = 30;
      eventsTiming.maxAge = 60;
      const rec = recordFetches();
      try {
        const el = await make('limit="2"');
        expect(rec.urls).to.have.length(1);
        let emptied = false;
        const watch = setInterval(() => (emptied ||= cards(el).length !== 2), 5);
        try {
          await waitUntil(() => rec.urls.length >= 2, 'did not refetch', { timeout: 2000 });
          // A failing refetch keeps the cards too.
          useEventsHost('events-fail.test');
          const n = rec.urls.length;
          await waitUntil(() => rec.urls.length > n, 'did not refetch again', { timeout: 2000 });
          await new Promise((r) => setTimeout(r, 100));
        } finally {
          clearInterval(watch);
        }
        expect(emptied).to.equal(false);
        expect(el.state).to.equal('ready');
        expect(text(status(el))).to.equal('');
      } finally {
        rec.restore();
      }
    });

    it('stops retrying when disconnected', async () => {
      eventsTiming.retryEvery = 30;
      useEventsHost('events-fail.test');
      const el = await make('limit="2"');
      el.remove();
      const rec = recordFetches();
      try {
        await new Promise((r) => setTimeout(r, 200));
        expect(rec.urls).to.have.length(0);
      } finally {
        rec.restore();
      }
    });

    it('shows the error when a fetch times out', async () => {
      eventsTiming.timeout = 50;
      useEventsHost('events-hang.test');
      const el = await make('limit="2"');
      expect(el.state).to.equal('error');
    });
  });

  it('formats all-day, multi-day, evening and EDT events in New York time', async () => {
    const el = await make('category="38740" limit="20"');
    const rows = Object.fromEntries(
      cards(el).map((c) => [
        text(c.querySelector('.event-title')),
        [
          text(c.querySelector('.event--month')),
          text(c.querySelector('.event--day')),
          text(c.querySelector('.event--wkday')),
          text(c.querySelector('.event-time')),
        ],
      ]),
    );
    expect(rows['All-day exhibit opening']).to.deep.equal(['Nov', '20', 'Fri', 'All day']);
    expect(rows['Multi-day workshop']).to.deep.equal([
      'Nov',
      '20',
      'Fri',
      'Nov 20, 9:00 AM - Nov 21, 5:00 PM EST',
    ]);
    expect(rows['Late evening event crossing UTC midnight']).to.deep.equal([
      'Nov',
      '23',
      'Mon',
      '8:30 PM - 9:30 PM EST',
    ]);
    expect(rows['Event after DST starts']).to.deep.equal([
      'Mar',
      '15',
      'Mon',
      '10:00 AM - 11:00 AM EDT',
    ]);
    // One date stack per card, even for the multi-day event.
    for (const c of cards(el)) expect(c.querySelectorAll('.event--day')).to.have.length(1);
  });

  describe('layout stability', () => {
    /**
     * Enough of the Drupal theme (uvalib-drupal-theme scss/base/_spacing.scss and
     * layouts/_event-container.scss) to lay out light no-style cards as library.virginia.edu
     * does: its 17px root, heading margins (h3 3rem, h4 1rem; .event-title extends .h6,
     * which sets no top margin), paragraph padding and the event grid.
     */
    const DRUPAL_CSS = `
      html { font-size: 17px; }
      h1, h2, h3 { margin-top: 3rem; margin-bottom: 1rem; }
      h4, h5 { margin-top: 1rem; margin-bottom: 0.5rem; }
      p { padding-block-end: 1rem; }
      .event-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; }
      .event-container .event-url { display: grid; grid-template-columns: .25fr 1fr;
        grid-template-rows: 1fr .5fr; gap: 1rem; min-height: 9rem; }
      .event-container .event-date { grid-area: 1 / 1 / 3 / 2; display: flex; flex-direction: column; }
      .event-container .event-title { grid-area: 1 / 2 / 2 / 3; padding: 1rem 1rem 0 0; margin-bottom: 0; }
      .event-container .event-time { grid-area: 2 / 2 / 3 / 3; padding: 0 1rem 1rem 0; }
      @media (max-width: 992px) { .event-container { grid-template-columns: 1fr; } }`;

    /**
     * The element's height with its placeholders (the request held) and loaded, in a
     * `width`-px wrapper (or the page's width) with `css` added to the page and the viewport
     * at `viewport` px wide.
     */
    async function heights(attrs: string, { css = '', width = 0, viewport = 800 } = {}) {
      resetEvents(); // each call fetches (and holds) its own request
      const style = document.createElement('style');
      style.textContent = css;
      document.head.append(style);
      await setViewport({ width: viewport, height: 900 });
      const hold = holdFetches((u) => u.includes('/api/1.0/events'));
      try {
        const wrap = await fixture<HTMLElement>(
          `<div style="${width ? `width: ${width}px` : ''}"><events-section ${attrs}></events-section></div>`,
        );
        const el = wrap.firstElementChild as EventsSection;
        await waitUntil(() => hold.count === 1, 'not requested');
        await el.updateComplete;
        const placeholder = el.getBoundingClientRect().height;
        const statusBefore = status(el).getBoundingClientRect().height;
        hold.release();
        await settled(el);
        const loaded = el.getBoundingClientRect().height;
        expect(Math.abs(status(el).getBoundingClientRect().height - statusBefore)).to.be.below(1);
        return { el, placeholder, loaded };
      } finally {
        hold.release();
        hold.restore();
        style.remove();
        await setViewport({ width: 800, height: 600 });
      }
    }

    for (const [name, attrs, opts] of [
      ['styled shadow', 'limit="8"', {}],
      ['styled shadow, narrow', 'limit="8"', { width: 330 }],
      // Four columns, with all-day and multi-day events among the cards.
      ['styled shadow, 4 columns', 'limit="8" category="38740"', { width: 1320, viewport: 1400 }],
      // The narrowest four and two columns (75rem and 40rem containers), where the
      // multi-day time line wraps.
      [
        'styled shadow, narrowest 4 columns',
        'limit="8" category="38740"',
        { width: 1200, viewport: 1400 },
      ],
      ['styled shadow, 2 columns', 'limit="8" category="38740"', { width: 992, viewport: 1400 }],
      ['styled shadow, narrowest 2 columns', 'limit="8" category="38740"', { width: 640 }],
      ['Drupal light no-style, 1 column', 'limit="8" no-shadow-dom no-style', { css: DRUPAL_CSS }],
      [
        'Drupal light no-style, 4 columns',
        'limit="8" no-shadow-dom no-style',
        { css: DRUPAL_CSS, width: 1320, viewport: 1400 },
      ],
    ] as const) {
      it(`keeps its height when the events replace the placeholders (${name})`, async () => {
        const { el, placeholder, loaded } = await heights(attrs, opts);
        expect(cards(el).length).to.be.greaterThan(4);
        expect(placeholder).to.be.greaterThan(100);
        expect(Math.abs(loaded - placeholder), `${placeholder} then ${loaded}`).to.be.below(2);
      });
    }

    for (const [name, opts] of [
      ['1 column', { css: DRUPAL_CSS }],
      ['4 columns', { css: DRUPAL_CSS, width: 1320, viewport: 1400 }],
    ] as const) {
      it(`keeps the Drupal card geometry whatever heading-level is (${name})`, async () => {
        const h3 = await heights('limit="8" no-shadow-dom no-style', opts);
        const h4 = await heights('limit="8" no-shadow-dom no-style heading-level="4"', opts);
        console.log(`Drupal fixture, ${name}: h3 ${h3.loaded}px, h4 ${h4.loaded}px`);
        expect(Math.abs(h3.loaded - h4.loaded), `h3 ${h3.loaded}, h4 ${h4.loaded}`).to.be.below(1);
        // 1rem, the old h4 value (read after the page CSS is gone: 16px at the default root).
        expect(getComputedStyle(h3.el.querySelector('.event-title')!).marginTop).to.equal('16px');
      });
    }

    it('reserves --events-section-min-height only while it first loads', async () => {
      const hold = holdFetches((u) => u.includes('/api/1.0/events'));
      try {
        const el = await fixture<EventsSection>(
          '<events-section limit="1" style="--events-section-min-height: 900px"></events-section>',
        );
        await waitUntil(() => hold.count === 1, 'not requested');
        await el.updateComplete;
        expect(el.getBoundingClientRect().height).to.be.at.least(900);
        hold.release();
        await settled(el);
        expect(el.hasAttribute('loading')).to.equal(false);
        expect(el.getBoundingClientRect().height).to.be.below(900);
      } finally {
        hold.release();
        hold.restore();
      }
    });
  });

  describe('forced colors', () => {
    afterEach(() => emulateMedia({ forcedColors: 'none' }));

    for (const [mode, attrs] of [
      ['shadow', ''],
      ['light', 'no-shadow-dom'],
    ] as const) {
      it(`${mode}: cards keep a visible border, readable text and a focus ring`, async () => {
        await emulateMedia({ forcedColors: 'active' });
        expect(matchMedia('(forced-colors: active)').matches).to.equal(true);
        const el = await make(`limit="2" ${attrs}`);
        const a = root(el).querySelector<HTMLElement>('.event-url')!;
        const cs = getComputedStyle(a);
        expect(cs.borderTopStyle).to.equal('solid');
        expect(parseFloat(cs.borderTopWidth)).to.be.at.least(1);
        expect(cs.borderTopColor).to.not.equal(cs.backgroundColor);
        const date = root(el).querySelector('.event-date')!;
        const day = root(el).querySelector('.event--day')!;
        expect(getComputedStyle(day).color).to.not.equal(getComputedStyle(date).backgroundColor);
        expect(getComputedStyle(root(el).querySelector('.event-time')!).color).to.not.equal(
          cs.backgroundColor,
        );
        await sendKeys({ press: 'Tab' }); // make the next focus keyboard focus
        a.focus();
        expect(getComputedStyle(a).outlineStyle).to.not.equal('none');
        expect(parseFloat(getComputedStyle(a).outlineWidth)).to.be.at.least(2);
        await expectNoAxeViolations(el);
      });
    }
  });

  it('exposes the shared endpoints as a static accessor that writes through', () => {
    const ctor = customElements.get('events-section') as unknown as {
      endpoints: Partial<typeof eventsEndpoints>;
    };
    expect(ctor).to.equal(EventsSection);
    expect(ctor.endpoints).to.equal(eventsEndpoints);
    ctor.endpoints = { events: 'https://events-empty.test/api/1.0/events?key=x' };
    expect(eventsEndpoints.events).to.equal('https://events-empty.test/api/1.0/events?key=x');
    expect(eventsEndpoints.search).to.include('cal.lib.virginia.edu');
  });

  it('defining the tag again is a no-op', () => {
    expect(() => define('events-section', class extends EventsSection {})).to.not.throw();
    expect(customElements.get('events-section')).to.equal(EventsSection);
  });
});
