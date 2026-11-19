import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { buildPagefindDemo } from './scripts/pagefind-demo.mjs';
import { examplesMainNav } from './site/src/main-nav.js';
import { COLOR_SCHEME_SNIPPET } from './site/src/presets.js';

// The GitHub Pages site (spec §9a): `site/` built into `dist-site/`. In dev (`pnpm start`)
// the server is rooted at the repo, so it also serves `demo/`.
const root = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(root, 'dist-site');
const ASSETS = 'assets';

/**
 * Dev only: `…/cdn/<tag>.js` is served from the component source, and `…/cdn/tokens.css` and
 * `base.css` from the last `pnpm build` (dist-cdn/).
 */
function devCdn(): Plugin {
  return {
    name: 'uvalib-dev-cdn',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const m = req.url?.match(/\/cdn\/(site-[a-z]+)\.js(?:\?.*)?$/);
        if (m) req.url = `/src/components/${m[1]}/${m[1]}.ts`;
        const css = req.url?.match(/\/cdn\/(tokens|base|pagefind)\.css(?:\?.*)?$/);
        if (css) req.url = `/dist-cdn/${css[1]}.css`;
        next();
      });
    },
  };
}

/**
 * The examples page (site/index.html) as served, in dev and in the build: `<!--examples-main-nav-->`
 * becomes the examples menu's `<nav slot="main-nav">` markup (site/src/main-nav.ts), and
 * `<!--color-scheme-snippet-->` dark mode's anti-flash script, the README's text
 * (COLOR_SCHEME_SNIPPET). Both are in the HTML before any script runs.
 */
function examplesPage(): Plugin {
  return {
    name: 'uvalib-examples-page',
    transformIndexHtml: {
      order: 'pre',
      handler(html, { filename }) {
        if (resolve(filename) !== join(root, 'site/index.html')) return html;
        const fill = (name: string, value: (indent: string) => string) => {
          const re = new RegExp(`^( *)<!--${name}-->$`, 'm');
          if (!re.test(html)) throw new Error(`site/index.html has no <!--${name}--> line`);
          html = html.replace(re, (_, indent: string) => indent + value(indent));
        };
        fill('examples-main-nav', (indent) => examplesMainNav(indent.length));
        fill('color-scheme-snippet', () => `<script>${COLOR_SCHEME_SNIPPET}</script>`);
        return html;
      },
    },
  };
}

/**
 * Build only: copy the CDN build to `dist-site/cdn/` (the previews import it), build the
 * Pagefind example's demo index into `dist-site/pagefind-demo/`, and
 * copy playground-elements' TypeScript worker next to the JS bundle, as its README requires.
 */
function siteFiles(): Plugin {
  return {
    name: 'uvalib-site-files',
    apply: 'build',
    buildStart() {
      if (!existsSync(join(root, 'dist-cdn/site-page.js'))) {
        this.error('dist-cdn/ is missing: run `pnpm build` before `pnpm build:site`.');
      }
    },
    async closeBundle() {
      cpSync(join(root, 'dist-cdn'), join(outDir, 'cdn'), { recursive: true });
      // The Pagefind example searches a tiny demo index, built here with Pagefind's own
      // binary (the pagefind devDependency), as a static site's build would.
      await buildPagefindDemo(join(outDir, 'pagefind-demo'));
      // The library-hours preset runs outside library.virginia.edu, whose JSON:API has no
      // CORS, so it reads this snapshot of the library list (the trimmed test fixture).
      // Hours still come live from LibCal.
      mkdirSync(join(outDir, 'data'), { recursive: true });
      copyFileSync(
        join(root, 'test/fixtures/hours/drupal-libraries.json'),
        join(outDir, 'data/hours-libraries.json'),
      );
      // The worker imports ./internal/typescript.js, so that file goes with it. Vite also
      // emits a hashed copy of the worker, which is the one the bundle references; that
      // copy needs the same sibling. The unhashed copy is kept because the
      // playground-elements README says to copy the worker next to the bundle.
      const pkg = join(root, 'node_modules/playground-elements');
      mkdirSync(join(outDir, ASSETS, 'internal'), { recursive: true });
      for (const file of ['playground-typescript-worker.js', 'internal/typescript.js']) {
        copyFileSync(join(pkg, file), join(outDir, ASSETS, file));
      }
    },
  };
}

export default defineConfig(({ command, isPreview }) => ({
  root: command === 'build' || isPreview ? join(root, 'site') : root,
  // GitHub Pages project path. The tests override it with `--base /dist-site/`, because
  // web-test-runner serves the repo root.
  base: command === 'build' || isPreview ? '/reusable-web-library/' : '/',
  plugins: [devCdn(), examplesPage(), siteFiles()],
  // Pre-bundling would move playground-elements away from its worker file.
  optimizeDeps: { exclude: ['playground-elements'] },
  build: {
    outDir,
    emptyOutDir: true,
    assetsDir: ASSETS,
    // playground-elements with CodeMirror is one ~900 kB chunk.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        index: join(root, 'site/index.html'),
        // The old playground URL: it only redirects to index.html, keeping query and hash.
        playground: join(root, 'site/playground.html'),
      },
    },
  },
}));
