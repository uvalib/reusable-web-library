import { expect, fixture, nextFrame, waitUntil } from '@open-wc/testing';
import { sendKeys } from '@web/test-runner-commands';
import '../src/components/uvalib-lightbox/uvalib-lightbox.js';
import type { UvalibLightbox } from '../src/components/uvalib-lightbox/UvalibLightbox.js';
import type { UvalibImageRegions } from '../src/components/uvalib-image-regions/UvalibImageRegions.js';
import { recordAnalytics } from './helpers/analytics.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { inDarkMode } from './helpers/dark.js';

/** A 400 × 300 PNG. */
const IMAGE = (() => {
  const c = document.createElement('canvas');
  c.width = 400;
  c.height = 300;
  const g = c.getContext('2d')!;
  g.fillStyle = '#7a7a7a';
  g.fillRect(0, 0, 400, 300);
  return c.toDataURL('image/png');
})();

const view = (el: Element) => (el.shadowRoot ?? el) as ParentNode;
const dialogOf = (el: Element) => view(el).querySelector('dialog')!;
const regionsOf = (el: Element) =>
  dialogOf(el).querySelector<UvalibImageRegions>('uvalib-image-regions');
const toggle = (el: Element) =>
  dialogOf(el).querySelector<HTMLButtonElement>('button.regions-toggle');
const outlines = (r: Element) => [
  ...r.shadowRoot!.querySelectorAll<HTMLElement>('.overlay > .region:not([hidden])'),
];
const cancelNav = (e: Event) => {
  const a = e.composedPath().find((n) => n instanceof HTMLAnchorElement);
  if (a) e.preventDefault();
};

