import { expect, waitUntil } from '@open-wc/testing';
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
      'buttons-forms',
      'back-to-top',
      'sidebar-layout',
      'vendor-header',
      'site-navigation',
      'site-name',
      'main-navigation',
      'alerts',
      'breadcrumbs',
      'breadcrumbs-standalone',
      'breadcrumbs-search',
      'collection-cards',
      'photo-card',
      'section-pager',
      'numbered-pager',
      'chip-groups',
      'tabs',
      'person-cards',
      'story-card',
      'load-more',
      'load-more-unknown-total',
      'contents-sidebar',
      'contents-headings',
      'contents-window',
      'record-metadata',
      'citation',
      'tables',
      'edition',
      'photo-grid',
      'photo-grid-badges',
      'page-images',
      'image-regions',
      'image-versions',
      'places-map',
      'search-facets',
      'search-results',
      'pagefind-search',
      'results-toolbar',
      'results-list',
      'date-histogram',
      'date-histogram-decades',
      'combobox',
      'filter-drawer',
      'dialog',
      'list-filter',
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
      'Chips',
      'Contents',
      'Metadata',
      'Tables',
      'Texts',
      'Images',
      'Maps',
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
      Page: [
        'full-page',
        'pre-footer',
        'theming',
        'light-dom-host-css',
        'dark-mode',
        'buttons-forms',
        'back-to-top',
        'sidebar-layout',
      ],
      Header: [
        'vendor-header',
        'site-navigation',
        'site-name',
        'main-navigation',
        'header-full-shadow',
        'header-full-light',
        'header-vendor-shadow',
        'header-vendor-light',
      ],
      Alerts: ['alerts'],
      Breadcrumbs: ['breadcrumbs', 'breadcrumbs-standalone', 'breadcrumbs-search'],
      Cards: [
        'collection-cards',
        'photo-card',
        'section-pager',
        'numbered-pager',
        'tabs',
        'person-cards',
        'story-card',
        'load-more',
        'load-more-unknown-total',
      ],
      Chips: ['chip-groups'],
      Contents: ['contents-sidebar', 'contents-headings', 'contents-window'],
      Metadata: ['record-metadata', 'citation'],
      Tables: ['tables'],
      Texts: ['edition'],
      Images: ['photo-grid', 'photo-grid-badges', 'page-images', 'image-regions', 'image-versions'],
      Maps: ['places-map'],
      Search: [
        'search-facets',
        'search-results',
        'pagefind-search',
        'results-toolbar',
        'results-list',
        'date-histogram',
        'date-histogram-decades',
        'combobox',
        'filter-drawer',
        'dialog',
        'list-filter',
        'uvalib-filter-shadow',
        'uvalib-filter-light',
        'uvalib-date-range-shadow',
        'uvalib-date-range-light',
        'uvalib-date-histogram-shadow',
        'uvalib-date-histogram-light',
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

  it('date-histogram-decades: a decade sets the date range, Clear clears the chart, and the page passes axe', async () => {
    const p = presets.find((x) => x.id === 'date-histogram-decades')!;
    const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
    try {
      const doc = iframe.contentDocument!;
      await whenAllDefined(iframe.contentWindow!, [
        'site-page',
        'uvalib-date-range',
        'uvalib-date-histogram',
      ]);
      await new Promise((r) => setTimeout(r, 100));
      type Lit = HTMLElement & { updateComplete: Promise<unknown> };
      const hist = doc.querySelector('#decades') as Lit & { selected: string };
      const range = doc.querySelector('#meeting-dates') as Lit & { value: string[] };
      const buttons = () => [...hist.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.bar')];
      expect(buttons()).to.have.length(22);
      expect(buttons()[0]!.getAttribute('aria-label')).to.match(/^1810s: \d+ meetings$/);
      expect(buttons()[5]!.classList.contains('is-empty')).to.equal(true);
      buttons()[1]!.click();
      await hist.updateComplete;
      await range.updateComplete;
      expect(range.value).to.deep.equal(['1820-01-01', '1829-12-31']);
      doc.querySelector<HTMLButtonElement>('#clear-dates')!.click();
      await range.updateComplete;
      await hist.updateComplete;
      expect(hist.selected).to.equal('');
      expect(buttons().some((b) => b.getAttribute('aria-pressed') === 'true')).to.equal(false);
      await expectNoPageAxeViolations(doc);
      expect(errors).to.deep.equal([]);
    } finally {
      iframe.remove();
    }
  });

  it('search-facets: the Subject group searches, sorts and clears; Format applies; axe passes', async () => {
    const p = presets.find((x) => x.id === 'search-facets')!;
    const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
    try {
      const doc = iframe.contentDocument!;
      await whenAllDefined(iframe.contentWindow!, ['site-page', 'uvalib-filter']);
      await new Promise((r) => setTimeout(r, 100));
      type Lit = HTMLElement & { updateComplete: Promise<unknown>; shadowRoot: ShadowRoot };
      const subjects = doc.querySelector('#subjects') as Lit;
      const formats = doc.querySelector('#formats') as Lit;
      await subjects.updateComplete;
      const s = subjects.shadowRoot;
      const boxes = (r: ShadowRoot) => [
        ...r.querySelectorAll<HTMLInputElement>('input[type=checkbox]'),
      ];
      expect(
        s.querySelector('legend h2 button[part=toggle]')!.getAttribute('aria-expanded'),
      ).to.equal('true');
      expect(s.querySelector('.match')!.textContent!.trim()).to.equal('Matches any selected value');
      expect(boxes(s)).to.have.length(5);
      const input = s.querySelector<HTMLInputElement>('[part=search]')!;
      input.value = 'ecolo';
      input.dispatchEvent(new Event('input'));
      await subjects.updateComplete;
      expect(boxes(s).map((b) => b.value)).to.have.length(5); // Écologie and its four subdivisions
      expect(s.querySelector('.search-status')!.textContent!.trim()).to.equal('5 of 150 subjects');
      expect(s.querySelector('label mark')!.textContent).to.equal('Écolo');
      boxes(s)[0]!.click();
      await subjects.updateComplete;
      input.value = '';
      input.dispatchEvent(new Event('input'));
      s.querySelectorAll<HTMLInputElement>('.sort input')[1]!.click();
      await subjects.updateComplete;
      expect(boxes(s)[0]!.value).to.equal('Agriculture');
      s.querySelector<HTMLButtonElement>('[part=clear]')!.click();
      await subjects.updateComplete;
      expect(boxes(s).some((b) => b.checked)).to.equal(false);
      await formats.updateComplete;
      const f = formats.shadowRoot;
      boxes(f)[0]!.click();
      boxes(f)[2]!.click();
      await formats.updateComplete;
      expect(doc.querySelector('#log')!.textContent).to.not.include('applied');
      const apply = f.querySelector<HTMLButtonElement>('[part=apply]')!;
      expect(apply.textContent!.replace(/\s+/g, ' ').trim()).to.equal('Apply 2 changes to Format');
      apply.click();
      await formats.updateComplete;
      expect(doc.querySelector('#log')!.textContent).to.include('filter-change (applied)');
      expect(doc.querySelector('#log')!.textContent).to.include('"Map"');
      await expectNoPageAxeViolations(doc);
      expect(errors).to.deep.equal([]);
    } finally {
      iframe.remove();
    }
  });

  it('combobox: choosing a person and a subject fills the form, and the page passes axe', async () => {
    const p = presets.find((x) => x.id === 'combobox')!;
    const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
    try {
      const doc = iframe.contentDocument!;
      await whenAllDefined(iframe.contentWindow!, ['site-page', 'uvalib-combobox']);
      await new Promise((r) => setTimeout(r, 100));
      type Box = HTMLElement & { updateComplete: Promise<unknown>; shadowRoot: ShadowRoot };
      const pick = async (id: string, text: string) => {
        const el = doc.querySelector(id) as Box;
        await el.updateComplete;
        const input = el.shadowRoot.querySelector<HTMLInputElement>('[role="combobox"]')!;
        input.focus();
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        await el.updateComplete;
        const options = [...el.shadowRoot.querySelectorAll<HTMLElement>('[role="option"]')];
        expect(options.length, `${id} suggestions`).to.be.greaterThan(0);
        options[0]!.click();
        await el.updateComplete;
        return el;
      };
      await pick('#person', 'nunez');
      await pick('#subject', 'snow');
      doc.querySelector<HTMLButtonElement>('#find button[type="submit"]')!.click();
      expect(doc.querySelector('#sent')!.textContent).to.equal(
        'The form would send person=person-261 and subject=snow.',
      );
      expect(countMain(doc)).to.equal(1);
      await expectNoPageAxeViolations(doc);
      expect(errors).to.deep.equal([]);
    } finally {
      iframe.remove();
    }
  });

  for (const width of [1000, 400]) {
    it(`filter-drawer: a sidebar at 1000px, a modal panel at 400px; filters and the count work, axe passes (${width}px)`, async () => {
      const p = presets.find((x) => x.id === 'filter-drawer')!;
      const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
      iframe.style.width = `${width}px`;
      iframe.style.height = '900px';
      try {
        const doc = iframe.contentDocument!;
        const win = iframe.contentWindow!;
        await whenAllDefined(win, ['site-page', 'uvalib-filter-drawer', 'uvalib-filter']);
        await new Promise((r) => setTimeout(r, 200));
        type Lit = HTMLElement & { updateComplete: Promise<unknown>; shadowRoot: ShadowRoot };
        const drawer = doc.querySelector('uvalib-filter-drawer') as Lit;
        const filter = doc.querySelector('uvalib-filter') as Lit;
        await drawer.updateComplete;
        const toggle = drawer.shadowRoot.querySelector<HTMLButtonElement>('button.fd-toggle')!;
        const dialog = drawer.shadowRoot.querySelector<HTMLDialogElement>('dialog')!;
        expect(toggle.hidden).to.equal(width > 768);
        if (width < 768) {
          toggle.click();
          await drawer.updateComplete;
          expect(dialog.open).to.equal(true);
          expect(drawer.shadowRoot.activeElement?.classList.contains('fd-close')).to.equal(true);
        }
        await filter.updateComplete;
        filter.shadowRoot.querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
        await drawer.updateComplete;
        const count = doc.querySelector('uvalib-results-count') as Lit;
        await count.updateComplete;
        expect(count.shadowRoot.querySelector('.text')!.textContent).to.equal(
          'Showing all 61 meetings',
        );
        if (width < 768) expect(toggle.textContent).to.include('1');
        expect(countMain(doc)).to.equal(1);
        await expectNoPageAxeViolations(doc);
        if (width < 768) {
          drawer.shadowRoot.querySelector<HTMLButtonElement>('button.fd-close')!.click();
          expect(dialog.open).to.equal(false);
        }
        expect(errors).to.deep.equal([]);
      } finally {
        iframe.remove();
      }
    }).timeout(10000);
  }

  it('dialog: search tips and the email form open, validate, close and return focus; axe passes', async () => {
    const p = presets.find((x) => x.id === 'dialog')!;
    const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
    iframe.style.width = '400px';
    iframe.style.height = '800px';
    try {
      const doc = iframe.contentDocument!;
      const win = iframe.contentWindow!;
      await whenAllDefined(win, ['site-page', 'uvalib-dialog']);
      type Dialog = HTMLElement & {
        updateComplete: Promise<unknown>;
        shadowRoot: ShadowRoot;
        open: boolean;
      };
      const tips = doc.querySelector('#search-tips') as Dialog;
      const cite = doc.querySelector('#email-cite') as Dialog;
      await tips.updateComplete;
      await cite.updateComplete;
      const tipsBtn = doc.querySelector<HTMLButtonElement>('[data-uvalib-dialog="search-tips"]')!;
      const citeBtn = doc.querySelector<HTMLButtonElement>('[data-uvalib-dialog="email-cite"]')!;
      tipsBtn.focus();
      tipsBtn.click();
      await tips.updateComplete;
      expect(tips.open).to.equal(true);
      expect(tips.shadowRoot.activeElement?.classList.contains('dlg-heading')).to.equal(true);
      await expectNoPageAxeViolations(doc);
      tips.shadowRoot.querySelector<HTMLButtonElement>('.dlg-close')!.click();
      expect(doc.activeElement === tipsBtn).to.equal(true);
      citeBtn.focus();
      citeBtn.click();
      await cite.updateComplete;
      const email = doc.querySelector<HTMLInputElement>('#cite-email')!;
      expect(doc.activeElement === email).to.equal(true);
      const send = doc.querySelector<HTMLButtonElement>('#cite-form button[value="send"]')!;
      send.click();
      expect(cite.open, 'an empty email keeps it open').to.equal(true);
      expect(doc.querySelector('#cite-errors')!.textContent).to.include('Error:');
      expect(email.getAttribute('aria-invalid')).to.equal('true');
      await expectNoPageAxeViolations(doc);
      email.value = 'ada@virginia.edu';
      send.click();
      await waitUntil(() => !cite.open, 'Send did not close');
      expect(doc.activeElement === citeBtn).to.equal(true);
      expect(doc.querySelector('#sent')!.textContent).to.include('would be sent');
      expect(countMain(doc)).to.equal(1);
      expect(errors).to.deep.equal([]);
    } finally {
      iframe.remove();
    }
  }).timeout(10000);

  it('back-to-top: shown after scrolling, back to the h1, and axe passes', async () => {
    const p = presets.find((x) => x.id === 'back-to-top')!;
    const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
    iframe.style.width = '400px';
    iframe.style.height = '600px';
    try {
      const doc = iframe.contentDocument!;
      const win = iframe.contentWindow!;
      await whenAllDefined(win, ['site-page', 'uvalib-back-to-top']);
      type Lit = HTMLElement & { updateComplete: Promise<unknown>; shadowRoot: ShadowRoot };
      const el = doc.querySelector('uvalib-back-to-top') as Lit;
      await el.updateComplete;
      const button = el.shadowRoot.querySelector<HTMLButtonElement>('button')!;
      const shown = () => win.getComputedStyle(button).visibility === 'visible';
      await new Promise((r) => setTimeout(r, 300));
      expect(shown()).to.equal(false);
      win.scrollTo(0, 1500);
      const end = Date.now() + 2000;
      while (!shown() && Date.now() < end) await new Promise((r) => setTimeout(r, 20));
      expect(shown()).to.equal(true);
      await new Promise((r) => setTimeout(r, 300)); // the 0.2s fade in
      await expectNoPageAxeViolations(doc);
      button.click();
      expect(doc.activeElement === doc.querySelector('h1')).to.equal(true);
      expect(errors).to.deep.equal([]);
    } finally {
      iframe.remove();
    }
  });

  for (const width of [1200, 375]) {
    it(`sidebar-layout: contents ${width > 1000 ? 'beside' : 'above'} the text, nothing scrolls sideways, and axe passes at ${width}px`, async () => {
      const p = presets.find((x) => x.id === 'sidebar-layout')!;
      const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
      iframe.style.width = `${width}px`;
      iframe.style.height = '700px';
      try {
        const doc = iframe.contentDocument!;
        const win = iframe.contentWindow!;
        await whenAllDefined(win, ['site-page', 'uvalib-contents', 'uvalib-pager']);
        await new Promise((r) => setTimeout(r, 150));
        const side = doc.querySelector('.uvalib-sidebar-layout__sidebar')!;
        const main = doc.querySelector('.uvalib-sidebar-layout__main')!;
        const s = side.getBoundingClientRect();
        const m = main.getBoundingClientRect();
        if (width > 1000) {
          expect(m.top).to.equal(s.top);
          expect(m.left).to.be.greaterThan(s.right);
          expect(win.getComputedStyle(side).position).to.equal('sticky');
        } else {
          expect(m.top).to.be.greaterThan(s.bottom);
          expect(win.getComputedStyle(side).position).to.equal('static');
          // A closed Contents button on a phone, so the text comes first.
          expect(side.hasAttribute('data-narrow')).to.equal(true);
        }
        expect(doc.documentElement.scrollWidth).to.be.at.most(win.innerWidth);
        await expectNoPageAxeViolations(doc);
        expect(countMain(doc)).to.equal(1);
        expect(errors).to.deep.equal([]);
      } finally {
        iframe.remove();
      }
    }).timeout(15000);
  }

  for (const width of [1000, 400]) {
    it(`places-map: Leaflet from the (stubbed) CDN draws the markers, linked to the list, and the page passes axe at ${width}px`, async () => {
      const p = presets.find((x) => x.id === 'places-map')!;
      const html = p.files['index.html']!.content;
      // A pinned Leaflet with an integrity hash, before the components' module scripts.
      expect(html).to.include('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
      expect(html.match(/integrity="sha256-/g)).to.have.length(1);
      expect(html.indexOf('leaflet.js')).to.be.lessThan(html.indexOf('uvalib-map.js'));
      const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
      iframe.style.width = `${width}px`;
      iframe.style.height = '1100px';
      try {
        const doc = iframe.contentDocument!;
        await whenAllDefined(iframe.contentWindow!, ['site-page', 'uvalib-map']);
        type Map = HTMLElement & { updateComplete: Promise<unknown>; shadowRoot: ShadowRoot };
        const map = doc.querySelector('#places') as Map;
        await map.updateComplete;
        await new Promise((r) => setTimeout(r, 300));
        const r = map.shadowRoot;
        expect(r.querySelector('[role="region"]')!.getAttribute('aria-label')).to.equal(
          'Places on Grounds, map',
        );
        const markers = [...r.querySelectorAll<HTMLElement>('.uvalib-map-marker .marker')];
        // The Rotunda, its Dome Room and the statue share a point: one group marker, with
        // whichever neighbours would come within 24px of it at the opening zoom.
        expect(markers[0]!.textContent).to.match(
          /^\d+The Rotunda and \d+ more places, [\d,]+ photos$/,
        );
        expect(markers.length).to.be.lessThan(12);
        const places = [...r.querySelectorAll<HTMLElement>('li.place')];
        expect(places).to.have.length(12);
        for (const i of [1, 4]) {
          places[i]!.querySelector('a')!.focus();
          await map.updateComplete;
          const lit = [...r.querySelectorAll('.uvalib-map-marker.is-active')];
          expect(lit).to.have.length(1);
          if (i === 1) expect(lit[0]!.classList.contains('is-group')).to.equal(true);
          places[i]!.querySelector('a')!.blur();
          await map.updateComplete;
        }
        // Every marker is inside the map at the opening view.
        const box = r.querySelector('.map')!.getBoundingClientRect();
        for (const m of markers) {
          const b = m.getBoundingClientRect();
          expect(b.left >= box.left && b.right <= box.right, m.textContent!).to.equal(true);
          expect(b.top >= box.top && b.bottom <= box.bottom, m.textContent!).to.equal(true);
        }
        doc.addEventListener('click', (e) => e.preventDefault());
        markers.find((m) => m.textContent!.startsWith('Scott Stadium'))!.click();
        expect(doc.querySelector('#chosen')!.textContent).to.equal('You chose Scott Stadium.');
        expect(countMain(doc)).to.equal(1);
        await expectNoPageAxeViolations(doc);
        expect(errors).to.deep.equal([]);
      } finally {
        iframe.remove();
      }
    }).timeout(15000);
  }

  it('chip-groups: picking a year fires change, and the page passes axe', async () => {
    const p = presets.find((x) => x.id === 'chip-groups')!;
    const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
    try {
      const doc = iframe.contentDocument!;
      await whenAllDefined(iframe.contentWindow!, ['site-page', 'uvalib-chip-group']);
      await new Promise((r) => setTimeout(r, 100));
      const years = doc.querySelector('#years') as HTMLElement & {
        updateComplete: Promise<unknown>;
        shadowRoot: ShadowRoot;
      };
      const radios = [...years.shadowRoot.querySelectorAll<HTMLInputElement>('input')];
      expect(radios[0]!.checked).to.equal(true);
      radios[2]!.click();
      await years.updateComplete;
      expect(doc.querySelector('#status')!.textContent).to.equal('Showing 2005.');
      const groups = [...doc.querySelectorAll('uvalib-chip-group')].map((g) =>
        g.shadowRoot!.querySelector('.chips')!.getAttribute('role'),
      );
      expect(groups).to.deep.equal(['radiogroup', 'radiogroup', 'group', 'group', 'group']);
      // The colour key: a decorative square on each category chip.
      const key = doc.querySelectorAll('uvalib-chip-group')[3]!.shadowRoot!;
      const swatches = [...key.querySelectorAll<HTMLElement>('.swatch')];
      expect(swatches.map((s) => s.getAttribute('aria-hidden'))).to.deep.equal([
        'true',
        'true',
        'true',
        'true',
      ]);
      expect(getComputedStyle(swatches[0]!).backgroundColor).to.equal('rgb(229, 114, 0)');
      expect(countMain(doc)).to.equal(1);
      await expectNoPageAxeViolations(doc);
      expect(errors).to.deep.equal([]);
    } finally {
      iframe.remove();
    }
  });

  it('contents-sidebar and record-metadata render, follow the hash and pass axe', async () => {
    for (const id of ['contents-sidebar', 'record-metadata']) {
      const p = presets.find((x) => x.id === id)!;
      const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
      iframe.style.width = '1200px';
      iframe.style.height = '800px';
      try {
        const win = iframe.contentWindow!;
        const doc = iframe.contentDocument!;
        const tag = id === 'contents-sidebar' ? 'uvalib-contents' : 'uvalib-metadata';
        await whenAllDefined(win, ['site-page', tag]);
        await new Promise((r) => setTimeout(r, 100));
        const el = doc.querySelector(tag)! as HTMLElement & { updateComplete: Promise<unknown> };
        if (id === 'contents-sidebar') {
          const links = [...el.shadowRoot!.querySelectorAll<HTMLAnchorElement>('nav a')];
          expect(links.map((a) => a.textContent)).to.include('Part II. The Crucifix');
          win.location.hash = 'part-2';
          await new Promise((r) => setTimeout(r, 100));
          await el.updateComplete;
          expect(
            [...el.shadowRoot!.querySelectorAll('a[aria-current]')].map((a) => [
              a.textContent,
              a.getAttribute('aria-current'),
            ]),
          ).to.deep.equal([['Part II. The Crucifix', 'location']]);
        } else {
          const labels = [...el.shadowRoot!.querySelectorAll('dt')].map((d) => d.textContent);
          expect(labels).to.deep.equal([
            'Creator',
            'Organization',
            'Collection',
            'Date',
            'Subjects',
            'Download',
            'Page images',
            'Participants',
            'Rights',
            'How to cite',
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

  it('record-metadata: the long Participants list shows 8 and a Show all 34 button', async () => {
    const p = presets.find((x) => x.id === 'record-metadata')!;
    const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
    try {
      const win = iframe.contentWindow!;
      const doc = iframe.contentDocument!;
      await whenAllDefined(win, ['site-page', 'uvalib-metadata']);
      await new Promise((r) => setTimeout(r, 100));
      const el = doc.querySelector('uvalib-metadata')! as HTMLElement & {
        updateComplete: Promise<unknown>;
      };
      const dd = [...el.shadowRoot!.querySelectorAll('.row')]
        .find((r) => r.querySelector('dt')!.textContent === 'Participants')!
        .querySelector('dd')!;
      const shown = () => [...dd.querySelectorAll('li')].filter((li) => !li.hidden).length;
      expect(shown()).to.equal(8);
      const b = dd.querySelector('button')!;
      expect(b.textContent!.replace(/\s+/g, ' ').trim()).to.equal('Show all 34 participants');
      b.click();
      await el.updateComplete;
      expect(shown()).to.equal(34);
      expect(b.getAttribute('aria-expanded')).to.equal('true');
      await expectNoPageAxeViolations(doc);
      expect(errors).to.deep.equal([]);
    } finally {
      iframe.remove();
    }
  });

  it('citation: four formats, the arrow keys choose, Copy citation, and axe passes', async () => {
    const p = presets.find((x) => x.id === 'citation')!;
    const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
    iframe.style.width = '400px';
    try {
      const win = iframe.contentWindow!;
      const doc = iframe.contentDocument!;
      await whenAllDefined(win, ['site-page', 'uvalib-citation']);
      const el = doc.querySelector('uvalib-citation')! as HTMLElement & {
        updateComplete: Promise<unknown>;
      };
      await el.updateComplete;
      const r = el.shadowRoot!;
      const radios = [...r.querySelectorAll<HTMLInputElement>('input[type=radio]')];
      expect(radios.map((x) => x.closest('label')!.textContent!.trim())).to.deep.equal([
        'MLA',
        'APA',
        'Chicago',
        'Bluebook',
      ]);
      expect(r.querySelector('.citation')!.getAttribute('aria-label')).to.equal('MLA citation');
      radios[3]!.click();
      await el.updateComplete;
      expect(r.querySelector('.citation')!.textContent).to.contain('Thomas Jefferson,');
      expect(r.querySelector('.citation i')!.textContent).to.equal(
        'Notes on the State of Virginia',
      );
      const ris = r.querySelector<HTMLAnchorElement>('a[download]')!;
      expect(ris.textContent!.trim()).to.equal('Download RIS');
      expect(doc.documentElement.scrollWidth).to.be.at.most(400);
      expect(countMain(doc)).to.equal(1);
      await expectNoPageAxeViolations(doc);
      expect(errors).to.deep.equal([]);
    } finally {
      iframe.remove();
    }
  });

  it('list-filter: typing narrows the list, accents ignored, groups hide, and axe passes', async () => {
    const p = presets.find((x) => x.id === 'list-filter')!;
    const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
    iframe.style.width = '400px';
    try {
      const win = iframe.contentWindow!;
      const doc = iframe.contentDocument!;
      await whenAllDefined(win, ['site-page', 'uvalib-list-filter']);
      const [texts, letters] = [...doc.querySelectorAll('uvalib-list-filter')] as (HTMLElement & {
        updateComplete: Promise<unknown>;
      })[];
      await texts!.updateComplete;
      const type = async (el: typeof texts, q: string) => {
        const input = el!.shadowRoot!.querySelector('input')!;
        input.value = q;
        input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        await el!.updateComplete;
      };
      const shown = () => [...doc.querySelectorAll('#doc-list > li:not([hidden])')].length;
      expect(texts!.shadowRoot!.querySelector('.count')!.textContent).to.equal(
        'Showing all 24 texts',
      );
      await type(texts, 'eneide');
      expect(shown()).to.equal(1);
      await type(texts, 'poe raven');
      expect(shown()).to.equal(1);
      await type(texts, 'zzz');
      expect(texts!.shadowRoot!.querySelector('[part="empty"]')!.textContent).to.contain(
        'No texts match',
      );
      await expectNoPageAxeViolations(doc);
      await type(texts, '');
      await type(letters, '1866');
      const groups = [...doc.querySelectorAll<HTMLElement>('#by-decade [data-filter-group]')];
      expect(groups.map((g) => g.hidden)).to.deep.equal([true, false, true]);
      expect(doc.documentElement.scrollWidth).to.be.at.most(400);
      expect(countMain(doc)).to.equal(1);
      expect(errors).to.deep.equal([]);
    } finally {
      iframe.remove();
    }
  });

  it('chip-groups: the sort toggle has a description that describes its radio group', async () => {
    const p = presets.find((x) => x.id === 'chip-groups')!;
    const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
    try {
      await whenAllDefined(iframe.contentWindow!, ['site-page', 'uvalib-chip-group']);
      const sort = iframe.contentDocument!.querySelector('uvalib-chip-group[label="Sort by"]')!;
      const g = sort.shadowRoot!.querySelector('[role="radiogroup"]')!;
      const id = g.getAttribute('aria-describedby')!;
      expect(sort.shadowRoot!.getElementById(id)!.textContent).to.contain('Most photos');
      expect(errors).to.deep.equal([]);
    } finally {
      iframe.remove();
    }
  });

  it('contents-headings builds the contents from the report headings; breadcrumbs-search renders', async function () {
    this.timeout(10000);
    for (const id of ['contents-headings', 'breadcrumbs-search']) {
      const p = presets.find((x) => x.id === id)!;
      const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
      iframe.style.width = '1200px';
      iframe.style.height = '800px';
      try {
        const win = iframe.contentWindow!;
        const doc = iframe.contentDocument!;
        const tag = id === 'contents-headings' ? 'uvalib-contents' : 'uvalib-breadcrumbs';
        await whenAllDefined(win, ['site-page', tag]);
        await new Promise((r) => setTimeout(r, 100));
        const el = doc.querySelector(tag)! as HTMLElement & { updateComplete: Promise<unknown> };
        if (id === 'contents-headings') {
          const top = [...el.shadowRoot!.querySelectorAll('.panel > ol > li > a')];
          expect(top.map((a) => a.getAttribute('href'))).to.deep.equal([
            '#letter-from-the-chair',
            '#the-year-in-numbers',
            '#gifts',
            '#events',
            '#volunteers',
            '#looking-ahead',
            '#appendix-financial-summary',
          ]);
          expect(el.shadowRoot!.querySelectorAll('.panel li li > a').length).to.equal(7);
          expect(doc.getElementById('digital-collections')!.localName).to.equal('h3');
        } else {
          const first = el.shadowRoot!.querySelector('li > a')!;
          expect(first.textContent).to.equal('Search');
          expect(first.getAttribute('href')).to.equal('./');
        }
        expect(countMain(doc)).to.equal(1);
        await expectNoPageAxeViolations(doc);
        expect(errors).to.deep.equal([]);
      } finally {
        iframe.remove();
      }
    }
  });

  it('contents-window shows a window that follows the hash, and the full-contents link', async function () {
    this.timeout(10000);
    const p = presets.find((x) => x.id === 'contents-window')!;
    const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
    iframe.style.width = '1200px';
    iframe.style.height = '800px';
    try {
      const win = iframe.contentWindow!;
      const doc = iframe.contentDocument!;
      await whenAllDefined(win, ['site-page', 'uvalib-contents']);
      await new Promise((r) => setTimeout(r, 100));
      const el = doc.querySelector('uvalib-contents')! as HTMLElement & {
        updateComplete: Promise<unknown>;
      };
      const shown = () =>
        [...el.shadowRoot!.querySelectorAll<HTMLElement>('.panel li > a')]
          .filter((a) => a.getClientRects().length > 0)
          .map((a) => a.textContent);
      expect(shown()).to.deep.equal([
        'Book 1',
        'Chapter 1',
        'Chapter 2',
        'Chapter 3',
        'Chapter 4',
        'Chapter 5',
        'Chapter 6',
      ]);
      const full = el.shadowRoot!.querySelector('.more a')!;
      expect(full.textContent).to.equal('Full contents (243 sections)');
      win.location.hash = 'chapter-15';
      await new Promise((r) => setTimeout(r, 100));
      await el.updateComplete;
      expect(shown()).to.deep.equal([
        'Book 2',
        'Chapter 12',
        'Chapter 13',
        'Chapter 14',
        'Chapter 15',
        'Chapter 16',
        'Chapter 17',
        'Chapter 18',
      ]);
      expect(el.shadowRoot!.querySelector('.visually-hidden')!.textContent).to.equal(
        'Showing 8 of 243 sections.',
      );
      expect(countMain(doc)).to.equal(1);
      await expectNoPageAxeViolations(doc);
      expect(errors).to.deep.equal([]);
    } finally {
      iframe.remove();
    }
  });

  it('a photo grid inside a lightbox opens the viewer, and page links do too', async function () {
    this.timeout(10000);
    for (const id of ['photo-grid', 'page-images'] as const) {
      const p = presets.find((x) => x.id === id)!;
      const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
      try {
        const doc = iframe.contentDocument!;
        const tags =
          id === 'photo-grid'
            ? ['site-page', 'uvalib-lightbox', 'uvalib-photo-grid']
            : ['site-page', 'uvalib-lightbox'];
        await whenAllDefined(iframe.contentWindow!, tags);
        await new Promise((r) => setTimeout(r, 100));
        const box = doc.querySelector('uvalib-lightbox') as HTMLElement & {
          updateComplete: Promise<unknown>;
          shadowRoot: ShadowRoot;
        };
        (
          doc.querySelector(
            id === 'photo-grid' ? 'uvalib-photo-grid a' : 'a.page',
          ) as HTMLAnchorElement
        ).click();
        await box.updateComplete;
        const dialog = box.shadowRoot.querySelector('dialog')!;
        expect(dialog.open, id).to.equal(true);
        expect(dialog.querySelector('.caption')!.textContent).to.equal(
          id === 'photo-grid' ? 'Rotunda, north front in snow, 1914' : 'Page 2',
        );
        expect(countMain(doc)).to.equal(1);
        await expectNoPageAxeViolations(doc);
        expect(errors).to.deep.equal([]);
      } finally {
        iframe.remove();
      }
    }
  });

  it('image versions: the viewer compares the two versions over the photo', async function () {
    this.timeout(10000);
    const p = presets.find((x) => x.id === 'image-versions')!;
    const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
    try {
      const doc = iframe.contentDocument!;
      const win = iframe.contentWindow!;
      await whenAllDefined(win, ['site-page', 'uvalib-lightbox']);
      type Lit = HTMLElement & { updateComplete: Promise<unknown>; shadowRoot: ShadowRoot };
      const box = doc.querySelector('uvalib-lightbox') as Lit;
      const thumb = box.querySelector('img')!;
      expect([thumb.getAttribute('width'), thumb.getAttribute('height')]).to.deep.equal([
        '249',
        '200',
      ]);
      box.querySelector('a')!.addEventListener('click', (e) => e.preventDefault());
      box.querySelector('a')!.click();
      await box.updateComplete;
      const dialog = box.shadowRoot.querySelector('dialog')!;
      expect(dialog.open).to.equal(true);
      await waitUntil(() => dialog.querySelector('.compare'), 'comparison shown', {
        timeout: 5000,
      });
      const range = dialog.querySelector<HTMLInputElement>('.compare input[type="range"]')!;
      expect(dialog.querySelector(`label[for="${range.id}"]`)!.textContent!.trim()).to.equal(
        'Reveal Bitonal',
      );
      const top = dialog.querySelector<HTMLImageElement>('.stack img.top')!;
      expect(top.getAttribute('src')).to.include('/bitonal.jpg');
      await waitUntil(() => top.classList.contains('on'), 'other version drawn', { timeout: 5000 });
      await new Promise((r) => setTimeout(r, 300));
      await expectNoPageAxeViolations(doc);
      box.shadowRoot.querySelector<HTMLButtonElement>('button.close')!.click();
      await box.updateComplete;
      // The detail and its Full plate: a frame, so the plate is drawn around the detail.
      const detail = box.querySelectorAll('a')[1]!;
      expect(detail.querySelector('img')!.getAttribute('width')).to.equal('249');
      detail.addEventListener('click', (e) => e.preventDefault());
      detail.click();
      await box.updateComplete;
      await waitUntil(() => dialog.querySelector('.stack.framed'), 'framed', { timeout: 5000 });
      const stack = dialog.querySelector('.stack')!.getBoundingClientRect();
      const orig = dialog.querySelector('.stack > img:not(.top)')!.getBoundingClientRect();
      expect(Math.abs(stack.width * 0.7 - orig.width)).to.be.below(1.5);
      box.shadowRoot.querySelector<HTMLButtonElement>('button.close')!.click();
      await box.updateComplete;
      // The whole photo, opening on its cropped detail (data-version="1"): the crop at its
      // place inside the original's box.
      const cropped = box.querySelectorAll('a')[2]!;
      expect(cropped.querySelector('img')!.getAttribute('width')).to.equal('249');
      cropped.addEventListener('click', (e) => e.preventDefault());
      cropped.click();
      await box.updateComplete;
      await waitUntil(
        () => dialog.querySelector('.stack.framed:not(.starting) > img.top.on'),
        'opened on the crop',
        { timeout: 5000 },
      );
      expect(dialog.querySelector('.stack > img:not(.top)')!.getAttribute('alt')).to.equal(
        'Lawn games, the right side (Cropped detail)',
      );
      const box3 = dialog.querySelector('.stack')!.getBoundingClientRect();
      const crop = dialog.querySelector('.stack > img.top.on')!.getBoundingClientRect();
      const orig3 = dialog.querySelector('.stack > img:not(.top)')!.getBoundingClientRect();
      expect(Math.abs(box3.width - orig3.width)).to.be.below(1.5);
      expect(Math.abs(crop.width - orig3.width * 0.4)).to.be.below(1.5);
      expect(Math.abs(crop.left - (orig3.left + orig3.width * 0.5))).to.be.below(1.5);
      box.shadowRoot.querySelector<HTMLButtonElement>('button.close')!.click();
      await box.updateComplete;
      expect(errors).to.deep.equal([]);
    } finally {
      iframe.remove();
    }
  });

  it('image regions: outlines over the photo, the list beside it, the page’s buttons, and the viewer', async function () {
    this.timeout(10000);
    const p = presets.find((x) => x.id === 'image-regions')!;
    const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
    try {
      const doc = iframe.contentDocument!;
      const win = iframe.contentWindow!;
      await whenAllDefined(win, ['site-page', 'uvalib-image-regions', 'uvalib-lightbox']);
      await new Promise((r) => setTimeout(r, 100));
      type Lit = HTMLElement & { updateComplete: Promise<unknown>; shadowRoot: ShadowRoot };
      const el = doc.querySelector('uvalib-image-regions') as Lit;
      await el.updateComplete;
      const img = el.querySelector('img')!;
      // The space is reserved from width and height (the stand-in image has its own ratio).
      expect([img.getAttribute('width'), img.getAttribute('height')]).to.deep.equal(['746', '600']);
      expect(img.getBoundingClientRect().height).to.be.greaterThan(0);
      const outlines = [...el.shadowRoot.querySelectorAll<HTMLElement>('.overlay > .region')];
      expect(outlines.length).to.equal(4);
      expect(el.shadowRoot.querySelector('.overlay')!.getAttribute('aria-hidden')).to.equal('true');
      outlines[1]!.click();
      await el.updateComplete;
      expect(doc.activeElement === el.querySelectorAll('li')[1]).to.equal(true);
      expect(doc.querySelector('#said')!.textContent).to.include('Outline 2 chosen');
      el.querySelector<HTMLButtonElement>('button[data-name]')!.click();
      expect(doc.querySelector('#said')!.textContent).to.include('Naming Person 1');
      expect(countMain(doc)).to.equal(1);
      await expectNoPageAxeViolations(doc);
      // The viewer shows the same regions with a toggle.
      const box2 = doc.querySelector('uvalib-lightbox') as Lit;
      doc.querySelector<HTMLAnchorElement>('uvalib-lightbox a')!.click();
      await box2.updateComplete;
      const dialog = box2.shadowRoot.querySelector('dialog')!;
      expect(dialog.open).to.equal(true);
      await new Promise((r) => setTimeout(r, 300));
      const inner = dialog.querySelector('uvalib-image-regions') as Lit;
      await inner.updateComplete;
      expect(inner.shadowRoot.querySelectorAll('.overlay > .region').length).to.equal(4);
      expect(dialog.querySelector('button.regions-toggle')!.getAttribute('aria-pressed')).to.equal(
        'true',
      );
      // The region list is the page's hidden <ol>, lent to the viewer: its buttons are the page's.
      const people = doc.querySelector<HTMLOListElement>('#lawn-people')!;
      expect(people.hidden).to.equal(false);
      expect(people.assignedSlot !== null).to.equal(true);
      people.querySelector<HTMLButtonElement>('button[data-act="Not"]')!.click();
      // The status line is the viewer's details (slot="details"), shown inside the dialog.
      expect(dialog.querySelector('#viewer-said')!.textContent).to.include(
        'Marked as not Person 1',
      );
      await expectNoPageAxeViolations(doc);
      box2.shadowRoot.querySelector<HTMLButtonElement>('button.close')!.click();
      await box2.updateComplete;
      expect(people.hidden).to.equal(true);
      expect(people.parentElement!.localName).to.not.equal('uvalib-lightbox');
      expect(errors).to.deep.equal([]);
    } finally {
      iframe.remove();
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
        // At most 2px: the reserved placeholders and the loaded lists can round to a 2px
        // difference (subpixel line boxes), which is no visible shift. A missing reservation is a
        // whole result list, far more; Lighthouse's CLS <= 0.05 is the real gate.
        expect(Math.abs(loaded - reserved), `${reserved} reserved, ${loaded} loaded`).to.be.at.most(
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

  it('results-toolbar filters, counts, shows the empty state and loading, and passes axe', async () => {
    const p = presets.find((x) => x.id === 'results-toolbar')!;
    const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
    iframe.style.width = '1000px';
    iframe.style.height = '900px';
    try {
      const win = iframe.contentWindow!;
      const doc = iframe.contentDocument!;
      await whenAllDefined(win, ['site-page', 'uvalib-tag-list', 'uvalib-results-count']);
      await new Promise((r) => setTimeout(r, 100));
      const count = doc.querySelector('uvalib-results-count')!;
      const text = () => count.shadowRoot!.querySelector('.text')!.textContent;
      expect(text()).to.equal('Showing all 6 shoots');
      const filter = doc.querySelector<HTMLInputElement>('#filter')!;
      filter.value = 'snow';
      filter.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));
      expect(text()).to.equal('Showing 1 of 6 shoots');
      expect(doc.querySelector<HTMLElement>('#empty')!.hidden).to.equal(true);
      expect(win.getComputedStyle(doc.querySelector('#empty')!).display).to.equal('none');
      filter.value = 'nothing like this';
      filter.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));
      expect(doc.querySelector<HTMLElement>('#empty')!.hidden).to.equal(false);
      expect(win.getComputedStyle(doc.querySelector('#empty')!).display).to.equal('flex');
      expect(text()).to.equal('No shoots');
      await expectNoPageAxeViolations(doc);
      doc.querySelector<HTMLButtonElement>('#clear')!.click();
      await new Promise((r) => setTimeout(r, 50));
      expect(text()).to.equal('Showing all 6 shoots');
      expect(doc.activeElement === filter).to.equal(true);
      doc.querySelector<HTMLButtonElement>('#reload')!.click();
      expect(doc.querySelector('#results')!.getAttribute('aria-busy')).to.equal('true');
      expect(doc.querySelector<HTMLElement>('#loading')!.hidden).to.equal(false);
      await expectNoPageAxeViolations(doc);
      const tags = doc.querySelector('uvalib-tag-list')!;
      expect(tags.shadowRoot!.querySelector('button.toggle')!.textContent).to.include('Show all 8');
      expect(countMain(doc)).to.equal(1);
      expect(errors).to.deep.equal([]);
    } finally {
      iframe.remove();
    }
  }).timeout(15000);

  it('results-list hides rows that do not match, marks the word, and passes axe', async () => {
    const p = presets.find((x) => x.id === 'results-list')!;
    const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
    iframe.style.width = '1000px';
    iframe.style.height = '900px';
    try {
      const win = iframe.contentWindow!;
      const doc = iframe.contentDocument!;
      await whenAllDefined(win, ['site-page', 'uvalib-results-count']);
      await new Promise((r) => setTimeout(r, 100));
      const rows = [...doc.querySelectorAll<HTMLElement>('.uvalib-result')];
      expect(rows.length).to.equal(120);
      expect(doc.querySelectorAll('ul.uvalib-result-list').length).to.equal(10);
      expect(win.getComputedStyle(rows[0]!).contentVisibility).to.equal('auto');
      for (const r of rows.slice(0, 3))
        expect(r.querySelectorAll('.uvalib-result__title a').length).to.equal(1);
      const filter = doc.querySelector<HTMLInputElement>('#filter')!;
      filter.value = 'lights';
      filter.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));
      const shown = rows.filter((r) => win.getComputedStyle(r).display !== 'none');
      expect(shown.length).to.be.greaterThan(0);
      expect(shown.length).to.be.below(120);
      for (const r of shown) {
        const m = r.querySelector('.uvalib-result__snippet mark')!;
        expect(m.textContent!.toLowerCase()).to.equal('lights');
        expect(win.getComputedStyle(m).fontWeight).to.equal('700');
      }
      const count = doc.querySelector('uvalib-results-count')!;
      expect(count.shadowRoot!.querySelector('.text')!.textContent).to.equal(
        `Showing ${shown.length} of 120 reports`,
      );
      await expectNoPageAxeViolations(doc);
      filter.value = 'nothing like this';
      filter.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));
      expect(win.getComputedStyle(doc.querySelector('#empty')!).display).to.equal('flex');
      expect([...doc.querySelectorAll('.year')].every((y) => (y as HTMLElement).hidden)).to.equal(
        true,
      );
      expect(countMain(doc)).to.equal(1);
      expect(errors).to.deep.equal([]);
    } finally {
      iframe.remove();
    }
  }).timeout(15000);

  it('tables: holdings, a striped schedule and a scrolling wide table fit a phone and pass axe', async () => {
    const p = presets.find((x) => x.id === 'tables')!;
    const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
    iframe.style.width = '320px';
    iframe.style.height = '900px';
    try {
      const win = iframe.contentWindow!;
      const doc = iframe.contentDocument!;
      await whenAllDefined(win, ['site-page']);
      await new Promise((r) => setTimeout(r, 100));
      expect(doc.querySelectorAll('table.uvalib-table').length).to.equal(4);
      for (const t of doc.querySelectorAll('table'))
        expect(t.querySelector('caption')!.textContent!.trim()).to.not.equal('');
      // Nothing scrolls the page sideways: the long barcode wraps, the wide table scrolls inside.
      expect(doc.documentElement.scrollWidth).to.be.at.most(win.innerWidth);
      const scroller = doc.querySelector<HTMLElement>('.uvalib-table-scroll')!;
      expect(scroller.scrollWidth).to.be.greaterThan(scroller.clientWidth);
      expect(scroller.tabIndex).to.equal(0);
      await expectNoPageAxeViolations(doc);
      expect(countMain(doc)).to.equal(1);
      expect(errors).to.deep.equal([]);
    } finally {
      iframe.remove();
    }
  }).timeout(15000);

  it('edition: the text fits a phone, the line toggle works, a page image opens, and axe passes', async () => {
    const p = presets.find((x) => x.id === 'edition')!;
    const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
    iframe.style.width = '320px';
    iframe.style.height = '900px';
    try {
      const win = iframe.contentWindow!;
      const doc = iframe.contentDocument!;
      await whenAllDefined(win, ['site-page', 'uvalib-lightbox']);
      await new Promise((r) => setTimeout(r, 100));
      doc.addEventListener('click', (e) => {
        if ((e.target as Element).closest('a')) e.preventDefault();
      });
      expect(win.getComputedStyle(doc.querySelector('br.lb')!).display).to.equal('none');
      doc.querySelector<HTMLInputElement>('.uvalib-edition__lines input')!.click();
      expect(win.getComputedStyle(doc.querySelector('br.lb')!).display).to.equal('inline');
      expect(doc.documentElement.scrollWidth).to.be.at.most(win.innerWidth);
      await expectNoPageAxeViolations(doc);
      const box = doc.querySelector('uvalib-lightbox') as HTMLElement & {
        updateComplete: Promise<unknown>;
      };
      doc.querySelector<HTMLElement>('a.pb-image')!.click();
      await box.updateComplete;
      expect((box.shadowRoot ?? box).querySelector('dialog')!.open).to.equal(true);
      expect(countMain(doc)).to.equal(1);
      expect(errors).to.deep.equal([]);
    } finally {
      iframe.remove();
    }
  }).timeout(15000);

  it('pagefind-search searches the demo index and passes axe', async () => {
    const p = presets.find((x) => x.id === 'pagefind-search')!;
    const { iframe, errors } = await mount(previewSource(withCdnBase(p, '/dist-site/cdn/')));
    try {
      const win = iframe.contentWindow!;
      const doc = iframe.contentDocument!;
      await whenAllDefined(win, ['site-page', 'uvalib-pagefind-search']);
      const el = doc.querySelector('uvalib-pagefind-search') as HTMLElement & {
        ready: Promise<unknown>;
      };
      await el.ready;
      const input = doc.querySelector<HTMLInputElement>('.pagefind-ui__search-input')!;
      expect(input.labels?.[0]?.textContent).to.equal('Search all texts');
      const settled = new Promise((r) => el.addEventListener('search-results', r, { once: true }));
      input.value = 'virginia';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await settled;
      expect(doc.querySelectorAll('.pagefind-ui__results > li').length).to.equal(3);
      expect(doc.querySelector('[role="status"]')!.textContent).to.equal('7 results for virginia');
      await expectNoPageAxeViolations(doc);
      expect(errors).to.deep.equal([]);
    } finally {
      iframe.remove();
    }
  }).timeout(15000);

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
