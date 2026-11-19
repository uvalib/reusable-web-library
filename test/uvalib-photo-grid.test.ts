import { expect, fixture, nextFrame } from '@open-wc/testing';
import { setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-photo-grid/uvalib-photo-grid.js';
import '../src/components/uvalib-lightbox/uvalib-lightbox.js';
import { recordAnalytics } from './helpers/analytics.js';
import { expectNoAxeViolations } from './helpers/axe.js';

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4AWP4z8Dwn4Hh/38AD/kD/dtv74kAAAAASUVORK5CYII=';

const cancelNav = (e: Event) => {
  if ((e.target as Element | null)?.closest?.('a[href]')) e.preventDefault();
};

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

const px = (el: Element, prop: string) => parseFloat(getComputedStyle(el).getPropertyValue(prop));

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-photo-grid (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = (inner: string, attrs = '') =>
      fixture<HTMLElement>(`<uvalib-photo-grid ${attr} ${attrs}>${inner}</uvalib-photo-grid>`);

    beforeEach(() => {
      document.addEventListener('click', cancelNav);
      return setViewport({ width: 1280, height: 800 });
    });
    afterEach(() => {
      document.removeEventListener('click', cancelNav);
      return setViewport({ width: 800, height: 600 });
    });

    it('lays justified rows out from width and height, and does not jump when the image arrives', async () => {
      const el = await make(
        `<a href="${PNG}"><img alt="Lawn" width="80" height="40"></a><a href="${PNG}"><img alt="Seal" width="40" height="40"></a>`,
      );
      const [wide, square] = [...el.querySelectorAll('a')];
      const wideImg = wide!.querySelector('img')!;
      expect(wide!.style.getPropertyValue('--ar')).to.equal('2.0000');
      expect(square!.style.getPropertyValue('--ar')).to.equal('1.0000');
      expect(wide!.parentElement).to.equal(el);
      expect(getComputedStyle(el).display).to.equal('flex');
      expect(getComputedStyle(wide!).flexGrow).to.equal('2000');
      expect(getComputedStyle(square!).flexGrow).to.equal('1000');
      expect(px(wideImg, 'height')).to.be.closeTo(220, 1);
      expect(wide!.getBoundingClientRect().height).to.be.at.least(44);
      const before = wide!.getBoundingClientRect().width;
      expect(before).to.be.greaterThan(100);
      wideImg.src = PNG;
      await wideImg.decode();
      await nextFrame();
      expect(Math.abs(wide!.getBoundingClientRect().width - before)).to.be.lessThan(1);
      expect(el.getAttribute('role')).to.equal(null);
    });

    it('uses the loaded image when width and height are absent', async () => {
      const el = await make(`<a href="${PNG}"><img alt="Strip" src="${PNG}"></a>`);
      const img = el.querySelector('img')!;
      if (!img.complete) await img.decode();
      await nextFrame();
      expect(el.querySelector('a')!.style.getPropertyValue('--ar')).to.equal('2.0000');
    });

    it('uses 140px rows on a phone unless row-height is set', async () => {
      const el = await make(`<a href="${PNG}"><img alt="Lawn" width="80" height="40"></a>`);
      const img = el.querySelector('img')!;
      await setViewport({ width: 390, height: 800 });
      await nextFrame();
      expect(px(img, 'height')).to.be.closeTo(140, 1);

      el.setAttribute('row-height', '180');
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      await nextFrame();
      expect(px(img, 'height')).to.be.closeTo(180, 1);
      expect(el.style.getPropertyValue('--uvalib-photo-row')).to.equal('180px');

      el.setAttribute('row-height', '10rem');
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      expect(el.style.getPropertyValue('--uvalib-photo-row')).to.equal('10rem');

      el.setAttribute('row-height', 'nope');
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      expect(el.style.getPropertyValue('--uvalib-photo-row')).to.equal('');
      expect(px(img, 'height')).to.be.closeTo(220, 1);
    });

    it('shows a caption from the alt when the control has no visible text, and clears a repeated alt', async () => {
      const el = await make(
        `<a href="${PNG}"><img alt="Rotunda" width="80" height="40"></a>
         <button type="button"><img alt="Seal" width="40" height="40"></button>
         <a href="${PNG}">North lawn<img alt="The Rotunda from the north" width="80" height="40"></a>`,
      );
      const [link, button, named] = [...el.querySelectorAll('a, button')] as HTMLElement[];
      expect(link!.querySelector('.caption')!.textContent).to.equal('Rotunda');
      expect(link!.querySelector('img')!.getAttribute('alt')).to.equal('');
      expect(link!.hasAttribute('aria-label')).to.equal(false);
      expect(button!.querySelector('.caption')!.textContent).to.equal('Seal');
      expect(button!.querySelector('img')!.getAttribute('alt')).to.equal('');
      expect(named!.querySelector('.caption')).to.equal(null);
      expect(named!.querySelector('img')!.getAttribute('alt')).to.equal(
        'The Rotunda from the north',
      );
      expect(named!.hasAttribute('aria-label')).to.equal(false);
      await expectNoAxeViolations(el);
    });

    it('captions a nameless photo “Photo N” and warns once', async () => {
      const warns = await warnings(async () => {
        const el = await make(
          `<a href="${PNG}"><img width="80" height="40"></a><button type="button"><img width="40" height="40"></button>`,
        );
        const captions = [...el.querySelectorAll('.caption')].map((n) => n.textContent);
        expect(captions).to.deep.equal(['Photo 1', 'Photo 2']);
        expect(el.querySelector('img')!.getAttribute('alt')).to.equal('');
      });
      expect(warns.filter((w) => w.includes('no accessible name'))).to.have.length(1);
    });

    it('skips a child that is not a link or a button, and warns once', async () => {
      const warns = await warnings(async () => {
        const el = await make(
          `<div><img alt="Loose" width="80" height="40"></div><p>Note</p><a href="${PNG}"><img alt="Kept" width="80" height="40"></a>`,
        );
        expect(el.querySelector('div')!.style.getPropertyValue('--ar')).to.equal('');
        expect(el.querySelector('a')!.style.getPropertyValue('--ar')).to.equal('2.0000');
      });
      expect(warns.filter((w) => w.includes('not a link or a button'))).to.have.length(1);
    });

    it('skips an anchor that has no href, and warns once', async () => {
      const warns = await warnings(async () => {
        const el = await make(
          `<a><img alt="Nowhere" width="80" height="40"></a><a href="${PNG}"><img alt="Kept" width="80" height="40"></a>`,
        );
        const [bare, kept] = [...el.querySelectorAll('a')];
        expect(bare!.style.getPropertyValue('--ar')).to.equal('');
        expect(bare!.querySelector('.caption')).to.equal(null);
        expect(kept!.style.getPropertyValue('--ar')).to.equal('2.0000');
      });
      expect(warns.filter((w) => w.includes('not a link or a button'))).to.have.length(1);
    });

    it('keeps a cleared alt for the lightbox and does not caption an aria-label', async () => {
      const host = await fixture<HTMLElement>(
        `<uvalib-lightbox ${attr}><uvalib-photo-grid ${attr}>
          <a href="${PNG}" data-caption="Short title"><img alt="Detailed description" width="80" height="40"></a>
          <a href="${PNG}" aria-label="Named photo"><img alt="Named photo" width="40" height="40"></a>
          <a href="${PNG}" aria-label="Short name"><img alt="Longer than the name" width="40" height="40"></a>
        </uvalib-photo-grid></uvalib-lightbox>`,
      );
      const grid = host.querySelector('uvalib-photo-grid')!;
      const [described, named, longer] = [...grid.querySelectorAll('a')];
      const describedImg = described!.querySelector('img')!;
      expect(describedImg.getAttribute('data-uvalib-alt')).to.equal('Detailed description');
      expect(describedImg.getAttribute('alt')).to.equal('');
      expect(described!.querySelector('.caption')!.textContent).to.equal('Detailed description');
      expect(named!.querySelector('.caption')).to.equal(null);
      expect(named!.querySelector('img')!.getAttribute('alt')).to.equal('');
      expect(named!.querySelector('img')!.getAttribute('data-uvalib-alt')).to.equal('Named photo');
      expect(longer!.querySelector('.caption')).to.equal(null);
      expect(longer!.querySelector('img')!.getAttribute('alt')).to.equal('Longer than the name');
      await expectNoAxeViolations(grid);

      described!.click();
      await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      await nextFrame();
      const dialog = (host.shadowRoot ?? host).querySelector('dialog')!;
      expect(dialog.querySelector('.caption')!.textContent).to.equal('Short title');
      expect(dialog.querySelector('img')!.getAttribute('alt')).to.equal('Detailed description');
    });

    it('renumbers a generated Photo N caption when a photo is inserted before it', async () => {
      const warns = await warnings(async () => {
        const el = await make(`<a href="${PNG}"><img width="80" height="40"></a>`);
        const first = el.querySelector('.caption')!;
        expect(first.textContent).to.equal('Photo 1');
        expect(first.hasAttribute('data-uvalib-generated')).to.equal(true);
        const extra = document.createElement('a');
        extra.href = PNG;
        extra.innerHTML = '<img width="40" height="40">';
        el.insertBefore(extra, el.querySelector('a'));
        await nextFrame();
        const captions = [...el.querySelectorAll('a .caption')].map((n) => n.textContent);
        expect(captions).to.deep.equal(['Photo 1', 'Photo 2']);
        expect(extra.querySelector('.caption')!.hasAttribute('data-uvalib-generated')).to.equal(
          true,
        );
      });
      expect(warns.filter((w) => w.includes('no accessible name'))).to.have.length(1);
    });

    it('keeps the ratio, the 44px target and the focus ring with no-style', async () => {
      const el = await make(
        `<a href="${PNG}"><img alt="Lawn" width="80" height="40"></a>`,
        'no-style',
      );
      const link = el.querySelector('a')!;
      link.focus();
      expect(link.style.getPropertyValue('--ar')).to.equal('2.0000');
      expect(getComputedStyle(el).display).to.equal('flex');
      expect(px(link, 'min-height')).to.be.at.least(44);
      expect(parseFloat(getComputedStyle(link).outlineWidth)).to.be.at.least(3);
      await expectNoAxeViolations(el);
    });

    it('reports nothing of its own, and a grid inside a lightbox opens the viewer', async () => {
      const rec = recordAnalytics();
      try {
        const alone = await make(`<a href="${PNG}"><img alt="Lawn" width="80" height="40"></a>`);
        alone.querySelector('a')!.click();
        expect(rec.events).to.deep.equal([]);

        const host = await fixture(
          `<uvalib-lightbox ${attr}><uvalib-photo-grid ${attr}>
            <a href="${PNG}" data-caption="One"><img alt="One" width="80" height="40"></a>
            <a href="${PNG}" data-caption="Two"><img alt="Two" width="80" height="40"></a>
          </uvalib-photo-grid></uvalib-lightbox>`,
        );
        host.querySelector('a')!.click();
        await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
        const dialog = (host.shadowRoot ?? host).querySelector('dialog')!;
        expect(dialog.open).to.equal(true);
        expect(dialog.querySelector('.caption')!.textContent).to.equal('One');
        expect(rec.of('uvalib-analytics-event').map((d) => (d.event as string[])[0])).to.deep.equal(
          ['uvalib-lightbox'],
        );
        await expectNoAxeViolations(host);
      } finally {
        rec.restore();
      }
    });
  });
}
