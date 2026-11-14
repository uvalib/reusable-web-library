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

/** The alerts base URL: `src` when given (with a trailing slash), else the env's CDN. */
export function alertsBase(env: string | undefined, src?: string | null): string {
  const custom = src?.trim();
  if (custom) return custom.endsWith('/') ? custom : `${custom}/`;
  return BASES[isAlertsEnv(env) ? env : 'production'];
}

/** The latest-1.x ES module build under a base URL. */
export const alertsScriptUrl = (base: string): string => `${base}v1/uvalib-alerts.js`;

/** Documents that already have (or had) an alerts script from this library. */
const loading = new WeakSet<Document>();

/**
 * Load `<uvalib-alerts>` into `doc` from `base`, at most once per document: nothing happens
 * when the element is already defined, when a script with that src is already present, or
 * after an earlier call. A failed load warns once; the undefined elements render nothing.
 * Script injection (not `import()`) keeps the URL out of every bundler's module graph.
 */
export function loadAlerts(doc: Document, base: string): void {
  const win = doc.defaultView;
  if (!win || loading.has(doc) || win.customElements.get(ALERTS_TAG)) return;
  loading.add(doc);
  const src = new URL(alertsScriptUrl(base), doc.baseURI).href;
  if ([...doc.querySelectorAll<HTMLScriptElement>('script[src]')].some((s) => s.src === src)) {
    return;
  }
  const script = doc.createElement('script');
  script.type = 'module';
  script.src = src;
  script.addEventListener(
    'error',
    () =>
      console.warn(
        `site-page: could not load the alerts component from ${src}; no alerts are shown.`,
      ),
    { once: true },
  );
  doc.head.append(script);
}
