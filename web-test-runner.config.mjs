import { esbuildPlugin } from '@web/dev-server-esbuild';
import { defaultReporter } from '@web/test-runner';
import { playwrightLauncher } from '@web/test-runner-playwright';
import { interceptAlerts } from './test/helpers/alerts-intercept.mjs';
import { interceptAnalytics } from './test/helpers/analytics-intercept.mjs';
import { interceptBento } from './test/helpers/bento-intercept.mjs';
import { interceptEvents } from './test/helpers/events-intercept.mjs';
import { hoursClockPlugin, interceptHours } from './test/helpers/hours-intercept.mjs';
import { interceptMainNav } from './test/helpers/main-nav-intercept.mjs';
import { interceptStatic } from './test/helpers/static-intercept.mjs';
import { pagefindFixturePlugin } from './test/helpers/pagefind-fixture.mjs';
import { jsonReporter } from './scripts/report/wtr-reporter.mjs';

const TZ_FILES = 'test/**/*-tz.test.ts';
const NEW_YORK_TZ_FILES = [
  'test/library-hours-tz.test.ts',
  'test/events-section-tz.test.ts',
  'test/bento-box-tz.test.ts',
];

/**
 * A Chromium launcher whose every context routes the alerts CDN, the library-hours,
 * events and search-results (bento-box) endpoints, the main-nav test hosts, Matomo (a stub
 * matomo.js) and static.lib.virginia.edu (dark mode's logo) to
 * local fixtures, so no test reaches the network for any of them. Service workers
 * are blocked so every request, including from the playground's preview frames, goes
 * through the routes (a worker's own fetches would not).
 */
const chromium = (options = {}) =>
  playwrightLauncher({
    product: 'chromium',
    createBrowserContext: ({ browser }) =>
      // Events and bento last: their routes must be tried before hours-intercept's
      // catch-alls for LibCal and the JSON:API index.
      interceptBento(
        interceptEvents(
          interceptStatic(
            interceptAnalytics(
              interceptAlerts(
                interceptHours(
                  interceptMainNav(browser.newContext({ serviceWorkers: 'block', ...options })),
                ),
              ),
            ),
          ),
        ),
      ),
  });

export default {
  nodeResolve: true,
  // The usual output, plus reports/browser.json for the test report (scripts/test-report.mjs).
  reporters: [defaultReporter(), jsonReporter()],
  filterBrowserLogs: (log) =>
    !log.args.some((a) => typeof a === 'string' && a.includes('Lit is in dev mode')),
  plugins: [
    esbuildPlugin({ ts: true, tsconfig: './tsconfig.json' }),
    hoursClockPlugin(),
    // A tiny Pagefind index, built locally at start-up and served at /pagefind-demo/.
    pagefindFixturePlugin(),
  ],
  // Full-page axe runs take close to mocha's 2s default when the whole suite runs in
  // parallel, which made them flaky; suites that mount whole pages still set more.
  testFramework: { config: { timeout: 5000 } },
  files: ['test/**/*.test.ts', `!${TZ_FILES}`],
  browsers: [chromium()],
  groups: [
    {
      // Time-zone-sensitive tests: a browser context west of UTC.
      name: 'timezone',
      files: TZ_FILES,
      browsers: [chromium({ timezoneId: 'America/New_York' })],
    },
    {
      // The library-hours and events time-zone tests again, far east of UTC: dates are
      // computed in America/New_York whatever the browser's own zone.
      name: 'timezone-tokyo',
      files: NEW_YORK_TZ_FILES,
      browsers: [chromium({ timezoneId: 'Asia/Tokyo' })],
    },
  ],
};
