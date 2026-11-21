import { expect, fixture, nextFrame } from '@open-wc/testing';
import { sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-breadcrumbs/uvalib-breadcrumbs.js';
import type { UvalibBreadcrumbs } from '../src/components/uvalib-breadcrumbs/UvalibBreadcrumbs.js';
import { expectNoAxeViolations } from './helpers/axe.js';

const nav = (el: Element) =>
  (el.shadowRoot ?? el).querySelector<HTMLElement>(el.shadowRoot ? 'nav' : ':scope > nav')!;
const items = (el: Element) => [...nav(el).querySelectorAll(':scope > ol > li')];
/** Each item as [tag, text without the separator, href, aria-current]. */
const shown = (el: Element) =>
  items(el).map((li) => {
    const step = li.querySelector(':scope > a, :scope > span:not(.separator)')!;
    return [
      step.localName,
      step.textContent,
      step.getAttribute('href'),
      step.getAttribute('aria-current'),
    ];
  });

async function settle(el: UvalibBreadcrumbs): Promise<void> {
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

const TRAIL = `<a href="/">Home</a><a href="research">Research &amp; teaching</a><span>Writing</span>`;

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-breadcrumbs (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = (children = TRAIL, attrs = '') =>
      fixture<UvalibBreadcrumbs>(
        `<uvalib-breadcrumbs ${attr} ${attrs}>${children}</uvalib-breadcrumbs>`,
      );

    it('renders a labelled nav with an ordered list, the last item the current page', async () => {
      const el = await make();
      const n = nav(el);
      expect(n.getAttribute('aria-label')).to.equal('Breadcrumb');
      expect(n.hidden).to.equal(false);
      expect(n.querySelector(':scope > ol')).to.not.equal(null);
      expect(shown(el)).to.deep.equal([
        ['a', 'Home', '/', null],
        ['a', 'Research & teaching', 'research', null],
        ['span', 'Writing', null, 'page'],
      ]);
    });

    it('uses relative and hash hrefs exactly as written', async () => {
      const el = await make('<a href="../up">Up</a><a href="#/route">Route</a><span>Here</span>');
      expect(shown(el).map((s) => s[2])).to.deep.equal(['../up', '#/route', null]);
    });

    it('hides the separators from assistive technology, between items only', async () => {
      const el = await make();
      const seps = [...nav(el).querySelectorAll('.separator')];
      expect(seps.length).to.equal(2);
      for (const s of seps) {
        expect(s.getAttribute('aria-hidden')).to.equal('true');
        expect(s.textContent).to.equal('/');
      }
      expect(items(el)[0]!.querySelector('.separator')).to.equal(null);
      // No generated content carries the separator.
      for (const li of items(el))
        expect(getComputedStyle(li, '::before').content).to.be.oneOf(['none', 'normal']);
    });

    it('makes a final link the current page with aria-current', async () => {
      const el = await make('<a href="/">Home</a><a href="/hours" aria-current="page">Hours</a>');
      expect(shown(el)).to.deep.equal([
        ['a', 'Home', '/', null],
        ['a', 'Hours', '/hours', 'page'],
      ]);
    });

    it('takes its accessible name from label', async () => {
      const el = await make(TRAIL, 'label="You are here"');
      expect(nav(el).getAttribute('aria-label')).to.equal('You are here');
    });

    it('does not show the source children themselves', async () => {
      const el = await make();
      const sources = [...el.querySelectorAll('a, span')].filter((n) => !nav(el).contains(n));
      expect(sources.length).to.equal(3);
      for (const s of sources) expect((s as HTMLElement).offsetParent).to.equal(null);
    });

    it('follows child changes: added, removed, href and text', async () => {
      const el = await make();
      const source = () => [...el.querySelectorAll('a')].find((a) => !nav(el).contains(a))!;
      source().setAttribute('href', '/home');
      await settle(el);
      expect(shown(el)[0]![2]).to.equal('/home');
      source().textContent = 'Library';
      await settle(el);
      expect(shown(el)[0]![1]).to.equal('Library');
      const extra = document.createElement('span');
      extra.textContent = 'Drafts';
      el.append(extra);
      await settle(el);
      expect(shown(el).map((s) => [s[1], s[3]])).to.deep.equal([
        ['Library', null],
        ['Research & teaching', null],
        ['Writing', null],
        ['Drafts', 'page'],
      ]);
      extra.remove();
      await settle(el);
      expect(shown(el).at(-1)).to.deep.equal(['span', 'Writing', null, 'page']);
    });

    it('renders an earlier text-only child as plain text, not current', async () => {
      const el = await make('<a href="/">Home</a><span>Group</span><span>Page</span>');
      expect(shown(el)).to.deep.equal([
        ['a', 'Home', '/', null],
        ['span', 'Group', null, null],
        ['span', 'Page', null, 'page'],
      ]);
    });

    it('skips children with no text, with one console warning', async () => {
      let el!: UvalibBreadcrumbs;
      const warns = await warnings(async () => {
        el = await make('<a href="/">Home</a><a href="/x"> </a><span></span><span>Here</span>');
        el.append(document.createElement('span'));
        await settle(el);
      });
      expect(shown(el).map((s) => s[1])).to.deep.equal(['Home', 'Here']);
      expect(warns.length).to.equal(1);
      expect(warns[0]).to.contain('uvalib-breadcrumbs');
    });

    it('warns about bare text in the trail', async () => {
      const warns = await warnings(async () => {
        await make('Home <span>Here</span>');
      });
      expect(warns.length).to.equal(1);
    });

    it('renders a hidden nav when there is no trail', async () => {
      const el = await make('');
      expect(nav(el).hidden).to.equal(true);
      expect(items(el).length).to.equal(0);
    });

    it('takes items from JS, winning over children, and re-renders on a new array', async () => {
      const el = await make();
      el.items = [{ label: 'Home', href: '/' }, { label: 'Search' }];
      await settle(el);
      expect(shown(el)).to.deep.equal([
        ['a', 'Home', '/', null],
        ['span', 'Search', null, 'page'],
      ]);
      el.items = [
        { label: 'Home', href: '/' },
        { label: 'Search', href: '#/search' },
        { label: 'Result', href: '#/search/1' },
      ];
      await settle(el);
      expect(shown(el).at(-1)).to.deep.equal(['a', 'Result', '#/search/1', 'page']);
      el.items = undefined;
      await settle(el);
      expect(shown(el).map((s) => s[1])).to.deep.equal(['Home', 'Research & teaching', 'Writing']);
    });

    it('skips items without a label, with one console warning', async () => {
      const el = await make('');
      const warns = await warnings(async () => {
        el.items = [{ label: 'Home', href: '/' }, { label: '  ', href: '/x' }, { label: 'Here' }];
        await settle(el);
      });
      expect(shown(el).map((s) => s[1])).to.deep.equal(['Home', 'Here']);
      expect(warns.length).to.equal(1);
    });

    it('exposes the trail as a list even without markers (role="list")', async () => {
      const el = await make();
      expect(nav(el).querySelector('ol')!.getAttribute('role')).to.equal('list');
      for (const li of items(el)) expect(li.getAttribute('role')).to.equal('listitem');
    });

    it('shows unsafe hrefs (javascript:, data:) as text, with one warning', async () => {
      const warns = await warnings(async () => {
        const el = await make(
          `<a href="javascript:alert(1)">Home</a><a href="java\tscript:alert(1)">Tab</a><a href="mailto:a@b.c">Mail</a><span>Here</span>`,
        );
        el.items = [
          { label: 'Data', href: 'data:text/html,x' },
          { label: 'Here', href: '#/' },
        ];
        await settle(el);
        expect(shown(el)).to.deep.equal([
          ['span', 'Data', null, null],
          ['a', 'Here', '#/', 'page'],
        ]);
        el.items = undefined;
        await settle(el);
        expect(shown(el)).to.deep.equal([
          ['span', 'Home', null, null],
          ['span', 'Tab', null, null],
          ['a', 'Mail', 'mailto:a@b.c', null],
          ['span', 'Here', null, 'page'],
        ]);
      });
      expect(warns.filter((w) => w.includes('href'))).to.have.length(1);
    });

    it('follows links added to an initially empty trail, and their later edits', async () => {
      const el = await make('');
      expect(nav(el).hidden).to.equal(true);
      expect(el.hasAttribute('data-empty')).to.equal(true);
      const a = document.createElement('a');
      a.href = '/a';
      a.textContent = 'A';
      el.append(a, Object.assign(document.createElement('span'), { textContent: 'Here' }));
      await settle(el);
      expect(el.hasAttribute('data-empty')).to.equal(false);
      a.setAttribute('href', '/b');
      a.textContent = 'B';
      await settle(el);
      expect(shown(el)[0]).to.deep.equal(['a', 'B', '/b', null]);
    });

    it('fires a cancelable uvalib-breadcrumbs-navigate on a plain link click', async () => {
      const el = await make();
      const seen: { href: string; index: number }[] = [];
      const route = (e: Event) => {
        seen.push((e as CustomEvent).detail);
        e.preventDefault();
      };
      document.addEventListener('uvalib-breadcrumbs-navigate', route);
      let clickDefault: boolean | undefined;
      const spy = (e: Event) => (clickDefault = e.defaultPrevented);
      try {
        el.addEventListener('click', spy);
        nav(el).querySelectorAll('a')[1]!.click();
        expect(seen).to.deep.equal([{ href: 'research', index: 1 }]);
        expect(clickDefault).to.equal(true);
        // A modified click (new tab) is left alone. The test cancels it at the element's root,
        // after the component's own handler has seen it, so the runner's page never navigates.
        const stop = (e: Event) => e.preventDefault();
        const at = el.shadowRoot ?? el;
        at.addEventListener('click', stop);
        try {
          nav(el)
            .querySelectorAll('a')[0]!
            .dispatchEvent(
              new MouseEvent('click', {
                bubbles: true,
                composed: true,
                cancelable: true,
                metaKey: true,
              }),
            );
        } finally {
          at.removeEventListener('click', stop);
        }
        expect(seen).to.have.length(1);
      } finally {
        document.removeEventListener('uvalib-breadcrumbs-navigate', route);
        el.removeEventListener('click', spy);
      }
    });

    describe('data-return-from: back to the search the visitor came from', () => {
      const fake = (referrer: string) =>
        Object.defineProperty(document, 'referrer', { configurable: true, get: () => referrer });
      afterEach(() => delete (document as { referrer?: string }).referrer);
      const SEARCH = `<a href="/search/" data-return-from="/search/">Search</a><a href="/2023/">2023</a><span>Meeting</span>`;
      const hrefs = (el: Element) => shown(el).map((s) => s[2]);

      it('links to a same-origin search with a query, keeping the text', async () => {
        fake(`${location.origin}/search/?q=budget&date_start=2023`);
        const el = await make(SEARCH);
        expect(shown(el)[0]).to.deep.equal(['a', 'Search', '/search/?q=budget&date_start=2023', null]);
        expect(hrefs(el).slice(1)).to.deep.equal(['/2023/', null]);
      });

      it('ignores a trailing slash or index.html, and takes a list of paths', async () => {
        fake(`${location.origin}/search/index.html?q=a`);
        const el = await make(SEARCH);
        expect(hrefs(el)[0]).to.equal('/search/index.html?q=a');
        fake(`${location.origin}/find?q=b`);
        const other = await make(
          `<a href="/search/" data-return-from="/search/ /find/">Search</a><span>Here</span>`,
        );
        expect(hrefs(other)[0]).to.equal('/find?q=b');
      });

      it('keeps the href for another path, no query, another origin or no referrer', async () => {
        for (const r of [
          `${location.origin}/2023/?q=a`,
          `${location.origin}/search/`,
          `${location.origin}/search/?`,
          `https://example.org/search/?q=a`,
          '',
        ]) {
          fake(r);
          const el = await make(SEARCH);
          expect(hrefs(el)[0], r).to.equal('/search/');
        }
      });

      it('only changes the steps that ask for it', async () => {
        fake(`${location.origin}/search/?q=a`);
        const el = await make(`<a href="/search/">Search</a><span>Here</span>`);
        expect(hrefs(el)[0]).to.equal('/search/');
      });

      it('follows data-return-from added later, and works from items (returnFrom)', async () => {
        fake(`${location.origin}/search/?q=a`);
        const el = await make(`<a href="/search/">Search</a><span>Here</span>`);
        const src = el.querySelector(mode === 'shadow' ? ':scope > a' : '.breadcrumbs-source a')!;
        src.setAttribute('data-return-from', '/search/');
        await settle(el);
        expect(hrefs(el)[0]).to.equal('/search/?q=a');
        el.items = [{ label: 'Search', href: '/search/', returnFrom: '/search' }, { label: 'Here' }];
        await settle(el);
        expect(hrefs(el)).to.deep.equal(['/search/?q=a', null]);
      });

      it('reports the returned href in uvalib-breadcrumbs-navigate', async () => {
        fake(`${location.origin}/search/?q=a`);
        const el = await make(SEARCH);
        const seen: string[] = [];
        const route = (e: Event) => {
          seen.push((e as CustomEvent).detail.href);
          e.preventDefault();
        };
        document.addEventListener('uvalib-breadcrumbs-navigate', route);
        try {
          nav(el).querySelector('a')!.click();
        } finally {
          document.removeEventListener('uvalib-breadcrumbs-navigate', route);
        }
        expect(seen).to.deep.equal(['/search/?q=a']);
      });
    });

    it('draws a linked current page in the text colour', async () => {
      const el = await make(`<a href="/">Home</a><a href="/here">Here</a>`);
      const [home, here] = nav(el).querySelectorAll('a');
      expect(getComputedStyle(here!).color).to.equal(getComputedStyle(nav(el)).color);
      expect(getComputedStyle(home!).color).to.not.equal(getComputedStyle(here!).color);
    });

    it('passes axe', async () => {
      const el = await make();
      await expectNoAxeViolations(el);
    });

    it('wraps a long trail at 320px with no horizontal scroll', async () => {
      await setViewport({ width: 320, height: 640 });
      try {
        const el = await make(
          '<a href="/">Home</a><a href="/a">Research &amp; teaching support</a>' +
            '<a href="/b">Writing &amp; publication</a><a href="/c">Supercalifragilisticexpialidocious-publishing</a>' +
            '<span>A very long current page title that will not fit on one line</span>',
        );
        expect(el.getBoundingClientRect().height).to.be.greaterThan(60);
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
        for (const li of items(el)) expect(li.getBoundingClientRect().right).to.be.at.most(320);
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
    });

    it('is at body size (1rem) with underlined links', async () => {
      const el = await make();
      const a = nav(el).querySelector('a')!;
      const rem = getComputedStyle(document.documentElement).fontSize;
      expect(getComputedStyle(a).fontSize).to.equal(rem);
      expect(getComputedStyle(a).textDecorationLine).to.equal('underline');
      expect(getComputedStyle(a).color).to.equal('rgb(0, 86, 121)');
    });

    it('shows a visible focus ring on its links (keyboard)', async () => {
      const el = await make();
      const a = nav(el).querySelector('a')!;
      a.tabIndex = 0;
      (document.activeElement as HTMLElement | null)?.blur();
      await sendKeys({ press: 'Tab' });
      expect(a.matches(':focus-visible')).to.equal(true);
      const s = getComputedStyle(a);
      expect(s.outlineStyle).to.equal('solid');
      expect(s.outlineWidth).to.equal('3px');
      expect(s.outlineColor).to.equal('rgb(229, 114, 0)');
    });

    it('keeps only the structural rules with no-style', async () => {
      const el = await make(TRAIL, 'no-style');
      const ol = nav(el).querySelector('ol')!;
      expect(getComputedStyle(ol).listStyleType).to.equal('none');
      expect(getComputedStyle(ol).paddingLeft).to.equal('0px');
      expect(getComputedStyle(items(el)[0]!).display).to.equal('inline');
      const sep = nav(el).querySelector('.separator')!;
      expect(parseFloat(getComputedStyle(sep).marginInlineEnd)).to.be.greaterThan(0);
      // No colour rules: the link keeps the browser's (or page's) colour. (In light DOM a
      // styled element elsewhere in the same document has installed the styled rules.)
      if (mode === 'shadow')
        expect(getComputedStyle(nav(el).querySelector('a')!).color).to.not.equal('rgb(0, 86, 121)');
    });
  });
}

describe('uvalib-breadcrumbs light DOM styles', () => {
  it('installs its styles in @layer uvalib, so page CSS wins', async () => {
    await fixture(`<uvalib-breadcrumbs no-shadow-dom>${TRAIL}</uvalib-breadcrumbs>`);
    const texts = document.adoptedStyleSheets.map((s) =>
      [...s.cssRules].map((r) => r.cssText).join('\n'),
    );
    const own = texts.filter((t) => t.includes('uvalib-breadcrumbs .separator'));
    expect(own.length).to.be.greaterThan(0);
    for (const t of own) expect(t.startsWith('@layer uvalib')).to.equal(true);
  });
});
