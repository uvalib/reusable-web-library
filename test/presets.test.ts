import { expect } from '@open-wc/testing';
import { galleryExamples, presets, withCdnBase, type Preset } from '../site/src/presets.js';

// Same probe as test/skill-snippets.test.ts: registered before any other script, in the
// capture phase, so module-load and stylesheet-load failures are caught too.
const ERROR_PROBE = `<script>
  window.__errors = [];
  addEventListener('error', (e) => window.__errors.push(e.message || (e.target && e.target.src) || 'error'), true);
  addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason)));
</script>`;
const STYLES_LINK = /<link rel="stylesheet" href="\.\/styles\.css"\s*\/?>/;

function countMain(root: Document | ShadowRoot): number {
  let n = root.querySelectorAll('main').length;
  for (const el of root.querySelectorAll('*')) {
    if (el.shadowRoot) n += countMain(el.shadowRoot);
  }
  return n;
}

/** The preview document: index.html with styles.css inlined in place of its link. */
function previewSource(p: Preset): string {
  let html = p.files['index.html']!.content;
  const css = p.files['styles.css']?.content;
  if (css !== undefined) {
    expect(html, `${p.id} links styles.css`).to.match(STYLES_LINK);
    html = html.replace(STYLES_LINK, `<style>${css}</style>`);
  }
  return html.replace(/<head>/i, `<head>${ERROR_PROBE}`);
}

async function mount(src: string): Promise<HTMLIFrameElement> {
  const iframe = document.createElement('iframe');
  document.body.append(iframe);
  const loaded = new Promise((r) => iframe.addEventListener('load', r, { once: true }));
  iframe.srcdoc = src;
  await loaded;
  return iframe;
}

describe('playground presets', function () {
  this.timeout(5000); // each test mounts a full page from dist-cdn
  it('has the five presets from the spec, in order', () => {
    expect(presets.map((p) => p.id)).to.deep.equal([
      'full-page',
      'vendor-header',
      'light-dom-host-css',
      'pre-footer',
      'theming',
    ]);
  });

  it('gallery examples cover each header variant in shadow and no-shadow-dom modes', () => {
    const pages = galleryExamples.map((p) => p.files['index.html']!.content);
    for (const variant of ['full', 'vendor']) {
      for (const light of [false, true]) {
        expect(
          pages.some(
            (html) =>
              html.includes(`header-variant="${variant}"`) &&
              html.includes('no-shadow-dom') === light,
          ),
          `${variant} ${light ? 'no-shadow-dom' : 'shadow'}`,
        ).to.equal(true);
      }
    }
  });

  it('withCdnBase replaces every {{CDN}} token and leaves the original untouched', () => {
    const p = withCdnBase(presets[0]!, 'https://example.test/cdn/');
    const all = Object.values(p.files)
      .map((f) => f.content)
      .join('\n');
    expect(all).to.not.include('{{CDN}}');
    expect(all).to.include('https://example.test/cdn/site-page.js');
    expect(presets[0]!.files['index.html']!.content).to.include('{{CDN}}site-page.js');
  });

  for (const p of [...presets, ...galleryExamples]) {
    describe(p.id, () => {
      it('loads components through {{CDN}} and never from the internal CDN', () => {
        const all = Object.values(p.files)
          .map((f) => f.content)
          .join('\n');
        expect(p.files['index.html']!.content).to.include('<script type="module" src="{{CDN}}');
        expect(all).to.not.include('unpkg.internal');
        expect(p.title).to.not.equal('');
        expect(p.description).to.not.equal('');
      });

      it('renders against dist-cdn with defined components, one main and no errors', async () => {
        const iframe = await mount(previewSource(withCdnBase(p, '/dist-cdn/')));
        try {
          const win = iframe.contentWindow! as Window & { __errors: string[] };
          const doc = iframe.contentDocument!;
          const tags = new Set(
            [...doc.querySelectorAll('*')].map((e) => e.localName).filter((n) => n.includes('-')),
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
          await (doc.querySelector('site-page') as unknown as { updateComplete: Promise<unknown> })
            .updateComplete;
          await new Promise((r) => setTimeout(r, 300)); // header and footer render asynchronously
          expect(countMain(doc)).to.equal(1);
          expect(win.__errors).to.deep.equal([]);
        } finally {
          iframe.remove();
        }
      });
    });
  }
});
