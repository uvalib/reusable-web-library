import { expect, fixture, nextFrame, waitUntil } from '@open-wc/testing';
import { sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-lightbox/uvalib-lightbox.js';
import type { UvalibLightbox } from '../src/components/uvalib-lightbox/UvalibLightbox.js';
import {
  hrefWithParam,
  iiifIdentifier,
  paramFromLocation,
  sizedIiifUrl,
  usableImageUrl,
  viewportIiifSize,
} from '../src/components/uvalib-lightbox/media.js';
import { recordAnalytics } from './helpers/analytics.js';
import { expectNoAxeViolations } from './helpers/axe.js';

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4AWP4z8Dwn4Hh/38AD/kD/dtv74kAAAAASUVORK5CYII=';
const IIIF =
  'https://iiif.lib.virginia.edu/iiif/uva-lib:286686/full/!1600,1600/0/default.jpg?page=2';

const view = (el: Element) => (el.shadowRoot ?? el) as ParentNode;
/** `querySelector('button.close')` is an `Element`, which has no `click`. */
const ui = (root: ParentNode, sel: string) => root.querySelector(sel) as HTMLElement;
const dialogOf = (el: Element) => view(el).querySelector('dialog')!;
/** The image in the dialog. `querySelector('img')` on the host also matches the thumbnail. */
const dialogImg = (el: Element) => dialogOf(el).querySelector('img');
const focused = (el: Element): Element | null =>
  el.shadowRoot?.activeElement ?? document.activeElement;

function shot(caption: string, extra = '', href = PNG): string {
  return `<a href="${href}" data-caption="${caption}" ${extra}><img alt="${caption}" width="80" height="48"></a>`;
}

async function warnings(fn: () => Promise<void>): Promise<string[]> {
  const orig = console.warn;
  const warns: string[] = [];
  console.warn = (...a: unknown[]) => void warns.push(a.join(' '));
  try {
    await fn();
  } finally {
    console.warn = orig;
  }
  return warns;
}

function nextPop(): Promise<void> {
  return new Promise((resolve) =>
    window.addEventListener('popstate', () => resolve(), { once: true }),
  );
}

/** Remember http(s) image URLs and load a local image instead, so a test never fetches them. */
function stubNetworkImages(): { assigned: (img: HTMLImageElement) => string; restore: () => void } {
  const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')!;
  const assigned = new WeakMap<HTMLImageElement, string>();
  const origSet = HTMLImageElement.prototype.setAttribute;
  const remember = (img: HTMLImageElement, value: string) => {
    assigned.set(img, value);
    if (/^https?:/i.test(value)) desc.set!.call(img, PNG);
    else desc.set!.call(img, value);
  };
  HTMLImageElement.prototype.setAttribute = function (name: string, value: string) {
    if (name === 'src') {
      remember(this, value);
      return;
    }
    return origSet.call(this, name, value);
  };
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true,
    enumerable: true,
    get() {
      return assigned.get(this) ?? desc.get!.call(this);
    },
    set(value: string) {
      remember(this, String(value));
    },
  });
  return {
    assigned: (img) => assigned.get(img) ?? '',
    restore() {
      Object.defineProperty(HTMLImageElement.prototype, 'src', desc);
      HTMLImageElement.prototype.setAttribute = origSet;
    },
  };
}

