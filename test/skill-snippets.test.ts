import { expect } from '@open-wc/testing';
import { countMain, mount, whenAllDefined } from './helpers/page-probe.js';

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

describe('skill html snippets', function () {
  // Each snippet test waits up to 300 ms + 2000 ms (definitions) + 300 ms by itself.
  this.timeout(5000);
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
            .filter((n) => n.startsWith('site-') || n.startsWith('uvalib-')),
        );
        expect(tags.size).to.be.greaterThan(0);
        await whenAllDefined(win, tags);
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
