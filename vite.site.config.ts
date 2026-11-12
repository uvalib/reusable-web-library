import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

// The GitHub Pages site (spec §9a): `site/` built into `dist-site/`. In dev (`pnpm start`)
// the server is rooted at the repo, so it also serves `demo/`.
const root = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(root, 'dist-site');
const ASSETS = 'assets';

/** Dev only: `…/cdn/<tag>.js` is served from the component source. */
function devCdn(): Plugin {
  return {
    name: 'uvalib-dev-cdn',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const m = req.url?.match(/\/cdn\/(site-[a-z]+)\.js(?:\?.*)?$/);
        if (m) req.url = `/src/components/${m[1]}/${m[1]}.ts`;
        next();
      });
    },
  };
}

/**
 * Build only: copy the CDN build to `dist-site/cdn/` (the previews import it), and
 * playground-elements' TypeScript worker next to the JS bundle, as its README requires.
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
    closeBundle() {
      cpSync(join(root, 'dist-cdn'), join(outDir, 'cdn'), { recursive: true });
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
  plugins: [devCdn(), siteFiles()],
  // Pre-bundling would move playground-elements away from its worker file.
  optimizeDeps: { exclude: ['playground-elements'] },
  build: {
    outDir,
    emptyOutDir: true,
    assetsDir: ASSETS,
    // playground-elements with CodeMirror is one ~900 kB chunk, shared by both pages.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        index: join(root, 'site/index.html'),
        playground: join(root, 'site/playground.html'),
      },
    },
  },
}));
