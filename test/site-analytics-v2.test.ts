// <site-analytics> 1.3: opt-out (the page, no-analytics, Do Not Track, Global Privacy
// Control), data-uvalib-track, and spa="auto" page views. Nothing reaches the network: the
// Matomo hosts are stubbed (test/helpers/analytics-intercept.mjs).
import { expect, fixture, html, nextFrame, waitUntil } from '@open-wc/testing';
import { LitElement } from 'lit';
import '../src/components/site-analytics/site-analytics.js';
import '../src/components/uvalib-analytics/uvalib-analytics.js';
import { define } from '../src/base/define.js';
import { UvalibAnalyticsMixin } from '../src/components/uvalib-analytics/UvalibAnalyticsMixin.js';
import {
  analyticsAllowed,
  trackContent,
  trackError,
  trackEvent,
  trackSearch,
} from '../src/base/analytics.js';
import { fire, matomoScripts, paq, recordAnalytics, resetAnalytics } from './helpers/analytics.js';

const commands = (name: string) => paq().filter((c) => c[0] === name);
const root = document.documentElement;

/** Make the browser send Do Not Track or Global Privacy Control until `restore()`. */
function signal(name: 'doNotTrack' | 'globalPrivacyControl', value: unknown) {
  Object.defineProperty(navigator, name, { value, configurable: true });
  return () => delete (navigator as unknown as Record<string, unknown>)[name];
}

/** A shadow host with a button in its shadow root. */
class ShadowHost extends LitElement {
  override render() {
    return html`<div class="wrap"><button type="button" class="in">Inner</button></div>`;
  }
}
define('test-shadow-host', ShadowHost);

class OldApp extends UvalibAnalyticsMixin(LitElement) {}
define('test-optout-old-app', OldApp);

