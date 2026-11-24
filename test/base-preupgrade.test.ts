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

/**
 * base.css before <uvalib-map> is defined: the child list is the page's list of places, under
 * the key instructions and the map's height, so the list does not move when the map is drawn.
 */
describe('base.css before <uvalib-map> is defined', function () {
  this.timeout(12000);

  it('holds the instructions and the map height above the list, and the list stays put', async () => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width: 400px; height: 900px';
    iframe.srcdoc = `<!doctype html><html lang="en"><head>
      <link rel="stylesheet" href="${location.origin}/dist-cdn/base.css" />
      <script src="${location.origin}/node_modules/leaflet/dist/leaflet.js"></script>
      </head><body><uvalib-map label="Places" id="map"><ul>
        <li><a href="#a" data-lat="38.0356" data-lng="-78.5034" data-count="4">Rotunda</a></li>
        <li><a href="#b" data-lat="38.0336" data-lng="-78.5048">Lawn</a></li>
      </ul></uvalib-map></body></html>`;
    document.body.append(iframe);
    await new Promise((r) => iframe.addEventListener('load', r, { once: true }));
    try {
      const doc = iframe.contentDocument!;
      const win = iframe.contentWindow!;
      const el = doc.getElementById('map')!;
      const { MAP_INSTRUCTIONS } = await import('../src/components/uvalib-map/UvalibMap.js');
      expect(win.getComputedStyle(el, '::before').content).to.equal(`"${MAP_INSTRUCTIONS}"`);
      const top = doc.querySelector('ul')!.getBoundingClientRect().top;
      expect(top).to.be.greaterThan(300);
      const script = doc.createElement('script');
      script.type = 'module';
      script.src = `${location.origin}/dist-cdn/uvalib-map.js`;
      doc.head.append(script);
      await new Promise((r) => script.addEventListener('load', r, { once: true }));
      await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
      await new Promise((r) => setTimeout(r, 50));
      const list = el.shadowRoot!.querySelector('ul.places')!;
      expect(el.shadowRoot!.querySelector('[role="region"]')).to.not.equal(null);
      expect(Math.round(list.getBoundingClientRect().top)).to.equal(Math.round(top));
    } finally {
      iframe.remove();
    }
  });
});

/**
 * base.css before <uvalib-filter-drawer> is defined: on a phone (at and below the default 48rem
 * breakpoint) the filters stay out of sight and the button's 44px is held, so nothing moves
 * when the element upgrades. Wide screens, a custom breakpoint and `hidden` are left alone.
 */
describe('base.css before <uvalib-filter-drawer> is defined', function () {
  this.timeout(12000);
  const filters = '<form><label>Search <input name="q"></label></form><p>Decade</p>';
  const rows = [
    `<uvalib-filter-drawer id="shadow">${filters}</uvalib-filter-drawer>`,
    `<uvalib-filter-drawer id="light" no-shadow-dom count="2">${filters}</uvalib-filter-drawer>`,
    `<uvalib-filter-drawer id="hid" hidden>${filters}</uvalib-filter-drawer>`,
    `<uvalib-filter-drawer id="custom" breakpoint="10rem">${filters}</uvalib-filter-drawer>`,
  ];

  async function drawerFrame(width: number): Promise<HTMLIFrameElement> {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `width: ${width}px; height: 600px; border: 0`;
    iframe.srcdoc = `<!doctype html><html lang="en"><head>
      <link rel="stylesheet" href="${location.origin}/dist-cdn/base.css" />
      </head><body><p>Before</p>${rows.join('')}<p id="after">After</p></body></html>`;
    document.body.append(iframe);
    await new Promise((r) => iframe.addEventListener('load', r, { once: true }));
    return iframe;
  }

  it('on a phone hides the filters, holds the 44px button, and nothing moves on upgrade', async () => {
    const iframe = await drawerFrame(375);
    try {
      const doc = iframe.contentDocument!;
      const win = iframe.contentWindow!;
      const el = (id: string) => doc.getElementById(id)!;
      expect(win.customElements.get('uvalib-filter-drawer')).to.equal(undefined);
      for (const id of ['shadow', 'light']) {
        expect(el(id).querySelector('form')!.getClientRects().length, id).to.equal(0);
        expect(el(id).getBoundingClientRect().height, id).to.equal(44);
      }
      expect(win.getComputedStyle(el('hid')).display).to.equal('none');
      // A custom breakpoint is the page's to hold: base.css leaves it as written.
      expect(el('custom').querySelector('form')!.getClientRects().length).to.be.greaterThan(0);
      const tops = () =>
        ['shadow', 'light', 'custom', 'after'].map((id) => el(id).getBoundingClientRect().top);
      const heights = () => ['shadow', 'light'].map((id) => el(id).getBoundingClientRect().height);
      const before = tops();
      const script = doc.createElement('script');
      script.type = 'module';
      script.src = `${location.origin}/dist-cdn/uvalib-filter-drawer.js`;
      doc.head.append(script);
      await new Promise((r) => script.addEventListener('load', r, { once: true }));
      await Promise.all(
        ['shadow', 'light'].map(
          (id) => (el(id) as unknown as { updateComplete: Promise<unknown> }).updateComplete,
        ),
      );
      await new Promise((r) => setTimeout(r, 50));
      // The upgraded element shows only its button, at the same height and place.
      const toggle = el('shadow').shadowRoot!.querySelector('.fd-toggle')!;
      expect(toggle.getClientRects().length).to.equal(1);
      expect(heights()).to.deep.equal([44, 44]);
      expect(tops().slice(0, 2)).to.deep.equal(before.slice(0, 2));
      expect(el('light').querySelector('form')!.getClientRects().length).to.equal(0);
      expect(win.getComputedStyle(el('hid')).display).to.equal('none');
    } finally {
      iframe.remove();
    }
  });

  it('on a wide screen shows the filters as written', async () => {
    const iframe = await drawerFrame(1000);
    try {
      const doc = iframe.contentDocument!;
      for (const id of ['shadow', 'light', 'custom'])
        expect(doc.querySelector(`#${id} form`)!.getClientRects().length, id).to.be.greaterThan(0);
      expect(iframe.contentWindow!.getComputedStyle(doc.getElementById('hid')!).display).to.equal(
        'none',
      );
    } finally {
      iframe.remove();
    }
  });
});

