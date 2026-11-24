// base.css's data tables (.uvalib-table and its modifiers, the scroll wrapper and the stack
// variant), checked in an iframe that links only the built stylesheets (dist-cdn), as a host
// page would.
import { expect } from '@open-wc/testing';
import { emulateMedia } from '@web/test-runner-commands';
import { expectNoAxeViolations } from './helpers/axe.js';

const BARCODE = '35000101234567890123456789';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SAMPLE = `
  <main>
    <h1>Holdings</h1>
    <h2>Law Library</h2>
    <table class="uvalib-table" id="holdings">
      <caption id="holdings-caption">Law Library holdings</caption>
      <thead>
        <tr><th scope="col" id="h-loc">Location</th><th scope="col">Call number</th><th scope="col">Barcode</th></tr>
      </thead>
      <tbody>
        <tr><td id="first">Law Library Stacks, Lower Level</td><td id="middle">KF4550 .A2 1787a</td><td id="barcode">${BARCODE}</td></tr>
        <tr><td>Reference</td><td>KF4550 .A2 1787b</td><td>X004812346</td></tr>
      </tbody>
    </table>
    <table class="uvalib-table uvalib-table--striped" id="striped">
      <caption>Study rooms this week</caption>
      <thead>
        <tr><th scope="col">Day</th><th scope="col" class="uvalib-table__num" id="num-head">Rooms free</th></tr>
      </thead>
      <tbody>
        <tr id="odd"><th scope="row">Monday</th><td class="uvalib-table__num" id="num-1">12</td></tr>
        <tr id="even"><th scope="row" id="even-th">Tuesday</th><td class="uvalib-table__num" id="num-2">1,407</td></tr>
        <tr><th scope="row">Wednesday</th><td class="uvalib-table__num">7</td></tr>
      </tbody>
    </table>
    <table class="uvalib-table uvalib-table--compact" id="compact">
      <caption>Compact</caption>
      <tbody><tr><td id="compact-first">A</td><td id="compact-second">B</td></tr></tbody>
    </table>
    <div class="uvalib-table-scroll" role="region" tabindex="0" aria-labelledby="wide-caption" id="scroll">
      <table class="uvalib-table" id="wide">
        <caption id="wide-caption">Items borrowed per month</caption>
        <thead><tr><th scope="col">Library</th>${MONTHS.map((m) => `<th scope="col" class="uvalib-table__num">${m}</th>`).join('')}</tr></thead>
        <tbody>
          <tr><th scope="row">Albert and Shirley Small Special Collections Library</th>${MONTHS.map((_, i) => `<td class="uvalib-table__num">${(12345 + i).toLocaleString('en-US')}</td>`).join('')}</tr>
        </tbody>
      </table>
    </div>
    <div class="uvalib-table-stack" id="stack-wrap">
      <table class="uvalib-table uvalib-table--stack" role="table" id="stack">
        <caption>Clemons Library holdings</caption>
        <thead role="rowgroup">
          <tr role="row"><th scope="col" role="columnheader">Location</th><th scope="col" role="columnheader">Call number</th><th scope="col" role="columnheader">Barcode</th></tr>
        </thead>
        <tbody role="rowgroup">
          <tr role="row" id="stack-row"><td role="cell" data-label="Location" id="stack-loc">Stacks</td><td role="cell" data-label="Call number" id="stack-call">PS3545 .O337 Z5 2004</td><td role="cell" data-label="Barcode" id="stack-bar">X004812345</td></tr>
          <tr role="row" id="stack-row-2"><td role="cell" data-label="Location">Course reserve</td><td role="cell" data-label="Call number">PS3545 .O337 Z5 2004 c.2</td><td role="cell" data-label="Barcode">X004812346</td></tr>
        </tbody>
      </table>
    </div>
  </main>`;

async function frame(
  {
    dark = false,
    width = 800,
    tokens = true,
  }: { dark?: boolean; width?: number; tokens?: boolean } = {},
  body = SAMPLE,
): Promise<HTMLIFrameElement> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `width: ${width}px; height: 900px; border: 0`;
  const cdn = `${location.origin}/dist-cdn/`;
  iframe.srcdoc = `<!doctype html><html lang="en" ${dark ? 'data-uva-color-scheme="dark"' : ''}>
    <head><title>Tables</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${tokens ? `<link rel="stylesheet" href="${cdn}tokens.css" />` : ''}
    <link rel="stylesheet" href="${cdn}base.css" /></head>
    <body>${body}</body></html>`;
  document.body.append(iframe);
  await new Promise((r) => iframe.addEventListener('load', r, { once: true }));
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

