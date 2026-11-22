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

  it('rewrites a IIIF size to !w,h and keeps the region and the query', () => {
    expect(iiifIdentifier(IIIF, base)).to.equal('uva-lib:286686');
    const sized = sizedIiifUrl(IIIF, base, 640.4, 480.6)!;
    const url = new URL(sized);
    expect(url.pathname).to.equal('/iiif/uva-lib:286686/full/!640,481/0/default.jpg');
    expect(url.search).to.equal('?page=2');
    expect(sized).to.not.include('!1600,1600');
    const cropped =
      'https://iiif.lib.virginia.edu/iiif/uva-lib:286686/100,200,300,400/800,/90/default.jpg';
    expect(new URL(sizedIiifUrl(cropped, base, 640, 480)!).pathname).to.equal(
      '/iiif/uva-lib:286686/100,200,300,400/!640,480/90/default.jpg',
    );
    const square = 'https://iiif.example/iiif/id/square/full/0/default.png';
    expect(new URL(sizedIiifUrl(square, base, 100, 80)!).pathname).to.equal(
      '/iiif/id/square/!100,80/0/default.png',
    );
  });

  it('leaves TIFF and JPEG2000 IIIF URLs unchanged', () => {
    const tif = 'https://iiif.example/iiif/id/full/full/0/default.tif';
    const tiff = 'https://iiif.example/iiif/id/full/full/0/default.tiff';
    const jp2 = 'https://iiif.example/iiif/id/square/200,/0/default.jp2';
    expect(sizedIiifUrl(tif, base, 100, 100)).to.equal(null);
    expect(sizedIiifUrl(tiff, base, 100, 100)).to.equal(null);
    expect(sizedIiifUrl(jp2, base, 100, 100)).to.equal(null);
    expect(iiifIdentifier(tif, base)).to.equal('id');
    expect(iiifIdentifier(jp2, base)).to.equal('id');
  });

  it('offers full size only for http(s) and PNG, JPEG, GIF or WebP data images', () => {
    expect(usableImageUrl('data:image/png;base64,aa', base)).to.equal(true);
    expect(usableImageUrl('data:IMAGE/JPEG;base64,aa', base)).to.equal(true);
    expect(usableImageUrl('data:image/gif,xx', base)).to.equal(true);
    expect(usableImageUrl('data:image/webp;base64,aa', base)).to.equal(true);
    expect(
      usableImageUrl('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"></svg>', base),
    ).to.equal(false);
    expect(usableImageUrl('data:image/svg+xml;base64,PHN2Zz4=', base)).to.equal(false);
    expect(usableImageUrl('data:image/jpg;base64,aa', base)).to.equal(false);
    expect(usableImageUrl('data:image/avif;base64,aa', base)).to.equal(false);
    expect(usableImageUrl('data:image/bmp;base64,aa', base)).to.equal(false);
    expect(usableImageUrl('https://images.example/page.svg', base)).to.equal(true);
  });

  it('keeps a hash query in the hash after the parameter is removed and written again', () => {
    const start = { pathname: '/t', search: '', hash: '#chapter?photo=1' };
    const stripped = hrefWithParam(start, 'photo', null);
    expect(stripped).to.equal('/t#chapter');
    const again = { pathname: '/t', search: '', hash: '#chapter' };
    expect(hrefWithParam(again, 'photo', '1', true)).to.equal('/t#chapter?photo=1');
    const bare = { pathname: '/t', search: '', hash: '#?photo=1' };
    expect(hrefWithParam(bare, 'photo', null)).to.equal('/t#');
    expect(hrefWithParam({ pathname: '/t', search: '', hash: '#' }, 'photo', '1', true)).to.equal(
      '/t#?photo=1',
    );
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
      expect(focused(el) === view(el).querySelector('button.close'), 'Close is focused').to.equal(
        true,
      );
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
      expect(document.activeElement === trigger, 'backdrop returns focus').to.equal(true);

      trigger.click();
      await el.updateComplete;
      await nextFrame();
      const active = focused(el);
      expect(active?.classList.contains('close') ?? false, 'Close is focused').to.equal(true);
      await sendKeys({ press: 'Escape' });
      await el.updateComplete;
      expect(dialogOf(el).open).to.equal(false);
      expect(document.activeElement === trigger, 'Escape returns focus').to.equal(true);
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
      expect(box().textContent).to.not.include('Only A');
      // Shadow mode slots it from the lightbox's light DOM (issue #27); light DOM moves it in.
      const ext0 = ui(root, '#ext');
      const shown = mode === 'shadow' ? box().contains(ext0.assignedSlot) : box().contains(ext0);
      expect(shown, 'external details shown').to.equal(true);
      expect(ext0.hidden).to.equal(false);
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

    it('restores adjacent details on close and can open again', async () => {
      const el = await make(
        `${shot('One', 'data-id="a"')}${shot('Two', 'data-id="b"')}` +
          '<div slot="details">Shared</div><div slot="details" data-for="a">Only A</div>',
      );
      el.querySelector('a')!.click();
      await el.updateComplete;
      await nextFrame();
      ui(view(el), 'button.next').click();
      await el.updateComplete;
      ui(view(el), 'button.close').click();
      await el.updateComplete;
      expect(dialogOf(el).open, 'closed').to.equal(false);
      const details = [...el.querySelectorAll('[slot="details"]')].map((n) => n.textContent);
      expect(details).to.deep.equal(['Shared', 'Only A']);
      el.querySelectorAll('a')[1]!.click();
      await el.updateComplete;
      await nextFrame();
      expect(dialogOf(el).open, 'opened again').to.equal(true);
    });

    it('opens again after a DOM move, and Escape still closes it', async () => {
      history.replaceState(null, '', `${location.pathname}?photo=1`);
      const el = await make(
        `${shot('Page', 'data-id="1"')}<div slot="details">Note</div>`,
        'url-param="photo"',
      );
      await el.updateComplete;
      await nextFrame();
      expect(dialogOf(el).open, 'opened from the URL').to.equal(true);
      const parent = document.createElement('div');
      document.body.append(parent);
      const trigger = el.querySelector('a')!;
      parent.append(el);
      await el.updateComplete;
      await nextFrame();
      expect(dialogOf(el).open, 'opened again after the move').to.equal(true);
      const back = nextPop();
      await sendKeys({ press: 'Escape' });
      await el.updateComplete;
      expect(dialogOf(el).open, 'Escape closed it').to.equal(false);
      expect(el.querySelector('[slot="details"]')!.parentElement, 'details restored').to.equal(el);
      expect(focused(el) === trigger, 'focus returns to the trigger').to.equal(true);
      await back;
      parent.remove();
    });

    it('does not restyle thumbnails, buttons, or closed details', async () => {
      const el = await make(
        `<a href="${PNG}"><img alt="Thumb" src="${PNG}" width="80" height="48"></a>` +
          '<button type="button">Label</button><p slot="details">On the page</p>',
      );
      const img = el.querySelector('img')!;
      const button = el.querySelector('button')!;
      const details = el.querySelector('[slot="details"]')!;
      expect(img.getBoundingClientRect().width, 'thumbnail width').to.be.closeTo(80, 1);
      expect(getComputedStyle(button).backgroundColor).to.not.equal('rgb(35, 45, 75)');
      if (mode === 'no-shadow-dom') {
        expect(getComputedStyle(details).display).to.equal('none');
      } else {
        expect(view(el).querySelector('slot[name="details"]')!.hasAttribute('hidden')).to.equal(
          true,
        );
      }
    });

    it('paints the backdrop from the shadow token and details links from the link token', async () => {
      const el = await make(`${shot('One')}<div slot="details"><a href="${PNG}">Rights</a></div>`);
      el.style.setProperty('--uva-color-text', '#e8e8e8');
      el.style.setProperty('--uva-color-shadow', 'rgba(0, 0, 0, 0.6)');
      el.style.setProperty('--uva-color-link', 'rgb(135, 185, 217)');
      el.style.setProperty('--uva-color-surface-raised', '#232d4b');
      el.querySelector('a')!.click();
      await el.updateComplete;
      await nextFrame();
      expect(getComputedStyle(dialogOf(el), '::backdrop').backgroundColor).to.equal(
        'rgba(0, 0, 0, 0.6)',
      );
      const link = view(el).querySelector('.details a')!;
      expect(getComputedStyle(link).color).to.equal('rgb(135, 185, 217)');
    });

    it('keeps a hash query in the hash when opening from the URL', async () => {
      history.replaceState(null, '', `${location.pathname}#chapter?photo=1`);
      const el = await make(shot('Page', 'data-id="1"'), 'url-param="photo"');
      await el.updateComplete;
      await nextFrame();
      expect(dialogOf(el).open).to.equal(true);
      expect(location.search).to.equal('');
      expect(location.hash).to.equal('#chapter?photo=1');
    });

    it('stays open when another image is chosen before Back finishes', async () => {
      history.pushState(null, '', location.pathname);
      const el = await make(
        `${shot('One', 'data-id="1"')}${shot('Two', 'data-id="2"')}`,
        'url-param="photo"',
      );
      const links = el.querySelectorAll('a');
      links[0]!.click();
      await el.updateComplete;
      const back = nextPop();
      ui(view(el), 'button.close').click();
      links[1]!.click();
      await back;
      await el.updateComplete;
      await nextFrame();
      expect(dialogOf(el).open, 'still open').to.equal(true);
      expect(view(el).querySelector('.caption')!.textContent).to.equal('Two');
      expect(location.search).to.equal('?photo=2');
    });

    it('Escape closes a viewer that was reopened before the next frame', async () => {
      const el = await make(`${shot('One')}<div slot="details">Note</div>`);
      const trigger = el.querySelector('a')!;
      trigger.click();
      await el.updateComplete;
      await nextFrame();
      ui(view(el), 'button.close').click();
      trigger.click();
      await el.updateComplete;
      dialogOf(el).close();
      await el.updateComplete;
      expect(dialogOf(el).open).to.equal(false);
      expect(el.querySelector('[slot="details"]')!.parentElement).to.equal(el);
      expect(focused(el) === trigger, 'focus returns to the trigger').to.equal(true);
    });

    it('does not pull focus back to Close on the frame after open', async () => {
      const el = await make(shot('One'));
      el.querySelector('a')!.click();
      await el.updateComplete;
      // The open dialog is modal, so a control outside it cannot take focus. Full size can.
      const full = ui(view(el), 'a.full');
      full.focus();
      await nextFrame();
      expect(focused(el) === full, 'focus stays where it was moved').to.equal(true);
    });

    it('drops the deep link when the last image is removed and does not reopen', async () => {
      history.replaceState(null, '', `${location.pathname}?photo=1`);
      const el = await make(shot('One', 'data-id="1"'), 'url-param="photo"');
      await el.updateComplete;
      await nextFrame();
      expect(dialogOf(el).open).to.equal(true);
      el.querySelector('a')!.remove();
      await nextFrame();
      await el.updateComplete;
      expect(dialogOf(el).open, 'closed').to.equal(false);
      expect(location.search, 'param cleared').to.equal('');
      const again = document.createElement('a');
      again.href = PNG;
      again.dataset.id = '1';
      again.dataset.caption = 'Again';
      again.innerHTML = '<img alt="Again" width="2" height="1">';
      el.append(again);
      await nextFrame();
      await el.updateComplete;
      expect(dialogOf(el).open, 'stays closed').to.equal(false);
    });

    it('does not show an SVG data URL or rewrite a TIFF IIIF image', async () => {
      const svg = await make(
        '<a href="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3C%2Fsvg%3E" data-caption="Mark"><img alt="Mark" width="2" height="1"></a>',
      );
      svg.querySelector('a')!.click();
      await svg.updateComplete;
      expect(dialogImg(svg)).to.equal(null);
      expect(view(svg).querySelector('a.full')).to.equal(null);

      const net = stubNetworkImages();
      try {
        const tif = 'https://iiif.example/iiif/id/100,0,50,50/full/0/default.tif';
        const el = await make(shot('Scan', 'data-id="scan"', tif));
        el.querySelector('a')!.click();
        await el.updateComplete;
        await nextFrame();
        expect(net.assigned(dialogImg(el)!)).to.equal(tif);
        expect(ui(view(el), 'a.full').getAttribute('href')).to.equal(tif);
      } finally {
        net.restore();
      }
    });

    it('ignores hidden links and links inside a details element', async () => {
      const root = await fixture<HTMLDivElement>(`<div>
        <uvalib-lightbox ${attr}>
          <div id="more"><a href="${PNG}" data-caption="Inside">Details link</a><p>Note</p></div>
          ${shot('One', 'data-id="a"')}
          <a href="${PNG}" hidden data-caption="Hidden"><img alt="Hidden" width="2" height="1"></a>
          ${shot('Two', 'data-id="b" data-details-id="more"')}
        </uvalib-lightbox>
      </div>`);
      const el = root.querySelector('uvalib-lightbox') as UvalibLightbox;
      await el.updateComplete;
      // The details link is first in the document. Counting it would make this open "image 2".
      (el.querySelector('a[data-id="a"]') as HTMLAnchorElement).click();
      await el.updateComplete;
      await nextFrame();
      expect(view(el).querySelector('.count')!.textContent).to.equal('1 of 2');
      ui(view(el), 'a.full')?.click();
      const names = rec.of('uvalib-analytics-event').map((d) => (d.event as string[])[2]);
      expect(names).to.deep.equal(['image 1', 'image 1']);
    });

    it('removes its click listener from an enclosing shadow root', async () => {
      const host = document.createElement('div');
      const root = host.attachShadow({ mode: 'open' });
      document.body.append(host);
      const added: EventListenerOrEventListenerObject[] = [];
      const removed: EventListenerOrEventListenerObject[] = [];
      const origAdd = root.addEventListener.bind(root);
      const origRemove = root.removeEventListener.bind(root);
      root.addEventListener = ((
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions,
      ) => {
        if (!listener) return;
        if (type === 'click') added.push(listener);
        origAdd(type, listener, options);
      }) as typeof root.addEventListener;
      root.removeEventListener = ((
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | EventListenerOptions,
      ) => {
        if (!listener) return;
        if (type === 'click') removed.push(listener);
        origRemove(type, listener, options);
      }) as typeof root.removeEventListener;
      root.innerHTML = `<uvalib-lightbox><a href="${PNG}" data-caption="In"><img alt="In" width="2" height="1"></a></uvalib-lightbox>`;
      const el = root.querySelector('uvalib-lightbox') as UvalibLightbox;
      await el.updateComplete;
      expect(added, 'listens on the shadow root').to.have.length(1);
      el.remove();
      expect(removed, 'the same listener is removed').to.deep.equal(added);
      host.remove();
    });

    it('hides the new-tab text and keeps a focus outline with no-style', async () => {
      const el = await make(shot('One'), 'no-style');
      el.querySelector('a')!.click();
      await el.updateComplete;
      await nextFrame();
      const hidden = view(el).querySelector('.visually-hidden')!;
      expect(parseFloat(getComputedStyle(hidden).width), 'visually hidden').to.be.at.most(1);
      const full = ui(view(el), 'a.full');
      full.focus();
      expect(parseFloat(getComputedStyle(full).outlineWidth)).to.be.at.least(3);
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