describe('analytics opt-out', () => {
  let rec: ReturnType<typeof recordAnalytics>;
  beforeEach(() => {
    resetAnalytics();
    rec = recordAnalytics();
  });
  afterEach(() => {
    rec.restore();
    delete root.dataset.uvalibAnalytics;
    resetAnalytics();
  });

  const fireAll = (el: EventTarget) => {
    trackEvent(el, ['c', 'a', 'n']);
    trackSearch(el, 'q');
    trackContent(el, { name: 'Library alert', piece: 'Warning: x' });
  };

  it('allowed by default: every helper fires', async () => {
    const el = await fixture(html`<div><span></span></div>`);
    expect(analyticsAllowed(el.firstElementChild)).to.equal(true);
    fireAll(el.firstElementChild!);
    expect(rec.events).to.have.length(3);
  });

  it('<html data-uvalib-analytics="off">: nothing fired', async () => {
    const el = await fixture(html`<div><span></span></div>`);
    root.dataset.uvalibAnalytics = 'off';
    expect(analyticsAllowed(el)).to.equal(false);
    fireAll(el.firstElementChild!);
    fireAll(document);
    expect(rec.events).to.deep.equal([]);
  });

  it('no-analytics on the element or an ancestor, across shadow hosts', async () => {
    const el = await fixture<HTMLElement>(
      html`<div no-analytics><test-shadow-host></test-shadow-host></div>
        <test-shadow-host></test-shadow-host>`,
    );
    const [inside, outside] = document.querySelectorAll<ShadowHost>('test-shadow-host');
    await inside!.updateComplete;
    await outside!.updateComplete;
    const deep = inside!.shadowRoot!.querySelector('button')!;
    expect(analyticsAllowed(deep)).to.equal(false);
    fireAll(deep);
    fireAll(el);
    expect(rec.events).to.deep.equal([]);
    // The sibling outside the opted-out subtree still reports; so does the element once
    // the attribute is gone.
    fireAll(outside!.shadowRoot!.querySelector('button')!);
    expect(rec.events).to.have.length(3);
    el.removeAttribute('no-analytics');
    fireAll(deep);
    expect(rec.events).to.have.length(6);
    // On the element itself.
    outside!.setAttribute('no-analytics', '');
    fireAll(outside!.shadowRoot!.querySelector('button')!);
    expect(rec.events).to.have.length(6);
  });

  for (const [name, value] of [
    ['doNotTrack', '1'],
    ['globalPrivacyControl', true],
  ] as const) {
    it(`${name}: no matomo.js, no page view, nothing fired or forwarded`, async () => {
      const restore = signal(name, value);
      try {
        expect(analyticsAllowed(document.body)).to.equal(false);
        const el = await fixture(html`<site-analytics matomoid="5"></site-analytics>`);
        await nextFrame();
        expect(matomoScripts()).to.have.length(0);
        expect(paq()).to.deep.equal([]);
        fireAll(el);
        expect(rec.events).to.deep.equal([]);
        // Events fired by hand (the old mixin, a host page) are not forwarded either.
        fire(document.body, 'uvalib-analytics-event', { event: ['x', 'y'] });
        fire(document.body, 'uvalib-analytics-pageview', {});
        expect(paq()).to.deep.equal([]);
      } finally {
        restore();
      }
    });
  }

  it('doNotTrack other than "1" and globalPrivacyControl false do not opt out', () => {
    const a = signal('doNotTrack', '0');
    const b = signal('globalPrivacyControl', false);
    try {
      expect(analyticsAllowed(document.body)).to.equal(true);
    } finally {
      a();
      b();
    }
  });

  it('the page opt-out: no matomo.js, no page view, nothing forwarded', async () => {
    root.dataset.uvalibAnalytics = 'off';
    const el = await fixture(
      html`<div>
        <site-analytics matomoid="5"></site-analytics>
        <test-optout-old-app></test-optout-old-app>
      </div>`,
    );
    expect(commands('trackPageView')).to.have.length(0);
    expect(document.querySelectorAll('script[src*="matomo.js"]')).to.have.length(0);
    el.querySelector<OldApp>('test-optout-old-app')!._analyticsEvent(['app', 'hold']);
    fire(document.body, 'site-analytics-search', { searchQuery: 'q' });
    expect(commands('trackEvent')).to.deep.equal([]);
    expect(commands('trackSiteSearch')).to.deep.equal([]);
  });

  it('no-analytics around a hand-fired event: not forwarded', async () => {
    const el = await fixture(
      html`<div>
        <site-analytics matomoid="5"></site-analytics>
        <div no-analytics><test-optout-old-app></test-optout-old-app></div>
        <test-optout-old-app></test-optout-old-app>
      </div>`,
    );
    const [off, on] = el.querySelectorAll<OldApp>('test-optout-old-app');
    off!._analyticsEvent(['app', 'off']);
    on!._analyticsEvent(['app', 'on']);
    expect(commands('trackEvent')).to.deep.equal([['trackEvent', 'app', 'on']]);
  });

  it('names are cut to 100 characters; trackError reports each kind once per element', async () => {
    const el = await fixture(html`<div></div>`);
    trackEvent(el, ['c', 'a', 'x'.repeat(150), 2]);
    trackError(el, 'c', 'load');
    trackError(el, 'c', 'load');
    trackError(el, 'c', 'other');
    trackError(document.body, 'c', 'load');
    expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
      ['c', 'a', 'x'.repeat(100), 2],
      ['c', 'error', 'load'],
      ['c', 'error', 'other'],
      ['c', 'error', 'load'],
    ]);
  });
});

