// site-name: a sub-site's name after the library logo, linking to the site's home.
import { expect, fixture, nextFrame } from '@open-wc/testing';
import { setViewport } from '@web/test-runner-commands';
import '../src/components/site-header/site-header.js';
import '../src/components/site-page/site-page.js';
import type { SiteHeader } from '../src/components/site-header/SiteHeader.js';
import type { SitePage } from '../src/components/site-page/SitePage.js';
import { COLOR_SCHEME_STORAGE_KEY } from '../src/base/color-scheme.js';
import { expectNoAxeViolations, expectNoPageAxeViolations } from './helpers/axe.js';
import { recordAnalytics } from './helpers/analytics.js';

const NAME = 'Electronic Text Collections';
const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const MODES = ['shadow', 'light'] as const;
const attr = (mode: (typeof MODES)[number]) => (mode === 'light' ? 'no-shadow-dom' : '');

/** A link click would navigate the test page: cancel it once it reaches `document`. */
const cancel = (e: Event) => {
  if (e.composedPath().some((n) => n instanceof HTMLAnchorElement)) e.preventDefault();
};

async function header(attrs: string): Promise<SiteHeader> {
  const el = await fixture<SiteHeader>(`<site-header ${attrs}></site-header>`);
  await el.updateComplete;
  await nextFrame();
  return el;
}

const box = (el: Element | null) => el!.getBoundingClientRect();

