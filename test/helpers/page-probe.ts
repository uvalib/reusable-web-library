// Mount a complete HTML document in a same-origin iframe and probe it: collect errors,
// wait for custom elements, and count <main> landmarks through open shadow roots.

// Registered before any other script in the document (capture phase also sees
// script/link load failures, which do not bubble), so module-load errors are caught.
// It also flags DOMContentLoaded, which fires once the page's module scripts have run.
// A resource failure is recorded with its URL. Failures from the third-party hosts in
// THIRD_PARTY_HOSTS (fonts, the logo) are network blips, not page bugs, so they are
// ignored; first-party resource failures and JS errors are always recorded.
export const THIRD_PARTY_HOSTS = ['use.typekit.net', 'www.library.virginia.edu'];

export const ERROR_PROBE = `<script>
  window.__errors = [];
  addEventListener('DOMContentLoaded', () => (window.__ready = true));
  addEventListener('error', (e) => {
    const t = e.target;
    if (t && t !== window && t.nodeType === 1) {
      const url = t.src || t.href || '';
      let host = '';
      try { host = new URL(url, location.href).host; } catch {}
      if (${JSON.stringify(THIRD_PARTY_HOSTS)}.includes(host)) return;
      window.__errors.push('failed to load ' + (url || t.localName));
      return;
    }
    window.__errors.push(e.message || 'error');
  }, true);
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
