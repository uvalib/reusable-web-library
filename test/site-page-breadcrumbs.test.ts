import { expect, fixture, nextFrame } from '@open-wc/testing';
import { emulateMedia, sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/site-page/site-page.js';
import '../src/components/uvalib-breadcrumbs/uvalib-breadcrumbs.js';
import type { SitePage } from '../src/components/site-page/SitePage.js';
import type { UvalibBreadcrumbs } from '../src/components/uvalib-breadcrumbs/UvalibBreadcrumbs.js';
import { COLOR_SCHEME_ATTR, COLOR_SCHEME_STORAGE_KEY } from '../src/base/color-scheme.js';
import { expectNoPageAxeViolations } from './helpers/axe.js';
import { contrast, rgb } from './helpers/scheme-colors.js';

// <uvalib-breadcrumbs slot="breadcrumbs"> in <site-page>: between the header (and the alert
// list band) and <main>, never inside <main>, in shadow and light DOM; light and dark.

type Updatable = HTMLElement & { updateComplete: Promise<unknown> };
const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const mainOf = (el: SitePage) => root(el).querySelector('main')!;
const bandOf = (el: SitePage) => root(el).querySelector('section.alerts-list');
const crumbsOf = (el: SitePage) => el.querySelector('uvalib-breadcrumbs') as UvalibBreadcrumbs;
/** Where the element is rendered among site-page's own children: itself or its slot. */
const placed = (b: Element) => (b.assignedSlot ?? b) as Element;
const navOf = (b: Element) =>
  (b.shadowRoot ?? b).querySelector<HTMLElement>(b.shadowRoot ? 'nav' : ':scope > nav')!;

async function settle(...els: Element[]): Promise<void> {
  for (let i = 0; i < 2; i++) {
    await nextFrame();
    for (const el of els) await (el as Updatable).updateComplete;
  }
}

const TRAIL = `<a href="/">Home</a><a href="/research">Research &amp; teaching</a><span>Writing</span>`;
const CRUMBS = (attrs = '') =>
  `<uvalib-breadcrumbs slot="breadcrumbs" ${attrs}>${TRAIL}</uvalib-breadcrumbs>`;

for (const mode of ['shadow', 'light'] as const) {
  const light = mode === 'light' ? 'no-shadow-dom' : '';

  describe(`site-page breadcrumbs (${mode})`, function () {
    this.timeout(15000);
    afterEach(async () => {
      document.documentElement.removeAttribute(COLOR_SCHEME_ATTR);
      localStorage.removeItem(COLOR_SCHEME_STORAGE_KEY);
      await emulateMedia({ colorScheme: 'light' });
      await setViewport({ width: 800, height: 600 });
    });

    const make = async (attrs = '', children = `${CRUMBS(light)}<h1 id="t">Title</h1>`) => {
      const el = await fixture<SitePage>(
        `<site-page ${light} alerts-src="https://alerts.test/" ${attrs}>${children}</site-page>`,
      );
      await customElements.whenDefined('site-footer');
      await settle(el, root(el).querySelector('site-header')!);
      return el;
    };

    /** The trail sits right after the list band (or the header) and right before <main>. */
    function expectPlacement(el: SitePage, after: Element) {
      const b = crumbsOf(el);
      const at = placed(b);
      expect(at.previousElementSibling).to.equal(after);
      expect(at.nextElementSibling).to.equal(mainOf(el));
      expect(mainOf(el).contains(b)).to.equal(false);
      if (mode === 'shadow') expect(b.assignedSlot?.name).to.equal('breadcrumbs');
      else expect(b.parentElement).to.equal(el);
      // Content stays in <main>; the skip link still targets it.
      const h1 = document.getElementById('t')!;
      expect((h1.assignedSlot ?? h1).closest('main')).to.equal(mainOf(el));
      expect(mainOf(el).id).to.equal('main-content');
      expect(root(el).querySelector('.skip-link')!.getAttribute('href')).to.equal('#main-content');
      // On screen: below the header, above main, lined up with main's content.
      const nav = navOf(b).getBoundingClientRect();
      const header = root(el).querySelector('site-header')!.getBoundingClientRect();
      const main = mainOf(el).getBoundingClientRect();
      expect(nav.top).to.be.at.least(header.bottom);
      expect(nav.bottom).to.be.at.most(main.top);
      expect(nav.left).to.equal(main.left + parseFloat(getComputedStyle(mainOf(el)).paddingLeft));
    }

    it('places the trail after the header and alert list band, before <main>', async () => {
      const el = await make();
      expectPlacement(el, bandOf(el)!);
    });

    it('places it right after the header with no-alerts', async () => {
      const el = await make('no-alerts');
      expectPlacement(el, root(el).querySelector('site-header')!);
    });

    it('places a trail added later, and keeps it there when alerts are turned on', async () => {
      const el = await make('no-alerts', '<h1 id="t">Title</h1>');
      expect(root(el).querySelector('slot[name="breadcrumbs"]')).to.equal(null);
      el.insertAdjacentHTML('beforeend', CRUMBS(light));
      await settle(el, crumbsOf(el));
      expectPlacement(el, root(el).querySelector('site-header')!);
      el.removeAttribute('no-alerts');
      await settle(el);
      expectPlacement(el, bandOf(el)!);
    });

    it('an empty or hidden trail takes no space', async () => {
      const el = await make(
        '',
        `<uvalib-breadcrumbs slot="breadcrumbs" ${light}></uvalib-breadcrumbs><h1 id="t">Title</h1>`,
      );
      await settle(el, crumbsOf(el));
      expect(crumbsOf(el).getBoundingClientRect().height).to.equal(0);
      crumbsOf(el).append(document.createRange().createContextualFragment(TRAIL));
      await settle(el, crumbsOf(el));
      expect(crumbsOf(el).getBoundingClientRect().height).to.be.above(0);
      crumbsOf(el).hidden = true;
      await settle(el, crumbsOf(el));
      expect(crumbsOf(el).getBoundingClientRect().height).to.equal(0);
    });

    it('a content node given slot="breadcrumbs" later moves out of <main>', async () => {
      const el = await make('', `<h1 id="t">Title</h1>`);
      const b = document.createElement('uvalib-breadcrumbs') as UvalibBreadcrumbs;
      if (light) b.setAttribute('no-shadow-dom', '');
      b.innerHTML = TRAIL;
      el.append(b);
      await settle(el, b);
      b.slot = 'breadcrumbs';
      await settle(el, b);
      expect(mainOf(el).contains(placed(b))).to.equal(false);
      if (light) expect(placed(b).nextElementSibling === mainOf(el)).to.equal(true);
      b.removeAttribute('slot');
      await settle(el, b);
      expect(mainOf(el).contains(placed(b))).to.equal(true);
    });

    it('renders nothing for breadcrumbs without the slot', async () => {
      const el = await make('', '<h1 id="t">Title</h1>');
      expect(root(el).querySelector('slot[name="breadcrumbs"]')).to.equal(null);
      expect(bandOf(el)!.nextElementSibling).to.equal(mainOf(el));
    });

    for (const scheme of ['light', 'dark'] as const) {
      it(`${scheme}: passes axe; links, separator, current page and focus ring contrast`, async () => {
        localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, scheme);
        const el = await make('color-scheme-switch');
        await settle(el, crumbsOf(el));
        await expectNoPageAxeViolations();
        const nav = navOf(crumbsOf(el));
        const bg = getComputedStyle(document.body).backgroundColor;
        const page = bg === 'rgba(0, 0, 0, 0)' ? rgb('#ffffff') : bg;
        const link = nav.querySelector('a')!;
        const parts = {
          link: getComputedStyle(link).color,
          separator: getComputedStyle(nav.querySelector('.separator')!).color,
          current: getComputedStyle(nav.querySelector('[aria-current="page"]')!).color,
        };
        for (const [what, fg] of Object.entries(parts))
          expect(contrast(fg, page), `${what}: ${fg} on ${page}`).to.be.at.least(4.5);
        // The utility-link role: #005679 in light (as library.virginia.edu), #91d8f2 in dark.
        expect(parts.link).to.equal(rgb(scheme === 'dark' ? '#91d8f2' : '#005679'));
        // Keyboard focus on the first link: a ring at least 3:1 against the page.
        (document.activeElement as HTMLElement | null)?.blur();
        link.tabIndex = 0;
        link.focus();
        await sendKeys({ press: 'Shift+Tab' });
        await sendKeys({ press: 'Tab' });
        expect(link.matches(':focus-visible')).to.equal(true);
        const ring = getComputedStyle(link);
        expect(ring.outlineStyle).to.equal('solid');
        expect(contrast(ring.outlineColor, page)).to.be.at.least(3);
      });
    }

    it('wraps at 320px with no horizontal scroll', async () => {
      await setViewport({ width: 320, height: 640 });
      const el = await make();
      await settle(el, crumbsOf(el));
      expect(document.documentElement.scrollWidth).to.be.at.most(320);
      expect(navOf(crumbsOf(el)).getBoundingClientRect().right).to.be.at.most(320);
    });
  });
}
