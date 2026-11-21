import { expect, fixture, nextFrame, waitUntil } from '@open-wc/testing';
import { emulateMedia, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-back-to-top/uvalib-back-to-top.js';
import type { UvalibBackToTop } from '../src/components/uvalib-back-to-top/UvalibBackToTop.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { recordAnalytics } from './helpers/analytics.js';
import { inDarkMode } from './helpers/dark.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const button = (el: Element) => root(el).querySelector<HTMLButtonElement>('button.btt-button')!;
const isFocused = (node: Element) => {
  let a = document.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a === node;
};
const shown = (el: Element) => getComputedStyle(button(el)).visibility === 'visible';
const instant = () => emulateMedia({ reducedMotion: 'reduce' });

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-back-to-top (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    beforeEach(async () => {
      await instant();
      window.scrollTo(0, 0);
    });
    afterEach(async () => {
      window.scrollTo(0, 0);
      await emulateMedia({ reducedMotion: 'no-preference', media: 'screen' });
      await setViewport({ width: 800, height: 600 });
    });

    async function make(attrs = '', before = '<h1>Minutes of 1825</h1>') {
      const wrap = await fixture<HTMLDivElement>(`<div>
        <main>${before}<div style="height: 3000px"><a href="#x">A link</a></div>
          <uvalib-back-to-top ${attr} ${attrs}></uvalib-back-to-top>
        </main>
      </div>`);
      const el = wrap.querySelector<UvalibBackToTop>('uvalib-back-to-top')!;
      await el.updateComplete;
      await nextFrame();
      await nextFrame();
      return { wrap, el };
    }

    async function scrollDown(el: UvalibBackToTop, y = 1200) {
      window.scrollTo(0, y);
      await waitUntil(() => shown(el), 'not shown after scrolling');
    }

    it('is hidden (not focusable, not in the accessibility tree) while the top is in view', async () => {
      const { el } = await make();
      expect(getComputedStyle(button(el)).visibility).to.equal('hidden');
      button(el).focus();
      expect(isFocused(button(el))).to.equal(false);
      // A short scroll inside the first 400px keeps it hidden.
      window.scrollTo(0, 300);
      await nextFrame();
      await nextFrame();
      expect(shown(el)).to.equal(false);
    });

    it('shows once the top 400px have scrolled away: a 44px button saying Back to top, fixed in the corner', async () => {
      const { el } = await make();
      await scrollDown(el);
      const b = button(el);
      expect(b.localName).to.equal('button');
      expect(b.textContent!.trim()).to.equal('Back to top');
      expect(getComputedStyle(b).position).to.equal('fixed');
      const r = b.getBoundingClientRect();
      expect(r.height).to.be.at.least(44);
      expect(r.width).to.be.at.least(44);
      expect(Math.round(window.innerHeight - r.bottom)).to.be.at.least(16);
      expect(Math.round(document.documentElement.clientWidth - r.right)).to.be.at.least(16);
      b.focus();
      expect(isFocused(b)).to.equal(true);
    });

    it('scrolls to the top and moves focus to the h1 (tabindex -1), reporting a click', async () => {
      const rec = recordAnalytics();
      try {
        const { el, wrap } = await make();
        await scrollDown(el);
        expect(rec.events, 'reported on render or scroll').to.deep.equal([]);
        button(el).click();
        await waitUntil(() => window.scrollY === 0, 'did not scroll to the top');
        const h1 = wrap.querySelector('h1')!;
        expect(h1.getAttribute('tabindex')).to.equal('-1');
        expect(isFocused(h1)).to.equal(true);
        expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
          ['uvalib-back-to-top', 'click'],
        ]);
        await waitUntil(() => !shown(el), 'not hidden at the top');
      } finally {
        rec.restore();
      }
    });

    it('scrolls smoothly unless reduced motion is set', async () => {
      const { el } = await make();
      await scrollDown(el);
      const calls: unknown[] = [];
      const orig = window.scrollTo;
      window.scrollTo = ((opts: ScrollToOptions) =>
        void calls.push(opts)) as typeof window.scrollTo;
      try {
        button(el).click();
        await emulateMedia({ reducedMotion: 'no-preference' });
        button(el).click();
      } finally {
        window.scrollTo = orig;
      }
      expect(calls).to.deep.equal([
        { top: 0, behavior: 'auto' },
        { top: 0, behavior: 'smooth' },
      ]);
    });

    it('target picks where focus goes; without an h1, #top', async () => {
      const { el, wrap } = await make(
        'target="#start"',
        '<h1>Title</h1><p id="start">Start of the record</p>',
      );
      await scrollDown(el);
      button(el).click();
      const start = wrap.querySelector('#start')!;
      expect(isFocused(start)).to.equal(true);
      expect(start.getAttribute('tabindex')).to.equal('-1');
      wrap.remove(); // its h1 would be found first
      window.scrollTo(0, 0);
      const next = await make('', '<a id="top" href="#">Top of page</a>');
      await scrollDown(next.el);
      button(next.el).click();
      const top = next.wrap.querySelector('#top')!;
      expect(isFocused(top)).to.equal(true);
      expect(top.hasAttribute('tabindex')).to.equal(false); // a link is focusable as it is
    });

    it('if it has focus as it hides, focus moves to the h1', async () => {
      const { el, wrap } = await make();
      await scrollDown(el);
      button(el).focus();
      window.scrollTo(0, 0);
      await waitUntil(() => !shown(el), 'not hidden');
      expect(isFocused(wrap.querySelector('h1')!)).to.equal(true);
    });

    it('offset sets how far to scroll first', async () => {
      const { el } = await make('offset="2000"');
      window.scrollTo(0, 1200);
      await nextFrame();
      await nextFrame();
      expect(shown(el)).to.equal(false);
      await scrollDown(el, 2200);
    });

    it('at the end it sits in its own space, never over the content after it', async () => {
      const { el } = await make();
      window.scrollTo(0, document.documentElement.scrollHeight);
      await waitUntil(() => shown(el) && button(el).classList.contains('docked'), 'not docked');
      const host = el.getBoundingClientRect();
      const b = button(el).getBoundingClientRect();
      expect(b.top).to.be.at.least(host.top);
      expect(b.bottom).to.be.at.most(host.bottom);
      expect(getComputedStyle(button(el)).position).to.equal('static');
    });

    it('reflows at 320px: no page scroll, and the space it keeps is taller than the button', async () => {
      await setViewport({ width: 320, height: 640 });
      const { el } = await make('label="Back to the top of the page"');
      await scrollDown(el);
      const b = button(el).getBoundingClientRect();
      expect(b.left).to.be.at.least(0);
      expect(b.right).to.be.at.most(320);
      expect(document.documentElement.scrollWidth).to.be.at.most(320);
      expect(el.getBoundingClientRect().height).to.be.at.least(b.height + 16);
    });

    it('passes axe in light and dark mode', async () => {
      const { el, wrap } = await make();
      await scrollDown(el);
      await expectNoAxeViolations(wrap);
      await inDarkMode(async () => {
        await nextFrame();
        expect(getComputedStyle(button(el)).backgroundColor).to.not.equal('rgb(255, 255, 255)');
        await expectNoAxeViolations(wrap);
      });
    });

    it('forced colors keep its border; print hides it', async () => {
      const { el } = await make();
      await scrollDown(el);
      await emulateMedia({ forcedColors: 'active' });
      try {
        expect(getComputedStyle(button(el)).borderTopStyle).to.equal('solid');
      } finally {
        await emulateMedia({ forcedColors: 'none' });
      }
      await emulateMedia({ media: 'print' });
      expect(getComputedStyle(el).display).to.equal('none');
    });

    it('honours no-analytics and removes its sentinel when removed', async () => {
      const rec = recordAnalytics();
      try {
        const { el } = await make('no-analytics');
        expect(document.querySelectorAll('[data-uvalib-back-to-top]').length).to.equal(1);
        await scrollDown(el);
        button(el).click();
        expect(rec.events).to.deep.equal([]);
        el.remove();
        expect(document.querySelectorAll('[data-uvalib-back-to-top]').length).to.equal(0);
      } finally {
        rec.restore();
      }
    });
  });
}
