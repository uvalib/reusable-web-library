// edition.css: reading styles for converted TEI texts. Checked in an iframe that links only
// the built stylesheets (dist-cdn), as a host page would, with the playground's own sample
// text (site/src/presets.ts); the screen-reader text and the lightbox in the test page itself.
import { expect, fixture } from '@open-wc/testing';
import { emulateMedia } from '@web/test-runner-commands';
import { expectNoAxeViolations } from './helpers/axe.js';
import { EDITION_SAMPLE, EDITION_TOGGLES } from '../site/src/presets.js';
import '../src/components/uvalib-lightbox/uvalib-lightbox.js';
import type { UvalibLightbox } from '../src/components/uvalib-lightbox/UvalibLightbox.js';

const CDN = `${location.origin}/dist-cdn/`;
const PAGE = `<main><h1>Sample text</h1>${EDITION_TOGGLES}${EDITION_SAMPLE}</main>`;

async function frame(
  { dark = false, width = 1000 }: { dark?: boolean; width?: number } = {},
  body = PAGE,
): Promise<HTMLIFrameElement> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `width: ${width}px; height: 900px; border: 0`;
  iframe.srcdoc = `<!doctype html><html lang="en" ${dark ? 'data-uva-color-scheme="dark"' : ''}>
    <head><title>Edition</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="${CDN}tokens.css" />
    <link rel="stylesheet" href="${CDN}base.css" />
    <link rel="stylesheet" href="${CDN}edition.css" /></head>
    <body>${body}</body></html>`;
  document.body.append(iframe);
  await new Promise((r) => iframe.addEventListener('load', r, { once: true }));
  // A test never follows a link.
  iframe.contentDocument!.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a')) e.preventDefault();
  });
  return iframe;
}

