import { expect } from '@open-wc/testing';
import { countMain, mount, whenAllDefined } from './helpers/page-probe.js';
import { setClock } from './helpers/hours.js';
import { expectNoPageAxeViolations } from './helpers/axe.js';
import {
  COLOR_SCHEME_SNIPPET,
  examples,
  GROUPS,
  presets,
  withCdnBase,
  type Preset,
} from '../site/src/presets.js';

const STYLES_LINK = /<link rel="stylesheet" href="\.\/styles\.css"\s*\/?>/;

/** The preview document: index.html with styles.css inlined in place of its link. */
function previewSource(p: Preset): string {
  let html = p.files['index.html']!.content;
  const css = p.files['styles.css']?.content;
  if (css !== undefined) {
    expect(html, `${p.id} links styles.css`).to.match(STYLES_LINK);
    html = html.replace(STYLES_LINK, `<style>${css}</style>`);
  }
  return html;
}

describe('playground presets', function () {
  this.timeout(5000); // each test mounts a full page from dist-cdn
  it('has the presets from the spec, in order', () => {
    expect(presets.map((p) => p.id)).to.deep.equal([
      'full-page',
      'pre-footer',
      'theming',
      'light-dom-host-css',
      'dark-mode',
      'vendor-header',
      'site-navigation',
      'main-navigation',
      'alerts',
      'breadcrumbs',
      'breadcrumbs-standalone',
      'collection-cards',
      'photo-card',
      'section-pager',
      'numbered-pager',
      'search-facets',
      'search-results',
      'todays-hours',
      'weekly-hours',
      'events',
      'analytics',
    ]);
  });

  it('lists every example once, grouped by component in menu order', () => {
    expect(GROUPS).to.deep.equal([
      'Page',
      'Header',
      'Alerts',
      'Breadcrumbs',
      'Cards',
      'Search',
      'Hours',
      'Events',
      'Analytics',
    ]);
    expect(
      Object.fromEntries(
        GROUPS.map((g) => [g, examples.filter((p) => p.group === g).map((p) => p.id)]),
      ),
    ).to.deep.equal({
      Page: ['full-page', 'pre-footer', 'theming', 'light-dom-host-css', 'dark-mode'],
      Header: [
        'vendor-header',
        'site-navigation',
        'main-navigation',
        'header-full-shadow',
        'header-full-light',
        'header-vendor-shadow',
        'header-vendor-light',
      ],
      Alerts: ['alerts'],
      Breadcrumbs: ['breadcrumbs', 'breadcrumbs-standalone'],
      Cards: ['collection-cards', 'photo-card', 'section-pager', 'numbered-pager'],
      Search: [
        'search-facets',
        'search-results',
        'uvalib-filter-shadow',
        'uvalib-filter-light',
        'uvalib-date-range-shadow',
        'uvalib-date-range-light',
      ],
      Hours: ['todays-hours', 'weekly-hours'],
      Events: ['events'],
      Analytics: ['analytics'],
    });
    // The menu order: each group's examples together, groups in GROUPS order.
    expect(examples.map((p) => GROUPS.indexOf(p.group))).to.deep.equal(
      examples.map((p) => GROUPS.indexOf(p.group)).sort((a, b) => a - b),
    );
    for (const p of presets) expect(examples, p.id).to.include(p);
  });

  it('example ids are URL fragments that cannot be read as a #files= share link', () => {
    const ids = examples.map((p) => p.id);
    expect(new Set(ids).size).to.equal(ids.length);
    for (const id of ids) {
      expect(id).to.match(/^[a-z][a-z0-9-]*$/);
      expect(`#${id}`.startsWith('#files=')).to.equal(false);
    }
  });

  it('examples cover each header variant in shadow and no-shadow-dom modes', () => {
    const pages = examples.map((p) => p.files['index.html']!.content);
    for (const variant of ['full', 'vendor']) {
      for (const light of [false, true]) {
        expect(
          pages.some(
            (html) =>
              html.includes(`header-variant="${variant}"`) &&
              html.includes('no-shadow-dom') === light,
          ),
          `${variant} ${light ? 'no-shadow-dom' : 'shadow'}`,
        ).to.equal(true);
      }
    }
  });

  it('main-navigation shows the default main nav and a slot="main-nav" override', async () => {
    const p = presets.find((x) => x.id === 'main-navigation')!;
    const html = p.files['index.html']!.content;
    expect(html).to.include('slot="main-nav"');
    expect(html).to.not.include('no-main-nav=');
    const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
    try {
      const win = iframe.contentWindow!;
      const doc = iframe.contentDocument!;
      await whenAllDefined(win, ['site-page', 'site-header', 'site-main-nav']);
      await new Promise((r) => setTimeout(r, 300));
      const header = doc.querySelector('site-page')!.shadowRoot!.querySelector('site-header')!;
      const bar = header.shadowRoot!.querySelector('header > site-main-nav')!;
      const labels = (n: Element) =>
        [...n.shadowRoot!.querySelectorAll('nav.main-nav > ul > li > :is(button, a)')].map((b) =>
          b.textContent!.trim(),
        );
      expect(labels(bar)).to.deep.equal([
        'About',
        'Using the Library',
        'Research & teaching support',
        'Get help',
      ]);
      const custom = doc.querySelector('main site-main-nav, site-page > site-main-nav')!;
      expect(labels(custom).length).to.be.greaterThan(0);
      expect(labels(custom)).to.not.include('About');
      expect(errors).to.deep.equal([]);
    } finally {
      iframe.remove();
    }
  });

  describe('dark-mode', () => {
    const p = () => presets.find((x) => x.id === 'dark-mode')!;
    afterEach(() => localStorage.removeItem('uvalib-color-scheme'));

    it('opts in, and runs the anti-flash snippet in <head> next to tokens.css and base.css', () => {
      const html = p().files['index.html']!.content;
      expect(html).to.include('<site-page color-scheme-switch>');
      const head = html.slice(0, html.indexOf('</head>'));
      expect(head).to.include(`<script>${COLOR_SCHEME_SNIPPET}</script>`);
      expect(head).to.include('<link rel="stylesheet" href="{{CDN}}tokens.css" />');
      expect(head).to.include('<link rel="stylesheet" href="{{CDN}}base.css" />');
      // Classic and inline, before the module scripts: it runs before the first paint.
      expect(head.indexOf(COLOR_SCHEME_SNIPPET)).to.be.below(head.indexOf('type="module"'));
      expect(COLOR_SCHEME_SNIPPET.length).to.be.below(220);
    });

    it('the README documents the same snippet', async () => {
      const readme = await (await fetch('/README.md')).text();
      expect(readme).to.include(`<script>${COLOR_SCHEME_SNIPPET}</script>`);
    });

    for (const [stored, expected] of [
      [null, 'system'],
      ['dark', 'dark'],
      ['light', 'light'],
      ['bogus', 'system'],
    ] as const) {
      it(`the snippet sets data-uva-color-scheme="${expected}" for a stored ${stored}`, () => {
        if (stored) localStorage.setItem('uvalib-color-scheme', stored);
        const doc = document.implementation.createHTMLDocument('');
        new Function('document', COLOR_SCHEME_SNIPPET)(doc);
        expect(doc.documentElement.dataset.uvaColorScheme).to.equal(expected);
      });
    }

    it('the snippet does nothing without light-dark() support', () => {
      const supports = CSS.supports;
      CSS.supports = () => false;
      try {
        const doc = document.implementation.createHTMLDocument('');
        new Function('document', COLOR_SCHEME_SNIPPET)(doc);
        expect(doc.documentElement.hasAttribute('data-uva-color-scheme')).to.equal(false);
      } finally {
        CSS.supports = supports;
      }
    });

    it('renders the Theme control and the dark palette for a stored Dark', async () => {
      localStorage.setItem('uvalib-color-scheme', 'dark');
      const { iframe, errors } = await mount(previewSource(withCdnBase(p(), '/dist-site/cdn/')));
      try {
        const doc = iframe.contentDocument!;
        await whenAllDefined(iframe.contentWindow!, ['site-page', 'site-header']);
        await new Promise((r) => setTimeout(r, 300));
        expect(doc.documentElement.dataset.uvaColorScheme).to.equal('dark');
        const header = doc.querySelector('site-page')!.shadowRoot!.querySelector('site-header')!;
        expect(header.shadowRoot!.querySelectorAll('fieldset.color-scheme')).to.have.length(2);
        expect(getComputedStyle(doc.body).backgroundColor).to.equal('rgb(16, 23, 43)');
        expect(errors).to.deep.equal([]);
      } finally {
        iframe.remove();
      }
    });
  });

  it('breadcrumbs sits between the header and main; the JS example re-renders from items', async () => {
    for (const id of ['breadcrumbs', 'breadcrumbs-standalone']) {
      const p = presets.find((x) => x.id === id)!;
      const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
      try {
        const doc = iframe.contentDocument!;
        await whenAllDefined(iframe.contentWindow!, ['site-page', 'uvalib-breadcrumbs']);
        await new Promise((r) => setTimeout(r, 100));
        const el = doc.querySelector('uvalib-breadcrumbs')!;
        const page = doc.querySelector('site-page')!;
        const main = page.shadowRoot!.querySelector('main')!;
        const labels = () =>
          [...el.shadowRoot!.querySelectorAll('li > a, li > span:not(.separator)')].map((n) => [
            n.textContent,
            n.getAttribute('aria-current'),
          ]);
        if (id === 'breadcrumbs') {
          expect(el.assignedSlot!.nextElementSibling).to.equal(main);
          expect(labels().at(-1)).to.deep.equal(['Writing & publication', 'page']);
        } else {
          expect(el.assignedSlot!.closest('main')).to.equal(main);
          expect(labels()).to.deep.equal([
            ['Home', null],
            ['Search', 'page'],
          ]);
          doc.querySelector<HTMLButtonElement>('#open')!.click();
          await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
          expect(labels()).to.deep.equal([
            ['Home', null],
            ['Search', null],
            ['First result', 'page'],
          ]);
        }
        expect(countMain(doc)).to.equal(1);
        await expectNoPageAxeViolations(doc);
        expect(errors).to.deep.equal([]);
      } finally {
        iframe.remove();
      }
    }
  });

  describe('events', () => {
    const p = () => presets.find((x) => x.id === 'events')!;
    before(() => setClock('2026-11-16T14:00:00Z'));

    /** The events-section's height in the preview at `width`, defined (loaded) or not. */
    async function height(width: number, define: boolean): Promise<number> {
      let src = previewSource(withCdnBase(p(), '/dist-site/cdn/'));
      if (!define)
        src = src.replace(/<script type="module" src="[^"]*events-section\.js"><\/script>/, '');
      const { iframe, errors } = await mount(src);
      iframe.style.width = `${width}px`;
      iframe.style.height = '600px';
      try {
        const win = iframe.contentWindow!;
        const el = iframe.contentDocument!.querySelector('events-section') as HTMLElement & {
          state?: string;
        };
        if (define) {
          await whenAllDefined(win, ['events-section']);
          const deadline = Date.now() + 4000;
          while (el.state !== 'ready' && Date.now() < deadline)
            await new Promise((r) => setTimeout(r, 50));
          expect(el.state).to.equal('ready');
          expect(el.shadowRoot!.querySelectorAll('.event:not(.event-placeholder)')).to.have.length(
            8,
          );
          // Lighthouse's accessibility audit runs axe on this page (heading-order included).
          await expectNoPageAxeViolations(iframe.contentDocument!);
        } else {
          expect(win.customElements.get('events-section')).to.equal(undefined);
        }
        await new Promise((r) => requestAnimationFrame(r));
        expect(errors).to.deep.equal([]);
        return el.getBoundingClientRect().height;
      } finally {
        iframe.remove();
      }
    }

    for (const width of [390, 900, 1400]) {
      it(`reserves the loaded cards' height before the script runs (${width}px)`, async () => {
        const reserved = await height(width, false);
        const loaded = await height(width, true);
        expect(Math.abs(loaded - reserved), `${reserved} reserved, ${loaded} loaded`).to.be.below(
          2,
        );
      });
    }
  });

  describe('search-results', () => {
    const p = () => presets.find((x) => x.id === 'search-results')!;

    /** The bento-box's height in the preview at `width`, defined (loaded) or not. */
    async function height(width: number, define: boolean): Promise<number> {
      let src = previewSource(withCdnBase(p(), '/dist-site/cdn/'));
      if (!define)
        src = src.replace(/<script type="module" src="[^"]*bento-box\.js"><\/script>/, '');
      const { iframe, errors } = await mount(src);
      iframe.style.width = `${width}px`;
      iframe.style.height = '600px';
      try {
        const win = iframe.contentWindow!;
        const box = iframe.contentDocument!.querySelector('bento-box')!;
        if (define) {
          await whenAllDefined(win, ['bento-box', 'catalog-section']);
          const sections = () => [
            ...box.shadowRoot!.querySelectorAll<HTMLElement & { state: string }>(
              '.bs-results--block',
            ),
          ];
          const deadline = Date.now() + 4000;
          while (
            !(sections().length === 3 && sections().every((s) => s.state === 'ready')) &&
            Date.now() < deadline
          )
            await new Promise((r) => setTimeout(r, 50));
          expect(sections().map((s) => s.localName)).to.deep.equal([
            'catalog-section',
            'articles-section',
            'libguides-section',
          ]);
          expect(sections().map((s) => s.state)).to.deep.equal(['ready', 'ready', 'ready']);
          for (const s of sections())
            expect(
              s.shadowRoot!.querySelectorAll(
                '.bs-results--list > li:not(.bs-results--placeholder)',
              ),
            ).to.have.length(3);
        } else {
          expect(win.customElements.get('bento-box')).to.equal(undefined);
        }
        await new Promise((r) => requestAnimationFrame(r));
        expect(errors).to.deep.equal([]);
        return box.getBoundingClientRect().height;
      } finally {
        iframe.remove();
      }
    }

    for (const width of [390, 1280]) {
      it(`reserves the loaded results' height before the script runs (${width}px)`, async () => {
        const reserved = await height(width, false);
        const loaded = await height(width, true);
        expect(Math.abs(loaded - reserved), `${reserved} reserved, ${loaded} loaded`).to.be.below(
          2,
        );
      });
    }
  });

  it('withCdnBase replaces every {{CDN}} token and leaves the original untouched', () => {
    const p = withCdnBase(presets[0]!, 'https://example.test/cdn/');
    const all = Object.values(p.files)
      .map((f) => f.content)
      .join('\n');
    expect(all).to.not.include('{{CDN}}');
    expect(all).to.include('https://example.test/cdn/site-page.js');
    expect(presets[0]!.files['index.html']!.content).to.include('{{CDN}}site-page.js');
  });

  it("analytics logs the components' events, with no analytics element and nothing sent", async () => {
    const p = presets.find((x) => x.id === 'analytics')!;
    const html = p.files['index.html']!.content;
    expect(html).to.not.match(/<(site|uvalib)-analytics[\s>]/);
    const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
    try {
      const win = iframe.contentWindow!;
      const doc = iframe.contentDocument!;
      await whenAllDefined(win, ['site-page', 'site-header', 'bento-box', 'catalog-section']);
      const log = doc.querySelector('#event-log')!;
      const lines = () => [...log.children].map((li) => li.textContent!);
      const deadline = Date.now() + 4000;
      while (lines().filter((l) => l.startsWith('uvalib-analytics-search')).length < 3) {
        if (Date.now() > deadline) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      const searches = lines().filter((l) => l.startsWith('uvalib-analytics-search'));
      expect(searches, lines().join('\n')).to.have.length(3);
      for (const name of ['Virgo catalog', 'Virgo articles', 'Subject guides'])
        expect(searches.some((l) => l.includes(`"searchCategory":"${name}"`))).to.equal(true);
      expect(doc.querySelector('script[src*="matomo"]')).to.equal(null);
      expect((win as unknown as { _paq?: unknown })._paq).to.equal(undefined);
      expect(errors).to.deep.equal([]);
    } finally {
      iframe.remove();
    }
  });

  for (const p of examples) {
    describe(p.id, () => {
      it('loads components through {{CDN}} and never from the internal CDN', () => {
        const all = Object.values(p.files)
          .map((f) => f.content)
          .join('\n');
        expect(p.files['index.html']!.content).to.include('<script type="module" src="{{CDN}}');
        expect(all).to.not.include('unpkg.internal');
        expect(p.title).to.not.equal('');
        expect(p.description).to.not.equal('');
      });

      it('renders against dist-cdn with defined components, one main and no errors', async () => {
        const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
        try {
          const win = iframe.contentWindow!;
          const doc = iframe.contentDocument!;
          const tags = new Set(
            [...doc.querySelectorAll('*')].map((e) => e.localName).filter((n) => n.includes('-')),
          );
          expect(tags.size).to.be.greaterThan(0);
          await whenAllDefined(win, tags);
          for (const t of tags) {
            expect(doc.querySelector(`${t}:not(:defined)`), `${t} defined`).to.equal(null);
          }
          await (doc.querySelector('site-page') as unknown as { updateComplete: Promise<unknown> })
            .updateComplete;
          await new Promise((r) => setTimeout(r, 300)); // header and footer render asynchronously
          expect(countMain(doc)).to.equal(1);
          expect(errors).to.deep.equal([]);
        } finally {
          iframe.remove();
        }
      });
    });
  }

  for (const [id, tag, rows] of [
    ['todays-hours', 'site-hours-section', 'dt.location'],
    ['weekly-hours', 'library-weekly-hours', 'tbody tr'],
  ] as const) {
    it(`${id} loads the published library-list snapshot and shows hours`, async () => {
      const p = presets.find((x) => x.id === id)!;
      const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
      try {
        const win = iframe.contentWindow!;
        const doc = iframe.contentDocument!;
        await whenAllDefined(win, [tag]);
        const el = doc.querySelector(tag) as HTMLElement & { state: string };
        const deadline = Date.now() + 4000;
        while (el.state !== 'ready' && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 50));
        }
        expect(el.state).to.equal('ready');
        expect((el.shadowRoot ?? el).querySelectorAll(rows).length).to.be.greaterThan(0);
        expect(errors).to.deep.equal([]);
      } finally {
        iframe.remove();
      }
    });
  }
});