/**
 * base.css before <uvalib-filter> is defined: a collapsed filter group (collapsible collapsed)
 * upgrades to its 44px legend button alone, so that height is held and nothing below moves.
 * An open group is left alone (its values come from script, so it grows whatever base.css does),
 * and `hidden` still hides.
 */
describe('base.css before <uvalib-filter> is defined', function () {
  this.timeout(12000);
  it('holds a collapsed group at 44px, and nothing moves when it upgrades', async () => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width: 375px; height: 600px; border: 0';
    iframe.srcdoc = `<!doctype html><html lang="en"><head>
      <link rel="stylesheet" href="${location.origin}/dist-cdn/base.css" />
      </head><body><p>Before</p>
      <uvalib-filter id="shadow" collapsible collapsed searchable sortable></uvalib-filter>
      <uvalib-filter id="light" no-shadow-dom collapsible collapsed match="any"></uvalib-filter>
      <uvalib-filter id="hid" collapsible collapsed hidden></uvalib-filter>
      <p id="after">After</p>
      <uvalib-filter id="open" collapsible></uvalib-filter></body></html>`;
    document.body.append(iframe);
    await new Promise((r) => iframe.addEventListener('load', r, { once: true }));
    try {
      const doc = iframe.contentDocument!;
      const win = iframe.contentWindow!;
      const el = (id: string) => doc.getElementById(id)!;
      expect(win.customElements.get('uvalib-filter')).to.equal(undefined);
      for (const id of ['shadow', 'light'])
        expect(el(id).getBoundingClientRect().height, id).to.equal(44);
      expect(win.getComputedStyle(el('hid')).display).to.equal('none');
      expect(el('open').getBoundingClientRect().height).to.equal(0);
      const tops = () =>
        ['shadow', 'light', 'after'].map((id) => el(id).getBoundingClientRect().top);
      const before = tops();
      const script = doc.createElement('script');
      script.type = 'module';
      script.src = `${location.origin}/dist-cdn/uvalib-filter.js`;
      doc.head.append(script);
      await new Promise((r) => script.addEventListener('load', r, { once: true }));
      type Lit = HTMLElement & {
        updateComplete: Promise<unknown>;
        filter: unknown;
        value: string[];
      };
      for (const id of ['shadow', 'light']) {
        const f = el(id) as Lit;
        f.filter = {
          name: 'subject',
          title: 'Subject',
          position: 0,
          buckets: [{ key: 'History', doc_count: 3, selected: false }],
        };
        f.value = ['History'];
        await f.updateComplete;
      }
      await new Promise((r) => setTimeout(r, 50));
      expect(el('shadow').shadowRoot!.querySelector('button[part=toggle]')).to.not.equal(null);
      expect(['shadow', 'light'].map((id) => el(id).getBoundingClientRect().height)).to.deep.equal([
        44, 44,
      ]);
      expect(tops()).to.deep.equal(before);
      expect(win.getComputedStyle(el('hid')).display).to.equal('none');
    } finally {
      iframe.remove();
    }
  });
});

