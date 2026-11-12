import { expect, fixture, nextFrame } from '@open-wc/testing';
import { setViewport } from '@web/test-runner-commands';
import '../src/components/site-page/site-page.js';
import type { SitePage } from '../src/components/site-page/SitePage.js';
import type { SiteFooter } from '../src/components/site-footer/SiteFooter.js';
import { TYPEKIT_URL } from '../src/styles/base.js';
import { expectNoAxeViolations } from './helpers/axe.js';

const root = (el: SitePage): ParentNode => el.shadowRoot ?? el;

/** Wait for the dynamically imported footer to upgrade and render. */
async function footerReady(el: SitePage): Promise<SiteFooter> {
  await customElements.whenDefined('site-footer');
  const footer = root(el).querySelector('site-footer') as SiteFooter;
  await footer.updateComplete;
  await nextFrame(); // slotchange / mutation observers
  return footer;
}

const typekitLinks = () => document.head.querySelectorAll(`link[href="${TYPEKIT_URL}"]`);
const removeTypekitLinks = () => typekitLinks().forEach((l) => l.remove());

/** Document sheets holding the unscoped global page styles (a bare `:root` rule inside @layer). */
const globalSheets = () =>
  document.adoptedStyleSheets.filter((s) =>
    [...s.cssRules].some((l) =>
      [...((l as CSSLayerBlockRule).cssRules ?? [])].some(
        (r) => (r as CSSStyleRule).selectorText === ':root',
      ),
    ),
  );

for (const mode of ['shadow', 'light'] as const) {
  describe(`site-page (${mode})`, () => {
    const make = (attrs = '', children = ''): Promise<SitePage> =>
      fixture<SitePage>(
        `<site-page ${mode === 'light' ? 'no-shadow-dom' : ''} ${attrs}>${children}</site-page>`,
      );

    it('has exactly one main and one #main-content', async () => {
      const el = await make('', '<p>content</p>');
      if (mode === 'light') {
        expect(document.querySelectorAll('main').length).to.equal(1);
        expect(document.querySelectorAll('#main-content').length).to.equal(1);
      } else {
        expect(el.shadowRoot!.querySelectorAll('main').length).to.equal(1);
        expect(el.shadowRoot!.querySelectorAll('#main-content').length).to.equal(1);
        expect(document.querySelectorAll('main').length).to.equal(0);
      }
      const main = root(el).querySelector('main')!;
      expect(main.id).to.equal('main-content');
      expect(main.getAttribute('tabindex')).to.equal('-1');
      expect(main.getAttribute('part')).to.equal('main');
    });

    describe('content padding (old main-box layout)', () => {
      afterEach(() => setViewport({ width: 800, height: 600 }));

      for (const [w, h] of [
        [1280, 900],
        [390, 844],
      ] as const) {
        it(`pads <main> 40px horizontally at ${w}px`, async () => {
          await setViewport({ width: w, height: h });
          const el = await make('', '<p id="c">content</p>');
          const main = root(el).querySelector('main')!;
          const cs = getComputedStyle(main);
          expect([cs.paddingLeft, cs.paddingRight]).to.deep.equal(['40px', '40px']);
          const c = document.getElementById('c')!.getBoundingClientRect();
          expect(c.left).to.equal(40);
        });
      }

      it('caps and centres <main> at 1600px', async () => {
        await setViewport({ width: 1800, height: 900 });
        const el = await make('', '<p>content</p>');
        const r = root(el).querySelector('main')!.getBoundingClientRect();
        expect(r.width).to.equal(1600);
        expect(r.left).to.equal(100);
      });
    });

    it('renders skip link, header, main, footer in order', async () => {
      const el = await make();
      const order = [...root(el).children]
        .filter((c) => c.matches('a.skip-link, site-header, main, site-footer'))
        .map((c) => c.localName);
      expect(order).to.deep.equal(['a', 'site-header', 'main', 'site-footer']);
      const skip = root(el).querySelector('.skip-link')!;
      expect(skip.getAttribute('href')).to.equal('#main-content');
      expect(skip.textContent!.trim()).to.equal('Skip to main content');
    });

    it('clicking the skip link focuses main', async () => {
      const el = await make('', '<p>content</p>');
      (root(el).querySelector('.skip-link') as HTMLAnchorElement).click();
      const main = root(el).querySelector('main');
      const active = mode === 'light' ? document.activeElement : el.shadowRoot!.activeElement;
      expect(active).to.equal(main);
    });

    it('propagates mode, no-style, header-variant and root-link-domain', async () => {
      const el = await make('no-style header-variant="vendor" root-link-domain="https://x.edu"');
      const header = root(el).querySelector('site-header')!;
      const footer = root(el).querySelector('site-footer')!;
      for (const c of [header, footer]) {
        expect(c.hasAttribute('no-shadow-dom')).to.equal(mode === 'light');
        expect(c.hasAttribute('no-style')).to.equal(true);
        expect(c.getAttribute('root-link-domain')).to.equal('https://x.edu');
      }
      expect(header.getAttribute('variant')).to.equal('vendor');
      await footerReady(el);
      expect(header.shadowRoot === null).to.equal(mode === 'light');
      expect(footer.shadowRoot === null).to.equal(mode === 'light');
    });

    it('shows pre-footer content in the footer', async () => {
      const el = await make('', '<p>body</p><p slot="pre-footer" id="pf">announcement</p>');
      const footer = await footerReady(el);
      const pf = document.getElementById('pf')!;
      const wrapper = (footer.shadowRoot ?? footer).querySelector('.footer--pre')!;
      expect(wrapper.classList.contains('has-content')).to.equal(true);
      if (mode === 'light') expect(pf.parentElement).to.equal(wrapper);
      else expect(pf.assignedSlot?.assignedSlot?.getRootNode()).to.equal(footer.shadowRoot);
    });

    it('has no serious axe violations on a full page', async () => {
      const el = await make(
        '',
        '<h1>Page title</h1><p>Body <a href="/x">link</a></p><p slot="pre-footer">Notice</p>',
      );
      await footerReady(el);
      await expectNoAxeViolations(document.body);
    });
  });
}

