// base.css's results list (.uvalib-result-list, issue #13) and the highlight role tokens,
// checked in an iframe that links only the built stylesheets (dist-cdn), as a host page would.
import { expect } from '@open-wc/testing';
import { emulateMedia } from '@web/test-runner-commands';
import { expectNoAxeViolations } from './helpers/axe.js';
import { wrapStyle } from './helpers/text-wrap.js';

const row = (n: number) => `<li class="uvalib-result" id="r${n}">
  <p class="uvalib-result__meta"><span class="uvalib-badge uvalib-badge--category">March ${n}, 1999</span><span>12 pages</span></p>
  <h2 class="uvalib-result__title"><a href="#m${n}" id="t${n}">Meeting of the board, number ${n}</a></h2>
  <p class="uvalib-result__snippet" id="s${n}">The board discussed the <mark id="mark${n}">library</mark> budget and the new reading room.</p>
  <div class="uvalib-result__actions" id="a${n}">
    <a class="uvalib-button uvalib-button--secondary uvalib-button--small" href="#pdf${n}">PDF<span class="visually-hidden"> of meeting ${n}</span></a>
    <button class="uvalib-button uvalib-button--subtle uvalib-button--small" type="button">Save<span class="visually-hidden"> meeting ${n}</span></button>
  </div>
</li>`;

const SAMPLE = (rows = 3) => `<main><h1>Results</h1>
  <ul class="uvalib-result-list" id="list">${Array.from({ length: rows }, (_, i) => row(i + 1)).join('')}</ul>
  <p id="after">After.</p></main>`;

async function frame(
  { dark = false, width = 900, tokens = true } = {},
  body = SAMPLE(),
): Promise<HTMLIFrameElement> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `width: ${width}px; height: 900px; border: 0`;
  const cdn = `${location.origin}/dist-cdn/`;
  iframe.srcdoc = `<!doctype html><html lang="en" ${dark ? 'data-uva-color-scheme="dark"' : ''}>
    <head><title>Results list</title>
    <style>.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}</style>
    ${tokens ? `<link rel="stylesheet" href="${cdn}tokens.css" />` : ''}
    <link rel="stylesheet" href="${cdn}base.css" /></head>
    <body>${body}</body></html>`;
  document.body.append(iframe);
  await new Promise((r) => iframe.addEventListener('load', r, { once: true }));
  iframe.contentDocument!.addEventListener('click', (e) => e.preventDefault(), true);
  return iframe;
}

