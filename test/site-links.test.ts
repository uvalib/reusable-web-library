import { expect, fixture, nextFrame } from '@open-wc/testing';
import { setViewport } from '@web/test-runner-commands';
import '../src/components/site-page/site-page.js';
import type { SiteHeader } from '../src/components/site-header/SiteHeader.js';
import type { SitePage } from '../src/components/site-page/SitePage.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { HEADER_SNAPSHOT, normalizeMarkup } from './helpers/header-snapshot.js';

type Updatable = HTMLElement & { updateComplete: Promise<unknown> };

const root = (el: Element): ParentNode => el.shadowRoot ?? el;

/** Let slotchange / mutation observers run and the header re-render. */
async function settle(...els: Element[]): Promise<void> {
  for (let i = 0; i < 2; i++) {
    await nextFrame();
    for (const el of els) await (el as Updatable).updateComplete;
  }
}

type Row = [text: string, href: string | null, current: string | null];
const rows = (links: Element[]): Row[] =>
  links.map((a) => [a.textContent!.trim(), a.getAttribute('href'), a.getAttribute('aria-current')]);
const inline = (h: Element) => [...root(h).querySelectorAll('header nav.inline a')];
const popover = (h: Element) => [...root(h).querySelectorAll('header [popover] a')];
const inlineLabel = (h: Element) =>
  root(h).querySelector('header nav.inline')!.getAttribute('aria-label');
const menuLabel = (h: Element) =>
  root(h).querySelector('header nav.menu')!.getAttribute('aria-label');

const README = 'https://github.com/uvalib/reusable-web-library#readme';
const LINKS = `
  <a slot="site-links" href="./">Gallery</a>
  <a slot="site-links" href="./playground.html" aria-current="page">Playground</a>
  <a slot="site-links" href="${README}" target="_blank" rel="noopener" hreflang="en">README</a>`;
const EXPECTED: Row[] = [
  ['Gallery', './', null],
  ['Playground', './playground.html', 'page'],
  ['README', README, null],
];
const LIBRARY = ['My account', 'Ask a Librarian', 'Hours', 'Give', 'Alerts', 'Search'];

/** Both lists show exactly `expected`, in order. */
function expectBoth(h: Element, expected: Row[]) {
  expect(rows(inline(h)), 'inline nav').to.deep.equal(expected);
  expect(rows(popover(h)), 'popover list').to.deep.equal(expected);
}

const siteLink = (text: string, href: string): HTMLAnchorElement =>
  Object.assign(document.createElement('a'), { slot: 'site-links', href, textContent: text });