describe('data-uvalib-track', () => {
  beforeEach(resetAnalytics);
  afterEach(() => {
    delete root.dataset.uvalibAnalytics;
    resetAnalytics();
  });

  it('light DOM: the nearest tagged element sends its event; value is a number', async () => {
    const el = await fixture(
      html`<div>
        <site-analytics matomoid="5"></site-analytics>
        <div data-uvalib-track="outer, open">
          <button type="button" class="a">A</button>
          <span data-uvalib-track="host-page,banner-click,Fall hours,2"><b>B</b></span>
          <span data-uvalib-track="host-page,x,y,not-a-number"><i>C</i></span>
          <span data-uvalib-track="only-a-category"><u>D</u></span>
        </div>
        <button type="button" class="untagged">E</button>
      </div>`,
    );
    el.querySelector<HTMLElement>('button.a')!.click();
    el.querySelector<HTMLElement>('b')!.click();
    el.querySelector<HTMLElement>('i')!.click();
    el.querySelector<HTMLElement>('u')!.click(); // nearest is invalid: nothing (not the outer)
    el.querySelector<HTMLElement>('button.untagged')!.click();
    expect(commands('trackEvent')).to.deep.equal([
      ['trackEvent', 'outer', 'open'],
      ['trackEvent', 'host-page', 'banner-click', 'Fall hours', 2],
      ['trackEvent', 'host-page', 'x', 'y'],
    ]);
  });

  it('shadow DOM: a tagged element inside a shadow root, and a tagged host', async () => {
    const el = await fixture(
      html`<div>
        <site-analytics matomoid="5"></site-analytics>
        <test-shadow-host data-uvalib-track="widget,open,Host"></test-shadow-host>
        <test-shadow-host class="inner"></test-shadow-host>
      </div>`,
    );
    const [host, inner] = el.querySelectorAll<ShadowHost>('test-shadow-host');
    await host!.updateComplete;
    await inner!.updateComplete;
    inner!.shadowRoot!.querySelector('.wrap')!.setAttribute('data-uvalib-track', 'widget,inner');
    host!.shadowRoot!.querySelector<HTMLElement>('button')!.click();
    inner!.shadowRoot!.querySelector<HTMLElement>('button')!.click();
    expect(commands('trackEvent')).to.deep.equal([
      ['trackEvent', 'widget', 'open', 'Host'],
      ['trackEvent', 'widget', 'inner'],
    ]);
  });

  it('a click whose propagation a component stops is still seen', async () => {
    const el = await fixture(
      html`<div>
        <site-analytics matomoid="5"></site-analytics>
        <div data-uvalib-track="host-page,stopped"><button type="button">S</button></div>
      </div>`,
    );
    const button = el.querySelector('button')!;
    button.addEventListener('click', (e) => e.stopPropagation());
    button.click();
    expect(commands('trackEvent')).to.deep.equal([['trackEvent', 'host-page', 'stopped']]);
  });

  it('one event per click with two analytics elements; opt-outs apply', async () => {
    const el = await fixture(
      html`<div>
        <site-analytics matomoid="5"></site-analytics>
        <uvalib-analytics matomoid="5"></uvalib-analytics>
        <div data-uvalib-track="host-page,go"><button type="button">G</button></div>
        <div no-analytics data-uvalib-track="host-page,no"><button type="button">N</button></div>
      </div>`,
    );
    const [go, no] = el.querySelectorAll('button');
    go!.click();
    no!.click();
    expect(commands('trackEvent')).to.deep.equal([['trackEvent', 'host-page', 'go']]);
    root.dataset.uvalibAnalytics = 'off';
    go!.click();
    expect(commands('trackEvent')).to.have.length(1);
  });

  it('without an analytics element nothing is fired', async () => {
    const rec = recordAnalytics();
    try {
      const el = await fixture(
        html`<div data-uvalib-track="host-page,go">
          <button type="button">G</button>
        </div>`,
      );
      el.querySelector('button')!.click();
      expect(rec.events).to.deep.equal([]);
    } finally {
      rec.restore();
    }
  });
});

