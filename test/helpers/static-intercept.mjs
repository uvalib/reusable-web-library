// Keeps browser tests off static.lib.virginia.edu, where dark mode's reversed logo lives.
// Every browser context the test runner opens answers that host with a white stand-in PNG
// of the real logo's size (300x68), with CORS like the real host.
import { PNG } from 'pngjs';

export const STATIC_HOST = 'static.lib.virginia.edu';

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
  return context;
}
