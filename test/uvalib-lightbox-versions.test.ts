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

    it('Full size: the version shown, or both (named) in Reveal and Fade', async () => {
      const el = await make(shot('Street', TWO));
      await open(el);
      expect(fullLinks(el)).to.deep.equal([{ href: ORIG, text: 'Full size (opens in a new tab)' }]);
      btn(el, 'Version shown', 'AI colorization').click();
      await el.updateComplete;
      expect(fullLinks(el)).to.deep.equal([
        { href: COLOR, text: 'Full size (opens in a new tab)' },
      ]);
      btn(el, 'Compare versions', 'Reveal').click();
      await el.updateComplete;
      expect(fullLinks(el)).to.deep.equal([
        { href: ORIG, text: 'Full size, Original (opens in a new tab)' },
        { href: COLOR, text: 'Full size, AI colorization (opens in a new tab)' },
      ]);
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