const channels = (c: string) => c.match(/[\d.]+/g)!.map(Number);
const lum = (c: string) => {
  const [r, g, b] = channels(c)
    .slice(0, 3)
    .map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

describe('base.css .uvalib-result-list', function () {
  this.timeout(10000);
  let iframe: HTMLIFrameElement;
  let doc: Document;
  let win: Window;
  const $ = (id: string) => doc.getElementById(id)!;
  const cs = (id: string) => win.getComputedStyle($(id));
  const rect = (id: string) => $(id).getBoundingClientRect();
  const open = async (opts?: Parameters<typeof frame>[0], body?: string) => {
    iframe = await frame(opts, body);
    doc = iframe.contentDocument!;
    win = iframe.contentWindow!;
  };

  afterEach(async () => {
    iframe?.remove();
    await emulateMedia({ forcedColors: 'none', colorScheme: 'light' });
  });

  for (const [dark, tokens] of [
    [false, true],
    [true, true],
    [false, false],
    [true, false],
  ] as const) {
    describe(`${dark ? 'dark' : 'light'}${tokens ? '' : ', base.css alone'}`, () => {
      beforeEach(() => open({ dark, tokens }));

      it('a highlighted term is bold and at least AA (here AAA) on its highlight', () => {
        const m = cs('mark1');
        expect(contrast(m.color, m.backgroundColor)).to.be.at.least(7);
        expect(m.fontWeight).to.equal('700');
        expect(m.backgroundColor).to.equal(dark ? 'rgb(133, 66, 0)' : 'rgb(255, 201, 153)');
      });

      it('title, meta and snippet text pass AA on the page', () => {
        const bg = win.getComputedStyle(doc.body).backgroundColor;
        const surface = bg === 'rgba(0, 0, 0, 0)' ? 'rgb(255, 255, 255)' : bg;
        for (const el of [
          $('t1'),
          doc.querySelector('#r1 .uvalib-result__meta span:last-child')!,
          $('s1'),
        ])
          expect(contrast(win.getComputedStyle(el).color, surface)).to.be.at.least(4.5);
      });

      it('has no axe violations', async () => {
        await expectNoAxeViolations(doc.documentElement);
      });
    });
  }

  it('is a plain list: no bullets, one link per row plus named actions', async () => {
    await open();
    expect(cs('list').listStyleType).to.equal('none');
    expect($('list').localName).to.equal('ul');
    for (const li of doc.querySelectorAll('.uvalib-result')) {
      expect(li.querySelectorAll('.uvalib-result__title a').length).to.equal(1);
      for (const b of li.querySelectorAll('.uvalib-result__actions > *'))
        expect(b.textContent!.trim().split(/\s+/).length).to.be.greaterThan(1);
    }
    // The title link is only as wide as its text.
    expect(rect('t1').width).to.be.below(rect('r1').width / 2);
  });

  it('wide: the actions sit at the end of the row, beside the title', async () => {
    await open();
    const a = rect('a1');
    const li = rect('r1');
    expect(a.right).to.be.closeTo(li.right - parseFloat(cs('r1').paddingRight), 1);
    expect(a.left).to.be.greaterThan(rect('s1').right - 1);
    expect(a.top).to.be.below(rect('t1').bottom);
  });

  it('phones: the actions wrap below the text, and nothing scrolls sideways at 320px', async () => {
    await open({ width: 320 });
    expect(rect('a1').top).to.be.at.least(rect('s1').bottom);
    expect(rect('a1').left).to.be.closeTo(rect('s1').left, 1);
    for (const id of ['r1', 'a1', 's1', 't1']) expect(rect(id).right, id).to.be.at.most(320);
    expect(doc.documentElement.scrollWidth).to.be.at.most(320);
  });

  it('follows its own width: in a 250px sidebar of a wide page the actions wrap below', async () => {
    await open(
      { width: 1200 },
      `<main><h1>Results</h1><div style="display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 1rem">
        <aside><ul class="uvalib-result-list" id="list">${row(1)}</ul></aside>
        <ul class="uvalib-result-list" id="wide">${row(2)}</ul>
      </div></main>`,
    );
    expect(cs('list').containerType).to.equal('inline-size');
    expect(cs('list').containerName).to.equal('uvalib-result-list');
    expect(rect('list').width).to.be.closeTo(250, 1);
    expect(rect('a1').top).to.be.at.least(rect('s1').bottom);
    expect(rect('a1').left).to.be.closeTo(rect('s1').left, 1);
    expect(rect('a1').right).to.be.at.most(rect('list').right);
    // The wide list beside it, in the same page, keeps its actions at the end.
    expect(rect('a2').left).to.be.greaterThan(rect('s2').right - 1);
    // The rows still skip rendering off screen inside the container.
    expect(cs('r1').contentVisibility).to.equal('auto');
  });

  it('follows its own width: a list wider than a narrow page keeps its actions at the end', async () => {
    await open(
      { width: 400 },
      `<main><h1>Results</h1><div style="overflow-x: auto" tabindex="0" role="region" aria-label="Results">
        <ul class="uvalib-result-list" id="list" style="width: 800px">${row(1)}</ul>
      </div></main>`,
    );
    expect(rect('a1').left).to.be.greaterThan(rect('s1').right - 1);
    expect(rect('a1').top).to.be.below(rect('t1').bottom);
  });

  it('a heading title is balanced and the snippet wraps pretty; a title that is the link is not balanced', async () => {
    await open(
      {},
      `<main><h1>Results</h1><ul class="uvalib-result-list">${row(1)}
        <li class="uvalib-result"><a class="uvalib-result__title" id="ta" href="#a">A title that is the link</a></li>
      </ul></main>`,
    );
    const heading = doc.querySelector('#r1 .uvalib-result__title')!;
    const balance = wrapStyle(heading, 'balance');
    if (balance !== null) {
      expect(balance).to.equal('balance');
      expect(wrapStyle($('ta'), 'balance')).to.not.equal('balance');
    }
    const pretty = wrapStyle($('s1'), 'pretty');
    if (pretty !== null) expect(pretty).to.equal('pretty');
  });

  it('rows skip rendering off screen (content-visibility) with a steady placeholder size', async () => {
    await open();
    expect(cs('r1').contentVisibility).to.equal('auto');
    expect(cs('r1').containIntrinsicBlockSize).to.match(/^auto /);
    // Room for the 3px + 2px focus ring inside the row's paint containment.
    expect(parseFloat(cs('r1').paddingLeft)).to.be.at.least(5);
    expect(parseFloat(cs('r1').paddingRight)).to.be.at.least(5);
  });

  it('renders thousands of rows: off-screen rows stay in the DOM, reachable and findable', async () => {
    await open({}, SAMPLE(2000));
    const last = $('r2000');
    expect(last.getBoundingClientRect().height).to.be.greaterThan(50);
    // Still in the accessibility tree's inputs: focusable and with its text.
    $('t2000').focus();
    expect(doc.activeElement === $('t2000')).to.equal(true);
    expect($('s2000').textContent).to.contain('library');
    // Find-in-page reaches a skipped row (window.find is the scriptable stand-in).
    win.scrollTo(0, 0);
    const found = (win as Window & { find?: (s: string) => boolean }).find?.('number 1999');
    if (found !== undefined) expect(found).to.equal(true);
  });

  it('forced colors: the highlight is drawn in system Highlight colours, still bold', async () => {
    await emulateMedia({ forcedColors: 'active' });
    await open();
    const m = cs('mark1');
    expect(m.fontWeight).to.equal('700');
    expect(m.backgroundColor).to.not.equal(win.getComputedStyle(doc.body).backgroundColor);
    expect(contrast(m.color, m.backgroundColor)).to.be.at.least(4.5);
    await expectNoAxeViolations(doc.documentElement);
  });

  it('a mark outside a snippet is left to the page', async () => {
    await open({}, '<main><h1>T</h1><p><mark id="m">plain</mark></p></main>');
    expect(cs('m').fontWeight).to.not.equal('700');
  });
});
