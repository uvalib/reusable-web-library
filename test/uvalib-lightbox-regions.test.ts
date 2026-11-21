import { expect, fixture, nextFrame, waitUntil } from '@open-wc/testing';
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
