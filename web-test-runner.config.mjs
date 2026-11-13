import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';

const TZ_FILES = 'test/**/*-tz.test.ts';

export default {
  nodeResolve: true,
  filterBrowserLogs: (log) =>
    !log.args.some((a) => typeof a === 'string' && a.includes('Lit is in dev mode')),
  plugins: [esbuildPlugin({ ts: true, tsconfig: './tsconfig.json' })],
  files: ['test/**/*.test.ts', `!${TZ_FILES}`],
  browsers: [playwrightLauncher({ product: 'chromium' })],
  groups: [
    {
      // Time-zone-sensitive tests: a browser context west of UTC.
      name: 'timezone',
      files: TZ_FILES,
      browsers: [
        playwrightLauncher({
          product: 'chromium',
          createBrowserContext: ({ browser }) =>
            browser.newContext({ timezoneId: 'America/New_York' }),
        }),
      ],
    },
  ],
};