describe('lightbox URLs', () => {
  const base = 'https://library.example/text/d9/';

  it('rewrites a IIIF Image API URL to /full/!w,h/ and keeps the query', () => {
    expect(iiifIdentifier(IIIF, base)).to.equal('uva-lib:286686');
    const sized = sizedIiifUrl(IIIF, base, 640.4, 480.6)!;
    const url = new URL(sized);
    expect(url.pathname).to.equal('/iiif/uva-lib:286686/full/!640,481/0/default.jpg');
    expect(url.search).to.equal('?page=2');
    expect(sized).to.not.include('!1600,1600');
  });

  it('leaves an ordinary image, including one under a /full/ folder, alone', () => {
    expect(sizedIiifUrl('/photos/full/page.jpg', base, 100, 100)).to.equal(null);
    expect(sizedIiifUrl(PNG, base, 100, 100)).to.equal(null);
    expect(usableImageUrl(PNG, base)).to.equal(true);
    expect(usableImageUrl('/photos/full/page.jpg', base)).to.equal(true);
    expect(usableImageUrl('javascript:alert(1)', base)).to.equal(false);
  });

  it('writes the deep-link param in the search, or in the hash on a hash route', () => {
    expect(hrefWithParam({ pathname: '/t', search: '', hash: '#section' }, 'photo', '2')).to.equal(
      '/t?photo=2#section',
    );
    expect(hrefWithParam({ pathname: '/t', search: '?q=1', hash: '' }, 'photo', null)).to.equal(
      '/t?q=1',
    );
    const hash = { pathname: '/t', search: '?q=1', hash: '#/text/d9' };
    expect(hrefWithParam(hash, 'photo', 'uva-lib:286686')).to.equal(
      '/t?q=1#/text/d9?photo=uva-lib%3A286686',
    );
    expect(paramFromLocation({ ...hash, hash: '#/text/d9?photo=2' }, 'photo')).to.equal('2');
    expect(hrefWithParam({ ...hash, hash: '#/text/d9?photo=2' }, 'photo', null)).to.equal(
      '/t?q=1#/text/d9',
    );
  });

  it('caps the IIIF request at 2000 device pixels and twice the screen density', () => {
    expect(
      viewportIiifSize({ innerWidth: 5000, innerHeight: 10, devicePixelRatio: 4 }),
    ).to.deep.equal({ w: 2000, h: 20 });
  });
});

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-lightbox (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = (inner: string, attrs = '') =>
      fixture<UvalibLightbox>(`<uvalib-lightbox ${attr} ${attrs}>${inner}</uvalib-lightbox>`);
    let rec: ReturnType<typeof recordAnalytics>;

    beforeEach(() => {
      rec = recordAnalytics();
      history.replaceState(null, '', location.pathname);
      document.addEventListener('click', cancelNav);
    });
    afterEach(() => {
      rec.restore();
      document.removeEventListener('click', cancelNav);
      history.replaceState(null, '', location.pathname);
    });

    it('opens a dialog named by the caption, focuses Close, and returns focus on close', async () => {
      const el = await make(`${shot('Page 2', 'data-id="p2"')}${shot('Page 3', 'data-id="p3"')}`);
      await el.updateComplete;
      expect(rec.events, 'reported on render').to.deep.equal([]);
      expect(dialogOf(el).open).to.equal(false);
      const trigger = el.querySelector('a')!;
      trigger.click();
      await el.updateComplete;
      await nextFrame();
      const dialog = dialogOf(el);
      expect(dialog.open).to.equal(true);
      const caption = view(el).querySelector('.caption')!;
      expect(caption.textContent).to.equal('Page 2');
      expect(dialog.getAttribute('aria-labelledby')).to.equal(caption.id);
      expect(focused(el)).to.equal(view(el).querySelector('button.close'));
      expect(dialogImg(el)!.getAttribute('alt')).to.equal('Page 2');
      expect(view(el).querySelector('.count')!.textContent).to.equal('1 of 2');
      expect(view(el).querySelector('.count')!.getAttribute('aria-live')).to.equal('polite');
      for (const sel of ['button.close', 'button.prev', 'button.next', 'a.full']) {
        const box = view(el).querySelector(sel)!.getBoundingClientRect();
        expect(box.width, sel).to.be.at.least(44);
        expect(box.height, sel).to.be.at.least(44);
      }
      const full = ui(view(el), 'a.full');
      expect(full.getAttribute('href')).to.equal(PNG);
      expect(full.getAttribute('target')).to.equal('_blank');
      expect(full.getAttribute('rel')).to.include('noopener');
      expect(full.textContent).to.include('Full size');
      expect(full.textContent).to.include('opens in a new tab');
      ui(view(el), 'button.close').click();
      await el.updateComplete;
      await nextFrame();
      expect(dialog.open).to.equal(false);
      expect(document.activeElement === trigger, 'focus returns to the trigger').to.equal(true);
    });

    it('uses data-caption, then alt, then the link text, then the title', async () => {
      const el = await make(`
        <a href="${PNG}" data-caption="Caption" title="Title">Words<img alt="Alt" width="80" height="48"></a>
        <a href="${PNG}" title="Title">Words<img alt="Alt" width="80" height="48"></a>
        <a href="${PNG}" title="Title">Words<img alt="" width="80" height="48"></a>
        <a href="${PNG}" title="Title"><img alt="" width="80" height="48"></a>
        <a href="${PNG}"><img alt="" width="80" height="48"></a>
      `);
      const open = async (i: number) => {
        el.querySelectorAll('a')[i]!.click();
        await el.updateComplete;
      };
      await open(0);
      expect(view(el).querySelector('.caption')!.textContent).to.equal('Caption');
      expect(dialogImg(el)!.getAttribute('alt')).to.equal('Alt');
      await open(1);
      expect(view(el).querySelector('.caption')!.textContent).to.equal('Alt');
      await open(2);
      expect(view(el).querySelector('.caption')!.textContent).to.equal('Words');
      await open(3);
      expect(view(el).querySelector('.caption')!.textContent).to.equal('Title');
      await open(4);
      expect(view(el).querySelector('.caption')!.textContent).to.equal('Image');
      expect(dialogImg(el)!.getAttribute('alt')).to.equal('Image');
    });

    it('steps with buttons and arrow keys, wraps, and swaps the arrows in RTL', async () => {
      const el = await make(`${shot('One')}${shot('Two')}${shot('Three')}`);
      el.querySelector('a')!.click();
      await el.updateComplete;
      ui(view(el), 'button.next').click();
      await el.updateComplete;
      expect(view(el).querySelector('.caption')!.textContent).to.equal('Two');
      expect(view(el).querySelector('.count')!.textContent).to.equal('2 of 3');
      dialogOf(el).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      await el.updateComplete;
      expect(view(el).querySelector('.caption')!.textContent).to.equal('Three');
      dialogOf(el).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      await el.updateComplete;
      expect(view(el).querySelector('.caption')!.textContent).to.equal('One');
      dialogOf(el).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
      );
      await el.updateComplete;
      expect(view(el).querySelector('.caption')!.textContent).to.equal('Three');

      el.dir = 'rtl';
      dialogOf(el).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
      );
      await el.updateComplete;
      expect(view(el).querySelector('.caption')!.textContent).to.equal('One');
      expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
        ['uvalib-lightbox', 'open', 'image 1', 1],
        ['uvalib-lightbox', 'next', 'image 2', 2],
        ['uvalib-lightbox', 'next', 'image 3', 3],
        ['uvalib-lightbox', 'next', 'image 1', 1],
        ['uvalib-lightbox', 'previous', 'image 3', 3],
        ['uvalib-lightbox', 'next', 'image 1', 1],
      ]);
    });

    it('hides previous, next and the counter when there is one image', async () => {
      const el = await make(shot('Only'));
      el.querySelector('a')!.click();
      await el.updateComplete;
      expect(view(el).querySelector('button.prev')).to.equal(null);
      expect(view(el).querySelector('button.next')).to.equal(null);
      expect(view(el).querySelector('.count')).to.equal(null);
      dialogOf(el).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      await el.updateComplete;
      expect(view(el).querySelector('.caption')!.textContent).to.equal('Only');
      expect(rec.of('uvalib-analytics-event')).to.have.length(1);
    });

    it('closes on Escape and on the backdrop, and not on a click inside the panel', async () => {
      const el = await make(shot('Page'));
      const trigger = el.querySelector('a')!;
      trigger.click();
      await el.updateComplete;
      await nextFrame();
      view(el)
        .querySelector('.panel')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(dialogOf(el).open).to.equal(true);
      dialogOf(el).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await el.updateComplete;
      expect(dialogOf(el).open).to.equal(false);
      expect(document.activeElement).to.equal(trigger);

      trigger.click();
      await el.updateComplete;
      await nextFrame();
      const active = focused(el);
      expect(active?.classList.contains('close') ?? false, 'Close is focused').to.equal(true);
      await sendKeys({ press: 'Escape' });
      await el.updateComplete;
      expect(dialogOf(el).open).to.equal(false);
      expect(document.activeElement).to.equal(trigger);
    });

    it('ignores a modified click and does not open the same image twice', async () => {
      const el = await make(
        `${shot('One', 'data-id="1"')}${shot('Two', 'data-id="2"')}`,
        'url-param="photo"',
      );
      const link = el.querySelector('a')!;
      let prevented = true;
      link.addEventListener('click', (e) => {
        prevented = e.defaultPrevented;
      });
      link.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true, cancelable: true, metaKey: true }),
      );
      await el.updateComplete;
      expect(prevented).to.equal(false);
      expect(dialogOf(el).open).to.equal(false);
      expect(location.search).to.equal('');

      // pushState drops entries after the current one, so a push only grows
      // history.length when this document is already the tip of the stack.
      history.pushState(null, '', location.pathname);
      const before = history.length;
      link.click();
      await el.updateComplete;
      link.click();
      await el.updateComplete;
      expect(history.length).to.equal(before + 1);
      expect(rec.of('uvalib-analytics-event')).to.have.length(1);
      el.querySelectorAll('a')[1]!.click();
      await el.updateComplete;
      expect(history.length).to.equal(before + 1);
      expect(new URLSearchParams(location.search).get('photo')).to.equal('2');
      expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
        ['uvalib-lightbox', 'open', 'image 1', 1],
        ['uvalib-lightbox', 'open', 'image 2', 2],
      ]);
    });

    it('keeps ?photo= in sync: push on open, replace on step, Back closes, Forward returns', async () => {
      const el = await make(
        `${shot('One', 'data-id="1"')}${shot('Two', 'data-id="2"')}`,
        'url-param="photo"',
      );
      el.querySelector('a')!.click();
      await el.updateComplete;
      expect(location.search).to.equal('?photo=1');
      const len = history.length;
      ui(view(el), 'button.next').click();
      await el.updateComplete;
      expect(location.search).to.equal('?photo=2');
      expect(history.length).to.equal(len);

      const closed = nextPop();
      ui(view(el), 'button.close').click();
      await closed;
      await el.updateComplete;
      expect(dialogOf(el).open).to.equal(false);
      expect(location.search).to.equal('');

      const opened = nextPop();
      history.forward();
      await opened;
      await el.updateComplete;
      await nextFrame();
      expect(dialogOf(el).open).to.equal(true);
      expect(view(el).querySelector('.caption')!.textContent).to.equal('Two');
      expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
        ['uvalib-lightbox', 'open', 'image 1', 1],
        ['uvalib-lightbox', 'next', 'image 2', 2],
      ]);
    });

    it('opens from the URL without analytics, and Back stays on this page', async () => {
      history.replaceState(null, '', `${location.pathname}?photo=2`);
      const el = await make(
        `${shot('One', 'data-id="1"')}${shot('Two', 'data-id="2"')}`,
        'url-param="photo"',
      );
      await el.updateComplete;
      await nextFrame();
      expect(dialogOf(el).open).to.equal(true);
      expect(view(el).querySelector('.caption')!.textContent).to.equal('Two');
      expect(rec.events).to.deep.equal([]);
      const back = nextPop();
      history.back();
      await back;
      await el.updateComplete;
      expect(dialogOf(el).open).to.equal(false);
      expect(location.pathname).to.equal(new URL(document.baseURI).pathname);
      expect(location.search).to.equal('');
    });

    it('puts the param in the hash on a hash route', async () => {
      history.replaceState(null, '', `${location.pathname}#/text/d9`);
      const el = await make(shot('Page', 'data-id="p2"'), 'url-param="photo"');
      el.querySelector('a')!.click();
      await el.updateComplete;
      expect(location.search).to.equal('');
      expect(location.hash).to.equal('#/text/d9?photo=p2');
      expect(location.hash).to.not.include('%3F');
    });

    it('does not reopen from a mutation after the visitor closes', async () => {
      const el = await make(shot('Page', 'data-id="1"'), 'url-param="photo"');
      const link = el.querySelector('a')!;
      link.click();
      await el.updateComplete;
      const back = nextPop();
      ui(view(el), 'button.close').click();
      expect(dialogOf(el).open).to.equal(false);
      link.setAttribute('data-caption', 'Edited');
      await el.updateComplete;
      await nextFrame();
      expect(dialogOf(el).open).to.equal(false);
      await back;
      await el.updateComplete;
      expect(dialogOf(el).open).to.equal(false);
    });

    it('shows slot details for the open image and moves data-details-id in and back', async () => {
      const root = await fixture<HTMLDivElement>(`<div>
        <uvalib-lightbox ${attr}>
          ${shot('One', 'data-id="a"')}
          ${shot('Two', 'data-id="b" data-details-id="ext"')}
          <div slot="details" hidden>Shared</div>
          <div slot="details" data-for="a" hidden>Only A</div>
        </uvalib-lightbox>
        <p id="ext" hidden>External note</p>
      </div>`);
      const el = root.querySelector('uvalib-lightbox')!;
      await (el as UvalibLightbox).updateComplete;
      const box = () => view(el).querySelector('.details')!;
      root.querySelector('a')!.click();
      await (el as UvalibLightbox).updateComplete;
      await nextFrame();
      expect(box().textContent).to.include('Shared');
      expect(box().textContent).to.include('Only A');
      expect(box().textContent).to.not.include('External');
      expect(ui(box(), '[slot="details"]').hidden).to.equal(false);
      ui(view(el), 'button.next').click();
      await (el as UvalibLightbox).updateComplete;
      await nextFrame();
      expect(box().textContent).to.include('Shared');
      expect(box().textContent).to.include('External note');
      expect(box().textContent).to.not.include('Only A');
      expect(view(el).querySelector('#ext')!.parentElement).to.equal(box());
      const input = document.createElement('input');
      box().append(input);
      input.focus();
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
      await (el as UvalibLightbox).updateComplete;
      expect(view(el).querySelector('.caption')!.textContent).to.equal('Two');
      ui(view(el), 'button.close').click();
      await (el as UvalibLightbox).updateComplete;
      const ext = ui(root, '#ext');
      expect(ext.parentElement).to.equal(root);
      expect(ext.hidden).to.equal(true);
      const only = root.querySelector('[data-for="a"]')!;
      expect(only.parentElement).to.equal(el);
      expect((only as HTMLElement).hidden).to.equal(true);
    });

    it('announces loading and a broken image, and refuses a javascript URL', async () => {
      const held = holdImages();
      try {
        const el = await make(shot('Wait', '', 'https://images.example/wait.jpg'));
        el.querySelector('a')!.click();
        await el.updateComplete;
        await nextFrame();
        const img = dialogImg(el)!;
        expect(img.getAttribute('aria-busy')).to.equal('true');
        expect(view(el).querySelector('.status')!.textContent).to.equal('Loading image.');
        expect(view(el).querySelector('.status')!.getAttribute('role')).to.equal('status');
        expect(held.assigned(img)).to.include('https://images.example/wait.jpg');
        img.dispatchEvent(new Event('load'));
        await el.updateComplete;
        expect(view(el).querySelector('.status')!.textContent).to.equal('');
      } finally {
        held.restore();
      }

      const broken = await make(
        `<a href="data:image/jpeg;base64,aaaa" data-caption="Broken"><img alt="Broken" width="2" height="1"></a>`,
      );
      broken.querySelector('a')!.click();
      await waitUntil(
        () =>
          view(broken).querySelector('.status')!.textContent === 'This image could not be loaded.',
      );

      const bad = await make(`<a href="javascript:void(0)" data-caption="Bad"><img alt="Bad"></a>`);
      bad.querySelector('a')!.click();
      await bad.updateComplete;
      expect(dialogImg(bad)).to.equal(null);
      expect(view(bad).querySelector('.status')!.textContent).to.equal(
        'This image could not be loaded.',
      );
      expect(view(bad).querySelector('a.full')).to.equal(null);
    });

    it('requests a IIIF image at the viewport size and again on resize, without a new event', async () => {
      const net = stubNetworkImages();
      try {
        const el = await make(shot('Page', 'data-id="uva"', IIIF));
        el.querySelector('a')!.click();
        await el.updateComplete;
        await nextFrame();
        const img = dialogImg(el)!;
        const { w, h } = viewportIiifSize(window);
        expect(net.assigned(img)).to.equal(sizedIiifUrl(IIIF, document.baseURI, w, h));
        expect(ui(view(el), 'a.full').getAttribute('href')).to.equal(IIIF);
        const before = rec.of('uvalib-analytics-event').length;
        await setViewport({ width: 500, height: 400 });
        window.dispatchEvent(new Event('resize'));
        await new Promise((r) => setTimeout(r, 200));
        await el.updateComplete;
        const next = viewportIiifSize(window);
        expect(net.assigned(dialogImg(el)!)).to.equal(
          sizedIiifUrl(IIIF, document.baseURI, next.w, next.h),
        );
        expect(rec.of('uvalib-analytics-event')).to.have.length(before);
      } finally {
        net.restore();
        await setViewport({ width: 800, height: 600 });
      }
    });

    it('enhances links matched by selector, in document order, and skips another lightbox', async () => {
      const root = await fixture<HTMLDivElement>(`<div>
        <a class="decoy" href="${PNG}">Leave</a>
        <a class="pb-image" href="${PNG}" data-caption="Outside"><img alt="Outside" width="2" height="1"></a>
        <uvalib-lightbox ${attr} selector="a.pb-image">
          <a class="pb-image" href="${PNG}" data-caption="Inside"><img alt="Inside" width="2" height="1"></a>
          <uvalib-lightbox>
            <a class="pb-image" href="${PNG}" data-caption="Nested"><img alt="Nested" width="2" height="1"></a>
          </uvalib-lightbox>
        </uvalib-lightbox>
      </div>`);
      const boxes = [...root.querySelectorAll('uvalib-lightbox')] as UvalibLightbox[];
      const outer = boxes[0]!;
      const inner = boxes[1]!;
      await outer.updateComplete;
      await inner.updateComplete;
      ui(root, 'a.decoy').click();
      await outer.updateComplete;
      expect(dialogOf(outer).open).to.equal(false);
      ui(root, 'a.pb-image').click();
      await outer.updateComplete;
      expect(view(outer).querySelector('.caption')!.textContent).to.equal('Outside');
      expect(view(outer).querySelector('.count')!.textContent).to.equal('1 of 2');
      expect(dialogOf(inner).open).to.equal(false);
      ui(view(outer), 'button.close').click();
      await outer.updateComplete;
      inner.querySelector('a')!.click();
      await inner.updateComplete;
      expect(dialogOf(inner).open).to.equal(true);
      expect(dialogOf(outer).open).to.equal(false);
      expect(view(inner).querySelector('.caption')!.textContent).to.equal('Nested');
    });

    it('warns once about a selector that is not valid CSS', async () => {
      const warns = await warnings(async () => {
        const el = await make('', 'selector="["');
        await el.updateComplete;
        el.selector = '[';
        await el.updateComplete;
      });
      expect(warns).to.have.length(1);
      expect(warns[0]).to.include('uvalib-lightbox');
    });

    it('reports nothing with no-analytics', async () => {
      const el = await make(shot('Page'), 'no-analytics');
      el.querySelector('a')!.click();
      await el.updateComplete;
      ui(view(el), 'a.full').click();
      expect(rec.events).to.deep.equal([]);
    });

    it('uses the focus and surface tokens', async () => {
      const el = await make(shot('Page'));
      el.style.setProperty('--uva-color-accent-bg', 'rgb(1, 2, 3)');
      el.querySelector('a')!.click();
      await el.updateComplete;
      await nextFrame();
      expect(getComputedStyle(ui(view(el), 'button.close')).backgroundColor).to.equal(
        'rgb(1, 2, 3)',
      );
    });

    it('has no axe violations closed or open', async () => {
      const el = await make(`${shot('One')}${shot('Two')}`);
      await expectNoAxeViolations(el);
      el.querySelector('a')!.click();
      await el.updateComplete;
      await nextFrame();
      await expectNoAxeViolations(el);
    });

    it('keeps 44px controls with no-style', async () => {
      const el = await make(`${shot('One')}${shot('Two')}`, 'no-style');
      el.querySelector('a')!.click();
      await el.updateComplete;
      await nextFrame();
      const box = ui(view(el), 'button.close').getBoundingClientRect();
      expect(box.width).to.be.at.least(44);
      expect(box.height).to.be.at.least(44);
      expect(getComputedStyle(el).display).to.equal('block');
    });
  });
}

/** Record the URL and do not load it, so the image stays in the loading state. */
function holdImages(): { assigned: (img: HTMLImageElement) => string; restore: () => void } {
  const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')!;
  const assigned = new WeakMap<HTMLImageElement, string>();
  const origSet = HTMLImageElement.prototype.setAttribute;
  HTMLImageElement.prototype.setAttribute = function (name: string, value: string) {
    if (name === 'src') {
      assigned.set(this, value);
      return;
    }
    return origSet.call(this, name, value);
  };
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true,
    enumerable: true,
    get() {
      return assigned.get(this) ?? '';
    },
    set(value: string) {
      assigned.set(this, String(value));
    },
  });
  return {
    assigned: (img) => assigned.get(img) ?? '',
    restore() {
      Object.defineProperty(HTMLImageElement.prototype, 'src', desc);
      HTMLImageElement.prototype.setAttribute = origSet;
    },
  };
}

function cancelNav(e: Event): void {
  if (e.composedPath().some((n) => n instanceof HTMLAnchorElement)) e.preventDefault();
}
