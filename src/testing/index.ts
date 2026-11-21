/**
 * `@uvalib/web-components/testing`: the accessibility and analytics test setup every library
 * site needs, for Playwright (npm only; not in the CDN build). Nothing here imports Playwright:
 * each helper takes your test's `page`. `strictAxe` needs `@axe-core/playwright` (an optional
 * peer dependency), loaded only when it runs.
 */
import { LIGHTHOUSE_RULES, STRICT_AXE_TAGS } from './lighthouse-rules.js';

export { LIGHTHOUSE_RULES, STRICT_AXE_TAGS };

/** The parts of a Playwright `Route` these helpers use. */
export interface TestRoute {
  request(): { url(): string };
  fulfill(response: { status?: number; contentType?: string; body?: string }): Promise<void>;
}

/** The parts of a Playwright `Page` these helpers use (a Playwright `Page` is one). */
export interface TestPage {
  evaluate<R, A>(fn: (arg: A) => R | Promise<R>, arg: A): Promise<R>;
  waitForFunction<A>(
    fn: (arg: A) => unknown,
    arg: A,
    options?: { timeout?: number },
  ): Promise<unknown>;
  route(url: (url: URL) => boolean, handler: (route: TestRoute) => unknown): Promise<unknown>;
  addInitScript(script: { content: string }): Promise<unknown>;
}

/** One axe violation, as `@axe-core/playwright` reports it (the fields used here). */
export interface AxeViolation {
  id: string;
  impact?: string | null;
  help?: string;
  nodes: { target: unknown[] }[];
}

/** An `@axe-core/playwright` `AxeBuilder` (the methods used here). */
export interface AxeBuilderLike {
  options(options: object): AxeBuilderLike;
  include(selector: string): AxeBuilderLike;
  exclude(selector: string): AxeBuilderLike;
  analyze(): Promise<{ violations: AxeViolation[] }>;
}

/** The `AxeBuilder` class. */
export type AxeBuilderClass = new (options: { page: never }) => AxeBuilderLike;

export interface WaitForUpgradeOptions {
  /** The elements to wait for. Default `site-page`. */
  selector?: string;
  /** Milliseconds before giving up (Playwright's default otherwise). */
  timeout?: number;
}

/**
 * Wait until every element matching `selector` (default `site-page`) is defined and has
 * rendered (`updateComplete`), so tests see the upgraded page, not the markup before the
 * components render. Returns at once when none is on the page.
 */
export async function waitForUpgrade(
  page: TestPage,
  { selector = 'site-page', timeout }: WaitForUpgradeOptions = {},
): Promise<void> {
  await page.waitForFunction(
    (sel: string) =>
      [...document.querySelectorAll(sel)].every((el) => !!customElements.get(el.localName)),
    selector,
    timeout === undefined ? {} : { timeout },
  );
  await page.evaluate(
    (sel: string) =>
      Promise.all(
        [...document.querySelectorAll(sel)].map(
          (el) => (el as Element & { updateComplete?: Promise<unknown> }).updateComplete,
        ),
      ).then(() => undefined),
    selector,
  );
}

export interface StrictAxeOptions {
  /** Audit only these selectors (page-level rules then do not run). */
  include?: string | string[];
  /**
   * Leave these out: third-party widgets you cannot change. Exclude the smallest selector,
   * say why, and never the library's own elements.
   */
  exclude?: string | string[];
  /** The `AxeBuilder` class, when you import `@axe-core/playwright` yourself. */
  AxeBuilder?: AxeBuilderClass;
  /** What `waitForUpgrade` waits for first. Default `site-page`. */
  upgrade?: WaitForUpgradeOptions;
}

const AXE_PACKAGE = '@axe-core/playwright';

async function loadAxeBuilder(): Promise<AxeBuilderClass> {
  let mod: Record<string, unknown>;
  try {
    // A variable specifier: the package is optional, and resolved only when strictAxe runs.
    mod = (await import(/* @vite-ignore */ AXE_PACKAGE)) as Record<string, unknown>;
  } catch (cause) {
    const code = (cause as { code?: string }).code;
    if (code !== 'ERR_MODULE_NOT_FOUND' && code !== 'MODULE_NOT_FOUND') throw cause;
    throw new Error(
      `strictAxe needs ${AXE_PACKAGE}: install it (npm i -D ${AXE_PACKAGE}), ` +
        'or pass its AxeBuilder class as { AxeBuilder }.',
      { cause },
    );
  }
  let builder = (mod.default ?? mod.AxeBuilder) as unknown;
  if (builder && typeof builder !== 'function') {
    const inner = builder as Record<string, unknown>;
    builder = inner.default ?? inner.AxeBuilder;
  }
  if (typeof builder !== 'function') throw new Error(`${AXE_PACKAGE} has no AxeBuilder export`);
  return builder as AxeBuilderClass;
}

