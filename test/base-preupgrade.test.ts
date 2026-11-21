import { expect } from '@open-wc/testing';

/**
 * base.css linked in <head>, before <site-page> is defined: the element is its own formatting
 * context (a heading's top margin cannot collapse through to <body> and move it when the
 * element upgrades), it stays invisible, and it shows after two seconds if the script never
 * loads. Checked in an iframe that links only the built stylesheet, so <site-page> stays
 * undefined until the test defines it.
 */
async function frame(): Promise<HTMLIFrameElement> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width: 400px; height: 400px';
  iframe.srcdoc = `<!doctype html><html><head>
    <link rel="stylesheet" href="${location.origin}/dist-cdn/base.css" />
    </head><body><site-page><h1 id="h">Content</h1></site-page></body></html>`;
  document.body.append(iframe);
  await new Promise((r) => iframe.addEventListener('load', r, { once: true }));
  return iframe;
}

/**
 * Resolves with the element's visibility once it is 'visible', or after `ms` with what it is
 * then. base.css reveals the content with a 2s CSS animation, which lands late when the whole
 * suite runs in parallel, so the tests poll for it rather than sleep a fixed time.
 */
async function visibilityAfter(win: Window, el: Element, ms = 5000): Promise<string> {
  const end = performance.now() + ms;
  let v = win.getComputedStyle(el).visibility;
  while (v !== 'visible' && performance.now() < end) {
    await new Promise((r) => setTimeout(r, 100));
    v = win.getComputedStyle(el).visibility;
  }
  return v;
}

describe('base.css before <site-page> is defined', function () {
  this.timeout(10000);

  it('keeps the heading margin inside, stays invisible, and shows after two seconds', async () => {
    const iframe = await frame();
    try {
      const doc = iframe.contentDocument!;
      const win = iframe.contentWindow!;
      expect(win.customElements.get('site-page')).to.equal(undefined);
      const el = doc.querySelector('site-page')!;
      expect(win.getComputedStyle(el).display).to.equal('flow-root');
      // The heading's margin stays inside <site-page>: <body> starts at the very top.
      expect(doc.body.getBoundingClientRect().top).to.equal(0);
      expect(win.getComputedStyle(doc.getElementById('h')!).visibility).to.equal('hidden');
      // Still hidden well before the two seconds are up, then shown.
      await new Promise((r) => setTimeout(r, 1000));
      expect(win.getComputedStyle(doc.getElementById('h')!).visibility).to.equal('hidden');
      expect(await visibilityAfter(win, doc.getElementById('h')!)).to.equal('visible');
    } finally {
      iframe.remove();
    }
  });

  it('shows the element as soon as it is defined', async () => {
    const iframe = await frame();
    try {
      const w = iframe.contentWindow as unknown as typeof window;
      w.customElements.define('site-page', class extends w.HTMLElement {});
      const h = iframe.contentDocument!.getElementById('h')!;
      expect(w.getComputedStyle(h).visibility).to.equal('visible');
    } finally {
      iframe.remove();
    }
  });
});

/**
 * base.css before <uvalib-chip-group> is defined: invisible, as tall as the upgraded row (so
 * nothing below it moves), and shown after two seconds if the script never loads.
 */
describe('base.css before <uvalib-chip-group> is defined', function () {
  this.timeout(12000);
  const chips =
    '<button value="">All Years</button><button value="2004">2004</button><button value="2005">2005</button>';
  const rows = [
    `<uvalib-chip-group id="wrap" label="Year">${chips}</uvalib-chip-group>`,
    `<uvalib-chip-group id="seg" label="Sort" segmented>${chips}</uvalib-chip-group>`,
    `<uvalib-chip-group id="multi" label="Category" mode="multi">${chips}</uvalib-chip-group>`,
    `<uvalib-chip-group id="links" label="Try" mode="links"><a href="#a">snow</a><a href="#b">Lawn</a></uvalib-chip-group>`,
    `<uvalib-chip-group id="scroll" label="Year" scroll>${chips.repeat(6)}</uvalib-chip-group>`,
  ];

  async function chipFrame(): Promise<HTMLIFrameElement> {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width: 400px; height: 600px';
    iframe.srcdoc = `<!doctype html><html lang="en"><head>
      <link rel="stylesheet" href="${location.origin}/dist-cdn/base.css" />
      </head><body>${rows.join('')}<p id="after">After</p></body></html>`;
    document.body.append(iframe);
    await new Promise((r) => iframe.addEventListener('load', r, { once: true }));
    return iframe;
  }

  it('is hidden, keeps each row its upgraded height, and shows after two seconds', async () => {
    const iframe = await chipFrame();
    try {
      const doc = iframe.contentDocument!;
      const win = iframe.contentWindow!;
      const ids = ['wrap', 'seg', 'multi', 'links', 'scroll'];
      const heights = () => ids.map((id) => doc.getElementById(id)!.getBoundingClientRect().height);
      const after = () => doc.getElementById('after')!.getBoundingClientRect().top;
      expect(win.getComputedStyle(doc.getElementById('wrap')!).visibility).to.equal('hidden');
      const before = heights();
      const top = after();
      const script = doc.createElement('script');
      script.type = 'module';
      script.src = `${location.origin}/dist-cdn/uvalib-chip-group.js`;
      doc.head.append(script);
      await new Promise((r) => script.addEventListener('load', r, { once: true }));
      await Promise.all(
        ids.map(
          (id) =>
            (doc.getElementById(id) as unknown as { updateComplete: Promise<unknown> })
              .updateComplete,
        ),
      );
      await new Promise((r) => setTimeout(r, 50));
      expect(heights().map(Math.round)).to.deep.equal(before.map(Math.round));
      expect(Math.round(after())).to.equal(Math.round(top));
      expect(win.getComputedStyle(doc.getElementById('wrap')!).visibility).to.equal('visible');
    } finally {
      iframe.remove();
    }
  });

  it('shows the raw children after two seconds when the script never loads', async () => {
    const iframe = await chipFrame();
    try {
      const doc = iframe.contentDocument!;
      const win = iframe.contentWindow!;
      await new Promise((r) => setTimeout(r, 1000));
      expect(win.getComputedStyle(doc.querySelector('#links a')!).visibility).to.equal('hidden');
      expect(await visibilityAfter(win, doc.querySelector('#links a')!)).to.equal('visible');
    } finally {
      iframe.remove();
    }
  });
});

