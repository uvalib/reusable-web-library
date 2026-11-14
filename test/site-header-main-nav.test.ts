import { expect, fixture, nextFrame, oneEvent } from '@open-wc/testing';
import { setViewport } from '@web/test-runner-commands';
import '../src/components/site-header/site-header.js';
import type { SiteHeader } from '../src/components/site-header/SiteHeader.js';
import type { SiteMainNav } from '../src/components/site-main-nav/SiteMainNav.js';
import { mainNavTiming } from '../src/components/site-main-nav/main-nav-items.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { HEADER_SNAPSHOT, normalizeMarkup } from './helpers/header-snapshot.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const ALL_IMPACTS = ['minor', 'moderate', 'serious', 'critical'];

async function settle(...els: Element[]): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await nextFrame();
    for (const el of els) await (el as SiteHeader).updateComplete;
    for (const el of els) {
      for (const n of root(el).querySelectorAll<SiteMainNav>('site-main-nav'))
        await n.updateComplete;
    }
  }
}

const header = (el: Element) => root(el).querySelector('header')!;
const bar = (el: Element) =>
  root(el).querySelector<SiteMainNav>('header > site-main-nav:not([layout="accordion"])');
const accordion = (el: Element) =>
  root(el).querySelector<SiteMainNav>('header [popover] site-main-nav[layout="accordion"]');
const mainNavs = (el: Element) => [...root(el).querySelectorAll('site-main-nav')];
const navOf = (n: Element) => root(n).querySelector<HTMLElement>('nav.main-nav')!;
const labels = (n: Element) =>
  [...navOf(n).querySelectorAll(':scope > ul > li > :is(button, a)')].map((b) =>
    b.textContent!.trim(),
  );
const GROUPS = ['About', 'Using the Library', 'Research & teaching support', 'Get help'];
const LIBRARY = ['My account', 'Ask a Librarian', 'Hours', 'Give', 'Alerts', 'Search'];
const SITE_LINKS =
  '<a slot="site-links" href="/a">Site A</a><a slot="site-links" href="/b">Site B</a>';
const MARKUP =
  '<nav slot="main-nav"><ul><li><a href="/x">Custom link</a></li><li><span>Custom group</span><ul><li><a href="/y">Y</a></li></ul></li></ul></nav>';

