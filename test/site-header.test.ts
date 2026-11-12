import { expect, fixture, html } from '@open-wc/testing';
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
      await el.updateComplete;
      expect(pop.matches(':popover-open')).to.equal(true);
      toggle.click();
      await el.updateComplete;
      expect(pop.matches(':popover-open')).to.equal(false);
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
