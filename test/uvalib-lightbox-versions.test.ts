import { expect, fixture, nextFrame, waitUntil } from '@open-wc/testing';
import {
  emulateMedia,
  resetMouse,
  sendKeys,
  sendMouse,
  setViewport,
} from '@web/test-runner-commands';
import '../src/components/uvalib-lightbox/uvalib-lightbox.js';
import type { UvalibLightbox } from '../src/components/uvalib-lightbox/UvalibLightbox.js';
import type { UvalibImageRegions } from '../src/components/uvalib-image-regions/UvalibImageRegions.js';
import { recordAnalytics } from './helpers/analytics.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { inDarkMode } from './helpers/dark.js';

/** A 400 × 300 PNG of one colour. */
const png = (color: string) => {
  const c = document.createElement('canvas');
  c.width = 400;
  c.height = 300;
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  g.fillRect(0, 0, 400, 300);
  return c.toDataURL('image/png');
};
const ORIG = png('#777777');
const COLOR = png('#bb3322');
const THIRD = png('#2255aa');

const NOTE = 'The colours are a guess.';
const TWO = `data-versions='[{"label":"Original"},{"label":"AI colorization","href":"${COLOR}","note":"${NOTE}"}]'`;
const THREE = `data-versions='[{"label":"Original"},{"label":"AI colorization","href":"${COLOR}"},{"label":"Infrared","href":"${THIRD}"}]'`;

const view = (el: Element) => (el.shadowRoot ?? el) as ParentNode;
const dialogOf = (el: Element) => view(el).querySelector('dialog')!;
const stackOf = (el: Element) => dialogOf(el).querySelector<HTMLElement>('.stack')!;
const baseImg = (el: Element) => stackOf(el).querySelector<HTMLImageElement>('img:not(.top)')!;
const top = (el: Element, i = 1) =>
  stackOf(el).querySelector<HTMLImageElement>(`img.top[data-version="${i}"]`)!;
const compareOf = (el: Element) => dialogOf(el).querySelector<HTMLElement>('.compare');
const group = (el: Element, label: string) => [
  ...compareOf(el)!.querySelectorAll<HTMLButtonElement>(
    `[role="group"][aria-label="${label}"] > button`,
  ),
];
const btn = (el: Element, label: string, text: string) =>
  group(el, label).find((b) => b.textContent!.trim() === text)!;
const pressed = (el: Element, label: string) =>
  group(el, label)
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.textContent!.trim());
const range = (el: Element) =>
  compareOf(el)!.querySelector<HTMLInputElement>('input[type="range"]')!;
const status = (el: Element) =>
  compareOf(el)!.querySelector('[role="status"]')!.textContent!.trim();
const notes = (el: Element) =>
  [...compareOf(el)!.querySelectorAll('.note:not([data-off])')].map((n) =>
    n.textContent!.replace(/\s+/g, ' ').trim(),
  );
const fullLinks = (el: Element) =>
  [...dialogOf(el).querySelectorAll<HTMLAnchorElement>('a.full')].map((a) => ({
    href: a.getAttribute('href'),
    text: a.textContent!.replace(/\s+/g, ' ').trim(),
  }));
const cancelNav = (e: Event) => {
  const a = e.composedPath().find((n) => n instanceof HTMLAnchorElement);
  if (a) e.preventDefault();
};
const settle = () => new Promise((r) => setTimeout(r, 120));
const loadedTop = (el: Element, i = 1) =>
  waitUntil(() => top(el, i)?.classList.contains('on'), `version ${i} drawn`);

function shot(caption: string, extra = '', id = caption): string {
  return `<a href="${ORIG}" data-id="${id}" data-caption="${caption}" ${extra}><img alt="${caption}" width="80" height="60"></a>`;
}

async function warnings(fn: () => Promise<void>): Promise<string[]> {
  const orig = console.warn;
  const warns: string[] = [];
  console.warn = (...args: unknown[]) => warns.push(args.map(String).join(' '));
  try {
    await fn();
  } finally {
    console.warn = orig;
  }
  return warns;
}

const compareLoaded = () =>
  performance.getEntriesByType('resource').some((e) => e.name.includes('/uvalib-lightbox/compare'));

