// <site-page>'s print styles (issue #20): the chrome is left out, <main> prints black on white
// with underlined links, and `print-chrome` keeps the page as shown. Shadow and light DOM.
import { expect, fixture, nextFrame } from '@open-wc/testing';
import { emulateMedia } from '@web/test-runner-commands';
import '../src/components/site-page/site-page.js';
import type { SitePage } from '../src/components/site-page/SitePage.js';

const root = (el: SitePage): ParentNode => el.shadowRoot ?? el;
const display = (n: Element | null) => (n ? getComputedStyle(n).display : 'missing');

const CONTENT = `<uvalib-breadcrumbs slot="breadcrumbs" id="crumbs"><a href="/">Home</a></uvalib-breadcrumbs>
  <h1 id="h">Minutes</h1>
  <p id="p">The board met. <a href="#x" id="link">Agenda</a></p>
  <p slot="pre-footer" id="pre">Pre-footer</p>`;

for (const mode of ['shadow', 'light'] as const) {
  describe(`site-page print (${mode})`, function () {
    this.timeout(10000);
    const make = (attrs = ''): Promise<SitePage> =>
      fixture<SitePage>(
        `<site-page ${mode === 'light' ? 'no-shadow-dom' : ''} site-name="Board of Visitors" ${attrs}>${CONTENT}</site-page>`,
      );
    const chrome = (el: SitePage) => {
      const r = root(el);
      return {
        header: r.querySelector('site-header'),
        footer: r.querySelector('site-footer'),
        regional: r.querySelector('main > site-alerts'),
        main: r.querySelector('main')!,
      };
    };

    afterEach(async () => {
      await emulateMedia({ media: 'screen', colorScheme: 'light' });
      document.documentElement.removeAttribute('data-uva-color-scheme');
    });

    it('on screen, nothing changes', async () => {
      const el = await make();
      await nextFrame();
      const c = chrome(el);
      expect(display(c.header)).to.equal('block');
      expect(display(c.footer)).to.equal('block');
      expect(display(document.getElementById('crumbs'))).to.equal('block');
      expect(getComputedStyle(c.main, '::before').content).to.equal('none');
      expect(getComputedStyle(c.main).paddingLeft).to.equal('40px');
    });

    it('prints only <main>: header, nav, alerts, breadcrumbs and footer are left out', async () => {
      const el = await make();
      await nextFrame();
      await emulateMedia({ media: 'print' });
      const c = chrome(el);
      expect(display(c.header), 'header').to.equal('none');
      expect(display(c.footer), 'footer (and the pre-footer in it)').to.equal('none');
      expect(display(c.regional), 'regional alerts').to.equal('none');
      expect(display(root(el).querySelector('.alerts-list')), 'alert band').to.equal('none');
      expect(document.getElementById('crumbs')!.getBoundingClientRect().height, 'crumbs').to.equal(
        0,
      );
      expect(document.getElementById('pre')!.getBoundingClientRect().height, 'pre-footer').to.equal(
        0,
      );
      if (mode === 'light')
        expect(display(el.querySelector(':scope > .skip-link'))).to.equal('none');
      expect(display(c.main)).to.equal('block');
      expect(document.getElementById('h')!.getBoundingClientRect().height).to.be.greaterThan(0);
      // No gutters: the content uses the page width.
      expect(getComputedStyle(c.main).paddingLeft).to.equal('0px');
      expect(document.getElementById('h')!.getBoundingClientRect().left).to.be.below(
        el.getBoundingClientRect().left + 1,
      );
    });

    it('prints black on white, with links underlined and black', async () => {
      const el = await make();
      await nextFrame();
      await emulateMedia({ media: 'print' });
      expect(getComputedStyle(el).color).to.equal('rgb(0, 0, 0)');
      expect(getComputedStyle(el).backgroundColor).to.equal('rgb(255, 255, 255)');
      expect(getComputedStyle(document.getElementById('p')!).color).to.equal('rgb(0, 0, 0)');
      // The base styles (global, unless no-global-styles) beat a host's plain link rules.
      const host = document.createElement('style');
      host.textContent = 'a { color: rgb(0, 123, 172); text-decoration: none; }';
      document.head.append(host);
      try {
        const link = getComputedStyle(document.getElementById('link')!);
        expect(link.textDecorationLine).to.equal('underline');
        expect(link.color).to.equal('rgb(0, 0, 0)');
        await emulateMedia({ media: 'screen' });
        expect(link.textDecorationLine).to.equal('none');
      } finally {
        host.remove();
      }
    });

    it('a dark scheme prints light', async () => {
      await emulateMedia({ colorScheme: 'dark' });
      await make('color-scheme-switch');
      await nextFrame();
      expect(document.documentElement.getAttribute('data-uva-color-scheme')).to.equal('system');
      expect(getComputedStyle(document.documentElement).colorScheme).to.equal('light dark');
      await emulateMedia({ media: 'print' });
      expect(getComputedStyle(document.documentElement).colorScheme).to.equal('light');
      expect(
        getComputedStyle(document.documentElement).getPropertyValue('--uva-color-scheme').trim(),
      ).to.equal('light');
    });

    it('prints where the page came from above the content: site name and URL', async () => {
      const el = await make();
      await nextFrame();
      await emulateMedia({ media: 'print' });
      const before = getComputedStyle(chrome(el).main, '::before');
      expect(before.display).to.equal('block');
      expect(before.content).to.contain('UVA Library — Board of Visitors');
      expect(before.content).to.contain(location.href);
    });

    it('falls back to the page title, and updates just before printing', async () => {
      const el = await make();
      el.removeAttribute('site-name');
      await el.updateComplete;
      const title = document.title;
      document.title = 'Meeting minutes "1999"';
      try {
        window.dispatchEvent(new Event('beforeprint'));
        await emulateMedia({ media: 'print' });
        const content = getComputedStyle(chrome(el).main, '::before').content;
        expect(content).to.contain('UVA Library — Meeting minutes \\"1999\\"');
      } finally {
        document.title = title;
      }
    });

    it('print-chrome keeps the chrome', async () => {
      const el = await make('print-chrome');
      await nextFrame();
      await emulateMedia({ media: 'print' });
      const c = chrome(el);
      expect(display(c.header)).to.equal('block');
      expect(display(c.footer)).to.equal('block');
      expect(document.getElementById('crumbs')!.getBoundingClientRect().height).to.be.greaterThan(
        0,
      );
      expect(getComputedStyle(c.main, '::before').content).to.equal('none');
      expect(el.printChrome).to.equal(true);
      el.printChrome = false;
      await el.updateComplete;
      expect(el.hasAttribute('print-chrome')).to.equal(false);
      expect(display(c.header)).to.equal('none');
    });
  });
}
