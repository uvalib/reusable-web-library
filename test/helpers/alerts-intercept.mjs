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
// loading and placement. Counts its own evaluations in `__uvalibAlertsStub`. Renders nothing unless a test sets
// `__uvalibAlertsStubText`, in which case each element shows a short status marker.
const STUB = `
const w = globalThis;
w.__uvalibAlertsStub = (w.__uvalibAlertsStub ?? 0) + 1;
if (!customElements.get('uvalib-alerts')) {
  customElements.define('uvalib-alerts', class extends HTMLElement {
    static observedAttributes = ['show', 'src'];
    connectedCallback() { this.render(); }
    attributeChangedCallback() { this.render(); }
    render() {
      const text = w.__uvalibAlertsStubText;
      if (!text) { this.shadowRoot?.replaceChildren(); return; }
      const root = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
      const div = document.createElement('div');
      div.setAttribute('role', 'status');
      div.textContent = text + ' (' + this.getAttribute('show') + ')';
      root.replaceChildren(div);
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
