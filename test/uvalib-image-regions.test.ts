import { expect, fixture, nextFrame, waitUntil } from '@open-wc/testing';
import { emulateMedia, sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-image-regions/uvalib-image-regions.js';
import type { UvalibImageRegions } from '../src/components/uvalib-image-regions/UvalibImageRegions.js';
import {
  parseRegions,
  parseXywh,
  toPercent,
  toRegion,
} from '../src/components/uvalib-image-regions/regions.js';
import { recordAnalytics } from './helpers/analytics.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { inDarkMode } from './helpers/dark.js';

/** A 400 × 300 PNG, so pixel regions have a known natural size. */
const IMAGE = (() => {
  const c = document.createElement('canvas');
  c.width = 400;
  c.height = 300;
  const g = c.getContext('2d')!;
  g.fillStyle = '#7a7a7a';
  g.fillRect(0, 0, 400, 300);
  return c.toDataURL('image/png');
})();

const view = (el: Element): ParentNode => el.shadowRoot ?? el;
const outlines = (el: Element) => [
  ...view(el).querySelectorAll<HTMLElement>('.overlay > .region:not([hidden])'),
];
const overlay = (el: Element) => view(el).querySelector<HTMLElement>('.overlay')!;
const media = (el: Element) => view(el).querySelector<HTMLElement>('.media')!;
const listPane = (el: Element) => view(el).querySelector<HTMLElement>('.list')!;
const entries = (el: Element) =>
  [...el.querySelectorAll<HTMLElement>('li'), ...view(el).querySelectorAll<HTMLElement>('li')]
    .filter((li, i, all) => all.indexOf(li) === i)
    .filter((li) => li.hasAttribute('data-uvalib-region'));
const activeOf = (el: Element) =>
  entries(el).findIndex((li) => li.hasAttribute('data-uvalib-active'));
const activeOutline = (el: Element) =>
  outlines(el).findIndex((o) => o.classList.contains('active'));
const rel = (box: DOMRect, outer: DOMRect) => ({
  x: Math.round(((box.left - outer.left) / outer.width) * 100),
  y: Math.round(((box.top - outer.top) / outer.height) * 100),
  w: Math.round((box.width / outer.width) * 100),
  h: Math.round((box.height / outer.height) * 100),
});

const CHILDREN = `
  <img src="${IMAGE}" alt="Three people outside a doorway" width="400" height="300">
  <ol>
    <li data-xywh="percent:10,20,30,40"><a href="#p1">Person 1</a>
      <button type="button" class="name-it">Name this person</button></li>
    <li data-xywh="xywh=160,120,80,60"><a href="#sign">Sign</a></li>
    <li data-xywh="pixel:300,0,100,300">Doorway <button type="button">Not this</button></li>
  </ol>`;

async function loaded(el: UvalibImageRegions) {
  await el.updateComplete;
  await waitUntil(() => outlines(el).length === 3, 'outlines drawn', { timeout: 3000 });
  await el.updateComplete;
}

describe('image regions parsing', () => {
  it('reads xywh in percent and pixels, with or without the prefix', () => {
    expect(parseXywh('percent:10,20,30,40')).to.deep.equal({
      x: 10,
      y: 20,
      w: 30,
      h: 40,
      unit: 'percent',
    });
    expect(parseXywh('xywh=160,120,320,240')).to.deep.equal({
      x: 160,
      y: 120,
      w: 320,
      h: 240,
      unit: 'px',
    });
    expect(parseXywh('https://x/canvas/1#xywh=pixel:1,2,3,4')!.unit).to.equal('px');
    expect(parseXywh('xywh=percent:1.5,2,3,4')!.x).to.equal(1.5);
    for (const bad of ['', '1,2,3', '1,2,0,4', 'a,b,c,d', '-1,2,3,4', 'percent:1,2,3,4,5'])
      expect(parseXywh(bad), bad).to.equal(null);
  });

  it('converts to percent and clamps to the image', () => {
    const px = toPercent({ x: 160, y: 120, w: 80, h: 60, unit: 'px' }, 400, 300)!;
    expect(px).to.deep.equal({ x: 40, y: 40, w: 20, h: 20, unit: 'percent' });
    expect(toPercent({ x: 1, y: 1, w: 1, h: 1, unit: 'px' }, 0, 0)).to.equal(null);
    const big = toPercent({ x: 90, y: 90, w: 50, h: 50, unit: 'percent' }, 0, 0)!;
    expect(big.w).to.equal(10);
    expect(toPercent({ x: 120, y: 0, w: 5, h: 5, unit: 'percent' }, 0, 0)).to.equal(null);
  });

  it('reads items and data-regions (JSON and the ; list)', () => {
    expect(toRegion({ label: ' A ', x: 1, y: 2, w: 3, h: 4, unit: 'percent' })).to.deep.equal({
      label: 'A',
      x: 1,
      y: 2,
      w: 3,
      h: 4,
      unit: 'percent',
    });
    expect(toRegion({ label: 'B', xywh: 'percent:1,2,3,4', href: '#b' })!.href).to.equal('#b');
    expect(toRegion({ label: 'C', x: 1 })).to.equal(null);
    const list = parseRegions('percent:10,20,30,40 Person 1; 160,120,320,240 Sign;bad; ');
    expect(list.map((r) => [r.label, r.unit])).to.deep.equal([
      ['Person 1', 'percent'],
      ['Sign', 'px'],
    ]);
    const json = parseRegions('[{"label":"A; b","xywh":"percent:1,2,3,4"},{"label":"x"}]');
    expect(json.map((r) => r.label)).to.deep.equal(['A; b']);
    expect(parseRegions('[not json')).to.deep.equal([]);
  });
});

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-image-regions (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = async (attrs = 'label="People"', children = CHILDREN) => {
      const el = await fixture<UvalibImageRegions>(
        `<uvalib-image-regions ${attr} ${attrs}>${children}</uvalib-image-regions>`,
      );
      return el;
    };

    afterEach(async () => {
      await setViewport({ width: 800, height: 600 });
    });

    it('draws child-list regions in percent and pixels of the natural size, numbered like the list', async () => {
      const el = await make();
      await loaded(el);
      const img = el.querySelector('img')!;
      const box = img.getBoundingClientRect();
      const r = outlines(el).map((o) => rel(o.getBoundingClientRect(), box));
      expect(r[0]).to.deep.equal({ x: 10, y: 20, w: 30, h: 40 });
      expect(r[1]).to.deep.equal({ x: 40, y: 40, w: 20, h: 20 });
      expect(r[2]).to.deep.equal({ x: 75, y: 0, w: 25, h: 100 });
      expect(outlines(el).map((o) => o.querySelector('.number')!.textContent)).to.deep.equal([
        '1',
        '2',
        '3',
      ]);
      // The image is the author's (alt kept) and the overlay is hidden from assistive tech.
      expect(img.alt).to.equal('Three people outside a doorway');
      expect(overlay(el).getAttribute('aria-hidden')).to.equal('true');
      expect(outlines(el).every((o) => o.tabIndex === -1 && !o.hasAttribute('tabindex'))).to.equal(
        true,
      );
      // The list is the author's own, in place (light DOM: moved into the layout).
      expect(el.querySelector('ol')!.children.length).to.equal(3);
      expect(entries(el).map((li) => li.getAttribute('data-uvalib-region'))).to.deep.equal([
        '1',
        '2',
        '3',
      ]);
      const heading = view(el).querySelector('[role="heading"]')!;
      expect(heading.textContent!.trim()).to.equal('People');
      expect(heading.getAttribute('aria-level')).to.equal('2');
    });

    it('draws items, with links and descriptions, and numbering="none" hides the numbers', async () => {
      const el = await make('label="Things" numbering="none" heading-level="3"', '');
      el.src = IMAGE;
      el.alt = 'A grey image';
      el.width = 400;
      el.height = 300;
      el.items = [
        { label: 'Person 1', x: 0, y: 0, w: 50, h: 50, unit: 'percent', href: '#one' },
        { label: 'Sign', x: 200, y: 150, w: 200, h: 150, description: 'Painted' },
        { label: 'Bad', x: 0, y: 0, w: 0, h: 0 },
        { label: 'Unsafe', x: 1, y: 1, w: 1, h: 1, unit: 'percent', href: 'javascript:alert(1)' },
      ];
      await el.updateComplete;
      await waitUntil(() => outlines(el).length === 3, 'drawn');
      const img = view(el).querySelector<HTMLImageElement>('.media > img')!;
      expect(img.alt).to.equal('A grey image');
      const lis = [...view(el).querySelectorAll('ol.items > li')];
      expect(lis.map((li) => li.textContent!.replace(/\s+/g, ' ').trim())).to.deep.equal([
        'Person 1',
        'Sign Painted',
        'Unsafe',
      ]);
      expect(lis[0]!.querySelector('a')!.getAttribute('href')).to.equal('#one');
      expect(lis[2]!.querySelector('a')).to.equal(null);
      expect(view(el).querySelectorAll('.number').length).to.equal(0);
      const r = rel(outlines(el)[1]!.getBoundingClientRect(), img.getBoundingClientRect());
      expect(r).to.deep.equal({ x: 50, y: 50, w: 50, h: 50 });
      expect(view(el).querySelector('[role="heading"]')!.getAttribute('aria-level')).to.equal('3');
      expect(view(el).querySelector('ol.items')!.getAttribute('aria-labelledby')).to.equal(
        view(el).querySelector('[role="heading"]')!.id,
      );
    });

    it('image-width and image-height set the pixel space (a IIIF derivative)', async () => {
      const el = await make(
        'image-width="800" image-height="600"',
        `<img src="${IMAGE}" alt="x" width="400" height="300"><ol><li data-xywh="400,300,400,300">A</li></ol>`,
      );
      await el.updateComplete;
      await waitUntil(() => outlines(el).length === 1);
      const r = rel(
        outlines(el)[0]!.getBoundingClientRect(),
        el.querySelector('img')!.getBoundingClientRect(),
      );
      expect(r).to.deep.equal({ x: 50, y: 50, w: 50, h: 50 });
    });

    it('scales with the image when it resizes, and reserves its space before it loads', async () => {
      const el = await make();
      await loaded(el);
      el.style.width = '300px';
      await nextFrame();
      await nextFrame();
      const img = el.querySelector('img')!;
      const box = img.getBoundingClientRect();
      expect(Math.round(box.width)).to.equal(300);
      expect(rel(outlines(el)[0]!.getBoundingClientRect(), box)).to.deep.equal({
        x: 10,
        y: 20,
        w: 30,
        h: 40,
      });
      const pending = await make(
        '',
        `<img alt="Not loaded" width="400" height="300"><ol><li data-xywh="percent:1,1,5,5">A</li></ol>`,
      );
      pending.style.width = '200px';
      await nextFrame();
      expect(Math.round(pending.querySelector('img')!.getBoundingClientRect().height)).to.equal(
        150,
      );
    });

    it('follows changes to the child list', async () => {
      const el = await make();
      await loaded(el);
      const li = document.createElement('li');
      li.dataset.xywh = 'percent:0,0,10,10';
      li.textContent = 'Added';
      el.querySelector('ol')!.append(li);
      await waitUntil(() => outlines(el).length === 4, 'added');
      el.querySelector('ol')!.children[1]!.setAttribute('data-xywh', 'percent:0,50,10,10');
      await waitUntil(
        () =>
          rel(
            outlines(el)[1]!.getBoundingClientRect(),
            el.querySelector('img')!.getBoundingClientRect(),
          ).y === 50,
        'moved',
      );
    });

    it('hovering or focusing an entry highlights its region by more than colour, and back', async () => {
      const el = await make();
      await loaded(el);
      const seen: number[] = [];
      el.addEventListener('highlight', (e) => seen.push((e as CustomEvent).detail.index));
      const plain = getComputedStyle(outlines(el)[1]!);
      // Focus a link in the first entry.
      entries(el)[0]!.querySelector('a')!.focus();
      await el.updateComplete;
      expect(activeOutline(el)).to.equal(0);
      expect(activeOf(el)).to.equal(0);
      const on = getComputedStyle(outlines(el)[0]!);
      expect(parseFloat(on.borderTopWidth)).to.be.greaterThan(parseFloat(plain.borderTopWidth));
      expect(parseFloat(on.outlineWidth)).to.be.greaterThan(parseFloat(plain.outlineWidth));
      const name = outlines(el)[0]!.querySelector<HTMLElement>('.name')!;
      expect(getComputedStyle(name).display).to.not.equal('none');
      expect(name.textContent).to.equal('Person 1');
      // The others dim (after their short fade).
      await new Promise((r) => setTimeout(r, 250));
      expect(getComputedStyle(outlines(el)[1]!).opacity).to.not.equal('1');
      const li = getComputedStyle(entries(el)[0]!);
      expect(li.borderInlineStartStyle).to.equal('solid');
      expect(getComputedStyle(entries(el)[1]!).borderInlineStartStyle).to.equal('none');
      // A button inside the entry keeps it highlighted.
      entries(el)[0]!.querySelector('button')!.focus();
      await el.updateComplete;
      expect(activeOutline(el)).to.equal(0);
      // Hovering a region highlights its entry, over the focused one.
      outlines(el)[2]!.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, composed: true }),
      );
      await el.updateComplete;
      expect(activeOf(el)).to.equal(2);
      expect(activeOutline(el)).to.equal(2);
      el.dispatchEvent(new PointerEvent('pointerleave'));
      await el.updateComplete;
      expect(activeOf(el)).to.equal(0);
      // Hovering an entry.
      entries(el)[1]!.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, composed: true }),
      );
      await el.updateComplete;
      expect(activeOutline(el)).to.equal(1);
      el.dispatchEvent(new PointerEvent('pointerleave'));
      (document.activeElement as HTMLElement).blur();
      await el.updateComplete;
      expect(activeOf(el)).to.equal(-1);
      expect(activeOutline(el)).to.equal(-1);
      expect(seen).to.deep.equal([0, 2, 0, 1, 0, -1]);
    });

    it('clicking an outline focuses its entry, fires select, and reports its number only', async () => {
      const rec = recordAnalytics();
      try {
        const el = await make();
        await loaded(el);
        const got: unknown[] = [];
        el.addEventListener('select', (e) => got.push((e as CustomEvent).detail));
        outlines(el)[1]!.click();
        await el.updateComplete;
        const li = entries(el)[1]!;
        expect(document.activeElement === li).to.equal(true);
        expect(li.tabIndex).to.equal(-1);
        expect(activeOf(el)).to.equal(1);
        expect(got.length).to.equal(1);
        const detail = got[0] as { index: number; item: { label: string; href: string } };
        expect(detail.index).to.equal(1);
        expect(detail.item.label).to.equal('Sign');
        expect(detail.item.href).to.equal('#sign');
        expect(rec.of('uvalib-analytics-event')).to.deep.equal([
          { event: ['uvalib-image-regions', 'select', 'People', 2] },
        ]);
        // Nothing on hover or focus.
        entries(el)[0]!.querySelector('a')!.focus();
        outlines(el)[0]!.dispatchEvent(
          new PointerEvent('pointerover', { bubbles: true, composed: true }),
        );
        await el.updateComplete;
        expect(rec.of('uvalib-analytics-event').length).to.equal(1);
        // Opt-out.
        el.setAttribute('no-analytics', '');
        outlines(el)[0]!.click();
        expect(rec.of('uvalib-analytics-event').length).to.equal(1);
        expect(got.length).to.equal(2);
      } finally {
        rec.restore();
      }
    });

    it('the host page’s actions in an entry stay its own', async () => {
      const el = await make();
      await loaded(el);
      const clicks: string[] = [];
      const button = el.querySelector<HTMLButtonElement>('button.name-it')!;
      button.addEventListener('click', () => clicks.push('own'));
      document.addEventListener(
        'click',
        (e) => {
          if (e.target === button) clicks.push('page');
        },
        { once: true },
      );
      let selects = 0;
      el.addEventListener('select', () => selects++);
      button.click();
      expect(clicks).to.deep.equal(['own', 'page']);
      expect(selects).to.equal(0);
      // Keyboard: Tab from the first entry's link reaches its button, not an outline.
      const link = entries(el)[0]!.querySelector('a')!;
      link.focus();
      await sendKeys({ press: 'Tab' });
      expect(document.activeElement === button).to.equal(true);
      // Links are not followed by the test.
      const go = (e: Event) => e.preventDefault();
      link.addEventListener('click', go);
      link.click();
      link.removeEventListener('click', go);
    });

    it('hide-outlines hides the overlay; the list stays', async () => {
      const el = await make('hide-outlines');
      await el.updateComplete;
      expect(overlay(el).hidden).to.equal(true);
      expect(getComputedStyle(overlay(el)).display).to.equal('none');
      expect(entries(el).length).to.equal(3);
    });

    it('passes axe, plain and with an entry highlighted', async () => {
      const el = await make();
      await loaded(el);
      await expectNoAxeViolations(el);
      outlines(el)[0]!.click();
      await el.updateComplete;
      await expectNoAxeViolations(el);
    });

    it('passes axe in dark mode', async () => {
      await inDarkMode(async () => {
        const el = await make();
        await loaded(el);
        await expectNoAxeViolations(el);
        entries(el)[1]!.querySelector('a')!.focus();
        await el.updateComplete;
        await expectNoAxeViolations(el);
        expect(getComputedStyle(listPane(el)).color).to.not.equal('rgb(43, 43, 43)');
      });
    });

    it('forced colors: the outlines keep two system colours and the highlight is Highlight', async () => {
      await emulateMedia({ forcedColors: 'active' });
      try {
        const el = await make();
        await loaded(el);
        entries(el)[0]!.querySelector('a')!.focus();
        await el.updateComplete;
        const plain = getComputedStyle(outlines(el)[1]!);
        expect(plain.borderTopStyle).to.equal('solid');
        expect(plain.outlineStyle).to.equal('solid');
        expect(plain.borderTopColor).to.not.equal(plain.outlineColor);
        const on = getComputedStyle(outlines(el)[0]!);
        expect(on.outlineColor).to.not.equal(plain.outlineColor);
        expect(getComputedStyle(overlay(el)).forcedColorAdjust).to.equal('none');
        expect(getComputedStyle(entries(el)[0]!).borderInlineStartStyle).to.equal('solid');
      } finally {
        await emulateMedia({ forcedColors: 'none' });
      }
    });

    it('reflows at 320px: the list stacks under the image, no page scroll', async () => {
      await setViewport({ width: 320, height: 640 });
      const el = await make();
      await loaded(el);
      const m = media(el).getBoundingClientRect();
      const l = listPane(el).getBoundingClientRect();
      expect(l.top).to.be.at.least(m.bottom - 1);
      expect(m.right).to.be.at.most(320);
      expect(document.documentElement.scrollWidth).to.be.at.most(320);
      await setViewport({ width: 1000, height: 640 });
      await nextFrame();
      const m2 = media(el).getBoundingClientRect();
      const l2 = listPane(el).getBoundingClientRect();
      expect(l2.left).to.be.at.least(m2.right - 1);
    });

    it('reduced motion: no transitions', async () => {
      await emulateMedia({ reducedMotion: 'reduce' });
      try {
        const el = await make();
        await loaded(el);
        const d = getComputedStyle(outlines(el)[0]!).transitionDuration;
        expect(d.split(',').every((s) => parseFloat(s) === 0)).to.equal(true);
      } finally {
        await emulateMedia({ reducedMotion: 'no-preference' });
      }
    });

    it('no-style keeps the outlines and layout', async () => {
      const el = await make('no-style');
      await loaded(el);
      const o = getComputedStyle(outlines(el)[0]!);
      expect(o.position).to.equal('absolute');
      expect(o.borderTopStyle).to.equal('solid');
      // Light DOM shares one page sheet per tag, so only the shadow root shows the opt-out.
      if (mode === 'shadow')
        expect(getComputedStyle(view(el).querySelector('.heading')!).fontSize).to.not.equal('18px');
    });
  });
}

describe('uvalib-image-regions without JavaScript (not upgraded)', () => {
  it('the child list is a plain ordered list with its links', async () => {
    const el = await fixture(`<uvalib-image-regions-x>${CHILDREN}</uvalib-image-regions-x>`);
    expect(el.querySelectorAll('ol > li a[href]').length).to.equal(2);
    expect(getComputedStyle(el.querySelector('ol')!).listStyleType).to.equal('decimal');
  });
});
