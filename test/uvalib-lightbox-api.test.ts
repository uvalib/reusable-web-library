import { expect, fixture, nextFrame, waitUntil } from '@open-wc/testing';
import '../src/components/uvalib-lightbox/uvalib-lightbox.js';
import type { UvalibLightbox } from '../src/components/uvalib-lightbox/UvalibLightbox.js';
import { recordAnalytics } from './helpers/analytics.js';
import { expectNoAxeViolations } from './helpers/axe.js';

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4AWP4z8Dwn4Hh/38AD/kD/dtv74kAAAAASUVORK5CYII=';

const view = (el: Element) => (el.shadowRoot ?? el) as ParentNode;
const ui = (root: ParentNode, sel: string) => root.querySelector(sel) as HTMLElement;
const dialogOf = (el: Element) => view(el).querySelector('dialog')!;
const boxOf = (el: Element) => view(el).querySelector('.details') as HTMLElement;
const caption = (el: Element) => view(el).querySelector('.caption')!.textContent;
const count = (el: Element) => view(el).querySelector('.count')?.textContent ?? '';

/** Shown in the viewer's details panel: slotted there (shadow) or inside it (light DOM). */
const shownInDetails = (el: Element, node: Element) => {
  const box = boxOf(el);
  const slot = (node as HTMLElement).assignedSlot;
  return box.contains(node) || (!!slot && box.contains(slot));
};

function shot(caption: string, extra = ''): string {
  return `<a href="${PNG}" data-caption="${caption}" ${extra}><img alt="${caption}" width="80" height="48"></a>`;
}

function cancelNav(e: Event): void {
  if (e.composedPath().some((n) => n instanceof HTMLAnchorElement)) e.preventDefault();
}

function nextPop(): Promise<void> {
  return new Promise((resolve) =>
    window.addEventListener('popstate', () => resolve(), { once: true }),
  );
}

const settle = async (el: UvalibLightbox) => {
  await el.updateComplete;
  await nextFrame();
  await el.updateComplete;
};

