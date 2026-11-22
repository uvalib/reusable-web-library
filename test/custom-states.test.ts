import { expect, fixture, nextFrame, waitUntil } from '@open-wc/testing';
import { sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-combobox/uvalib-combobox.js';
import '../src/components/uvalib-filter-drawer/uvalib-filter-drawer.js';
import '../src/components/uvalib-lightbox/uvalib-lightbox.js';
import '../src/components/uvalib-tag-list/uvalib-tag-list.js';
import { setState } from '../src/base/states.js';
import {
  comboboxTiming,
  type UvalibCombobox,
} from '../src/components/uvalib-combobox/UvalibCombobox.js';
import type { UvalibFilterDrawer } from '../src/components/uvalib-filter-drawer/UvalibFilterDrawer.js';
import type { UvalibLightbox } from '../src/components/uvalib-lightbox/UvalibLightbox.js';
import type { UvalibTagList } from '../src/components/uvalib-tag-list/UvalibTagList.js';

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4AWP4z8Dwn4Hh/38AD/kD/dtv74kAAAAASUVORK5CYII=';
const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const is = (el: Element, state: string) => el.matches(`:state(${state})`);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cancelNav(e: Event): void {
  if (e.composedPath().some((n) => n instanceof HTMLAnchorElement)) e.preventDefault();
}

describe('custom states helper', () => {
  it('is a no-op without internals or states, and where the name is refused', () => {
    expect(() => setState(undefined, 'open', true)).not.to.throw();
    expect(() => setState({} as ElementInternals, 'open', true)).not.to.throw();
    const refusing = {
      states: {
        add: () => {
          throw new DOMException('old syntax only', 'SyntaxError');
        },
        delete: () => false,
      },
    } as unknown as ElementInternals;
    expect(() => setState(refusing, 'open', true)).not.to.throw();
  });

  it('a page stylesheet can style a state, which a page cannot set', async () => {
    const wrap = await fixture<HTMLDivElement>(`<div>
      <style>uvalib-tag-list:state(expanded) { outline: 3px solid rgb(1, 2, 3); }</style>
      <uvalib-tag-list label="Subjects" limit="1"><span>A</span><span>B</span></uvalib-tag-list>
    </div>`);
    const el = wrap.querySelector<UvalibTagList>('uvalib-tag-list')!;
    await el.updateComplete;
    expect(getComputedStyle(el).outlineColor).not.to.equal('rgb(1, 2, 3)');
    el.setAttribute('state', 'expanded');
    expect(is(el, 'expanded')).to.equal(false);
    root(el).querySelector<HTMLButtonElement>('button.toggle')!.click();
    await el.updateComplete;
    expect(getComputedStyle(el).outlineColor).to.equal('rgb(1, 2, 3)');
    // No attribute is reflected for it.
    expect(el.getAttributeNames().filter((n) => /expanded/.test(n))).to.deep.equal([]);
  });
});

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';

  describe(`custom states (${mode})`, () => {
    const saved = { ...comboboxTiming };
    beforeEach(() => {
      comboboxTiming.debounce = 20;
      comboboxTiming.announce = 20;
    });
    afterEach(async () => {
      Object.assign(comboboxTiming, saved);
      (document.activeElement as HTMLElement | null)?.blur();
      await setViewport({ width: 800, height: 600 });
    });

    it('uvalib-combobox: open, invalid and loading follow the field', async () => {
      const el = await fixture<UvalibCombobox>(
        `<uvalib-combobox ${attr} label="Person" must-choose></uvalib-combobox>`,
      );
      el.items = ['Ada Ellis', 'Noel Park'];
      await el.updateComplete;
      const input = root(el).querySelector<HTMLInputElement>('[role="combobox"]')!;
      expect(is(el, 'open')).to.equal(false);
      input.focus();
      await sendKeys({ type: 'ad' });
      await el.updateComplete;
      expect(is(el, 'open')).to.equal(true);
      await sendKeys({ press: 'Escape' });
      await el.updateComplete;
      expect(is(el, 'open')).to.equal(false);
      // Text that is not a suggestion, then leaving the field: invalid (aria-invalid too).
      await sendKeys({ type: 'x' });
      await el.updateComplete;
      expect(is(el, 'invalid')).to.equal(false);
      input.blur();
      await el.updateComplete;
      expect(input.getAttribute('aria-invalid')).to.equal('true');
      expect(is(el, 'invalid')).to.equal(true);
      input.focus();
      await sendKeys({ press: 'Backspace' });
      await el.updateComplete;
      expect(is(el, 'invalid')).to.equal(false);

      // loading: while a `src` request is pending.
      const orig = window.fetch;
      let release = () => {};
      window.fetch = (() =>
        new Promise<Response>((resolve) => {
          release = () => resolve(new Response('["Ada Ellis"]'));
        })) as typeof fetch;
      try {
        el.src = '/people?q={q}';
        await el.updateComplete;
        await sendKeys({ type: 'q' });
        await el.updateComplete;
        expect(is(el, 'loading')).to.equal(true);
        await wait(40);
        release();
        await waitUntil(() => !is(el, 'loading'), 'loading ends');
        expect(is(el, 'open')).to.equal(true);
      } finally {
        window.fetch = orig;
      }
    });

    it('uvalib-filter-drawer: modal below the breakpoint, open with the panel', async () => {
      await setViewport({ width: 1000, height: 700 });
      const el = await fixture<UvalibFilterDrawer>(
        `<uvalib-filter-drawer ${attr}><p>Filters</p></uvalib-filter-drawer>`,
      );
      await el.updateComplete;
      expect(is(el, 'modal')).to.equal(false);
      expect(is(el, 'open')).to.equal(false);
      await setViewport({ width: 390, height: 700 });
      await waitUntil(() => is(el, 'modal'), 'modal at a phone width');
      el.show();
      await el.updateComplete;
      expect(is(el, 'open')).to.equal(true);
      await sendKeys({ press: 'Escape' });
      await waitUntil(() => !is(el, 'open'), 'Escape closes it');
      el.show();
      await el.updateComplete;
      expect(is(el, 'open')).to.equal(true);
      // Widening past the breakpoint closes it and leaves the modal layout.
      await setViewport({ width: 1000, height: 700 });
      await waitUntil(() => !is(el, 'modal') && !is(el, 'open'), 'wide again');
    });

    it('uvalib-lightbox: open while the viewer is', async () => {
      history.replaceState(null, '', location.pathname);
      document.addEventListener('click', cancelNav);
      try {
        const el = await fixture<UvalibLightbox>(`<uvalib-lightbox ${attr}>
          <a href="${PNG}" data-caption="One"><img alt="One" width="80" height="48"></a>
        </uvalib-lightbox>`);
        await el.updateComplete;
        expect(is(el, 'open')).to.equal(false);
        expect(el.open(0)).to.equal(true);
        await el.updateComplete;
        await nextFrame();
        expect(is(el, 'open')).to.equal(true);
        el.close();
        await el.updateComplete;
        expect(is(el, 'open')).to.equal(false);
      } finally {
        document.removeEventListener('click', cancelNav);
        history.replaceState(null, '', location.pathname);
      }
    });

    it('uvalib-tag-list: expanded after Show all, not after Show fewer', async () => {
      const el = await fixture<UvalibTagList>(
        `<uvalib-tag-list ${attr} label="Subjects" limit="2"><span>A</span><span>B</span><span>C</span></uvalib-tag-list>`,
      );
      await el.updateComplete;
      const btn = root(el).querySelector<HTMLButtonElement>('button.toggle')!;
      expect(is(el, 'expanded')).to.equal(false);
      btn.click();
      await el.updateComplete;
      expect(btn.getAttribute('aria-expanded')).to.equal('true');
      expect(is(el, 'expanded')).to.equal(true);
      btn.click();
      await el.updateComplete;
      expect(is(el, 'expanded')).to.equal(false);
    });
  });
}