for (const mode of ['shadow', 'light'] as const) {
  const light = mode === 'light' ? 'no-shadow-dom' : '';

  describe(`site-header site links (${mode})`, () => {
    const make = async (attrs = '', children = ''): Promise<SiteHeader> => {
      const el = await fixture<SiteHeader>(
        `<site-header ${light} ${attrs}>${children}</site-header>`,
      );
      await settle(el);
      return el;
    };

    it('renders exactly the site links, in order, in the inline nav and the popover', async () => {
      const el = await make('', LINKS);
      expectBoth(el, EXPECTED);
      for (const a of [...inline(el), ...popover(el)]) {
        expect(LIBRARY).to.not.include(a.textContent!.trim());
      }
      expect(root(el).querySelector('nav[aria-label="Utility"]')).to.equal(null);
    });

    it('copies target, rel and hreflang, and only when present', async () => {
      const el = await make('', LINKS);
      for (const list of [inline(el), popover(el)]) {
        const readme = list[2]!;
        expect(readme.getAttribute('target')).to.equal('_blank');
        expect(readme.getAttribute('rel')).to.equal('noopener');
        expect(readme.getAttribute('hreflang')).to.equal('en');
        const gallery = list[0]!;
        for (const attr of ['target', 'rel', 'hreflang', 'aria-current']) {
          expect(gallery.hasAttribute(attr), attr).to.equal(false);
        }
      }
    });

    it('resolves site links as written, not against root-link-domain', async () => {
      const el = await make('root-link-domain="https://x.example.edu"', LINKS);
      expectBoth(el, EXPECTED);
      // The logo still uses root-link-domain.
      expect(root(el).querySelector('.logo')!.getAttribute('href')).to.equal(
        'https://x.example.edu/',
      );
    });

    it('labels both navs "Site" by default', async () => {
      const el = await make('', LINKS);
      expect(inlineLabel(el)).to.equal('Site');
      expect(menuLabel(el)).to.equal('Site menu');
    });

    it('labels both navs from site-links-label', async () => {
      const el = await make('site-links-label="Playground"', LINKS);
      expect(inlineLabel(el)).to.equal('Playground');
      expect(menuLabel(el)).to.equal('Playground menu');
      el.setAttribute('site-links-label', 'Docs');
      await settle(el);
      expect(inlineLabel(el)).to.equal('Docs');
      expect(menuLabel(el)).to.equal('Docs menu');
    });

    it('keeps the source anchors out of view', async () => {
      const el = await make('', LINKS);
      const sources = [...el.querySelectorAll('[slot="site-links"]')];
      expect(sources.length).to.equal(3);
      for (const a of sources) {
        expect(a.checkVisibility(), a.textContent!).to.equal(false);
        expect(a.closest('header'), 'not inside the header landmark').to.equal(null);
      }
      if (mode === 'shadow') {
        const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="site-links"]')!;
        expect(slot.assignedElements()).to.deep.equal(sources);
        expect(slot.closest('[hidden]')).to.not.equal(null);
      } else {
        for (const a of sources) expect(a.closest('[hidden]')).to.not.equal(null);
      }
    });

    it('without site links, the header markup is unchanged and the six library links show', async () => {
      const el = await make();
      expect(normalizeMarkup(root(el).querySelector('header')!.outerHTML)).to.equal(
        HEADER_SNAPSHOT[mode],
      );
      expect(inline(el).map((a) => a.textContent)).to.deep.equal(LIBRARY);
      expect(popover(el).map((a) => a.textContent)).to.deep.equal(LIBRARY);
      expect(inlineLabel(el)).to.equal('Utility');
      expect(menuLabel(el)).to.equal('Utility menu');
      // Light mode adds nothing else to the host.
      if (mode === 'light')
        expect([...el.children].map((c) => c.localName)).to.deep.equal(['header']);
    });

    it('a site-links-label alone changes nothing', async () => {
      const el = await make('site-links-label="Playground"');
      expect(normalizeMarkup(root(el).querySelector('header')!.outerHTML)).to.equal(
        HEADER_SNAPSHOT[mode],
      );
    });

    it('updates both lists when links are added, removed or changed', async () => {
      const el = await make('', LINKS);
      const added = siteLink('Added', '/added');
      el.append(added);
      await settle(el);
      expectBoth(el, [...EXPECTED, ['Added', '/added', null]]);

      added.setAttribute('href', '/changed');
      await settle(el);
      expect(rows(inline(el))[3]).to.deep.equal(['Added', '/changed', null]);
      expect(rows(popover(el))[3]).to.deep.equal(['Added', '/changed', null]);

      added.textContent = 'Renamed';
      await settle(el);
      expect(rows(inline(el))[3]).to.deep.equal(['Renamed', '/changed', null]);
      expect(rows(popover(el))[3]).to.deep.equal(['Renamed', '/changed', null]);

      added.setAttribute('aria-current', 'page');
      const playground = [...el.querySelectorAll('[slot="site-links"]')][1]!;
      playground.removeAttribute('aria-current');
      await settle(el);
      expect(rows(inline(el)).map((r) => r[2])).to.deep.equal([null, null, null, 'page']);
      expect(rows(popover(el)).map((r) => r[2])).to.deep.equal([null, null, null, 'page']);

      added.remove();
      await settle(el);
      expectBoth(el, [EXPECTED[0]!, [...EXPECTED[1]!.slice(0, 2), null] as Row, EXPECTED[2]!]);
    });

    it('falls back to the library links when the last site link is removed', async () => {
      const el = await make('', LINKS);
      for (const a of [...el.querySelectorAll('[slot="site-links"]')]) a.remove();
      await settle(el);
      expect(inline(el).map((a) => a.textContent)).to.deep.equal(LIBRARY);
      expect(popover(el).map((a) => a.textContent)).to.deep.equal(LIBRARY);
      expect(inlineLabel(el)).to.equal('Utility');
    });

    it('picks up site links added to a header that had none', async () => {
      const el = await make();
      el.append(siteLink('Only', '/only'));
      await settle(el);
      expectBoth(el, [['Only', '/only', null]]);
      expect(inlineLabel(el)).to.equal('Site');
    });

    it('the vendor variant ignores site links', async () => {
      const el = await make('variant="vendor" site-links-label="Playground"', LINKS);
      const links = root(el).querySelectorAll('header nav a');
      expect([...links].map((a) => a.textContent)).to.deep.equal(['Ask a Librarian']);
      expect(inlineLabel(el)).to.equal('Utility');
      expect(root(el).querySelector('.menu-toggle')).to.equal(null);
      for (const a of el.querySelectorAll('[slot="site-links"]')) {
        expect(a.checkVisibility()).to.equal(false);
      }
      // Exactly main's vendor header markup.
      expect(normalizeMarkup(root(el).querySelector('header')!.outerHTML)).to.equal(
        HEADER_SNAPSHOT[mode === 'shadow' ? 'vendorShadow' : 'vendorLight'],
      );
    });

    it('ignores site links with empty or whitespace-only text, warning once', async () => {
      const warn = console.warn;
      const calls: unknown[][] = [];
      console.warn = (...args: unknown[]) => void calls.push(args);
      try {
        const el = await make(
          '',
          `<a slot="site-links" href="/empty"></a><a slot="site-links" href="/blank">  \n </a>${LINKS}`,
        );
        expectBoth(el, EXPECTED);
        const late = siteLink('', '/late-empty');
        el.append(late);
        await settle(el);
        expectBoth(el, EXPECTED);
        late.textContent = 'Now named';
        await settle(el);
        expect(rows(inline(el))[3]).to.deep.equal(['Now named', '/late-empty', null]);
        expect(calls.length).to.equal(1);
      } finally {
        console.warn = warn;
      }
    });

    it('ignores site-links children that are not <a href>, warning once', async () => {
      const warn = console.warn;
      const calls: unknown[][] = [];
      console.warn = (...args: unknown[]) => void calls.push(args);
      try {
        const el = await make(
          '',
          `<span slot="site-links">Not a link</span><a slot="site-links">No href</a>${LINKS}`,
        );
        expectBoth(el, EXPECTED);
        el.append(siteLink('Added', '/added'));
        await settle(el);
        expect(rows(inline(el)).length).to.equal(4);
        expect(calls.length).to.equal(1);
        expect(String(calls[0]![0])).to.contain('site-links');
      } finally {
        console.warn = warn;
      }
    });

    describe('current page', () => {
      beforeEach(() => setViewport({ width: 1280, height: 900 }));
      afterEach(() => setViewport({ width: 800, height: 600 }));

      it('marks aria-current="page" with more than colour', async () => {
        const el = await make('', LINKS);
        const [plain, current] = inline(el);
        const cur = getComputedStyle(current!);
        const other = getComputedStyle(plain!);
        expect(cur.textDecorationLine).to.contain('underline');
        expect(cur.textDecorationThickness).to.equal('3px');
        expect(other.textDecorationThickness).to.not.equal('3px');
        expect(cur.fontWeight).to.equal('700');
        expect(other.fontWeight).to.not.equal('700');
      });

      it('styles aria-current in the popover too', async () => {
        await setViewport({ width: 390, height: 844 });
        const el = await make('', LINKS);
        (root(el).querySelector('.menu-toggle') as HTMLButtonElement).click();
        const current = popover(el)[1]!;
        expect(getComputedStyle(current).textDecorationThickness).to.equal('3px');
        expect(getComputedStyle(current).fontWeight).to.equal('700');
      });
    });

    it('has no serious axe violations with site links', async () => {
      const el = await make('site-links-label="Playground"', LINKS);
      await expectNoAxeViolations(el);
    });
  });

  describe(`site-page site links (${mode})`, () => {
    const make = async (attrs = '', children = ''): Promise<SitePage> => {
      const el = await fixture<SitePage>(`<site-page ${light} ${attrs}>${children}</site-page>`);
      await settle(el, header(el));
      return el;
    };
    const header = (el: SitePage) => root(el).querySelector('site-header') as SiteHeader;
    const main = (el: SitePage) => root(el).querySelector('main')!;

    it('forwards the site links and site-links-label to its header', async () => {
      const el = await make('site-links-label="Playground"', `${LINKS}<p id="c">content</p>`);
      const h = header(el);
      expect(h.getAttribute('site-links-label')).to.equal('Playground');
      expectBoth(h, EXPECTED);
      expect(inlineLabel(h)).to.equal('Playground');
      expect(menuLabel(h)).to.equal('Playground menu');
      for (const a of el.querySelectorAll('[slot="site-links"]')) {
        expect(main(el).contains(a)).to.equal(false);
        expect(a.checkVisibility()).to.equal(false);
      }
      if (mode === 'light') expect(document.getElementById('c')!.parentElement).to.equal(main(el));
    });

    it('defaults the label to "Site" and sets no attribute', async () => {
      const el = await make('', LINKS);
      expect(header(el).hasAttribute('site-links-label')).to.equal(false);
      expect(inlineLabel(header(el))).to.equal('Site');
    });

    it('without site links, the header keeps the library links', async () => {
      const el = await make('', '<p>content</p>');
      const h = header(el);
      expect(inline(h).map((a) => a.textContent)).to.deep.equal(LIBRARY);
      expect(inlineLabel(h)).to.equal('Utility');
      expect(normalizeMarkup(root(h).querySelector('header')!.outerHTML)).to.equal(
        // The page slots its skip link into the shadow header; light mode renders it outside.
        HEADER_SNAPSHOT[mode],
      );
    });

    if (mode === 'shadow') {
      it('the forwarded slot flattens to the page’s anchors', async () => {
        const el = await make('', LINKS);
        const slot =
          header(el).shadowRoot!.querySelector<HTMLSlotElement>('slot[name="site-links"]')!;
        expect(slot.assignedElements({ flatten: true })).to.deep.equal([
          ...el.querySelectorAll('[slot="site-links"]'),
        ]);
      });
    }

    it('routes site links added later to the header, not into main', async () => {
      const el = await make('', LINKS);
      const late = siteLink('Late', '/late');
      el.append(late);
      await settle(el, header(el));
      expectBoth(header(el), [...EXPECTED, ['Late', '/late', null]]);
      expect(main(el).contains(late)).to.equal(false);
      late.textContent = 'Later';
      await settle(el, header(el));
      expect(rows(inline(header(el)))[3]).to.deep.equal(['Later', '/late', null]);
      late.remove();
      await settle(el, header(el));
      expectBoth(header(el), EXPECTED);
    });

    it('picks up site links added to a page that had none', async () => {
      const el = await make('', '<p>content</p>');
      el.append(siteLink('Only', '/only'));
      await settle(el, header(el));
      expectBoth(header(el), [['Only', '/only', null]]);
      expect(main(el).querySelector('[slot="site-links"]')).to.equal(null);
    });

    it('a vendor page ignores site links', async () => {
      const el = await make('header-variant="vendor"', LINKS);
      expect(inline(header(el)).map((a) => a.textContent)).to.deep.equal(['Ask a Librarian']);
    });

    it('has no axe violations, including landmark rules, on a full page with site links', async () => {
      const el = await make(
        'site-links-label="Playground"',
        `${LINKS}<h1>Title</h1><p>Body <a href="/x">link</a></p>`,
      );
      await customElements.whenDefined('site-footer');
      await settle(el, header(el), root(el).querySelector('site-footer')!);
      await expectNoAxeViolations(document.body);
      await expectNoAxeViolations(document.body, ['minor', 'moderate', 'serious', 'critical'], {
        rules: ['region', 'landmark-unique'],
      });
    });
  });
}
