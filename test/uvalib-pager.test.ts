import { expect, fixture, nextFrame } from '@open-wc/testing';
import { sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-card/uvalib-card.js';
import '../src/components/uvalib-card-grid/uvalib-card-grid.js';
import '../src/components/uvalib-pager/uvalib-pager.js';
import type { UvalibCard } from '../src/components/uvalib-card/UvalibCard.js';
import type { UvalibPager } from '../src/components/uvalib-pager/UvalibPager.js';
import { expectNoAxeViolations, expectNoPageAxeViolations } from './helpers/axe.js';
import { recordAnalytics } from './helpers/analytics.js';

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
      expect(next.querySelector('.pager-dir')!.textContent).to.equal('Next');
      const none = await make('');
      expect(navOf(none)).to.equal(null);
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
