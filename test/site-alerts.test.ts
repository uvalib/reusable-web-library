import { expect, fixture, nextFrame } from '@open-wc/testing';
import { setViewport } from '@web/test-runner-commands';
import '../src/components/site-page/site-page.js';
import { ALERTS_PRODUCTION_SRC, ALERTS_STAGING_SRC } from '../src/components/site-page/SitePage.js';
import type { SitePage } from '../src/components/site-page/SitePage.js';
import type { SiteHeader } from '../src/components/site-header/SiteHeader.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { ALERTS_HOSTS } from './helpers/alerts-intercept.mjs';
import { normalizeMarkup } from './helpers/header-snapshot.js';

// The alerts hosts are routed to a stub by the test runner (test/helpers/alerts-intercept.mjs):
// https://alerts.test/ serves the same stub, https://alerts-fail.test/ fails every request.
// The stub does not reproduce the real component's markup: it renders one plain row per alert
// set with __uvalibAlertsStubSet() and dispatches a realistic uvalib-alerts-update.
const CUSTOM = 'https://alerts.test/custom/';
const FAIL = 'https://alerts-fail.test/';
const SCRIPT = (base: string) => `${base}v1/uvalib-alerts.js`;

type StubAlert = { uuid: string; title: string; body: string };
type StubState = {
  headerAlerts?: StubAlert[];
  menuAlerts?: StubAlert[];
  regionalAlerts?: StubAlert[];
};
const ALERT = (n: number): StubAlert => ({ uuid: `u${n}`, title: `Alert ${n}`, body: 'Body' });

type Updatable = HTMLElement & { updateComplete: Promise<unknown> };
type StubWindow = Window & {
  __uvalibAlertsStub?: number;
  __uvalibAlertsStubSet?: (state?: StubState) => void;
  __warnings: string[];
};

const root = (el: Element): ParentNode => el.shadowRoot ?? el;

async function settle(...els: Element[]): Promise<void> {
  for (let i = 0; i < 2; i++) {
    await nextFrame();
    for (const el of els) await (el as Updatable).updateComplete;
  }
}

/** Every element matching `selector` in `node` and its open shadow roots. */
function deepAll(node: ParentNode, selector: string): Element[] {
  const found = [...node.querySelectorAll(selector)];
  for (const el of node.querySelectorAll('*')) {
    if (el.shadowRoot) found.push(...deepAll(el.shadowRoot, selector));
  }
  return found;
}

const alertsOf = (el: Element) => deepAll(root(el), 'uvalib-alerts');
const headerOf = (el: SitePage) => root(el).querySelector('site-header') as SiteHeader;
const mainOf = (el: SitePage) => root(el).querySelector('main')!;
/** The list band: a labelled region between the header and <main>. */
const bandOf = (el: SitePage) =>
  ([...(root(el) as Element).children].find((c) => c.matches('section.alerts-list')) ??
    null) as HTMLElement | null;

/** Set the stub's alerts for every connected element, then let the page re-render. */
async function stubAlerts(state: StubState | undefined, ...els: Element[]): Promise<void> {
  await customElements.whenDefined('uvalib-alerts');
  (window as unknown as StubWindow).__uvalibAlertsStubSet!(state);
  await settle(...els);
}
/** `node` is rendered in the page's <main> (slotted into it in shadow mode). */
const inMain = (el: SitePage, node: Element) =>
  (node.assignedSlot ?? node).closest('main') === mainOf(el);
const headerAlert = (el: SitePage) =>
  alertsOf(el).find((a) => a.getAttribute('show') === 'header')!;

/** Capture console.warn calls made while `fn` runs. */
async function warnings(fn: () => Promise<void>): Promise<unknown[][]> {
  const warn = console.warn;
  const calls: unknown[][] = [];
  console.warn = (...args: unknown[]) => void calls.push(args);
  try {
    await fn();
  } finally {
    console.warn = warn;
  }
  return calls;
}

