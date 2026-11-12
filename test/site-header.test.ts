import { expect, fixture, html } from '@open-wc/testing';
import { setViewport } from '@web/test-runner-commands';
import '../src/components/site-header/site-header.js';
import type { SiteHeader } from '../src/components/site-header/SiteHeader.js';
import { expectNoAxeViolations } from './helpers/axe.js';

const root = (el: SiteHeader): ParentNode => el.shadowRoot ?? el;

for (const mode of ['shadow', 'light'] as const) {
  describe(`site-header (${mode})`, () => {
    const make = (attrs = ''): Promise<SiteHeader> => {
      const tpl = `<site-header ${mode === 'light' ? 'no-shadow-dom' : ''} ${attrs}></site-header>`;
      return fixture<SiteHeader>(tpl);
    };

    it('builds links from root-link-domain', async () => {
      const el = await make('root-link-domain="https://www.library.virginia.edu/"');
      const hours = [...root(el).querySelectorAll('nav a')].find((a) => a.textContent === 'Hours');
      expect(hours?.getAttribute('href')).to.equal('https://www.library.virginia.edu/hours');
      const acct = [...root(el).querySelectorAll('nav a')].find(
        (a) => a.textContent === 'My account',
      );
      expect(acct?.getAttribute('href')).to.equal('https://search.lib.virginia.edu/account');
    });

    it('uses no ARIA menu roles', async () => {
      const el = await make();
      expect(root(el).querySelector('[role=menu],[role=menuitem],[role=menubar]')).to.equal(null);
    });

    it('full variant has 6 utility links and a menu toggle', async () => {
      const el = await make();
      expect(root(el).querySelectorAll('nav[aria-label="Utility"] li').length).to.equal(6);
      expect(root(el).querySelector('.menu-toggle')).to.not.equal(null);
    });

    it('vendor variant has only Ask a Librarian and no toggle', async () => {
      const el = await make('variant="vendor"');
      const links = root(el).querySelectorAll('nav[aria-label="Utility"] a');
      expect(links.length).to.equal(1);
      expect(links[0].textContent).to.equal('Ask a Librarian');
      expect(root(el).querySelector('.menu-toggle')).to.equal(null);
    });

    it('toggle opens and closes the popover', async () => {
      const el = await make();
      const toggle = root(el).querySelector('.menu-toggle') as HTMLButtonElement;
      const pop = root(el).querySelector('[popover]') as HTMLElement;
      expect(toggle.getAttribute('aria-controls')).to.equal(pop.id);
      expect(pop.matches(':popover-open')).to.equal(false);
      toggle.click();
      expect(pop.matches(':popover-open')).to.equal(true);
      toggle.click();
      expect(pop.matches(':popover-open')).to.equal(false);
    });

    describe('old look', () => {
      beforeEach(() => setViewport({ width: 1280, height: 900 }));
      afterEach(() => setViewport({ width: 800, height: 600 }));

      it('utility links use the old teal-blue (--uva-blue-alt-dark #005679)', async () => {
        const el = await make();
        const a = root(el).querySelector('nav[aria-label="Utility"] a')!;
        expect(getComputedStyle(a).color).to.equal('rgb(0, 86, 121)');
      });

      it('logo and nav sit at the old vertical offset', async () => {
        const el = await make();
        const top = root(el).querySelector('header')!.getBoundingClientRect().top;
        const logo = root(el).querySelector('.logo img')!.getBoundingClientRect().top - top;
        const nav = root(el).querySelector('nav a')!.getBoundingClientRect().top - top;
        expect(logo).to.be.within(8, 10); // old: 0.5rem padding, no effective logo margin
        expect(nav).to.be.within(24, 28); // old: nav hangs from the top, below the default ul margin
      });
    });

    describe('at 390x844', () => {
      beforeEach(() => setViewport({ width: 390, height: 844 }));
      afterEach(() => setViewport({ width: 800, height: 600 }));

      it('keeps the vendor link visible and inside the viewport', async () => {
        const el = await make('variant="vendor"');
        const r = root(el).querySelector('nav a')!.getBoundingClientRect();
        expect(r.width).to.be.greaterThan(0);
        expect(r.left).to.be.at.least(0);
        expect(r.right).to.be.at.most(window.innerWidth);
      });

      it('full variant shows the toggle and hides the inline nav', async () => {
        const el = await make();
        const toggle = root(el).querySelector('.menu-toggle')!.getBoundingClientRect();
        const nav = root(el).querySelector('nav.inline')!.getBoundingClientRect();
        expect(toggle.width).to.be.greaterThan(0);
        expect(nav.width).to.equal(0);
      });

      it('opens the popover inside the viewport, below the toggle', async () => {
        const el = await make();
        const toggle = root(el).querySelector('.menu-toggle') as HTMLButtonElement;
        const pop = root(el).querySelector('[popover]') as HTMLElement;
        toggle.click();
        const r = pop.getBoundingClientRect();
        expect(pop.matches(':popover-open')).to.equal(true);
        expect(r.left).to.be.at.least(0);
        expect(r.right).to.be.at.most(window.innerWidth);
        expect(r.bottom).to.be.at.most(window.innerHeight);
        expect(r.top).to.be.at.least(toggle.getBoundingClientRect().bottom);
      });
    });

    describe('layout', () => {
      afterEach(() => setViewport({ width: 800, height: 600 }));

      it('toggle sits at the right edge at 390x844', async () => {
        await setViewport({ width: 390, height: 844 });
        const el = await make();
        const header = root(el).querySelector('header')!.getBoundingClientRect();
        const toggle = root(el).querySelector('.menu-toggle')!.getBoundingClientRect();
        expect(header.right - toggle.right).to.be.lessThan(24);
      });

      it('nav and logo hug the edges at 1280x900', async () => {
        await setViewport({ width: 1280, height: 900 });
        const el = await make();
        const header = root(el).querySelector('header')!.getBoundingClientRect();
        const nav = root(el).querySelector('nav.inline')!.getBoundingClientRect();
        const logo = root(el).querySelector('.logo')!.getBoundingClientRect();
        expect(header.right - nav.right).to.be.lessThan(24);
        expect(logo.left - header.left).to.be.lessThan(24);
      });
    });

    it('anchors the popover only inside @supports, keeping a fixed fallback', async () => {
      const el = await make();
      const sheets =
        mode === 'shadow'
          ? [...(el.shadowRoot as ShadowRoot).adoptedStyleSheets]
          : [...document.adoptedStyleSheets];
      // Flatten nested rules (@layer, @media, @supports), remembering the @supports ancestors.
      const flat: { rule: CSSStyleRule; inSupports: string[] }[] = [];
      const walk = (rules: CSSRuleList, inSupports: string[]) => {
        for (const r of rules) {
          if (r instanceof CSSStyleRule) flat.push({ rule: r, inSupports });
          else if (r instanceof CSSSupportsRule) walk(r.cssRules, [...inSupports, r.conditionText]);
          else if ('cssRules' in r) walk((r as CSSGroupingRule).cssRules, inSupports);
        }
      };
      sheets.forEach((sh) => walk(sh.cssRules, []));
      const popover = flat.filter(({ rule }) => rule.selectorText.includes('[popover]'));
      const anchored = popover.filter(({ rule }) =>
        rule.cssText.includes('anchor(var(--menu-anchor)'),
      );
      expect(anchored.length).to.be.greaterThan(0);
      for (const a of anchored) expect(a.inSupports.join()).to.contain('top: anchor(');
      const base = popover.filter(
        ({ rule, inSupports }) =>
          !inSupports.length && /(^|[^-])(top|inset): 4\.75rem/.test(rule.cssText),
      );
      expect(base.length, 'unconditional top: 4.75rem fallback').to.be.greaterThan(0);
    });

    it('has no serious axe violations', async () => {
      const el = await make();
      await expectNoAxeViolations(el);
    });
  });
}

describe('site-header ids', () => {
  it('gives light-DOM instances distinct popover ids', async () => {
    const wrap = await fixture(
      html`<div>
        <site-header no-shadow-dom></site-header><site-header no-shadow-dom></site-header>
      </div>`,
    );
    const ids = [...wrap.querySelectorAll('[popover]')].map((p) => p.id);
    expect(ids.length).to.equal(2);
    expect(ids[0]).to.not.equal(ids[1]);
  });
});
