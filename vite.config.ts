import { defineConfig } from 'vite';

const tags = [
  'site-page',
  'site-header',
  'site-footer',
  'site-analytics',
  'site-style',
  'uvalib-filter',
  'uvalib-date-range',
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
