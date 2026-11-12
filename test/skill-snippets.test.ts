import { expect } from '@open-wc/testing';
// Raw text of the skill, served by the dev server at its repo path.
const skill = await (await fetch('/skills/uvalib-web-components/SKILL.md')).text();
const CDN = 'https://unpkg.internal.lib.virginia.edu/web-components/v1/';

const snippets = [...skill.matchAll(/^```html snippet\n([\s\S]*?)^```$/gm)].map((m) =>
  m[1]!.split(CDN).join('/dist-cdn/'),
);

function countMain(root: Document | ShadowRoot | Element): number {
  let n = root.querySelectorAll('main').length;
  for (const el of root.querySelectorAll('*')) {
    if (el.shadowRoot) n += countMain(el.shadowRoot);
  }
  return n;
}

describe('SKILL.md html snippets', () => {
  it('has html snippets', () => {
    expect(snippets.length).to.be.greaterThan(0);
  });

  snippets.forEach((src, i) => {
    it(`snippet ${i + 1} is a complete document that renders with one main`, async () => {
      expect(src).to.match(/^<!doctype html>/i);
      expect(src).to.match(/<title>[^<]+<\/title>/);
      expect(src).to.not.match(/\/web-components\/(latest|cdn-v)/);

      const iframe = document.createElement('iframe');
      document.body.append(iframe);
      const errors: string[] = [];
      try {
        const loaded = new Promise<void>((resolve) =>
          iframe.addEventListener('load', () => resolve(), { once: true }),
        );
        iframe.srcdoc = src;
        await loaded;
        const win = iframe.contentWindow!;
        win.addEventListener('error', (e) => errors.push(e.message));
        const doc = iframe.contentDocument!;
        const tags = new Set(
          [...doc.querySelectorAll('*')]
            .map((e) => e.localName)
            .filter((n) => n.includes('-') && n.startsWith('site-')),
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
        // Header and footer render asynchronously from the page.
        await new Promise((r) => setTimeout(r, 300));
        expect(countMain(doc)).to.equal(1);
        expect(errors).to.deep.equal([]);
      } finally {
        iframe.remove();
      }
    });
  });
});
