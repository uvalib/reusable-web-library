import { expect, fixture, aTimeout, nextFrame } from '@open-wc/testing';
import '../src/components/site-footer/site-footer.js';
import type { SiteFooter } from '../src/components/site-footer/SiteFooter.js';
import { expectNoAxeViolations } from './helpers/axe.js';

const root = (el: SiteFooter): ParentNode => el.shadowRoot ?? el;

for (const mode of ['shadow', 'light'] as const) {
  describe(`site-footer (${mode})`, () => {
    const make = async (attrs = '', children = ''): Promise<SiteFooter> => {
      const el = await fixture<SiteFooter>(
        `<site-footer ${mode === 'light' ? 'no-shadow-dom' : ''} ${attrs}>${children}</site-footer>`,
      );
      await aTimeout(0); // let slotchange settle
      return el;
    };
    const pre = (el: SiteFooter) => root(el).querySelector('.footer--pre') as HTMLElement;

    it('builds absolute links from root-link-domain', async () => {
      const el = await make('root-link-domain="https://bov.example.edu"');
      const anchors = [...root(el).querySelectorAll('a[href]')].filter((a) => {
        const h = a.getAttribute('href')!;
        return !/^(tel:|mailto:|https:\/\/guides\.)/.test(h) && !a.closest('.social-media');
      });
      expect(anchors.length).to.be.greaterThan(8);
      for (const a of anchors) {
        const h = a.getAttribute('href')!;
        expect(h.startsWith('https://bov.example.edu/'), h).to.equal(true);
        expect(h.startsWith('/')).to.equal(false);
      }
    });

    it('links tel, mailto, social and FDLP correctly', async () => {
      const el = await make();
      const href = (sel: string) => root(el).querySelector(sel)?.getAttribute('href');
      expect(href('a[href^="tel:"]')).to.equal('tel:+14349243021');
      expect(href('a[href^="mailto:"]')).to.equal('mailto:library@virginia.edu');
      expect(href('a[aria-label="UVA Library on Facebook"]')).to.equal(
        'https://www.facebook.com/UVALibrary/',
      );
      expect(href('a[aria-label="UVA Library on Instagram"]')).to.equal(
        'https://instagram.com/uvalibrary',
      );
      expect(root(el).querySelector('a[aria-label="UVA Library on Twitter"]')).to.equal(null);
      expect(href('a[aria-label="Federal Depository Library Program"]')).to.equal(
        'https://guides.lib.virginia.edu/findinggovinfo',
      );
      expect(root(el).querySelectorAll('svg:not([aria-hidden="true"])').length).to.equal(0);
    });

    it('shows the current address and live year', async () => {
      const el = await make();
      const text = (root(el) as ParentNode & { textContent: string }).textContent ?? '';
      expect(text).to.contain('160 McCormick Road');
      expect(text).to.contain('P.O. Box 400113');
      expect(text).to.contain('Charlottesville, VA 22904');
      expect(text).to.contain(`Copyright ${new Date().getFullYear()}`);
      expect(text).to.not.contain('2450 Old Ivy');
    });

    it('restores the old social icon size, FDLP logo width and italic address', async () => {
      const el = await make();
      const icons = [...root(el).querySelectorAll('.social-media svg')];
      expect(icons.length).to.equal(2);
      for (const icon of icons) {
        const r = icon.getBoundingClientRect();
        expect([r.width, r.height]).to.deep.equal([17, 17]);
      }
      const fdlp = root(el).querySelector('.footer--post svg')!.getBoundingClientRect();
      expect(fdlp.width).to.equal(17);
      const address = root(el).querySelector('address')!;
      expect(getComputedStyle(address).fontStyle).to.equal('italic');
      expect(getComputedStyle(address.querySelector('a')!).fontStyle).to.equal('italic');
    });

    it('hides .footer--pre without pre-footer content', async () => {
      const el = await make();
      expect(getComputedStyle(pre(el)).display).to.equal('none');
    });

    it('shows .footer--pre with pre-footer content', async () => {
      const el = await make('', '<p slot="pre-footer">x</p>');
      expect(getComputedStyle(pre(el)).display).to.not.equal('none');
      if (mode === 'light')
        expect(pre(el).querySelector('p[slot="pre-footer"]')).to.not.equal(null);
    });

    it('counts only flattened assigned content (shadow) so a forwarded empty slot stays hidden', async () => {
      if (mode === 'light') return;
      // Mimic <site-page>: a shadow root that forwards its own pre-footer slot into the footer.
      const host = await fixture<HTMLElement>('<div></div>');
      const sr = host.attachShadow({ mode: 'open' });
      sr.innerHTML = '<site-footer><slot name="pre-footer" slot="pre-footer"></slot></site-footer>';
      const el = sr.querySelector('site-footer') as SiteFooter;
      await el.updateComplete;
      await aTimeout(0);
      expect(getComputedStyle(pre(el)).display).to.equal('none');
      host.insertAdjacentHTML('beforeend', '<p slot="pre-footer">x</p>');
      await aTimeout(0);
      expect(getComputedStyle(pre(el)).display).to.not.equal('none');
    });

    it('moves/shows a late-appended pre-footer child', async () => {
      const el = await make();
      expect(getComputedStyle(pre(el)).display).to.equal('none');
      el.append(
        Object.assign(document.createElement('p'), { slot: 'pre-footer', textContent: 'late' }),
      );
      await nextFrame();
      await aTimeout(0);
      if (mode === 'light')
        expect(pre(el).querySelector('p[slot="pre-footer"]')).to.not.equal(null);
      expect(getComputedStyle(pre(el)).display).to.not.equal('none');
    });

    it('has only h2 headings, no skipped levels', async () => {
      const el = await make();
      const hs = [...root(el).querySelectorAll('h1,h2,h3,h4,h5,h6')];
      expect(hs.map((h) => h.tagName)).to.deep.equal(['H2', 'H2', 'H2']);
      expect(hs.map((h) => h.textContent)).to.deep.equal([
        'Using the Library',
        'About',
        'Contact us',
      ]);
    });

    it('has no axe violations with pre-footer content', async () => {
      await expectNoAxeViolations(await make('', '<p slot="pre-footer">x</p>'));
    });

    it('has no axe violations without pre-footer content', async () => {
      await expectNoAxeViolations(await make());
    });
  });
}

describe('site-footer ids', () => {
  it('two light-mode footers produce no duplicate ids', async () => {
    await fixture(
      '<div><site-footer no-shadow-dom></site-footer><site-footer no-shadow-dom></site-footer></div>',
    );
    await aTimeout(0);
    const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
    expect(new Set(ids).size).to.equal(ids.length);
    expect(document.querySelectorAll('site-footer [id]').length).to.equal(0);
  });
});