for (const mode of ['shadow', 'light'] as const) {
  const light = mode === 'light' ? 'no-shadow-dom' : '';

  describe(`site-page alerts (${mode})`, () => {
    afterEach(async () => {
      (window as unknown as StubWindow).__uvalibAlertsStubSet?.(undefined);
      await setViewport({ width: 800, height: 600 });
    });

    const make = async (attrs = '', children = '<p id="c">content</p>'): Promise<SitePage> => {
      const el = await fixture<SitePage>(`<site-page ${light} ${attrs}>${children}</site-page>`);
      await settle(el, headerOf(el));
      return el;
    };

    /** The three alert elements, in document order, as [show, src] pairs. */
    const shown = (el: SitePage) =>
      alertsOf(el).map((a) => [a.getAttribute('show'), a.getAttribute('src')]);

    /** The header alert is in <header> after the skip link and before the logo row. */
    function expectHeaderPlacement(el: SitePage) {
      const h = headerOf(el);
      const alert = headerAlert(el);
      const skip = root(el).querySelector('.skip-link')!;
      if (mode === 'shadow') {
        const header = h.shadowRoot!.querySelector('header')!;
        const slot = header.querySelector<HTMLSlotElement>(':scope > slot[name="alerts"]')!;
        expect(alert.getAttribute('slot')).to.equal('alerts');
        expect(alert.assignedSlot).to.equal(slot);
        expect(slot.previousElementSibling).to.equal(
          header.querySelector(':scope > slot[name="skip-link"]'),
        );
        expect(slot.nextElementSibling).to.equal(header.querySelector(':scope > .logo'));
        expect(skip.assignedSlot?.name).to.equal('skip-link');
      } else {
        const header = h.querySelector(':scope > header')!;
        expect(alert.parentElement).to.equal(header);
        expect(header.firstElementChild).to.equal(alert);
        const logo = header.querySelector(':scope > .logo')!;
        expect(alert.compareDocumentPosition(logo) & Node.DOCUMENT_POSITION_FOLLOWING).to.not.equal(
          0,
        );
        expect(skip.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).to.not.equal(
          0,
        );
      }
    }

    /**
     * The list band is a labelled <section> between <site-header> and <main>, holding the
     * list alerts; regional is the first child of <main>, before any content.
     */
    function expectMainPlacement(el: SitePage) {
      const band = bandOf(el)!;
      expect(band, 'list band').to.not.equal(null);
      expect(band.previousElementSibling!.localName).to.equal('site-header');
      expect(band.nextElementSibling).to.equal(mainOf(el));
      expect(band.getAttribute('aria-label')).to.equal('Library alerts');
      expect([...band.children].map((k) => [k.localName, k.getAttribute('show')])).to.deep.equal([
        ['uvalib-alerts', 'list'],
      ]);
      const kids = [...mainOf(el).children];
      expect([kids[0]!.localName, kids[0]!.getAttribute('show')]).to.deep.equal([
        'uvalib-alerts',
        'regional',
      ]);
      // Light mode: nothing at all precedes it (shadow mode has Lit's comment markers).
      if (mode === 'light') expect(mainOf(el).firstChild).to.equal(kids[0]);
      if (mode === 'shadow') expect(kids[1]!.localName).to.equal('slot');
      else if (document.getElementById('c'))
        expect(kids.indexOf(document.getElementById('c')!)).to.be.greaterThan(0);
    }

    it('renders header, list and regional alerts from production by default', async () => {
      const el = await make();
      expect(shown(el)).to.deep.equal([
        ['header', ALERTS_PRODUCTION_SRC],
        ['list', ALERTS_PRODUCTION_SRC],
        ['regional', ALERTS_PRODUCTION_SRC],
      ]);
      // The storage key and headless mode stay the component defaults.
      for (const a of alertsOf(el)) {
        expect(a.hasAttribute('storage-key')).to.equal(false);
        expect(a.hasAttribute('headless')).to.equal(false);
      }
      expect(el.hasAttribute('alerts-env')).to.equal(false);
    });

    it('places the header alert in <header>, the list band before <main>, regional first in <main>', async () => {
      const el = await make();
      expectHeaderPlacement(el);
      expectMainPlacement(el);
      expect(inMain(el, document.getElementById('c')!)).to.equal(true);
      expect(mainOf(el).contains(headerAlert(el))).to.equal(false);
    });

    it('keeps the alerts first in <main> when content is added later', async () => {
      const el = await make();
      const late = Object.assign(document.createElement('p'), { id: 'late' });
      el.append(late);
      await settle(el);
      expectMainPlacement(el);
      if (mode === 'light') expect(late.parentElement).to.equal(mainOf(el));
    });

    it('uses staging with alerts-env="staging"', async () => {
      const el = await make('alerts-env="staging"');
      expect(shown(el).map((s) => s[1])).to.deep.equal(Array(3).fill(ALERTS_STAGING_SRC));
    });

    it('accepts alerts-env="production" explicitly', async () => {
      const calls = await warnings(async () => {
        const el = await make('alerts-env="production"');
        expect(shown(el).map((s) => s[1])).to.deep.equal(Array(3).fill(ALERTS_PRODUCTION_SRC));
      });
      expect(calls).to.deep.equal([]);
    });

    it('stacks banner, logo row, main nav row and alerts band at 1280px', async () => {
      await setViewport({ width: 1280, height: 900 });
      const el = await make();
      await stubAlerts({ headerAlerts: [ALERT(1)], menuAlerts: [ALERT(2)] }, el, headerOf(el));
      const h = root(headerOf(el));
      const header = h.querySelector('header')!.getBoundingClientRect();
      const banner = headerAlert(el).getBoundingClientRect();
      const logo = h.querySelector('.logo')!.getBoundingClientRect();
      const bar = h.querySelector('header > site-main-nav')!.getBoundingClientRect();
      const band = bandOf(el)!.getBoundingClientRect();
      expect(banner.height).to.be.greaterThan(0);
      expect(banner.top, 'banner at the top of the header').to.be.closeTo(header.top, 0.5);
      expect(logo.top, 'logo row under the banner').to.be.at.least(banner.bottom);
      expect(bar.top, 'main nav under the logo row').to.be.at.least(logo.bottom);
      expect(bar.bottom, 'main nav flush with the header bottom').to.be.closeTo(header.bottom, 0.5);
      expect(band.height).to.be.greaterThan(0);
      expect(band.top, 'alerts band right under the header').to.be.closeTo(header.bottom, 0.5);
    });

    it('alerts-src overrides the base URL and wins over alerts-env', async () => {
      const el = await make(`alerts-env="staging" alerts-src="${CUSTOM}"`);
      expect(shown(el).map((s) => s[1])).to.deep.equal(Array(3).fill(CUSTOM));
    });

    it('warns once for an invalid alerts-env and falls back to production', async () => {
      let el!: SitePage;
      const calls = await warnings(async () => {
        el = await make('alerts-env="prod"');
        el.rootLinkDomain = 'https://x.edu'; // an unrelated re-render does not warn again
        await settle(el, headerOf(el));
      });
      expect(calls.length).to.equal(1);
      expect(String(calls[0]![0])).to.contain('alerts-env');
      expect(String(calls[0]![0])).to.contain('prod');
      expect(shown(el).map((s) => s[1])).to.deep.equal(Array(3).fill(ALERTS_PRODUCTION_SRC));
    });

    it('renders no alert elements with no-alerts', async () => {
      const el = await make('no-alerts');
      expect(alertsOf(el)).to.deep.equal([]);
      expect(alertsOf(headerOf(el))).to.deep.equal([]);
      expect(bandOf(el)).to.equal(null);
      expect(deepAll(root(el), 'section').length).to.equal(0);
      expect(mainOf(el).firstElementChild!.localName).to.equal(mode === 'shadow' ? 'slot' : 'p');
    });

    it('adds and removes the alert elements when no-alerts toggles', async () => {
      const el = await make();
      const before = alertsOf(el);
      el.setAttribute('no-alerts', '');
      await settle(el, headerOf(el));
      expect(alertsOf(el)).to.deep.equal([]);
      expect(bandOf(el)).to.equal(null);
      for (const a of before) expect(a.isConnected).to.equal(false);
      expect(inMain(el, document.getElementById('c')!)).to.equal(true);

      el.removeAttribute('no-alerts');
      await settle(el, headerOf(el));
      expect(shown(el).map((s) => s[0])).to.deep.equal(['header', 'list', 'regional']);
      expectHeaderPlacement(el);
      expectMainPlacement(el);
      expect(document.getElementById('c')!.textContent).to.equal('content');
    });

    it('updates src on the existing elements when alerts-env or alerts-src change', async () => {
      const el = await make();
      const before = alertsOf(el);
      el.setAttribute('alerts-env', 'staging');
      await settle(el);
      expect(alertsOf(el)).to.deep.equal(before);
      expect(shown(el).map((s) => s[1])).to.deep.equal(Array(3).fill(ALERTS_STAGING_SRC));

      el.setAttribute('alerts-src', CUSTOM);
      await settle(el);
      expect(alertsOf(el)).to.deep.equal(before);
      expect(shown(el).map((s) => s[1])).to.deep.equal(Array(3).fill(CUSTOM));

      el.removeAttribute('alerts-src');
      await settle(el);
      expect(shown(el).map((s) => s[1])).to.deep.equal(Array(3).fill(ALERTS_STAGING_SRC));

      el.removeAttribute('alerts-env');
      await settle(el);
      expect(alertsOf(el)).to.deep.equal(before);
      expect(shown(el).map((s) => s[1])).to.deep.equal(Array(3).fill(ALERTS_PRODUCTION_SRC));
    });

    it('does not duplicate alerts when removed and re-appended', async () => {
      const el = await make();
      const before = alertsOf(el);
      const parent = el.parentElement!;
      el.remove();
      parent.append(el);
      await settle(el, headerOf(el));
      expect(alertsOf(el)).to.deep.equal(before);
      expect(deepAll(root(el), 'section.alerts-list').length).to.equal(1);
      expectHeaderPlacement(el);
      expectMainPlacement(el);
    });

    it('gives the vendor header variant the same alerts', async () => {
      const el = await make('header-variant="vendor"');
      expect(shown(el)).to.deep.equal([
        ['header', ALERTS_PRODUCTION_SRC],
        ['list', ALERTS_PRODUCTION_SRC],
        ['regional', ALERTS_PRODUCTION_SRC],
      ]);
      expectHeaderPlacement(el);
      expectMainPlacement(el);
    });

    describe('list band visibility', () => {
      it('is hidden before the first update and while the list is empty', async () => {
        const el = await make();
        expect(bandOf(el)!.hidden).to.equal(true);
        await stubAlerts({ headerAlerts: [ALERT(1)] }, el);
        expect(bandOf(el)!.hidden, 'only a header alert').to.equal(true);
        expect(bandOf(el)!.checkVisibility()).to.equal(false);
      });

      it('shows with list alerts and hides again when they go', async () => {
        const el = await make();
        await stubAlerts({ menuAlerts: [ALERT(1), ALERT(2)] }, el);
        const band = bandOf(el)!;
        expect(band.hidden).to.equal(false);
        expect(band.checkVisibility()).to.equal(true);
        await stubAlerts({ menuAlerts: [] }, el);
        expect(band.hidden).to.equal(true);
        await stubAlerts({ menuAlerts: [ALERT(3)] }, el);
        expect(band.hidden).to.equal(false);
      });

      it('ignores update events from the header and regional alerts', async () => {
        const el = await make();
        await stubAlerts({ menuAlerts: [ALERT(1)] }, el);
        const regional = alertsOf(el).find((a) => a.getAttribute('show') === 'regional')!;
        regional.dispatchEvent(
          new CustomEvent('uvalib-alerts-update', {
            detail: { menuAlerts: [] },
            bubbles: true,
            composed: true,
          }),
        );
        await settle(el);
        expect(bandOf(el)!.hidden).to.equal(false);
      });

      it('starts hidden again after no-alerts is toggled off and on', async () => {
        const el = await make();
        await stubAlerts({ menuAlerts: [ALERT(1)] }, el);
        el.setAttribute('no-alerts', '');
        await settle(el, headerOf(el));
        (window as unknown as StubWindow).__uvalibAlertsStubSet!(undefined);
        el.removeAttribute('no-alerts');
        await settle(el, headerOf(el));
        expect(bandOf(el)!.hidden).to.equal(true);
      });

      it('is a region named "Library alerts"', async () => {
        const el = await make();
        await stubAlerts({ menuAlerts: [ALERT(1)] }, el);
        const band = bandOf(el)!;
        expect(band.localName).to.equal('section');
        expect(band.getAttribute('aria-label')).to.equal('Library alerts');
        expect(band.hasAttribute('role')).to.equal(false); // a named <section> is a region
      });
    });

    describe('full-bleed geometry', () => {
      for (const width of [1280, 768, 390]) {
        it(`at ${width}px: banner flush with the header box, band flush with the page`, async () => {
          await setViewport({ width, height: 900 });
          const el = await make();
          await stubAlerts({ headerAlerts: [ALERT(1)], menuAlerts: [ALERT(2)] }, el, headerOf(el));
          const host = headerOf(el);
          const header = root(host).querySelector('header')!.getBoundingClientRect();
          const banner = headerAlert(el).getBoundingClientRect();
          expect(banner.height).to.be.greaterThan(0);
          expect(banner.left, 'banner left').to.be.closeTo(header.left, 0.5);
          expect(banner.right, 'banner right').to.be.closeTo(header.right, 0.5);
          expect(banner.top, 'banner top').to.be.closeTo(header.top, 0.5);
          // The logo row keeps the header's top padding below the banner.
          const logo = root(host).querySelector('header .logo')!.getBoundingClientRect();
          const padTop = parseFloat(
            getComputedStyle(root(host).querySelector('header')!).paddingTop,
          );
          expect(logo.top - banner.bottom).to.be.closeTo(padTop, 0.5);

          const page = el.getBoundingClientRect();
          const band = bandOf(el)!.getBoundingClientRect();
          expect(band.height).to.be.greaterThan(0);
          expect(band.left, 'band left').to.be.closeTo(page.left, 0.5);
          expect(band.right, 'band right').to.be.closeTo(page.right, 0.5);
          expect(band.top, 'band top').to.be.closeTo(host.getBoundingClientRect().bottom, 0.5);
          const list = alertsOf(el).find((a) => a.getAttribute('show') === 'list')!;
          expect(list.getBoundingClientRect().left).to.be.closeTo(page.left, 0.5);
          expect(list.getBoundingClientRect().width).to.be.closeTo(page.width, 0.5);
          // Main follows the band directly and keeps its own padding.
          const main = mainOf(el);
          expect(main.getBoundingClientRect().top, 'main top').to.be.closeTo(band.bottom, 0.5);
          const cs = getComputedStyle(main);
          expect(cs.paddingTop).to.equal(width >= 993 ? '24px' : '36px');
          expect([cs.paddingLeft, cs.paddingRight]).to.deep.equal(['40px', '40px']);
          // Regional stays inside main's padding.
          const regional = alertsOf(el).find((a) => a.getAttribute('show') === 'regional')!;
          expect(regional.getBoundingClientRect().left).to.be.closeTo(
            main.getBoundingClientRect().left + 40,
            0.5,
          );
        });
      }

      it('without list alerts the band takes no space and main follows the header', async () => {
        const el = await make();
        await stubAlerts(undefined, el);
        expect(mainOf(el).getBoundingClientRect().top).to.be.closeTo(
          headerOf(el).getBoundingClientRect().bottom,
          0.5,
        );
      });
    });

    it('has no serious axe violations on a full page with alerts present', async () => {
      const el = await make(
        '',
        '<h1>Page title</h1><p>Body <a href="/x">link</a></p><p slot="pre-footer">Notice</p>',
      );
      await customElements.whenDefined('site-footer');
      await stubAlerts(
        { headerAlerts: [ALERT(1)], menuAlerts: [ALERT(2)], regionalAlerts: [ALERT(3)] },
        el,
        headerOf(el),
      );
      // The stub rendered a row in each alert element.
      for (const a of alertsOf(el)) expect(a.shadowRoot?.textContent).to.contain('Alert');
      expect(bandOf(el)!.hidden).to.equal(false);
      await expectNoAxeViolations(document.body);
      await expectNoAxeViolations(document.body, ['minor', 'moderate', 'serious', 'critical'], {
        rules: ['region', 'landmark-unique'],
      });
    });

    it('has no axe violations, including landmark rules, with no alerts to show', async () => {
      const el = await make('', '<h1>Page title</h1><p>Body</p>');
      await customElements.whenDefined('site-footer');
      await stubAlerts(undefined, el, headerOf(el));
      expect(bandOf(el)!.hidden).to.equal(true);
      await expectNoAxeViolations(document.body);
      await expectNoAxeViolations(document.body, ['minor', 'moderate', 'serious', 'critical'], {
        rules: ['region', 'landmark-unique'],
      });
    });
  });
}

