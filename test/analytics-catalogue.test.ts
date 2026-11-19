// The analytics catalogue (analytics v2): each component reports the visitor's actions and
// its failures, never on render, re-render or restore, with fixed non-personal names. These
// tests listen on `document` with no analytics element, so nothing is loaded or sent; every
// link click is cancelled at `document` so the test page never navigates.
import { expect, fixture, nextFrame, waitUntil } from '@open-wc/testing';
import { setViewport } from '@web/test-runner-commands';
import '../src/components/site-header/site-header.js';
import '../src/components/site-main-nav/site-main-nav.js';
import '../src/components/site-footer/site-footer.js';
import '../src/components/site-page/site-page.js';
import '../src/components/uvalib-breadcrumbs/uvalib-breadcrumbs.js';
import '../src/components/uvalib-contents/uvalib-contents.js';
import '../src/components/uvalib-metadata/uvalib-metadata.js';
import '../src/components/events-section/events-section.js';
import '../src/components/site-hours-section/site-hours-section.js';
import '../src/components/library-weekly-hours/library-weekly-hours.js';
import '../src/components/uvalib-filter/uvalib-filter.js';
import '../src/components/uvalib-date-range/uvalib-date-range.js';
import '../src/components/bento-box/bento-box.js';
import type { SiteHeader } from '../src/components/site-header/SiteHeader.js';
import type { SiteMainNav } from '../src/components/site-main-nav/SiteMainNav.js';
import type { SitePage } from '../src/components/site-page/SitePage.js';
import type { EventsSection } from '../src/components/events-section/EventsSection.js';
import type { SiteHoursSection } from '../src/components/site-hours-section/SiteHoursSection.js';
import type { LibraryWeeklyHours } from '../src/components/library-weekly-hours/LibraryWeeklyHours.js';
import type { UvalibFilter } from '../src/components/uvalib-filter/UvalibFilter.js';
import {
  dateRangeTiming,
  type UvalibDateRange,
} from '../src/components/uvalib-date-range/UvalibDateRange.js';
import type { BentoBox } from '../src/components/bento-box/BentoBox.js';
import type { BentoSection } from '../src/components/bento-box/BentoSection.js';
import { recordAnalytics } from './helpers/analytics.js';
import { resetEvents, useEventsHost } from './helpers/events.js';
import { resetHours, setClock, settled, useHoursHost } from './helpers/hours.js';
import { resetBento, useBentoHost } from './helpers/bento.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const MODES = ['shadow', 'light'] as const;
const attr = (mode: (typeof MODES)[number]) => (mode === 'light' ? 'no-shadow-dom' : '');

let rec: ReturnType<typeof recordAnalytics>;
const events = () => rec.of('uvalib-analytics-event').map((d) => d.event);

/** A link click would navigate the test page: cancel it once it reaches `document`. */
const cancel = (e: Event) => {
  if (e.composedPath().some((n) => n instanceof HTMLAnchorElement)) e.preventDefault();
};

/** Wait for `el` (and Lit) to render, then check nothing was reported for it. */
async function quietRender(el: { updateComplete: Promise<unknown> }) {
  await el.updateComplete;
  await nextFrame();
  expect(rec.events, 'reported on render').to.deep.equal([]);
}

const link = (scope: ParentNode, text: string) =>
  [...scope.querySelectorAll<HTMLAnchorElement>('a')].find((a) => a.textContent!.trim() === text)!;

