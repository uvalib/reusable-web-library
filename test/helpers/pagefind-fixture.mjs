// A wtr plugin that builds the demo Pagefind index (scripts/pagefind-demo.mjs) when the test
// server starts and serves it at /pagefind-demo/, as the playground site does. The tests then
// run Pagefind's real default UI against it, with no network.
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { buildPagefindDemo } from '../../scripts/pagefind-demo.mjs';

export const PAGEFIND_PATH = '/pagefind-demo/';

const TYPES = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

export function pagefindFixturePlugin() {
  let dir;
  let built;
  return {
    name: 'pagefind-fixture',
    async serverStart() {
      built = (async () => {
        dir = await mkdtemp(join(tmpdir(), 'uvalib-pagefind-'));
        await buildPagefindDemo(dir);
      })();
      await built;
    },
    async serverStop() {
      if (dir) await rm(dir, { recursive: true, force: true });
    },
    async serve(context) {
      if (!context.path.startsWith(PAGEFIND_PATH)) return undefined;
      await built;
      const rel = normalize(context.path.slice(PAGEFIND_PATH.length));
      if (rel.startsWith('..') || rel.split(sep).includes('..')) return { status: 403, body: '' };
      try {
        const body = await readFile(join(dir, rel));
        const type = TYPES[extname(rel)] ?? 'application/octet-stream';
        return { body, type, headers: { 'cache-control': 'no-store' } };
      } catch {
        return undefined;
      }
    },
  };
}
