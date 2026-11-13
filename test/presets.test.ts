import { expect } from '@open-wc/testing';
import { countMain, mount, whenAllDefined } from './helpers/page-probe.js';
import { galleryExamples, presets, withCdnBase, type Preset } from '../site/src/presets.js';

const STYLES_LINK = /<link rel="stylesheet" href="\.\/styles\.css"\s*\/?>/;

/** The preview document: index.html with styles.css inlined in place of its link. */
function previewSource(p: Preset): string {
  let html = p.files['index.html']!.content;
  const css = p.files['styles.css']?.content;
  if (css !== undefined) {
    expect(html, `${p.id} links styles.css`).to.match(STYLES_LINK);
    html = html.replace(STYLES_LINK, `<style>${css}</style>`);
  }
  return html;
}

describe('playground presets', function () {
  this.timeout(5000); // each test mounts a full page from dist-cdn
  it('has the presets from the spec, in order', () => {
    expect(presets.map((p) => p.id)).to.deep.equal([
      'full-page',
      'vendor-header',
      'light-dom-host-css',
      'pre-footer',
      'site-navigation',
      'theming',
      'search-facets',
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
        const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-cdn/')));
        try {
          const win = iframe.contentWindow!;
          const doc = iframe.contentDocument!;
          const tags = new Set(
            [...doc.querySelectorAll('*')].map((e) => e.localName).filter((n) => n.includes('-')),
          );
          expect(tags.size).to.be.greaterThan(0);
          await whenAllDefined(win, tags);
          for (const t of tags) {
            expect(doc.querySelector(`${t}:not(:defined)`), `${t} defined`).to.equal(null);
          }
          await (doc.querySelector('site-page') as unknown as { updateComplete: Promise<unknown> })
            .updateComplete;
          await new Promise((r) => setTimeout(r, 300)); // header and footer render asynchronously
          expect(countMain(doc)).to.equal(1);
          expect(errors).to.deep.equal([]);
        } finally {
          iframe.remove();
        }
      });
    });
  }
});
