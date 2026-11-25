// base.css's sidebar layout (.uvalib-sidebar-layout), checked in an iframe that links only the
// built stylesheets (dist-cdn), as a host page would. Widths are the layout's own (a container
// query), so each test sets the iframe width with the body margin at 0.
import { expect } from '@open-wc/testing';
import { emulateMedia } from '@web/test-runner-commands';
import { expectNoAxeViolations } from './helpers/axe.js';

const CDN = `${location.origin}/dist-cdn/`;
const REM = 17; // base.css's root size
const LONG = 'Pneumonoultramicroscopicsilicovolcanoconiosis'.repeat(3);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SIDEBAR = `<nav class="uvalib-sidebar-layout__sidebar" id="side" aria-label="Contents">
  <h2>Contents</h2>
  <ol><li><a href="#one">Part one</a></li><li><a href="#two">Part two</a></li></ol>
</nav>`;
const MAIN = `<div class="uvalib-sidebar-layout__main" id="main">
  <h2 id="one">Part one</h2>
  <p id="long">${LONG}</p>
  <div class="uvalib-table-scroll" role="region" tabindex="0" aria-labelledby="cap" id="scroll">
    <table class="uvalib-table">
      <caption id="cap">Items borrowed per month</caption>
      <thead><tr><th scope="col">Library</th>${MONTHS.map((m) => `<th scope="col">${m}</th>`).join('')}</tr></thead>
      <tbody><tr><th scope="row">Clemons</th>${MONTHS.map(() => '<td>12,345,678</td>').join('')}</tr></tbody>
    </table>
  </div>
  <h2 id="two">Part two</h2>
  <p>${'Reading text. '.repeat(400)}</p>
</div>`;

const page = (cls = '', order: 'start' | 'end' = 'start') =>
  `<main><h1>Reading page</h1>
    <div class="uvalib-sidebar-layout ${cls}" id="layout">
      ${order === 'start' ? SIDEBAR + MAIN : MAIN + SIDEBAR}
    </div></main>`;

async function frame(
  { width = 1000, height = 700, dark = false }: { width?: number; height?: number; dark?: boolean },
  body: string,
  head = '',
): Promise<HTMLIFrameElement> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `width: ${width}px; height: ${height}px; border: 0`;
  iframe.srcdoc = `<!doctype html><html lang="en" ${dark ? 'data-uva-color-scheme="dark"' : ''}>
    <head><title>Sidebar layout</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="${CDN}tokens.css" />
    <link rel="stylesheet" href="${CDN}base.css" />
    <style>body { margin: 0 }</style>${head}</head>
    <body>${body}</body></html>`;
  document.body.append(iframe);
  await new Promise((r) => iframe.addEventListener('load', r, { once: true }));
  return iframe;
}