describe('analytics catalogue', () => {
  beforeEach(() => {
    rec = recordAnalytics();
    document.addEventListener('click', cancel);
  });
  afterEach(() => {
    rec.restore();
    document.removeEventListener('click', cancel);
  });

  for (const mode of MODES) {
    describe(`site-header (${mode})`, () => {
      afterEach(() => setViewport({ width: 800, height: 600 }));

      it('utility links by label, the logo, the Menu opening; main-nav links only once', async () => {
        await setViewport({ width: 390, height: 800 });
        const header = await fixture<SiteHeader>(`<site-header ${attr(mode)}></site-header>`);
        await quietRender(header);
        const r = root(header);
        link(r.querySelector('nav.inline')!, 'Hours').click();
        r.querySelector<HTMLAnchorElement>('a.logo')!.click();
        const toggle = r.querySelector<HTMLButtonElement>('.menu-toggle')!;
        toggle.click(); // opens
        await waitUntil(() => events().length === 3, 'no menu-open');
        link(r.querySelector('nav.menu')!, 'Give').click(); // closes the menu: no event
        await nextFrame();
        toggle.click();
        await waitUntil(() => events().length === 5, 'no second menu-open');
        // A main-navigation link: reported by site-main-nav, not by the header.
        const nav = r.querySelector<SiteMainNav>('site-main-nav.accordion')!;
        await nav.updateComplete;
        const navRoot = root(nav);
        navRoot.querySelector<HTMLButtonElement>('button.toggle')!.click();
        await nav.updateComplete;
        const group = navRoot.querySelector('button.toggle')!.textContent!.trim();
        const navLink = navRoot.querySelector<HTMLAnchorElement>('.panel a')!;
        navLink.click();
        expect(events()).to.deep.equal([
          ['site-header', 'link-click', 'Hours'],
          ['site-header', 'logo-click'],
          ['site-header', 'menu-open'],
          ['site-header', 'link-click', 'Give'],
          ['site-header', 'menu-open'],
          ['site-main-nav', 'menu-open', group],
          ['site-main-nav', 'link-click', `${group} > ${navLink.textContent!.trim()}`],
        ]);
      });

      it("a site's own links by their label", async () => {
        const header = await fixture<SiteHeader>(
          `<site-header ${attr(mode)}><a slot="site-links" href="/x">Our   page</a></site-header>`,
        );
        await quietRender(header);
        link(root(header).querySelector('nav.inline')!, 'Our page').click();
        expect(events()).to.deep.equal([['site-header', 'link-click', 'Our page']]);
      });
    });

    describe(`site-page skip link (${mode})`, () => {
      it('reported once, as site-header skip-link', async () => {
        const page = await fixture<SitePage>(
          `<site-page ${attr(mode)} no-alerts><h1>Page</h1></site-page>`,
        );
        await page.updateComplete;
        const header = (page.shadowRoot ?? page).querySelector<SiteHeader>('site-header')!;
        await quietRender(header);
        (page.shadowRoot ?? page).querySelector<HTMLAnchorElement>('a.skip-link')!.click();
        expect(events()).to.deep.equal([['site-header', 'skip-link']]);
      });
    });

    describe(`site-main-nav (${mode})`, () => {
      it('a link in a group: `Group > Link`', async () => {
        const nav = await fixture<SiteMainNav>(`<site-main-nav ${attr(mode)}></site-main-nav>`);
        await quietRender(nav);
        const r = root(nav);
        const toggles = [...r.querySelectorAll<HTMLButtonElement>('button.toggle')];
        toggles[1]!.click();
        await nav.updateComplete;
        const panel = r.querySelectorAll('.panel')[1]!;
        const a = panel.querySelectorAll<HTMLAnchorElement>('a')[1]!;
        a.click();
        const group = toggles[1]!.textContent!.trim();
        expect(events()).to.deep.equal([
          ['site-main-nav', 'menu-open', group],
          ['site-main-nav', 'link-click', `${group} > ${a.textContent!.trim()}`],
        ]);
      });

      it('a top-level link: its label alone', async () => {
        const nav = await fixture<SiteMainNav>(`<site-main-nav ${attr(mode)}></site-main-nav>`);
        nav.items = [{ label: 'Hours', href: '/hours' }];
        await quietRender(nav);
        root(nav).querySelector<HTMLAnchorElement>('a.top-link')!.click();
        expect(events()).to.deep.equal([['site-main-nav', 'link-click', 'Hours']]);
      });
    });

    describe(`site-footer (${mode})`, () => {
      it('Column: Link; phone, email and social by kind; not the pre-footer', async () => {
        const footer = await fixture<HTMLElement & { updateComplete: Promise<unknown> }>(
          `<site-footer ${attr(mode)}><div slot="pre-footer"><a href="/mine">Mine</a></div></site-footer>`,
        );
        await quietRender(footer);
        const r = root(footer);
        link(r, 'Get help').click();
        link(r, 'Staff directory').click();
        link(r, 'Ask a Librarian').click();
        r.querySelector<HTMLAnchorElement>('a[href^="tel:"]')!.click();
        r.querySelector<HTMLAnchorElement>('a[href^="mailto:"]')!.click();
        r.querySelector<HTMLAnchorElement>('a[aria-label$="Instagram"]')!.click();
        footer.querySelector<HTMLAnchorElement>('a[href="/mine"]')!.click();
        expect(events()).to.deep.equal([
          ['site-footer', 'link-click', 'Using the Library: Get help'],
          ['site-footer', 'link-click', 'About: Staff directory'],
          ['site-footer', 'link-click', 'Contact us: Ask a Librarian'],
          ['site-footer', 'link-click', 'Contact us: Phone'],
          ['site-footer', 'link-click', 'Contact us: Email'],
          ['site-footer', 'link-click', 'Social: Instagram'],
        ]);
        expect(JSON.stringify(rec.events)).to.not.match(/@|434|http|\//);
      });
    });

    describe(`uvalib-breadcrumbs (${mode})`, () => {
      it('the level, never the label or URL', async () => {
        const el = await fixture<HTMLElement & { updateComplete: Promise<unknown> }>(
          `<uvalib-breadcrumbs ${attr(mode)}><a href="/">Home</a><a href="/research">Research</a><span>Data</span></uvalib-breadcrumbs>`,
        );
        await quietRender(el);
        const links = root(el).querySelectorAll<HTMLAnchorElement>('nav a');
        links[1]!.click();
        links[0]!.dispatchEvent(
          new MouseEvent('click', {
            bubbles: true,
            composed: true,
            ctrlKey: true,
            cancelable: true,
          }),
        );
        expect(events()).to.deep.equal([
          ['uvalib-breadcrumbs', 'link-click', 'level 2', 2],
          ['uvalib-breadcrumbs', 'link-click', 'level 1', 1],
        ]);
      });
    });

    describe(`uvalib-contents (${mode})`, () => {
      afterEach(() => setViewport({ width: 800, height: 600 }));

      it('the level and the toggle, never the label or URL', async () => {
        await setViewport({ width: 600, height: 800 });
        const el = await fixture<HTMLElement & { updateComplete: Promise<unknown> }>(
          `<uvalib-contents ${attr(mode)} current="/b"><ol><li><a href="/a">Alpha</a><ol><li><a href="/b">Beta</a></li></ol></li></ol></uvalib-contents>`,
        );
        await quietRender(el);
        const toggle = root(el).querySelector<HTMLButtonElement>('nav button.toggle')!;
        toggle.click();
        await el.updateComplete;
        const links = root(el).querySelectorAll<HTMLAnchorElement>('nav a');
        links[1]!.click();
        links[0]!.click();
        toggle.click();
        expect(events()).to.deep.equal([
          ['uvalib-contents', 'toggle', 'open'],
          ['uvalib-contents', 'link-click', 'level 2', 2],
          ['uvalib-contents', 'link-click', 'level 1', 1],
          ['uvalib-contents', 'toggle', 'close'],
        ]);
        expect(JSON.stringify(rec.events)).to.not.match(/Alpha|Beta|\//);
      });
    });

    describe(`uvalib-metadata (${mode})`, () => {
      it('copy-citation only, never the citation; downloads are left to Matomo', async () => {
        const restore = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
        Object.defineProperty(navigator, 'clipboard', {
          value: { writeText: () => Promise.resolve() },
          configurable: true,
        });
        try {
          const el = await fixture<HTMLElement & { updateComplete: Promise<unknown> }>(
            `<uvalib-metadata ${attr(mode)} citation="Secret title, 1836"><dl><dt>Download</dt><dd><a href="x.epub" download data-size="1 KB">EPUB</a></dd></dl></uvalib-metadata>`,
          );
          await quietRender(el);
          root(el).querySelector<HTMLAnchorElement>('dl a[download]')!.click();
          root(el).querySelector<HTMLButtonElement>('dl button')!.click();
          expect(events()).to.deep.equal([['uvalib-metadata', 'copy-citation']]);
          expect(JSON.stringify(rec.events)).to.not.match(/Secret|epub/);
        } finally {
          if (restore) Object.defineProperty(navigator, 'clipboard', restore);
          else delete (navigator as { clipboard?: unknown }).clipboard;
        }
      });
    });

    describe(`uvalib-filter (${mode})`, () => {
      const facet = {
        name: 'format',
        title: 'Format',
        position: 0,
        buckets: ['Book', 'Video', 'Map', 'Score', 'Audio'].map((key, i) => ({
          key,
          doc_count: i + 1,
          selected: false,
        })),
      };
      it('facet and scope changes with 1/0, see more and less; not on a restored value', async () => {
        const el = await fixture<UvalibFilter>(`<uvalib-filter ${attr(mode)}></uvalib-filter>`);
        Object.assign(el, {
          filter: facet,
          limit: 2,
          value: ['Video'], // restored from the search state: not reported
          scopes: [{ value: 'staff', label: 'Staff' }],
          scopeValue: ['staff'],
        });
        await quietRender(el);
        const r = root(el);
        const box = (n: number) => r.querySelectorAll<HTMLInputElement>('input[type=checkbox]')[n]!;
        box(0).click();
        await el.updateComplete;
        box(1).click(); // Video, restored as checked: now unchecked
        await el.updateComplete;
        r.querySelector<HTMLButtonElement>('button.scope')!.click(); // unpress
        await el.updateComplete;
        r.querySelector<HTMLButtonElement>('button.scope')!.click(); // press
        await el.updateComplete;
        r.querySelector<HTMLButtonElement>('button[part=see-more]')!.click();
        await el.updateComplete;
        r.querySelector<HTMLButtonElement>('button[part=see-less]')!.click();
        await el.updateComplete;
        // New data from the app (BOV re-sets it after each search): nothing.
        el.filter = { ...facet };
        await quietRenderSince(el, 6);
        expect(events()).to.deep.equal([
          ['uvalib-filter', 'facet-change', 'Format: Book', 1],
          ['uvalib-filter', 'facet-change', 'Format: Video', 0],
          ['uvalib-filter', 'scope-change', 'Staff', 0],
          ['uvalib-filter', 'scope-change', 'Staff', 1],
          ['uvalib-filter', 'see-more', 'Format'],
          ['uvalib-filter', 'see-less', 'Format'],
        ]);
      });
    });

    describe(`uvalib-date-range (${mode})`, () => {
      const saved = dateRangeTiming.debounce;
      before(() => (dateRangeTiming.debounce = 60));
      after(() => (dateRangeTiming.debounce = saved));
      const sliders = (el: Element) =>
        root(el).querySelectorAll<HTMLInputElement>('input[type=range]');
      const slide = (s: HTMLInputElement, v: string) => {
        s.value = v;
        s.dispatchEvent(new Event('input', { bubbles: true }));
      };

      it('one event per settled change (debounced), none when it ends where it started', async () => {
        const el = await fixture<UvalibDateRange>(
          `<uvalib-date-range ${attr(mode)} min="1900-01-01" max="2000-12-31"></uvalib-date-range>`,
        );
        el.value = ['1950-01-01', '1990-12-31']; // set by the app: not reported
        await quietRender(el);
        for (const y of ['1951', '1955', '1960']) {
          slide(sliders(el)[0]!, y);
          await el.updateComplete;
        }
        expect(events()).to.deep.equal([]);
        await waitUntil(() => events().length === 1, 'no range-change');
        // Moved and back again: no change to report.
        slide(sliders(el)[1]!, '1980');
        await el.updateComplete;
        slide(sliders(el)[1]!, '1990');
        await el.updateComplete;
        await new Promise((r) => setTimeout(r, 150));
        // A typed date.
        const from = root(el).querySelector<HTMLInputElement>('input[type=date]')!;
        from.value = '1940-05-05';
        from.dispatchEvent(new Event('change', { bubbles: true }));
        await waitUntil(() => events().length === 2, 'no range-change for the date');
        expect(events()).to.deep.equal([
          ['uvalib-date-range', 'range-change', '1960–1990'],
          ['uvalib-date-range', 'range-change', '1940–1990'],
        ]);
      });
    });
  }

  /** Nothing new after `n` events once `el` re-renders. */
  async function quietRenderSince(el: { updateComplete: Promise<unknown> }, n: number) {
    await el.updateComplete;
    await nextFrame();
    expect(rec.events, 'reported on re-render').to.have.length(n);
  }

  describe('events-section', () => {
    before(() => setClock('2026-11-16T14:00:00Z'));
    beforeEach(resetEvents);
    after(resetEvents);
    const load = async (attrs: string) => {
      const el = await fixture<EventsSection>(`<events-section ${attrs}></events-section>`);
      await el.updateComplete;
      await waitUntil(() => el.state !== 'loading', 'still loading', { timeout: 4000 });
      await el.updateComplete;
      return el;
    };

    for (const mode of MODES) {
      it(`event-click: the category or all, and the position (${mode})`, async () => {
        const el = await load(attr(mode));
        await quietRender(el);
        const cards = root(el).querySelectorAll<HTMLElement>('.event-container > .event');
        cards[2]!.querySelector<HTMLElement>('.event-title')!.click();
        const cat = await load(`${attr(mode)} category="70846"`);
        root(cat).querySelector<HTMLAnchorElement>('.event-url')!.click();
        expect(events()).to.deep.equal([
          ['events-section', 'event-click', 'all', 3],
          ['events-section', 'event-click', '70846', 1],
        ]);
      });
    }

    it('error: once per element, however many retries fail', async () => {
      useEventsHost('events-fail.test');
      const el = await load('');
      expect(el.state).to.equal('error');
      root(el).querySelector<HTMLButtonElement>('.events-status button')!.click();
      await waitUntil(() => el.state === 'error' && !root(el).querySelector('[aria-disabled]'));
      await el.updateComplete;
      expect(events()).to.deep.equal([['events-section', 'error', 'events-load']]);
    });
  });

  describe('hours', () => {
    before(() => setClock('2026-11-14T17:00:00Z'));
    beforeEach(resetHours);
    after(resetHours);

    for (const mode of MODES) {
      it(`site-hours-section: See all hours (${mode})`, async () => {
        const el = await fixture<SiteHoursSection>(
          `<site-hours-section ${attr(mode)}></site-hours-section>`,
        );
        await settled(el);
        await quietRender(el);
        root(el).querySelector<HTMLAnchorElement>('.hours-see-all a')!.click();
        expect(events()).to.deep.equal([['site-hours-section', 'link-click', 'See all hours']]);
      });

      it(`library-weekly-hours: week-change next and previous (${mode})`, async () => {
        const el = await fixture<LibraryWeeklyHours>(
          `<library-weekly-hours ${attr(mode)} library-slug="clemons"></library-weekly-hours>`,
        );
        await settled(el);
        await quietRender(el);
        const [prev, , next] = [
          ...root(el).querySelector('.weekly-hours-header-section')!.children,
        ];
        (next as HTMLButtonElement).click();
        await settled(el);
        (prev as HTMLButtonElement).click();
        await settled(el);
        // The app setting the week is not the visitor's.
        el.weekCount = 3;
        await settled(el);
        expect(events()).to.deep.equal([
          ['library-weekly-hours', 'week-change', 'next'],
          ['library-weekly-hours', 'week-change', 'previous'],
        ]);
      });
    }

    it('error: hours-load once per element', async () => {
      useHoursHost('hours-fail.test');
      const section = await fixture<SiteHoursSection>('<site-hours-section></site-hours-section>');
      const weekly = await fixture<LibraryWeeklyHours>(
        '<library-weekly-hours library-slug="clemons"></library-weekly-hours>',
      );
      await settled(section);
      await settled(weekly);
      root(weekly).querySelector<HTMLButtonElement>('.weekly-hours-status button')!.click();
      await settled(weekly);
      expect(events()).to.have.deep.members([
        ['site-hours-section', 'error', 'hours-load'],
        ['library-weekly-hours', 'error', 'hours-load'],
      ]);
      expect(events()).to.have.length(2);
    });
  });

  describe('bento-box', () => {
    beforeEach(resetBento);
    after(resetBento);
    const sections = (box: BentoBox) => [
      ...root(box).querySelectorAll<BentoSection<unknown>>(
        '.bs-results-container > .bs-results--block',
      ),
    ];

    it('error once per section, retry by section; no event for the failed reload', async () => {
      useBentoHost('bento-fail.test', ['guides']);
      const box = await fixture<BentoBox>('<bento-box query="test"></bento-box>');
      await box.updateComplete;
      await waitUntil(() => sections(box).every((s) => s.state !== 'loading'), 'loading', {
        timeout: 4000,
      });
      const guides = sections(box).find((s) => s.analyticsName === 'Subject guides')!;
      expect(guides.state).to.equal('error');
      root(guides).querySelector<HTMLButtonElement>('.bs-results--message button')!.click();
      await waitUntil(
        () => guides.state === 'error' && !root(guides).querySelector('[aria-disabled]'),
      );
      expect(events()).to.deep.equal([
        ['bento-box', 'error', 'section-load: Subject guides'],
        ['bento-box', 'retry', 'Subject guides'],
      ]);
    });
  });
});