// First in the file: nothing else has opened an image with versions yet.
describe('uvalib-lightbox versions: lazy module', () => {
  it('a page without versions never loads the comparison; one with versions does, on open', async () => {
    const el = await fixture<UvalibLightbox>(
      `<uvalib-lightbox>${shot('Plain')}${shot('Pair', TWO)}</uvalib-lightbox>`,
    );
    document.addEventListener('click', cancelNav);
    try {
      el.querySelector('a')!.click();
      await el.updateComplete;
      await nextFrame();
      await new Promise((r) => setTimeout(r, 100));
      expect(compareLoaded()).to.equal(false);
      expect(stackOf(el)).to.equal(null);
      dialogOf(el).querySelector<HTMLButtonElement>('button.next')!.click();
      await waitUntil(() => compareOf(el), 'comparison loaded');
      expect(compareLoaded()).to.equal(true);
      dialogOf(el).querySelector<HTMLButtonElement>('button.close')!.click();
    } finally {
      document.removeEventListener('click', cancelNav);
    }
  });
});

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-lightbox versions (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = (inner: string, attrs = '') =>
      fixture<UvalibLightbox>(`<uvalib-lightbox ${attr} ${attrs}>${inner}</uvalib-lightbox>`);
    let rec: ReturnType<typeof recordAnalytics>;
    let events: Record<string, unknown>[];
    const onVersion = (e: Event) => events.push((e as CustomEvent).detail);

    before(async () => {
      const m = await import('../src/components/uvalib-lightbox/compare.js');
      m.compareTiming.settle = 40;
    });
    beforeEach(() => {
      rec = recordAnalytics();
      events = [];
      history.replaceState(null, '', location.pathname);
      document.addEventListener('click', cancelNav);
      document.addEventListener('uvalib-lightbox-version', onVersion);
    });
    afterEach(async () => {
      rec.restore();
      document.removeEventListener('click', cancelNav);
      document.removeEventListener('uvalib-lightbox-version', onVersion);
      for (const d of document.querySelectorAll('uvalib-lightbox'))
        view(d).querySelector<HTMLButtonElement>('dialog[open] button.close')?.click();
      await nextFrame();
      history.replaceState(null, '', location.pathname);
    });

    const open = async (el: UvalibLightbox, i = 0) => {
      el.querySelectorAll('a')[i]!.click();
      await el.updateComplete;
      await waitUntil(() => compareOf(el), 'comparison shown');
      await el.updateComplete;
    };
    const compares = () =>
      rec.of('uvalib-analytics-event').filter((d) => (d.event as unknown[])[1] === 'compare');

    it('checks the versions: drops entries without a label or a usable href, with one warning', async () => {
      const bad = `data-versions='[{"label":"Original"},{"label":"Script","href":"javascript:alert(1)"},{"href":"${COLOR}"},{"label":"SVG","href":"data:image/svg+xml,<svg/>"},{"label":"Colour","href":"${COLOR}"}]'`;
      let el!: UvalibLightbox;
      const warns = await warnings(async () => {
        el = await make(
          `${shot('Mixed', bad)}${shot('Broken', `data-versions='[{"label":"A"},'`)}`,
        );
        await open(el);
        el.querySelectorAll('a')[1]!.click();
        await el.updateComplete;
        await nextFrame();
      });
      expect(warns.filter((w) => w.includes('versions'))).to.have.length(1);
      // Broken JSON: the image as before, no comparison.
      expect(compareOf(el)).to.equal(null);
      expect(baseImg(el).getAttribute('alt')).to.equal('Broken');
      dialogOf(el).querySelector<HTMLButtonElement>('button.prev')!.click();
      await el.updateComplete;
      expect(group(el, 'Version shown').map((b) => b.textContent!.trim())).to.deep.equal([
        'Original',
        'Colour',
      ]);
    });

    it('fewer than two usable versions: no comparison, the image as before', async () => {
      const one = `data-versions='[{"label":"Original"},{"label":"Gone","href":"javascript:void 0"}]'`;
      const el = await make(shot('Lone', one));
      await warnings(async () => {
        el.querySelector('a')!.click();
        await el.updateComplete;
        await waitUntil(() => compareLoaded());
        await new Promise((r) => setTimeout(r, 50));
        await el.updateComplete;
      });
      expect(compareOf(el)).to.equal(null);
      expect(dialogOf(el).querySelectorAll('img').length).to.equal(1);
      expect(fullLinks(el)).to.deep.equal([{ href: ORIG, text: 'Full size (opens in a new tab)' }]);
    });

    it('takes versions from the versions callback', async () => {
      const el = await make(`${shot('One')}${shot('Two')}`);
      el.versions = ({ index }) =>
        index === 1 ? [{ label: 'Scan' }, { label: 'Restored', href: COLOR }] : null;
      await el.updateComplete;
      el.querySelectorAll('a')[0]!.click();
      await el.updateComplete;
      await nextFrame();
      expect(stackOf(el)).to.equal(null);
      dialogOf(el).querySelector<HTMLButtonElement>('button.next')!.click();
      await waitUntil(() => compareOf(el));
      expect(pressed(el, 'Version shown')).to.deep.equal(['Scan']);
    });

    it('switch (default): one version at a time, the other loaded on first use, then announced', async () => {
      const el = await make(shot('Street', TWO));
      await open(el);
      expect(pressed(el, 'Compare versions')).to.deep.equal(['Switch']);
      expect(pressed(el, 'Version shown')).to.deep.equal(['Original']);
      // Not requested until it is needed.
      expect(top(el).hasAttribute('src')).to.equal(false);
      expect(baseImg(el).getAttribute('alt')).to.equal('Street (Original)');
      expect(notes(el)).to.deep.equal([]);

      btn(el, 'Version shown', 'AI colorization').click();
      await el.updateComplete;
      expect(top(el).getAttribute('src')).to.equal(COLOR);
      expect(top(el).getAttribute('decoding')).to.equal('async');
      expect(pressed(el, 'Version shown')).to.deep.equal(['AI colorization']);
      // Still loading: the original stays, and nothing is said yet.
      if (!top(el).complete) {
        expect(top(el).classList.contains('on')).to.equal(false);
        expect(baseImg(el).getAttribute('alt')).to.equal('Street (Original)');
        expect(status(el)).to.equal('');
      }
      await loadedTop(el);
      await el.updateComplete;
      expect(baseImg(el).getAttribute('alt')).to.equal('Street (AI colorization)');
      expect(status(el)).to.equal('AI colorization shown');
      expect(notes(el)).to.deep.equal([`AI colorization: ${NOTE}`]);
      expect(getComputedStyle(top(el)).opacity).to.not.equal('0');
      expect(events).to.deep.equal([{ id: 'Street', mode: 'switch', index: 1, value: null }]);
      expect(compares().map((d) => d.event)).to.deep.equal([
        ['uvalib-lightbox', 'compare', 'switch', 2],
      ]);
      expect(top(el).getAttribute('alt')).to.equal('');
    });

    it('switching never moves the layout', async () => {
      const el = await make(shot('Street', TWO));
      await open(el);
      await waitUntil(() => baseImg(el).complete && baseImg(el).naturalWidth > 0);
      const before = stackOf(el).getBoundingClientRect();
      const bar = compareOf(el)!.getBoundingClientRect();
      btn(el, 'Version shown', 'AI colorization').click();
      await loadedTop(el);
      await el.updateComplete;
      const after = stackOf(el).getBoundingClientRect();
      expect([after.x, after.y, after.width, after.height]).to.deep.equal([
        before.x,
        before.y,
        before.width,
        before.height,
      ]);
      expect(compareOf(el)!.getBoundingClientRect().top).to.equal(bar.top);
      const t = top(el).getBoundingClientRect();
      expect([t.width, t.height]).to.deep.equal([before.width, before.height]);
    });

    it('changing mode never moves the photo, even on a phone where the controls wrap', async () => {
      // The control row keeps the height of its tallest mode, so the dialog, which is centred,
      // never re-centres when Switch's short row replaces Reveal's slider and jump buttons.
      await setViewport({ width: 375, height: 812 });
      try {
        const el = await make(shot('Street', THREE), 'compare="wipe"');
        await open(el);
        await waitUntil(() => baseImg(el).complete && baseImg(el).naturalWidth > 0);
        const at = () => {
          const r = stackOf(el).getBoundingClientRect();
          return [Math.round(r.x), Math.round(r.y), Math.round(r.height)];
        };
        const first = at();
        for (const mode of ['Switch', 'Fade', 'Switch', 'Reveal']) {
          btn(el, 'Compare versions', mode).click();
          await el.updateComplete;
          await nextFrame();
          expect(at(), mode).to.deep.equal(first);
        }
        // The hidden panel is out of the tab order and the accessibility tree.
        btn(el, 'Compare versions', 'Switch').click();
        await el.updateComplete;
        const off = compareOf(el)!.querySelector<HTMLElement>('.mode-panel[data-off]')!;
        expect(off.inert).to.equal(true);
        expect(getComputedStyle(off).visibility).to.equal('hidden');
        expect(off.contains(range(el))).to.equal(true);
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
    });

    it('wipe: a labelled slider, the divider, side labels and both notes', async () => {
      const el = await make(shot('Street', TWO), 'compare="wipe"');
      await open(el);
      const r = range(el);
      const label = compareOf(el)!.querySelector(`label[for="${r.id}"]`)!;
      expect(label.textContent!.trim()).to.equal('Reveal AI colorization');
      expect(r.value).to.equal('50');
      expect(r.getAttribute('aria-valuetext')).to.equal('50% AI colorization');
      await loadedTop(el);
      await el.updateComplete;
      expect(getComputedStyle(top(el)).clipPath).to.include('inset');
      expect(baseImg(el).getAttribute('alt')).to.equal(
        'Street (Original and AI colorization, compared side by side)',
      );
      const sides = [...stackOf(el).querySelectorAll<HTMLElement>('.side')];
      expect(sides.map((s) => s.textContent!.trim())).to.deep.equal([
        'AI colorization',
        'Original',
      ]);
      expect(sides.every((s) => s.getAttribute('aria-hidden') === 'true')).to.equal(true);
      const handle = stackOf(el).querySelector('.handle')!.getBoundingClientRect();
      expect(handle.width).to.be.at.least(44);
      expect(handle.height).to.be.at.least(44);
      const s = stackOf(el).getBoundingClientRect();
      const d = stackOf(el).querySelector('.divider')!.getBoundingClientRect();
      expect(Math.abs(d.left - (s.left + s.width / 2))).to.be.below(1.5);
      expect(notes(el)).to.deep.equal([`AI colorization: ${NOTE}`]);
      // Nothing reported on open.
      expect(events).to.deep.equal([]);
      expect(compares()).to.deep.equal([]);
    });

    it('slider keys: arrows, Shift+arrow (10), Page Up/Down, Home and End; reported once settled', async () => {
      const el = await make(shot('Street', TWO), 'compare="wipe"');
      await open(el);
      range(el).focus();
      const steps: [string, string][] = [
        ['ArrowRight', '51'],
        ['Shift+ArrowRight', '61'],
        ['Shift+ArrowLeft', '51'],
        ['ArrowUp', '52'],
        ['PageDown', '42'],
        ['PageUp', '52'],
        ['Home', '0'],
        ['End', '100'],
      ];
      for (const [press, want] of steps) {
        await sendKeys({ press });
        await el.updateComplete;
        expect(range(el).value, press).to.equal(want);
      }
      expect(range(el).getAttribute('aria-valuetext')).to.equal('100% AI colorization');
      await settle();
      expect(events).to.deep.equal([{ id: 'Street', mode: 'wipe', index: 1, value: 100 }]);
      expect(compares().map((d) => d.event)).to.deep.equal([
        ['uvalib-lightbox', 'compare', 'wipe', 2],
      ]);
      // The slider speaks for itself: no extra announcement.
      expect(status(el)).to.equal('');
      // Arrow keys on the slider do not move to another image.
      expect(dialogOf(el).open).to.equal(true);
    });

    const press = (el: Element, at: number, type = 'pointerdown') => {
      const s = stackOf(el).getBoundingClientRect();
      stackOf(el).dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          composed: true,
          cancelable: true,
          isPrimary: true,
          pointerId: 1,
          button: 0,
          clientX: s.left + s.width * at,
          clientY: s.top + s.height / 2,
        }),
      );
    };

    it('wipe: a single click on the photo moves the divider (no drag), announced once settled', async () => {
      const el = await make(shot('Street', TWO), 'compare="wipe"');
      await open(el);
      await loadedTop(el);
      press(el, 0.25);
      press(el, 0.25, 'pointerup');
      await el.updateComplete;
      expect(range(el).value).to.equal('25');
      expect(stackOf(el).style.getPropertyValue('--uvalib-compare')).to.equal('25%');
      // A drag keeps moving it, and only the end is reported and announced.
      press(el, 0.3);
      press(el, 0.4, 'pointermove');
      press(el, 0.7, 'pointermove');
      press(el, 0.7, 'pointerup');
      await el.updateComplete;
      expect(range(el).value).to.equal('70');
      await settle();
      await el.updateComplete;
      expect(events.map((d) => d.value)).to.deep.equal([70]);
      expect(status(el)).to.equal('70% AI colorization');
      expect(dialogOf(el).open).to.equal(true);
      // Moves are ignored without a press.
      press(el, 0.1, 'pointermove');
      await el.updateComplete;
      expect(range(el).value).to.equal('70');
    });

    it('wipe: a real mouse click on the photo moves the divider; a drag ending on the backdrop does not close', async () => {
      const el = await make(shot('Street', TWO), 'compare="wipe"');
      await open(el);
      await loadedTop(el);
      const s = stackOf(el).getBoundingClientRect();
      const y = Math.round(s.top + s.height / 2);
      await sendMouse({ type: 'click', position: [Math.round(s.left + s.width * 0.75), y] });
      await el.updateComplete;
      expect(Number(range(el).value)).to.be.within(74, 76);
      await sendMouse({ type: 'move', position: [Math.round(s.left + s.width * 0.5), y] });
      await sendMouse({ type: 'down' });
      await sendMouse({ type: 'move', position: [Math.round(s.left + s.width * 0.3), y] });
      await sendMouse({ type: 'move', position: [2, 2] });
      await sendMouse({ type: 'up' });
      await el.updateComplete;
      expect(range(el).value).to.equal('0');
      expect(dialogOf(el).open).to.equal(true);
      await resetMouse();
    });

    it('wipe in right-to-left: the divider follows the pointer from the right', async () => {
      const el = await make(shot('Street', TWO), 'compare="wipe" dir="rtl"');
      await open(el);
      await loadedTop(el);
      press(el, 0.2);
      press(el, 0.2, 'pointerup');
      await el.updateComplete;
      expect(range(el).value).to.equal('80');
      expect(getComputedStyle(top(el)).clipPath).to.match(/inset\(0px 0px 0px/);
      const s = stackOf(el).getBoundingClientRect();
      const d = stackOf(el).querySelector('.divider')!.getBoundingClientRect();
      expect(Math.abs(d.left - (s.left + s.width * 0.2))).to.be.below(1.5);
    });

    it('jump buttons set the position; Original names and notes follow', async () => {
      const el = await make(shot('Street', TWO), 'compare="fade"');
      await open(el);
      expect(range(el).value).to.equal('0');
      const r = range(el);
      expect(compareOf(el)!.querySelector(`label[for="${r.id}"]`)!.textContent!.trim()).to.equal(
        'Fade to AI colorization',
      );
      expect(top(el).hasAttribute('src')).to.equal(false);
      btn(el, 'Jump to', '50/50').click();
      await loadedTop(el);
      await el.updateComplete;
      expect(range(el).value).to.equal('50');
      expect(getComputedStyle(top(el)).opacity).to.equal('0.5');
      expect(baseImg(el).getAttribute('alt')).to.equal(
        'Street (Original and AI colorization, blended)',
      );
      expect(status(el)).to.equal('50% AI colorization');
      btn(el, 'Jump to', 'AI colorization').click();
      await el.updateComplete;
      expect(getComputedStyle(top(el)).opacity).to.equal('1');
      expect(status(el)).to.equal('AI colorization shown');
      btn(el, 'Jump to', 'Original').click();
      await el.updateComplete;
      expect(baseImg(el).getAttribute('alt')).to.equal('Street (Original)');
      expect(notes(el)).to.deep.equal([]);
      expect(events.map((d) => [d.mode, d.value])).to.deep.equal([
        ['fade', 50],
        ['fade', 100],
        ['fade', 0],
      ]);
    });

    it('the mode control switches between Switch, Reveal and Fade', async () => {
      const el = await make(shot('Street', TWO));
      await open(el);
      btn(el, 'Version shown', 'AI colorization').click();
      await loadedTop(el);
      btn(el, 'Compare versions', 'Fade').click();
      await el.updateComplete;
      expect(pressed(el, 'Compare versions')).to.deep.equal(['Fade']);
      expect(range(el).value).to.equal('100');
      btn(el, 'Compare versions', 'Reveal').click();
      await el.updateComplete;
      expect(range(el).value).to.equal('100');
      expect(stackOf(el).classList.contains('compare-wipe')).to.equal(true);
      btn(el, 'Compare versions', 'Switch').click();
      await el.updateComplete;
      expect(pressed(el, 'Version shown')).to.deep.equal(['AI colorization']);
      expect(compares().map((d) => (d.event as unknown[])[2])).to.deep.equal([
        'switch',
        'fade',
        'wipe',
        'switch',
      ]);
    });

    it('three versions: Reveal and Fade pick which one is compared with the original', async () => {
      history.replaceState(null, '', `${location.pathname}?photo=Street&version=wipe:30:2`);
      const el = await make(shot('Street', THREE), 'url-param="photo" version-param="version"');
      await waitUntil(() => compareOf(el), 'restored');
      await el.updateComplete;
      expect(pressed(el, 'Compare versions')).to.deep.equal(['Reveal']);
      expect(pressed(el, 'Compare Original with')).to.deep.equal(['Infrared']);
      expect(range(el).value).to.equal('30');
      expect(top(el, 1).hasAttribute('src')).to.equal(false);
      expect(top(el, 2).getAttribute('src')).to.equal(THIRD);
      btn(el, 'Compare Original with', 'AI colorization').click();
      await el.updateComplete;
      expect(range(el).getAttribute('aria-valuetext')).to.equal('30% AI colorization');
      await waitUntil(() => new URLSearchParams(location.search).get('version') === 'wipe:30');
      expect(events).to.deep.equal([{ id: 'Street', mode: 'wipe', index: 1, value: 30 }]);
    });

    it('version-param: restored on open (no event), kept with replaceState, dropped on Next', async () => {
      history.replaceState(null, '', `${location.pathname}?photo=A&version=fade:60`);
      const el = await make(
        `${shot('A', TWO)}${shot('B')}`,
        'url-param="photo" version-param="version"',
      );
      await waitUntil(() => compareOf(el), 'restored');
      await el.updateComplete;
      expect(pressed(el, 'Compare versions')).to.deep.equal(['Fade']);
      expect(range(el).value).to.equal('60');
      expect(new URLSearchParams(location.search).get('version')).to.equal('fade:60');
      expect(events).to.deep.equal([]);
      expect(rec.events).to.deep.equal([]);
      const len = history.length;
      range(el).focus();
      for (let i = 0; i < 8; i++) await sendKeys({ press: 'ArrowRight' });
      await settle();
      expect(new URLSearchParams(location.search).get('version')).to.equal('fade:68');
      expect(history.length).to.equal(len);
      btn(el, 'Compare versions', 'Switch').click();
      await el.updateComplete;
      expect(new URLSearchParams(location.search).get('version')).to.equal('1');
      dialogOf(el).querySelector<HTMLButtonElement>('button.next')!.click();
      await el.updateComplete;
      expect(location.search).to.equal('?photo=B');
      expect(compareOf(el)).to.equal(null);
      expect(history.length).to.equal(len);
    });

    it('version-param on a hash route, and a switch index', async () => {
      history.replaceState(null, '', `${location.pathname}#/text/d9?photo=A&version=1`);
      const el = await make(shot('A', TWO), 'url-param="photo" version-param="version"');
      await waitUntil(() => compareOf(el), 'restored');
      await loadedTop(el);
      expect(pressed(el, 'Version shown')).to.deep.equal(['AI colorization']);
      btn(el, 'Compare versions', 'Reveal').click();
      await el.updateComplete;
      expect(location.search).to.equal('');
      expect(location.hash).to.equal('#/text/d9?photo=A&version=wipe%3A50');
      expect(events).to.deep.equal([{ id: 'A', mode: 'wipe', index: 1, value: 50 }]);
    });

    it('opening by a click ignores a leftover version in the address', async () => {
      history.replaceState(null, '', `${location.pathname}?version=wipe:10`);
      const el = await make(shot('A', TWO), 'url-param="photo" version-param="version"');
      await open(el);
      expect(pressed(el, 'Compare versions')).to.deep.equal(['Switch']);
      expect(location.search).to.equal('?photo=A');
    });

    it('Full size: the original and the version shown or compared, named, in every mode', async () => {
      const el = await make(shot('Street', TWO));
      await open(el);
      const both = [
        { href: ORIG, text: 'Full size, Original (opens in a new tab)' },
        { href: COLOR, text: 'Full size, AI colorization (opens in a new tab)' },
      ];
      // Switch, showing the original: still both, so the toolbar keeps its height.
      expect(fullLinks(el)).to.deep.equal(both);
      btn(el, 'Version shown', 'AI colorization').click();
      await el.updateComplete;
      expect(fullLinks(el)).to.deep.equal(both);
      btn(el, 'Compare versions', 'Reveal').click();
      await el.updateComplete;
      expect(fullLinks(el)).to.deep.equal(both);
    });

    it('no-analytics: the event still fires, nothing is reported', async () => {
      const el = await make(shot('Street', TWO), 'no-analytics');
      await open(el);
      btn(el, 'Version shown', 'AI colorization').click();
      await el.updateComplete;
      expect(events).to.have.length(1);
      expect(compares()).to.deep.equal([]);
    });

    it('Previous and Next: each image has its own versions (or none), in the current mode', async () => {
      const el = await make(`${shot('A', TWO)}${shot('B')}${shot('C', THREE)}`, 'compare="wipe"');
      await open(el);
      btn(el, 'Compare versions', 'Fade').click();
      btn(el, 'Jump to', '50/50').click();
      await el.updateComplete;
      const next = () => dialogOf(el).querySelector<HTMLButtonElement>('button.next')!.click();
      next();
      await el.updateComplete;
      expect(compareOf(el)).to.equal(null);
      expect(stackOf(el)).to.equal(null);
      next();
      await el.updateComplete;
      expect(pressed(el, 'Compare versions')).to.deep.equal(['Fade']);
      expect(range(el).value).to.equal('0');
      expect(pressed(el, 'Compare Original with')).to.deep.equal(['AI colorization']);
      expect(baseImg(el).getAttribute('alt')).to.equal('C (Original)');
      // Details, caption and counter still follow.
      expect(dialogOf(el).querySelector('.caption')!.textContent).to.equal('C');
      expect(dialogOf(el).querySelector('.count')!.textContent).to.equal('3 of 3');
    });

    it('hold: the button and the O key show the original while held', async () => {
      const el = await make(shot('Street', TWO), 'compare="wipe"');
      await open(el);
      await loadedTop(el);
      const hold = compareOf(el)!.querySelector<HTMLButtonElement>('button.hold')!;
      expect(hold.textContent!.trim()).to.equal('Hold for Original');
      hold.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      await el.updateComplete;
      expect(top(el).classList.contains('on')).to.equal(false);
      expect(baseImg(el).getAttribute('alt')).to.equal('Street (Original)');
      hold.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      await el.updateComplete;
      expect(top(el).classList.contains('on')).to.equal(true);
      dialogOf(el).querySelector<HTMLButtonElement>('button.close')!.focus();
      await sendKeys({ down: 'o' });
      await el.updateComplete;
      expect(top(el).classList.contains('on')).to.equal(false);
      await sendKeys({ up: 'o' });
      await el.updateComplete;
      expect(top(el).classList.contains('on')).to.equal(true);
      // Holding is not a change: nothing reported.
      expect(events).to.deep.equal([]);
    });

    it('keyboard order: the image controls, then the comparison, then the regions list', async () => {
      const el = await make(
        shot('Group', `${TWO} data-regions="percent:10,20,30,40 Person 1"`),
        'compare="wipe"',
      );
      await open(el);
      await waitUntil(() => customElements.get('uvalib-image-regions'));
      const r = dialogOf(el).querySelector<UvalibImageRegions>('uvalib-image-regions')!;
      await r.updateComplete;
      const cmp = compareOf(el)!;
      const list = r.shadowRoot!.querySelector('.list')!;
      // In the flat tree the comparison is under the image and before the list.
      const slot = r.shadowRoot!.querySelector('slot[name="controls"]')!;
      expect(cmp.assignedSlot === slot).to.equal(true);
      expect(
        Boolean(slot.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING),
      ).to.equal(true);
      const media0 = r.shadowRoot!.querySelector('.media')!;
      expect(
        Boolean(media0.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING),
      ).to.equal(true);
      const media = r.shadowRoot!.querySelector('.media')!.getBoundingClientRect();
      expect(cmp.getBoundingClientRect().top).to.be.at.least(media.bottom - 1);
      // The outlines' box is the image, not the controls.
      expect(Math.round(media.height)).to.equal(
        Math.round(stackOf(el).getBoundingClientRect().height),
      );
    });

    it('regions over the comparison: outlines win a click; elsewhere the click moves the divider', async () => {
      const el = await make(
        shot('Group', `${TWO} data-regions="percent:10,20,30,40 Person 1"`),
        'compare="wipe"',
      );
      await open(el);
      await waitUntil(() => customElements.get('uvalib-image-regions'));
      const r = dialogOf(el).querySelector<UvalibImageRegions>('uvalib-image-regions')!;
      await waitUntil(() => r.shadowRoot!.querySelector('.overlay > .region:not([hidden])'));
      await loadedTop(el);
      const outline = r.shadowRoot!.querySelector<HTMLElement>('.overlay > .region')!;
      const box = outline.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      const hit = r.shadowRoot!.elementFromPoint(x, y);
      expect(hit === outline || outline.contains(hit)).to.equal(true);
      let activated = 0;
      r.addEventListener('uvalib-image-regions-activate', () => activated++);
      outline.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, composed: true, clientX: x, clientY: y }),
      );
      outline.click();
      await el.updateComplete;
      expect(activated).to.equal(1);
      expect(range(el).value).to.equal('50');
      press(el, 0.8);
      press(el, 0.8, 'pointerup');
      await el.updateComplete;
      expect(range(el).value).to.equal('80');
    });

    it('reduced motion: switching versions has no transition', async () => {
      const el = await make(shot('Street', TWO));
      await open(el);
      const dur = () =>
        getComputedStyle(top(el))
          .transitionDuration.split(',')
          .map((s) => parseFloat(s));
      expect(dur().some((d) => d > 0)).to.equal(true);
      await emulateMedia({ reducedMotion: 'reduce' });
      try {
        expect(dur().every((d) => d === 0)).to.equal(true);
      } finally {
        await emulateMedia({ reducedMotion: 'no-preference' });
      }
    });

    it('forced colors: the divider and handle use system colours', async () => {
      const el = await make(shot('Street', TWO), 'compare="wipe"');
      await open(el);
      const handle = stackOf(el).querySelector('.handle')!;
      const bar = stackOf(el).querySelector('.divider')!;
      const plain = getComputedStyle(handle).borderTopColor;
      await emulateMedia({ forcedColors: 'active' });
      try {
        expect(getComputedStyle(handle).borderTopColor).to.not.equal(plain);
        expect(getComputedStyle(bar).forcedColorAdjust).to.equal('none');
        expect(getComputedStyle(bar, '::before').backgroundColor).to.not.equal(
          'rgb(255, 255, 255)',
        );
      } finally {
        await emulateMedia({ forcedColors: 'none' });
      }
    });

    for (const m of ['switch', 'wipe', 'fade'] as const) {
      it(`passes axe in ${m}, light and dark`, async () => {
        const el = await make(
          shot('Street', `${TWO} data-regions="percent:10,20,30,40 Person 1"`),
          `compare="${m}"`,
        );
        await open(el);
        if (m === 'switch') btn(el, 'Version shown', 'AI colorization').click();
        if (m === 'fade') btn(el, 'Jump to', '50/50').click();
        await loadedTop(el);
        await waitUntil(() => customElements.get('uvalib-image-regions'));
        // The panel fades in over 0.15s; axe measures contrast through its opacity.
        await new Promise((r) => setTimeout(r, 250));
        await expectNoAxeViolations(el);
        await inDarkMode(async () => {
          await expectNoAxeViolations(el);
        });
      });
    }

    it('reflows at 320px: the controls wrap, no page scroll', async () => {
      await setViewport({ width: 320, height: 640 });
      try {
        const el = await make(shot('Street', THREE), 'compare="wipe"');
        await open(el);
        await nextFrame();
        const c = compareOf(el)!.getBoundingClientRect();
        expect(c.right).to.be.at.most(320);
        for (const b of compareOf(el)!.querySelectorAll('button, input'))
          expect(b.getBoundingClientRect().right, b.textContent ?? '').to.be.at.most(320);
        expect(dialogOf(el).querySelector('.panel')!.scrollWidth).to.be.at.most(
          dialogOf(el).querySelector('.panel')!.clientWidth,
        );
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
    });

    it('no-style keeps the stacking, the clip and the divider', async () => {
      const el = await make(shot('Street', TWO), 'compare="wipe" no-style');
      await open(el);
      await loadedTop(el);
      expect(getComputedStyle(top(el)).position).to.equal('absolute');
      expect(getComputedStyle(top(el)).clipPath).to.include('inset');
      expect(getComputedStyle(stackOf(el).querySelector('.handle')!).width).to.equal('44px');
    });
  });
}

