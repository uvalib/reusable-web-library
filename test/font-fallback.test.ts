import { expect, fixture, html } from '@open-wc/testing';
import '../src/components/site-page/site-page.js';
import { fontFallback } from '../src/styles/font-fallback.js';

/**
 * Issue #32: "UVA Franklin Fallback" is the system's Arial (or Liberation Sans) scaled to
 * Franklin Gothic URW's widths, with its line metrics, so text wraps the same before and after
 * the Adobe Fonts kit arrives. The kit itself is never loaded in tests (no network); these check
 * the fallback against the values measured from the kit: 94.52% of Arial's width at 400,
 * 91.32% at 700, and a normal line of 1.205em (Franklin Gothic's ascent 0.954 + descent 0.251).
 */
const fallbackFaces = () =>
  [...document.fonts].filter((f) => f.family.replace(/["']/g, '') === 'UVA Franklin Fallback');

describe('<site-page> installs the Franklin Gothic fallback', () => {
  it('adds the four fallback faces to the document with its global styles', async () => {
    const before = fallbackFaces().length;
    await fixture(html`<site-page><h1>Title</h1></site-page>`);
    expect(before).to.equal(0);
    expect(fallbackFaces().length).to.equal(4);
    // The page's font stack names it right after Franklin Gothic.
    expect(getComputedStyle(document.body).fontFamily).to.match(
      /^franklin-gothic-urw, "UVA Franklin Fallback", Arial/,
    );
  });
});

describe('the Franklin Gothic fallback face', () => {
  let sheet: CSSStyleSheet;
  before(() => {
    sheet = fontFallback.styleSheet!;
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  });
  after(() => {
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== sheet);
  });

  const SAMPLE =
    'The University of Virginia Library supports research, teaching and learning with collections';
  const width = (font: string) => {
    const c = document.createElement('canvas').getContext('2d')!;
    c.font = font;
    return c.measureText(SAMPLE).width;
  };
  /** Whether the system has a font the fallback's src can use (Arial, or Liberation Sans). */
  const available = async (weight: number) => {
    const loaded = await document.fonts.load(`${weight} 16px "UVA Franklin Fallback"`);
    return loaded.length > 0;
  };

  for (const [weight, ratio, base] of [
    [400, 0.9452, '400 100px Arial, "Liberation Sans"'],
    [700, 0.9132, '700 100px Arial, "Liberation Sans"'],
  ] as const) {
    it(`is ${(ratio * 100).toFixed(2)}% of Arial's width at ${weight}`, async function () {
      if (!(await available(weight))) this.skip();
      const fallback = width(`${weight} 100px "UVA Franklin Fallback"`);
      expect(fallback / width(base)).to.be.closeTo(ratio, 0.002);
    });
  }

  it('has Franklin Gothic’s line height (1.205em) and no line gap', async function () {
    if (!(await available(400))) this.skip();
    const p = document.createElement('p');
    p.style.cssText =
      'position:absolute;margin:0;white-space:nowrap;font:400 100px/normal "UVA Franklin Fallback"';
    p.textContent = 'Hxg';
    document.body.append(p);
    try {
      expect(p.getBoundingClientRect().height / 100).to.be.closeTo(1.205, 0.01);
    } finally {
      p.remove();
    }
  });
});