describe('site-page light-DOM content routing', () => {
  it('moves original children (including text) into main', async () => {
    const el = await fixture<SitePage>(
      '<site-page no-shadow-dom>hello <p id="c">x</p></site-page>',
    );
    const main = el.querySelector('main')!;
    expect(document.getElementById('c')!.parentElement).to.equal(main);
    expect(main.textContent).to.contain('hello');
  });

  it('moves later-added children into main', async () => {
    const el = await fixture<SitePage>('<site-page no-shadow-dom><p id="c">x</p></site-page>');
    el.append(Object.assign(document.createElement('p'), { id: 'late' }));
    await nextFrame();
    expect(document.getElementById('late')!.parentElement).to.equal(el.querySelector('main'));
  });

  it('routes later-added pre-footer children to the footer', async () => {
    const el = await fixture<SitePage>('<site-page no-shadow-dom></site-page>');
    await footerReady(el);
    const p = Object.assign(document.createElement('p'), { id: 'late-pf' });
    p.slot = 'pre-footer';
    el.append(p);
    await nextFrame();
    expect(p.closest('.footer--pre')).to.not.equal(null);
    expect(el.querySelector('main')!.contains(p)).to.equal(false);
  });

  it('does not duplicate chrome when removed and re-appended', async () => {
    const el = await fixture<SitePage>('<site-page no-shadow-dom><p>x</p></site-page>');
    await footerReady(el);
    const parent = el.parentElement!;
    el.remove();
    const whileAway = Object.assign(document.createElement('p'), { id: 'away' });
    el.append(whileAway);
    parent.append(el);
    await el.updateComplete;
    await nextFrame();
    expect(el.querySelectorAll('site-header').length).to.equal(1);
    expect(el.querySelectorAll('main').length).to.equal(1);
    expect(el.querySelectorAll('site-footer').length).to.equal(1);
    expect(document.querySelectorAll('main').length).to.equal(1);
    expect(whileAway.parentElement).to.equal(el.querySelector('main'));
    // observer is live again after reconnect
    const later = Object.assign(document.createElement('p'), { id: 'later' });
    el.append(later);
    await nextFrame();
    expect(later.parentElement).to.equal(el.querySelector('main'));
  });
});

describe('site-page global styles', () => {
  beforeEach(removeTypekitLinks);

  it('adds one Typekit link and one global sheet for two pages', async () => {
    await fixture('<div><site-page></site-page><site-page no-shadow-dom></site-page></div>');
    expect(typekitLinks().length).to.equal(1);
    const link = typekitLinks()[0] as HTMLLinkElement;
    expect(link.rel).to.equal('stylesheet');
    expect(globalSheets().length).to.equal(1);
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--uva-brand-blue').trim(),
    ).to.equal('#232D4B');
  });

  it('adds no Typekit link with no-global-styles', async () => {
    await fixture(
      '<div><site-page no-global-styles></site-page><site-page no-shadow-dom no-global-styles></site-page></div>',
    );
    expect(typekitLinks().length).to.equal(0);
  });
});

describe('site-page exported parts (shadow mode)', () => {
  for (const [part, selector] of [
    ['header', 'site-header'],
    ['footer', 'site-footer'],
  ] as const) {
    it(`document CSS site-page::part(${part}) styles the inner <${part}>`, async () => {
      const style = document.createElement('style');
      style.textContent = `site-page::part(${part}) { outline: 3px solid rgb(1, 2, 3); }`;
      document.head.append(style);
      try {
        const el = await fixture<SitePage>('<site-page></site-page>');
        await footerReady(el);
        const host = el.shadowRoot!.querySelector(selector) as HTMLElement & {
          updateComplete: Promise<unknown>;
        };
        await host.updateComplete;
        await nextFrame();
        const inner = host.shadowRoot!.querySelector(part)!;
        expect(getComputedStyle(inner).outlineColor).to.equal('rgb(1, 2, 3)');
      } finally {
        style.remove();
      }
    });
  }
});