// A version with a different framing: `frame` is the original's box in it (issue #28).
const versionsWith = (...more: Record<string, unknown>[]) =>
  `data-versions='${JSON.stringify([{ label: 'Original' }, ...more])}'`;
/** The original in the middle of a version twice its size each way. */
const WIDE = {
  label: 'Expanded frame',
  href: COLOR,
  frame: 'percent:25,25,50,50',
  note: 'Painted.',
};
const near = (a: number, b: number, what: string) => expect(Math.abs(a - b), what).to.be.below(1.5);
const rectOf = (n: Element) => {
  const r = n.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};
/** A layer's rect from its frame: the original's box within it. */
const originalIn = (n: Element, f: [number, number, number, number]) => {
  const r = rectOf(n);
  return {
    x: r.x + (r.w * f[0]) / 100,
    y: r.y + (r.h * f[1]) / 100,
    w: (r.w * f[2]) / 100,
    h: (r.h * f[3]) / 100,
  };
};
const sameRect = (a: ReturnType<typeof rectOf>, b: ReturnType<typeof rectOf>, what: string) => {
  near(a.x, b.x, `${what} x`);
  near(a.y, b.y, `${what} y`);
  near(a.w, b.w, `${what} width`);
  near(a.h, b.h, `${what} height`);
};

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-lightbox versions with a different framing (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = (inner: string, attrs = '') =>
      fixture<UvalibLightbox>(`<uvalib-lightbox ${attr} ${attrs}>${inner}</uvalib-lightbox>`);
    const framedNow = (el: Element) => stackOf(el)?.classList.contains('framed');
    const open = async (el: UvalibLightbox) => {
      el.querySelector('a')!.click();
      await el.updateComplete;
      await waitUntil(() => compareOf(el), 'comparison shown');
      await waitUntil(() => baseImg(el).complete && baseImg(el).naturalWidth > 0);
      await el.updateComplete;
    };
    const hitAt = (el: Element, fx: number, fy: number) => {
      const s = stackOf(el).getBoundingClientRect();
      const root = (el.shadowRoot ?? document) as Document | ShadowRoot;
      return root.elementFromPoint(s.left + s.width * fx, s.top + s.height * fy);
    };
    /** Let the layers take hits, to see which one is drawn where (clip-path clips hits too). */
    const hittable = (el: Element) => {
      // Only the layers drawn: a hidden one (opacity 0) would still take hits.
      for (const img of stackOf(el).querySelectorAll<HTMLImageElement>('img'))
        img.style.pointerEvents = img.matches('.top:not(.on)') ? '' : 'auto';
    };
    const what = (el: Element, n: Element | null) =>
      n === baseImg(el)
        ? 'original'
        : n === top(el)
          ? 'version'
          : n === stackOf(el) || n?.localName === 'canvas'
            ? 'empty'
            : n?.localName;

    before(async () => {
      const m = await import('../src/components/uvalib-lightbox/compare.js');
      m.compareTiming.settle = 40;
    });
    beforeEach(() => {
      history.replaceState(null, '', location.pathname);
      document.addEventListener('click', cancelNav);
    });
    afterEach(async () => {
      document.removeEventListener('click', cancelNav);
      for (const d of document.querySelectorAll('uvalib-lightbox'))
        view(d).querySelector<HTMLButtonElement>('dialog[open] button.close')?.click();
      await nextFrame();
      history.replaceState(null, '', location.pathname);
    });

    it("frame: percent and pixels (of the version's width and height) place it alike", async () => {
      const boxes: ReturnType<typeof rectOf>[] = [];
      for (const v of [
        WIDE,
        { ...WIDE, frame: '200,150,400,300', width: 800, height: 600 },
        { ...WIDE, frame: 'pixel:200,150,400,300', width: '800', height: '600' },
      ]) {
        const el = await make(shot('Street', versionsWith(v)));
        await open(el);
        await waitUntil(() => framedNow(el), 'framed');
        boxes.push(rectOf(baseImg(el)));
        dialogOf(el).querySelector<HTMLButtonElement>('button.close')!.click();
        await el.updateComplete;
      }
      sameRect(boxes[1]!, boxes[0]!, 'pixel');
      sameRect(boxes[2]!, boxes[0]!, 'pixel:');
    });

    it('an unusable frame is ignored with one warning: the same framing as today', async () => {
      for (const v of [
        { ...WIDE, frame: 'percent:abc' },
        { ...WIDE, frame: '200,150,400,300' }, // pixels without width and height
      ]) {
        let el!: UvalibLightbox;
        const warns = await warnings(async () => {
          el = await make(shot('Street', versionsWith(v)));
          await open(el);
        });
        expect(warns.filter((w) => w.includes('frame'))).to.have.length(1);
        expect(framedNow(el)).to.equal(false);
        expect(stackOf(el).querySelector('canvas')).to.equal(null);
        expect(getComputedStyle(baseImg(el)).position).to.equal('static');
      }
      // A frame on the first version (the original) is ignored too.
      const first = `data-versions='${JSON.stringify([
        { label: 'Original', frame: 'percent:0,0,50,50' },
        { label: 'Colour', href: COLOR },
      ])}'`;
      const warns = await warnings(async () => {
        const el = await make(shot('Street', first));
        await open(el);
        expect(framedNow(el)).to.equal(false);
      });
      expect(warns.filter((w) => w.includes('frame'))).to.have.length(1);
    });

    // Issue #30: a crop's frame (the original's box in the crop) is larger than the crop and
    // starts left of or above it.
    const crops: [string, Record<string, unknown>, [number, number, number, number]][] = [
      ['centred', { frame: 'percent:-25,-25,150,150' }, [-25, -25, 150, 150]],
      ['off-centre', { frame: 'percent:-50,-10,200,125' }, [-50, -10, 200, 125]],
      // A 200 × 300 crop of a 400 × 300 original, its right half: the original starts 200px left.
      ['pixels', { frame: '-200,0,400,300', width: 200, height: 300 }, [-100, 0, 200, 100]],
    ];
    for (const [name, frame, f] of crops) {
      it(`a crop (${name}): negative x/y and w/h over 100; the box is the original's, the crop at its place`, async () => {
        const crop = { label: 'Crop', href: COLOR, ...frame };
        let el!: UvalibLightbox;
        const warns = await warnings(async () => {
          el = await make(shot('Street', versionsWith(crop)));
          await open(el);
          await waitUntil(() => framedNow(el), 'framed');
        });
        expect(warns.filter((w) => w.includes('frame'))).to.deep.equal([]);
        const o = rectOf(baseImg(el));
        sameRect(rectOf(stackOf(el)), o, 'the box is the original');
        btn(el, 'Version shown', 'Crop').click();
        await loadedTop(el);
        await el.updateComplete;
        // The original's pixels line up: the crop's layer is the original's matching part.
        sameRect(originalIn(top(el), f), o, 'the original within the crop');
        sameRect(rectOf(baseImg(el)), o, 'the original stays put');
        expect(stackOf(el).classList.contains('hide-base')).to.equal(true);
        await waitUntil(() => getComputedStyle(baseImg(el)).opacity === '0', 'original hidden');
        hittable(el);
        // The original is hidden (opacity 0), so it must not count as drawn.
        baseImg(el).style.pointerEvents = 'none';
        const t = rectOf(top(el));
        const s = rectOf(stackOf(el));
        const cx = (t.x + t.w / 2 - s.x) / s.w;
        const cy = (t.y + t.h / 2 - s.y) / s.h;
        expect(what(el, hitAt(el, cx, cy))).to.equal('version');
        // Around the crop (none of them keeps the top-left corner): the pattern, the original
        // hidden in Switch.
        expect(what(el, hitAt(el, 0.02, 0.02))).to.equal('empty');
      });
    }

    it('a crop in Reveal: the crop where it exists, the pattern elsewhere on its side; the original on the other', async () => {
      const crop = { label: 'Crop', href: COLOR, frame: 'percent:-25,-25,150,150' };
      const el = await make(shot('Street', versionsWith(crop)), 'compare="wipe"');
      await open(el);
      await loadedTop(el);
      await waitUntil(() => framedNow(el), 'framed');
      await el.updateComplete;
      hittable(el);
      // The crop spans 16.7%–83.3% of the box each way; the divider is at 50%.
      expect(what(el, hitAt(el, 0.1, 0.5))).to.equal('empty');
      expect(what(el, hitAt(el, 0.3, 0.05))).to.equal('empty');
      expect(what(el, hitAt(el, 0.3, 0.5))).to.equal('version');
      expect(what(el, hitAt(el, 0.7, 0.5))).to.equal('original');
      expect(what(el, hitAt(el, 0.9, 0.05))).to.equal('original');
      range(el).value = '90';
      range(el).dispatchEvent(new Event('input'));
      await el.updateComplete;
      hittable(el);
      expect(what(el, hitAt(el, 0.87, 0.5))).to.equal('empty');
      expect(what(el, hitAt(el, 0.95, 0.5))).to.equal('original');
    });

    it('a crop in Reveal, right to left: the crop side is on the right', async () => {
      const crop = { label: 'Crop', href: COLOR, frame: 'percent:-25,-25,150,150' };
      const el = await make(shot('Street', versionsWith(crop)), 'compare="wipe" dir="rtl"');
      await open(el);
      await loadedTop(el);
      await waitUntil(() => framedNow(el), 'framed');
      await el.updateComplete;
      hittable(el);
      expect(what(el, hitAt(el, 0.9, 0.5))).to.equal('empty');
      expect(what(el, hitAt(el, 0.7, 0.5))).to.equal('version');
      expect(what(el, hitAt(el, 0.3, 0.5))).to.equal('original');
      expect(what(el, hitAt(el, 0.1, 0.5))).to.equal('original');
    });

    it("a crop in Fade: the original fades over its box; regions stay on the original's box", async () => {
      const crop = { label: 'Crop', href: COLOR, frame: 'percent:-25,-25,150,150' };
      const el = await make(
        shot('Street', `${versionsWith(crop)} data-regions="percent:10,20,30,40 Person 1"`),
        'compare="fade"',
      );
      await open(el);
      btn(el, 'Jump to', '50/50').click();
      await loadedTop(el);
      await waitUntil(() => framedNow(el), 'framed');
      await el.updateComplete;
      expect(getComputedStyle(baseImg(el)).opacity).to.equal('0.5');
      hittable(el);
      expect(what(el, hitAt(el, 0.05, 0.05))).to.equal('original');
      sameRect(originalIn(top(el), [-25, -25, 150, 150]), rectOf(baseImg(el)), 'crop placed');
      await waitUntil(() => customElements.get('uvalib-image-regions'));
      const r = dialogOf(el).querySelector<UvalibImageRegions>('uvalib-image-regions')!;
      const rv = (r.shadowRoot ?? r) as ParentNode;
      await waitUntil(() => rv.querySelector('.overlay > .region:not([hidden])'));
      sameRect(rectOf(rv.querySelector('.overlay')!), rectOf(baseImg(el)), 'overlay');
    });

    it('a frame still needs a positive width and height (one warning)', async () => {
      for (const frame of ['percent:-10,-10,0,50', 'percent:-10,-10,-50,50', 'percent:10,10,50,-5']) {
        let el!: UvalibLightbox;
        const warns = await warnings(async () => {
          el = await make(shot('Street', versionsWith({ ...WIDE, frame })));
          await open(el);
        });
        expect(warns.filter((w) => w.includes('frame')), frame).to.have.length(1);
        expect(framedNow(el), frame).to.equal(false);
        dialogOf(el).querySelector<HTMLButtonElement>('button.close')!.click();
        await el.updateComplete;
      }
    });

    it('without a frame nothing changes: no sizer, no framed class, no regions inset', async () => {
      const el = await make(shot('Street', `${TWO} data-regions="percent:10,20,30,40 P"`));
      await open(el);
      expect(framedNow(el)).to.equal(false);
      expect(stackOf(el).querySelector('canvas')).to.equal(null);
      const r = dialogOf(el).querySelector<HTMLElement>('uvalib-image-regions')!;
      expect(r.hasAttribute('style')).to.equal(false);
    });

    it("the box holds every version at the original's scale; the original lines up in each", async () => {
      // One version reaches right (the original fills its left 80%), one left and down.
      const right = { label: 'Right', href: COLOR, frame: 'percent:0,0,80,100' };
      const left = { label: 'Left', href: THIRD, frame: 'percent:20,0,80,80' };
      const el = await make(shot('Street', versionsWith(right, left)));
      await open(el);
      await waitUntil(() => framedNow(el), 'framed');
      const s = rectOf(stackOf(el));
      const o = rectOf(baseImg(el));
      // Union: 1.5 originals across (0.25 each side), 1.25 down; the original keeps 4:3.
      near(o.w / o.h, 4 / 3, 'original aspect');
      near(s.w, o.w * 1.5, 'stack width');
      near(s.h, o.h * 1.25, 'stack height');
      near(o.x - s.x, o.w * 0.25, 'original left');
      near(o.y, s.y, 'original top');
      const canvas = stackOf(el).querySelector('canvas')!;
      expect(canvas.getAttribute('aria-hidden')).to.equal('true');
      expect([canvas.width, canvas.height]).to.deep.equal([600, 375]);
      for (const [i, label, f] of [
        [1, 'Right', [0, 0, 80, 100]],
        [2, 'Left', [20, 0, 80, 80]],
      ] as const) {
        btn(el, 'Version shown', label).click();
        await loadedTop(el, i);
        await el.updateComplete;
        sameRect(originalIn(top(el, i), [...f]), o, label);
        sameRect(rectOf(stackOf(el)), s, `${label}: the stack`);
        sameRect(rectOf(baseImg(el)), o, `${label}: the original`);
      }
    });

    it('switch: each version at its place; around the original, empty (a pattern, not content)', async () => {
      const el = await make(shot('Street', versionsWith(WIDE)));
      await open(el);
      await waitUntil(() => framedNow(el), 'framed');
      hittable(el);
      expect(what(el, hitAt(el, 0.5, 0.5))).to.equal('original');
      expect(what(el, hitAt(el, 0.1, 0.1))).to.equal('empty');
      expect(getComputedStyle(stackOf(el)).backgroundImage).to.include('gradient');
      btn(el, 'Version shown', 'Expanded frame').click();
      await loadedTop(el);
      await el.updateComplete;
      hittable(el);
      sameRect(rectOf(top(el)), rectOf(stackOf(el)), 'the version fills the box');
      expect(what(el, hitAt(el, 0.1, 0.1))).to.equal('version');
      expect(what(el, hitAt(el, 0.5, 0.5))).to.equal('version');
      expect(baseImg(el).getAttribute('alt')).to.equal('Street (Expanded frame)');
    });

    it('switch: a version inside the original (a crop) hides it', async () => {
      const crop = { label: 'Crop', href: COLOR, frame: 'percent:0,0,200,200' };
      const el = await make(shot('Street', versionsWith(crop)));
      await open(el);
      await waitUntil(() => framedNow(el), 'framed');
      sameRect(rectOf(stackOf(el)), rectOf(baseImg(el)), 'the box is the original');
      btn(el, 'Version shown', 'Crop').click();
      await loadedTop(el);
      await el.updateComplete;
      expect(stackOf(el).classList.contains('hide-base')).to.equal(true);
      const t = rectOf(top(el));
      const o = rectOf(baseImg(el));
      near(t.w, o.w / 2, 'crop width');
      near(t.x, o.x, 'crop left');
    });

    it('reveal: the version left of the divider; right of it, the original over its box and empty around it', async () => {
      const el = await make(shot('Street', versionsWith(WIDE)), 'compare="wipe"');
      await open(el);
      await loadedTop(el);
      await waitUntil(() => framedNow(el), 'framed');
      await el.updateComplete;
      hittable(el);
      // The original spans 25%–75% of the box; the divider is at 50%.
      expect(what(el, hitAt(el, 0.1, 0.5))).to.equal('version');
      expect(what(el, hitAt(el, 0.4, 0.5))).to.equal('version');
      expect(what(el, hitAt(el, 0.6, 0.5))).to.equal('original');
      expect(what(el, hitAt(el, 0.9, 0.5))).to.equal('empty');
      expect(what(el, hitAt(el, 0.6, 0.1))).to.equal('empty');
      // The divider spans the whole box, and the photo maps clicks across it.
      const s = rectOf(stackOf(el));
      const d = rectOf(stackOf(el).querySelector('.divider')!);
      near(d.y, s.y, 'divider top');
      near(d.h, s.h, 'divider height');
      near(d.x, s.x + s.w / 2, 'divider at 50%');
      range(el).value = '20';
      range(el).dispatchEvent(new Event('input'));
      await el.updateComplete;
      hittable(el);
      expect(what(el, hitAt(el, 0.15, 0.5))).to.equal('version');
      expect(what(el, hitAt(el, 0.3, 0.5))).to.equal('original');
      near(rectOf(stackOf(el).querySelector('.divider')!).x, s.x + s.w * 0.2, 'divider at 20%');
    });

    it('reveal in right-to-left: the version on the right of the divider', async () => {
      const el = await make(shot('Street', versionsWith(WIDE)), 'compare="wipe" dir="rtl"');
      await open(el);
      await loadedTop(el);
      await waitUntil(() => framedNow(el), 'framed');
      await el.updateComplete;
      hittable(el);
      expect(what(el, hitAt(el, 0.9, 0.5))).to.equal('version');
      expect(what(el, hitAt(el, 0.6, 0.5))).to.equal('version');
      expect(what(el, hitAt(el, 0.4, 0.5))).to.equal('original');
      expect(what(el, hitAt(el, 0.1, 0.5))).to.equal('empty');
    });

    it('fade: the original fades over its box; outside it, the version', async () => {
      const el = await make(shot('Street', versionsWith(WIDE)), 'compare="fade"');
      await open(el);
      expect(getComputedStyle(baseImg(el)).opacity).to.equal('1');
      btn(el, 'Jump to', '50/50').click();
      await loadedTop(el);
      await waitUntil(() => framedNow(el), 'framed');
      await el.updateComplete;
      expect(getComputedStyle(baseImg(el)).opacity).to.equal('0.5');
      expect(getComputedStyle(top(el)).opacity).to.equal('1');
      hittable(el);
      expect(what(el, hitAt(el, 0.5, 0.5))).to.equal('original');
      expect(what(el, hitAt(el, 0.1, 0.5))).to.equal('version');
      expect(baseImg(el).getAttribute('alt')).to.equal(
        'Street (Original and Expanded frame, blended)',
      );
      // Hold shows the original alone.
      const hold = compareOf(el)!.querySelector<HTMLButtonElement>('button.hold')!;
      hold.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      await el.updateComplete;
      expect(getComputedStyle(baseImg(el)).opacity).to.equal('1');
      expect(getComputedStyle(top(el)).opacity).to.equal('0');
      hold.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    it("regions stay on the original's box in every mode and version", async () => {
      const el = await make(
        shot('Group', `${versionsWith(WIDE)} data-regions="percent:10,20,30,40 Person 1"`),
      );
      await open(el);
      await waitUntil(() => customElements.get('uvalib-image-regions'));
      const r = dialogOf(el).querySelector<UvalibImageRegions>('uvalib-image-regions')!;
      const rv = (r.shadowRoot ?? r) as ParentNode;
      await waitUntil(() => rv.querySelector('.overlay > .region:not([hidden])'));
      await waitUntil(() => framedNow(el), 'framed');
      await el.updateComplete;
      const check = (label: string) => {
        const o = rectOf(baseImg(el));
        sameRect(rectOf(rv.querySelector('.overlay')!), o, `${label}: overlay`);
        const box = rectOf(rv.querySelector('.overlay > .region')!);
        near(box.x, o.x + o.w * 0.1, `${label}: outline left`);
        near(box.w, o.w * 0.3, `${label}: outline width`);
        near(box.y, o.y + o.h * 0.2, `${label}: outline top`);
      };
      check('switch, original');
      btn(el, 'Version shown', 'Expanded frame').click();
      await loadedTop(el);
      await el.updateComplete;
      check('switch, version');
      for (const m of ['Reveal', 'Fade']) {
        btn(el, 'Compare versions', m).click();
        await el.updateComplete;
        await nextFrame();
        check(m);
      }
    });

    it('no layout shift: when the framed version loads, and on mode change at 375px', async () => {
      await setViewport({ width: 375, height: 812 });
      try {
        const el = await make(shot('Street', versionsWith(WIDE)));
        await open(el);
        await waitUntil(() => framedNow(el), 'framed');
        const at = () => {
          const r = stackOf(el).getBoundingClientRect();
          return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
        };
        const first = at();
        expect(top(el).hasAttribute('src')).to.equal(false);
        btn(el, 'Version shown', 'Expanded frame').click();
        await loadedTop(el);
        await el.updateComplete;
        await nextFrame();
        expect(at(), 'version loaded').to.deep.equal(first);
        for (const m of ['Reveal', 'Fade', 'Switch', 'Reveal']) {
          btn(el, 'Compare versions', m).click();
          await el.updateComplete;
          await nextFrame();
          expect(at(), m).to.deep.equal(first);
        }
        expect(document.documentElement.scrollWidth).to.be.at.most(375);
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
    });

    it('reflows at 320px', async () => {
      await setViewport({ width: 320, height: 640 });
      try {
        const el = await make(shot('Street', versionsWith(WIDE)), 'compare="wipe"');
        await open(el);
        await waitUntil(() => framedNow(el), 'framed');
        await nextFrame();
        expect(stackOf(el).getBoundingClientRect().right).to.be.at.most(320);
        const panel = dialogOf(el).querySelector('.panel')!;
        expect(panel.scrollWidth).to.be.at.most(panel.clientWidth);
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
    });

    for (const m of ['switch', 'wipe'] as const) {
      it(`passes axe with a frame in ${m}, light and dark`, async () => {
        const el = await make(
          shot('Street', `${versionsWith(WIDE)} data-regions="percent:10,20,30,40 Person 1"`),
          `compare="${m}"`,
        );
        await open(el);
        if (m === 'switch') btn(el, 'Version shown', 'Expanded frame').click();
        await loadedTop(el);
        await waitUntil(() => customElements.get('uvalib-image-regions'));
        await waitUntil(() => framedNow(el), 'framed');
        await new Promise((r) => setTimeout(r, 250));
        await expectNoAxeViolations(el);
        await inDarkMode(async () => {
          await expectNoAxeViolations(el);
        });
      });
    }
  });
}
