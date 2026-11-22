import { expect, fixture, nextFrame, waitUntil } from '@open-wc/testing';
import { sendKeys, sendMouse, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-combobox/uvalib-combobox.js';
import '../src/components/uvalib-filter-drawer/uvalib-filter-drawer.js';
import {
  comboboxSupport,
  comboboxTiming,
  type ComboboxItem,
  type UvalibCombobox,
} from '../src/components/uvalib-combobox/UvalibCombobox.js';
import type { UvalibFilterDrawer } from '../src/components/uvalib-filter-drawer/UvalibFilterDrawer.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { inDarkMode } from './helpers/dark.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const input = (el: Element) => root(el).querySelector<HTMLInputElement>('[role="combobox"]')!;
const options = (el: Element) => [...root(el).querySelectorAll<HTMLElement>('[role="option"]')];
const popup = (el: Element) => root(el).querySelector<HTMLElement>('.popup')!;
const focused = (el: Element) =>
  (el.shadowRoot ? el.shadowRoot.activeElement : document.activeElement) === input(el);
/** The element painted at a point, inside the combobox's shadow root when it has one. */
const hit = (el: Element, x: number, y: number) =>
  (el.shadowRoot ?? document).elementFromPoint(x, y);
const centre = (node: Element) => {
  const r = node.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
};

const PEOPLE: ComboboxItem[] = [
  { value: 'p1', label: 'Elena Marsh', description: 'Photographer' },
  { value: 'p2', label: 'Amelia Stone' },
  { value: 'p3', label: 'Ada Ellis' },
  { value: 'p4', label: 'Émile Durand' },
  { value: 'p5', label: 'Bruno Kelp', disabled: true },
  { value: 'p6', label: 'Noel Park' },
];

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-combobox top layer (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const saved = { ...comboboxTiming };
    const supported = comboboxSupport.topLayer;

    /** A combobox in a 60px box that clips its overflow, below `before`px of page. */
    const clipped = async (before = 0) => {
      const wrap = await fixture<HTMLDivElement>(`<div>
        <div style="height: ${before}px"></div>
        <div class="clip" style="overflow: hidden; height: 90px; position: relative">
          <uvalib-combobox ${attr} label="Person"></uvalib-combobox>
        </div>
      </div>`);
      const el = wrap.querySelector<UvalibCombobox>('uvalib-combobox')!;
      el.items = PEOPLE;
      await el.updateComplete;
      return { wrap, el, clip: wrap.querySelector<HTMLElement>('.clip')! };
    };
    const type = async (el: UvalibCombobox, text: string) => {
      input(el).focus();
      await sendKeys({ type: text });
      await el.updateComplete;
      await nextFrame();
    };

    beforeEach(() => {
      comboboxTiming.debounce = 30;
      comboboxTiming.announce = 40;
    });
    afterEach(async () => {
      Object.assign(comboboxTiming, saved);
      comboboxSupport.topLayer = supported;
      (document.activeElement as HTMLElement | null)?.blur();
      await sendMouse({ type: 'move', position: [0, 0] });
    });

    it('the test browser supports the top layer (Chromium with anchor positioning)', () => {
      expect(supported).to.equal(true);
    });

    it('an overflow: hidden ancestor does not clip the popup; a click chooses without blurring', async () => {
      const { el, clip } = await clipped();
      await type(el, 'e');
      const p = popup(el);
      expect(p.getAttribute('popover')).to.equal('manual');
      expect(p.matches(':popover-open')).to.equal(true);
      const box = p.getBoundingClientRect();
      const field = input(el).getBoundingClientRect();
      const area = clip.getBoundingClientRect();
      expect(box.bottom).to.be.greaterThan(area.bottom + 40);
      expect(Math.round(box.top - field.bottom)).to.be.within(0, 4);
      expect(Math.round(box.left)).to.equal(Math.round(field.left));
      expect(Math.round(box.width)).to.equal(Math.round(field.width));
      // The last option lies outside the clipping box, and is what is painted there.
      const last = options(el).at(-1)!;
      const at = centre(last);
      expect(at.y).to.be.greaterThan(area.bottom);
      expect(hit(el, at.x, at.y)?.closest('[role="option"]')?.id).to.equal(last.id);
      // A real click there chooses it, and the field keeps focus (mousedown is cancelled).
      const label = last.querySelector('.option-label')!.textContent!.trim();
      await sendMouse({ type: 'click', position: [at.x, at.y] });
      await el.updateComplete;
      expect(el.value).to.equal(label);
      expect(focused(el)).to.equal(true);
      expect(p.matches(':popover-open')).to.equal(false);
      expect(input(el).getAttribute('aria-expanded')).to.equal('false');
    });

    it('keeps the ARIA wiring: combobox, expanded, controls, activedescendant, listbox', async () => {
      const { el } = await clipped();
      await type(el, 'e');
      const field = input(el);
      const list = root(el).querySelector('[role="listbox"]')!;
      expect(field.getAttribute('aria-expanded')).to.equal('true');
      expect(field.getAttribute('aria-controls')).to.equal(list.id);
      expect(popup(el).contains(list)).to.equal(true);
      await sendKeys({ press: 'ArrowDown' });
      await el.updateComplete;
      expect(field.getAttribute('aria-activedescendant')).to.equal(options(el)[0]!.id);
      await sendKeys({ press: 'Escape' });
      await el.updateComplete;
      expect(popup(el).matches(':popover-open')).to.equal(false);
      expect(el.value).to.equal('e');
    });

    it('opens above the field near the bottom of the viewport', async () => {
      await setViewport({ width: 800, height: 600 });
      const { el } = await clipped(0);
      // Put the field 60px from the bottom of the viewport.
      const top = input(el).getBoundingClientRect().top;
      el.closest<HTMLElement>('.clip')!.previousElementSibling!.setAttribute(
        'style',
        `height: ${Math.max(0, 600 - 60 - top)}px`,
      );
      await type(el, 'e');
      const field = input(el).getBoundingClientRect();
      expect(field.bottom).to.be.within(540, 600);
      const box = popup(el).getBoundingClientRect();
      expect(box.bottom).to.be.at.most(field.top + 1);
      expect(box.top).to.be.at.least(0);
      expect(Math.round(box.width)).to.equal(Math.round(field.width));
    });

    it('keeps the active option in view inside the popup', async () => {
      const { el } = await clipped();
      el.items = Array.from({ length: 40 }, (_, i) => `Person ${i + 1}`);
      await el.updateComplete;
      await type(el, 'person');
      const p = popup(el);
      expect(p.scrollHeight).to.be.greaterThan(p.clientHeight);
      await sendKeys({ press: 'ArrowUp' });
      await el.updateComplete;
      const opt = options(el).at(-1)!;
      const a = opt.getBoundingClientRect();
      const b = p.getBoundingClientRect();
      expect(a.bottom).to.be.at.most(b.bottom + 1);
      expect(a.top).to.be.at.least(b.top - 1);
    });

    it('reflows at 320px: the popup is the field width, inside the viewport', async () => {
      await setViewport({ width: 320, height: 640 });
      try {
        const { el } = await clipped();
        await type(el, 'a');
        const box = popup(el).getBoundingClientRect();
        expect(box.left).to.be.at.least(0);
        expect(box.right).to.be.at.most(320);
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
        for (const o of options(el)) expect(o.getBoundingClientRect().height).to.be.at.least(44);
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
    });

    it('passes axe open in the top layer, light and dark', async () => {
      const { el } = await clipped();
      await type(el, 'e');
      await expectNoAxeViolations(el);
      await inDarkMode(async () => {
        await el.updateComplete;
        await expectNoAxeViolations(el);
      });
    });

    it('without anchor positioning it stays absolutely positioned, as before', async () => {
      comboboxSupport.topLayer = false;
      const { el, clip } = await clipped();
      await type(el, 'e');
      const p = popup(el);
      expect(p.hasAttribute('popover')).to.equal(false);
      expect(getComputedStyle(p).position).to.equal('absolute');
      expect(input(el).style.getPropertyValue('anchor-name')).to.equal('');
      const field = input(el).getBoundingClientRect();
      const box = p.getBoundingClientRect();
      expect(Math.round(box.top - field.bottom)).to.be.within(0, 4);
      expect(Math.round(box.width)).to.equal(Math.round(field.width));
      // The known limitation: the clipping box hides what lies outside it.
      const last = options(el).at(-1)!;
      const at = centre(last);
      expect(at.y).to.be.greaterThan(clip.getBoundingClientRect().bottom);
      expect(hit(el, at.x, at.y)?.closest('[role="option"]')).to.equal(null);
      // Keyboard and choosing work the same.
      await sendKeys({ press: 'ArrowDown' });
      await sendKeys({ press: 'Enter' });
      await el.updateComplete;
      expect(el.value).to.equal('Elena Marsh');
      expect(focused(el)).to.equal(true);
      expect(p.hidden).to.equal(true);
    });

    it('inside <uvalib-filter-drawer> on a phone: above the modal panel, and a tap chooses', async () => {
      await setViewport({ width: 390, height: 700 });
      try {
        const wrap = await fixture<HTMLDivElement>(`<div>
          <uvalib-filter-drawer ${attr}>
            <div style="height: 520px"></div>
            <uvalib-combobox ${attr} label="Person"></uvalib-combobox>
            <div style="height: 400px"></div>
          </uvalib-filter-drawer>
        </div>`);
        const drawer = wrap.querySelector<UvalibFilterDrawer>('uvalib-filter-drawer')!;
        const el = wrap.querySelector<UvalibCombobox>('uvalib-combobox')!;
        el.items = PEOPLE;
        await drawer.updateComplete;
        drawer.show();
        await drawer.updateComplete;
        expect(drawer.open).to.equal(true);
        input(el).scrollIntoView({ block: 'center' });
        await type(el, 'e');
        const p = popup(el);
        expect(p.matches(':popover-open')).to.equal(true);
        await waitUntil(() => {
          const last = options(el).at(-1);
          if (!last) return false;
          const at = centre(last);
          return hit(el, at.x, at.y)?.closest('[role="option"]')?.id === last.id;
        }, 'the last option is painted above the dialog');
        const last = options(el).at(-1)!;
        const label = last.querySelector('.option-label')!.textContent!.trim();
        const at = centre(last);
        await sendMouse({ type: 'click', position: [at.x, at.y] });
        await el.updateComplete;
        expect(el.value).to.equal(label);
        expect(focused(el)).to.equal(true);
        expect(drawer.open).to.equal(true);
        await sendKeys({ press: 'Escape' });
        await el.updateComplete;
        // The first Escape clears the field (the list was closed); the panel stays open.
        expect(el.value).to.equal('');
        expect(drawer.open).to.equal(true);
        drawer.close();
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
    });
  });
}