describe('spa="auto" page views', () => {
  const start = location.href;
  const title = document.title;
  const at = (hash: string) => `${location.pathname}${location.search}${hash}`;
  const views = () => commands('trackPageView');
  /** Wait for the frame the view is recorded on, and one more. */
  const frames = async () => {
    await nextFrame();
    await nextFrame();
  };

  beforeEach(resetAnalytics);
  afterEach(() => {
    // Remove the elements first, so going back to the start URL is not a view.
    for (const el of document.querySelectorAll('site-analytics, uvalib-analytics')) el.remove();
    history.replaceState(null, '', start);
    document.title = title;
    resetAnalytics();
  });

  it('a view on load, then one per route change with the title and the previous URL', async () => {
    await fixture(html`<site-analytics spa="auto" matomoid="5"></site-analytics>`);
    expect(paq()).to.deep.equal([
      ['setTrackerUrl', 'https://analytics.lib.virginia.edu/matomo.php'],
      ['setSiteId', '5'],
      [
        'addDownloadExtensions',
        'epub|mobi|csv|tsv|json|xml|zip|tar|gz|mp3|mp4|m4a|tif|tiff|jp2|mrc|ris|bib|txt',
      ],
      ['trackPageView'],
    ]);
    const first = location.href;
    // pushState, with the title set right after, as a router does.
    history.pushState(null, '', at('#/results'));
    document.title = 'Results';
    await frames();
    const pushed = location.href;
    // A hash change.
    location.hash = '#/item';
    await waitUntil(() => views().length === 3, 'no view for the hash change');
    const hashed = location.href;
    // Back (popstate, and hashchange: one view).
    history.back();
    await waitUntil(() => location.href === pushed, 'Back did not land');
    await frames();
    expect(paq().slice(4)).to.deep.equal([
      ['setReferrerUrl', first],
      ['setCustomUrl', pushed],
      ['setDocumentTitle', 'Results'],
      ['trackPageView'],
      ['setReferrerUrl', pushed],
      ['setCustomUrl', hashed],
      ['setDocumentTitle', 'Results'],
      ['trackPageView'],
      ['setReferrerUrl', hashed],
      ['setCustomUrl', pushed],
      ['setDocumentTitle', 'Results'],
      ['trackPageView'],
    ]);
  });

  it('no view for the same URL again, or for replaceState', async () => {
    await fixture(html`<site-analytics spa="auto" matomoid="5"></site-analytics>`);
    history.pushState(null, '', location.href);
    await frames();
    history.pushState(null, '', at('#/a'));
    history.pushState(null, '', at('#/a'));
    await frames();
    history.replaceState(null, '', at('#/a'));
    await frames();
    expect(views()).to.have.length(2); // the load and #/a
    // replaceState to a new URL (a search page syncing its filters) is not a page view either,
    // even where the Navigation API reports it as a 'replace' entry change.
    history.replaceState(null, '', at('#/a?format=book'));
    await frames();
    history.replaceState(null, '', at('#/a?format=video'));
    await frames();
    expect(views()).to.have.length(2);
  });

  it('a privacy signal turned on mid-session stops automatic and hand-fired views', async () => {
    await fixture(html`<site-analytics spa="auto" matomoid="5"></site-analytics>`);
    expect(views()).to.have.length(1);
    const n = navigator as Navigator & { globalPrivacyControl?: boolean };
    Object.defineProperty(n, 'globalPrivacyControl', { configurable: true, get: () => true });
    try {
      history.pushState(null, '', at('#/gpc'));
      await frames();
      document.body.dispatchEvent(
        new CustomEvent('uvalib-analytics-pageview', { detail: {}, bubbles: true, composed: true }),
      );
      expect(views()).to.have.length(1);
    } finally {
      delete (n as { globalPrivacyControl?: boolean }).globalPrivacyControl;
    }
  });

  it('a page view fired from inside a no-analytics subtree is not recorded', async () => {
    const el = await fixture(
      html`<div>
        <site-analytics spa matomoid="5"></site-analytics>
        <p no-analytics><span></span></p>
      </div>`,
    );
    el.querySelector('span')!.dispatchEvent(
      new CustomEvent('uvalib-analytics-pageview', { detail: {}, bubbles: true, composed: true }),
    );
    expect(views()).to.have.length(0);
  });

  it('pushState is wrapped once, however many elements (or copies) listen', async () => {
    await fixture(html`<site-analytics spa="auto" matomoid="5"></site-analytics>`);
    const wrapped = history.pushState;
    const el = await fixture(
      html`<div>
        <site-analytics spa="auto" matomoid="5"></site-analytics>
        <uvalib-analytics spa="auto" matomoid="5"></uvalib-analytics>
      </div>`,
    );
    await (el.lastElementChild as LitElement).updateComplete;
    expect(history.pushState).to.equal(wrapped);
    history.pushState(null, '', at('#/once'));
    await frames();
    expect(views()).to.have.length(2);
  });

  it('bare spa: no views on load or on route changes; a removed element stops', async () => {
    const el = await fixture(html`<site-analytics spa matomoid="5"></site-analytics>`);
    history.pushState(null, '', at('#/x'));
    await frames();
    expect(views()).to.deep.equal([]);
    expect(commands('enableLinkTracking')).to.deep.equal([]);
    el.remove();
    const auto = await fixture(html`<site-analytics spa="auto" matomoid="5"></site-analytics>`);
    auto.remove();
    history.pushState(null, '', at('#/y'));
    await frames();
    expect(views()).to.deep.equal([]);
  });

  it('Do Not Track: no views on route changes either', async () => {
    const restore = signal('doNotTrack', '1');
    try {
      await fixture(html`<site-analytics spa="auto" matomoid="5"></site-analytics>`);
      history.pushState(null, '', at('#/dnt'));
      await frames();
      expect(paq()).to.deep.equal([]);
    } finally {
      restore();
    }
  });
});