// Script loading runs in fresh documents (same-origin iframes), one per test, so each test
// starts with <uvalib-alerts> undefined and no alerts script in the page.
describe('header snapshot normalizer', () => {
  const A = '<uvalib-alerts slot="alerts" show="header" src="x"></uvalib-alerts>';
  it('drops only one empty header alert right after <header>', () => {
    expect(normalizeMarkup(`<header class="">${A}<a class="logo"></a></header>`)).to.equal(
      '<header class=""><a class="logo"></a></header>',
    );
    expect(normalizeMarkup(`<header>${A}${A}<a></a></header>`)).to.equal(
      `<header>${A}<a></a></header>`,
    );
    expect(normalizeMarkup(`<header><a></a>${A}</header>`)).to.equal(
      `<header><a></a>${A}</header>`,
    );
  });
});

describe('alerts test interception', () => {
  it('routes the hosts of both alerts CDNs', () => {
    for (const base of [ALERTS_PRODUCTION_SRC, ALERTS_STAGING_SRC]) {
      expect(ALERTS_HOSTS).to.include(new URL(base).host);
    }
  });
});

describe('site-page alerts script loading', function () {
  this.timeout(8000);
  let iframe: HTMLIFrameElement | undefined;
  afterEach(() => {
    iframe?.remove();
    iframe = undefined;
  });

  async function until(check: () => boolean, what: string, ms = 4000): Promise<void> {
    const end = Date.now() + ms;
    while (!check()) {
      if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  /** A fresh page that loads site-page from source, with console.warn recorded. */
  async function page(
    body: string,
    head = '',
    module = '/src/components/site-page/site-page.ts',
  ): Promise<{ win: StubWindow; doc: Document }> {
    const moduleUrl = new URL(module, location.href).href; // absolute, so <base href> is safe
    iframe = document.createElement('iframe');
    document.body.append(iframe);
    iframe.srcdoc = `<!doctype html><html><head>
      <script>
        window.__warnings = [];
        const warn = console.warn.bind(console);
        console.warn = (...a) => {
          const text = a.map(String).join(' ');
          if (!text.includes('Lit is in dev mode')) window.__warnings.push(text);
          warn(...a);
        };
      </script>${head}<script type="module" src="${moduleUrl}"></script></head><body>${body}</body></html>`;
    await until(
      () =>
        (iframe!.contentWindow as Window & typeof globalThis)?.customElements?.get(
          module.includes('site-header') ? 'site-header' : 'site-page',
        ) !== undefined,
      'components defined',
    );
    const win = iframe.contentWindow as unknown as StubWindow;
    const doc = iframe.contentDocument!;
    for (const p of doc.querySelectorAll('site-page')) await (p as Updatable).updateComplete;
    await new Promise((r) => setTimeout(r, 50));
    return { win, doc };
  }

  const alertScripts = (doc: Document) =>
    [...doc.querySelectorAll<HTMLScriptElement>('script[src]')].filter((s) =>
      s.src.endsWith('/v1/uvalib-alerts.js'),
    );
  const defined = (win: Window) =>
    (win as Window & typeof globalThis).customElements.get('uvalib-alerts') !== undefined;

  it('injects one module script for production into <head>', async () => {
    const { win, doc } = await page('<site-page><p>x</p></site-page>');
    const scripts = alertScripts(doc);
    expect(scripts.map((s) => s.src)).to.deep.equal([SCRIPT(ALERTS_PRODUCTION_SRC)]);
    expect(scripts[0]!.type).to.equal('module');
    expect(scripts[0]!.parentElement).to.equal(doc.head);
    await until(() => defined(win), 'uvalib-alerts defined');
    expect(win.__uvalibAlertsStub).to.equal(1);
    expect(win.__warnings).to.deep.equal([]);
  });

  it('loads the staging script with alerts-env="staging"', async () => {
    const { doc } = await page('<site-page alerts-env="staging"></site-page>');
    expect(alertScripts(doc).map((s) => s.src)).to.deep.equal([SCRIPT(ALERTS_STAGING_SRC)]);
  });

  it('loads from alerts-src when given', async () => {
    const { win, doc } = await page(`<site-page no-shadow-dom alerts-src="${CUSTOM}"></site-page>`);
    expect(alertScripts(doc).map((s) => s.src)).to.deep.equal([SCRIPT(CUSTOM)]);
    await until(() => defined(win), 'uvalib-alerts defined');
  });

  it('injects exactly once across two site-pages and a reconnect', async () => {
    const { win, doc } = await page(
      '<site-page id="a"></site-page><site-page id="b" no-shadow-dom></site-page>',
    );
    expect(alertScripts(doc).length).to.equal(1);
    const a = doc.getElementById('a')!;
    a.remove();
    doc.body.append(a);
    const b = doc.getElementById('b')!;
    b.remove();
    doc.body.append(b);
    await (a as Updatable).updateComplete;
    await (b as Updatable).updateComplete;
    // A third page created after the script ran.
    await until(() => defined(win), 'uvalib-alerts defined');
    doc.body.append(doc.createElement('site-page'));
    await new Promise((r) => setTimeout(r, 50));
    expect(alertScripts(doc).length).to.equal(1);
    expect(win.__uvalibAlertsStub).to.equal(1);
    expect(deepAll(doc, 'uvalib-alerts').length).to.equal(9);
  });

  it('does not inject while the script is still loading for an earlier page', async () => {
    const { doc } = await page('<site-page></site-page>');
    const late = doc.createElement('site-page');
    late.setAttribute('no-shadow-dom', '');
    doc.body.append(late);
    await (late as unknown as Updatable).updateComplete;
    expect(alertScripts(doc).length).to.equal(1);
  });

  it('skips injection when <uvalib-alerts> is already defined', async () => {
    const { win, doc } = await page(
      '<site-page></site-page><site-page no-shadow-dom></site-page>',
      `<script>customElements.define('uvalib-alerts', class extends HTMLElement {});</script>`,
    );
    expect(alertScripts(doc)).to.deep.equal([]);
    expect(win.__uvalibAlertsStub).to.equal(undefined);
    expect(deepAll(doc, 'uvalib-alerts').length).to.equal(6);
  });

  it('skips injection when a script with that src is already present', async () => {
    const { doc } = await page(
      '<site-page></site-page>',
      `<script type="module" src="${SCRIPT(ALERTS_PRODUCTION_SRC)}"></script>`,
    );
    expect(alertScripts(doc).length).to.equal(1);
  });

  it('loads no script and renders no alerts with no-alerts, until it is removed', async () => {
    const { win, doc } = await page(
      '<site-page no-alerts></site-page><site-page no-alerts no-shadow-dom></site-page>',
    );
    expect(alertScripts(doc)).to.deep.equal([]);
    expect(deepAll(doc, 'uvalib-alerts')).to.deep.equal([]);
    await new Promise((r) => setTimeout(r, 100));
    expect(defined(win)).to.equal(false);

    const first = doc.querySelector('site-page')!;
    first.removeAttribute('no-alerts');
    await (first as unknown as Updatable).updateComplete;
    expect(alertScripts(doc).length).to.equal(1);
    expect(deepAll(doc, 'uvalib-alerts').length).to.equal(3);
  });

  it('warns once when the script fails to load and leaves the page working', async () => {
    const { win, doc } = await page(
      `<site-page alerts-src="${FAIL}"><p id="c">content</p></site-page>
       <site-page no-shadow-dom alerts-src="${FAIL}"><p id="d">more</p></site-page>`,
    );
    await until(() => win.__warnings.length > 0, 'load-failure warning');
    await new Promise((r) => setTimeout(r, 100));
    expect(win.__warnings.length).to.equal(1);
    expect(win.__warnings[0]).to.contain(SCRIPT(FAIL));
    // The failed script is removed, so a later load can try again.
    expect(alertScripts(doc)).to.deep.equal([]);
    expect(defined(win)).to.equal(false);
    // Undefined alert elements render nothing; header, main and content are intact.
    const alerts = deepAll(doc, 'uvalib-alerts');
    expect(alerts.length).to.equal(6);
    for (const a of alerts) {
      expect(a.matches(':defined')).to.equal(false);
      expect(a.getBoundingClientRect().height).to.equal(0);
    }
    expect(deepAll(doc, 'main').length).to.equal(2);
    expect(deepAll(doc, 'site-header').length).to.equal(2);
    expect(doc.getElementById('c')!.checkVisibility()).to.equal(true);
    expect(doc.getElementById('d')!.closest('main')).to.not.equal(null);
  });

  it('does not re-request a failed URL, but loads a corrected one', async () => {
    const { win, doc } = await page(`<site-page alerts-src="${FAIL}"></site-page>`);
    await until(() => win.__warnings.length > 0, 'load-failure warning');
    const el = doc.querySelector('site-page') as unknown as SitePage;
    // An unrelated re-render does not request the failed URL again.
    el.rootLinkDomain = 'https://x.edu';
    await el.updateComplete;
    expect(alertScripts(doc)).to.deep.equal([]);
    await new Promise((r) => setTimeout(r, 150));
    expect(win.__warnings.length).to.equal(1);
    expect(defined(win)).to.equal(false);
    // A corrected alerts-src loads the component.
    el.setAttribute('alerts-src', CUSTOM);
    await el.updateComplete;
    await until(() => defined(win), 'uvalib-alerts defined after the retry');
    expect(alertScripts(doc).map((s) => s.src)).to.deep.equal([SCRIPT(CUSTOM)]);
    expect(win.__warnings.length).to.equal(1);
    for (const a of deepAll(doc, 'uvalib-alerts')) expect(a.getAttribute('src')).to.equal(CUSTOM);
  });

  it('a page added after a failed load can load the component', async () => {
    const { win, doc } = await page(`<site-page alerts-src="${FAIL}"></site-page>`);
    await until(() => win.__warnings.length > 0, 'load-failure warning');
    const next = doc.createElement('site-page');
    next.setAttribute('alerts-src', CUSTOM);
    doc.body.append(next);
    await until(() => defined(win), 'uvalib-alerts defined');
    expect(win.__uvalibAlertsStub).to.equal(1);
  });

  it('normalises alerts-src: absolute, trailing slash, no query or hash', async () => {
    const { win, doc } = await page(
      '<site-page alerts-src="https://alerts.test/custom?v=1#top"></site-page>',
    );
    expect(alertScripts(doc).map((s) => s.src)).to.deep.equal([SCRIPT(CUSTOM)]);
    for (const a of deepAll(doc, 'uvalib-alerts')) expect(a.getAttribute('src')).to.equal(CUSTOM);
    await until(() => defined(win), 'uvalib-alerts defined');
  });

  it('resolves a relative alerts-src against the document base URL', async () => {
    const { doc } = await page(
      '<site-page alerts-src="rel"></site-page><site-page no-shadow-dom alerts-src="./rel/"></site-page>',
      '<base href="https://alerts.test/base/">',
    );
    const expected = 'https://alerts.test/base/rel/';
    expect(alertScripts(doc).map((s) => s.src)).to.deep.equal([SCRIPT(expected)]);
    const alerts = deepAll(doc, 'uvalib-alerts');
    expect(alerts.length).to.equal(6);
    for (const a of alerts) expect(a.getAttribute('src')).to.equal(expected);
  });

  it("skips injection when the page has its own build of the component that hasn't run yet", async () => {
    const pinned = 'https://alerts.test/v1.0.0/uvalib-alerts.iife.js';
    const { win, doc } = await page(
      '<site-page></site-page><site-page no-shadow-dom></site-page>',
      `<script src="${pinned}" defer></script>`,
    );
    expect(alertScripts(doc)).to.deep.equal([]);
    expect(
      [...doc.scripts].filter((s) => s.src.includes('uvalib-alerts')).map((s) => s.src),
    ).to.deep.equal([pinned]);
    await until(() => defined(win), "the page's own build defined the element");
    expect(win.__uvalibAlertsStub).to.equal(1);
  });

  it('warns once for an invalid alerts-env, then loads production', async () => {
    const { win, doc } = await page('<site-page alerts-env="qa"></site-page>');
    expect(win.__warnings.filter((w) => w.includes('alerts-env')).length).to.equal(1);
    expect(alertScripts(doc).map((s) => s.src)).to.deep.equal([SCRIPT(ALERTS_PRODUCTION_SRC)]);
  });

  it('a standalone site-header loads nothing', async () => {
    const { win, doc } = await page(
      '<site-header></site-header><site-header no-shadow-dom></site-header>',
      '',
      '/src/components/site-header/site-header.ts',
    );
    await new Promise((r) => setTimeout(r, 100));
    expect(alertScripts(doc)).to.deep.equal([]);
    expect(deepAll(doc, 'uvalib-alerts')).to.deep.equal([]);
    expect(defined(win)).to.equal(false);
  });
});