for (const mode of MODES) {
  describe(`site-header site-name (${mode})`, () => {
    afterEach(() => setViewport({ width: 800, height: 600 }));

    it('links the name to the site home (default /) and keeps the logo on the library', async () => {
      const el = await header(`${attr(mode)} site-name="  ${NAME} "`);
      const r = root(el);
      const name = r.querySelector<HTMLAnchorElement>('header a.site-name')!;
      expect(name.textContent!.trim()).to.equal(NAME);
      expect(name.getAttribute('href')).to.equal('/');
      // Distinct link names, each starting with its visible text (voice control).
      expect(name.getAttribute('aria-label')).to.equal(`${NAME} home`);
      const logo = r.querySelector<HTMLAnchorElement>('a.logo')!;
      expect(logo.getAttribute('href')).to.equal('https://www.library.virginia.edu/');
      expect(logo.querySelector('img')!.alt).to.equal('UVA Library home');
      // Not a heading: the page keeps its own <h1>.
      expect(r.querySelector('header :is(h1, h2, h3, h4, h5, h6, [role="heading"])')).to.equal(
        null,
      );
    });

    it('uses site-name-href, and renders nothing for an empty name', async () => {
      const el = await header(`${attr(mode)} site-name="${NAME}" site-name-href="/etext/"`);
      expect(root(el).querySelector('a.site-name')!.getAttribute('href')).to.equal('/etext/');
      el.siteName = '   ';
      await el.updateComplete;
      expect(root(el).querySelector('.site-name, .brand')).to.equal(null);
      // The logo is a direct child of <header> again, as before site-name existed.
      expect(root(el).querySelector('header > a.logo')).to.not.equal(null);
    });

    it('vendor variant shows it too', async () => {
      const el = await header(`${attr(mode)} variant="vendor" site-name="${NAME}"`);
      expect(root(el).querySelector('a.site-name')).to.not.equal(null);
    });

    it("reports ['site-header', 'site-name-click'], never the URL", async () => {
      const el = await header(`${attr(mode)} site-name="${NAME}"`);
      const rec = recordAnalytics();
      document.addEventListener('click', cancel);
      try {
        await nextFrame();
        expect(rec.events).to.deep.equal([]);
        root(el).querySelector<HTMLAnchorElement>('a.site-name')!.click();
        root(el).querySelector<HTMLAnchorElement>('a.logo')!.click();
        expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
          ['site-header', 'site-name-click'],
          ['site-header', 'logo-click'],
        ]);
      } finally {
        rec.restore();
        document.removeEventListener('click', cancel);
      }
    });

    for (const width of [1280, 1200, 1199, 993]) {
      it(`keeps the header height and the nav inside it at ${width}px`, async () => {
        // A real page's text (base.css, with Typekit's font not loaded: Arial at 17px).
        document.body.style.cssText = 'margin: 0; font: 17px Arial, sans-serif';
        await setViewport({ width, height: 800 });
        const plain = await header(attr(mode));
        const named = await header(`${attr(mode)} site-name="${NAME}"`);
        const h = (el: Element) => box(root(el).querySelector('header')).height;
        expect(h(named)).to.equal(h(plain));
        const hdr = box(root(named).querySelector('header'));
        const nav = box(root(named).querySelector('nav.inline'));
        const name = box(root(named).querySelector('.site-name'));
        const logo = box(root(named).querySelector('.logo img'));
        expect(nav.right).to.be.at.most(hdr.right);
        expect(name.left).to.be.at.least(logo.right);
        expect(name.right).to.be.at.most(nav.left);
        // In the logo row, no taller than the logo.
        expect(name.top).to.be.at.least(logo.top);
        expect(name.bottom).to.be.at.most(logo.bottom);
        document.body.style.cssText = '';
      });
    }

    const SIX = [
      'Collections',
      'Browse by author',
      'Search the texts',
      'About the project',
      'Contributors',
      'Contact us',
    ]
      .map((t, i) => `<a slot="site-links" href="/p${i}">${t}</a>`)
      .join('');
    for (const [what, attrs, kids] of [
      ['color-scheme-switch', 'color-scheme-switch', ''],
      ['6 site links', '', SIX],
    ] as const) {
      for (const width of [993, 1100, 1199]) {
        it(`never overflows or wraps the links at ${width}px with ${what}`, async () => {
          document.body.style.cssText = 'margin: 0; font: 17px Arial, sans-serif';
          try {
            await setViewport({ width, height: 800 });
            const el = await fixture<SiteHeader>(
              `<site-header ${attr(mode)} ${attrs} site-name="${NAME}">${kids}</site-header>`,
            );
            await el.updateComplete;
            await nextFrame();
            const plain = await fixture<SiteHeader>(
              `<site-header ${attr(mode)} ${attrs}>${kids}</site-header>`,
            );
            await plain.updateComplete;
            await nextFrame();
            const r = root(el);
            const hdr = r.querySelector('header')!;
            const edge = box(hdr).right - parseFloat(getComputedStyle(hdr).paddingRight);
            const row = r.querySelector('header > .utility-row, header > nav.inline')!;
            expect(box(row).right).to.be.at.most(edge + 0.5);
            // The links (and theme control) are laid out exactly as without a name.
            const layout = (h: Element) => {
              const top = box(root(h).querySelector('header')).top;
              return [
                ...root(h).querySelectorAll(
                  'header > .utility-row, header > nav.inline, nav.inline li, .color-scheme.inline',
                ),
              ].map((n) => {
                const b = box(n);
                return [b.left, b.top - top, b.width, b.height].map(Math.round);
              });
            };
            expect(layout(el)).to.deep.equal(layout(plain));
            expect(document.documentElement.scrollWidth).to.be.at.most(width);
            // Crowded: the name moved under the logo; the logo row itself is unchanged.
            const name = box(r.querySelector('.site-name'));
            const logo = box(r.querySelector('.logo img'));
            if (r.querySelector('.brand.stacked')) expect(name.top).to.be.at.least(logo.bottom);
            else expect(name.right).to.be.at.most(box(row).left);
          } finally {
            document.body.style.cssText = '';
            localStorage.removeItem(COLOR_SCHEME_STORAGE_KEY);
            document.documentElement.removeAttribute('data-uva-color-scheme');
          }
        });
      }
    }

    it('stacks only while crowded, following the width', async () => {
      document.body.style.cssText = 'margin: 0; font: 17px Arial, sans-serif';
      try {
        await setViewport({ width: 993, height: 800 });
        const el = await fixture<SiteHeader>(
          `<site-header ${attr(mode)} site-name="${NAME}">${SIX}</site-header>`,
        );
        await el.updateComplete;
        await nextFrame();
        expect(root(el).querySelector('.brand.stacked')).to.not.equal(null);
        await setViewport({ width: 1800, height: 800 });
        await nextFrame();
        await nextFrame();
        expect(root(el).querySelector('.brand.stacked')).to.equal(null);
      } finally {
        document.body.style.cssText = '';
      }
    });

    for (const variant of ['full', 'vendor']) {
      it(`wraps under the logo at 320px with no horizontal scroll (${variant})`, async () => {
        document.body.style.margin = '0'; // as base.css does
        try {
          await setViewport({ width: 320, height: 640 });
          const long = 'Albert and Shirley Small Special Collections Library Digital Exhibits';
          const plain = await header(`${attr(mode)} variant="${variant}"`);
          const el = await header(`${attr(mode)} variant="${variant}" site-name="${long}"`);
          const name = box(root(el).querySelector('.site-name'));
          const logo = box(root(el).querySelector('.logo img'));
          expect(name.top).to.be.at.least(logo.bottom);
          expect(name.left).to.equal(logo.left);
          expect(name.right).to.be.at.most(logo.right + 0.5);
          // The Menu button (or the vendor link) is exactly where it is without a name.
          const end = (h: Element) =>
            box(root(h).querySelector(variant === 'full' ? '.menu-toggle' : 'nav.inline'));
          const at = (h: Element) => box(root(h).querySelector('header'));
          expect(end(el).left - at(el).left).to.equal(end(plain).left - at(plain).left);
          expect(end(el).width).to.equal(end(plain).width);
          expect(end(el).right).to.be.at.most(320);
          expect(document.documentElement.scrollWidth).to.be.at.most(320);
        } finally {
          document.body.style.margin = '';
        }
      });
    }

    it('has no axe violations, wide and narrow', async () => {
      await setViewport({ width: 1280, height: 800 });
      const el = await header(`${attr(mode)} site-name="${NAME}"`);
      await expectNoAxeViolations(el);
      await setViewport({ width: 390, height: 800 });
      await nextFrame();
      await expectNoAxeViolations(el);
    });
  });

  describe(`site-page site-name (${mode})`, () => {
    afterEach(() => {
      localStorage.removeItem(COLOR_SCHEME_STORAGE_KEY);
      document.documentElement.removeAttribute('data-uva-color-scheme');
    });

    const page = async (attrs = '') => {
      const el = await fixture<SitePage>(
        `<site-page ${attr(mode)} no-alerts site-name="${NAME}" site-name-href="/etext/" ${attrs}>
          <h1>Collections</h1><p>Content</p>
        </site-page>`,
      );
      await el.updateComplete;
      const h = root(el).querySelector<SiteHeader>('site-header')!;
      await h.updateComplete;
      await nextFrame();
      return { el, h };
    };

    it('forwards site-name and site-name-href to its header', async () => {
      const { h } = await page();
      const a = root(h).querySelector<HTMLAnchorElement>('a.site-name')!;
      expect(a.textContent!.trim()).to.equal(NAME);
      expect(a.getAttribute('href')).to.equal('/etext/');
    });

    for (const scheme of ['light', 'dark'] as const) {
      it(`has no page axe violations in ${scheme} mode`, async () => {
        localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, scheme);
        const { h } = await page('color-scheme-switch');
        expect(document.documentElement.getAttribute('data-uva-color-scheme')).to.equal(scheme);
        const a = root(h).querySelector('a.site-name')!;
        expect(getComputedStyle(a).color).to.equal(
          scheme === 'dark' ? 'rgb(232, 232, 232)' : 'rgb(43, 43, 43)',
        );
        await expectNoPageAxeViolations();
      });
    }
  });
}

describe('site-header site-name (light) on and off', () => {
  it('keeps the moved alerts and the site links when the template changes', async () => {
    const el = await fixture<SiteHeader>(
      `<site-header no-shadow-dom><div slot="alerts" id="al">Alert</div><a slot="site-links" href="/x">X</a></site-header>`,
    );
    await el.updateComplete;
    for (const name of [NAME, '', NAME]) {
      el.siteName = name;
      await el.updateComplete;
      await nextFrame();
      const header = el.querySelector(':scope > header')!;
      expect(header.firstElementChild!.id, `alerts first (${name || 'none'})`).to.equal('al');
      expect(el.querySelector('nav.inline a')!.textContent!.trim()).to.equal('X');
      expect(!!el.querySelector('a.site-name')).to.equal(!!name);
      expect(el.querySelector('.site-links-source a')).to.not.equal(null);
    }
  });
});
