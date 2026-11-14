import { expect, fixture, nextFrame } from '@open-wc/testing';
import { setViewport } from '@web/test-runner-commands';
import '../src/components/site-page/site-page.js';
import type { SiteHeader } from '../src/components/site-header/SiteHeader.js';
import type { SiteMainNav } from '../src/components/site-main-nav/SiteMainNav.js';
import type { SitePage } from '../src/components/site-page/SitePage.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { HEADER_SNAPSHOT, normalizeMarkup } from './helpers/header-snapshot.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const ALL_IMPACTS = ['minor', 'moderate', 'serious', 'critical'];
const header = (el: SitePage) => root(el).querySelector('site-header') as SiteHeader;
const navs = (el: SitePage) => [...root(header(el)).querySelectorAll<SiteMainNav>('site-main-nav')];
const labels = (n: Element) =>
  [...root(n).querySelectorAll('nav.main-nav > ul > li > :is(button, a)')].map((b) =>
    b.textContent!.trim(),
  );
const GROUPS = ['About', 'Using the Library', 'Research & teaching support', 'Get help'];
const MARKUP =
  '<nav slot="main-nav"><ul><li><a href="/x">Custom link</a></li><li><span>Custom group</span><ul><li><a href="/y">Y</a></li></ul></li></ul></nav>';

async function settle(el: SitePage): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await nextFrame();
    await el.updateComplete;
    const h = header(el);
    if (h) {
      await h.updateComplete;
      for (const n of navs(el)) await n.updateComplete;
    }
  }
}

for (const mode of ['shadow', 'light'] as const) {
  const light = mode === 'light' ? 'no-shadow-dom' : '';

  describe(`site-page main navigation (${mode})`, () => {
    const make = async (attrs = '', children = '<p>content</p>'): Promise<SitePage> => {
      const el = await fixture<SitePage>(
        `<site-page ${light} no-alerts ${attrs}>${children}</site-page>`,
      );
      await settle(el);
      return el;
    };
    afterEach(() => setViewport({ width: 800, height: 600 }));

    it('shows the main nav by default', async () => {
      const el = await make();
      expect(navs(el).length).to.equal(2);
      for (const n of navs(el)) expect(labels(n)).to.deep.equal(GROUPS);
    });

    it('forwards no-main-nav: the header is exactly the one from before the main nav', async () => {
      const el = await make('no-main-nav');
      expect(header(el).hasAttribute('no-main-nav')).to.equal(true);
      expect(navs(el)).to.deep.equal([]);
      expect(normalizeMarkup(root(header(el)).querySelector('header')!.outerHTML)).to.equal(
        HEADER_SNAPSHOT[mode === 'shadow' ? 'noMainNavShadow' : 'noMainNavLight'],
      );
      el.removeAttribute('no-main-nav');
      await settle(el);
      expect(navs(el).length).to.equal(2);
    });

    it('forwards main-nav-label and main-nav-src', async () => {
      const el = await make(
        'main-nav-label="Library" main-nav-src="https://main-nav.test/items.json"',
      );
      const h = header(el);
      expect(h.getAttribute('main-nav-label')).to.equal('Library');
      expect(h.getAttribute('main-nav-src')).to.equal('https://main-nav.test/items.json');
      for (const n of navs(el)) {
        expect(root(n).querySelector('nav.main-nav')!.getAttribute('aria-label')).to.equal(
          'Library',
        );
      }
    });

    it('a vendor page has no main nav', async () => {
      const el = await make('header-variant="vendor"', MARKUP);
      expect(navs(el)).to.deep.equal([]);
    });

    it('forwards slot="main-nav" markup to the header, not into main', async () => {
      const el = await make('', `${MARKUP}<p id="c">content</p>`);
      for (const n of navs(el)) expect(labels(n)).to.deep.equal(['Custom link', 'Custom group']);
      const source = el.querySelector('[slot="main-nav"]')!;
      const main = root(el).querySelector('main')!;
      expect(main.contains(source)).to.equal(false);
      expect(source.checkVisibility()).to.equal(false);
      if (mode === 'light') expect(document.getElementById('c')!.parentElement).to.equal(main);
      // Live: edits to the page's markup reach both instances.
      source.querySelector('a')!.textContent = 'Renamed';
      await settle(el);
      for (const n of navs(el)) expect(labels(n)[0]).to.equal('Renamed');
    });

    it('routes slot="main-nav" markup added later to the header', async () => {
      const el = await make();
      el.insertAdjacentHTML('beforeend', MARKUP);
      await settle(el);
      for (const n of navs(el)) expect(labels(n)).to.deep.equal(['Custom link', 'Custom group']);
      expect(root(el).querySelector('main')!.querySelector('[slot="main-nav"]')).to.equal(null);
    });

    for (const width of [1280, 390]) {
      for (const state of ['closed', 'open'] as const) {
        it(`a full page has no axe violations at any impact at ${width}px, ${state}`, async () => {
          await setViewport({ width, height: 900 });
          const el = await make('', '<h1>Title</h1><p>Body <a href="/x">link</a></p>');
          await customElements.whenDefined('site-footer');
          await settle(el);
          const h = root(header(el));
          if (state === 'open') {
            if (width === 390) {
              (h.querySelector('.menu-toggle') as HTMLButtonElement).click();
              await settle(el);
              root(navs(el)[0]).querySelector<HTMLButtonElement>('nav.main-nav button')!.click();
            } else {
              root(navs(el)[1]).querySelector<HTMLButtonElement>('nav.main-nav button')!.click();
            }
            await settle(el);
          }
          await expectNoAxeViolations(document.body, ALL_IMPACTS);
        });
      }
    }
  });
}