const lum = (c: string) => {
  const [r, g, b] = c
    .match(/[\d.]+/g)!
    .slice(0, 3)
    .map((v) => {
      const s = Number(v) / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

describe('edition.css', function () {
  this.timeout(8000);
  let iframe: HTMLIFrameElement;
  let doc: Document;
  let win: Window;
  const $ = (sel: string) => doc.querySelector<HTMLElement>(sel)!;
  const cs = (sel: string, pseudo?: string) => win.getComputedStyle($(sel), pseudo);
  const open = async (opts?: { dark?: boolean; width?: number }, body?: string) => {
    iframe = await frame(opts, body);
    doc = iframe.contentDocument!;
    win = iframe.contentWindow!;
  };

  afterEach(async () => {
    iframe?.remove();
    await emulateMedia({ forcedColors: 'none', colorScheme: 'light', media: 'screen' });
  });

  it('sets the library font, a readable measure and line height', async () => {
    await open();
    const s = cs('.uvalib-edition');
    expect(s.fontFamily).to.match(/^franklin-gothic-urw/);
    // No serif in the stack (the UX team's deprecated list); sans-serif is the last resort.
    expect(s.fontFamily.split(',').map((f) => f.trim())).to.not.include('serif');
    expect(parseFloat(s.lineHeight) / parseFloat(s.fontSize)).to.be.at.least(1.6);
    const w = $('.uvalib-edition').getBoundingClientRect().width;
    expect(w / parseFloat(s.fontSize)).to.be.within(30, 45); // about 70ch
    expect(s.color).to.equal('rgb(43, 43, 43)');
  });

  it('styles headings, verse, drama, letters, quotations, ornaments, notes and page breaks', async () => {
    await open();
    const h2 = cs('#letter');
    expect([h2.color, h2.fontWeight]).to.deep.equal(['rgb(35, 45, 75)', '700']);
    expect(parseFloat(h2.fontSize)).to.be.closeTo(17 * 2.074, 0.2);
    // Verse: a block per line, hanging, indented lines further in, a visual line number.
    expect(cs('.l').display).to.equal('block');
    expect(cs('.l').textIndent).to.equal(`-${parseFloat(cs('.l').fontSize) * 2}px`);
    expect(parseFloat(cs('.l.rend-indent').paddingLeft)).to.be.greaterThan(
      parseFloat(cs('.l').paddingLeft),
    );
    expect(cs('.l[data-n]', '::after').content).to.equal('"5" / ""');
    // Drama
    expect([cs('.speaker').fontVariantCaps, cs('.speaker').fontWeight]).to.deep.equal([
      'small-caps',
      '700',
    ]);
    expect(cs('.stage').fontStyle).to.equal('italic');
    // Letters
    expect(cs('.dateline').textAlign).to.equal('end');
    expect(cs('.closer .signed').textAlign).to.equal('end');
    expect(cs('.postscript').textAlign).to.equal('start');
    // The theme's blockquote for the epigraph; the inner blockquote adds nothing.
    const ep = cs('.epigraph');
    expect([
      ep.borderLeftWidth,
      ep.borderLeftStyle,
      ep.borderLeftColor,
      ep.fontStyle,
    ]).to.deep.equal(['1px', 'solid', 'rgb(229, 114, 0)', 'italic']);
    expect(cs('.epigraph blockquote').borderLeftStyle).to.equal('none');
    expect(cs('.epigraph .bibl').textAlign).to.equal('end');
    // Ornament: a centred ⁂ with no text for screen readers.
    expect(cs('hr.ornament', '::before').content).to.match(/^"⁂" \/ ""$/);
    expect(cs('hr.ornament').textAlign).to.equal('center');
    // Notes: a superscript reference, footnotes after a rule in smaller text.
    expect(cs('sup.noteref').verticalAlign).to.equal('super');
    const fn = cs('.footnotes');
    expect(fn.borderTopStyle).to.equal('solid');
    expect(parseFloat(fn.fontSize)).to.be.lessThan(parseFloat(cs('.uvalib-edition').fontSize));
    expect(cs('aside.note-inline').display).to.equal('block');
    expect(cs('span.note-inline', '::before').content).to.equal('"["');
    // Page breaks: small muted labels; links underlined in the link colour, 24px tall.
    const pb = cs('.pb');
    expect(parseFloat(pb.fontSize)).to.be.lessThan(16);
    expect(pb.color).to.equal('rgb(75, 85, 99)');
    const a = cs('a.pb-image');
    expect(a.color).to.equal('rgb(35, 45, 75)');
    expect(a.textDecorationLine).to.equal('underline');
    expect($('a.pb-image').getBoundingClientRect().height).to.be.at.least(24);
    // The first page break of a section sits on its own line at the end.
    expect(cs('section > .pb').display).to.equal('block');
  });

  it('marks additions, deletions, unclear text and gaps without colour alone', async () => {
    await open();
    expect(cs('ins.add', '::before').content).to.equal('"added: "');
    expect(cs('ins.add', '::before').position).to.equal('absolute');
    expect(cs('ins.add').verticalAlign).to.equal('super');
    expect(cs('del.del', '::before').content).to.equal('"deleted: "');
    expect(cs('del.del').textDecorationLine).to.equal('line-through');
    // An empty deletion shows a visible bracket.
    const empty = cs('del.del:empty', '::before');
    expect([empty.content, empty.position]).to.deep.equal(['"[deletion]"', 'static']);
    expect(cs('.unclear', '::after').content).to.equal('"[?]" / "(unclear)"');
    expect(cs('.gap', '::before').content).to.equal('"[…]" / "gap in the text"');
    // Regularised readings: a dotted underline, shown inline by the readings toggle.
    const orig = cs('.orig[title]');
    expect([orig.textDecorationLine, orig.textDecorationStyle]).to.deep.equal([
      'underline',
      'dotted',
    ]);
    expect(cs('.orig[title]', '::after').content).to.equal('none');
    $('.uvalib-edition__readings input').click();
    expect(cs('.orig[title]', '::after').content).to.equal('" [Regularized: weather]"');
  });

  it('reflows prose by default without running words together; the toggle shows lines', async () => {
    const extra = `<div class="uvalib-edition" id="span-lb"><p class="p" id="joined">the<span class="lb"></span>lawn</p><p class="p" id="two">one <br class="lb">two</p></div>`;
    await open({}, PAGE.replace('</main>', `${extra}</main>`));
    const p = $('.div-letter p.p');
    expect(cs('br.lb').display).to.equal('none');
    const text = p.innerText.replace(/\s+/g, ' ');
    expect(text).to.include('my pen at once');
    expect(text).to.include('library open');
    const flat = $('#two').getBoundingClientRect().height;
    // span.lb: a generated space between the words (no whitespace in the source).
    const gap = () => {
      const [the, lawn] = [...$('#joined').childNodes].filter((n) => n.nodeType === 3);
      const r = (n: Node) => {
        const range = doc.createRange();
        range.selectNodeContents(n);
        return range.getBoundingClientRect();
      };
      return { dx: r(lawn!).left - r(the!).right, dy: r(lawn!).top - r(the!).top };
    };
    expect(gap().dx).to.be.greaterThan(3);
    expect(gap().dy).to.equal(0);
    // The checkbox before the edition turns lineation on for every edition after it.
    $('.uvalib-edition__lines input').click();
    expect(cs('br.lb').display).to.equal('inline');
    expect($('#two').getBoundingClientRect().height).to.be.closeTo(flat * 2, 1);
    expect(gap().dy).to.be.greaterThan(0);
    expect(cs('label.uvalib-edition__lines').backgroundColor).to.equal('rgb(0, 123, 172)');
    $('.uvalib-edition__lines input').click();
    expect(cs('br.lb').display).to.equal('none');
  });

  it('lineation: a toggle inside the edition, in a toolbar before it, or the class', async () => {
    const text = `<p class="p">one <br class="lb">two</p>`;
    await open(
      {},
      `<main><h1>T</h1>
      <div class="uvalib-edition" id="inside"><label class="uvalib-edition__lines"><input type="checkbox" id="c1"> Lines</label>${text}</div>
      <p class="toolbar"><input type="checkbox" class="uvalib-edition__lines" id="c2" aria-label="Lines"></p>
      <div class="uvalib-edition" id="after">${text}</div>
      <div class="uvalib-edition uvalib-edition--lines" id="class">${text}</div></main>`,
    );
    const br = (id: string) => win.getComputedStyle(doc.querySelector(`#${id} br.lb`)!).display;
    expect([br('inside'), br('after'), br('class')]).to.deep.equal(['none', 'none', 'inline']);
    $('#c1').click();
    expect([br('inside'), br('after')]).to.deep.equal(['inline', 'none']);
    $('#c2').click();
    expect(br('after')).to.equal('inline');
  });

  it('the toggle is a 44px target with the library focus ring', async () => {
    await open();
    const label = $('label.uvalib-edition__lines');
    expect(label.getBoundingClientRect().height).to.be.at.least(44);
    $('.uvalib-edition__lines input').focus();
    // Keyboard focus: :focus-visible is set on programmatic focus after a key press only, so
    // check the rule through the style sheet instead.
    const rules = [...doc.styleSheets]
      .flatMap((s) => [...s.cssRules])
      .map((r) => r.cssText)
      .join('\n');
    expect(rules).to.match(/__lines.*:has\(:focus-visible\)[^}]*outline: 3px solid/s);
  });

  for (const dark of [false, true]) {
    it(`passes axe with readable contrast (${dark ? 'dark' : 'light'})`, async () => {
      if (dark) await emulateMedia({ colorScheme: 'dark' });
      await open({ dark });
      const bg = win.getComputedStyle(doc.body).backgroundColor;
      const back = bg === 'rgba(0, 0, 0, 0)' ? 'rgb(255, 255, 255)' : bg;
      if (dark) expect(back).to.equal('rgb(16, 23, 43)');
      const pairs: [string, string][] = [
        ['text', cs('.uvalib-edition').color],
        ['heading', cs('#letter').color],
        ['muted', cs('.stage').color],
        ['page label', cs('.pb-image').color],
        ['line number', cs('.l[data-n]', '::after').color],
      ];
      for (const [name, fg] of pairs)
        expect(contrast(fg, back), `${name} ${fg} on ${back}`).to.be.at.least(7);
      const box = cs('aside.note-inline');
      expect(contrast(box.color, box.backgroundColor)).to.be.at.least(7);
      await expectNoAxeViolations(doc.documentElement);
    });
  }

  it('reflows at 320px with no sideways scroll', async () => {
    await open({ width: 320 });
    expect(doc.documentElement.scrollWidth).to.be.at.most(win.innerWidth);
    $('.uvalib-edition__lines input').click();
    expect(doc.documentElement.scrollWidth).to.be.at.most(win.innerWidth);
  });

  it('forced colors: page labels, the note box and the checked toggle stay visible', async () => {
    await emulateMedia({ forcedColors: 'active' });
    await open();
    expect(cs('.pb-image').borderTopStyle).to.equal('solid');
    expect(cs('aside.note-inline').borderTopStyle).to.equal('solid');
    expect(cs('del.del').textDecorationLine).to.equal('line-through');
    $('.uvalib-edition__lines input').click();
    const t = cs('label.uvalib-edition__lines');
    expect(t.backgroundColor).to.not.equal('rgba(0, 0, 0, 0)');
    expect(t.backgroundColor).to.not.equal(t.color);
  });

  it('print: page labels kept in black, readings shown, toggles hidden, notes readable', async () => {
    await emulateMedia({ media: 'print' });
    await open();
    expect(cs('.pb').display).to.not.equal('none');
    expect(cs('.pb-image').color).to.equal('rgb(0, 0, 0)');
    expect(cs('label.uvalib-edition__lines').display).to.equal('none');
    expect(cs('.orig[title]', '::after').content).to.equal('" [Regularized: weather]"');
    expect(parseFloat(cs('.footnotes').fontSize)).to.be.at.least(12);
    expect(cs('.uvalib-edition').maxWidth).to.equal('none');
  });

  it('hidden hides edition content and the toggles', async () => {
    await open(
      {},
      PAGE.replace('class="pb"', 'class="pb" hidden').replace(
        '<label class="uvalib-edition__lines"',
        '<label hidden class="uvalib-edition__lines"',
      ),
    );
    expect(cs('.pb').display).to.equal('none');
    expect(cs('label.uvalib-edition__lines').display).to.equal('none');
  });
});

describe('edition.css in the page', function () {
  this.timeout(8000);
  let link: HTMLLinkElement;
  before(async () => {
    link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/dist-cdn/edition.css';
    const loaded = new Promise((r) => link.addEventListener('load', r, { once: true }));
    document.head.append(link);
    await loaded;
  });
  after(() => link.remove());

  // The generated words are hidden from sight but stay in the accessibility tree: clipped to
  // 1px, never display: none or visibility: hidden, and with no empty alternative text.
  it('additions, deletions and note references carry visually hidden words', async () => {
    const el = await fixture<HTMLElement>(`<div id="sr">${EDITION_SAMPLE}</div>`);
    const words: [string, string, string][] = [
      ['ins.add', '::before', '"added: "'],
      ['ins.add', '::after', '" (end added)"'],
      ['del.del:not(:empty)', '::before', '"deleted: "'],
      ['del.del:not(:empty)', '::after', '" (end deleted)"'],
      ['.noteref a', '::before', '"Note "'],
    ];
    for (const [sel, pseudo, content] of words) {
      const s = getComputedStyle(el.querySelector(sel)!, pseudo);
      expect(s.content, sel).to.equal(content);
      expect([s.position, s.width, s.clipPath, s.display, s.visibility], sel).to.deep.equal([
        'absolute',
        '1px',
        'inset(50%)',
        'block',
        'visible',
      ]);
    }
    el.remove();
  });

  it('page-break links open in <uvalib-lightbox selector="a.pb-image">', async () => {
    const root = await fixture<HTMLElement>(`<div>
      <uvalib-lightbox selector=".uvalib-edition a.pb-image"></uvalib-lightbox>
      ${EDITION_SAMPLE}
    </div>`);
    const box = root.querySelector('uvalib-lightbox') as UvalibLightbox;
    await box.updateComplete;
    root.addEventListener('click', (e) => e.preventDefault()); // never navigate
    root.querySelectorAll<HTMLElement>('a.pb-image')[1]!.click();
    await box.updateComplete;
    const view = (box.shadowRoot ?? box) as ParentNode;
    expect(view.querySelector('dialog')!.open).to.equal(true);
    expect(view.querySelector('.caption')!.textContent).to.equal('Page 2');
    expect(view.querySelector('.count')!.textContent).to.equal('2 of 2');
    (view.querySelector('button.close') as HTMLElement).click();
    await box.updateComplete;
    expect(view.querySelector('dialog')!.open).to.equal(false);
  });
});