/** Records the viewer's open/close events and analytics, in order. */
function recordLightbox() {
  const log: { type: string; detail: Record<string, unknown> }[] = [];
  const types = ['uvalib-lightbox-open', 'uvalib-lightbox-close', 'uvalib-analytics-event'];
  const on = (e: Event) =>
    log.push({ type: e.type, detail: (e as CustomEvent).detail as Record<string, unknown> });
  for (const t of types) document.addEventListener(t, on);
  return {
    log,
    of: (type: string) => log.filter((e) => e.type === type).map((e) => e.detail),
    types: () => log.map((e) => e.type),
    restore: () => {
      for (const t of types) document.removeEventListener(t, on);
    },
  };
}

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';

  describe(`uvalib-lightbox details stay in the page (${mode})`, () => {
    beforeEach(() => {
      history.replaceState(null, '', location.pathname);
      document.addEventListener('click', cancelNav);
    });
    afterEach(() => {
      document.removeEventListener('click', cancelNav);
      history.replaceState(null, '', location.pathname);
    });

    it('keeps a data-details-id element in the page while shown and restores it exactly', async () => {
      const root = await fixture<HTMLDivElement>(`<div>
        <style>#d-1 .note { color: rgb(1, 2, 3); }</style>
        <uvalib-lightbox ${attr}>
          ${shot('One', 'data-id="1" data-details-id="d-1"')}
          ${shot('Two', 'data-id="2"')}
        </uvalib-lightbox>
        <section id="wrap">
          <p>Before</p>
          <div id="d-1" hidden slot="mine"><p class="note">Note</p><button type="button">Act</button></div>
          <p id="after">After</p>
        </section>
      </div>`);
      const el = root.querySelector('uvalib-lightbox') as UvalibLightbox;
      const d = root.querySelector('#d-1') as HTMLElement;
      const wrap = root.querySelector('#wrap')!;
      let clicks = 0;
      const onPage = (e: Event) => {
        if ((e.target as Element).closest?.('#d-1 button')) clicks++;
      };
      document.addEventListener('click', onPage);
      try {
        await el.updateComplete;
        el.querySelector('a')!.click();
        await settle(el);
        expect(document.getElementById('d-1') === d, 'getElementById finds it').to.equal(true);
        expect(d.getRootNode() === document, 'in the document, not a shadow root').to.equal(true);
        expect(shownInDetails(el, d), 'shown in the details panel').to.equal(true);
        expect(d.hidden).to.equal(false);
        expect(d.getBoundingClientRect().height).to.be.greaterThan(0);
        expect(getComputedStyle(d.querySelector('.note')!).color).to.equal('rgb(1, 2, 3)');
        (d.querySelector('button') as HTMLButtonElement).click();
        expect(clicks, 'the page hears its clicks').to.equal(1);

        const restored = () => {
          expect(d.parentElement === wrap, 'same parent').to.equal(true);
          expect(d.nextElementSibling?.id).to.equal('after');
          expect(d.hidden).to.equal(true);
          expect(d.getAttribute('slot')).to.equal('mine');
          expect(shownInDetails(el, d)).to.equal(false);
        };
        ui(view(el), 'button.next').click();
        await settle(el);
        restored();
        ui(view(el), 'button.prev').click();
        await settle(el);
        expect(shownInDetails(el, d)).to.equal(true);
        ui(view(el), 'button.close').click();
        await settle(el);
        restored();

        el.querySelector('a')!.click();
        await settle(el);
        expect(shownInDetails(el, d)).to.equal(true);
        el.remove();
        restored();
      } finally {
        document.removeEventListener('click', onPage);
      }
    });

    it('restores a details element that had no slot and was not hidden', async () => {
      const root = await fixture<HTMLDivElement>(`<div>
        <uvalib-lightbox ${attr}>${shot('One', 'data-details-id="plain"')}</uvalib-lightbox>
        <div id="plain">Plain</div><span id="tail"></span>
      </div>`);
      const el = root.querySelector('uvalib-lightbox') as UvalibLightbox;
      const d = root.querySelector('#plain') as HTMLElement;
      await el.updateComplete;
      el.querySelector('a')!.click();
      await settle(el);
      expect(shownInDetails(el, d)).to.equal(true);
      ui(view(el), 'button.close').click();
      await settle(el);
      expect(d.parentElement === root).to.equal(true);
      expect(d.nextElementSibling?.id).to.equal('tail');
      expect(d.hasAttribute('slot')).to.equal(false);
      expect(d.hasAttribute('hidden')).to.equal(false);
    });

    it('shows a details element that appears after the viewer opened from the address', async () => {
      history.replaceState(null, '', `${location.pathname}?v=1`);
      const root = await fixture<HTMLDivElement>(`<div>
        <uvalib-lightbox ${attr} url-param="v">
          ${shot('One', 'data-id="1" data-details-id="late"')}${shot('Two', 'data-id="2"')}
        </uvalib-lightbox>
        <div id="holder"></div>
      </div>`);
      const el = root.querySelector('uvalib-lightbox') as UvalibLightbox;
      await settle(el);
      expect(dialogOf(el).open).to.equal(true);
      // A framework renders the details after its fetch.
      const late = document.createElement('div');
      late.id = 'late';
      late.hidden = true;
      late.textContent = 'Late details';
      root.querySelector('#holder')!.append(late);
      await waitUntil(() => shownInDetails(el, late), 'late details shown');
      expect(late.hidden).to.equal(false);
      expect(document.getElementById('late') === late).to.equal(true);
      ui(view(el), 'button.close').click();
      await settle(el);
      expect(late.parentElement?.id).to.equal('holder');
      expect(late.hidden).to.equal(true);
    });

    it('shows a details element that gets its id while its image is open', async () => {
      const root = await fixture<HTMLDivElement>(`<div>
        <uvalib-lightbox ${attr}>${shot('One', 'data-details-id="named"')}</uvalib-lightbox>
        <div id="spot"><p>Unnamed</p></div>
      </div>`);
      const el = root.querySelector('uvalib-lightbox') as UvalibLightbox;
      await el.updateComplete;
      el.querySelector('a')!.click();
      await settle(el);
      const p = root.querySelector('#spot p') as HTMLElement;
      p.id = 'named';
      await waitUntil(() => shownInDetails(el, p), 'shown once named');
      ui(view(el), 'button.close').click();
      await settle(el);
      expect(p.parentElement?.id).to.equal('spot');
    });

    it('shows a slot="details" child added while open, and follows a data-for change', async () => {
      const el = await fixture<UvalibLightbox>(
        `<uvalib-lightbox ${attr}>${shot('One', 'data-id="a"')}${shot('Two', 'data-id="b"')}</uvalib-lightbox>`,
      );
      el.querySelector('a')!.click();
      await settle(el);
      const added = document.createElement('div');
      added.slot = 'details';
      added.dataset.for = 'a';
      added.textContent = 'Added';
      el.append(added);
      await waitUntil(() => shownInDetails(el, added), 'added details shown');
      added.dataset.for = 'b';
      await waitUntil(() => !shownInDetails(el, added), 'hidden for another item');
      expect(added.parentElement === el).to.equal(true);
      ui(view(el), 'button.next').click();
      await settle(el);
      expect(shownInDetails(el, added)).to.equal(true);
    });

    it('does not put back a shown details element the page removed', async () => {
      const root = await fixture<HTMLDivElement>(`<div>
        <uvalib-lightbox ${attr}>${shot('One', 'data-details-id="gone"')}</uvalib-lightbox>
        <div id="home"><div id="gone" hidden>Gone</div></div>
      </div>`);
      const el = root.querySelector('uvalib-lightbox') as UvalibLightbox;
      await el.updateComplete;
      el.querySelector('a')!.click();
      await settle(el);
      const d = root.querySelector('#gone') as HTMLElement;
      expect(shownInDetails(el, d)).to.equal(true);
      d.remove();
      ui(view(el), 'button.close').click();
      await settle(el);
      expect(d.isConnected).to.equal(false);
      expect(root.querySelector('#home')!.children.length).to.equal(0);
    });
  });

  describe(`uvalib-lightbox open() and close() (${mode})`, () => {
    let rec: ReturnType<typeof recordLightbox>;
    let analytics: ReturnType<typeof recordAnalytics>;
    const make = (inner: string, attrs = '') =>
      fixture<UvalibLightbox>(`<uvalib-lightbox ${attr} ${attrs}>${inner}</uvalib-lightbox>`);
    const three = `${shot('One', 'data-id="a"')}${shot('Two', 'data-id="b"')}${shot('Three', 'data-id="c"')}`;

    beforeEach(() => {
      history.replaceState(null, '', location.pathname);
      document.addEventListener('click', cancelNav);
      rec = recordLightbox();
      analytics = recordAnalytics();
    });
    afterEach(() => {
      rec.restore();
      analytics.restore();
      document.removeEventListener('click', cancelNav);
      history.replaceState(null, '', location.pathname);
    });

    it('opens by id or index, returns false for an unknown item, and closes to the link', async () => {
      const el = await make(three);
      expect(el.open('b')).to.equal(true);
      await settle(el);
      expect(dialogOf(el).open).to.equal(true);
      expect(caption(el)).to.equal('Two');
      expect(count(el)).to.equal('2 of 3');
      expect(el.close()).to.equal(true);
      await settle(el);
      expect(dialogOf(el).open).to.equal(false);
      const b = el.querySelector('a[data-id="b"]');
      expect(document.activeElement === b, 'focus on the item link').to.equal(true);
      expect(el.close(), 'already closed').to.equal(false);

      expect(el.open(2)).to.equal(true);
      await settle(el);
      expect(caption(el)).to.equal('Three');
      expect(el.open(0), 'another item while open').to.equal(true);
      await settle(el);
      expect(caption(el)).to.equal('One');
      el.close();
      await settle(el);

      for (const bad of ['nope', 3, -1, 1.5, '']) expect(el.open(bad), String(bad)).to.equal(false);
      await settle(el);
      expect(dialogOf(el).open).to.equal(false);
      expect(analytics.events, 'no analytics for the page’s own calls').to.deep.equal([]);
    });

    it('fires open and close events for the visitor and the API, after the analytics', async () => {
      const el = await make(three);
      el.querySelector('a')!.click();
      await settle(el);
      ui(view(el), 'button.next').click();
      await settle(el);
      ui(view(el), 'button.close').click();
      await settle(el);
      el.open('c');
      await settle(el);
      el.close();
      await settle(el);
      expect(rec.types()).to.deep.equal([
        'uvalib-analytics-event',
        'uvalib-lightbox-open',
        'uvalib-analytics-event',
        'uvalib-lightbox-close',
        'uvalib-lightbox-open',
        'uvalib-lightbox-close',
      ]);
      expect(rec.of('uvalib-lightbox-open')).to.deep.equal([
        { id: 'a', index: 0, restored: false },
        { id: 'c', index: 2, restored: false },
      ]);
      expect(rec.of('uvalib-lightbox-close')).to.deep.equal([
        { id: 'b', index: 1, reason: 'close' },
        { id: 'c', index: 2, reason: 'api' },
      ]);
      const ev = new Promise<Event>((resolve) =>
        el.addEventListener('uvalib-lightbox-open', resolve, { once: true }),
      );
      el.open(0);
      const e = await ev;
      expect(e.bubbles && e.composed).to.equal(true);
      el.close();
    });

    it('moves focus where close({ focus }) says', async () => {
      const root = await fixture<HTMLDivElement>(
        `<div><h1 tabindex="-1">Photos</h1><uvalib-lightbox ${attr}>${three}</uvalib-lightbox></div>`,
      );
      const el = root.querySelector('uvalib-lightbox') as UvalibLightbox;
      await el.updateComplete;
      el.open('a');
      await settle(el);
      const h1 = root.querySelector('h1')!;
      el.close({ focus: h1 });
      await settle(el);
      expect(document.activeElement === h1).to.equal(true);
    });

    it('keeps showing an item whose link is removed, until the page closes it', async () => {
      const root = await fixture<HTMLDivElement>(
        `<div><h1 tabindex="-1">Photos</h1><uvalib-lightbox ${attr} url-param="v">${three}</uvalib-lightbox></div>`,
      );
      const el = root.querySelector('uvalib-lightbox') as UvalibLightbox;
      await el.updateComplete;
      el.open('b');
      await settle(el);
      expect(location.search).to.equal('?v=b');
      el.querySelector('a[data-id="b"]')!.remove();
      await settle(el);
      expect(dialogOf(el).open, 'still open').to.equal(true);
      expect(caption(el)).to.equal('Two');
      expect(count(el)).to.equal('2 of 3');
      expect(location.search, 'still names the item shown').to.equal('?v=b');
      const back = nextPop();
      el.close({ focus: root.querySelector('h1') });
      await back;
      await settle(el);
      expect(location.search).to.equal('');
      expect(document.activeElement === root.querySelector('h1')).to.equal(true);
      expect(rec.of('uvalib-lightbox-close')).to.deep.equal([{ id: 'b', index: 1, reason: 'api' }]);
    });

    it('steps on from a removed item without coming back to it', async () => {
      const el = await make(three, 'url-param="v"');
      el.open('b');
      await settle(el);
      el.querySelector('a[data-id="b"]')!.remove();
      await settle(el);
      ui(view(el), 'button.next').click();
      await settle(el);
      expect(caption(el)).to.equal('Three');
      expect(count(el)).to.equal('2 of 2');
      expect(location.search).to.equal('?v=c');
      ui(view(el), 'button.prev').click();
      await settle(el);
      expect(caption(el)).to.equal('One');
      expect(count(el)).to.equal('1 of 2');
    });

    it('falls back to the first remaining link, else the lightbox, when the trigger is gone', async () => {
      const el = await make(three);
      el.open('a');
      await settle(el);
      el.querySelector('a[data-id="a"]')!.remove();
      await settle(el);
      el.close();
      await settle(el);
      expect(document.activeElement === el.querySelector('a[data-id="b"]')).to.equal(true);

      const one = await make(shot('Only', 'data-id="x"'));
      one.open('x');
      await settle(one);
      one.querySelector('a')!.remove();
      await settle(one);
      // The last image leaving closes the viewer (as before), with nowhere else to go.
      expect(dialogOf(one).open).to.equal(false);
      expect(document.activeElement === one, 'the lightbox itself').to.equal(true);
      expect(one.getAttribute('tabindex')).to.equal('-1');
      expect(rec.of('uvalib-lightbox-close').at(-1)).to.deep.equal({
        id: 'x',
        index: 0,
        reason: 'empty',
      });
      one.blur();
      expect(one.hasAttribute('tabindex'), 'tabindex removed on blur').to.equal(false);
    });

    it('handles url-param history like Close: one entry, Back removed', async () => {
      const el = await make(three, 'url-param="v"');
      const len = history.length;
      el.open('b');
      await settle(el);
      expect(location.search).to.equal('?v=b');
      expect(history.length).to.equal(len + 1);
      el.open('c');
      await settle(el);
      expect(location.search).to.equal('?v=c');
      expect(history.length).to.equal(len + 1);
      const back = nextPop();
      el.close();
      await back;
      await settle(el);
      expect(location.search).to.equal('');
      expect(dialogOf(el).open).to.equal(false);
      el.open('a');
      await settle(el);
      expect(history.length, 'no extra entries').to.equal(len + 1);
      const back2 = nextPop();
      el.close();
      await back2;
    });

    it('fires open with restored: true from the address, and close on Back', async () => {
      history.replaceState(null, '', `${location.pathname}?v=c`);
      const el = await make(three, 'url-param="v"');
      await settle(el);
      expect(dialogOf(el).open).to.equal(true);
      expect(rec.of('uvalib-lightbox-open')).to.deep.equal([{ id: 'c', index: 2, restored: true }]);
      const back = nextPop();
      history.back();
      await back;
      await settle(el);
      expect(rec.of('uvalib-lightbox-close')).to.deep.equal([
        { id: 'c', index: 2, reason: 'history' },
      ]);
      expect(analytics.events).to.deep.equal([]);
    });

    it('has no axe violations after a programmatic open', async () => {
      const el = await make(three);
      el.open(1);
      await settle(el);
      // The fade-in is translucent for 0.15s; contrast is measured once it has finished.
      const panel = view(el).querySelector('.panel')!;
      await Promise.all(panel.getAnimations().map((a) => a.finished));
      await expectNoAxeViolations(el);
      el.close();
    });
  });
}
