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
import '../src/components/uvalib-card/uvalib-card.js';
import '../src/components/uvalib-card-grid/uvalib-card-grid.js';
import '../src/components/uvalib-pager/uvalib-pager.js';
import '../src/components/uvalib-contents/uvalib-contents.js';
import '../src/components/uvalib-metadata/uvalib-metadata.js';
import '../src/components/uvalib-lightbox/uvalib-lightbox.js';
import '../src/components/events-section/events-section.js';
import '../src/components/site-hours-section/site-hours-section.js';
import '../src/components/library-weekly-hours/library-weekly-hours.js';
import '../src/components/uvalib-filter/uvalib-filter.js';
import '../src/components/uvalib-date-range/uvalib-date-range.js';
import '../src/components/uvalib-tabs/uvalib-tabs.js';
import '../src/components/uvalib-combobox/uvalib-combobox.js';
import '../src/components/uvalib-image-regions/uvalib-image-regions.js';
import '../src/components/uvalib-map/uvalib-map.js';
import '../src/components/uvalib-filter-drawer/uvalib-filter-drawer.js';
import '../src/components/uvalib-back-to-top/uvalib-back-to-top.js';
import '../src/components/uvalib-dialog/uvalib-dialog.js';
import '../src/components/uvalib-citation/uvalib-citation.js';
import * as Leaflet from 'leaflet/dist/leaflet-src.esm.js';
import '../src/components/bento-box/bento-box.js';
import type { SiteHeader } from '../src/components/site-header/SiteHeader.js';
import type { SiteMainNav } from '../src/components/site-main-nav/SiteMainNav.js';
import type { SitePage } from '../src/components/site-page/SitePage.js';
import type { EventsSection } from '../src/components/events-section/EventsSection.js';
import type { SiteHoursSection } from '../src/components/site-hours-section/SiteHoursSection.js';
import type { LibraryWeeklyHours } from '../src/components/library-weekly-hours/LibraryWeeklyHours.js';
import { filterTiming, type UvalibFilter } from '../src/components/uvalib-filter/UvalibFilter.js';
import {
  dateRangeTiming,
  type UvalibDateRange,
} from '../src/components/uvalib-date-range/UvalibDateRange.js';
import type { BentoBox } from '../src/components/bento-box/BentoBox.js';
import type { BentoSection } from '../src/components/bento-box/BentoSection.js';
import type { UvalibCombobox } from '../src/components/uvalib-combobox/UvalibCombobox.js';
import type { UvalibImageRegions } from '../src/components/uvalib-image-regions/UvalibImageRegions.js';
import type { UvalibMap } from '../src/components/uvalib-map/UvalibMap.js';
import type { UvalibFilterDrawer } from '../src/components/uvalib-filter-drawer/UvalibFilterDrawer.js';
import type { UvalibBackToTop } from '../src/components/uvalib-back-to-top/UvalibBackToTop.js';
import type { UvalibDialog } from '../src/components/uvalib-dialog/UvalibDialog.js';
import {
  citationTiming,
  type UvalibCitation,
} from '../src/components/uvalib-citation/UvalibCitation.js';
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

      it('the site name, as site-name-click', async () => {
        const header = await fixture<SiteHeader>(
          `<site-header ${attr(mode)} site-name="Electronic Text Collections"></site-header>`,
        );
        await quietRender(header);
        root(header).querySelector<HTMLAnchorElement>('a.site-name')!.click();
        expect(events()).to.deep.equal([['site-header', 'site-name-click']]);
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

    describe(`uvalib-card (${mode})`, () => {
      const cardLink = (card: Element) =>
        (card.shadowRoot ?? card).querySelector<HTMLAnchorElement>('a.title-link')!;

      it('the place in the grid, or single; never the title or URL', async () => {
        const grid = await fixture<HTMLElement & { updateComplete: Promise<unknown> }>(
          `<uvalib-card-grid ${attr(mode)}>
            <uvalib-card href="#early-american-fiction"><span slot="heading">Early American Fiction</span></uvalib-card>
            <uvalib-card href="https://example.test/addison/rotunda"><span slot="heading">Rotunda at dusk</span></uvalib-card>
          </uvalib-card-grid>`,
        );
        await grid.updateComplete;
        const cards = [...grid.querySelectorAll('uvalib-card')];
        await Promise.all(
          cards.map(
            (c) => (c as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete,
          ),
        );
        await nextFrame();
        expect(rec.events, 'reported on render').to.deep.equal([]);
        cardLink(cards[1]!).click();
        cardLink(cards[0]!).dispatchEvent(
          new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }),
        );
        const alone = await fixture<HTMLElement & { updateComplete: Promise<unknown> }>(
          `<uvalib-card ${attr(mode)} href="#only"><span slot="heading">A title that must not be sent</span></uvalib-card>`,
        );
        await alone.updateComplete;
        cardLink(alone).click();
        expect(events()).to.deep.equal([
          ['uvalib-card', 'card-click', '2', 2],
          ['uvalib-card', 'card-click', '1', 1],
          ['uvalib-card', 'card-click', 'single'],
        ]);
        expect(JSON.stringify(rec.events)).to.not.match(
          /Early American|Rotunda|must not be sent|example\.test|#early|#only/,
        );
      });
    });

    describe(`uvalib-pager (${mode})`, () => {
      it('next and previous, with no page number, label or URL', async () => {
        const el = await fixture<HTMLElement & { updateComplete: Promise<unknown> }>(
          `<uvalib-pager ${attr(mode)} prev-href="#opening" prev-label="The opening chapter" next-href="#closing" next-label="What follows the fire"></uvalib-pager>`,
        );
        await quietRender(el);
        const r = root(el);
        r.querySelector<HTMLAnchorElement>('a[data-kind="next"]')!.click();
        r.querySelector<HTMLAnchorElement>('a[data-kind="previous"]')!.dispatchEvent(
          new MouseEvent('click', {
            bubbles: true,
            composed: true,
            cancelable: true,
            ctrlKey: true,
          }),
        );
        expect(events()).to.deep.equal([
          ['uvalib-pager', 'page-change', 'next'],
          ['uvalib-pager', 'page-change', 'previous'],
        ]);
        expect(JSON.stringify(rec.events)).to.not.match(
          /opening|follows the fire|#closing|#opening/,
        );
      });

      it('a numbered page, never the template', async () => {
        const el = await fixture<HTMLElement & { updateComplete: Promise<unknown> }>(
          `<uvalib-pager ${attr(mode)} page="2" pages="5" href-template="?page={page}"></uvalib-pager>`,
        );
        await quietRender(el);
        root(el).querySelector<HTMLAnchorElement>('a[data-page="3"]')!.click();
        expect(events()).to.deep.equal([['uvalib-pager', 'page-change', 'number', 3]]);
        expect(JSON.stringify(rec.events)).to.not.match(/\?page=/);
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

      it('show-all / show-fewer with the row’s place, never its label or values', async () => {
        const el = await fixture<HTMLElement & { updateComplete: Promise<unknown> }>(
          `<uvalib-metadata ${attr(mode)} list-limit="1"><dl><dt>Date</dt><dd>1836</dd><dt>Secret people</dt><dd><ul><li>Jane Roe</li><li>John Doe</li></ul></dd></dl></uvalib-metadata>`,
        );
        await quietRender(el);
        const b = root(el).querySelector<HTMLButtonElement>('dl .more')!;
        b.click();
        await el.updateComplete;
        b.click();
        await el.updateComplete;
        expect(events()).to.deep.equal([
          ['uvalib-metadata', 'show-all', 'row 2'],
          ['uvalib-metadata', 'show-fewer', 'row 2'],
        ]);
        expect(JSON.stringify(rec.events)).to.not.match(/Secret|Jane|John|people/);
      });
    });

    describe(`uvalib-lightbox (${mode})`, () => {
      const PNG =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4AWP4z8Dwn4Hh/38AD/kD/dtv74kAAAAASUVORK5CYII=';
      const shot = (caption: string, id: string) =>
        `<a href="${PNG}" data-caption="${caption}" data-id="${id}"><img alt="${caption}" width="2" height="1"></a>`;
      const clean = () => history.replaceState(null, '', location.pathname);

      beforeEach(clean);
      afterEach(clean);

      it('open, next, previous and full-size by position, never the URL or caption; nothing on render', async () => {
        const el = await fixture<HTMLElement & { updateComplete: Promise<unknown> }>(
          `<uvalib-lightbox ${attr(mode)}>${shot('Page one', '1')}${shot('Page two', '2')}</uvalib-lightbox>`,
        );
        await quietRender(el);
        const links = [...el.querySelectorAll('a')];
        links[0]!.click();
        await el.updateComplete;
        const r = root(el);
        r.querySelector<HTMLButtonElement>('button.next')!.click();
        r.querySelector<HTMLButtonElement>('button.prev')!.click();
        r.querySelector<HTMLAnchorElement>('a.full')!.click();
        expect(events()).to.deep.equal([
          ['uvalib-lightbox', 'open', 'image 1', 1],
          ['uvalib-lightbox', 'next', 'image 2', 2],
          ['uvalib-lightbox', 'previous', 'image 1', 1],
          ['uvalib-lightbox', 'full-size', 'image 1', 1],
        ]);
        expect(JSON.stringify(events())).to.not.match(/data:|Page|http/);
      });

      it('a viewer restored from the URL reports nothing', async () => {
        history.replaceState(null, '', `${location.pathname}?photo=2`);
        const el = await fixture<HTMLElement & { updateComplete: Promise<unknown> }>(
          `<uvalib-lightbox ${attr(mode)} url-param="photo">${shot('Page one', '1')}${shot('Page two', '2')}</uvalib-lightbox>`,
        );
        await el.updateComplete;
        await nextFrame();
        expect((el.shadowRoot ?? el).querySelector('dialog')!.open).to.equal(true);
        expect(events(), 'reported on restore').to.deep.equal([]);
      });

      it('compare: the mode and the version place, never its label or URL; not on open or restore', async () => {
        history.replaceState(null, '', `${location.pathname}?photo=1&version=fade:40`);
        const versions = `data-versions='[{"label":"Original"},{"label":"Secret colour","href":"${PNG}"}]'`;
        const el = await fixture<HTMLElement & { updateComplete: Promise<unknown> }>(
          `<uvalib-lightbox ${attr(mode)} url-param="photo" version-param="version"><a href="${PNG}" data-id="1" ${versions}><img alt="Page one" width="2" height="1"></a></uvalib-lightbox>`,
        );
        const r = root(el);
        await waitUntil(() => r.querySelector('.compare'), 'comparison shown');
        await el.updateComplete;
        expect(events(), 'reported on restore').to.deep.equal([]);
        const seg = (name: string) =>
          [...r.querySelectorAll<HTMLButtonElement>('.compare button.seg')].find(
            (b) => b.textContent!.trim() === name,
          )!;
        seg('Switch').click();
        await el.updateComplete;
        seg('Reveal').click();
        await el.updateComplete;
        expect(events()).to.deep.equal([
          ['uvalib-lightbox', 'compare', 'switch', 1],
          ['uvalib-lightbox', 'compare', 'wipe', 2],
        ]);
        expect(JSON.stringify(events())).to.not.match(/data:|Secret|Original|Page/);
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

      it('group features: toggle, sort, clear, apply (with each change), search; never the typed text', async () => {
        const saved = { ...filterTiming };
        Object.assign(filterTiming, { announce: 20, track: 40 });
        try {
          const el = await fixture<UvalibFilter>(
            `<uvalib-filter ${attr(mode)} collapsible collapsed searchable sortable clearable apply-button></uvalib-filter>`,
          );
          Object.assign(el, { filter: facet, value: ['Map'] }); // restored: not reported
          await quietRender(el);
          const r = root(el);
          const btn = (p: string) => r.querySelector<HTMLButtonElement>(`[part=${p}]`)!;
          const box = (key: string) =>
            [...r.querySelectorAll<HTMLInputElement>('input[type=checkbox]')].find(
              (b) => b.value === key,
            )!;
          btn('toggle').click(); // open
          await el.updateComplete;
          r.querySelectorAll<HTMLInputElement>('.sort input')[1]!.click(); // name
          await el.updateComplete;
          box('Book').click();
          box('Map').click();
          await el.updateComplete;
          btn('apply').click();
          await el.updateComplete;
          const input = r.querySelector<HTMLInputElement>('[part=search]')!;
          input.value = 'Secret word';
          input.dispatchEvent(new Event('input'));
          input.value = 'o';
          input.dispatchEvent(new Event('input'));
          await waitUntil(() => JSON.stringify(events()).includes('"search"'), 'search reported');
          btn('clear').click();
          await el.updateComplete;
          btn('toggle').click(); // close
          // New data from the app: nothing.
          el.filter = { ...facet };
          el.value = [];
          await el.updateComplete;
          await nextFrame();
          expect(events()).to.deep.equal([
            ['uvalib-filter', 'toggle', 'Format', 1],
            ['uvalib-filter', 'sort', 'Format: name'],
            ['uvalib-filter', 'facet-change', 'Format: Book', 1],
            ['uvalib-filter', 'facet-change', 'Format: Map', 0],
            ['uvalib-filter', 'apply', 'Format', 2],
            ['uvalib-filter', 'search', 'Format', 4],
            ['uvalib-filter', 'clear', 'Format', 1],
            ['uvalib-filter', 'toggle', 'Format', 0],
          ]);
          expect(JSON.stringify(events())).to.not.match(/Secret/);
        } finally {
          Object.assign(filterTiming, saved);
        }
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

    describe(`uvalib-tabs (${mode})`, () => {
      const tabs = (el: Element) => [
        ...root(el).querySelectorAll<HTMLButtonElement>('[role="tab"]'),
      ];

      it('a click reports the tab label, capped, and nothing on render', async () => {
        const el = await fixture<HTMLElement & { updateComplete: Promise<unknown> }>(
          `<uvalib-tabs ${attr(mode)}>
            <section data-tab="Events" id="events"><p>Events</p></section>
            <section data-tab="News" id="news"><p>News</p></section>
          </uvalib-tabs>`,
        );
        await quietRender(el);
        tabs(el)[1]!.click();
        await el.updateComplete;
        const long = 'L'.repeat(120);
        const named = await fixture<HTMLElement & { updateComplete: Promise<unknown> }>(
          `<uvalib-tabs ${attr(mode)}>
            <section data-tab="Other" id="other"><p>Other</p></section>
            <section data-tab="${long}" id="long"><p>Long</p></section>
          </uvalib-tabs>`,
        );
        await named.updateComplete;
        tabs(named)[1]!.click();
        await named.updateComplete;
        const quiet = await fixture(
          `<uvalib-tabs ${attr(mode)} no-analytics>
            <section data-tab="Events" id="quiet-events"><p>Events</p></section>
            <section data-tab="News" id="quiet-news"><p>News</p></section>
          </uvalib-tabs>`,
        );
        tabs(quiet)[1]!.click();
        expect(events()).to.deep.equal([
          ['uvalib-tabs', 'change', 'News'],
          ['uvalib-tabs', 'change', long.slice(0, 100)],
        ]);
      });
    });

    describe(`uvalib-combobox (${mode})`, () => {
      it('choosing reports the label and position, clearing the label; never the text', async () => {
        const el = await fixture<UvalibCombobox>(
          `<uvalib-combobox ${attr(mode)} label="Photographer"></uvalib-combobox>`,
        );
        el.items = ['Ada Marsh', 'Bruno Stone', 'Clara Stone'];
        await quietRender(el);
        const input = root(el).querySelector<HTMLInputElement>('[role="combobox"]')!;
        input.focus();
        input.value = 'stone';
        input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        await el.updateComplete;
        root(el).querySelectorAll<HTMLElement>('[role="option"]')[1]!.click();
        await el.updateComplete;
        root(el).querySelector<HTMLButtonElement>('button.clear')!.click();
        await el.updateComplete;
        expect(events()).to.deep.equal([
          ['uvalib-combobox', 'select', 'Photographer', 2],
          ['uvalib-combobox', 'clear', 'Photographer'],
        ]);
        expect(JSON.stringify(rec.events)).to.not.include('Stone');
        input.blur();
      });
    });

    describe(`uvalib-image-regions (${mode})`, () => {
      it('an outline click reports the list label and the number, never the region label', async () => {
        const el = await fixture<UvalibImageRegions>(
          `<uvalib-image-regions ${attr(mode)} label="People"><img alt="A group" width="40" height="30"><ol><li data-xywh="percent:0,0,50,50"><a href="#a">Ada Marsh</a></li><li data-xywh="percent:50,50,50,50">Bruno Stone</li></ol></uvalib-image-regions>`,
        );
        await quietRender(el);
        // Focus (a highlight) reports nothing.
        el.querySelector<HTMLAnchorElement>('a')!.focus();
        el.querySelector<HTMLAnchorElement>('a')!.blur();
        root(el).querySelectorAll<HTMLElement>('.overlay > .region')[1]!.click();
        expect(events()).to.deep.equal([['uvalib-image-regions', 'select', 'People', 2]]);
        expect(JSON.stringify(rec.events)).to.not.include('Stone');
        (document.activeElement as HTMLElement | null)?.blur();
      });
    });

    describe(`uvalib-map (${mode})`, () => {
      it('choosing a marker reports the label and position, a zoom button the level; never a place', async () => {
        const el = await fixture<UvalibMap>(
          `<uvalib-map ${attr(mode)} label="Places on Grounds" count-label="photos"></uvalib-map>`,
        );
        el.leaflet = Leaflet;
        el.items = [
          { name: 'The Rotunda', lat: 38.0356, lng: -78.5034, count: 2702, href: '/rotunda' },
          { name: 'Scott Stadium', lat: 38.0311, lng: -78.5137, count: 40 },
        ];
        await quietRender(el);
        const markers = root(el).querySelectorAll<HTMLElement>('.uvalib-map-marker .marker');
        markers[1]!.click();
        markers[0]!.click();
        const zoom = el as unknown as { map: { getZoom(): number } };
        const level = zoom.map.getZoom();
        root(el).querySelector<HTMLAnchorElement>('.leaflet-control-zoom-in')!.click();
        await waitUntil(() => events().length === 3, 'no zoom', { timeout: 3000 });
        expect(events()).to.deep.equal([
          ['uvalib-map', 'select', 'Places on Grounds', 2],
          ['uvalib-map', 'select', 'Places on Grounds', 1],
          ['uvalib-map', 'zoom', 'Places on Grounds', level + 1],
        ]);
        const sent = JSON.stringify(rec.events);
        for (const text of ['Rotunda', 'Stadium', '38.0', '/rotunda'])
          expect(sent).to.not.include(text);
      });

      it('choosing a group of places reports expand with how many; never a place', async () => {
        const el = await fixture<UvalibMap>(
          `<uvalib-map ${attr(mode)} label="Places on Grounds" count-label="photos"></uvalib-map>`,
        );
        el.leaflet = Leaflet;
        el.items = [
          { name: 'The Rotunda', lat: 38.0356, lng: -78.5034, count: 2702, href: '/rotunda' },
          { name: 'Dome Room', lat: 38.0356, lng: -78.5034, count: 600, href: '/dome' },
          { name: 'Scott Stadium', lat: 38.0311, lng: -78.5137, count: 40 },
        ];
        await quietRender(el);
        root(el).querySelector<HTMLElement>('.uvalib-map-marker.is-group .marker')!.click();
        expect(events()).to.deep.equal([['uvalib-map', 'expand', 'Places on Grounds', 2]]);
        const sent = JSON.stringify(rec.events);
        for (const text of ['Rotunda', 'Dome', '38.0', '/rotunda'])
          expect(sent).to.not.include(text);
        (document.activeElement as HTMLElement | null)?.blur();
      });
    });

    describe(`uvalib-filter-drawer (${mode})`, () => {
      afterEach(() => setViewport({ width: 800, height: 600 }));

      it('open and close by the visitor, with the drawer label; never what is typed', async () => {
        await setViewport({ width: 390, height: 700 });
        const el = await fixture<UvalibFilterDrawer>(
          `<uvalib-filter-drawer ${attr(mode)} label="Search and filters"><input aria-label="Search" value="Ada Marsh" /></uvalib-filter-drawer>`,
        );
        await quietRender(el);
        root(el).querySelector<HTMLButtonElement>('button.fd-toggle')!.click();
        await el.updateComplete;
        root(el).querySelector<HTMLButtonElement>('button.fd-close')!.click();
        expect(events()).to.deep.equal([
          ['uvalib-filter-drawer', 'open', 'Search and filters'],
          ['uvalib-filter-drawer', 'close', 'Search and filters'],
        ]);
        expect(JSON.stringify(rec.events)).to.not.include('Ada');
      });
    });

    describe(`uvalib-dialog (${mode})`, () => {
      it('open and close by the visitor, with the dialog label; never its content or what is typed', async () => {
        const wrap = await fixture<HTMLDivElement>(
          `<div><button type="button" data-uvalib-dialog="cat-dlg">Email</button>
            <uvalib-dialog ${attr(mode)} id="cat-dlg" label="Email this citation">
              <form method="dialog"><input aria-label="Email" value="ada@example.com" /><button value="send">Send</button></form>
            </uvalib-dialog></div>`,
        );
        const el = wrap.querySelector<UvalibDialog>('uvalib-dialog')!;
        await quietRender(el);
        el.show(); // script opens and closes are not reported
        await el.updateComplete;
        el.close();
        expect(rec.events).to.deep.equal([]);
        wrap.querySelector<HTMLButtonElement>('[data-uvalib-dialog]')!.click();
        await el.updateComplete;
        wrap.querySelector<HTMLButtonElement>('button[value="send"]')!.click();
        expect(events()).to.deep.equal([
          ['uvalib-dialog', 'open', 'Email this citation'],
          ['uvalib-dialog', 'close', 'Email this citation'],
        ]);
        expect(JSON.stringify(rec.events)).to.not.include('ada');
        (document.activeElement as HTMLElement | null)?.blur();
      });
    });

    describe(`uvalib-back-to-top (${mode})`, () => {
      it('a click reports the fixed verb only', async () => {
        const wrap = await fixture<HTMLDivElement>(
          `<div><h1>Minutes</h1><uvalib-back-to-top ${attr(mode)}></uvalib-back-to-top></div>`,
        );
        const el = wrap.querySelector<UvalibBackToTop>('uvalib-back-to-top')!;
        await quietRender(el);
        root(el).querySelector<HTMLButtonElement>('button.btt-button')!.click();
        expect(events()).to.deep.equal([['uvalib-back-to-top', 'click']]);
        (document.activeElement as HTMLElement | null)?.blur();
      });
    });

    describe(`uvalib-citation (${mode})`, () => {
      it('format (settled), copy and download with the format name, never the citation', async () => {
        const restore = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
        Object.defineProperty(navigator, 'clipboard', {
          value: { writeText: () => Promise.resolve(), write: () => Promise.resolve() },
          configurable: true,
        });
        const settle = citationTiming.settle;
        citationTiming.settle = 20;
        try {
          const el = await fixture<UvalibCitation>(
            `<uvalib-citation ${attr(mode)} ris-href="/secret.ris"><blockquote data-format="MLA">Secret, <i>Title</i>.</blockquote><blockquote data-format="APA">Secret (1836). <i>Title</i>.</blockquote></uvalib-citation>`,
          );
          await quietRender(el);
          root(el).querySelectorAll<HTMLInputElement>('input[type=radio]')[1]!.click();
          await waitUntil(() => events().length === 1, 'no format event');
          root(el).querySelector<HTMLButtonElement>('.actions button')!.click();
          root(el).querySelector<HTMLAnchorElement>('.actions a[download]')!.click();
          expect(events()).to.deep.equal([
            ['uvalib-citation', 'format', 'APA'],
            ['uvalib-citation', 'copy', 'APA'],
            ['uvalib-citation', 'download', 'ris'],
          ]);
          expect(JSON.stringify(rec.events)).to.not.match(/Secret|Title|secret/);
        } finally {
          citationTiming.settle = settle;
          if (restore) Object.defineProperty(navigator, 'clipboard', restore);
          else delete (navigator as { clipboard?: unknown }).clipboard;
        }
      });
    });

    describe(`uvalib-pager load-more (${mode})`, () => {
      it('Load more reports the next page and not the label', async () => {
        const el = await fixture<HTMLElement & { updateComplete: Promise<unknown> }>(
          `<uvalib-pager ${attr(mode)} mode="load-more" shown="2" total="9" page="2" label="Stories about the Lawn"></uvalib-pager>`,
        );
        await quietRender(el);
        root(el).querySelector('button')!.click();
        expect(events()).to.deep.equal([['uvalib-pager', 'load-more', '', 3]]);
        expect(JSON.stringify(rec.events)).to.not.include('Stories about the Lawn');
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
