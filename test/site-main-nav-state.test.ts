import { expect, fixture, nextFrame } from '@open-wc/testing';
import { sendMouse, setViewport } from '@web/test-runner-commands';
import '../src/components/site-main-nav/site-main-nav.js';
import type { SiteMainNav } from '../src/components/site-main-nav/SiteMainNav.js';
import { mainNavTiming } from '../src/components/site-main-nav/main-nav-items.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;

async function settle(el: SiteMainNav): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await nextFrame();
    await el.updateComplete;
  }
}

const toggles = (el: Element) => [
  ...root(el).querySelectorAll<HTMLButtonElement>('nav.main-nav button'),
];
const expanded = (el: Element) =>
  toggles(el).filter((b) => b.getAttribute('aria-expanded') === 'true');
const openPanels = (el: Element) =>
  [...root(el).querySelectorAll<HTMLElement>('nav.main-nav ul ul')].filter((u) => !u.hidden);
const labels = (el: Element) =>
  [...root(el).querySelectorAll('nav.main-nav > ul > li > :is(button, a)')].map((b) =>
    b.textContent!.trim(),
  );
const currentLabels = (el: Element) =>
  [...root(el).querySelectorAll('nav.main-nav a[aria-current="page"]')].map((a) =>
    a.textContent!.trim(),
  );

async function until(check: () => boolean, what: string, ms = 3000): Promise<void> {
  const end = performance.now() + ms;
  while (!check()) {
    if (performance.now() > end) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 20));
  }
}

for (const mode of ['shadow', 'light'] as const) {
  const light = mode === 'light' ? 'no-shadow-dom' : '';

  describe(`site-main-nav state (${mode})`, () => {
    const make = async (attrs = '', children = ''): Promise<SiteMainNav> => {
      const el = await fixture<SiteMainNav>(
        `<site-main-nav ${light} ${attrs}>${children}</site-main-nav>`,
      );
      await settle(el);
      return el;
    };
    afterEach(() => setViewport({ width: 800, height: 600 }));

    it('still closes on an outside press after being moved while open', async () => {
      await setViewport({ width: 1280, height: 800 });
      const el = await make();
      const [about] = toggles(el);
      about.click();
      await settle(el);
      const parent = el.parentElement!;
      el.remove();
      parent.append(el);
      await settle(el);
      expect(expanded(el)).to.deep.equal([about]);
      await sendMouse({ type: 'click', position: [1200, 700] });
      await settle(el);
      expect(expanded(el)).to.deep.equal([]);
      expect(openPanels(el)).to.deep.equal([]);
    });

    it('closes the open group when .items changes', async () => {
      const el = await make();
      toggles(el)[1].click();
      await settle(el);
      expect(expanded(el).length).to.equal(1);
      el.items = [
        { label: 'A', items: [{ label: 'A1', href: '/a1' }] },
        { label: 'B', items: [{ label: 'B1', href: '/b1' }] },
      ];
      await settle(el);
      expect(labels(el)).to.deep.equal(['A', 'B']);
      expect(expanded(el)).to.deep.equal([]);
      expect(openPanels(el)).to.deep.equal([]);
      // The same content again keeps a group open.
      toggles(el)[0].click();
      await settle(el);
      el.items = el.items.map((i) => ({ ...i }));
      await settle(el);
      expect(expanded(el).length).to.equal(1);
    });

    it('closes the open group when the slotted markup changes', async () => {
      const el = await make(
        '',
        '<nav slot="main-nav"><ul><li><span>G</span><ul><li><a href="/g">G1</a></li></ul></li><li><span>H</span><ul><li><a href="/h">H1</a></li></ul></li></ul></nav>',
      );
      toggles(el)[1].click();
      await settle(el);
      expect(expanded(el).length).to.equal(1);
      const first = el.querySelector('[slot="main-nav"] li')!;
      first.remove();
      await settle(el);
      expect(labels(el)).to.deep.equal(['H']);
      expect(expanded(el)).to.deep.equal([]);
    });

    it('keeps the newest items-src when it changes mid-fetch', async () => {
      const saved = { ...mainNavTiming };
      Object.assign(mainNavTiming, { attempts: 1, timeout: 300 });
      const errors: Event[] = [];
      try {
        const el = document.createElement('site-main-nav') as SiteMainNav;
        if (light) el.setAttribute('no-shadow-dom', '');
        el.addEventListener('site-main-nav-error', (e) => errors.push(e));
        el.setAttribute('items-src', 'https://main-nav-hang.test/slow.json');
        const wrap = await fixture('<div></div>');
        wrap.append(el);
        await settle(el);
        el.setAttribute('items-src', 'https://main-nav.test/items.json');
        await until(() => labels(el)[0] === 'Fetched group', 'the second source');
        // The first source fails (times out) after the switch: no event, no fallback.
        await new Promise((r) => setTimeout(r, 600));
        await settle(el);
        expect(errors).to.deep.equal([]);
        expect(labels(el)).to.deep.equal(['Fetched group', 'Fetched link']);
      } finally {
        Object.assign(mainNavTiming, saved);
      }
    });

    describe('current page in a single-page app', () => {
      const start = location.href;
      afterEach(() => history.replaceState(null, '', start));
      // Same-origin paths of the test's own; the page URL is restored after each test.
      const base = '/spa-test';
      const ITEMS = () => [
        { label: 'One', href: `${base}/one` },
        {
          label: 'G',
          items: [
            { label: 'Two', href: `${base}/two` },
            { label: 'Two b', href: `${base}/two#b` },
          ],
        },
      ];
      const spa = async () => {
        const el = await make();
        el.rootLinkDomain = location.origin;
        el.items = ITEMS();
        await settle(el);
        return el;
      };

      it('follows history.pushState (Navigation API currententrychange)', async () => {
        const el = await spa();
        expect(currentLabels(el)).to.deep.equal([]);
        history.pushState(null, '', `${base}/one`);
        await settle(el);
        expect(currentLabels(el)).to.deep.equal(['One']);
        history.pushState(null, '', `${base}/two`);
        await settle(el);
        expect(currentLabels(el)).to.deep.equal(['Two']);
      });

      it('follows popstate and hashchange', async () => {
        const el = await spa();
        history.replaceState(null, '', `${base}/two`);
        // replaceState may not notify everywhere: popstate is what back/forward fire.
        window.dispatchEvent(new PopStateEvent('popstate'));
        await settle(el);
        expect(currentLabels(el)).to.deep.equal(['Two']);
        location.hash = 'b';
        await until(() => currentLabels(el)[0] === 'Two b', 'hashchange');
      });

      it('an explicit current wins over the location', async () => {
        const el = await spa();
        el.current = `${location.origin}${base}/one`;
        await settle(el);
        history.pushState(null, '', `${base}/two`);
        await settle(el);
        expect(currentLabels(el)).to.deep.equal(['One']);
      });

      it('stops listening when disconnected', async () => {
        const el = await spa();
        let updates = 0;
        const orig = el.requestUpdate.bind(el);
        el.remove();
        el.requestUpdate = ((...a: Parameters<typeof orig>) => {
          updates++;
          return orig(...a);
        }) as typeof el.requestUpdate;
        history.pushState(null, '', `${base}/one`);
        window.dispatchEvent(new PopStateEvent('popstate'));
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        await nextFrame();
        expect(updates).to.equal(0);
      });
    });
  });
}
