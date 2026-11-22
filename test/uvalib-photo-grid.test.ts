import { expect, fixture, nextFrame } from '@open-wc/testing';
import { emulateMedia, sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-photo-grid/uvalib-photo-grid.js';
import '../src/components/uvalib-lightbox/uvalib-lightbox.js';
import { recordAnalytics } from './helpers/analytics.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { inDarkMode } from './helpers/dark.js';

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

    it('follows its own width: 140px rows in a 250px sidebar of a wide page, 220px in a wide grid on a phone', async () => {
      const wrap = await fixture<HTMLElement>(
        `<div style="display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 1rem">
          <aside><uvalib-photo-grid ${attr} id="narrow"><a href="${PNG}"><img alt="Lawn" width="80" height="40"></a></uvalib-photo-grid></aside>
          <uvalib-photo-grid ${attr} id="wide"><a href="${PNG}"><img alt="Seal" width="80" height="40"></a></uvalib-photo-grid>
        </div>`,
      );
      const narrow = wrap.querySelector<HTMLElement>('#narrow')!;
      const wide = wrap.querySelector<HTMLElement>('#wide')!;
      await nextFrame();
      expect(getComputedStyle(narrow).containerType).to.equal('inline-size');
      expect(narrow.getBoundingClientRect().width).to.be.closeTo(250, 1);
      expect(px(narrow.querySelector('img')!, 'height')).to.be.closeTo(140, 1);
      expect(getComputedStyle(narrow, '::after').minWidth).to.equal('140px');
      expect(px(wide.querySelector('img')!, 'height')).to.be.closeTo(220, 1);
      expect(getComputedStyle(wide, '::after').minWidth).to.equal('220px');
      // row-height still wins in a narrow grid.
      narrow.setAttribute('row-height', '180');
      await (narrow as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      await nextFrame();
      expect(px(narrow.querySelector('img')!, 'height')).to.be.closeTo(180, 1);

      // The reverse: a phone-width viewport, but a grid 900px wide (in a scroller) keeps 220px.
      await setViewport({ width: 390, height: 800 });
      const scroller = await fixture<HTMLElement>(
        `<div style="overflow-x: auto"><uvalib-photo-grid ${attr} style="width: 900px"><a href="${PNG}"><img alt="Lawn" width="80" height="40"></a></uvalib-photo-grid></div>`,
      );
      await nextFrame();
      expect(px(scroller.querySelector('img')!, 'height')).to.be.closeTo(220, 1);
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

    it('draws a data-badge over the thumbnail and keeps the alt caption', async () => {
      const el = await make(
        `<a id="lawn" href="#lawn" data-badge="3 photos"><img alt="The Lawn" width="80" height="40"></a>`,
      );
      const link = el.querySelector('a')!;
      const badge = link.querySelector('.badge')!;
      expect(badge.textContent).to.equal('3 photos');
      expect(badge.hasAttribute('data-uvalib-generated-badge')).to.equal(true);
      expect(link.querySelector('.caption')!.textContent).to.equal('The Lawn');
      expect(link.hasAttribute('aria-label')).to.equal(false);
      expect(link.innerText).to.contain('3 photos');
      expect(link.innerText).to.contain('The Lawn');
      const cs = getComputedStyle(badge);
      expect(cs.position).to.equal('absolute');
      expect(cs.pointerEvents).to.equal('none');
      expect(px(link, 'min-height')).to.be.at.least(44);
      expect(link.style.getPropertyValue('--ar')).to.equal('2.0000');
      const rect = badge.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      const href = hit instanceof Element ? hit.closest('a')?.getAttribute('href') : '';
      expect(href).to.equal('#lawn');
      link.setAttribute('data-badge', '9 photos');
      await nextFrame();
      expect(link.querySelector('.badge')!.textContent).to.equal('9 photos');
      link.removeAttribute('data-badge');
      await nextFrame();
      expect(link.querySelector('.badge')).to.equal(null);
      expect(link.querySelector('.caption')!.textContent).to.equal('The Lawn');
      await expectNoAxeViolations(el);
    });

    it('uses an authored badge, including one beside an aria-label', async () => {
      const el = await make(
        `<a id="seq" href="#seq" aria-label="Rotunda sequence"><img alt="Rotunda sequence" width="40" height="40"><span slot="badge">seq</span></a>
         <button id="both" type="button" data-badge="3 photos"><span slot="badge">seq</span><img alt="Both" width="40" height="40"></button>`,
      );
      const link = el.querySelector('a')!;
      expect(link.querySelector('[data-uvalib-generated-badge]')).to.equal(null);
      expect(link.querySelector('[slot="badge"]')!.textContent).to.equal('seq');
      expect(link.getAttribute('data-uvalib-label')).to.equal('Rotunda sequence');
      expect(link.getAttribute('aria-label')).to.equal('Rotunda sequence, seq');
      expect(link.querySelector('.caption')).to.equal(null);
      const button = el.querySelector('button')!;
      expect(button.querySelector('[data-uvalib-generated-badge]')).to.equal(null);
      expect(button.querySelector('[slot="badge"]')!.textContent).to.equal('seq');
      expect(button.hasAttribute('aria-label')).to.equal(false);
      (document.activeElement as HTMLElement | null)?.blur();
      await sendKeys({ press: 'Tab' });
      expect(document.activeElement?.id).to.equal('seq');
      expect(document.activeElement?.querySelector('[slot="badge"]') !== null).to.equal(true);
      await expectNoAxeViolations(el);
    });

    it('keeps the badge readable in dark mode, forced colors, at 320px, and with no-style', async () => {
      await inDarkMode(async () => {
        const el = await make(
          `<a href="#lawn" data-badge="3 photos"><img alt="The Lawn" width="80" height="40"></a>`,
        );
        const badge = el.querySelector('.badge')!;
        expect(getComputedStyle(badge).color).to.equal('rgb(16, 23, 43)');
        await expectNoAxeViolations(el);
      });
      await emulateMedia({ forcedColors: 'active' });
      try {
        const el = await make(
          `<a href="#lawn" data-badge="seq"><img alt="The Lawn" width="80" height="40"></a>`,
        );
        const cs = getComputedStyle(el.querySelector('.badge')!);
        expect(cs.borderTopStyle).to.equal('solid');
        expect(parseFloat(cs.borderTopWidth)).to.be.at.least(1);
      } finally {
        await emulateMedia({ forcedColors: 'none' });
      }
      await setViewport({ width: 320, height: 640 });
      try {
        const el = await make(
          `<a href="#lawn" data-badge="Supercalifragilisticexpialidocious sequence"><img alt="The Lawn" width="80" height="40"></a>`,
        );
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
        expect(el.getBoundingClientRect().right).to.be.at.most(320);
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
      const bare = await make(
        `<a href="#lawn" data-badge="3 photos"><img alt="The Lawn" width="80" height="40"></a>`,
        'no-style',
      );
      const bareBadge = bare.querySelector('.badge')!;
      expect(getComputedStyle(bareBadge).position).to.equal('absolute');
      expect(bare.querySelector('.caption')!.textContent).to.equal('The Lawn');
      await expectNoAxeViolations(bare);
    });

    it('reads the caption before the badge and clears an alt that repeats the label', async () => {
      const el = await make(
        `<a id="lawn" href="#lawn" data-badge="3 photos"><img alt="The Lawn" width="80" height="40"></a>
         <a id="seq" href="#seq" aria-label="Rotunda sequence"><img alt="Rotunda sequence" width="40" height="40"><span slot="badge">seq</span></a>`,
      );
      const lawn = el.querySelector<HTMLAnchorElement>('#lawn')!;
      const text = lawn.innerText.replace(/\s+/g, ' ').trim();
      expect(text.indexOf('The Lawn') < text.indexOf('3 photos')).to.equal(true);
      expect(text.includes(',')).to.equal(true);
      const seq = el.querySelector<HTMLAnchorElement>('#seq')!;
      expect(seq.querySelector('img')!.getAttribute('alt')).to.equal('');
      expect(seq.querySelector('img')!.getAttribute('data-uvalib-alt')).to.equal(
        'Rotunda sequence',
      );
      const host = await fixture<HTMLElement>(
        `<uvalib-lightbox ${attr}><uvalib-photo-grid ${attr}>
          <a id="plain" href="${PNG}" data-badge="3 photos"><img width="40" height="40"></a>
        </uvalib-photo-grid></uvalib-lightbox>`,
      );
      host.querySelector<HTMLAnchorElement>('#plain')!.click();
      await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      await nextFrame();
      const dialog = (host.shadowRoot ?? host).querySelector('dialog')!;
      expect(dialog.open).to.equal(true);
      const caption = dialog.querySelector('.caption')!.textContent ?? '';
      expect(caption.includes('3 photos')).to.equal(false);
      expect(caption).to.equal('Photo 1');
    });
  });
}
