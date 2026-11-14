// Keeps browser tests off the alerts CDN. Every browser context the test runner opens
// routes the alerts hosts to a local stub: `v1/uvalib-alerts.js` is a tiny module that
// defines an inert <uvalib-alerts>, and config.json / alerts.json are empty documents.
// Any other request to those hosts is aborted, logged and fails the test file, so a new,
// unexpected network dependency shows up as a failure instead of hitting the CDN.

/** The real alerts hosts: production and staging CloudFront, and their planned names. */
export const ALERTS_HOSTS = [
  'd2q6t6fdv76k7r.cloudfront.net',
  'dzfvxb8mejnv6.cloudfront.net',
  'alerts.lib.virginia.edu',
  'alerts-staging.lib.virginia.edu',
];
/** Test-only host for `alerts-src` overrides; served like the real hosts. */
export const ALERTS_TEST_HOST = 'alerts.test';
/** Test-only host whose every request fails, to exercise the load-failure path. */
export const ALERTS_FAIL_HOST = 'alerts-fail.test';

// The stub does not reproduce the real component's markup or behaviour: it only proves
// loading, placement and the update event. Counts its own evaluations in `__uvalibAlertsStub`.
// Tests drive it with `__uvalibAlertsStubSet({ headerAlerts, menuAlerts, regionalAlerts })`
// (each a list of `{ uuid, title, body }`): every connected element re-renders its part, as
// the real one does, and dispatches a realistic `uvalib-alerts-update` (bubbling, composed).
// With no state set, each element dispatches one update with empty lists on connect and
// renders nothing, like the real component with an empty alerts.json.
const STUB = `
const w = globalThis;
w.__uvalibAlertsStub = (w.__uvalibAlertsStub ?? 0) + 1;
if (!customElements.get('uvalib-alerts')) {
  const live = new Set();
  const state = () => {
    const s = w.__uvalibAlertsStubState ?? {};
    const headerAlerts = s.headerAlerts ?? [];
    const menuAlerts = s.menuAlerts ?? [];
    return {
      alerts: [...headerAlerts, ...menuAlerts],
      headerAlerts,
      menuAlerts,
      menuCount: menuAlerts.length,
      seenAlerts: [],
      seenCount: 0,
      regionalAlerts: s.regionalAlerts ?? [],
      updated: '2026-01-01T00:00:00Z',
    };
  };
  w.__uvalibAlertsStubSet = (s) => {
    w.__uvalibAlertsStubState = s;
    for (const el of live) el.refresh();
  };
  customElements.define('uvalib-alerts', class extends HTMLElement {
    static observedAttributes = ['show', 'src'];
    connectedCallback() { live.add(this); this.refresh(); }
    disconnectedCallback() { live.delete(this); }
    attributeChangedCallback() { if (this.isConnected) this.refresh(); }
    get menuAlerts() { return state().menuAlerts; }
    refresh() {
      const st = state();
      const show = this.getAttribute('show') || 'all';
      const items =
        show === 'header' ? st.headerAlerts : show === 'list' ? st.menuAlerts :
        show === 'regional' ? st.regionalAlerts : [];
      const root = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
      root.replaceChildren();
      if (items.length) {
        const style = document.createElement('style');
        style.textContent = ':host{display:block} .a{padding:0.5em;min-height:24px;background:#bfe7f7}';
        const wrap = document.createElement('div');
        wrap.setAttribute('part', show);
        if (show === 'header') wrap.setAttribute('role', 'status');
        for (const a of items) {
          const d = document.createElement('div');
          d.className = 'a';
          d.textContent = (a.title ? a.title + ': ' : '') + (a.body ?? '');
          wrap.append(d);
        }
        root.append(style, wrap);
      }
      this.dispatchEvent(new CustomEvent('uvalib-alerts-update', { detail: st, bubbles: true, composed: true }));
    }
  });
}
`;

const CORS = { 'access-control-allow-origin': '*' };

function fulfil(route, url) {
  if (/\/uvalib-alerts(\.iife)?\.js$/.test(url.pathname)) {
    return route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      headers: CORS,
      body: STUB,
    });
  }
  if (url.pathname.endsWith('/config.json')) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: CORS,
      body: '{"version":1,"snapshot":"alerts.json"}',
    });
  }
  if (url.pathname.endsWith('/alerts.json')) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: CORS,
      body: '{}',
    });
  }
  return block(route, url);
}

/**
 * Abort an unexpected request and fail the test file: the error is thrown, uncaught, in the
 * test runner's own page (the top frame), which the runner reports as a failed session.
 */
async function block(route, url) {
  const message = `[alerts-intercept] BLOCKED unexpected request to an alerts host: ${url.href}`;
  console.error(`\n${message}\n`);
  await route.abort('blockedbyclient');
  try {
    const page = route.request().frame().page();
    await page.evaluate(
      (m) =>
        setTimeout(() => {
          throw new Error(m);
        }),
      message,
    );
  } catch {
    // The request came from a worker or a closed page; the log line above still reports it.
  }
}

/** Route the alerts hosts in `context` (a Playwright BrowserContext, or a promise of one). */
export async function interceptAlerts(contextOrPromise) {
  const context = await contextOrPromise;
  const served = new Set([...ALERTS_HOSTS, ALERTS_TEST_HOST]);
  await context.route(
    (url) => served.has(url.host) || url.host === ALERTS_FAIL_HOST,
    (route) => {
      const url = new URL(route.request().url());
      if (url.host === ALERTS_FAIL_HOST) return route.abort('failed');
      return fulfil(route, url);
    },
  );
  return context;
}
