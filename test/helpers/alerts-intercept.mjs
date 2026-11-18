// Keeps browser tests off the alerts CDN. Every browser context the test runner opens
// routes the alerts hosts to a local stub: `v1/uvalib-alerts.js` is a tiny module that
// defines a fake headless <uvalib-alerts>, and config.json / alerts.json are empty documents.
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

// The stub is a fake of the real component's headless API (alerts project, component/src/
// element.ts): the read-only properties (alerts, headerAlerts, menuAlerts, menuCount,
// seenAlerts, seenCount, regionalAlerts, status, lastUpdated), dismiss(uuid) and clearSeen(),
// and the bubbling, composed uvalib-alerts-update / -status / -dismiss events. It renders
// nothing (this library only uses it headless). Counts its own evaluations in
// `__uvalibAlertsStub`. Tests drive it with:
//   __uvalibAlertsStubSet({ headerAlerts, menuAlerts, regionalAlerts }): each a list of
//     `{ uuid, title, body, severity? }` (severity `alert1`-`alert4`, or 1-3 for list alerts;
//     default alert4 in the header, alert1 in the list, alert2 regional). Every connected
//     element dispatches an update, as the real one does when a new document arrives; seen
//     (dismissed) uuids are kept. `__uvalibAlertsStubSet(undefined)` resets everything.
//   __uvalibAlertsStubStatus('offline'): every element's status changes and it dispatches
//     uvalib-alerts-status.
// `__uvalibAlertsStubDismissed` lists every dismiss(uuid) call (per window); dismissing an
// alert4 is refused, as in the real element. With no state set, each element dispatches one
// update with empty lists on connect, like the real component with an empty alerts.json.
const STUB = `
const w = globalThis;
w.__uvalibAlertsStub = (w.__uvalibAlertsStub ?? 0) + 1;
if (!customElements.get('uvalib-alerts')) {
  const live = new Set();
  const seen = new Set();
  let status = 'live';
  w.__uvalibAlertsStubDismissed = [];
  const sev = (s, d) => (typeof s === 'number' ? 'alert' + s : s || d);
  const norm = (list, d) =>
    (list ?? []).map((a) => ({
      id: a.uuid, uuid: a.uuid, title: a.title ?? '', body: a.body ?? '',
      severity: sev(a.severity, d), created: '', changed: '', promote: false, sticky: false,
      ...(a.url ? { url: a.url } : {}),
    }));
  const state = () => {
    const s = w.__uvalibAlertsStubState ?? {};
    const headerAlerts = norm(s.headerAlerts, 'alert4');
    const listed = norm(s.menuAlerts, 'alert1');
    // As the real element's applyArrival(): every Information alert is "seen" on arrival.
    for (const a of listed) if (a.severity === 'alert3') seen.add(a.uuid);
    const menuAlerts = listed.filter((a) => !seen.has(a.uuid));
    return {
      alerts: [...headerAlerts, ...listed],
      headerAlerts,
      menuAlerts,
      menuCount: menuAlerts.length,
      seenAlerts: [...seen],
      seenCount: seen.size,
      regionalAlerts: norm(s.regionalAlerts, 'alert2'),
      updated: '2026-01-01T00:00:00Z',
    };
  };
  const emit = (el, type, detail) =>
    el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  const updateAll = () => { for (const el of live) emit(el, 'uvalib-alerts-update', state()); };
  w.__uvalibAlertsStubSet = (s) => {
    w.__uvalibAlertsStubState = s;
    if (s === undefined) { seen.clear(); status = 'live'; w.__uvalibAlertsStubDismissed = []; }
    updateAll();
  };
  w.__uvalibAlertsStubStatus = (next) => {
    status = next;
    for (const el of live) emit(el, 'uvalib-alerts-status', { status });
  };
  customElements.define('uvalib-alerts', class extends HTMLElement {
    static observedAttributes = ['show', 'src', 'headless', 'storage-key'];
    connectedCallback() { live.add(this); emit(this, 'uvalib-alerts-update', state()); }
    disconnectedCallback() { live.delete(this); }
    attributeChangedCallback() { if (this.isConnected) emit(this, 'uvalib-alerts-update', state()); }
    get alerts() { return state().alerts; }
    get headerAlerts() { return state().headerAlerts; }
    get menuAlerts() { return state().menuAlerts; }
    get menuCount() { return state().menuCount; }
    get seenAlerts() { return state().seenAlerts; }
    get seenCount() { return state().seenCount; }
    get regionalAlerts() { return state().regionalAlerts; }
    get status() { return status; }
    get lastUpdated() { return state().updated; }
    dismiss(uuid) {
      w.__uvalibAlertsStubDismissed.push(uuid);
      const a = state().alerts.find((x) => x.uuid === uuid);
      if (!a || a.severity === 'alert4') return;
      seen.add(uuid);
      for (const el of live) emit(el, 'uvalib-alerts-dismiss', { uuid });
      updateAll();
    }
    clearSeen() { seen.clear(); updateAll(); }
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
