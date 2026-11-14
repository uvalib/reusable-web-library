// Live UVA Library alerts: <site-page> renders <uvalib-alerts> elements and loads that
// component at runtime from the alerts CDN (released separately, github.com/uvalib/uvalib-alerts).

// The CloudFront addresses switch to https://alerts.lib.virginia.edu/ (production) and
// https://alerts-staging.lib.virginia.edu/ (staging) once DNS for those names exists.
/** Base URL of the production alerts CDN (holds `config.json`, `alerts.json` and `v1/`). */
export const ALERTS_PRODUCTION_SRC = 'https://d2q6t6fdv76k7r.cloudfront.net/';
/** Base URL of the staging alerts CDN. */
export const ALERTS_STAGING_SRC = 'https://dzfvxb8mejnv6.cloudfront.net/';

export type AlertsEnv = 'production' | 'staging';

export const ALERTS_TAG = 'uvalib-alerts';

const BASES: Record<AlertsEnv, string> = {
  production: ALERTS_PRODUCTION_SRC,
  staging: ALERTS_STAGING_SRC,
};

export const isAlertsEnv = (v: unknown): v is AlertsEnv =>
  typeof v === 'string' && Object.hasOwn(BASES, v);

/**
 * The alerts base URL, absolute: `src` when given, resolved against `baseURI` with a trailing
 * slash on the path and no query or hash; else the env's CDN. Throws for an unparseable `src`.
 */
export function alertsBase(
  env: string | undefined,
  src: string | null | undefined,
  baseURI: string,
): string {
  const custom = src?.trim();
  if (!custom) return BASES[isAlertsEnv(env) ? env : 'production'];
  const url = new URL(custom, baseURI);
  url.search = '';
  url.hash = '';
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.href;
}

/** The latest-1.x ES module build under an (absolute) base URL. */
export const alertsScriptUrl = (base: string): string => new URL('v1/uvalib-alerts.js', base).href;

/** Any build of the component: ES module or classic IIFE, latest or pinned. */
const ALERTS_BUILD = /uvalib-alerts(\.iife)?\.js$/;

/** Documents with an alerts script from this library still loading or loaded. */
const loading = new WeakSet<Document>();
/** Script URLs that already failed to load in a document: warned once, never retried there. */
const failed = new WeakMap<Document, Set<string>>();

const hasAlertsScript = (doc: Document): boolean =>
  [...doc.querySelectorAll<HTMLScriptElement>('script[src]')].some((s) => {
    try {
      return ALERTS_BUILD.test(new URL(s.src).pathname);
    } catch {
      return false;
    }
  });

/**
 * Load `<uvalib-alerts>` into `doc` from `base`, at most one script at a time per document.
 * Nothing happens when the element is already defined or a script for any build of it is
 * already in the page (the page's own pinned or classic copy, or ours). A failed load warns
 * once and removes its script. That URL is not requested again in the document (re-renders
 * never retry it), but a different URL (a corrected `alerts-src` or env, or another page
 * with one) can still load; until then the undefined elements render nothing.
 * Script injection (not `import()`) keeps the URL out of every bundler's module graph.
 */
export function loadAlerts(doc: Document, base: string): void {
  const win = doc.defaultView;
  if (!win || loading.has(doc) || win.customElements.get(ALERTS_TAG) || hasAlertsScript(doc)) {
    return;
  }
  const src = alertsScriptUrl(base);
  if (failed.get(doc)?.has(src)) return;
  loading.add(doc);
  const script = doc.createElement('script');
  script.type = 'module';
  script.src = src;
  script.addEventListener(
    'error',
    () => {
      script.remove();
      loading.delete(doc);
      let urls = failed.get(doc);
      if (!urls) failed.set(doc, (urls = new Set()));
      urls.add(src);
      console.warn(
        `site-page: could not load the alerts component from ${src}; no alerts are shown.`,
      );
    },
    { once: true },
  );
  doc.head.append(script);
}
