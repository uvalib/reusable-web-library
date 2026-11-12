import { expect } from '@open-wc/testing';

// Raw text of the skill files, served by the dev server at their repo paths.
const files = ['SKILL.md', 'reference/snippets.md'];
const CDN = 'https://unpkg.internal.lib.virginia.edu/web-components/v1/';

const snippets: { name: string; src: string }[] = [];
for (const f of files) {
  const text = await (await fetch(`/skills/uvalib-web-components/${f}`)).text();
  [...text.matchAll(/^```html snippet\n([\s\S]*?)^```$/gm)].forEach((m, i) =>
    snippets.push({ name: `${f} #${i + 1}`, src: m[1]!.split(CDN).join('/dist-cdn/') }),
  );
}

// Registered before any other script in the document (capture phase also sees
// script/link load failures, which do not bubble), so module-load errors are caught.
const ERROR_PROBE = `<script>
  window.__errors = [];
  addEventListener('error', (e) => window.__errors.push(e.message || (e.target && e.target.src) || 'error'), true);
  addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason)));
</script>`;

function countMain(root: Document | ShadowRoot): number {
  let n = root.querySelectorAll('main').length;
  for (const el of root.querySelectorAll('*')) {
    if (el.shadowRoot) n += countMain(el.shadowRoot);
  }
  return n;
}

async function mount(src: string): Promise<{ iframe: HTMLIFrameElement; errors: string[] }> {
  const iframe = document.createElement('iframe');
  document.body.append(iframe);
  const loaded = new Promise<void>((resolve) =>
    iframe.addEventListener('load', () => resolve(), { once: true }),
  );
  iframe.srcdoc = src.replace(/<head>/i, `<head>${ERROR_PROBE}`);
  await loaded;
  // Give module scripts and top-level awaits a moment to settle.
  await new Promise((r) => setTimeout(r, 300));
  const errors = (iframe.contentWindow as unknown as { __errors: string[] }).__errors;
  return { iframe, errors };
}

describe('skill html snippets', () => {
  it('finds snippets in SKILL.md and reference/snippets.md', () => {
    expect(snippets.some((s) => s.name.startsWith('SKILL.md'))).to.equal(true);
    expect(snippets.some((s) => s.name.startsWith('reference/snippets.md'))).to.equal(true);
  });

  it('the error probe reports a deliberately broken import', async () => {
    const { iframe, errors } = await mount(
      `<!doctype html><html><head><title>x</title>
       <script type="module" src="/dist-cdn/does-not-exist.js"></script></head><body></body></html>`,
    );
    iframe.remove();
    expect(errors.length).to.be.greaterThan(0);
  });

  snippets.forEach(({ name, src }) => {
    it(`${name} is a complete document that renders with one main`, async () => {
      expect(src).to.match(/^<!doctype html>/i);
      expect(src).to.match(/<title>[^<]+<\/title>/);
      expect(src).to.not.match(/\/web-components\/(latest|cdn-v)/);

      const { iframe, errors } = await mount(src);
      try {
        const win = iframe.contentWindow!;
        const doc = iframe.contentDocument!;
        const tags = new Set(
          [...doc.querySelectorAll('*')]
            .map((e) => e.localName)
            .filter((n) => n.startsWith('site-')),
        );
        expect(tags.size).to.be.greaterThan(0);
        await Promise.race([
          Promise.all([...tags].map((t) => win.customElements.whenDefined(t))),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('not defined in 2s')), 2000),
          ),
        ]);
        for (const t of tags) {
          expect(doc.querySelector(`${t}:not(:defined)`), `${t} defined`).to.equal(null);
        }
        const page = doc.querySelector('site-page') as unknown as {
          updateComplete: Promise<unknown>;
        };
        await page.updateComplete;
        await new Promise((r) => setTimeout(r, 300)); // header and footer render asynchronously
        expect(countMain(doc)).to.equal(1);
        expect(errors).to.deep.equal([]);
      } finally {
        iframe.remove();
      }
    });
  });
});
