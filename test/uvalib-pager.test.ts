import { expect, fixture, nextFrame } from '@open-wc/testing';
import { emulateMedia, sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-card/uvalib-card.js';
import '../src/components/uvalib-card-grid/uvalib-card-grid.js';
import '../src/components/uvalib-pager/uvalib-pager.js';
import type { UvalibCard } from '../src/components/uvalib-card/UvalibCard.js';
import type { UvalibPager } from '../src/components/uvalib-pager/UvalibPager.js';
import { expectNoAxeViolations, expectNoPageAxeViolations } from './helpers/axe.js';
import { recordAnalytics } from './helpers/analytics.js';
import { inDarkMode } from './helpers/dark.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const navOf = (el: Element) => root(el).querySelector('nav');

/** A link click would navigate the test page: cancel it once it reaches `document`. */
const cancel = (e: Event) => {
  if (e.composedPath().some((n) => n instanceof HTMLAnchorElement)) e.preventDefault();
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

/** Each list entry as `n`, `n*` (current) or `gap`. */
function steps(el: Element): string[] {
  const items = [...(navOf(el)?.querySelectorAll(':scope > ol > li') ?? [])];
  return items.map((li) => {
    if (li.getAttribute('aria-hidden') === 'true') return 'gap';
    const node = li.querySelector('a, .page')!;
    const n = (node.textContent ?? '').replace('Page', '').trim();
    return node.getAttribute('aria-current') === 'page' ? `${n}*` : n;
  });
}

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-pager (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = (attrs: string) =>
      fixture<UvalibPager>(`<uvalib-pager ${attr} ${attrs}></uvalib-pager>`);

    beforeEach(() => document.addEventListener('click', cancel));
    afterEach(() => document.removeEventListener('click', cancel));

    it('shows Previous and Next kickers, rel, and the section label', async () => {
      const el = await make(
        'prev-href="#prev" prev-label="The Actress of Padua" next-href="#next" next-label="The Crucifix"',
      );
      const nav = navOf(el)!;
      expect(nav.getAttribute('aria-label')).to.equal('Sections');
      const prev = nav.querySelector<HTMLAnchorElement>('a.pager-prev')!;
      const next = nav.querySelector<HTMLAnchorElement>('a.pager-next')!;
      expect(prev.getAttribute('rel')).to.equal('prev');
      expect(prev.getAttribute('href')).to.equal('#prev');
      expect(prev.querySelector('.pager-dir')!.textContent).to.equal('Previous');
      expect(prev.querySelector('.pager-title')!.textContent).to.equal('The Actress of Padua');
      expect(next.getAttribute('rel')).to.equal('next');
      expect(next.querySelector('.pager-dir')!.textContent).to.equal('Next');
      expect(next.querySelector('.pager-title')!.textContent).to.equal('The Crucifix');
      expect(getComputedStyle(next).marginInlineStart).to.not.equal('0px');
    });

    it('uses a custom label, and the mode default when label is empty', async () => {
      const named = await make('label="Chapters" prev-href="#p" next-href="#n"');
      expect(navOf(named)!.getAttribute('aria-label')).to.equal('Chapters');
      const empty = await make('label="" prev-href="#p"');
      expect(navOf(empty)!.getAttribute('aria-label')).to.equal('Sections');
      const pages = await make('label="" pages="3" page="1"');
      expect(navOf(pages)!.getAttribute('aria-label')).to.equal('Pagination');
    });

    it('omits a missing side, hides when both are missing, and skips an empty title', async () => {
      const prevOnly = await make('prev-href="#p" prev-label="Back"');
      expect(navOf(prevOnly)!.querySelector('.pager-next')).to.equal(null);
      expect(navOf(prevOnly)!.querySelector('.pager-prev')).to.not.equal(null);
      const nextOnly = await make('next-href="?page=2"');
      const next = navOf(nextOnly)!.querySelector('a.pager-next')!;
      expect(next.querySelector('.pager-title')).to.equal(null);
      expect(next.querySelector('.visually-hidden')).to.equal(null);
      expect(next.querySelector('.pager-dir')!.textContent).to.equal('Next');
      const none = await make('');
      expect(navOf(none)).to.equal(null);
    });

    it('separates the kicker and the title in the accessible name', async () => {
      const el = await make('prev-href="#p" prev-label="The opening" next-href="#n"');
      const prev = navOf(el)!.querySelector('a.pager-prev')!;
      const sep = prev.querySelector('.visually-hidden')!;
      expect(sep.textContent).to.equal(': ');
      const text = prev.textContent ?? '';
      const colon = text.indexOf(':');
      expect(text.indexOf('Previous')).to.be.lessThan(colon);
      expect(colon).to.be.lessThan(text.indexOf('The opening'));
      const style = getComputedStyle(sep);
      expect(style.position).to.equal('absolute');
      expect(parseFloat(style.width)).to.be.at.most(1);
      const next = navOf(el)!.querySelector('a.pager-next')!;
      expect(next.querySelector('.pager-title')).to.equal(null);
      expect(next.querySelector('.visually-hidden')).to.equal(null);
      await expectNoAxeViolations(el);
    });

    it('truncates a long title without dropping it from the accessible name', async () => {
      const label = 'Part II. The Crucifix, and a much longer section title that cannot fit';
      const el = await make(
        `prev-href="#p" prev-label="${label}" next-href="#n" next-label="Next bit"`,
      );
      const title = navOf(el)!.querySelector<HTMLElement>('.pager-title')!;
      expect(title.textContent).to.equal(label);
      const style = getComputedStyle(title);
      expect(style.whiteSpace).to.equal('nowrap');
      expect(style.textOverflow).to.equal('ellipsis');
      expect(style.overflow).to.equal('hidden');
    });

    it('numbers pages, marks the current one, and collapses a long range', async () => {
      const mid = await make('pages="20" page="10" href-template="/text/{page}/"');
      expect(navOf(mid)!.getAttribute('aria-label')).to.equal('Pagination');
      expect(steps(mid)).to.deep.equal(['1', 'gap', '9', '10*', '11', 'gap', '20']);
      const current = navOf(mid)!.querySelector('[aria-current="page"]')!;
      expect(current.localName).to.equal('span');
      expect(current.closest('a')).to.equal(null);
      expect(current.querySelector('.visually-hidden')!.textContent).to.equal('Page ');
      const hidden = getComputedStyle(current.querySelector('.visually-hidden')!);
      expect(hidden.position).to.equal('absolute');
      expect(parseFloat(hidden.width)).to.be.at.most(1);
      const first = navOf(mid)!.querySelector<HTMLAnchorElement>('a[data-page="1"]')!;
      expect(first.getAttribute('href')).to.equal('/text/1/');
      expect(first.dataset.kind).to.equal('number');

      const start = await make('pages="20" page="1"');
      expect(steps(start)).to.deep.equal(['1*', '2', '3', '4', 'gap', '20']);
      expect(navOf(start)!.querySelector('a[data-page="2"]')!.getAttribute('href')).to.equal(
        '?page=2',
      );

      const end = await make('pages="20" page="20" href-template="?p={page}"');
      expect(steps(end)[0]).to.equal('1');
      expect(steps(end).at(-1)).to.equal('20*');
      expect(steps(end)).to.include('gap');
    });

    it('clamps the current page and shows a short range in full', async () => {
      const high = await make('pages="5" page="99"');
      expect(steps(high)).to.deep.equal(['1', '2', '3', '4', '5*']);
      const low = await make('pages="5" page="0"');
      expect(steps(low)).to.deep.equal(['1*', '2', '3', '4', '5']);
      const missing = await make('pages="3"');
      expect(steps(missing)).to.deep.equal(['1*', '2', '3']);
    });

    it('lets numbered pages win, and warns once for a bad count or template', async () => {
      const warns = await warnings(async () => {
        const el = await make('pages="4" page="2" prev-href="#p" prev-label="Ignored"');
        expect(navOf(el)!.querySelector('.pager-prev')).to.equal(null);
        expect(steps(el)).to.deep.equal(['1', '2*', '3', '4']);
        const bad = await make('pages="foo" prev-href="#p"');
        expect(navOf(bad)!.querySelector('.pager-prev')).to.not.equal(null);
        const zero = await make('pages="0" next-href="#n"');
        expect(navOf(zero)!.classList.contains('sections')).to.equal(true);
        const bare = await make('pages="3" href-template="/nope"');
        expect(navOf(bare)!.querySelector('a')).to.equal(null);
        expect(steps(bare)).to.deep.equal(['1*', '2', '3']);
      });
      expect(warns.filter((w) => w.includes('numbered pages are shown')).length).to.equal(1);
      expect(warns.filter((w) => w.includes('positive number')).length).to.be.greaterThan(0);
      expect(warns.filter((w) => w.includes('{page}')).length).to.equal(1);
    });

    it('does not link an unsafe href, once per element', async () => {
      const warns = await warnings(async () => {
        const el = await make(
          'prev-href="javascript:alert(1)" next-href="#ok" next-label="Onward"',
        );
        expect(navOf(el)!.querySelector('.pager-prev')).to.equal(null);
        expect(navOf(el)!.querySelector('.pager-next')).to.not.equal(null);
        el.prevHref = 'data:text/html,hi';
        await el.updateComplete;
      });
      expect(warns.filter((w) => w.includes('not linking')).length).to.equal(1);
    });

    it('reports page changes and not the label or URL', async () => {
      const rec = recordAnalytics();
      try {
        const sections = await make(
          'prev-href="#prev" prev-label="Padua" next-href="#next" next-label="Crucifix"',
        );
        await sections.updateComplete;
        await nextFrame();
        expect(rec.events).to.deep.equal([]);
        navOf(sections)!.querySelector<HTMLAnchorElement>('.pager-next')!.click();
        navOf(sections)!.querySelector<HTMLAnchorElement>('.pager-prev')!.click();
        const pages = await make('pages="20" page="10" href-template="?page={page}"');
        navOf(pages)!.querySelector<HTMLAnchorElement>('a[data-page="11"]')!.click();
        expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
          ['uvalib-pager', 'page-change', 'next'],
          ['uvalib-pager', 'page-change', 'previous'],
          ['uvalib-pager', 'page-change', 'number', 11],
        ]);
        const dumped = JSON.stringify(rec.events);
        expect(dumped).to.not.include('Padua');
        expect(dumped).to.not.include('Crucifix');
        expect(dumped).to.not.include('#next');
        expect(dumped).to.not.include('?page=');
      } finally {
        rec.restore();
      }
    });

    it('fires a cancelable uvalib-pager-navigate on a plain click only', async () => {
      const el = await make('pages="4" page="2" href-template="?page={page}"');
      const link = navOf(el)!.querySelector<HTMLAnchorElement>('a[data-page="3"]')!;
      const seen: unknown[] = [];
      const prevented: boolean[] = [];
      const route = (e: Event) => {
        seen.push((e as CustomEvent).detail);
        e.preventDefault();
      };
      navOf(el)!.addEventListener('click', (e) => {
        prevented.push(e.defaultPrevented);
        e.preventDefault();
      });
      document.addEventListener('uvalib-pager-navigate', route);
      try {
        link.dispatchEvent(
          new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }),
        );
        link.dispatchEvent(
          new MouseEvent('click', {
            bubbles: true,
            composed: true,
            cancelable: true,
            shiftKey: true,
          }),
        );
        expect(prevented).to.deep.equal([true, false]);
        expect(seen).to.deep.equal([{ href: '?page=3', kind: 'number', page: 3 }]);
      } finally {
        document.removeEventListener('uvalib-pager-navigate', route);
      }
    });

    it('ignores a canceled or non-primary click and still tracks a modified one', async () => {
      const rec = recordAnalytics();
      const el = await make(
        'prev-href="#prev" prev-label="Padua" next-href="#next" next-label="Crucifix"',
      );
      const link = navOf(el)!.querySelector<HTMLAnchorElement>('.pager-prev')!;
      const navs: unknown[] = [];
      const route = (e: Event) => navs.push((e as CustomEvent).detail);
      const stop = (e: Event) => e.preventDefault();
      document.addEventListener('uvalib-pager-navigate', route);
      try {
        link.addEventListener('click', stop, { capture: true });
        link.dispatchEvent(
          new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }),
        );
        link.removeEventListener('click', stop, { capture: true });
        link.dispatchEvent(
          new MouseEvent('click', { bubbles: true, composed: true, cancelable: true, button: 2 }),
        );
        expect(rec.of('uvalib-analytics-event')).to.deep.equal([]);
        expect(navs).to.deep.equal([]);
        link.dispatchEvent(
          new MouseEvent('click', {
            bubbles: true,
            composed: true,
            cancelable: true,
            ctrlKey: true,
          }),
        );
        expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
          ['uvalib-pager', 'page-change', 'previous'],
        ]);
        expect(navs).to.deep.equal([]);
        expect(JSON.stringify(rec.events)).to.not.include('Padua');
      } finally {
        link.removeEventListener('click', stop, { capture: true });
        document.removeEventListener('uvalib-pager-navigate', route);
        rec.restore();
      }
    });

    it('gives each control a target at least 24px and passes axe', async () => {
      const el = await make(
        'prev-href="#p" prev-label="Back" next-href="#n" next-label="On" pages="0"',
      );
      // pages="0" is not numbered, so the section links show. The warning is expected.
      for (const a of navOf(el)!.querySelectorAll('a')) {
        const box = a.getBoundingClientRect();
        expect(box.height).to.be.at.least(24);
      }
      el.remove();
      const pages = await make('pages="5" page="2" label="Result pages"');
      const current = navOf(pages)!.querySelector('.page')!;
      expect(current.getBoundingClientRect().height).to.be.at.least(24);
      await expectNoAxeViolations(pages);
      (document.activeElement as HTMLElement | null)?.blur();
      const link = navOf(pages)!.querySelector('a')!;
      await sendKeys({ press: 'Tab' });
      expect(link.matches(':focus-visible')).to.equal(true);
      expect(getComputedStyle(link).outlineStyle).to.equal('solid');
      expect(getComputedStyle(link).outlineWidth).to.equal('3px');
      link.blur();
    });

    it('does not scroll horizontally at 320px', async () => {
      await setViewport({ width: 320, height: 640 });
      try {
        const el = await make(
          'prev-href="#p" prev-label="A very long previous section title that must truncate" next-href="#n" next-label="And a next title equally unwilling to fit"',
        );
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
        expect(navOf(el)!.getBoundingClientRect().right).to.be.at.most(320);
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
    });

    it('keeps truncation with no-style', async () => {
      const el = await make(
        'no-style prev-href="#p" prev-label="A long previous section title for truncation"',
      );
      const title = navOf(el)!.querySelector('.pager-title')!;
      expect(getComputedStyle(title).textOverflow).to.equal('ellipsis');
      expect(getComputedStyle(title).whiteSpace).to.equal('nowrap');
      // The "Page " prefix stays visually hidden with no-style too.
      const prefix = navOf(await make('no-style pages="2" page="1"'))!.querySelector(
        '.visually-hidden',
      )!;
      expect(getComputedStyle(prefix).position).to.equal('absolute');
    });

    it('shows Load more, a polite count, and the next page', async () => {
      const rec = recordAnalytics();
      try {
        const el = await make('mode="load-more" shown="2" total="9" label="Stories"');
        await el.updateComplete;
        expect(rec.events).to.deep.equal([]);
        expect(root(el).querySelector('nav') === null).to.equal(true);
        const group = root(el).querySelector('.more')!;
        expect(group.getAttribute('role')).to.equal('group');
        expect(group.getAttribute('aria-label')).to.equal('Stories');
        const status = root(el).querySelector('.status')!;
        expect(status.getAttribute('role')).to.equal('status');
        expect(status.hasAttribute('aria-live')).to.equal(false);
        expect(status.textContent).to.equal('Showing 2 of 9');
        const button = root(el).querySelector('button')!;
        expect(button.classList.contains('uvalib-button')).to.equal(true);
        expect(button.textContent?.trim()).to.equal('Load more');
        expect(button.getBoundingClientRect().height).to.be.at.least(44);
        const pages: number[] = [];
        el.addEventListener('load-more', (e: Event) => {
          pages.push((e as CustomEvent<{ page: number }>).detail.page);
        });
        button.click();
        expect(pages).to.deep.equal([2]);
        expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
          ['uvalib-pager', 'load-more', '', 2],
        ]);
        el.page = 4;
        await el.updateComplete;
        expect(rec.events).to.have.length(1);
        button.click();
        expect(pages).to.deep.equal([2, 5]);
        const quiet = await make('mode="Load-More" no-analytics shown="1" total="3" page="2"');
        root(quiet).querySelector('button')!.click();
        expect(rec.events).to.have.length(2);
        expect(JSON.stringify(rec.events)).to.not.include('Stories');
      } finally {
        rec.restore();
      }
    });

    it('hides Load more when everything is shown and warns once when other modes are set', async () => {
      const el = await make('mode="load-more" shown="9" total="9"');
      expect(root(el).querySelector('.status')!.textContent).to.equal('Showing 9 of 9');
      expect(root(el).querySelector('button') === null).to.equal(true);
      el.shown = 3;
      await el.updateComplete;
      expect(root(el).querySelector('button') === null).to.equal(false);
      const unnamed = await make('mode="load-more"');
      expect(root(unnamed).querySelector('.more')!.getAttribute('aria-label')).to.equal(
        'More results',
      );
      expect(root(unnamed).querySelector('.status')!.textContent).to.equal('Showing 0 of 0');
      const warns = await warnings(async () => {
        const both = await make('mode="load-more" pages="4" prev-href="#p"');
        expect(root(both).querySelector('nav') === null).to.equal(true);
        expect(root(both).querySelector('button') === null).to.equal(false);
        both.mode = 'LOAD-MORE';
        await both.updateComplete;
      });
      expect(warns.filter((line) => line.includes('load-more')).length).to.equal(1);
    });

    it('moves focus to the first new item, from the list or from the host', async () => {
      const list = await fixture<HTMLUListElement>(
        `<ul id="results-${mode}"><li id="old-${mode}"><a href="#old">Old</a></li></ul>`,
      );
      const el = await make(`mode="load-more" for="results-${mode}" shown="1" total="4" page="1"`);
      const button = root(el).querySelector('button')!;
      let clicks = 0;
      el.addEventListener('load-more', () => clicks++);
      const aux = new MouseEvent('click', { bubbles: true, button: 2 });
      button.dispatchEvent(aux);
      expect(aux.button).to.equal(2);
      expect(clicks).to.equal(0);
      const stop = (e: Event) => e.preventDefault();
      // An ancestor capture listener runs before the button's own listener.
      button.parentElement!.addEventListener('click', stop, { capture: true });
      const canceled = new MouseEvent('click', { bubbles: true, button: 0, cancelable: true });
      button.dispatchEvent(canceled);
      expect(canceled.defaultPrevented).to.equal(true);
      expect(clicks).to.equal(0);
      button.parentElement!.removeEventListener('click', stop, { capture: true });
      button.click();
      expect(clicks).to.equal(1);
      const item = document.createElement('li');
      item.id = `new-${mode}`;
      item.textContent = 'New';
      list.append(item);
      el.loaded();
      expect(document.activeElement?.id).to.equal(`new-${mode}`);
      expect(item.getAttribute('tabindex')).to.equal('-1');
      const link = document.createElement('a');
      link.href = '#given';
      link.id = `given-${mode}`;
      link.textContent = 'Given';
      list.append(link);
      el.loaded(link);
      expect(document.activeElement?.id).to.equal(`given-${mode}`);
      expect(link.hasAttribute('tabindex')).to.equal(false);
    });

    it('keeps Load more usable in dark mode, forced colors, at 320px, and with no-style', async () => {
      await inDarkMode(async () => {
        const el = await make('mode="load-more" shown="1" total="4" label="More stories"');
        const button = root(el).querySelector('button')!;
        expect(getComputedStyle(button).color).to.equal('rgb(16, 23, 43)');
        await expectNoAxeViolations(el);
        (document.activeElement as HTMLElement | null)?.blur();
        await sendKeys({ press: 'Tab' });
        expect(button.matches(':focus-visible')).to.equal(true);
        expect(getComputedStyle(button).outlineWidth).to.equal('3px');
        button.blur();
      });
      await emulateMedia({ forcedColors: 'active' });
      try {
        const el = await make('mode="load-more" shown="1" total="4"');
        const button = root(el).querySelector('button')!;
        expect(getComputedStyle(button).borderTopStyle).to.equal('solid');
        expect(parseFloat(getComputedStyle(button).borderTopWidth)).to.be.at.least(1);
        await expectNoAxeViolations(el);
      } finally {
        await emulateMedia({ forcedColors: 'none' });
      }
      await setViewport({ width: 320, height: 640 });
      try {
        const el = await make('mode="load-more" shown="12" total="340" label="Results"');
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
        expect(root(el).querySelector('.more')!.getBoundingClientRect().right).to.be.at.most(320);
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
      const bare = await make('no-style mode="load-more" shown="1" total="4"');
      const bareButton = root(bare).querySelector('button')!;
      expect(bareButton.getBoundingClientRect().height).to.be.at.least(44);
      expect(root(bare).querySelector('.status')!.textContent).to.equal('Showing 1 of 4');
      if (mode === 'shadow') {
        expect(getComputedStyle(bareButton).backgroundColor).to.not.equal('rgb(0, 123, 172)');
      }
      await expectNoAxeViolations(bare);
    });

    it('shows a focus ring on the new item and does not focus a disabled field', async () => {
      const list = await fixture<HTMLUListElement>(`<ul id="ring-${mode}"><li>Old</li></ul>`);
      const el = await make(`mode="load-more" for="ring-${mode}" shown="1" total="4"`);
      root(el).querySelector('button')!.click();
      const item = document.createElement('li');
      item.id = `ring-new-${mode}`;
      item.textContent = 'New';
      list.append(item);
      el.loaded();
      expect(document.activeElement?.id).to.equal(`ring-new-${mode}`);
      expect(item.matches(':focus-visible')).to.equal(true);
      expect(getComputedStyle(item).outlineStyle === 'none').to.equal(false);
      (document.activeElement as HTMLElement | null)?.blur();
      el.loaded();
      expect(document.activeElement?.id === `ring-new-${mode}`).to.equal(false);
      const input = document.createElement('input');
      input.id = `off-${mode}`;
      input.disabled = true;
      document.body.append(input);
      el.loaded(input);
      expect(input.getAttribute('tabindex')).to.equal('-1');
      expect(document.activeElement?.id === `off-${mode}`).to.equal(false);
      input.remove();
    });

    it('finds the list inside a shadow root and the new card in a light-DOM grid', async () => {
      const host = document.createElement('div');
      document.body.append(host);
      const shadow = host.attachShadow({ mode: 'open' });
      const list = document.createElement('ul');
      list.id = `shadow-list-${mode}`;
      const old = document.createElement('li');
      old.textContent = 'Old';
      list.append(old);
      const pager = document.createElement('uvalib-pager') as UvalibPager;
      pager.setAttribute('mode', 'load-more');
      pager.setAttribute('for', list.id);
      pager.setAttribute('shown', '1');
      pager.setAttribute('total', '4');
      if (mode === 'no-shadow-dom') pager.setAttribute('no-shadow-dom', '');
      shadow.append(list, pager);
      await pager.updateComplete;
      (pager.shadowRoot ?? pager).querySelector('button')!.click();
      const item = document.createElement('li');
      item.id = `shadow-new-${mode}`;
      item.textContent = 'New';
      list.append(item);
      pager.loaded();
      expect(shadow.activeElement?.id).to.equal(`shadow-new-${mode}`);
      host.remove();

      const grid = await fixture<HTMLElement>(
        `<uvalib-card-grid no-shadow-dom id="more-grid-${mode}">
          <uvalib-card><span slot="heading">Old</span><a href="#old">Old story</a></uvalib-card>
        </uvalib-card-grid>`,
      );
      const more = await make(`mode="load-more" for="more-grid-${mode}" shown="1" total="4"`);
      root(more).querySelector('button')!.click();
      const card = document.createElement('uvalib-card');
      const link = document.createElement('a');
      link.href = '#new';
      link.id = `new-card-${mode}`;
      link.textContent = 'New story';
      card.append(link);
      grid.append(card);
      await (grid as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      await nextFrame();
      more.loaded();
      expect(document.activeElement?.id).to.equal(`new-card-${mode}`);

      const shadowGrid = document.createElement('uvalib-card-grid');
      shadowGrid.id = `sgrid-${mode}`;
      const oldCard = document.createElement('uvalib-card');
      oldCard.innerHTML = '<span slot="heading">Old</span>';
      shadowGrid.append(oldCard);
      document.body.append(shadowGrid);
      await (shadowGrid as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      const shadowPager = await make(`mode="load-more" for="sgrid-${mode}" shown="1" total="4"`);
      root(shadowPager).querySelector('button')!.click();
      const newCard = document.createElement('uvalib-card');
      const newLink = document.createElement('a');
      newLink.href = '#snew';
      newLink.id = `snew-${mode}`;
      newLink.textContent = 'New';
      newCard.append(newLink);
      shadowGrid.append(newCard);
      await (shadowGrid as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      await nextFrame();
      shadowPager.loaded();
      expect(document.activeElement?.id).to.equal(`snew-${mode}`);
      shadowGrid.remove();
    });
  });
}

describe('cards and pager on a page', () => {
  it('passes axe as a page: one main, heading order, one landmark name', async () => {
    const page = await fixture(`<main>
      <h1>Early American Fiction</h1>
      <uvalib-card-grid>
        <uvalib-card href="#a"><span slot="heading">The Actress of Padua</span>12 texts</uvalib-card>
        <uvalib-card href="#b"><span slot="heading">The Crucifix</span>4 texts</uvalib-card>
      </uvalib-card-grid>
      <uvalib-pager prev-href="#prev" prev-label="Preface" next-href="#next" next-label="Chapter 1"></uvalib-pager>
    </main>`);
    await nextFrame();
    await Promise.all(
      [...page.querySelectorAll('uvalib-card')].map((c) => (c as UvalibCard).updateComplete),
    );
    const grid = page.querySelector('uvalib-card-grid')!;
    await (grid as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    await expectNoPageAxeViolations(document);
  });
});
