// `pnpm start` (vite.site.config.ts, dev only): where the examples' CDN URLs are served from,
// and the Pagefind example's demo index, built on its first request.
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { buildPagefindDemo } from './pagefind-demo.mjs';

const ENTRY = /\/cdn\/((?:site|uvalib|library)-[a-z-]+|events-section|bento-box)\.js(?:\?.*)?$/;
const CSS = /\/cdn\/(tokens|base|pagefind|edition)\.css(?:\?.*)?$/;

/**
 * The dev URL for a request: `…/cdn/<tag>.js` from the component's source (every element
 * entry), `…/cdn/<name>.css` from the last `pnpm build` (dist-cdn/); anything else unchanged.
 */
export function devCdnUrl(url) {
  const m = url.match(ENTRY);
  if (m) return `/src/components/${m[1]}/${m[1]}.ts`;
  const css = url.match(CSS);
  if (css) return `/dist-cdn/${css[1]}.css`;
  return url;
}

const DEMO = /\/pagefind-demo\/([^?#]*)/;
const TYPES = { '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };

/** Connect middleware serving `…/pagefind-demo/<file>` from a demo index built once. */
export function pagefindDemoMiddleware() {
  let dir;
  return async (req, res, next) => {
    const m = req.url?.match(DEMO);
    if (!m) return next();
    try {
      dir ??= (async () => {
        const d = await mkdtemp(join(tmpdir(), 'uvalib-pagefind-dev-'));
        await buildPagefindDemo(d);
        return d;
      })();
      const rel = normalize(decodeURIComponent(m[1]));
      if (rel.split(sep).includes('..')) return res.writeHead(403).end();
      const body = await readFile(join(await dir, rel));
      res.writeHead(200, { 'content-type': TYPES[extname(rel)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  };
}