function shot(caption: string, extra = ''): string {
  return `<a href="${IMAGE}" data-caption="${caption}" ${extra}><img alt="${caption}" width="80" height="60"></a>`;
}

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-lightbox regions (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = (inner: string, attrs = '') =>
      fixture<UvalibLightbox>(`<uvalib-lightbox ${attr} ${attrs}>${inner}</uvalib-lightbox>`);

    beforeEach(() => document.addEventListener('click', cancelNav));
    afterEach(() => document.removeEventListener('click', cancelNav));

    const open = async (el: UvalibLightbox, i: number) => {
      el.querySelectorAll('a')[i]!.click();
      await el.updateComplete;
      await nextFrame();
    };

    const ready = async (el: UvalibLightbox) => {
      await waitUntil(() => customElements.get('uvalib-image-regions'), 'defined');
      const r = regionsOf(el)!;
      await r.updateComplete;
      await waitUntil(() => outlines(r).length > 0, 'outlines drawn');
      return r;
    };

    it('shows the outlines and their list for an image with data-regions, and a toggle', async () => {
      const el = await make(
        `${shot('Group', 'data-regions="percent:10,20,30,40 Person 1; 200,150,100,100 Sign"')}${shot('Lawn')}`,
        'regions-label="People"',
      );
      await open(el, 0);
      const r = await ready(el);
      expect(outlines(r).length).to.equal(2);
      // The viewer's own image, in the regions element: one image, its alt and status kept.
      const img = dialogOf(el).querySelectorAll('img');
      expect(img.length).to.equal(1);
      expect(img[0]!.getAttribute('alt')).to.equal('Group');
      expect(img[0]!.parentElement === r).to.equal(true);
      const items = [...r.shadowRoot!.querySelectorAll('ol.items > li')].map((li) =>
        li.textContent!.trim(),
      );
      expect(items).to.deep.equal(['Person 1', 'Sign']);
      expect(r.shadowRoot!.querySelector('[role="heading"]')!.textContent!.trim()).to.equal(
        'People',
      );
      const box = img[0]!.getBoundingClientRect();
      const o = outlines(r)[1]!.getBoundingClientRect();
      expect(Math.round(((o.left - box.left) / box.width) * 100)).to.equal(50);
      // The toggle hides and shows the outlines.
      const t = toggle(el)!;
      expect(t.textContent!.trim()).to.equal('Show regions');
      expect(t.getAttribute('aria-pressed')).to.equal('true');
      expect(t.getBoundingClientRect().height).to.be.at.least(44);
      t.click();
      await el.updateComplete;
      await r.updateComplete;
      expect(t.getAttribute('aria-pressed')).to.equal('false');
      expect(r.hideOutlines).to.equal(true);
      expect(getComputedStyle(r.shadowRoot!.querySelector('.overlay')!).display).to.equal('none');
      t.click();
      await el.updateComplete;
      await r.updateComplete;
      expect(r.hideOutlines).to.equal(false);
      // The next image has none: no regions element and no toggle.
      dialogOf(el).querySelector<HTMLButtonElement>('button.next')!.click();
      await el.updateComplete;
      expect(regionsOf(el)).to.equal(null);
      expect(toggle(el)).to.equal(null);
      expect(dialogOf(el).querySelectorAll('img').length).to.equal(1);
      dialogOf(el).querySelector<HTMLButtonElement>('button.close')!.click();
      await el.updateComplete;
    });

    it('takes regions from the regions callback, with data-image-width for pixels', async () => {
      const el = await make(
        `${shot('One', 'data-id="one" data-image-width="800" data-image-height="600"')}${shot('Two', 'data-id="two"')}`,
      );
      const seen: string[] = [];
      el.regions = ({ id, index }) => {
        seen.push(`${id}@${index}`);
        return id === 'one' ? [{ label: 'Doorway', x: 400, y: 0, w: 400, h: 600 }] : null;
      };
      await el.updateComplete;
      await open(el, 0);
      const r = await ready(el);
      expect(seen).to.include('one@0');
      expect(seen).to.include('two@1');
      const img = dialogOf(el).querySelector('img')!.getBoundingClientRect();
      const o = outlines(r)[0]!.getBoundingClientRect();
      expect(Math.round(((o.left - img.left) / img.width) * 100)).to.equal(50);
      expect(Math.round((o.width / img.width) * 100)).to.equal(50);
      dialogOf(el).querySelector<HTMLButtonElement>('button.close')!.click();
      await el.updateComplete;
    });

    it('a JSON data-regions works; clicking an outline focuses its entry and reports its number', async () => {
      const rec = recordAnalytics();
      try {
        const regions = JSON.stringify([
          { label: 'A; b', xywh: 'percent:0,0,50,50' },
          { label: 'C', x: 50, y: 50, w: 50, h: 50, unit: 'percent', href: '#c' },
        ]);
        const el = await make(shot('JSON', `data-regions='${regions}'`));
        await open(el, 0);
        const r = await ready(el);
        outlines(r)[1]!.click();
        await r.updateComplete;
        const li = r.shadowRoot!.querySelectorAll('ol.items > li')[1]!;
        expect(r.shadowRoot!.activeElement === li).to.equal(true);
        expect(dialogOf(el).open).to.equal(true);
        const events = rec.of('uvalib-analytics-event').map((d) => d.event);
        expect(events).to.deep.include(['uvalib-image-regions', 'select', 'Regions', 2]);
        expect(JSON.stringify(events)).to.not.include('"C"');
        dialogOf(el).querySelector<HTMLButtonElement>('button.close')!.click();
        await el.updateComplete;
      } finally {
        rec.restore();
      }
    });

    it('passes axe with regions, light and dark', async () => {
      const el = await make(shot('Group', 'data-regions="percent:10,20,30,40 Person 1"'));
      await open(el, 0);
      await ready(el);
      // The panel fades in over 0.15s; axe measures contrast through its opacity.
      await new Promise((r) => setTimeout(r, 250));
      await expectNoAxeViolations(el);
      await inDarkMode(async () => {
        await expectNoAxeViolations(el);
      });
      dialogOf(el).querySelector<HTMLButtonElement>('button.close')!.click();
      await el.updateComplete;
    });

    it('an image without regions renders as before (no toggle, no regions element)', async () => {
      const el = await make(shot('Plain'));
      await open(el, 0);
      expect(regionsOf(el)).to.equal(null);
      expect(toggle(el)).to.equal(null);
      expect(dialogOf(el).querySelector('figure > img')).to.not.equal(null);
      dialogOf(el).querySelector<HTMLButtonElement>('button.close')!.click();
      await el.updateComplete;
    });
  });
}

