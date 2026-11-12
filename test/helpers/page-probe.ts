// Mount a complete HTML document in a same-origin iframe and probe it: collect errors,
// wait for custom elements, and count <main> landmarks through open shadow roots.

// Registered before any other script in the document (capture phase also sees
// script/link load failures, which do not bubble), so module-load errors are caught.
// It also flags DOMContentLoaded, which fires once the page's module scripts have run.
export const ERROR_PROBE = `<script>
  window.__errors = [];
  addEventListener('DOMContentLoaded', () => (window.__ready = true));
  addEventListener('error', (e) => window.__errors.push(e.message || (e.target && e.target.src) || 'error'), true);
  addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason)));
</script>`;

export function countMain(root: Document | ShadowRoot): number {
  let n = root.querySelectorAll('main').length;
  for (const el of root.querySelectorAll('*')) {
    if (el.shadowRoot) n += countMain(el.shadowRoot);
  }
  return n;
}

/**
 * Mount `src` (a full document with a `<head>`) with ERROR_PROBE injected. `errors` is the
 * page's live error list, so read it after any later waits.
 */
export async function mount(src: string): Promise<{ iframe: HTMLIFrameElement; errors: string[] }> {
  const iframe = document.createElement('iframe');
  document.body.append(iframe);
  iframe.srcdoc = src.replace(/<head>/i, `<head>${ERROR_PROBE}`);
  // Wait for DOMContentLoaded, not the load event: load also waits for third-party
  // resources (such as the Typekit stylesheet site-page adds), which can hang offline.
  const end = Date.now() + 3000;
  const win = () => iframe.contentWindow as unknown as { __ready?: boolean; __errors: string[] };
  while (!win()?.__ready) {
    if (Date.now() > end) throw new Error('mounted document did not finish parsing in 3s');
    await new Promise((r) => setTimeout(r, 10));
  }
  // Give module scripts and top-level awaits a moment to settle.
  await new Promise((r) => setTimeout(r, 300));
  return { iframe, errors: win().__errors };
}

/** Resolve when every tag is defined in `win`, or reject after `ms`. */
export function whenAllDefined(win: Window, tags: Iterable<string>, ms = 2000): Promise<unknown> {
  return Promise.race([
    Promise.all([...tags].map((t) => win.customElements.whenDefined(t))),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`not defined in ${ms}ms`)), ms)),
  ]);
}