describe('base.css tables', function () {
  this.timeout(8000);
  let iframe: HTMLIFrameElement;
  let doc: Document;
  let win: Window;
  const $ = (id: string) => doc.getElementById(id)!;
  const cs = (id: string, pseudo?: string) => win.getComputedStyle($(id), pseudo);
  const open = async (
    opts?: { dark?: boolean; width?: number; tokens?: boolean },
    body?: string,
  ) => {
    iframe = await frame(opts, body);
    doc = iframe.contentDocument!;
    win = iframe.contentWindow!;
  };

  afterEach(async () => {
    iframe?.remove();
    await emulateMedia({ forcedColors: 'none', colorScheme: 'light', media: 'screen' });
  });

  it('fills the width with collapsed borders and a bold caption line at the start', async () => {
    await open();
    const t = cs('holdings');
    expect(t.borderCollapse).to.equal('collapse');
    expect($('holdings').getBoundingClientRect().width).to.be.closeTo(
      doc.querySelector('main')!.getBoundingClientRect().width,
      1,
    );
    const cap = cs('holdings-caption');
    expect([cap.fontWeight, cap.textAlign, cap.captionSide]).to.deep.equal(['700', 'start', 'top']);
    expect(parseFloat(cap.fontSize)).to.be.closeTo(17 * 1.125, 0.1);
    expect(cs('h-loc').fontWeight).to.equal('700');
    expect(cs('h-loc').textAlign).to.equal('start');
  });

  it('pads cells as the library site (8px, the first column 16px), top-aligned, with row rules', async () => {
    await open();
    const first = cs('first');
    const middle = cs('middle');
    expect([middle.paddingTop, middle.paddingLeft, middle.paddingRight]).to.deep.equal([
      '8.5px',
      '8.5px',
      '8.5px',
    ]);
    expect(first.paddingLeft).to.equal('17px');
    expect(middle.verticalAlign).to.equal('top');
    expect(middle.overflowWrap).to.equal('anywhere');
    expect([middle.borderBottomWidth, middle.borderBottomStyle]).to.deep.equal(['1px', 'solid']);
    expect(middle.borderBottomColor).to.equal('rgb(218, 218, 218)');
    expect(middle.borderLeftStyle).to.equal('none');
    expect(cs('h-loc').borderBottomWidth).to.equal('2px');
  });

  it('compact cells are denser', async () => {
    await open();
    expect([cs('compact-second').paddingTop, cs('compact-second').paddingLeft]).to.deep.equal([
      '4.25px',
      '8.5px',
    ]);
    expect(cs('compact-first').paddingLeft).to.equal('8.5px');
  });

  it('numbers are right-aligned with tabular digits', async () => {
    await open();
    for (const id of ['num-head', 'num-1', 'num-2']) {
      expect(cs(id).textAlign, id).to.equal('end');
      expect(cs(id).fontVariantNumeric, id).to.equal('tabular-nums');
    }
    const a = $('num-1').getBoundingClientRect();
    const b = $('num-2').getBoundingClientRect();
    expect(a.right).to.be.closeTo(b.right, 0.5);
    const text = (id: string) => {
      const r = doc.createRange();
      r.selectNodeContents($(id));
      return r.getBoundingClientRect().right;
    };
    expect(text('num-1')).to.be.closeTo(text('num-2'), 0.5);
  });

  for (const [dark, tokens] of [
    [false, true],
    [true, true],
    [false, false],
    [true, false],
  ] as const) {
    describe(`${dark ? 'dark' : 'light'}${tokens ? '' : ', base.css alone'}`, () => {
      beforeEach(() => open({ dark, tokens }));

      it('stripes even rows, and text on a stripe is AAA', () => {
        const odd = cs('odd').backgroundColor;
        const even = cs('even').backgroundColor;
        expect(even).to.not.equal(odd);
        expect(even).to.equal(dark ? 'rgb(26, 35, 64)' : 'rgb(241, 241, 241)');
        const ratio = contrast(cs('even-th').color, even);
        expect(ratio).to.be.at.least(7);
        // The body surface (transparent without dark mode) behind the odd rows.
        const surface = win.getComputedStyle(doc.body).backgroundColor;
        const bg = surface === 'rgba(0, 0, 0, 0)' ? 'rgb(255, 255, 255)' : surface;
        expect(contrast(cs('first').color, bg)).to.be.at.least(7);
      });

      it('has no axe violations', async () => {
        await expectNoAxeViolations(doc.documentElement);
      });
    });
  }

  it('dark mode: the row rules follow the role token', async () => {
    await open({ dark: true });
    expect(cs('middle').borderBottomColor).to.equal('rgb(79, 90, 122)');
  });

  it('at 320px a long barcode wraps inside its cell and nothing overflows', async () => {
    await open({ width: 320 });
    const table = $('holdings').getBoundingClientRect();
    const cell = $('barcode').getBoundingClientRect();
    expect(table.right).to.be.at.most(320);
    expect(cell.right).to.be.at.most(table.right + 0.5);
    expect(cell.height).to.be.greaterThan(40); // more than one line
    expect(doc.documentElement.scrollWidth).to.equal(win.innerWidth);
  });

  it('the scroll wrapper scrolls inside itself, is focusable, named and has a visible ring', async () => {
    await open({ width: 320 });
    const s = $('scroll');
    expect(cs('scroll').overflowX).to.equal('auto');
    expect(s.scrollWidth).to.be.greaterThan(s.clientWidth);
    expect(doc.documentElement.scrollWidth).to.equal(win.innerWidth);
    expect(s.tabIndex).to.equal(0);
    expect(s.getAttribute('role')).to.equal('region');
    expect(doc.getElementById(s.getAttribute('aria-labelledby')!)!.textContent).to.equal(
      'Items borrowed per month',
    );
    // A keyboard user scrolls it: Tab focus shows the ring (focus-visible after a key press).
    s.focus({ focusVisible: true } as FocusOptions);
    expect(doc.activeElement?.id).to.equal('scroll');
    const ring = cs('scroll');
    expect(s.matches(':focus-visible')).to.equal(true);
    expect(ring.outlineStyle).to.equal('solid');
    expect(ring.outlineWidth).to.equal('3px');
    expect(ring.outlineColor).to.equal('rgb(229, 114, 0)');
    s.scrollLeft = 100;
    expect(s.scrollLeft).to.be.greaterThan(0);
    // Inside the scroller, words keep their width (the table scrolls rather than squeezes).
    expect(win.getComputedStyle(s.querySelector('td')!).overflowWrap).to.equal('break-word');
  });

  it('stack: wide wrapper keeps the table layout', async () => {
    await open({ width: 800 });
    expect(cs('stack-row').display).to.equal('table-row');
    expect(cs('stack-loc', '::before').content).to.equal('none');
  });

  it('stack: a narrow wrapper stacks each row and labels each cell from data-label', async () => {
    await open({ width: 360 });
    expect(cs('stack').display).to.equal('block');
    expect(cs('stack-row').display).to.equal('block');
    expect(cs('stack-loc').display).to.equal('block');
    const loc = $('stack-loc').getBoundingClientRect();
    const call = $('stack-call').getBoundingClientRect();
    expect(call.top).to.be.at.least(loc.bottom - 0.5); // one cell per line
    expect(Math.abs(call.left - loc.left)).to.be.below(1);
    const before = cs('stack-loc', '::before');
    expect(before.content).to.include('Location');
    expect(before.fontWeight).to.equal('700');
    expect(before.display).to.equal('block');
    // The column headers are visually hidden but stay in the tree.
    const thead = $('stack').querySelector('thead')!;
    expect(thead.getBoundingClientRect().height).to.be.at.most(1);
    expect(win.getComputedStyle(thead).display).to.not.equal('none');
    // Rows are separated by the rule.
    expect(cs('stack-row').borderBottomStyle).to.equal('solid');
    expect(doc.documentElement.scrollWidth).to.equal(win.innerWidth);
    // Explicit roles, as the README asks, keep the semantics where display drops them.
    expect($('stack').getAttribute('role')).to.equal('table');
    expect($('stack-loc').getAttribute('role')).to.equal('cell');
    await expectNoAxeViolations(doc.documentElement);
  });

  it('stack: follows the wrapper width, not the viewport', async () => {
    await open(
      { width: 800 },
      SAMPLE.replace('id="stack-wrap"', 'id="stack-wrap" style="width: 300px"'),
    );
    expect(cs('stack-row').display).to.equal('block');
  });

  it('forced colors: the row rules are drawn', async () => {
    await emulateMedia({ forcedColors: 'active' });
    await open();
    const s = cs('middle');
    expect(s.borderBottomStyle).to.equal('solid');
    expect(s.borderBottomColor).to.equal(cs('first').color);
  });

  it('print: black rules, no stripes, the wide table not clipped', async () => {
    await emulateMedia({ media: 'print' });
    await open();
    expect(cs('middle').borderBottomColor).to.equal('rgb(0, 0, 0)');
    expect(cs('even').backgroundColor).to.equal('rgba(0, 0, 0, 0)');
    expect(cs('scroll').overflowX).to.equal('visible');
  });

  it('hidden hides the wrappers, a table and a stacked row', async () => {
    await open(
      { width: 360 },
      SAMPLE.replace('id="scroll"', 'id="scroll" hidden')
        .replace('id="stack-row-2"', 'id="stack-row-2" hidden')
        .replace('id="holdings"', 'id="holdings" hidden'),
    );
    for (const id of ['scroll', 'stack-row-2', 'holdings'])
      expect(cs(id).display, id).to.equal('none');
    expect(cs('stack-row').display).to.equal('block');
    await open(
      { width: 360 },
      SAMPLE.replace('id="stack-wrap"', 'id="stack-wrap" hidden').replace(
        'id="stack"',
        'id="stack" hidden',
      ),
    );
    expect(cs('stack-wrap').display).to.equal('none');
    expect(cs('stack').display).to.equal('none');
  });
});