for (const mode of ['shadow', 'light'] as const) {
  const light = mode === 'light' ? 'no-shadow-dom' : '';

  describe(`site-header main navigation (${mode})`, () => {
    const make = async (attrs = '', children = ''): Promise<SiteHeader> => {
      const el = await fixture<SiteHeader>(
        `<site-header ${light} ${attrs}>${children}</site-header>`,
      );
      await settle(el);
      return el;
    };
    afterEach(() => setViewport({ width: 800, height: 600 }));

    it('renders the main nav as a row inside <header>, and an accordion in the Menu popover', async () => {
      const el = await make();
      const b = bar(el)!;
      const a = accordion(el)!;
      expect(b.parentElement).to.equal(header(el));
      expect(header(el).lastElementChild).to.equal(b);
      expect(b.getAttribute('layout') ?? 'bar').to.equal('bar');
      expect(labels(b)).to.deep.equal(GROUPS);
      expect(labels(a)).to.deep.equal(GROUPS);
      expect(mainNavs(el).length).to.equal(2);
      for (const n of [a, b]) {
        expect(n.hasAttribute('no-shadow-dom')).to.equal(mode === 'light');
        expect(navOf(n).getAttribute('aria-label')).to.equal('Main');
      }
    });

    it('forwards root-link-domain, main-nav-label and main-nav-src', async () => {
      const el = await make(
        'root-link-domain="https://x.example.edu" main-nav-label="Library" main-nav-src="https://main-nav.test/items.json"',
      );
      for (const n of [bar(el)!, accordion(el)!]) {
        expect(n.getAttribute('root-link-domain')).to.equal('https://x.example.edu');
        expect(n.getAttribute('label')).to.equal('Library');
        expect(n.getAttribute('items-src')).to.equal('https://main-nav.test/items.json');
      }
      const until = performance.now() + 3000;
      while (labels(bar(el)!)[0] !== 'Fetched group' && performance.now() < until) {
        await new Promise((r) => setTimeout(r, 20));
      }
      await settle(el);
      expect(labels(bar(el)!)).to.deep.equal(['Fetched group', 'Fetched link']);
      expect(labels(accordion(el)!)).to.deep.equal(['Fetched group', 'Fetched link']);
    });

    it('fires one site-main-nav-error from the header when main-nav-src fails', async () => {
      const saved = { ...mainNavTiming };
      Object.assign(mainNavTiming, { retries: 1 });
      try {
        const events: Event[] = [];
        const listener = (e: Event) => events.push(e);
        document.addEventListener('site-main-nav-error', listener);
        try {
          const el = document.createElement('site-header') as SiteHeader;
          if (light) el.setAttribute('no-shadow-dom', '');
          el.setAttribute('main-nav-src', 'https://main-nav-fail.test/x.json');
          const wrap = await fixture('<div></div>');
          const first = oneEvent(el, 'site-main-nav-error');
          wrap.append(el);
          await first;
          await new Promise((r) => setTimeout(r, 200));
          expect(events.length).to.equal(1);
          await settle(el);
          expect(labels(bar(el)!)).to.deep.equal(GROUPS);
        } finally {
          document.removeEventListener('site-main-nav-error', listener);
        }
      } finally {
        Object.assign(mainNavTiming, saved);
      }
    });

    it('no-main-nav renders exactly the header main renders today', async () => {
      const el = await make('no-main-nav');
      expect(mainNavs(el)).to.deep.equal([]);
      expect(normalizeMarkup(header(el).outerHTML)).to.equal(
        HEADER_SNAPSHOT[mode === 'shadow' ? 'noMainNavShadow' : 'noMainNavLight'],
      );
      if (mode === 'light')
        expect([...el.children].map((c) => c.localName)).to.deep.equal(['header']);
    });

    it('turning no-main-nav on and off later removes and restores it', async () => {
      const el = await make();
      el.setAttribute('no-main-nav', '');
      await settle(el);
      expect(mainNavs(el)).to.deep.equal([]);
      el.removeAttribute('no-main-nav');
      await settle(el);
      expect(mainNavs(el).length).to.equal(2);
    });

    it('the vendor variant has no main nav', async () => {
      const el = await make('variant="vendor"', MARKUP);
      expect(mainNavs(el)).to.deep.equal([]);
      expect(normalizeMarkup(header(el).outerHTML)).to.equal(
        HEADER_SNAPSHOT[mode === 'shadow' ? 'vendorShadow' : 'vendorLight'],
      );
      expect(el.querySelector('[slot="main-nav"]')!.checkVisibility()).to.equal(false);
    });

    it('forwards slot="main-nav" markup to both instances, live, and keeps the source hidden', async () => {
      const el = await make('', MARKUP);
      for (const n of [bar(el)!, accordion(el)!]) {
        expect(labels(n)).to.deep.equal(['Custom link', 'Custom group']);
      }
      const source = el.querySelector('[slot="main-nav"]')!;
      expect(source.checkVisibility()).to.equal(false);
      expect(source.closest('header')).to.equal(null);
      const li = document.createElement('li');
      li.innerHTML = '<a href="/z">Added</a>';
      source.querySelector('ul')!.append(li);
      await settle(el);
      for (const n of [bar(el)!, accordion(el)!]) {
        expect(labels(n)).to.deep.equal(['Custom link', 'Custom group', 'Added']);
      }
      source.remove();
      await settle(el);
      expect(labels(bar(el)!)).to.deep.equal(GROUPS);
    });

    it('warns once about invalid slot="main-nav" entries', async () => {
      const warn = console.warn;
      const calls: unknown[][] = [];
      console.warn = (...args: unknown[]) => void calls.push(args);
      try {
        const el = await make(
          '',
          '<nav slot="main-nav"><ul><li><a href="/ok">OK</a></li><li>bad</li></ul></nav>',
        );
        expect(labels(bar(el)!)).to.deep.equal(['OK']);
        expect(labels(accordion(el)!)).to.deep.equal(['OK']);
        expect(calls.filter((c) => String(c[0]).includes('main-nav')).length).to.equal(1);
      } finally {
        console.warn = warn;
      }
    });

    describe('Menu popover at 390px', () => {
      beforeEach(() => setViewport({ width: 390, height: 844 }));

      const open = async (el: SiteHeader) => {
        (root(el).querySelector('.menu-toggle') as HTMLButtonElement).click();
        await settle(el);
      };
      const utility = (el: Element) =>
        [...header(el).querySelectorAll('[popover] nav.menu a')].map((a) => a.textContent);

      it('shows the main nav accordion first, then the utility links', async () => {
        const el = await make();
        await open(el);
        const pop = header(el).querySelector<HTMLElement>('[popover]')!;
        expect(pop.matches(':popover-open')).to.equal(true);
        const a = accordion(el)!;
        expect(pop.firstElementChild).to.equal(a);
        expect(a.checkVisibility()).to.equal(true);
        expect(bar(el)!.checkVisibility()).to.equal(false);
        expect(utility(el)).to.deep.equal(LIBRARY);
        const menu = header(el).querySelector('[popover] nav.menu')!;
        expect(a.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING).to.not.equal(0);
        const accBox = a.getBoundingClientRect();
        const firstUtility = header(el).querySelector('[popover] nav.menu a')!;
        expect(firstUtility.getBoundingClientRect().top).to.be.at.least(accBox.bottom);
        // Its groups are disclosures too, and the popover stays inside the viewport.
        const about = navOf(a).querySelector<HTMLButtonElement>('button')!;
        about.click();
        await settle(el);
        expect(about.getAttribute('aria-expanded')).to.equal('true');
        expect(pop.matches(':popover-open')).to.equal(true);
        const r = pop.getBoundingClientRect();
        expect(r.left).to.be.at.least(0);
        expect(r.right).to.be.at.most(window.innerWidth);
        expect(r.bottom).to.be.at.most(window.innerHeight);
      });

      it('shows site links after the main nav', async () => {
        const el = await make('', SITE_LINKS);
        await open(el);
        expect(utility(el)).to.deep.equal(['Site A', 'Site B']);
        expect(labels(accordion(el)!)).to.deep.equal(GROUPS);
      });

      it('Escape closes an open accordion group before the popover', async () => {
        const el = await make();
        await open(el);
        const pop = header(el).querySelector<HTMLElement>('[popover]')!;
        const about = navOf(accordion(el)!).querySelector<HTMLButtonElement>('button')!;
        about.focus();
        about.click();
        await settle(el);
        const { sendKeys } = await import('@web/test-runner-commands');
        await sendKeys({ press: 'Escape' });
        await settle(el);
        expect(about.getAttribute('aria-expanded')).to.equal('false');
        expect(pop.matches(':popover-open')).to.equal(true);
        await sendKeys({ press: 'Escape' });
        await settle(el);
        expect(pop.matches(':popover-open')).to.equal(false);
      });
    });

    describe('geometry', () => {
      const place = async (width: number, attrs = '') => {
        await setViewport({ width, height: 900 });
        return make(attrs);
      };

      for (const width of [1280, 1000, 993, 992, 768, 390]) {
        it(`keeps the logo row on one line at ${width}px`, async () => {
          const el = await place(width);
          const h = header(el);
          const logo = h.querySelector('.logo')!.getBoundingClientRect();
          const other = h
            .querySelector(width > 992 ? 'nav.inline' : '.menu-toggle')!
            .getBoundingClientRect();
          expect(other.top, 'shares the logo row').to.be.closeTo(logo.top, 0.5);
          expect(other.bottom).to.be.at.most(logo.bottom + 30);
          // The header never overflows sideways.
          expect(h.scrollWidth).to.be.at.most(h.clientWidth);
        });
      }

      for (const width of [1280, 1000, 993]) {
        it(`puts the main nav row under the logo row, full-bleed, at ${width}px`, async () => {
          const el = await place(width);
          const h = header(el);
          const box = h.getBoundingClientRect();
          const logo = h.querySelector('.logo')!.getBoundingClientRect();
          const b = bar(el)!;
          const n = navOf(b);
          const r = n.getBoundingClientRect();
          expect(r.top).to.be.at.least(logo.bottom);
          expect(r.left).to.be.closeTo(box.left, 0.5);
          expect(r.right).to.be.closeTo(box.right, 0.5);
          expect(r.bottom, 'flush with the bottom of the header').to.be.closeTo(box.bottom, 0.5);
          // The four groups fit on one line, with no horizontal overflow.
          const buttons = [...n.querySelectorAll('button')].map((x) => x.getBoundingClientRect());
          expect(buttons.length).to.equal(4);
          for (const x of buttons) expect(x.top).to.be.closeTo(buttons[0].top, 0.5);
          expect(n.scrollWidth).to.be.at.most(n.clientWidth);
          expect(buttons[3].right).to.be.at.most(box.right);
          // The first button starts at the header's 16px gutter, under the logo.
          expect(buttons[0].left - box.left).to.be.closeTo(16, 0.5);
          // One 48.5px row of buttons plus the 5px rule.
          expect(r.height).to.be.closeTo(53.5, 1);
        });
      }

      for (const width of [992, 768, 390]) {
        it(`keeps the header exactly as tall as with no-main-nav at ${width}px`, async () => {
          const without = await place(width, 'no-main-nav');
          const expected = header(without).getBoundingClientRect().height;
          const el = await place(width);
          expect(bar(el)!.checkVisibility()).to.equal(false);
          expect(header(el).getBoundingClientRect().height).to.be.closeTo(expected, 0.5);
        });
      }

      it('adds the main nav row (0.5rem gap, 53.5px) to the header height at 1280px', async () => {
        const without = await place(1280, 'no-main-nav');
        const before = header(without).getBoundingClientRect().height;
        const el = await place(1280);
        const after = header(el).getBoundingClientRect().height;
        expect(after - before).to.be.closeTo(53.5, 1);
      });

      it('floats an open panel over the content without growing the header', async () => {
        const el = await place(1280);
        const before = header(el).getBoundingClientRect().height;
        navOf(bar(el)!).querySelector('button')!.click();
        await settle(el);
        expect(header(el).getBoundingClientRect().height).to.be.closeTo(before, 0.5);
        const panel = navOf(bar(el)!).querySelector('ul ul')!.getBoundingClientRect();
        expect(panel.top).to.be.closeTo(header(el).getBoundingClientRect().bottom - 5, 1);
      });
    });

    for (const width of [1280, 390]) {
      for (const state of ['closed', 'open'] as const) {
        it(`has no axe violations at any impact at ${width}px, ${state}`, async () => {
          await setViewport({ width, height: 900 });
          const el = await make();
          if (state === 'open') {
            if (width === 390) {
              (root(el).querySelector('.menu-toggle') as HTMLButtonElement).click();
              await settle(el);
              navOf(accordion(el)!).querySelector('button')!.click();
            } else {
              navOf(bar(el)!).querySelector('button')!.click();
            }
            await settle(el);
          }
          await expectNoAxeViolations(el, ALL_IMPACTS);
        });
      }
    }
  });
}