describe('base.css sidebar layout', function () {
  this.timeout(12000);
  let iframe: HTMLIFrameElement | undefined;
  let doc: Document;
  let win: Window;
  const $ = (id: string) => doc.getElementById(id)!;
  const box = (id: string) => $(id).getBoundingClientRect();
  const open = async (opts: Parameters<typeof frame>[0], body = page(), head = '') => {
    iframe = await frame(opts, body, head);
    doc = iframe.contentDocument!;
    win = iframe.contentWindow!;
  };

  afterEach(async () => {
    iframe?.remove();
    iframe = undefined;
    await emulateMedia({ forcedColors: 'none', colorScheme: 'light', media: 'screen' });
  });

  it('side by side when wide: a quarter-width sidebar, a 3.5rem gap, the main content beside it', async () => {
    await open({ width: 1000 });
    const side = box('side');
    const main = box('main');
    expect(side.left).to.equal(0);
    expect(side.width).to.be.closeTo(250, 0.5); // 25% of 1000px, inside clamp(14rem, 25%, 20rem)
    expect(main.left - side.right).to.be.closeTo(3.5 * REM, 0.5);
    expect(main.right).to.be.closeTo(1000, 0.5);
    expect(main.top).to.equal(side.top);
  });

  it('clamps the sidebar between 14rem and 20rem', async () => {
    await open({ width: 920 });
    expect(box('side').width).to.be.closeTo(14 * REM, 0.5);
    iframe!.style.width = '1600px';
    await new Promise((r) => requestAnimationFrame(r));
    expect(box('side').width).to.be.closeTo(20 * REM, 0.5);
  });

  it('goes side by side at 913px of its own width (the theme’s 993px less site-page’s gutters)', async () => {
    await open({ width: 913 });
    expect(box('main').top).to.equal(box('side').top);
    iframe!.style.width = '912px';
    await new Promise((r) => requestAnimationFrame(r));
    expect(box('main').top).to.be.greaterThan(box('side').bottom);
  });

  it('stacks when narrow: full width, in source order, 2rem apart', async () => {
    await open({ width: 800 });
    const side = box('side');
    const main = box('main');
    expect([side.width, main.width]).to.deep.equal([800, 800]);
    expect(main.top - side.bottom).to.be.closeTo(2 * REM, 0.5);
  });

  it('reads its own width, not the viewport’s: stacks in a narrow column of a wide page', async () => {
    await open(
      { width: 1400 },
      `<main><h1>Narrow column</h1><div style="width: 600px">${page().replace(/^<main><h1>Reading page<\/h1>|<\/main>$/g, '')}</div></main>`,
    );
    expect(box('main').top).to.be.greaterThan(box('side').bottom);
    expect(box('main').width).to.equal(600);
  });

  it('a sidebar after the main content in the source is on the right, and stacks below it', async () => {
    await open({ width: 1000 }, page('', 'end'));
    expect(box('main').left).to.equal(0);
    expect(box('side').right).to.be.closeTo(1000, 0.5);
    expect(box('side').left - box('main').right).to.be.closeTo(3.5 * REM, 0.5);
    iframe!.style.width = '600px';
    await new Promise((r) => requestAnimationFrame(r));
    expect(box('side').top).to.be.greaterThan(box('main').bottom);
  });

  it('takes the width and gap from custom properties', async () => {
    await open(
      { width: 1000 },
      page(),
      '<style>#layout { --uvalib-sidebar-width: 18rem; --uvalib-sidebar-gap: 2rem }</style>',
    );
    expect(box('side').width).to.be.closeTo(18 * REM, 0.5);
    expect(box('main').left - box('side').right).to.be.closeTo(2 * REM, 0.5);
  });

  it('--sticky: the sidebar stays in view while the page scrolls, only when side by side', async () => {
    await open({ width: 1000, height: 600 }, page('uvalib-sidebar-layout--sticky'));
    const cs = win.getComputedStyle($('side'));
    expect(cs.position).to.equal('sticky');
    expect(parseFloat(cs.maxHeight)).to.be.closeTo(600 - 2 * REM, 0.5);
    win.scrollTo(0, 1500);
    await new Promise((r) => requestAnimationFrame(r));
    expect(box('side').top).to.be.closeTo(REM, 0.5);
    // Without the modifier the sidebar stretches the row's height and its list scrolls away.
    iframe!.remove();
    await open({ width: 1000, height: 600 });
    expect(win.getComputedStyle($('side')).position).to.equal('static');
    win.scrollTo(0, 1500);
    await new Promise((r) => requestAnimationFrame(r));
    expect($('side').querySelector('ol')!.getBoundingClientRect().bottom).to.be.lessThan(0);
  });

  it('--sticky: never sticky when stacked', async () => {
    await open({ width: 700, height: 600 }, page('uvalib-sidebar-layout--sticky'));
    const cs = win.getComputedStyle($('side'));
    expect(cs.position).to.equal('static');
    expect(cs.maxHeight).to.equal('none');
    win.scrollTo(0, 1500);
    await new Promise((r) => requestAnimationFrame(r));
    expect(box('side').bottom).to.be.lessThan(0);
  });

  for (const width of [320, 1000]) {
    it(`no horizontal overflow at ${width}px with a long word and a wide table in the main content`, async () => {
      await open({ width }, page('uvalib-sidebar-layout--sticky'));
      expect(doc.documentElement.scrollWidth).to.be.at.most(width);
      expect(box('long').right).to.be.at.most(box('main').right + 0.5);
      // The wide table scrolls inside its own region instead.
      const scroll = $('scroll');
      expect(scroll.scrollWidth).to.be.greaterThan(scroll.clientWidth);
      expect(box('scroll').right).to.be.at.most(box('main').right + 0.5);
    });
  }

  it('hidden hides the layout', async () => {
    await open({ width: 1000 }, page().replace('id="layout"', 'id="layout" hidden'));
    expect(win.getComputedStyle($('layout')).display).to.equal('none');
  });

  for (const dark of [false, true]) {
    it(`has no axe violations (${dark ? 'dark' : 'light'})`, async () => {
      await open({ width: 1000, dark }, page('uvalib-sidebar-layout--sticky'));
      await expectNoAxeViolations(doc.documentElement);
      iframe!.style.width = '320px';
      await new Promise((r) => requestAnimationFrame(r));
      await expectNoAxeViolations(doc.documentElement);
    });
  }

  it('forced colors: the same layout (it draws nothing of its own)', async () => {
    await emulateMedia({ forcedColors: 'active' });
    await open({ width: 1000 }, page('uvalib-sidebar-layout--sticky'));
    expect(box('main').top).to.equal(box('side').top);
    expect(box('side').width).to.be.closeTo(250, 0.5);
  });

  it('print: stacked, never stuck, and --print-hide-sidebar leaves the sidebar out', async () => {
    await open({ width: 1000 }, page('uvalib-sidebar-layout--sticky'));
    await emulateMedia({ media: 'print' });
    const cs = win.getComputedStyle($('side'));
    expect([cs.position, cs.maxHeight, cs.overflowY]).to.deep.equal(['static', 'none', 'visible']);
    expect(box('main').top).to.be.greaterThan(box('side').bottom);
    expect(box('main').width).to.equal(1000);
    $('layout').classList.add('uvalib-sidebar-layout--print-hide-sidebar');
    expect(win.getComputedStyle($('side')).display).to.equal('none');
    await emulateMedia({ media: 'screen' });
    expect(win.getComputedStyle($('side')).display).to.equal('block');
  });

  describe('with <uvalib-contents>', () => {
    const contents = (attrs: string, cls = 'uvalib-sidebar-layout__sidebar') =>
      `<uvalib-contents class="${cls}" ${attrs} id="side">
        <ol><li><a href="#one">Part one</a></li><li><a href="#two">Part two</a></li></ol>
      </uvalib-contents>`;
    const load = async () => {
      const script = doc.createElement('script');
      script.type = 'module';
      script.src = `${CDN}uvalib-contents.js`;
      doc.head.append(script);
      await new Promise((r) => script.addEventListener('load', r, { once: true }));
      await win.customElements.whenDefined('uvalib-contents');
      await (doc.getElementById('side') as HTMLElement & { updateComplete: Promise<unknown> })
        .updateComplete;
      await new Promise((r) => requestAnimationFrame(r));
    };

    it('as the sidebar of a --sticky layout: stays in view, and the main column does not move when it upgrades', async () => {
      const body = page('uvalib-sidebar-layout--sticky').replace(
        SIDEBAR,
        contents(''),
      );
      await open({ width: 1100, height: 600 }, body);
      const before = box('main');
      await load();
      const after = box('main');
      expect([after.left, after.width, after.top]).to.deep.equal([
        before.left,
        before.width,
        before.top,
      ]);
      expect($('side').hasAttribute('data-narrow')).to.equal(false);
      win.scrollTo(0, 1500);
      await new Promise((r) => requestAnimationFrame(r));
      expect(box('side').top).to.be.closeTo(REM, 0.5);
      await expectNoAxeViolations(doc.documentElement);
    });

    it('<uvalib-contents sticky> in a plain sidebar works too (use one or the other)', async () => {
      const body = page().replace(
        SIDEBAR,
        `<div class="uvalib-sidebar-layout__sidebar">${contents('sticky', '')}</div>`,
      );
      await open({ width: 1100, height: 600 }, body);
      await load();
      win.scrollTo(0, 1500);
      await new Promise((r) => requestAnimationFrame(r));
      expect(box("side").top).to.be.closeTo(REM, 0.5); // its own --uvalib-contents-sticky-top
    });
  });
});
