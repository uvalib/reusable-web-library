import { expect, fixture, nextFrame } from '@open-wc/testing';
import { sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-contents/uvalib-contents.js';
import type { UvalibContents } from '../src/components/uvalib-contents/UvalibContents.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { recordAnalytics } from './helpers/analytics.js';
import { inDarkMode } from './helpers/dark.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const nav = (el: Element) =>
  root(el).querySelector<HTMLElement>(el.shadowRoot ? 'nav' : ':scope > nav')!;
const panel = (el: Element) => nav(el).querySelector<HTMLElement>('.panel')!;
const toggle = (el: Element) => nav(el).querySelector<HTMLButtonElement>('button.toggle');
const links = (el: Element) => [...panel(el).querySelectorAll<HTMLAnchorElement>('a')];
/** Each entry, depth first, as [level, text, href, aria-current]. */
const shown = (el: Element) =>
  [...panel(el).querySelectorAll<HTMLElement>('li > a, li > .group')].map((n) => {
    let level = 0;
    for (
      let li = n.closest('li');
      li && panel(el).contains(li);
      li = li.parentElement!.closest('li')
    )
      level++;
    return [level, n.textContent!.trim(), n.getAttribute('href'), n.getAttribute('aria-current')];
  });

async function settle(el: UvalibContents): Promise<void> {
  await nextFrame();
  await el.updateComplete;
}

/** Collect console.warn calls made while `fn` runs. */
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

/** A link click would navigate the test page: cancel it once it reaches `document`. */
const cancel = (e: Event) => {
  if (e.composedPath().some((n) => n instanceof HTMLAnchorElement)) e.preventDefault();
};

const LIST = `<h2>Ignored</h2>
  <ol>
    <li><a href="/text/x/d3/">Preface</a></li>
    <li>
      <a href="/text/x/d8/">The actress of Padua</a>
      <ol>
        <li><a href="/text/x/d9/">Part I. The Key</a></li>
        <li><a href="/text/x/d9/#s2">Part I, section 2</a></li>
        <li>
          <span>Part II</span>
          <ul><li><a href="/text/x/d10/">The Crucifix</a></li></ul>
        </li>
      </ol>
    </li>
    <li><a href="/text/x/d13/">The campaigner's tale</a></li>
  </ol>`;

const WIDE = { width: 1200, height: 800 };

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-contents (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = (children = LIST, attrs = '') =>
      fixture<UvalibContents>(`<uvalib-contents ${attr} ${attrs}>${children}</uvalib-contents>`);

    before(() => document.addEventListener('click', cancel));
    after(() => document.removeEventListener('click', cancel));
    beforeEach(() => setViewport(WIDE));
    afterEach(() => setViewport({ width: 800, height: 600 }));

    it('renders a labelled nav with a headline and the nested list, any depth', async () => {
      const el = await make();
      expect(nav(el).getAttribute('aria-label')).to.equal('Contents');
      const h = nav(el).querySelector('.headline')!;
      expect(h.localName).to.equal('h2');
      expect(h.textContent!.trim()).to.equal('Contents');
      expect(toggle(el)).to.equal(null);
      expect(panel(el).hidden).to.equal(false);
      expect(panel(el).querySelector(':scope > ol')).to.not.equal(null);
      expect(shown(el)).to.deep.equal([
        [1, 'Preface', '/text/x/d3/', null],
        [1, 'The actress of Padua', '/text/x/d8/', null],
        [2, 'Part I. The Key', '/text/x/d9/', null],
        [2, 'Part I, section 2', '/text/x/d9/#s2', null],
        [2, 'Part II', null, null],
        [3, 'The Crucifix', '/text/x/d10/', null],
        [1, "The campaigner's tale", '/text/x/d13/', null],
      ]);
      // Lists keep their semantics without markers.
      for (const l of panel(el).querySelectorAll('ol, ul'))
        expect(l.getAttribute('role')).to.equal('list');
    });

    it('takes its name and headline from label, and the headline level from heading-level', async () => {
      const el = await make(LIST, 'label="In this section" heading-level="3"');
      expect(nav(el).getAttribute('aria-label')).to.equal('In this section');
      const h = nav(el).querySelector('.headline')!;
      expect(h.localName).to.equal('h3');
      expect(h.textContent!.trim()).to.equal('In this section');
      el.headingLevel = 9;
      await settle(el);
      expect(nav(el).querySelector('.headline')!.localName).to.equal('h2');
      // The nav itself is kept (in light DOM it is never taken for author content).
      expect(el.querySelectorAll('nav')).to.have.length(mode === 'shadow' ? 0 : 1);
    });

    it('does not show the source children themselves', async () => {
      const el = await make();
      const sources = [...el.querySelectorAll('a')].filter((n) => !nav(el).contains(n));
      expect(sources.length).to.equal(6);
      for (const s of sources) expect(s.offsetParent).to.equal(null);
    });

    it('marks the current page and the current section from current', async () => {
      const el = await make(LIST, 'current="/text/x/d9/"');
      expect(shown(el).filter((s) => s[3])).to.deep.equal([
        [2, 'Part I. The Key', '/text/x/d9/', 'page'],
      ]);
      el.current = '/text/x/d9/#s2';
      await settle(el);
      expect(shown(el).filter((s) => s[3])).to.deep.equal([
        [2, 'Part I. The Key', '/text/x/d9/', 'page'],
        [2, 'Part I, section 2', '/text/x/d9/#s2', 'location'],
      ]);
      // Trailing slash and index.html name the same page.
      el.current = '/text/x/d13/index.html';
      await settle(el);
      expect(
        shown(el)
          .filter((s) => s[3])
          .map((s) => s[1]),
      ).to.deep.equal(["The campaigner's tale"]);
    });

    it('marks the current entry from the page URL and follows hashchange', async () => {
      const path = location.pathname;
      const start = location.href;
      const el = await make(
        `<ul><li><a href="${path}">This page</a></li><li><a href="#part-2">Part 2</a></li><li><a href="/elsewhere">Elsewhere</a></li></ul>`,
      );
      try {
        expect(shown(el).map((s) => s[3])).to.deep.equal(['page', null, null]);
        // The source list was a <ul>: so is the rendered one.
        expect(panel(el).querySelector(':scope > ul')).to.not.equal(null);
        location.hash = 'part-2';
        await new Promise((r) => setTimeout(r, 50));
        await settle(el);
        expect(shown(el).map((s) => s[3])).to.deep.equal(['page', 'location', null]);
        history.replaceState(null, '', start);
        window.dispatchEvent(new PopStateEvent('popstate'));
        await settle(el);
        expect(shown(el).map((s) => s[3])).to.deep.equal(['page', null, null]);
      } finally {
        history.replaceState(null, '', start);
      }
    });

    it("uses an author's aria-current when current is unset", async () => {
      const el = await make(
        `<ol><li><a href="/a">A</a></li><li><a href="/b" aria-current="page">B</a><ol><li><a href="/b#c" aria-current="location">C</a></li></ol></li></ol>`,
      );
      expect(shown(el).map((s) => s[3])).to.deep.equal([null, 'page', 'location']);
      el.current = '/a';
      await settle(el);
      expect(shown(el).map((s) => s[3])).to.deep.equal(['page', null, null]);
    });

    it('follows child changes: added, removed, href and text', async () => {
      const el = await make();
      const source = () => [...el.querySelectorAll('a')].find((a) => !nav(el).contains(a))!;
      source().setAttribute('href', '/p');
      source().textContent = 'Foreword';
      await settle(el);
      expect(shown(el)[0]).to.deep.equal([1, 'Foreword', '/p', null]);
      const li = document.createElement('li');
      li.innerHTML = '<a href="/z">Index</a>';
      const list = [...el.querySelectorAll('ol')].find((o) => !nav(el).contains(o))!;
      list.append(li);
      await settle(el);
      expect(shown(el).at(-1)).to.deep.equal([1, 'Index', '/z', null]);
      li.remove();
      await settle(el);
      expect(shown(el).at(-1)![1]).to.equal("The campaigner's tale");
    });

    it('takes items from JS, winning over children, and goes back on undefined', async () => {
      const el = await make(LIST, 'current="/b"');
      el.items = [
        { label: 'A', href: '/a' },
        { label: 'Group', children: [{ label: 'B', href: '/b' }] },
      ];
      await settle(el);
      expect(shown(el)).to.deep.equal([
        [1, 'A', '/a', null],
        [1, 'Group', null, null],
        [2, 'B', '/b', 'page'],
      ]);
      el.items = undefined;
      await settle(el);
      expect(shown(el)).to.have.length(7);
    });

    it('skips entries with no text, with one warning, and hides an empty nav', async () => {
      let el!: UvalibContents;
      const warns = await warnings(async () => {
        el = await make('<ul><li><a href="/a"> </a></li><li><a href="/b">B</a></li></ul>');
        el.items = [{ label: '' }, { label: 'C', href: '/c' }, { label: ' ' }];
        await settle(el);
      });
      expect(shown(el).map((s) => s[1])).to.deep.equal(['C']);
      expect(warns).to.have.length(1);
      const empty = await make('');
      expect(nav(empty).hidden).to.equal(true);
      expect(empty.hasAttribute('data-empty')).to.equal(true);
    });

    it('shows unsafe hrefs (javascript:, data:) as text, with one warning', async () => {
      let el!: UvalibContents;
      const warns = await warnings(async () => {
        el = await make(
          '<ul><li><a href="javascript:alert(1)">Bad</a></li><li><a href="data:text/html,x">Data</a></li><li><a href="#ok">OK</a></li></ul>',
        );
      });
      expect(shown(el).map((s) => s[2])).to.deep.equal([null, null, '#ok']);
      expect(warns.filter((w) => w.includes('href'))).to.have.length(1);
    });

    it('fires a cancelable uvalib-contents-navigate and link-click analytics on a click', async () => {
      const el = await make();
      const rec = recordAnalytics();
      const seen: unknown[] = [];
      const route = (e: Event) => {
        seen.push((e as CustomEvent).detail);
        e.preventDefault();
      };
      document.addEventListener('uvalib-contents-navigate', route);
      let clickDefault: boolean | undefined;
      const spy = (e: Event) => (clickDefault = e.defaultPrevented);
      el.addEventListener('click', spy);
      try {
        links(el)[2]!.click();
        expect(seen).to.deep.equal([{ href: '/text/x/d9/', level: 2 }]);
        expect(clickDefault).to.equal(true);
        // A modified click (new tab) is reported but not routed.
        links(el)[4]!.dispatchEvent(
          new MouseEvent('click', {
            bubbles: true,
            composed: true,
            cancelable: true,
            ctrlKey: true,
          }),
        );
        expect(seen).to.have.length(1);
        expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
          ['uvalib-contents', 'link-click', 'level 2', 2],
          ['uvalib-contents', 'link-click', 'level 3', 3],
        ]);
      } finally {
        rec.restore();
        document.removeEventListener('uvalib-contents-navigate', route);
        el.removeEventListener('click', spy);
      }
    });

    describe('narrow screens', () => {
      beforeEach(() => setViewport({ width: 600, height: 800 }));

      it('collapses into a closed disclosure that the button opens and closes', async () => {
        const el = await make(LIST, 'current="/text/x/d9/"');
        const rec = recordAnalytics();
        try {
          await settle(el);
          const b = toggle(el)!;
          expect(b).to.not.equal(null);
          expect(b.closest('.headline')!.localName).to.equal('h2');
          expect(b.textContent!.trim()).to.equal('Contents');
          expect(b.getAttribute('aria-expanded')).to.equal('false');
          expect(b.getAttribute('aria-controls')).to.equal(panel(el).id);
          expect(panel(el).hidden).to.equal(true);
          expect(el.hasAttribute('data-narrow')).to.equal(true);
          expect(rec.events, 'reported on render').to.deep.equal([]);
          b.click();
          await settle(el);
          expect(b.getAttribute('aria-expanded')).to.equal('true');
          expect(panel(el).hidden).to.equal(false);
          expect(el.open).to.equal(true);
          expect(links(el).find((a) => a.getAttribute('aria-current'))!.textContent).to.equal(
            'Part I. The Key',
          );
          b.click();
          await settle(el);
          expect(panel(el).hidden).to.equal(true);
          expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
            ['uvalib-contents', 'toggle', 'open'],
            ['uvalib-contents', 'toggle', 'close'],
          ]);
        } finally {
          rec.restore();
        }
      });

      it('starts open with the open attribute', async () => {
        const el = await make(LIST, 'open');
        expect(toggle(el)!.getAttribute('aria-expanded')).to.equal('true');
        expect(panel(el).hidden).to.equal(false);
      });

      it('opens with Enter and Space from the keyboard, with a visible focus ring', async () => {
        const el = await make();
        (document.activeElement as HTMLElement | null)?.blur();
        await sendKeys({ press: 'Tab' });
        const b = toggle(el)!;
        expect(b.matches(':focus-visible')).to.equal(true);
        expect(getComputedStyle(b).outlineStyle).to.equal('solid');
        expect(getComputedStyle(b).outlineWidth).to.equal('3px');
        await sendKeys({ press: 'Enter' });
        await settle(el);
        expect(b.getAttribute('aria-expanded')).to.equal('true');
        await sendKeys({ press: 'Space' });
        await settle(el);
        expect(b.getAttribute('aria-expanded')).to.equal('false');
        expect(b.getBoundingClientRect().height).to.be.at.least(44);
      });

      it('follows collapse-below, and 0 never collapses', async () => {
        const el = await make(LIST, 'collapse-below="30rem"');
        expect(toggle(el)).to.equal(null);
        el.collapseBelow = '40rem';
        await settle(el);
        expect(toggle(el)).to.not.equal(null);
        const never = await make(LIST, 'collapse-below="0"');
        expect(toggle(never)).to.equal(null);
        expect(panel(never).hidden).to.equal(false);
      });

      it('goes back to the open list when the window widens', async () => {
        const el = await make();
        expect(panel(el).hidden).to.equal(true);
        await setViewport(WIDE);
        await new Promise((r) => setTimeout(r, 50));
        await settle(el);
        expect(toggle(el)).to.equal(null);
        expect(panel(el).hidden).to.equal(false);
        expect(el.hasAttribute('data-narrow')).to.equal(false);
      });

      it('passes axe, closed and open', async () => {
        const el = await make(LIST, 'current="/text/x/d9/"');
        await expectNoAxeViolations(el);
        toggle(el)!.click();
        await settle(el);
        await expectNoAxeViolations(el);
      });

      it('reflows at 320px with no horizontal scroll', async () => {
        await setViewport({ width: 320, height: 640 });
        const el = await make(
          `<ol><li><a href="/a">Supercalifragilisticexpialidocious-and-other-very-long-words</a><ol><li><a href="/b">${'Long title '.repeat(8)}</a></li></ol></li></ol>`,
          'open',
        );
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
        for (const a of links(el)) expect(a.getBoundingClientRect().right).to.be.at.most(320);
      });
    });

    it('sticky: stays in view and scrolls a long list to the current entry, not the page', async () => {
      const entries = Array.from(
        { length: 80 },
        (_, i) => `<li><a href="/s/${i}">Section ${i}</a></li>`,
      ).join('');
      const el = await make(`<ol>${entries}</ol>`, 'sticky current="/s/70"');
      await settle(el);
      expect(getComputedStyle(el).position).to.equal('sticky');
      const p = panel(el);
      expect(p.scrollHeight).to.be.greaterThan(p.clientHeight);
      expect(p.scrollTop).to.be.greaterThan(0);
      const cur = links(el).find((a) => a.getAttribute('aria-current'))!;
      const pr = p.getBoundingClientRect();
      const r = cur.getBoundingClientRect();
      expect(r.top).to.be.at.least(pr.top);
      expect(r.bottom).to.be.at.most(pr.bottom);
      expect(window.scrollY).to.equal(0);
    });

    it('is not sticky on narrow screens', async () => {
      await setViewport({ width: 600, height: 800 });
      const el = await make(LIST, 'sticky');
      expect(getComputedStyle(el).position).to.equal('static');
    });

    it('draws dividers, nesting bars, link colour and a bold current entry with a bar', async () => {
      const el = await make(LIST, 'current="/text/x/d9/"');
      const [, second] = panel(el).querySelectorAll<HTMLElement>(':scope > ol > li');
      expect(getComputedStyle(second!).borderTopStyle).to.equal('solid');
      const nested = panel(el).querySelector<HTMLElement>('li ol')!;
      expect(getComputedStyle(nested).borderInlineStartWidth).to.equal('2px');
      expect(getComputedStyle(nested).borderInlineStartColor).to.equal('rgb(229, 114, 0)');
      const a = links(el)[0]!;
      expect(getComputedStyle(a).color).to.equal('rgb(0, 86, 121)');
      const cur = links(el).find((x) => x.getAttribute('aria-current'))!;
      expect(getComputedStyle(cur).fontWeight).to.equal('700');
      expect(getComputedStyle(cur).borderInlineStartWidth).to.equal('4px');
      expect(getComputedStyle(cur).color).to.equal(getComputedStyle(el).color);
      // Every link is at least 24px tall (WCAG 2.5.8).
      for (const l of links(el)) expect(l.getBoundingClientRect().height).to.be.at.least(24);
    });

    it('shows a visible focus ring on its links (keyboard)', async () => {
      const el = await make();
      (document.activeElement as HTMLElement | null)?.blur();
      await sendKeys({ press: 'Tab' });
      const a = links(el)[0]!;
      expect(a.matches(':focus-visible')).to.equal(true);
      const s = getComputedStyle(a);
      expect(s.outlineStyle).to.equal('solid');
      expect(s.outlineWidth).to.equal('3px');
      expect(s.outlineColor).to.equal('rgb(229, 114, 0)');
    });

    it('passes axe (wide)', async () => {
      const el = await make(LIST, 'current="/text/x/d9/#s2"');
      await expectNoAxeViolations(el);
    });

    it('passes axe in dark mode, wide and narrow (open)', async () => {
      await inDarkMode(async () => {
        const el = await make(LIST, 'current="/text/x/d9/"');
        expect(getComputedStyle(links(el)[0]!).color).to.equal('rgb(145, 216, 242)');
        await expectNoAxeViolations(el);
        await setViewport({ width: 600, height: 800 });
        await settle(el);
        toggle(el)!.click();
        await settle(el);
        await expectNoAxeViolations(el);
      });
    });

    it('matches an entry with a query by its query, and one without whatever the query', async () => {
      const el = await make(
        '<ol><li><a href="/t?part=1">One</a></li><li><a href="/t?part=2">Two</a></li><li><a href="/a">A</a></li></ol>',
        'current="/t?part=2"',
      );
      const marked = () =>
        shown(el)
          .filter((x) => x[3])
          .map((x) => [x[1], x[3]]);
      expect(marked()).to.deep.equal([['Two', 'page']]);
      el.current = '/a?utm_source=newsletter';
      await settle(el);
      expect(marked()).to.deep.equal([['A', 'page']]);
      el.current = '/t?part=3';
      await settle(el);
      expect(marked()).to.deep.equal([]);
    });

    it('resolves hash-only entries against current when it is set', async () => {
      const el = await make(
        '<ol><li><a href="https://example.edu/other">Other</a><ol><li><a href="#s2">Section 2</a></li></ol></li></ol>',
        'current="https://example.edu/other#s2"',
      );
      expect(shown(el).map((x) => x[3])).to.deep.equal(['page', 'location']);
    });

    it('accepts only valid author aria-current values, one page and one location', async () => {
      const el = await make(
        '<ol><li><a href="/a" aria-current="step">A</a></li><li><a href="/b" aria-current="page">B</a></li><li><a href="/c" aria-current="page">C</a></li><li><a href="/d" aria-current="location">D</a></li><li><a href="/e" aria-current="location">E</a></li></ol>',
      );
      expect(shown(el).map((x) => x[3])).to.deep.equal([null, 'page', null, 'location', null]);
      const t = await make('<ol><li><a href="/x" aria-current="true">X</a></li></ol>');
      expect(shown(t).map((x) => x[3])).to.deep.equal(['page']);
    });

    it('a mark on an unsafe link does not turn off matching the page URL', async () => {
      let el!: UvalibContents;
      await warnings(async () => {
        el = await make(
          `<ol><li><a href="javascript:void(0)" aria-current="page">Bad</a></li><li><a href="${location.pathname}">Here</a></li><li><a href="/x" aria-current="step">X</a></li></ol>`,
        );
      });
      expect(shown(el).map((x) => [x[1], x[3]])).to.deep.equal([
        ['Bad', null],
        ['Here', 'page'],
        ['X', null],
      ]);
    });

    it('keeps lang and dir, and inline semantics, copied element by element', async () => {
      const el = await make(
        `<ol>
          <li lang="fr" dir="ltr"><a href="/a" lang="la" dir="bogus"><em>Ars</em> <cite>amatoria</cite> <code onclick="x()">v1</code> <abbr title="Volume">Vol.</abbr><b class="x" style="color:red" onmouseover="x()">!</b><div>flat</div></a></li>
          <li dir="rtl"><span lang="ar">مقدمة</span><ol><li><a href="/b">B</a></li></ol></li>
        </ol>`,
      );
      const [li1, li2] = panel(el).querySelectorAll<HTMLElement>(':scope > ol > li');
      expect(li1!.getAttribute('lang')).to.equal('fr');
      expect(li1!.getAttribute('dir')).to.equal('ltr');
      const a = li1!.querySelector('a')!;
      expect(a.getAttribute('lang')).to.equal('la');
      expect(a.hasAttribute('dir')).to.equal(false);
      expect([...a.children].map((c) => c.localName)).to.deep.equal([
        'em',
        'cite',
        'code',
        'abbr',
        'b',
      ]);
      expect(a.querySelector('abbr')!.getAttribute('title')).to.equal('Volume');
      for (const c of a.querySelectorAll('*'))
        expect(c.getAttributeNames().filter((n) => !['title'].includes(n))).to.deep.equal([]);
      expect(a.textContent).to.equal('Ars amatoria v1 Vol.!flat');
      // A group label: the item's dir on the <li>, the text's lang inside it.
      expect(li2!.getAttribute('dir')).to.equal('rtl');
      const group = li2!.querySelector(':scope > .group')!;
      expect(group.querySelector('span')!.getAttribute('lang')).to.equal('ar');
      // Re-rendering draws fresh copies: the label is not lost.
      el.current = '/a';
      await settle(el);
      expect(li1!.querySelector('a em')!.textContent).to.equal('Ars');
      expect(a.getAttribute('aria-current')).to.equal('page');
    });

    it('keeps only the structural rules with no-style', async () => {
      const el = await make(LIST, 'no-style');
      const ol = panel(el).querySelector('ol')!;
      expect(getComputedStyle(ol).listStyleType).to.equal('none');
      expect(getComputedStyle(ol).paddingLeft).to.equal('0px');
      if (mode === 'shadow')
        expect(getComputedStyle(links(el)[0]!).color).to.not.equal('rgb(0, 86, 121)');
    });
  });
}

describe('uvalib-contents light DOM styles', () => {
  it('installs its styles in @layer uvalib, so page CSS wins', async () => {
    await fixture(`<uvalib-contents no-shadow-dom>${LIST}</uvalib-contents>`);
    const texts = document.adoptedStyleSheets.map((s) =>
      [...s.cssRules].map((r) => r.cssText).join('\n'),
    );
    const own = texts.filter((t) => t.includes('uvalib-contents .toggle'));
    expect(own.length).to.be.greaterThan(0);
    for (const t of own) expect(t.startsWith('@layer uvalib')).to.equal(true);
  });
});