/** A page's own region list (issue #22): hidden, outside the lightbox, with its own buttons. */
const PEOPLE = `
  <ol id="people" class="people" hidden>
    <li data-xywh="percent:10,20,30,40">Tim Kaine
      <button type="button" class="act" data-act="confirm">Confirm Tim Kaine</button>
      <button type="button" class="act" data-act="not">Not Tim Kaine</button></li>
    <li data-xywh="percent:55,15,20,30" tabindex="0">Person 2
      <button type="button" class="act" data-act="name">Name person 2</button></li>
  </ol>`;

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-lightbox regions list (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    /** The page: its styles, a lightbox and, after it, the hidden list and a marker. */
    const page = async (links: string, attrs = '') => {
      const wrap = await fixture<HTMLDivElement>(`<div>
        <style>.people .act { margin-inline-start: 7px; }</style>
        <uvalib-lightbox ${attr} ${attrs}>${links}</uvalib-lightbox>
        <section class="home">${PEOPLE}<p class="after">after</p></section>
      </div>`);
      const el = wrap.querySelector<UvalibLightbox>('uvalib-lightbox')!;
      await el.updateComplete;
      return { el, list: wrap.querySelector<HTMLOListElement>('#people')! };
    };

    beforeEach(() => document.addEventListener('click', cancelNav));
    afterEach(() => document.removeEventListener('click', cancelNav));

    const open = async (el: UvalibLightbox, i: number) => {
      el.querySelectorAll<HTMLAnchorElement>(':scope > a')[i]!.click();
      await el.updateComplete;
      await nextFrame();
    };
    const ready = async (el: UvalibLightbox, n = 2) => {
      await waitUntil(() => customElements.get('uvalib-image-regions'), 'defined');
      const r = regionsOf(el)!;
      await r.updateComplete;
      await waitUntil(() => outlines(r).length === n, 'outlines drawn');
      return r;
    };
    const close = async (el: UvalibLightbox) => {
      dialogOf(el).querySelector<HTMLButtonElement>('button.close')!.click();
      await el.updateComplete;
    };
    /** Back home exactly as written: place, hidden, and none of the viewer's marks. */
    const expectHome = (list: HTMLOListElement) => {
      expect(list.parentElement!.classList.contains('home')).to.equal(true);
      expect(list.nextElementSibling!.classList.contains('after')).to.equal(true);
      expect(list.hidden).to.equal(true);
      expect(list.hasAttribute('slot')).to.equal(false);
      const marks = [list, ...list.querySelectorAll('*')].flatMap((n) =>
        n.getAttributeNames().filter((a) => a.startsWith('data-uvalib-')),
      );
      expect(marks).to.deep.equal([]);
      const tabs = [...list.querySelectorAll('li')].map((li) => li.getAttribute('tabindex'));
      expect(tabs).to.deep.equal([null, '0']);
    };

    it('lends the page list to the viewer: same nodes, page listeners and styles, then gives it back', async () => {
      const { el, list } = await page(
        `${shot('Group', 'data-regions-list="people"')}${shot('Lawn')}`,
        'regions-label="People"',
      );
      const acts: string[] = [];
      const confirm = list.querySelector<HTMLButtonElement>('[data-act="confirm"]')!;
      confirm.addEventListener('click', () => acts.push('confirm'));
      await open(el, 0);
      const r = await ready(el);
      // Shadow: a light-DOM child of the lightbox, slotted on; light DOM: inside the regions element.
      if (mode === 'shadow') {
        expect(list.parentElement === el).to.equal(true);
        expect(list.assignedSlot !== null).to.equal(true);
      } else expect(list.parentElement === r).to.equal(true);
      expect(list.hidden).to.equal(false);
      expect(list.getBoundingClientRect().height).to.be.above(0);
      expect(list.querySelector('li')!.getAttribute('data-uvalib-region')).to.equal('1');
      // The outlines are labelled from the entries' text, not their buttons.
      const names = [...r.shadowRoot!.querySelectorAll('.overlay .name')].map((n) =>
        n.textContent!.trim(),
      );
      expect(names).to.deep.equal(['Tim Kaine', 'Person 2']);
      // The page's CSS still reaches its buttons.
      expect(getComputedStyle(confirm).marginInlineStart).to.equal('7px');
      // The page's listener runs; the button is the same node.
      confirm.click();
      expect(acts).to.deep.equal(['confirm']);
      expect(dialogOf(el).open).to.equal(true);
      // Highlight both ways: focus in an entry marks its outline; an outline click focuses its entry.
      list.querySelector<HTMLButtonElement>('[data-act="name"]')!.focus();
      await r.updateComplete;
      expect(outlines(r)[1]!.classList.contains('active')).to.equal(true);
      outlines(r)[0]!.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, composed: true }),
      );
      await r.updateComplete;
      expect(list.querySelector('li')!.hasAttribute('data-uvalib-active')).to.equal(true);
      // The entry styles reach the page's entries where they are: the bar on the highlighted one.
      const bar = getComputedStyle(list.querySelector('li')!);
      expect(bar.borderInlineStartWidth).to.equal('6px');
      expect(getComputedStyle(list.querySelectorAll('li')[1]!).paddingBlockStart).to.equal('8px');
      outlines(r)[0]!.click();
      await r.updateComplete;
      expect(document.activeElement === list.querySelector('li')).to.equal(true);
      // The toggle hides the outlines and keeps the list.
      toggle(el)!.click();
      await el.updateComplete;
      await r.updateComplete;
      expect(getComputedStyle(r.shadowRoot!.querySelector('.overlay')!).display).to.equal('none');
      expect(list.getBoundingClientRect().height).to.be.above(0);
      toggle(el)!.click();
      await el.updateComplete;
      // Next: the image without regions; the list goes home and focus is not lost.
      dialogOf(el).querySelector<HTMLButtonElement>('button.next')!.click();
      await el.updateComplete;
      expectHome(list);
      expect(regionsOf(el)).to.equal(null);
      // The page updates its list while it is home; the next open shows the update.
      list.insertAdjacentHTML(
        'beforeend',
        '<li data-xywh="percent:80,10,10,10">Dog <button type="button" class="act">Name dog</button></li>',
      );
      dialogOf(el).querySelector<HTMLButtonElement>('button.prev')!.click();
      await el.updateComplete;
      const r2 = await ready(el, 3);
      expect(r2.shadowRoot!.querySelectorAll('.overlay .region').length).to.equal(3);
      // A change while it is open is seen too.
      list.lastElementChild!.remove();
      await waitUntil(() => outlines(r2).length === 2, 'removed entry seen');
      confirm.click();
      expect(acts).to.deep.equal(['confirm', 'confirm']);
      await close(el);
      expectHome(list);
      expect(list.querySelectorAll('li').length).to.equal(2);
    });

    it('stepping away while focus is in the list moves focus to Close', async () => {
      const { el, list } = await page(`${shot('A', 'data-regions-list="people"')}${shot('B')}`);
      await open(el, 0);
      await ready(el);
      list.querySelector<HTMLButtonElement>('button')!.focus();
      await sendKeys({ press: 'ArrowRight' });
      await el.updateComplete;
      expectHome(list);
      const active = el.shadowRoot?.activeElement ?? document.activeElement;
      expect(active?.classList.contains('close')).to.equal(true);
      await close(el);
    });

    it('keyboard: Tab from Close reaches the page buttons in order, each marking its region', async () => {
      const { el, list } = await page(shot('Group', 'data-regions-list="people"'));
      const acts: string[] = [];
      list.addEventListener('click', (e) => {
        const b = (e.target as Element).closest('button');
        if (b) acts.push(b.dataset.act ?? '');
      });
      await open(el, 0);
      const r = await ready(el);
      const close = dialogOf(el).querySelector<HTMLButtonElement>('button.close')!;
      close.focus();
      const order: string[] = [];
      for (let i = 0; i < 4; i++) {
        await sendKeys({ press: 'Tab' });
        const a = document.activeElement as HTMLElement | null;
        order.push(a?.dataset.act ?? (a?.localName === 'li' ? 'li' : (a?.localName ?? '')));
      }
      // Entry 2 has the page's own tabindex="0", so it is a stop before its button.
      expect(order).to.deep.equal(['confirm', 'not', 'li', 'name']);
      await r.updateComplete;
      expect(outlines(r)[1]!.classList.contains('active')).to.equal(true);
      await sendKeys({ press: 'Enter' });
      expect(acts).to.deep.equal(['name']);
      await sendKeys({ press: 'Escape' });
      await el.updateComplete;
      expectHome(list);
    });

    it('the regionsList callback, and a list wins over data-regions with one warning', async () => {
      const warn = console.warn;
      const warned: unknown[] = [];
      console.warn = (...a: unknown[]) => warned.push(a[0]);
      try {
        const { el, list } = await page(
          `${shot('A', 'data-id="a" data-regions="percent:0,0,10,10 X"')}${shot('B', 'data-id="b" data-regions="percent:0,0,10,10 Y"')}${shot('C', 'data-id="c"')}`,
        );
        el.regionsList = ({ id }) => (id === 'c' ? list : null);
        await el.updateComplete;
        await open(el, 2);
        await ready(el);
        expect(list.parentElement === el || list.parentElement === regionsOf(el)).to.equal(true);
        await close(el);
        expectHome(list);
        // Now every image names it, and A and B also have data-regions: the list is used.
        el.regionsList = () => list;
        await el.updateComplete;
        await open(el, 0);
        const r = await ready(el);
        expect(r.items).to.equal(null);
        const lists = warned.filter((w) => String(w).includes('regions list'));
        expect(lists.length).to.equal(1);
        await close(el);
        expectHome(list);
      } finally {
        console.warn = warn;
      }
    });

    it('an outline click reaches the page as activate with its own entry, and can open its form', async () => {
      const { el, list } = await page(
        shot('Group', 'data-regions-list="people"'),
        'regions-label="People"',
      );
      const name = list.querySelector<HTMLButtonElement>('[data-act="name"]')!;
      const got: { index: number; entry: Element }[] = [];
      const onActivate = (e: Event) => {
        const d = (e as CustomEvent).detail;
        got.push(d);
        // An unknown face: the page focuses its own "Name person 2" instead of the entry.
        if (d.entry.querySelector('[data-act="name"]')) {
          e.preventDefault();
          d.entry.querySelector('[data-act="name"]').focus();
        }
      };
      document.addEventListener('uvalib-image-regions-activate', onActivate);
      try {
        await open(el, 0);
        const r = await ready(el);
        outlines(r)[1]!.click();
        await r.updateComplete;
        expect(got.length).to.equal(1);
        expect(got[0]!.index).to.equal(1);
        // The page's own <li>, the same node it wrote.
        expect(got[0]!.entry === list.querySelectorAll('li')[1]).to.equal(true);
        // The lent list stays in the page's light DOM, so the page's button is the active element.
        expect(document.activeElement === name).to.equal(true);
        await close(el);
        expectHome(list);
      } finally {
        document.removeEventListener('uvalib-image-regions-activate', onActivate);
      }
    });

    it('links in the list are not taken for images; analytics carry no labels', async () => {
      const rec = recordAnalytics();
      try {
        const { el, list } = await page(
          shot('Group', 'data-regions-list="people"'),
          'regions-label="People"',
        );
        list.querySelector('li')!.insertAdjacentHTML('beforeend', '<a href="#kaine">About</a>');
        await open(el, 0);
        const r = await ready(el);
        await new Promise((res) => setTimeout(res, 0));
        list.querySelector<HTMLAnchorElement>('a')!.click();
        await el.updateComplete;
        expect(dialogOf(el).querySelector('.count')).to.equal(null);
        expect(dialogOf(el).open).to.equal(true);
        outlines(r)[1]!.click();
        const events = rec.of('uvalib-analytics-event').map((d) => d.event);
        expect(events).to.deep.include(['uvalib-image-regions', 'select', 'People', 2]);
        expect(JSON.stringify(events)).to.not.include('Kaine');
        expect(JSON.stringify(events)).to.not.include('Person 2');
        await close(el);
        list.querySelector('a')!.remove();
        expectHome(list);
      } finally {
        rec.restore();
      }
    });

    it('passes axe with a page list open, light and dark', async () => {
      const { el, list } = await page(shot('Group', 'data-regions-list="people"'));
      await open(el, 0);
      await ready(el);
      await new Promise((r) => setTimeout(r, 250));
      await expectNoAxeViolations(el);
      await inDarkMode(async () => {
        await expectNoAxeViolations(el);
      });
      await close(el);
      expectHome(list);
    });
  });
}
