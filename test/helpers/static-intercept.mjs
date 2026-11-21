// Keeps browser tests off static.lib.virginia.edu, where dark mode's reversed logo lives,
// off iiif.lib.virginia.edu, which the image examples link to, and off the map's hosts:
// OpenStreetMap's tiles (a plain stand-in tile) and the Leaflet copy on unpkg that the map
// example loads (answered from node_modules/leaflet, the same files).
// Every browser context the test runner opens answers that host with a white stand-in PNG
// of the real logo's size (300x68), with CORS like the real host.
import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

export const STATIC_HOST = 'static.lib.virginia.edu';
/** The Library's IIIF image server, used by the image examples: answered with a grey stand-in. */
export const IIIF_HOST = 'iiif.lib.virginia.edu';

/** OpenStreetMap's tile server, the map's default tiles: answered with a plain 256px tile. */
export const OSM_TILE_HOST = 'tile.openstreetmap.org';
/** Where the map example loads Leaflet from: answered from node_modules/leaflet/dist. */
export const LEAFLET_CDN = 'https://unpkg.com/leaflet@1.9.4/dist/';
const LEAFLET_DIST = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../node_modules/leaflet/dist',
);
const LEAFLET_TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

let tilePng;
/** A 256px tile in a pale map colour. */
export function tile() {
  if (!tilePng) {
    const img = new PNG({ width: 256, height: 256 });
    for (let i = 0; i < img.data.length; i += 4) img.data.set([0xf2, 0xef, 0xe9, 0xff], i);
    tilePng = PNG.sync.write(img);
  }
  return tilePng;
}

let grey;
function photo() {
  if (!grey) {
    const img = new PNG({ width: 40, height: 30 });
    for (let i = 0; i < img.data.length; i += 4) img.data.set([0x9e, 0x9e, 0x9e, 0xff], i);
    grey = PNG.sync.write(img);
  }
  return grey;
}

let png;
function logo() {
  if (!png) {
    const img = new PNG({ width: 300, height: 68 });
    img.data.fill(0xff);
    png = PNG.sync.write(img);
  }
  return png;
}

/** Route the static host in `context` (a Playwright BrowserContext, or a promise of one). */
export async function interceptStatic(contextOrPromise) {
  const context = await contextOrPromise;
  await context.route(
    (url) => url.host === STATIC_HOST,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'image/png',
        headers: { 'access-control-allow-origin': '*' },
        body: logo(),
      }),
  );
  await context.route(
    (url) => url.host === IIIF_HOST,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'image/png',
        headers: { 'access-control-allow-origin': '*' },
        body: photo(),
      }),
  );
  await context.route(
    (url) => url.host === OSM_TILE_HOST,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'image/png',
        headers: { 'access-control-allow-origin': '*' },
        body: tile(),
      }),
  );
  await context.route(
    (url) => url.href.startsWith(LEAFLET_CDN),
    (route) => {
      const rest = normalize(
        new URL(route.request().url()).pathname.slice('/leaflet@1.9.4/dist/'.length),
      );
      const file = join(LEAFLET_DIST, rest);
      if (!file.startsWith(LEAFLET_DIST)) return route.fulfill({ status: 404 });
      const ext = rest.slice(rest.lastIndexOf('.'));
      try {
        return route.fulfill({
          status: 200,
          contentType: LEAFLET_TYPES[ext] ?? 'application/octet-stream',
          headers: { 'access-control-allow-origin': '*' },
          body: readFileSync(file),
        });
      } catch {
        return route.fulfill({ status: 404 });
      }
    },
  );
  return context;
}
