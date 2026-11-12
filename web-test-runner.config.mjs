import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  nodeResolve: true,
  filterBrowserLogs: (log) =>
    !log.args.some((a) => typeof a === 'string' && a.includes('Lit is in dev mode')),
  plugins: [esbuildPlugin({ ts: true, tsconfig: './tsconfig.json' })],
  browsers: [playwrightLauncher({ product: 'chromium' })],
};
