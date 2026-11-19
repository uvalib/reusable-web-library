import { expect, fixture, nextFrame } from '@open-wc/testing';
import { emulateMedia, sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-tabs/uvalib-tabs.js';
import type { UvalibTabs } from '../src/components/uvalib-tabs/UvalibTabs.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { recordAnalytics } from './helpers/analytics.js';
import { inDarkMode } from './helpers/dark.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const tabsOf = (el: Element) => [...root(el).querySelectorAll<HTMLButtonElement>('[role="tab"]')];
const panelsOf = (el: Element) => {
  const hosted = el.shadowRoot?.querySelectorAll<HTMLElement>('[role="tabpanel"]');
  if (hosted?.length) return [...hosted];
  return [...el.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
};
const activeId = (el: HTMLElement): string =>
  (el.shadowRoot?.activeElement ?? document.activeElement)?.id ?? '';

const PANELS = `
  <section data-tab="Events" id="events"><p>Upcoming events</p></section>
  <section data-tab="News" id="news"><p>Library news</p></section>
  <section data-tab="Exhibits" id="exhibits"><p>On view</p></section>
`;

/** A link click would navigate the test page: cancel it once it reaches `document`. */
const cancel = (event: Event) => {
  if (event.composedPath().some((node) => node instanceof HTMLAnchorElement))
    event.preventDefault();
};

function nextPop(): Promise<void> {
  return new Promise((resolve) =>
    window.addEventListener('popstate', () => resolve(), { once: true }),
  );
}

async function warnings(fn: () => Promise<void>): Promise<string[]> {
  const orig = console.warn;
  const warns: string[] = [];
  console.warn = (...args: unknown[]) => void warns.push(args.join(' '));
  try {
    await fn();
  } finally {
    console.warn = orig;
  }
  return warns;
}

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-tabs (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = (extra = '', body = PANELS) =>
      fixture<UvalibTabs>(`<uvalib-tabs ${attr} ${extra}>${body}</uvalib-tabs>`);

    beforeEach(() => {
      document.addEventListener('click', cancel);
      history.replaceState(null, '', location.pathname);
    });
    afterEach(() => {
      document.removeEventListener('click', cancel);
      history.replaceState(null, '', location.pathname);
    });

    it('shows the first panel, hides the rest, and builds one tablist', async () => {
      const el = await make();
      const tabs = tabsOf(el);
      expect(tabs.map((tab) => tab.textContent)).to.deep.equal(['Events', 'News', 'Exhibits']);
      expect(root(el).querySelectorAll('[role="tablist"]').length).to.equal(1);
      expect(root(el).querySelector('[role="tablist"]')!.getAttribute('aria-label')).to.equal(
        'Tabs',
      );
      expect(tabs[0]!.getAttribute('aria-selected')).to.equal('true');
      expect(tabs[0]!.tabIndex).to.equal(0);
      expect(tabs[1]!.getAttribute('aria-selected')).to.equal('false');
      expect(tabs[1]!.tabIndex).to.equal(-1);
      expect(tabs[0]!.getAttribute('aria-controls')).to.equal(panelsOf(el)[0]!.id);
      expect(panelsOf(el).map((panel) => panel.hidden)).to.deep.equal([false, true, true]);
      expect(panelsOf(el)[1]!.getAttribute('aria-labelledby')).to.equal(tabs[1]!.id);
      expect(panelsOf(el)[1]!.hasAttribute('aria-hidden')).to.equal(false);
      expect(el.selected).to.equal('events');
      expect(el.offsetHeight).to.be.below(800);
      expect(panelsOf(el)[0]!.getBoundingClientRect().height).to.be.greaterThan(0);
    });

    it('does not hide the first panel while upgrading', async () => {
      const el = document.createElement('uvalib-tabs') as UvalibTabs;
      if (attr) el.setAttribute('no-shadow-dom', '');
      el.innerHTML = PANELS;
      const first = el.querySelector<HTMLElement>('#events')!;
      const seen: boolean[] = [];
      const observer = new MutationObserver(() => seen.push(first.hidden));
      observer.observe(first, { attributes: true, attributeFilter: ['hidden'] });
      document.body.append(el);
      await el.updateComplete;
      observer.disconnect();
      el.remove();
      expect(seen.includes(true)).to.equal(false);
      expect(first.hidden).to.equal(false);
    });

    it('pairs slot="tab" buttons with panels and hides the author buttons', async () => {
      const el = await make(
        '',
        `<button slot="tab">Events</button><section id="events"><p>Upcoming</p></section>
         <button slot="tab">News</button><section id="news"><p>Headlines</p></section>`,
      );
      const tabs = tabsOf(el);
      expect(tabs.map((tab) => tab.textContent)).to.deep.equal(['Events', 'News']);
      expect(root(el).querySelectorAll('[role="tablist"]').length).to.equal(1);
      const authors = [...el.querySelectorAll<HTMLButtonElement>('button[slot="tab"]')];
      expect(authors.length).to.equal(2);
      expect(authors.every((btn) => btn.hidden && btn.tabIndex === -1)).to.equal(true);
      expect(authors.some((btn) => btn.getAttribute('role') === 'tab')).to.equal(false);
      expect(panelsOf(el)[0]!.hidden).to.equal(false);
      expect(panelsOf(el)[1]!.hidden).to.equal(true);
    });

    it('moves with arrows, Home and End, and flips arrows in RTL', async () => {
      const el = await make();
      tabsOf(el)[0]!.focus();
      await sendKeys({ press: 'ArrowRight' });
      await el.updateComplete;
      expect(el.selected).to.equal('news');
      expect(tabsOf(el)[1]!.getAttribute('aria-selected')).to.equal('true');
      expect(activeId(el)).to.equal(tabsOf(el)[1]!.id);
      await sendKeys({ press: 'End' });
      await el.updateComplete;
      expect(el.selected).to.equal('exhibits');
      expect(activeId(el)).to.equal(tabsOf(el)[2]!.id);
      await sendKeys({ press: 'Home' });
      await el.updateComplete;
      expect(el.selected).to.equal('events');
      expect(activeId(el)).to.equal(tabsOf(el)[0]!.id);

      const rtl = await make('dir="rtl"');
      tabsOf(rtl)[0]!.focus();
      await sendKeys({ press: 'ArrowLeft' });
      await rtl.updateComplete;
      expect(rtl.selected).to.equal('news');
      expect(activeId(rtl)).to.equal(tabsOf(rtl)[1]!.id);
    });

    it('manual activation moves focus without selecting until Enter', async () => {
      const el = await make('activation="manual"');
      const seen: unknown[] = [];
      el.addEventListener('change', (event) => seen.push((event as CustomEvent).detail));
      tabsOf(el)[0]!.focus();
      await sendKeys({ press: 'ArrowRight' });
      await el.updateComplete;
      expect(el.selected).to.equal('events');
      expect(tabsOf(el)[0]!.getAttribute('aria-selected')).to.equal('true');
      expect(tabsOf(el)[1]!.tabIndex).to.equal(0);
      expect(tabsOf(el)[0]!.tabIndex).to.equal(-1);
      expect(activeId(el)).to.equal(tabsOf(el)[1]!.id);
      expect(seen.length).to.equal(0);
      await sendKeys({ press: 'Enter' });
      await el.updateComplete;
      expect(el.selected).to.equal('news');
      expect(seen).to.deep.equal([{ id: 'news', label: 'News', index: 1 }]);
    });

    it('fires change for a click and a property, not for render or requestUpdate', async () => {
      const seen: unknown[] = [];
      const log = (event: Event) => seen.push((event as CustomEvent).detail);
      document.addEventListener('change', log);
      try {
        const el = await make();
        await el.updateComplete;
        expect(seen).to.deep.equal([]);
        el.requestUpdate();
        await el.updateComplete;
        expect(seen).to.deep.equal([]);
        tabsOf(el)[1]!.click();
        await el.updateComplete;
        expect(seen).to.deep.equal([{ id: 'news', label: 'News', index: 1 }]);
        el.selected = 'exhibits';
        await el.updateComplete;
        el.selected = 'exhibits';
        await el.updateComplete;
        expect(seen).to.deep.equal([
          { id: 'news', label: 'News', index: 1 },
          { id: 'exhibits', label: 'Exhibits', index: 2 },
        ]);
        el.selected = 'Events';
        await el.updateComplete;
        expect(el.selected).to.equal('events');
        expect(seen.length).to.equal(3);
      } finally {
        document.removeEventListener('change', log);
      }
    });

    it('reports a click and a key, nothing on render, and honours no-analytics', async () => {
      const rec = recordAnalytics();
      try {
        const el = await make();
        await nextFrame();
        expect(rec.of('uvalib-analytics-event')).to.deep.equal([]);
        el.requestUpdate();
        await el.updateComplete;
        tabsOf(el)[1]!.click();
        await el.updateComplete;
        tabsOf(el)[1]!.focus();
        await sendKeys({ press: 'ArrowRight' });
        await el.updateComplete;
        const quiet = await make('no-analytics');
        tabsOf(quiet)[2]!.click();
        await quiet.updateComplete;
        const long = 'L'.repeat(120);
        const named = await make(
          '',
          `<section data-tab="Other" id="other"><p>Other</p></section>
           <section data-tab="${long}" id="long"><p>Long</p></section>`,
        );
        tabsOf(named)[1]!.click();
        await named.updateComplete;
        const events = rec.of('uvalib-analytics-event').map((detail) => detail.event);
        expect(events[0]).to.deep.equal(['uvalib-tabs', 'change', 'News']);
        expect(events[1]).to.deep.equal(['uvalib-tabs', 'change', 'Exhibits']);
        expect(events[2]).to.deep.equal(['uvalib-tabs', 'change', long.slice(0, 100)]);
        expect(events.length).to.equal(3);
      } finally {
        rec.restore();
      }
    });

    it('writes a url param on a click, and Back restores without another report', async () => {
      const rec = recordAnalytics();
      try {
        const el = await make('url-param="tab"');
        expect(location.search).to.equal('');
        expect(rec.events.length).to.equal(0);
        tabsOf(el)[1]!.click();
        await el.updateComplete;
        expect(location.search).to.equal('?tab=news');
        expect(rec.of('uvalib-analytics-event').map((detail) => detail.event)).to.deep.equal([
          ['uvalib-tabs', 'change', 'News'],
        ]);
        const popped = nextPop();
        history.back();
        await popped;
        await el.updateComplete;
        expect(el.selected).to.equal('events');
        expect(panelsOf(el)[0]!.hidden).to.equal(false);
        expect(panelsOf(el)[1]!.hidden).to.equal(true);
        expect(rec.of('uvalib-analytics-event').length).to.equal(1);
        expect(location.search).to.equal('');
      } finally {
        rec.restore();
      }
    });

    it('opens the tab named in the url without reporting or rewriting it', async () => {
      history.replaceState(null, '', `${location.pathname}?tab=news`);
      const rec = recordAnalytics();
      try {
        const el = await make('url-param="tab" selected="events"');
        expect(el.selected).to.equal('news');
        expect(panelsOf(el)[1]!.hidden).to.equal(false);
        expect(panelsOf(el)[0]!.hidden).to.equal(true);
        expect(rec.events.length).to.equal(0);
        expect(location.search).to.equal('?tab=news');
      } finally {
        rec.restore();
      }
    });

    it('uses the hash, and keeps a named param inside a hash route', async () => {
      const hashed = await make('url-param="hash"');
      tabsOf(hashed)[1]!.click();
      await hashed.updateComplete;
      expect(location.hash).to.equal('#news');
      expect(hashed.selected).to.equal('news');

      history.replaceState(null, '', `${location.pathname}#/stories`);
      const routed = await make(
        'url-param="tab"',
        `<section data-tab="Events" id="events"><p>Events</p></section>
         <section data-tab="News" id="news"><p>News</p></section>`,
      );
      expect(location.hash).to.equal('#/stories');
      expect(routed.selected).to.equal('events');
      tabsOf(routed)[1]!.click();
      await routed.updateComplete;
      expect(location.hash).to.equal('#/stories?tab=news');
      expect(location.search).to.equal('');

      history.replaceState(null, '', `${location.pathname}#/people`);
      const left = await make('url-param="hash"');
      expect(left.selected).to.equal('events');
      expect(location.hash).to.equal('#/people');
    });

    it('warns once when selected matches nothing', async () => {
      const warns = await warnings(async () => {
        const el = await make('selected="missing"');
        expect(el.selected).to.equal('events');
        el.selected = 'still-missing';
        await el.updateComplete;
        expect(el.selected).to.equal('events');
      });
      expect(warns.filter((line) => line.includes('does not match')).length).to.equal(1);
    });

    it('uses a custom label and wraps inside 320px', async () => {
      await setViewport({ width: 320, height: 800 });
      try {
        const el = await make(
          'label="Sections"',
          `<section data-tab="Supercalifragilisticexpialidocious events" id="events"><p>One</p></section>
           <section data-tab="Antidisestablishmentarianism news" id="news"><p>Two</p></section>`,
        );
        expect(root(el).querySelector('[role="tablist"]')!.getAttribute('aria-label')).to.equal(
          'Sections',
        );
        expect(getComputedStyle(root(el).querySelector('.tablist')!).flexWrap).to.equal('wrap');
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
        expect(el.getBoundingClientRect().right).to.be.at.most(320);
        for (const tab of tabsOf(el)) {
          expect(tab.getBoundingClientRect().height).to.be.at.least(44);
          expect(tab.getBoundingClientRect().width).to.be.at.least(44);
        }
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
    });

    it('passes axe in light and dark', async () => {
      const el = await make(
        '',
        `<section data-tab="Events" id="events"><p>Upcoming events</p></section>
         <section data-tab="News" id="news"><p>Library news</p><a href="#later">Later</a></section>`,
      );
      await expectNoAxeViolations(el);
      await inDarkMode(async () => {
        const dark = await make();
        const tab = tabsOf(dark)[0]!;
        expect(getComputedStyle(tab).color).to.equal('rgb(16, 23, 43)');
        await expectNoAxeViolations(dark);
      });
    });

    it('keeps a selected tab distinguishable in forced colors', async () => {
      await emulateMedia({ forcedColors: 'active' });
      try {
        expect(matchMedia('(forced-colors: active)').matches).to.equal(true);
        const el = await make();
        const selected = tabsOf(el)[0]!;
        const cs = getComputedStyle(selected);
        expect(cs.fontWeight).to.equal('700');
        expect(parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)).to.be.at.least(1);
        selected.focus();
        await sendKeys({ press: 'ArrowRight' });
        await el.updateComplete;
        const focused = tabsOf(el)[1]!;
        expect(focused.matches(':focus-visible')).to.equal(true);
        expect(getComputedStyle(focused).outlineStyle).to.not.equal('none');
      } finally {
        await emulateMedia({ forcedColors: 'none' });
      }
    });

    it('keeps the tab row and the hidden panel with no-style', async () => {
      const el = await make('no-style');
      const list = root(el).querySelector('.tablist')!;
      const tab = tabsOf(el)[0]!;
      expect(getComputedStyle(list).display).to.equal('flex');
      expect(getComputedStyle(list).flexWrap).to.equal('wrap');
      expect(getComputedStyle(tab).minHeight).to.equal('44px');
      // Light DOM styles are installed once per page, so a later no-style element still
      // sees the look rules from an earlier styled one. Shadow keeps them off the element.
      if (mode === 'shadow') expect(getComputedStyle(tab).textTransform).to.not.equal('uppercase');
      expect(panelsOf(el)[1]!.hidden).to.equal(true);
      expect(panelsOf(el)[0]!.hidden).to.equal(false);
      tab.focus();
      await sendKeys({ press: 'ArrowRight' });
      await el.updateComplete;
      const focused = tabsOf(el)[1]!;
      expect(focused.matches(':focus-visible')).to.equal(true);
      expect(getComputedStyle(focused).outlineStyle).to.equal('solid');
    });
  });
}
