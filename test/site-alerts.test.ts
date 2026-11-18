import { expect, fixture, nextFrame } from '@open-wc/testing';
import { emulateMedia, sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/site-alerts/site-alerts.js';
import type { SiteAlerts } from '../src/components/site-alerts/SiteAlerts.js';
import { BODY_SANITIZER, setBody } from '../src/components/site-alerts/body.js';
import { COLOR_SCHEME_ATTR, installColorSchemeStyles } from '../src/base/color-scheme.js';
import { expectNoPageAxeViolations } from './helpers/axe.js';
import { contrast } from './helpers/scheme-colors.js';
import { recordAnalytics } from './helpers/analytics.js';

// The alerts hosts are routed to a stub by the test runner (test/helpers/alerts-intercept.mjs):
// a fake headless <uvalib-alerts> with the real element's properties, dismiss() and events.
const SRC = 'https://alerts.test/';
const FAIL = 'https://alerts-fail.test/';

type StubAlert = { uuid: string; title: string; body: string; severity?: string | number };
type StubState = {
  headerAlerts?: StubAlert[];
  menuAlerts?: StubAlert[];
  regionalAlerts?: StubAlert[];
};
type StubWindow = Window & {
  __uvalibAlertsStubSet?: (state?: StubState) => void;
  __uvalibAlertsStubStatus?: (status: string) => void;
  __uvalibAlertsStubDismissed?: string[];
  __warnings: string[];
  __errors: unknown[];
};
const stub = () => window as unknown as StubWindow;

const BANNER: StubAlert = { uuid: 'h1', title: 'Closed today', body: '<p>All libraries.</p>' };
const LIST: StubAlert[] = [
  { uuid: 'i1', title: 'New hours', body: '<p>See <a href="/hours">hours</a>.</p>', severity: 3 },
  { uuid: 'c1', title: 'Building closed', body: '<p>Clemons is closed.</p>', severity: 1 },
  { uuid: 'w1', title: 'Wi-Fi down', body: '<p>Use eduroam.</p>', severity: 2 },
  { uuid: 'w2', title: 'Printing slow', body: '<p>Queue is long.</p>', severity: 2 },
];
const REGIONAL: StubAlert[] = [
  { uuid: 'r1', title: 'Snow', body: '<p>Closing early.</p>', severity: 'alert2' },
  { uuid: 'r2', title: 'Tour', body: '<p>Tours at noon.</p>', severity: 'alert3' },
];
const ALL: StubState = { headerAlerts: [BANNER], menuAlerts: LIST, regionalAlerts: REGIONAL };

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const headless = () => [...document.querySelectorAll<HTMLElement>('uvalib-alerts[headless]')];

async function settle(...els: SiteAlerts[]): Promise<void> {
  for (let i = 0; i < 2; i++) {
    await nextFrame();
    for (const el of els) await el.updateComplete;
  }
}

async function setAlerts(state: StubState | undefined, ...els: SiteAlerts[]): Promise<void> {
  await customElements.whenDefined('uvalib-alerts');
  stub().__uvalibAlertsStubSet!(state);
  await settle(...els);
}

/** Capture console.warn calls made while `fn` runs. */
async function warnings(fn: () => Promise<void>): Promise<string[]> {
  const warn = console.warn;
  const calls: string[] = [];
  console.warn = (...args: unknown[]) => void calls.push(args.map(String).join(' '));
  try {
    await fn();
  } finally {
    console.warn = warn;
  }
  return calls;
}

/** Forget which alerts were reported (a new page view). */
const resetImpressions = () =>
  delete (document as unknown as Record<symbol, unknown>)[
    Symbol.for('uvalib.site-alerts.impressions')
  ];

afterEach(async () => {
  stub().__uvalibAlertsStubSet?.(undefined);
  resetImpressions();
  document.documentElement.removeAttribute(COLOR_SCHEME_ATTR);
  await emulateMedia({ forcedColors: 'none', colorScheme: 'light' });
  await setViewport({ width: 800, height: 600 });
});

for (const mode of ['shadow', 'light'] as const) {
  const light = mode === 'light' ? 'no-shadow-dom' : '';

  describe(`site-alerts (${mode})`, () => {
    const make = async (attrs = '', state: StubState | undefined = ALL): Promise<SiteAlerts> => {
      const el = await fixture<SiteAlerts>(
        `<site-alerts ${light} alerts-src="${SRC}" ${attrs}></site-alerts>`,
      );
      await setAlerts(state, el);
      return el;
    };
    const q = (el: Element, sel: string) => root(el).querySelector<HTMLElement>(sel);
    const qa = (el: Element, sel: string) => [...root(el).querySelectorAll<HTMLElement>(sel)];
    const titles = (el: Element) => qa(el, '.alert .title').map((t) => t.textContent!.trim());

    it('renders the banner, the list and the regional alerts by default', async () => {
      const el = await make();
      const banner = q(el, '.banner')!;
      expect(banner.getAttribute('role')).to.equal('status');
      expect(banner.textContent!.replace(/\s+/g, ' ').trim()).to.equal(
        'Closed today: All libraries.',
      );
      expect(qa(el, '.alert').length).to.equal(4);
      expect(
        qa(el, '.regional').map((r) => r.textContent!.replace(/\s+/g, ' ').trim()),
      ).to.deep.equal(['Warning: Closing early.', 'Information: Tours at noon.']);
      expect(qa(el, '.regional').map((r) => r.classList.contains('info'))).to.deep.equal([
        false,
        true,
      ]);
      expect(el.hasAttribute('data-empty')).to.equal(false);
    });

    it('lists the most severe first, with severity in text, not colour alone', async () => {
      const el = await make('show="list"');
      expect(titles(el)).to.deep.equal([
        'Critical: Building closed',
        'Warning: Wi-Fi down',
        'Warning: Printing slow',
        'Information: New hours',
      ]);
      for (const label of qa(el, '.alert .title .visually-hidden')) {
        expect(label.getBoundingClientRect().width).to.be.at.most(1);
      }
      for (const icon of qa(el, '.alert > svg.icon')) {
        expect(icon.getAttribute('aria-hidden')).to.equal('true');
        expect(icon.getBoundingClientRect().width).to.be.closeTo(32, 3);
      }
      expect(qa(el, '.alert > svg.icon').length).to.equal(4);
      // Only the critical alert is assertive; the list itself is polite.
      expect(qa(el, '.alert').map((a) => a.getAttribute('role'))).to.deep.equal([
        'alert',
        null,
        null,
        null,
      ]);
      expect(q(el, '.list')!.getAttribute('aria-live')).to.equal('polite');
      expect(q(el, '.banner')).to.equal(null);
      expect(q(el, '.regional')).to.equal(null);
    });

    it('show picks the parts', async () => {
      const parts = async (show: string) => {
        const el = await make(`show="${show}"`);
        return ['.banner', '.list', '.regional'].filter((s) => q(el, s));
      };
      expect(await parts('header')).to.deep.equal(['.banner']);
      expect(await parts('list')).to.deep.equal(['.list']);
      expect(await parts('regional')).to.deep.equal(['.regional']);
      expect(await parts('sitewide')).to.deep.equal(['.banner', '.list']);
      expect(await parts('all')).to.deep.equal(['.banner', '.list', '.regional']);
    });

    it('titles are h2 by default; heading-level sets the level', async () => {
      const el = await make('show="list"');
      expect(qa(el, '.alert .title').map((t) => t.localName)).to.deep.equal(Array(4).fill('h2'));
      el.headingLevel = 4;
      await settle(el);
      expect(qa(el, '.alert .title').map((t) => t.localName)).to.deep.equal(Array(4).fill('h4'));
      el.setAttribute('heading-level', '9');
      await settle(el);
      expect(q(el, '.alert .title')!.localName).to.equal('h2');
    });

    it('critical alerts have no dismiss button; others are named for their alert', async () => {
      const el = await make('show="list"');
      expect(
        qa(el, '.alert').map(
          (a) => a.querySelector('.dismiss')?.getAttribute('aria-label') ?? null,
        ),
      ).to.deep.equal([
        null,
        'Dismiss alert: Wi-Fi down',
        'Dismiss alert: Printing slow',
        'Dismiss alert: New hours',
      ]);
      for (const b of qa(el, '.dismiss')) {
        const r = b.getBoundingClientRect();
        expect([r.width, r.height], 'a 44px target (WCAG 2.5.5)').to.deep.equal([44, 44]);
        expect(b.querySelector('svg')!.getAttribute('aria-hidden')).to.equal('true');
      }
    });

    it('dismiss calls dismiss(uuid) and moves focus to the next alert, never <body>', async () => {
      const el = await make('show="list"');
      const first = q(el, '.alert.alert2 .dismiss')!;
      first.focus();
      first.click();
      await settle(el);
      expect(stub().__uvalibAlertsStubDismissed).to.deep.equal(['w1']);
      expect(titles(el)).to.not.include('Warning: Wi-Fi down');
      const active = () => (el.shadowRoot ? el.shadowRoot.activeElement : document.activeElement);
      expect(active()?.getAttribute('aria-label')).to.equal('Dismiss alert: Printing slow');
      // The keyboard works too: Enter on the focused button.
      await sendKeys({ press: 'Enter' });
      await settle(el);
      expect(active()?.getAttribute('aria-label')).to.equal('Dismiss alert: New hours');
      await sendKeys({ press: 'Space' });
      await settle(el);
      // The last one was dismissed: the critical alert, which has no button, gets focus.
      expect(stub().__uvalibAlertsStubDismissed).to.deep.equal(['w1', 'w2', 'i1']);
      expect(active()).to.equal(q(el, '.alert.alert1'));
      expect(document.activeElement).to.not.equal(document.body);
    });

    it('with no alert left, focus goes to <main>', async () => {
      const wrap = await fixture<HTMLElement>(
        `<div><site-alerts ${light} show="list" alerts-src="${SRC}"></site-alerts><main><h1>Page</h1></main></div>`,
      );
      const el = wrap.querySelector<SiteAlerts>('site-alerts')!;
      await setAlerts({ menuAlerts: [LIST[2]!] }, el);
      q(el, '.dismiss')!.click();
      await settle(el);
      expect(qa(el, '.alert')).to.deep.equal([]);
      expect(document.activeElement).to.equal(wrap.querySelector('main'));
      expect(wrap.querySelector('main')!.getAttribute('tabindex')).to.equal('-1');
      expect(el.hasAttribute('data-empty')).to.equal(true);
    });

    it('re-renders on update events and fires site-alerts-change with the count', async () => {
      const el = await make('show="list"', { menuAlerts: [LIST[1]!] });
      const counts: number[] = [];
      el.addEventListener('site-alerts-change', (e) =>
        counts.push((e as CustomEvent<{ count: number }>).detail.count),
      );
      await setAlerts({ menuAlerts: LIST }, el);
      expect(qa(el, '.alert').length).to.equal(4);
      await setAlerts({ menuAlerts: [] }, el);
      expect(q(el, '.list')).to.equal(null);
      expect(el.hasAttribute('data-empty')).to.equal(true);
      expect(counts).to.deep.equal([4, 0]);
    });

    it('a status change (offline) renders nothing new', async () => {
      const el = await make();
      const before = root(el) instanceof ShadowRoot ? el.shadowRoot!.innerHTML : el.innerHTML;
      stub().__uvalibAlertsStubStatus!('offline');
      await settle(el);
      const after = root(el) instanceof ShadowRoot ? el.shadowRoot!.innerHTML : el.innerHTML;
      expect(after).to.equal(before);
      stub().__uvalibAlertsStubStatus!('live');
    });

    it('inserts the body HTML (links kept)', async () => {
      const el = await make('show="list"', { menuAlerts: [LIST[0]!] });
      const a = q(el, '.alert .body a')!;
      expect(a.getAttribute('href')).to.equal('/hours');
      expect(getComputedStyle(a).textDecorationLine).to.equal('underline');
    });

    it('no-style keeps the severity text visually hidden and the icons sized', async () => {
      const el = await make('no-style show="list"');
      const label = q(el, '.visually-hidden')!;
      expect(label.getBoundingClientRect().width).to.be.at.most(1);
      expect(q(el, '.alert > svg')!.getBoundingClientRect().width).to.be.closeTo(32, 3);
      // Shadow mode drops the look (light mode shares the document's tag-scoped sheet).
      if (mode === 'shadow')
        expect(getComputedStyle(q(el, '.alert1')!).backgroundColor).to.equal('rgba(0, 0, 0, 0)');
    });

    it('at 320px nothing overflows and the dismiss button clears the text', async () => {
      await setViewport({ width: 320, height: 800 });
      const el = await make();
      expect(el.scrollWidth).to.be.at.most(el.clientWidth);
      expect(document.documentElement.scrollWidth).to.be.at.most(320);
      for (const alert of qa(el, '.alert.dismissible')) {
        const button = alert.querySelector('.dismiss')!.getBoundingClientRect();
        const title = alert.querySelector('.title')!.getBoundingClientRect();
        expect(title.right, 'title clear of the button').to.be.at.most(button.left + 0.5);
      }
    });

    it('forced colors: every alert keeps a system-colour border', async () => {
      const el = await make();
      await emulateMedia({ forcedColors: 'active' });
      for (const sel of ['.banner', '.alert', '.regional']) {
        for (const box of qa(el, sel)) {
          const cs = getComputedStyle(box);
          expect(cs.borderTopStyle, sel).to.equal('solid');
          expect(parseFloat(cs.borderTopWidth), sel).to.be.at.least(1);
        }
      }
      for (const box of qa(el, '.alert'))
        expect(getComputedStyle(box).borderLeftWidth).to.equal('10px');
    });
  });
}

describe('site-alerts shared headless element', () => {
  it('one <uvalib-alerts headless> feeds every <site-alerts>, and goes with the last', async () => {
    const wrap = await fixture<HTMLElement>(
      `<div>
        <site-alerts show="header" alerts-src="${SRC}"></site-alerts>
        <site-alerts show="list" alerts-src="${SRC}" no-shadow-dom></site-alerts>
        <site-alerts show="regional" alerts-src="${SRC}"></site-alerts>
      </div>`,
    );
    const els = [...wrap.querySelectorAll<SiteAlerts>('site-alerts')];
    await setAlerts(ALL, ...els);
    expect(headless().length).to.equal(1);
    const h = headless()[0]!;
    expect([h.parentElement, h.hidden, h.getAttribute('src')]).to.deep.equal([
      document.body,
      true,
      SRC,
    ]);
    expect(h.hasAttribute('storage-key')).to.equal(false);
    for (const el of els) expect(el.hasAttribute('data-empty')).to.equal(false);
    // A move (disconnect and reconnect in one task) keeps it.
    wrap.append(els[0]!);
    await settle(...els);
    expect(headless()).to.deep.equal([h]);
    for (const el of els) el.remove();
    await Promise.resolve();
    await nextFrame();
    expect(headless()).to.deep.equal([]);
  });

  it('a different storage-key or base gets its own element', async () => {
    const wrap = await fixture<HTMLElement>(
      `<div>
        <site-alerts alerts-src="${SRC}"></site-alerts>
        <site-alerts alerts-src="${SRC}" storage-key="v4SeenAlerts"></site-alerts>
        <site-alerts alerts-src="${SRC}other/"></site-alerts>
      </div>`,
    );
    const els = [...wrap.querySelectorAll<SiteAlerts>('site-alerts')];
    await settle(...els);
    expect(
      headless().map((h) => [h.getAttribute('src'), h.getAttribute('storage-key')]),
    ).to.deep.equal([
      [SRC, null],
      [SRC, 'v4SeenAlerts'],
      [`${SRC}other/`, null],
    ]);
  });

  it('dismissing in one element updates the others', async () => {
    const wrap = await fixture<HTMLElement>(
      `<div><site-alerts show="list" alerts-src="${SRC}"></site-alerts>
        <site-alerts show="list" alerts-src="${SRC}"></site-alerts></div>`,
    );
    const [a, b] = [...wrap.querySelectorAll<SiteAlerts>('site-alerts')];
    await setAlerts({ menuAlerts: LIST }, a!, b!);
    a!.shadowRoot!.querySelector<HTMLElement>('.alert2 .dismiss')!.click();
    await settle(a!, b!);
    expect(b!.shadowRoot!.querySelectorAll('.alert').length).to.equal(3);
  });

  it('warns once for an invalid alerts-env and uses production', async () => {
    const calls = await warnings(async () => {
      const el = await fixture<SiteAlerts>(`<site-alerts alerts-env="prod"></site-alerts>`);
      el.headingLevel = 3;
      await settle(el);
    });
    expect(calls.length).to.equal(1);
    expect(calls[0]).to.contain('alerts-env');
    expect(headless().map((h) => h.getAttribute('src'))).to.deep.equal([
      'https://d2q6t6fdv76k7r.cloudfront.net/',
    ]);
  });
});

describe('site-alerts body sanitizing', () => {
  it('uses setHTML() with the allowlist where the browser has it', () => {
    const calls: unknown[][] = [];
    const el = Object.assign(document.createElement('div'), {
      setHTML: (...args: unknown[]) => void calls.push(args),
    });
    setBody(el, '<p>x</p>');
    setBody(el, '<p>x</p>'); // same value: not inserted again
    expect(calls).to.deep.equal([['<p>x</p>', { sanitizer: BODY_SANITIZER }]]);
    expect(BODY_SANITIZER.elements).to.include.members(['p', 'a', 'ul', 'h2']);
    expect(BODY_SANITIZER.elements).to.not.include('script');
    expect(BODY_SANITIZER.attributes).to.deep.equal(['href', 'class', 'rel']);
  });
});

describe('site-alerts script load failure', function () {
  this.timeout(8000);
  it('warns once, renders nothing and leaves the page alone', async () => {
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const moduleUrl = new URL('/src/components/site-alerts/site-alerts.ts', location.href).href;
    iframe.srcdoc = `<!doctype html><html><head><script>
        window.__warnings = [];
        window.__errors = [];
        document.addEventListener('uvalib-analytics-event', (e) => window.__errors.push(e.detail.event));
        const warn = console.warn.bind(console);
        console.warn = (...a) => {
          const t = a.map(String).join(' ');
          if (!t.includes('Lit is in dev mode')) window.__warnings.push(t);
          warn(...a);
        };
      </script><script type="module" src="${moduleUrl}"></script></head><body>
      <site-alerts alerts-src="${FAIL}"></site-alerts><site-alerts no-shadow-dom alerts-src="${FAIL}"></site-alerts>
      <p id="c">content</p></body></html>`;
    try {
      const win = () => iframe.contentWindow as unknown as StubWindow & typeof globalThis;
      const end = Date.now() + 5000;
      while (!(win()?.__warnings?.length > 0)) {
        if (Date.now() > end) throw new Error('timed out waiting for the warning');
        await new Promise((r) => setTimeout(r, 20));
      }
      await new Promise((r) => setTimeout(r, 150));
      const doc = iframe.contentDocument!;
      expect(win().__warnings.length).to.equal(1);
      expect(win().__warnings[0]).to.contain(`${FAIL}v1/uvalib-alerts.js`);
      expect(win().__errors).to.deep.equal([['site-alerts', 'error', 'alerts-script']]);
      for (const a of doc.querySelectorAll('site-alerts'))
        expect(a.getBoundingClientRect().height).to.equal(0);
      expect(doc.getElementById('c')!.checkVisibility()).to.equal(true);
    } finally {
      iframe.remove();
    }
  });
});

describe('site-alerts accessibility', function () {
  this.timeout(20000);

  /** A page laid out as site-page lays it out: banner in a header, list band, regional in main. */
  async function page(light: string): Promise<SiteAlerts[]> {
    const wrap = await fixture<HTMLElement>(
      `<div>
        <header><site-alerts ${light} show="header" alerts-src="${SRC}"></site-alerts><p>Library</p></header>
        <section aria-label="Library alerts"><site-alerts ${light} show="list" alerts-src="${SRC}"></site-alerts></section>
        <main><site-alerts ${light} show="regional" alerts-src="${SRC}"></site-alerts><h1>Page</h1><p>Text</p></main>
      </div>`,
    );
    const els = [...wrap.querySelectorAll<SiteAlerts>('site-alerts')];
    await setAlerts(ALL, ...els);
    return els;
  }

  /** The page behind the alerts: white, or site-page's dark surface (#10172b) in dark. */
  let page_ = 'rgb(255, 255, 255)';
  /** The background an element is drawn on: its own, or the nearest ancestor's (flat tree). */
  function bg(el: Element): string {
    for (let n: Element | null = el; n;) {
      const c = getComputedStyle(n).backgroundColor;
      if (c !== 'rgba(0, 0, 0, 0)') return c;
      n = n.parentElement ?? ((n.getRootNode() as ShadowRoot).host as Element | undefined) ?? null;
    }
    return page_;
  }

  /** Every [surface, text, link, icon, border] contrast in the rendered alerts. */
  function ratios(els: SiteAlerts[]): Record<string, number> {
    const out: Record<string, number> = {};
    for (const el of els) {
      const r = root(el);
      for (const box of r.querySelectorAll<HTMLElement>('.banner, .alert, .regional')) {
        const name = box.classList.contains('regional')
          ? `regional${box.classList.contains('info') ? '-info' : ''}`
          : box.classList.contains('banner')
            ? 'banner'
            : [...box.classList].find((c) => /^alert\d$/.test(c))!;
        const surface = bg(box);
        const text = box.querySelector('.body p') ?? box;
        out[`${name} text`] = contrast(getComputedStyle(text).color, surface);
        const link = box.querySelector('.body a');
        if (link) out[`${name} link`] = contrast(getComputedStyle(link).color, surface);
        const icon = box.querySelector(':scope > svg');
        if (icon) out[`${name} icon`] = contrast(getComputedStyle(icon).color, surface);
        const cs = getComputedStyle(box);
        const border = name.startsWith('alert') ? cs.borderLeftColor : cs.borderTopColor;
        if (name !== 'banner')
          out[`${name} border/page`] = contrast(border, bg(box.parentElement ?? el));
      }
    }
    return out;
  }

  for (const mode of ['shadow', 'light'] as const) {
    for (const scheme of ['light', 'dark'] as const) {
      it(`${mode}, ${scheme}: no axe violations at any impact; text AAA`, async () => {
        installColorSchemeStyles(document);
        if (scheme === 'dark') document.documentElement.setAttribute(COLOR_SCHEME_ATTR, 'dark');
        page_ = scheme === 'dark' ? 'rgb(16, 23, 43)' : 'rgb(255, 255, 255)';
        const els = await page(mode === 'light' ? 'no-shadow-dom' : '');
        // Links in the banner too.
        await setAlerts(
          { ...ALL, headerAlerts: [{ ...BANNER, body: '<p>See <a href="/s">status</a>.</p>' }] },
          ...els,
        );
        await expectNoPageAxeViolations();
        const r = ratios(els);
        for (const [k, v] of Object.entries(r)) {
          if (/text|link/.test(k)) expect(v, `${scheme} ${k}`).to.be.at.least(7);
          if (/icon/.test(k)) expect(v, `${scheme} ${k}`).to.be.at.least(3);
        }
        // Severity borders: 3:1 against the page in dark; in light only red and blue reach it
        // (library.virginia.edu's yellow and teal borders are decorative: the icon and hidden
        // label carry severity, and the background marks the alert).
        if (scheme === 'dark') {
          for (const [k, v] of Object.entries(r))
            if (/border/.test(k)) expect(v, `${scheme} ${k}`).to.be.at.least(3);
        } else {
          expect(r['alert1 border/page']).to.be.at.least(3);
          expect(r['alert3 border/page']).to.be.at.least(3);
        }
        // Focus ring: the text colour, on the alert's own background.
        const button = root(els[1]!).querySelector<HTMLElement>('.alert2 .dismiss')!;
        button.focus();
        await sendKeys({ press: 'Shift+Tab' });
        await sendKeys({ press: 'Tab' });
        const ring = getComputedStyle(button);
        expect(ring.outlineStyle).to.equal('solid');
        expect(contrast(ring.outlineColor, bg(button))).to.be.at.least(3);
      });
    }
  }
});

describe('site-alerts analytics', () => {
  let rec: ReturnType<typeof recordAnalytics>;
  beforeEach(() => {
    resetImpressions();
    rec = recordAnalytics();
  });
  afterEach(() => rec.restore());

  const content = () => rec.of('uvalib-analytics-content');
  const events = () => rec.of('uvalib-analytics-event').map((d) => d.event);

  it('one content impression per alert shown, never twice across elements or re-renders', async () => {
    const wrap = await fixture<HTMLElement>(
      `<div>
        <site-alerts show="sitewide" alerts-src="${SRC}"></site-alerts>
        <site-alerts show="list" alerts-src="${SRC}" no-shadow-dom></site-alerts>
        <site-alerts show="regional" alerts-src="${SRC}"></site-alerts>
      </div>`,
    );
    const els = [...wrap.querySelectorAll<SiteAlerts>('site-alerts')];
    await setAlerts(ALL, ...els);
    const pieces = content().map((d) => d.piece);
    expect(content().every((d) => d.name === 'Library alert')).to.equal(true);
    expect(pieces).to.have.members([
      'Header: Closed today',
      'Critical: Building closed',
      'Warning: Wi-Fi down',
      'Warning: Printing slow',
      'Information: New hours',
      'Regional warning: Snow',
      'Regional information: Tour',
    ]);
    expect(pieces.length).to.equal(7);
    // Re-renders, an update with the same alerts, a heading change: nothing new.
    for (const el of els) el.headingLevel = 3;
    await setAlerts(ALL, ...els);
    expect(content().length).to.equal(7);
    expect(events()).to.deep.equal([]);
  });

  it('only alerts an element actually shows are reported', async () => {
    const el = await fixture<SiteAlerts>(
      `<site-alerts show="header" alerts-src="${SRC}"></site-alerts>`,
    );
    await setAlerts(ALL, el);
    expect(content().map((d) => d.piece)).to.deep.equal(['Header: Closed today']);
  });

  it('dismiss sends one event; no impression or event for the dismissed alert after that', async () => {
    const el = await fixture<SiteAlerts>(
      `<site-alerts show="list" alerts-src="${SRC}"></site-alerts>`,
    );
    await setAlerts({ menuAlerts: LIST }, el);
    el.shadowRoot!.querySelector<HTMLElement>('.alert2 .dismiss')!.click();
    await settle(el);
    expect(events()).to.deep.equal([['site-alerts', 'dismiss', 'Warning: Wi-Fi down']]);
    // A new page view (impressions forgotten) and a new element: the dismissed alert stays
    // hidden (restored from the seen list) and is neither reported nor counted as dismissed.
    el.remove();
    resetImpressions();
    rec.events.length = 0;
    const again = await fixture<SiteAlerts>(
      `<site-alerts show="list" alerts-src="${SRC}"></site-alerts>`,
    );
    await setAlerts({ menuAlerts: LIST }, again);
    expect(content().map((d) => d.piece)).to.not.include('Warning: Wi-Fi down');
    expect(content().length).to.equal(3);
    expect(events()).to.deep.equal([]);
  });

  it('a link click in an alert body: link-click with the alert, never the URL', async () => {
    for (const light of ['', 'no-shadow-dom']) {
      const el = await fixture<SiteAlerts>(
        `<site-alerts ${light} show="list" alerts-src="${SRC}"></site-alerts>`,
      );
      await setAlerts({ menuAlerts: [LIST[0]!] }, el);
      const a = root(el).querySelector<HTMLAnchorElement>('.body a')!;
      a.addEventListener('click', (e) => e.preventDefault());
      a.click();
      // A click elsewhere in the alert is not a link click.
      root(el).querySelector<HTMLElement>('.title')!.click();
    }
    expect(events()).to.deep.equal([
      ['site-alerts', 'link-click', 'Information: New hours'],
      ['site-alerts', 'link-click', 'Information: New hours'],
    ]);
    expect(JSON.stringify(rec.events)).to.not.contain('/hours"');
  });

  it('names are capped at 100 characters', async () => {
    const long = 'x'.repeat(150);
    const el = await fixture<SiteAlerts>(
      `<site-alerts show="list" alerts-src="${SRC}"></site-alerts>`,
    );
    await setAlerts({ menuAlerts: [{ uuid: 'long', title: long, body: '', severity: 2 }] }, el);
    expect((content()[0]!.piece as string).length).to.equal(100);
    el.shadowRoot!.querySelector<HTMLElement>('.dismiss')!.click();
    expect((events()[0] as string[])[2]!.length).to.equal(100);
  });
});
