// downloads="event" (issue #19): downloads counted as ['download', '<extension>'] events,
// never with a URL; Matomo's link tracking off, outlinks still sent. Matomo is stubbed
// (test/helpers/analytics-intercept.mjs); every click is cancelled so no test navigates.
import { expect, fixture, html } from '@open-wc/testing';
import { LitElement } from 'lit';
import '../src/components/site-analytics/site-analytics.js';
import '../src/components/uvalib-analytics/uvalib-analytics.js';
import '../src/components/site-page/site-page.js';
import type { SiteAnalytics } from '../src/components/site-analytics/SiteAnalytics.js';
import type { SitePage } from '../src/components/site-page/SitePage.js';
import { define } from '../src/base/define.js';
import { paq, resetAnalytics } from './helpers/analytics.js';

const commands = (name: string) => paq().filter((c) => c[0] === name);
const events = () => commands('trackEvent').map((c) => c.slice(1));
const noNavigation = (e: Event) => e.preventDefault();

/** A left click, or with `button: 1` a middle click (auxclick), cancelled so it never navigates. */
function click(el: Element, button = 0) {
  el.dispatchEvent(
    new MouseEvent(button === 1 ? 'auxclick' : 'click', {
      button,
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
}

class ShadowLinks extends LitElement {
  override render() {
    return html`<a class="pdf" href="/files/minutes-1999.pdf">Minutes</a>
      <a class="out" href="https://example.org/">Elsewhere</a>`;
  }
}
define('test-shadow-download-links', ShadowLinks);

const LINKS = html`
  <a id="pdf" href="/files/meeting-42.PDF?x=1#p2">PDF</a>
  <a id="csv" href="https://files.example.org/data/export.csv">CSV elsewhere</a>
  <a id="attr" href="/download?id=42" download="minutes.docx">Download attr</a>
  <a id="bare" href="/download?id=42" download>Download, no name</a>
  <a id="page" href="/meetings/42">A page</a>
  <a id="out" href="https://example.org/about">Outlink</a>
  <a id="ignored" class="matomo_ignore" href="/files/x.pdf">Ignored</a>
  <div no-analytics><a id="private" href="/files/y.pdf">Private</a></div>
  <a id="tagged" href="/files/z.zip" data-uvalib-track="bov,pdf-download,result">Tagged</a>
  <test-shadow-download-links></test-shadow-download-links>
`;

describe('<site-analytics downloads="event">', () => {
  beforeEach(() => {
    resetAnalytics();
    window.addEventListener('click', noNavigation);
    window.addEventListener('auxclick', noNavigation);
  });
  afterEach(() => {
    window.removeEventListener('click', noNavigation);
    window.removeEventListener('auxclick', noNavigation);
    resetAnalytics();
  });

  const mount = async (tag: 'site-analytics' | 'uvalib-analytics', attrs = 'downloads="event"') => {
    const host = await fixture<HTMLElement>(
      `<div><${tag} matomoid="10" ${attrs}></${tag}><div class="links"></div></div>`,
    );
    const el = host.querySelector<SiteAnalytics>(tag)!;
    await el.updateComplete;
    return { host, el };
  };

  for (const tag of ['site-analytics', 'uvalib-analytics'] as const) {
    it(`${tag}: no Matomo link tracking or download extensions; the page view as before`, async () => {
      await mount(tag);
      expect(paq()).to.deep.equal([
        ['setTrackerUrl', 'https://analytics.lib.virginia.edu/matomo.php'],
        ['setSiteId', '10'],
        ['trackPageView'],
      ]);
    });
  }

  it('a click on a download sends [download, <extension>], never a URL or file name', async () => {
    await mount('site-analytics');
    const links = await fixture<HTMLElement>(html`<div>${LINKS}</div>`);
    const $ = (id: string) => links.querySelector(`#${id}`)!;
    for (const id of ['pdf', 'csv', 'attr', 'bare', 'page']) click($(id));
    expect(events()).to.deep.equal([
      ['download', 'pdf'],
      ['download', 'csv'],
      ['download', 'docx'],
      ['download', 'file'],
    ]);
    expect(JSON.stringify(paq())).not.to.match(/meeting-42|export\.csv|minutes|id=42/);
  });

  it('a middle click counts too; a right-button auxclick does not', async () => {
    await mount('site-analytics');
    const links = await fixture<HTMLElement>(html`<div>${LINKS}</div>`);
    click(links.querySelector('#pdf')!, 1);
    links
      .querySelector('#pdf')!
      .dispatchEvent(new MouseEvent('auxclick', { button: 2, bubbles: true, cancelable: true }));
    expect(events()).to.deep.equal([['download', 'pdf']]);
  });

  it('outlinks are still sent (trackLink), as Matomo link tracking would', async () => {
    await mount('site-analytics');
    const links = await fixture<HTMLElement>(html`<div>${LINKS}</div>`);
    click(links.querySelector('#out')!);
    expect(commands('trackLink')).to.deep.equal([
      ['trackLink', 'https://example.org/about', 'link'],
    ]);
  });

  it('matomo_ignore and no-analytics links send nothing', async () => {
    await mount('site-analytics');
    const links = await fixture<HTMLElement>(html`<div>${LINKS}</div>`);
    click(links.querySelector('#ignored')!);
    click(links.querySelector('#private')!);
    expect(events()).to.deep.equal([]);
  });

  it('data-uvalib-track on a download link sends its own event as well', async () => {
    await mount('site-analytics');
    const links = await fixture<HTMLElement>(html`<div>${LINKS}</div>`);
    click(links.querySelector('#tagged')!);
    expect(events()).to.deep.equal([
      ['bov', 'pdf-download', 'result'],
      ['download', 'zip'],
    ]);
  });

  it('a download link in shadow DOM counts; a shadow outlink is not sent (Matomo never saw it)', async () => {
    await mount('site-analytics');
    const links = await fixture<HTMLElement>(html`<div>${LINKS}</div>`);
    const shadow = links.querySelector<ShadowLinks>('test-shadow-download-links')!;
    await shadow.updateComplete;
    click(shadow.shadowRoot!.querySelector('.pdf')!);
    click(shadow.shadowRoot!.querySelector('.out')!);
    expect(events()).to.deep.equal([['download', 'pdf']]);
    expect(commands('trackLink')).to.deep.equal([]);
  });

  it('with spa: download events, and no outlinks (link tracking stays off, as before)', async () => {
    await mount('site-analytics', 'downloads="event" spa');
    const links = await fixture<HTMLElement>(html`<div>${LINKS}</div>`);
    click(links.querySelector('#pdf')!);
    click(links.querySelector('#out')!);
    expect(events()).to.deep.equal([['download', 'pdf']]);
    expect(commands('trackLink')).to.deep.equal([]);
  });

  it('default (no downloads attribute): unchanged, Matomo tracks the links itself', async () => {
    await mount('site-analytics', '');
    expect(commands('enableLinkTracking')).to.have.length(1);
    expect(commands('addDownloadExtensions')).to.have.length(1);
    const links = await fixture<HTMLElement>(html`<div>${LINKS}</div>`);
    click(links.querySelector('#pdf')!);
    click(links.querySelector('#out')!);
    expect(events()).to.deep.equal([]);
    expect(commands('trackLink')).to.deep.equal([]);
  });

  it('Do Not Track: nothing at all', async () => {
    Object.defineProperty(navigator, 'doNotTrack', { value: '1', configurable: true });
    try {
      await mount('site-analytics');
      const links = await fixture<HTMLElement>(html`<div>${LINKS}</div>`);
      click(links.querySelector('#pdf')!);
      expect(paq()).to.deep.equal([]);
    } finally {
      delete (navigator as unknown as Record<string, unknown>).doNotTrack;
    }
  });

  for (const mode of ['shadow', 'light'] as const) {
    it(`<site-page matomo-downloads="event"> passes it on (${mode})`, async () => {
      const page = await fixture<SitePage>(
        `<site-page ${mode === 'light' ? 'no-shadow-dom' : ''} no-alerts matomo-id="10" matomo-downloads="event"><h1>Page</h1><p><a id="dl" href="/f/a.pdf">PDF</a></p></site-page>`,
      );
      await customElements.whenDefined('site-analytics');
      const el = (page.shadowRoot ?? page).querySelector<SiteAnalytics>('site-analytics')!;
      await el.updateComplete;
      expect(el.getAttribute('downloads')).to.equal('event');
      expect(commands('enableLinkTracking')).to.deep.equal([]);
      click(page.querySelector('#dl')!);
      expect(events()).to.deep.equal([['download', 'pdf']]);
      page.matomoDownloads = undefined;
      await page.updateComplete;
      expect(el.hasAttribute('downloads')).to.equal(false);
    });
  }
});
