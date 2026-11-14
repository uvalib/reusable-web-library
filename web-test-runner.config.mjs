import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';
import { interceptAlerts } from './test/helpers/alerts-intercept.mjs';
import { hoursClockPlugin, interceptHours } from './test/helpers/hours-intercept.mjs';

const TZ_FILES = 'test/**/*-tz.test.ts';
const HOURS_TZ_FILES = 'test/library-hours-tz.test.ts';

/**
 * A Chromium launcher whose every context routes the alerts CDN and the library-hours
 * endpoints to local fixtures, so no test reaches the network for either. Service workers
 * are blocked so every request, including from the playground's preview frames, goes
 * through the routes (a worker's own fetches would not).
 */
const chromium = (options = {}) =>
  playwrightLauncher({
    product: 'chromium',
    createBrowserContext: ({ browser }) =>
      interceptAlerts(interceptHours(browser.newContext({ serviceWorkers: 'block', ...options }))),
  });

export default {
  nodeResolve: true,
  filterBrowserLogs: (log) =>
    !log.args.some((a) => typeof a === 'string' && a.includes('Lit is in dev mode')),
  plugins: [esbuildPlugin({ ts: true, tsconfig: './tsconfig.json' }), hoursClockPlugin()],
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
      // The library-hours time-zone tests again, far east of UTC: dates are computed in
      // America/New_York whatever the browser's own zone.
      name: 'timezone-tokyo',
      files: HOURS_TZ_FILES,
      browsers: [chromium({ timezoneId: 'Asia/Tokyo' })],
    },
  ],
};