/**
 * base.css before <uvalib-combobox> is defined: the label (from the attribute) and the field's
 * height are held, so nothing below moves when it upgrades; a fallback <input list> child is a
 * working field meanwhile, and the options are out of sight.
 */
describe('base.css before <uvalib-combobox> is defined', function () {
  this.timeout(12000);
  const rows = [
    `<uvalib-combobox id="plain" label="Person"><option>Ada</option><option>Bruno</option></uvalib-combobox>`,
    `<uvalib-combobox id="hint" label="Person" description="Type a name."></uvalib-combobox>`,
    `<uvalib-combobox id="fallback" label="Place"><input name="place" list="pl" aria-label="Place"><datalist id="pl"><option>Rotunda</option></datalist></uvalib-combobox>`,
  ];

  it('holds the label and field, keeps a fallback input usable, and nothing moves on upgrade', async () => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width: 400px; height: 600px';
    iframe.srcdoc = `<!doctype html><html lang="en"><head>
      <link rel="stylesheet" href="${location.origin}/dist-cdn/base.css" />
      </head><body>${rows.join('')}<p id="after">After</p></body></html>`;
    document.body.append(iframe);
    await new Promise((r) => iframe.addEventListener('load', r, { once: true }));
    try {
      const doc = iframe.contentDocument!;
      const win = iframe.contentWindow!;
      const ids = ['plain', 'hint', 'fallback'];
      const heights = () => ids.map((id) => doc.getElementById(id)!.getBoundingClientRect().height);
      const after = () => doc.getElementById('after')!.getBoundingClientRect().top;
      expect(win.getComputedStyle(doc.getElementById('plain')!, '::before').content).to.equal(
        '"Person"',
      );
      expect(doc.querySelector('#plain option')!.getClientRects().length).to.equal(0);
      const fallback = doc.querySelector<HTMLInputElement>('#fallback input')!;
      expect(fallback.getBoundingClientRect().height).to.be.at.least(44);
      expect(win.getComputedStyle(fallback).visibility).to.equal('visible');
      const before = heights();
      const top = after();
      const script = doc.createElement('script');
      script.type = 'module';
      script.src = `${location.origin}/dist-cdn/uvalib-combobox.js`;
      doc.head.append(script);
      await new Promise((r) => script.addEventListener('load', r, { once: true }));
      await Promise.all(
        ids.map(
          (id) =>
            (doc.getElementById(id) as unknown as { updateComplete: Promise<unknown> })
              .updateComplete,
        ),
      );
      await new Promise((r) => setTimeout(r, 50));
      expect(heights().map(Math.round)).to.deep.equal(before.map(Math.round));
      expect(Math.round(after())).to.equal(Math.round(top));
      expect(fallback.disabled).to.equal(true);
    } finally {
      iframe.remove();
    }
  });
});

/**
 * base.css before <uvalib-image-regions> is defined: the image at its own width and the list
 * beside it, the layout the element keeps, so the image does not move when it upgrades.
 */
describe('base.css before <uvalib-image-regions> is defined', function () {
  this.timeout(12000);

  it('lays the image and list out as the upgraded element does', async () => {
    const c = document.createElement('canvas');
    c.width = 400;
    c.height = 300;
    const src = c.toDataURL('image/png');
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width: 800px; height: 600px';
    iframe.srcdoc = `<!doctype html><html lang="en"><head>
      <link rel="stylesheet" href="${location.origin}/dist-cdn/base.css" />
      </head><body><uvalib-image-regions id="r" label="People">
        <img src="${src}" alt="A group" width="400" height="300">
        <ol><li data-xywh="percent:10,10,20,20"><a href="#a">Person 1</a></li></ol>
      </uvalib-image-regions></body></html>`;
    document.body.append(iframe);
    await new Promise((r) => iframe.addEventListener('load', r, { once: true }));
    try {
      const doc = iframe.contentDocument!;
      const box = (sel: string) => {
        const b = doc.querySelector(sel)!.getBoundingClientRect();
        return [b.left, b.top, b.width, b.height].map(Math.round);
      };
      const img = box('img');
      const listLeft = box('ol')[0];
      expect(img[2]).to.equal(400);
      expect(listLeft).to.be.at.least(400);
      const script = doc.createElement('script');
      script.type = 'module';
      script.src = `${location.origin}/dist-cdn/uvalib-image-regions.js`;
      doc.head.append(script);
      await new Promise((r) => script.addEventListener('load', r, { once: true }));
      await (doc.getElementById('r') as unknown as { updateComplete: Promise<unknown> })
        .updateComplete;
      await new Promise((r) => setTimeout(r, 50));
      expect(box('img')).to.deep.equal(img);
      expect(box('ol')[0]).to.equal(listLeft);
    } finally {
      iframe.remove();
    }
  });
});
