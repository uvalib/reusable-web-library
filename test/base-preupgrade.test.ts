import { expect } from '@open-wc/testing';

/**
 * base.css linked in <head>, before <site-page> is defined: the element is its own formatting
 * context (a heading's top margin cannot collapse through to <body> and move it when the
 * element upgrades), it stays invisible, and it shows after two seconds if the script never
 * loads. Checked in an iframe that links only the built stylesheet, so <site-page> stays
 * undefined until the test defines it.
 */
async function frame(): Promise<HTMLIFrameElement> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width: 400px; height: 400px';
  iframe.srcdoc = `<!doctype html><html><head>
    <link rel="stylesheet" href="${location.origin}/dist-cdn/base.css" />
    </head><body><site-page><h1 id="h">Content</h1></site-page></body></html>`;
  document.body.append(iframe);
  await new Promise((r) => iframe.addEventListener('load', r, { once: true }));
  return iframe;
}

describe('base.css before <site-page> is defined', function () {
  this.timeout(6000);

  it('keeps the heading margin inside, stays invisible, and shows after two seconds', async () => {
    const iframe = await frame();
    try {
      const doc = iframe.contentDocument!;
      const win = iframe.contentWindow!;
      expect(win.customElements.get('site-page')).to.equal(undefined);
      const el = doc.querySelector('site-page')!;
      expect(win.getComputedStyle(el).display).to.equal('flow-root');
      // The heading's margin stays inside <site-page>: <body> starts at the very top.
      expect(doc.body.getBoundingClientRect().top).to.equal(0);
      expect(win.getComputedStyle(doc.getElementById('h')!).visibility).to.equal('hidden');
      await new Promise((r) => setTimeout(r, 2300));
      expect(win.getComputedStyle(doc.getElementById('h')!).visibility).to.equal('visible');
    } finally {
      iframe.remove();
    }
  });

  it('shows the element as soon as it is defined', async () => {
    const iframe = await frame();
    try {
      const w = iframe.contentWindow as unknown as typeof window;
      w.customElements.define('site-page', class extends w.HTMLElement {});
      const h = iframe.contentDocument!.getElementById('h')!;
      expect(w.getComputedStyle(h).visibility).to.equal('visible');
    } finally {
      iframe.remove();
    }
  });
});