/**
 * base.css before <uvalib-metadata> is defined (issue #34): the rows already sit as the upgraded
 * element lays them out (label beside value from 36rem, stacked below), and a list-limit list
 * shows only its first N values and a line for its "Show all" button, so nothing below moves
 * when the element upgrades.
 */
describe('base.css before <uvalib-metadata> is defined', function () {
  this.timeout(12000);
  const names = Array.from({ length: 39 }, (_, i) => `<li>Person ${i + 1}</li>`).join('');
  const short = '<li>One</li><li>Two</li><li>Three</li>';
  const dl = (extra = '') => `<dl>
      <dt>Date</dt><dd>September 12, 2019</dd>
      <dt>Location</dt><dd>The Rotunda, Charlottesville, Virginia</dd>
      <dt>Participants</dt><dd><ul>${names}</ul></dd>
      <dt>Committees</dt><dd><ul>${short}</ul></dd>
      ${extra}
      <dt>Downloads</dt><dd><a href="#pdf">PDF</a></dd>
    </dl>`;
  const rows = [
    `<uvalib-metadata id="shadow" list-limit="8">${dl()}</uvalib-metadata>`,
    `<uvalib-metadata id="light" no-shadow-dom list-limit="8">${dl()}</uvalib-metadata>`,
    // A row's own data-limit wins over list-limit (0: no limit).
    `<uvalib-metadata id="row" list-limit="8">${dl(
      `<dt>Guests</dt><dd data-limit="3"><ul>${names}</ul></dd><dt>All</dt><dd data-limit="0"><ul>${short}${short}${short}</ul></dd>`,
    )}</uvalib-metadata>`,
  ];

  async function metadataFrame(width: number): Promise<HTMLIFrameElement> {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `width: ${width}px; height: 3000px; border: 0`;
    iframe.srcdoc = `<!doctype html><html lang="en"><head>
      <link rel="stylesheet" href="${location.origin}/dist-cdn/base.css" />
      </head><body><p>Before</p>${rows.join('<p class="gap">Between</p>')}<p id="after">After</p></body></html>`;
    document.body.append(iframe);
    await new Promise((r) => iframe.addEventListener('load', r, { once: true }));
    return iframe;
  }

  for (const width of [1000, 375]) {
    it(`holds the upgraded height, so nothing below moves, at ${width}px`, async () => {
      const iframe = await metadataFrame(width);
      try {
        const doc = iframe.contentDocument!;
        const win = iframe.contentWindow!;
        const el = (id: string) => doc.getElementById(id)!;
        expect(win.customElements.get('uvalib-metadata')).to.equal(undefined);
        const ids = ['shadow', 'light', 'row'];
        const heights = () => ids.map((id) => Math.round(el(id).getBoundingClientRect().height));
        const tops = () =>
          [...ids, 'after'].map((id) => Math.round(el(id).getBoundingClientRect().top));
        const before = { heights: heights(), tops: tops() };
        const script = doc.createElement('script');
        script.type = 'module';
        script.src = `${location.origin}/dist-cdn/uvalib-metadata.js`;
        doc.head.append(script);
        await new Promise((r) => script.addEventListener('load', r, { once: true }));
        await Promise.all(
          ids.map(
            (id) => (el(id) as unknown as { updateComplete: Promise<unknown> }).updateComplete,
          ),
        );
        await new Promise((r) => setTimeout(r, 50));
        const after = { heights: heights(), tops: tops() };
        // Within 2px each: browsers round line boxes; a missing button line or an unshortened
        // list would be 30px to 800px off.
        for (const [i, h] of after.heights.entries())
          expect(
            Math.abs(h - before.heights[i]!),
            `${ids[i]} height ${before.heights[i]}→${h}`,
          ).to.be.at.most(2);
        expect(
          Math.abs(after.tops.at(-1)! - before.tops.at(-1)!),
          `after moved ${before.tops.at(-1)}→${after.tops.at(-1)}`,
        ).to.be.at.most(4);
      } finally {
        iframe.remove();
      }
    });
  }
});
