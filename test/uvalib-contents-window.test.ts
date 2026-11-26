// <uvalib-contents>: part of a very long contents (issue #38): the full-contents link
// (full-href, full-label, total, noun), the screen-reader line saying the list is partial,
// and the client-side window (window="N") with its Show all button.
import { expect, fixture, nextFrame } from '@open-wc/testing';
import { emulateMedia, sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-contents/uvalib-contents.js';
import type { UvalibContents } from '../src/components/uvalib-contents/UvalibContents.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { recordAnalytics } from './helpers/analytics.js';
import { inDarkMode } from './helpers/dark.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const nav = (el: Element) =>
  root(el).querySelector<HTMLElement>(el.shadowRoot ? 'nav' : ':scope > nav')!;
const panel = (el: Element) => nav(el).querySelector<HTMLElement>('.panel')!;
const more = (el: Element) => nav(el).querySelector<HTMLElement>('.more');
const full = (el: Element) => nav(el).querySelector<HTMLAnchorElement>('.more > a');
const showAll = (el: Element) => nav(el).querySelector<HTMLButtonElement>('.more > button');
const note = (el: Element) => panel(el).querySelector('.visually-hidden')?.textContent?.trim();
const toggle = (el: Element) => nav(el).querySelector<HTMLButtonElement>('button.toggle');
/** The entries' texts that are shown (not hidden), and the gaps as '…', in order. */
const visible = (el: Element) =>
  [...panel(el).querySelectorAll<HTMLElement>('li > a, li > .group, li.gap')]
    .filter((n) => n.getClientRects().length > 0)
    .map((n) => (n.matches('li.gap') ? '…' : n.textContent!.trim()));

async function settle(el: UvalibContents): Promise<void> {
  await nextFrame();
  await el.updateComplete;
}

/** A link click would navigate the test page: cancel it once it reaches `document`. */
const cancel = (e: Event) => {
  if (e.composedPath().some((n) => n instanceof HTMLAnchorElement)) e.preventDefault();
};

/** 30 chapters, each with two parts after chapter 10: 30 + 40 = 70 entries. */
const LONG = `<ol>${Array.from({ length: 30 }, (_, i) => {
  const n = i + 1;
  const parts =
    n > 10
      ? `<ol><li><a href="/t/${n}a">Part ${n}a</a></li><li><a href="/t/${n}b">Part ${n}b</a></li></ol>`
      : '';
  return `<li><a href="/t/${n}">Chapter ${n}</a>${parts}</li>`;
}).join('')}</ol>`;

/** What a static build writes: the entries near the current one. */
const WINDOW = `<ol>
  <li><a href="/t/11">Chapter 11</a><ol><li><a href="/t/11b">Part 11b</a></li></ol></li>
  <li><a href="/t/12" aria-current="page">Chapter 12</a></li>
  <li><a href="/t/13">Chapter 13</a></li>
</ol>`;

const WIDE = { width: 1200, height: 800 };

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-contents: partial contents (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = (children: string, attrs = '') =>
      fixture<UvalibContents>(`<uvalib-contents ${attr} ${attrs}>${children}</uvalib-contents>`);

    before(() => document.addEventListener('click', cancel));
    after(() => document.removeEventListener('click', cancel));
    beforeEach(() => setViewport(WIDE));
    afterEach(() => setViewport({ width: 800, height: 600 }));

    it('has no link, button or line without full-href and window', async () => {
      const el = await make(LONG);
      expect(more(el)).to.equal(null);
      expect(note(el)).to.equal(undefined);
      expect(visible(el)).to.have.length(70);
      expect(el.hasAttribute('data-more')).to.equal(false);
    });

    describe('full-href', () => {
      it('draws the full-contents link after the list, inside the nav, with the count', async () => {
        const el = await make(WINDOW, 'full-href="/t/" total="1243"');
        const a = full(el)!;
        expect(a.getAttribute('href')).to.equal('/t/');
        expect(a.textContent!.trim()).to.equal('Full contents (1,243 sections)');
        expect(nav(el).contains(a)).to.equal(true);
        // After the list, not an entry of it.
        expect(a.closest('li')).to.equal(null);
        expect(panel(el).contains(a)).to.equal(false);
        expect(
          panel(el).compareDocumentPosition(more(el)!) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).to.not.equal(0);
        expect(el.hasAttribute('data-more')).to.equal(true);
      });

      it('says the list is partial before it, to screen readers only', async () => {
        const el = await make(WINDOW, 'full-href="/t/" total="243"');
        expect(note(el)).to.equal('Showing 4 of 243 sections.');
        const line = panel(el).querySelector<HTMLElement>('.visually-hidden')!;
        expect(line.getBoundingClientRect().height).to.be.at.most(1);
        expect(panel(el).firstElementChild === line).to.equal(true);
        // The headline and the landmark keep the visible label.
        expect(nav(el).getAttribute('aria-label')).to.equal('Contents');
        expect(nav(el).querySelector('.headline')!.textContent!.trim()).to.equal('Contents');
      });

      it('without total: the label alone, and a line without a count of the whole', async () => {
        const el = await make(WINDOW, 'full-href="/t/"');
        expect(full(el)!.textContent!.trim()).to.equal('Full contents');
        expect(note(el)).to.equal('Showing 4 sections, part of the contents.');
      });

      it('follows full-label, noun and singular', async () => {
        const el = await make(
          WINDOW,
          'full-href="/t/" total="12" full-label="All letters" noun="letters"',
        );
        expect(full(el)!.textContent!.trim()).to.equal('All letters (12 letters)');
        expect(note(el)).to.equal('Showing 4 of 12 letters.');
        el.total = 1;
        el.singular = 'letter';
        await settle(el);
        expect(full(el)!.textContent!.trim()).to.equal('All letters (1 letter)');
        el.noun = '';
        el.singular = '';
        await settle(el);
        expect(full(el)!.textContent!.trim()).to.equal('All letters (1 section)');
      });

      it('ignores an unsafe full-href, with one warning', async () => {
        const warns: string[] = [];
        const orig = console.warn;
        console.warn = (...a: unknown[]) => void warns.push(a.join(' '));
        try {
          const el = await make(WINDOW, 'full-href="javascript:alert(1)"');
          expect(full(el)).to.equal(null);
          el.requestUpdate();
          await settle(el);
        } finally {
          console.warn = orig;
        }
        expect(warns.filter((w) => w.includes('full-href'))).to.have.length(1);
      });

      it('works with items set from JavaScript, and properties for the link', async () => {
        const el = await make('');
        el.items = [
          { label: 'One', href: '/1' },
          { label: 'Two', href: '/2' },
        ];
        el.fullHref = '/all';
        el.total = 40;
        await settle(el);
        expect(full(el)!.textContent!.trim()).to.equal('Full contents (40 sections)');
        expect(note(el)).to.equal('Showing 2 of 40 sections.');
      });

      it('is a call to action: bold, underlined, an arrow, 44px, the link colour', async () => {
        const el = await make(WINDOW, 'full-href="/t/" total="243"');
        const a = full(el)!;
        const s = getComputedStyle(a);
        expect(s.fontWeight).to.equal('700');
        expect(s.textDecorationLine).to.equal('underline');
        expect(s.color).to.equal('rgb(35, 45, 75)');
        expect(a.getBoundingClientRect().height).to.be.at.least(44);
        const arrow = getComputedStyle(a, '::after');
        expect(arrow.borderTopWidth).to.equal('2px');
        expect(arrow.transform).to.not.equal('none');
        // The text lines up with the entries' text.
        const entry = panel(el).querySelector('a')!;
        expect(s.paddingLeft).to.equal(getComputedStyle(entry).paddingLeft);
      });

      it('fires full-contents-click (never the label or URL) and a cancelable navigate', async () => {
        const el = await make(WINDOW, 'full-href="/t/" total="243"');
        const rec = recordAnalytics();
        const seen: unknown[] = [];
        const route = (e: Event) => {
          seen.push((e as CustomEvent).detail);
          e.preventDefault();
        };
        document.addEventListener('uvalib-contents-navigate', route);
        try {
          full(el)!.click();
          panel(el).querySelector('a')!.click();
          expect(seen).to.deep.equal([
            { href: '/t/', level: 0 },
            { href: '/t/11', level: 1 },
          ]);
          expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
            ['uvalib-contents', 'full-contents-click'],
            ['uvalib-contents', 'link-click', 'level 1', 1],
          ]);
        } finally {
          rec.restore();
          document.removeEventListener('uvalib-contents-navigate', route);
        }
      });

      it('shows a visible focus ring on the link (keyboard), after the entries', async () => {
        const el = await make(WINDOW, 'full-href="/t/" total="243"');
        (document.activeElement as HTMLElement | null)?.blur();
        for (let i = 0; i < 5; i++) await sendKeys({ press: 'Tab' });
        const a = full(el)!;
        expect(a.matches(':focus-visible')).to.equal(true);
        const s = getComputedStyle(a);
        expect(s.outlineStyle).to.equal('solid');
        expect(s.outlineWidth).to.equal('3px');
      });

      it('narrow: inside the disclosure, hidden while it is closed', async () => {
        await setViewport({ width: 600, height: 800 });
        const el = await make(WINDOW, 'full-href="/t/" total="243"');
        await settle(el);
        expect(more(el)!.hidden).to.equal(true);
        const b = toggle(el)!;
        expect(b.getAttribute('aria-controls')!.split(' ')).to.include(more(el)!.id);
        b.click();
        await settle(el);
        expect(more(el)!.hidden).to.equal(false);
        expect(full(el)!.getBoundingClientRect().height).to.be.at.least(44);
        await expectNoAxeViolations(el);
      });

      it('sticky: the link stays in view below a long list that scrolls', async () => {
        const el = await make(LONG, 'sticky full-href="/t/" total="243"');
        await settle(el);
        const p = panel(el);
        expect(p.scrollHeight).to.be.greaterThan(p.clientHeight);
        const r = full(el)!.getBoundingClientRect();
        expect(r.bottom).to.be.at.most(window.innerHeight);
      });

      it('reflows at 320px with no horizontal scroll', async () => {
        await setViewport({ width: 320, height: 640 });
        const el = await make(
          WINDOW,
          'open full-href="/t/" total="1243" full-label="The full contents of this very long text"',
        );
        await settle(el);
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
        expect(full(el)!.getBoundingClientRect().right).to.be.at.most(320);
      });

      it('passes axe, light and dark', async () => {
        const el = await make(WINDOW, 'full-href="/t/" total="243"');
        await expectNoAxeViolations(el);
        await inDarkMode(async () => {
          await settle(el);
          expect(getComputedStyle(full(el)!).color).to.not.equal('rgb(35, 45, 75)');
          await expectNoAxeViolations(el);
        });
      });

      it('stays visible in forced colours, with its arrow', async () => {
        const el = await make(WINDOW, 'full-href="/t/" total="243"');
        try {
          await emulateMedia({ forcedColors: 'active' });
          await settle(el);
          const a = full(el)!;
          const s = getComputedStyle(a);
          expect(s.color).to.not.equal(getComputedStyle(document.body).backgroundColor);
          expect(getComputedStyle(a, '::after').borderTopStyle).to.equal('solid');
        } finally {
          await emulateMedia({ forcedColors: 'none' });
        }
      });
    });

    describe('window', () => {
      it('shows the current entry, N before and after, and their parents, with gaps', async () => {
        const el = await make(LONG, 'window="2" current="/t/12"');
        // Document order: … Chapter 11, Part 11a, Part 11b, Chapter 12, Part 12a, Part 12b …
        expect(visible(el)).to.deep.equal([
          '…',
          'Chapter 11',
          'Part 11a',
          'Part 11b',
          'Chapter 12',
          'Part 12a',
          'Part 12b',
          '…',
        ]);
        // Hidden, not removed.
        expect(panel(el).querySelectorAll('li > a')).to.have.length(70);
        // The gaps are hidden from assistive technology.
        for (const g of panel(el).querySelectorAll('li.gap'))
          expect(g.getAttribute('aria-hidden')).to.equal('true');
        expect(note(el)).to.equal('Showing 6 of 70 sections.');
      });

      it('holds 2N+1 entries at either end, and starts at the top with no current entry', async () => {
        const el = await make(LONG, 'window="1"');
        expect(visible(el)).to.deep.equal(['Chapter 1', 'Chapter 2', 'Chapter 3', '…']);
        el.current = '/t/30b';
        await settle(el);
        expect(visible(el)).to.deep.equal(['…', 'Chapter 30', 'Part 30a', 'Part 30b']);
      });

      it('follows current and the page URL', async () => {
        const el = await make(LONG, 'window="0" current="/t/5"');
        expect(visible(el)).to.deep.equal(['…', 'Chapter 5', '…']);
        el.current = '/t/20a';
        await settle(el);
        // Part 20b, then chapters 21 on: a gap in each list.
        expect(visible(el)).to.deep.equal(['…', 'Chapter 20', 'Part 20a', '…', '…']);
      });

      it('prefers the current section (location) to the page', async () => {
        const sections = Array.from(
          { length: 10 },
          (_, i) => `<li><a href="/p#s${i}">S${i}</a></li>`,
        ).join('');
        const el = await make(
          `<ol><li><a href="/p">Page</a></li>${sections}</ol>`,
          'window="1" current="/p#s6"',
        );
        expect(visible(el)).to.deep.equal(['…', 'S5', 'S6', 'S7', '…']);
      });

      it('shows everything when the list is no longer than the window', async () => {
        const el = await make(WINDOW, 'window="5"');
        expect(visible(el)).to.deep.equal(['Chapter 11', 'Part 11b', 'Chapter 12', 'Chapter 13']);
        expect(more(el)).to.equal(null);
        expect(note(el)).to.equal(undefined);
      });

      it('without full-href: Show all shows the rest in place, Show fewer goes back', async () => {
        const el = await make(LONG, 'window="2" current="/t/12"');
        const rec = recordAnalytics();
        try {
          const b = showAll(el)!;
          expect(b.textContent!.trim()).to.equal('Show all 70 sections');
          expect(b.getAttribute('aria-expanded')).to.equal('false');
          expect(b.getAttribute('aria-controls')).to.equal(panel(el).id);
          b.click();
          await settle(el);
          expect(visible(el)).to.have.length(70);
          expect(note(el)).to.equal(undefined);
          expect(showAll(el)!.textContent!.trim()).to.equal('Show fewer');
          expect(showAll(el)!.getAttribute('aria-expanded')).to.equal('true');
          showAll(el)!.click();
          await settle(el);
          expect(visible(el)).to.have.length(8);
          expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
            ['uvalib-contents', 'show-all'],
            ['uvalib-contents', 'show-fewer'],
          ]);
        } finally {
          rec.restore();
        }
      });

      it('with full-href: the link, and total defaults to the whole list', async () => {
        const el = await make(LONG, 'window="2" current="/t/12" full-href="/t/"');
        expect(showAll(el)).to.equal(null);
        expect(full(el)!.textContent!.trim()).to.equal('Full contents (70 sections)');
        el.total = 243;
        await settle(el);
        expect(full(el)!.textContent!.trim()).to.equal('Full contents (243 sections)');
        expect(note(el)).to.equal('Showing 6 of 243 sections.');
      });

      it('applies to headings-from too', async () => {
        const article = document.createElement('article');
        article.id = 'win-article';
        article.innerHTML = Array.from({ length: 12 }, (_, i) => `<h2>Heading ${i}</h2>`).join('');
        document.body.append(article);
        try {
          const el = await make('', 'headings-from="#win-article" window="1"');
          await settle(el);
          expect(visible(el)).to.deep.equal(['Heading 0', 'Heading 1', 'Heading 2', '…']);
          expect(showAll(el)!.textContent!.trim()).to.equal('Show all 12 sections');
        } finally {
          article.remove();
        }
      });

      it('passes axe with gaps, light and dark', async () => {
        const el = await make(LONG, 'window="2" current="/t/12"');
        await expectNoAxeViolations(el);
        await inDarkMode(async () => {
          await settle(el);
          await expectNoAxeViolations(el);
        });
      });
    });
  });
}
