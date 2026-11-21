import { expect, fixture, nextFrame, waitUntil } from '@open-wc/testing';
import { emulateMedia, sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-filter-drawer/uvalib-filter-drawer.js';
import '../src/components/uvalib-filter/uvalib-filter.js';
import '../src/components/uvalib-results-count/uvalib-results-count.js';
import '../src/components/site-page/site-page.js';
import type { UvalibFilterDrawer } from '../src/components/uvalib-filter-drawer/UvalibFilterDrawer.js';
import type { UvalibFilter } from '../src/components/uvalib-filter/UvalibFilter.js';
import type { UvalibResultsCount } from '../src/components/uvalib-results-count/UvalibResultsCount.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { recordAnalytics } from './helpers/analytics.js';
import { inDarkMode } from './helpers/dark.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const toggle = (el: Element) => root(el).querySelector<HTMLButtonElement>('button.fd-toggle')!;
const dialog = (el: Element) => root(el).querySelector<HTMLDialogElement>('dialog.fd-dialog')!;
const closeBtn = (el: Element) => root(el).querySelector<HTMLButtonElement>('button.fd-close')!;
const heading = (el: Element) => root(el).querySelector<HTMLElement>('.fd-heading')!;
const mirror = (el: Element) => root(el).querySelector<HTMLElement>('.fd-mirror')!;
const sidebar = (el: Element) => root(el).querySelector<HTMLElement>('.fd-sidebar')!;
const body = (el: Element) => root(el).querySelector<HTMLElement>('.fd-body')!;
/** Whether `node` is focused, through shadow roots. */
const isFocused = (node: Element) => {
  let a = document.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a === node;
};
const visible = (node: Element) => {
  const r = node.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(node).visibility !== 'hidden';
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const WIDE = { width: 1000, height: 700 };
const NARROW = { width: 390, height: 700 };

const FILTER = {
  name: 'format',
  title: 'Format',
  position: 0,
  buckets: [
    { key: 'Minutes', doc_count: 12, selected: false },
    { key: 'Reports', doc_count: 4, selected: false },
  ],
};

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-filter-drawer (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    afterEach(async () => {
      await setViewport({ width: 800, height: 600 });
    });

    async function make(attrs = '', viewport = NARROW) {
      await setViewport(viewport);
      const wrap = await fixture<HTMLDivElement>(`<div>
        <button id="outside" type="button" style="min-height: 44px">Outside</button>
        <uvalib-filter-drawer ${attr} ${attrs}>
          <form role="search" id="form">
            <label for="q">Search minutes</label>
            <input id="q" name="q" type="search" />
          </form>
          <uvalib-filter id="format"></uvalib-filter>
        </uvalib-filter-drawer>
        <p id="status"></p>
        <uvalib-results-count id="count" total="40" announce-delay="0"></uvalib-results-count>
      </div>`);
      const el = wrap.querySelector<UvalibFilterDrawer>('uvalib-filter-drawer')!;
      const filter = wrap.querySelector<UvalibFilter>('uvalib-filter')!;
      filter.filter = FILTER;
      await el.updateComplete;
      await filter.updateComplete;
      return { wrap, el, filter, input: wrap.querySelector<HTMLInputElement>('#q')! };
    }

    async function open(el: UvalibFilterDrawer) {
      toggle(el).click();
      await el.updateComplete;
      expect(dialog(el).open).to.equal(true);
    }

    it('above the breakpoint: a plain sidebar, no button and no dialog', async () => {
      const { el, input } = await make('', WIDE);
      expect(toggle(el).hidden).to.equal(true);
      expect(visible(toggle(el))).to.equal(false);
      expect(dialog(el).open).to.equal(false);
      expect(body(el).parentElement === sidebar(el)).to.equal(true);
      expect(visible(input)).to.equal(true);
      // Nothing with a dialog role is rendered: the closed <dialog> is display: none.
      expect(getComputedStyle(dialog(el)).display).to.equal('none');
      el.show(); // ignored on wide screens
      expect(dialog(el).open).to.equal(false);
      await expectNoAxeViolations(el.parentElement!);
    });

    it('at the breakpoint: the button, with the count, opens a modal panel and Close takes focus', async () => {
      const { el, input } = await make('count="3" label="Search and filters"', {
        width: 768,
        height: 700,
      });
      const t = toggle(el);
      expect(visible(t)).to.equal(true);
      expect(visible(input)).to.equal(false);
      expect(t.textContent!.replace(/\s+/g, ' ').trim()).to.equal('Search and filters, 3 active');
      expect(t.getAttribute('aria-haspopup')).to.equal('dialog');
      expect(t.getAttribute('aria-expanded')).to.equal('false');
      expect(t.getBoundingClientRect().height).to.be.at.least(44);
      await open(el);
      const d = dialog(el);
      expect(d.matches(':modal')).to.equal(true);
      expect(el.open).to.equal(true);
      expect(t.getAttribute('aria-expanded')).to.equal('true');
      expect(isFocused(closeBtn(el))).to.equal(true);
      expect(d.getAttribute('aria-labelledby')).to.equal(heading(el).id);
      expect(heading(el).textContent!.trim()).to.equal('Search and filters');
      expect(visible(heading(el))).to.equal(true);
      expect(visible(input)).to.equal(true);
      const close = closeBtn(el).getBoundingClientRect();
      expect(close.height).to.be.at.least(44);
      expect(close.width).to.be.at.least(44);
      closeBtn(el).click();
      await el.updateComplete;
      expect(d.open).to.equal(false);
      expect(el.open).to.equal(false);
      expect(isFocused(t)).to.equal(true);
      // No count: no badge.
      el.count = 0;
      await el.updateComplete;
      expect(t.textContent!.replace(/\s+/g, ' ').trim()).to.equal('Search and filters');
    });

    it('Escape closes it and focus returns to the button', async () => {
      const { el } = await make();
      await open(el);
      await sendKeys({ press: 'Escape' });
      await waitUntil(() => !el.open, 'Escape did not close');
      expect(dialog(el).open).to.equal(false);
      expect(isFocused(toggle(el))).to.equal(true);
    });

    it('a click on the backdrop closes it; a click inside the panel does not', async () => {
      const { el, input } = await make();
      await open(el);
      for (const a of dialog(el).getAnimations()) a.finish();
      input.click();
      heading(el).click();
      await el.updateComplete;
      expect(el.open).to.equal(true);
      const r = dialog(el).getBoundingClientRect();
      expect(r.right).to.be.below(NARROW.width);
      dialog(el).dispatchEvent(
        new MouseEvent('click', { bubbles: true, clientX: r.right + 10, clientY: 100 }),
      );
      await waitUntil(() => !el.open, 'backdrop click did not close');
      expect(isFocused(toggle(el))).to.equal(true);
    });

    it('the rest of the page is inert while it is open', async () => {
      const { el, wrap, input } = await make();
      await open(el);
      const outside = wrap.querySelector<HTMLButtonElement>('#outside')!;
      outside.focus();
      expect(isFocused(outside)).to.equal(false);
      input.focus();
      expect(isFocused(input)).to.equal(true);
      closeBtn(el).click();
      await el.updateComplete;
      outside.focus();
      expect(isFocused(outside)).to.equal(true);
    });

    it("inside <site-page>, its shadow chrome (the main landmark, the header's links) is inert too", async () => {
      await setViewport(NARROW);
      const page = await fixture<HTMLElement & { updateComplete: Promise<unknown> }>(
        `<site-page no-alerts no-main-nav><h1>Minutes</h1><uvalib-filter-drawer ${attr}><input id="q2" aria-label="Search" /></uvalib-filter-drawer></site-page>`,
      );
      await page.updateComplete;
      const el = page.querySelector<UvalibFilterDrawer>('uvalib-filter-drawer')!;
      await el.updateComplete;
      const main = (page.shadowRoot ?? page).querySelector<HTMLElement>('main')!;
      main.focus();
      expect(isFocused(main)).to.equal(true);
      await open(el);
      main.focus();
      expect(isFocused(main)).to.equal(false);
      const header = (page.shadowRoot ?? page).querySelector('site-header')!;
      const link = (header.shadowRoot ?? header).querySelector<HTMLAnchorElement>('a[href]')!;
      link.focus();
      expect(isFocused(link)).to.equal(false);
      const input = page.querySelector<HTMLInputElement>('#q2')!;
      input.focus();
      expect(isFocused(input)).to.equal(true);
      closeBtn(el).click();
    });

    it('keeps the same children, typed text and checked filters across open, close and resizes', async () => {
      const { el, filter, input, wrap } = await make();
      const form = wrap.querySelector('#form')!;
      let submits = 0;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        submits++;
      });
      await open(el);
      input.value = 'tuition';
      const box = root(filter).querySelector<HTMLInputElement>('input[type=checkbox]')!;
      box.click();
      await filter.updateComplete;
      expect(filter.value).to.deep.equal(['Minutes']);
      closeBtn(el).click();
      await el.updateComplete;
      await open(el);
      expect(input.value).to.equal('tuition');
      expect(box.checked).to.equal(true);
      closeBtn(el).click();
      await el.updateComplete;
      await setViewport(WIDE);
      await waitUntil(() => body(el).parentElement === sidebar(el), 'not moved to the sidebar');
      await filter.updateComplete;
      expect(wrap.querySelector('#q') === input).to.equal(true);
      expect(wrap.querySelector('uvalib-filter') === filter).to.equal(true);
      expect(input.value).to.equal('tuition');
      expect(filter.value).to.deep.equal(['Minutes']);
      expect(root(filter).querySelector<HTMLInputElement>('input[type=checkbox]')!.checked).to.equal(
        true,
      );
      expect(visible(input)).to.equal(true);
      (form as HTMLFormElement).requestSubmit();
      expect(submits).to.equal(1);
      await setViewport(NARROW);
      await waitUntil(() => !toggle(el).hidden, 'button not back');
      await open(el);
      expect(input.value).to.equal('tuition');
    });

    it('widening past the breakpoint closes it and keeps focus in the filters', async () => {
      const { el, input } = await make();
      const closes: Event[] = [];
      el.addEventListener('close', (e) => closes.push(e));
      await open(el);
      input.focus();
      await setViewport(WIDE);
      await waitUntil(() => !el.open && body(el).parentElement === sidebar(el), 'not closed');
      await el.updateComplete;
      await nextFrame();
      expect(dialog(el).open).to.equal(false);
      expect(isFocused(input)).to.equal(true);
      expect(closes.length).to.equal(1);
    });

    it('repeats the live regions named in live while open, and only then', async () => {
      const { el, wrap } = await make('live="status count missing"');
      const status = wrap.querySelector<HTMLElement>('#status')!;
      const count = wrap.querySelector<UvalibResultsCount>('#count')!;
      await count.updateComplete;
      status.textContent = 'Before opening';
      await nextFrame();
      expect(mirror(el).textContent).to.equal('');
      await open(el);
      expect(mirror(el).getAttribute('aria-live')).to.equal('polite');
      expect(mirror(el).getAttribute('role')).to.equal('status');
      expect(dialog(el).contains(mirror(el))).to.equal(true);
      status.textContent = 'Filters applied';
      await waitUntil(() => mirror(el).textContent === 'Filters applied', 'status not mirrored');
      count.total = 12;
      await waitUntil(
        () => mirror(el).textContent === 'Showing all 12 results',
        `count not mirrored: "${mirror(el).textContent}"`,
      );
      closeBtn(el).click();
      await el.updateComplete;
      expect(mirror(el).textContent).to.equal('');
      status.textContent = 'After closing';
      await wait(50);
      expect(mirror(el).textContent).to.equal('');
    });

    it('reports open and close by the visitor with its label, not a resize, and honours no-analytics', async () => {
      const rec = recordAnalytics();
      try {
        const { el } = await make('label="Filter minutes"');
        await nextFrame();
        expect(rec.events, 'reported on render').to.deep.equal([]);
        await open(el);
        closeBtn(el).click();
        await el.updateComplete;
        await open(el);
        await sendKeys({ press: 'Escape' });
        await waitUntil(() => !el.open);
        await open(el);
        await setViewport(WIDE);
        await waitUntil(() => !el.open);
        el.setAttribute('no-analytics', '');
        await setViewport(NARROW);
        await waitUntil(() => !toggle(el).hidden);
        await open(el);
        closeBtn(el).click();
        const events = rec.of('uvalib-analytics-event').map((d) => d.event);
        expect(events).to.deep.equal([
          ['uvalib-filter-drawer', 'open', 'Filter minutes'],
          ['uvalib-filter-drawer', 'close', 'Filter minutes'],
          ['uvalib-filter-drawer', 'open', 'Filter minutes'],
          ['uvalib-filter-drawer', 'close', 'Filter minutes'],
          ['uvalib-filter-drawer', 'open', 'Filter minutes'],
        ]);
      } finally {
        rec.restore();
      }
    });

    it('passes axe open and closed, in light and dark mode', async () => {
      const { el } = await make('count="2"');
      await expectNoAxeViolations(el.parentElement!);
      await open(el);
      await expectNoAxeViolations(el.parentElement!);
      closeBtn(el).click();
      await inDarkMode(async () => {
        await open(el);
        const bg = getComputedStyle(dialog(el)).backgroundColor;
        expect(bg).to.not.equal('rgb(255, 255, 255)');
        await expectNoAxeViolations(el.parentElement!);
        closeBtn(el).click();
      });
    });

    it('reflows at 320px: the panel fits with a strip of backdrop, no page scroll', async () => {
      const { el } = await make('', { width: 320, height: 640 });
      await open(el);
      for (const a of dialog(el).getAnimations()) a.finish();
      const r = dialog(el).getBoundingClientRect();
      expect(r.left).to.equal(0);
      expect(r.right).to.be.at.most(320 - 40);
      expect(dialog(el).scrollWidth).to.be.at.most(dialog(el).clientWidth);
      expect(document.documentElement.scrollWidth).to.be.at.most(320);
      closeBtn(el).click();
    });

    it('forced colors: the panel keeps a visible edge', async () => {
      await emulateMedia({ forcedColors: 'active' });
      try {
        const { el } = await make();
        await open(el);
        expect(getComputedStyle(dialog(el)).borderInlineEndStyle).to.equal('solid');
        expect(getComputedStyle(closeBtn(el)).borderTopStyle).to.equal('solid');
        closeBtn(el).click();
      } finally {
        await emulateMedia({ forcedColors: 'none' });
      }
    });

    it('slides in, unless the visitor prefers reduced motion', async () => {
      const { el } = await make();
      await open(el);
      expect(getComputedStyle(dialog(el)).animationName).to.equal('uvalib-filter-drawer-in');
      closeBtn(el).click();
      await emulateMedia({ reducedMotion: 'reduce' });
      try {
        await open(el);
        expect(getComputedStyle(dialog(el)).animationName).to.equal('none');
        closeBtn(el).click();
      } finally {
        await emulateMedia({ reducedMotion: 'no-preference' });
      }
    });

    it('fires open and close, and the methods work on narrow screens', async () => {
      const { el } = await make();
      const seen: string[] = [];
      el.addEventListener('open', () => seen.push('open'));
      el.addEventListener('close', () => seen.push('close'));
      el.show();
      await el.updateComplete;
      expect(el.open).to.equal(true);
      el.close();
      await waitUntil(() => !el.open);
      expect(seen).to.deep.equal(['open', 'close']);
    });

    it('takes children added later, and warns once about a bad breakpoint', async () => {
      const warns: string[] = [];
      const orig = console.warn;
      console.warn = (...a: unknown[]) => void warns.push(a.join(' '));
      try {
        const { el } = await make('breakpoint="wide"');
        expect(warns.filter((w) => w.includes('uvalib-filter-drawer')).length).to.equal(1);
        const extra = document.createElement('p');
        extra.textContent = 'Added later';
        el.append(extra);
        await nextFrame();
        await open(el);
        expect(visible(extra)).to.equal(true);
        if (mode === 'no-shadow-dom') expect(body(el).contains(extra)).to.equal(true);
        closeBtn(el).click();
      } finally {
        console.warn = orig;
      }
    });
  });
}