const list = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

/**
 * axe at least as strict as Lighthouse: the WCAG 2.0/2.1/2.2 A and AA and best-practice tags
 * plus every rule Lighthouse turns on (`LIGHTHOUSE_RULES`), after `waitForUpgrade`. Returns
 * axe's results; fail on every impact level, minor included:
 * `expect(formatViolations((await strictAxe(page)).violations)).toEqual([])`.
 */
export async function strictAxe(
  page: TestPage,
  { include, exclude, AxeBuilder, upgrade }: StrictAxeOptions = {},
): Promise<{ violations: AxeViolation[] }> {
  await waitForUpgrade(page, upgrade);
  const Builder = AxeBuilder ?? (await loadAxeBuilder());
  let builder = new Builder({ page: page as never }).options({
    runOnly: { type: 'tag', values: [...STRICT_AXE_TAGS] },
    rules: Object.fromEntries(LIGHTHOUSE_RULES.map((id) => [id, { enabled: true }])),
  });
  for (const s of list(include)) builder = builder.include(s);
  for (const s of list(exclude)) builder = builder.exclude(s);
  return builder.analyze();
}

/** Violations as one line each, `<impact> <rule>: <targets>`, for a readable failure. */
export function formatViolations(violations: AxeViolation[]): string[] {
  return violations.map(
    (v) => `${v.impact ?? 'unknown'} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
}

export interface StubMatomoOptions {
  /**
   * Give the page this Matomo site id: set as `matomo-id` on each `<site-page>` without one,
   * and as `matomoid` on each `<site-analytics>` / `<uvalib-analytics>` without one, before
   * they upgrade. Leave it out when the served page has its id already.
   */
  siteId?: number | string;
}

/** The init script `stubMatomo` adds for `siteId`. */
function siteIdScript(id: string): string {
  return `(() => {
  const id = ${JSON.stringify(id)};
  const set = () => {
    for (const el of document.querySelectorAll('site-page:not([matomo-id])'))
      el.setAttribute('matomo-id', id);
    for (const el of document.querySelectorAll(
      'site-analytics:not([matomoid]), uvalib-analytics:not([matomoid])',
    ))
      el.setAttribute('matomoid', id);
  };
  new MutationObserver(set).observe(document, { childList: true, subtree: true });
})();`;
}

/**
 * Keep Matomo off the network: any `…/matomo.js` is answered with an empty script (so
 * `window._paq` stays the queue the page built, for `matomoQueue`) and any `…/matomo.php`
 * with 204. With `siteId`, the page gets that Matomo id. Call it before `page.goto`.
 */
export async function stubMatomo(
  page: TestPage,
  { siteId }: StubMatomoOptions = {},
): Promise<void> {
  await page.route(
    (url) => /\/matomo\.(js|php)$/.test(url.pathname),
    (route) =>
      new URL(route.request().url()).pathname.endsWith('.js')
        ? route.fulfill({ status: 200, contentType: 'text/javascript', body: '' })
        : route.fulfill({ status: 204, body: '' }),
  );
  if (siteId !== undefined) await page.addInitScript({ content: siteIdScript(String(siteId)) });
}

/** One Matomo command, such as `['trackSiteSearch', 'rotunda', 'Keyword', 4]`. */
export type MatomoCommand = unknown[];

/**
 * A copy of the page's Matomo queue (`window._paq`), empty when there is none; a function in
 * it (a callback command) is `'[function]'`. With `stubMatomo` nothing replays the queue, so
 * every page view, site search and event the page sent is there, in order.
 */
export async function matomoQueue(page: TestPage): Promise<MatomoCommand[]> {
  return page.evaluate(
    (fn: string) =>
      JSON.parse(
        JSON.stringify((window as Window & { _paq?: unknown[] })._paq ?? [], (_k, v: unknown) =>
          typeof v === 'function' ? fn : v,
        ),
      ) as MatomoCommand[],
    '[function]',
  );
}
