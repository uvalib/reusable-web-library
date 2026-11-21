import { defineConfig } from 'vite';

const tags = [
  'site-page',
  'site-header',
  'site-main-nav',
  'site-footer',
  'site-analytics',
  'uvalib-analytics',
  'site-style',
  'uvalib-filter',
  'uvalib-date-range',
  'uvalib-date-histogram',
  'uvalib-breadcrumbs',
  'uvalib-card',
  'uvalib-card-grid',
  'uvalib-pager',
  'uvalib-contents',
  'uvalib-metadata',
  'uvalib-pagefind-search',
  'uvalib-lightbox',
  'uvalib-photo-grid',
  'uvalib-chip-group',
  'uvalib-tag-list',
  'uvalib-results-count',
  'site-alerts',
  'site-hours-section',
  'library-weekly-hours',
  'library-hours-setup',
  'events-section',
  'bento-box',
  'uvalib-tabs',
  'uvalib-combobox',
  'uvalib-image-regions',
];

// Library mode, ES output: one self-contained entry per component, with Lit and shared
// code split into hashed chunks. Nothing is external, so a page needs no import map.
export default defineConfig({
  build: {
    outDir: 'dist-cdn',
    emptyOutDir: true,
    minify: true,
    sourcemap: true,
    lib: {
      entry: Object.fromEntries(tags.map((t) => [t, `src/components/${t}/${t}.ts`])),
      formats: ['es'],
    },
    rollupOptions: {
      external: [],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
});
