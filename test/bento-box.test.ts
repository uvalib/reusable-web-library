import { expect, fixture, oneEvent, waitUntil } from '@open-wc/testing';
import { setViewport } from '@web/test-runner-commands';
import '../src/components/bento-box/bento-box.js';
import { define } from '../src/base/define.js';
import { BentoBox, parseBoxes } from '../src/components/bento-box/BentoBox.js';
import type { BentoSection } from '../src/components/bento-box/BentoSection.js';
import { CatalogSection } from '../src/components/bento-box/CatalogSection.js';
import { bentoEndpoints, bentoTiming } from '../src/components/bento-box/bento-data.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { recordFetches } from './helpers/hours.js';
import { resetBento, useBentoHost } from './helpers/bento.js';

type Section = BentoSection<unknown>;

const MODES = {
  shadow: '',
  'shadow no-style': 'no-style',
  // Before plain light mode: once the styled rules are in the document they also apply here.
  'light no-style': 'no-shadow-dom no-style',
  light: 'no-shadow-dom',
} as const;

const TAGS = ['catalog-section', 'articles-section', 'libguides-section', 'website-section'];

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const text = (n: Node | null | undefined) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
const sections = (box: BentoBox) => [
  ...root(box).querySelectorAll<Section>('.bs-results-container > .bs-results--block'),
];
const section = (box: BentoBox, tag: string) =>
  root(box).querySelector<Section>(`.bs-results-container > ${tag}`)!;
const entries = (s: Element) => [
  ...root(s).querySelectorAll<HTMLElement>(
    'ol.bs-results--list > li:not(.bs-results--placeholder)',
  ),
];
const placeholders = (s: Element) => [
  ...root(s).querySelectorAll<HTMLElement>('ol.bs-results--list > li.bs-results--placeholder'),
];
const message = (s: Element) => root(s).querySelector<HTMLElement>('.bs-results--message');
const status = (box: BentoBox) => root(box).querySelector<HTMLElement>('[role=status]')!;

/**
 * The text assistive technology reads for `node`: its text without aria-hidden subtrees,
 * with a space between elements.
 */
function spoken(node: Node): string {
  const parts: string[] = [];
  const walk = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) parts.push((n as Text).data);
    else if (n instanceof Element && n.getAttribute('aria-hidden') !== 'true') {
      parts.push(' ');
      n.childNodes.forEach(walk);
      parts.push(' ');
    }
  };
  node.childNodes.forEach(walk);
  return parts.join('').replace(/\s+/g, ' ').trim();
}

async function settled(box: BentoBox) {
  await box.updateComplete;
  await waitUntil(
    () => sections(box).every((s) => s.state !== 'loading'),
    `still loading: ${sections(box)
      .filter((s) => s.state === 'loading')
      .map((s) => s.localName)}`,
    { timeout: 4000 },
  );
  for (const s of sections(box)) await s.updateComplete;
  await box.updateComplete;
}

async function make(attrs: string, { wait = true } = {}): Promise<BentoBox> {
  const box = await fixture<BentoBox>(`<bento-box ${attrs}></bento-box>`);
  if (wait) await settled(box);
  return box;
}

const START = location.href;
/** Put `search` (`?q=…`) in the page URL, keeping the runner's own parameters. */
function setUrl(params: Record<string, string>) {
  const url = new URL(START);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  history.replaceState(null, '', url);
}

/** Hold back fetches whose request body includes `marker` until release(). */
function holdBodies(marker: string) {
  const original = window.fetch;
  const held: (() => void)[] = [];
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await original.call(window, input, init);
    const url = input instanceof Request ? input.url : String(input);
    if (String(init?.body ?? '').includes(marker) || decodeURIComponent(url).includes(marker))
      await new Promise<void>((r) => held.push(r));
    return response;
  };
  return {
    get count() {
      return held.length;
    },
    release: () => held.splice(0).forEach((r) => r()),
    restore: () => (window.fetch = original),
  };
}

describe('bento-box', () => {
  beforeEach(resetBento);
  afterEach(() => history.replaceState(null, '', START));
  after(resetBento);

  describe('query flow', () => {
    it('with no query shows only the search bar and intro, and fetches nothing', async () => {
      const rec = recordFetches();
      try {
        const box = await make('', { wait: false });
        await new Promise((r) => setTimeout(r, 100));
        expect(rec.urls).to.deep.equal([]);
        expect(root(box).querySelector('.bento-search-bar form input')).to.not.equal(null);
        expect(text(root(box).querySelector('.bento-search-bar p'))).to.equal(
          'This page searches Virgo, Virgo articles, subject guides, and the Library website.',
        );
        expect(root(box).querySelector('.bs-header')).to.equal(null);
        expect(root(box).querySelector('.bs-results-container')).to.equal(null);
        expect(sections(box)).to.have.length(0);
      } finally {
        rec.restore();
      }
    });

    it('reads ?q= from the URL, which wins over the query attribute', async () => {
      setUrl({ q: 'test' });
      const box = await make('query="other" limit="3"');
      expect(box.query).to.equal('test');
      expect(text(root(box).querySelector('.bs-header .bs-search-term'))).to.equal('test');
      expect(sections(box).map((s) => s.localName)).to.deep.equal(TAGS);
      expect(sections(box).map((s) => s.state)).to.deep.equal(['ready', 'ready', 'ready', 'ready']);
    });

    it('reads the old ?query= too, and the attribute when the URL has neither', async () => {
      setUrl({ query: 'test' });
      let box = await make('limit="1"');
      expect(box.query).to.equal('test');
      history.replaceState(null, '', START);
      box = await make('query="nothing" limit="1"');
      expect(box.query).to.equal('nothing');
      expect(sections(box).every((s) => s.state === 'empty')).to.equal(true);
    });

    it('pushes ?q= on submit (encoded) and restores the query on Back', async () => {
      const box = await make('limit="1"', { wait: false });
      const rec = recordFetches();
      try {
        const input = root(box).querySelector<HTMLInputElement>('input[name=q]')!;
        input.value = 'a&b #c+d';
        root(box).querySelector<HTMLButtonElement>('button[type=submit]')!.click();
        await settled(box);
        const url = new URL(location.href);
        expect(url.searchParams.get('q')).to.equal('a&b #c+d');
        expect(location.search).to.include('q=a%26b+%23c%2Bd');
        expect(url.searchParams.has('wtr-session-id')).to.equal(true);
        expect(history.state).to.deep.equal({ query: 'a&b #c+d' });
        expect(text(root(box).querySelector('.bs-search-term'))).to.equal('a&b #c+d');
        // Every request carries the query whole.
        const guides = rec.urls.find((u) => u.includes('libguides-proxy'))!;
        expect(new URL(guides).searchParams.get('q')).to.equal('a&b #c+d');
        const website = rec.urls.find((u) => u.includes('/jsonapi/'))!;
        expect(new URL(website, location.href).searchParams.get('filter[fulltext]')).to.equal(
          'a&b #c+d',
        );
        // The see-all forms submit the query whole.
        const form = root(section(box, 'catalog-section')).querySelector('form')!;
        expect(new URLSearchParams(new FormData(form) as never).get('q')).to.equal('a&b #c+d');

        input.value = 'test';
        root(box).querySelector('form')!.requestSubmit();
        await settled(box);
        expect(new URL(location.href).searchParams.get('q')).to.equal('test');

        const pop = oneEvent(window, 'popstate');
        history.back();
        await pop;
        await settled(box);
        expect(box.query).to.equal('a&b #c+d');
        expect(input.value).to.equal('a&b #c+d');
      } finally {
        rec.restore();
      }
    });

    it('drops ?query= when it pushes ?q=, and an empty search clears the results', async () => {
      setUrl({ query: 'test' });
      const box = await make('limit="1"');
      const input = root(box).querySelector<HTMLInputElement>('input[name=q]')!;
      input.value = '  ';
      root(box).querySelector('form')!.requestSubmit();
      await box.updateComplete;
      const url = new URL(location.href);
      expect(url.searchParams.has('query')).to.equal(false);
      expect(url.searchParams.has('q')).to.equal(false);
      expect(sections(box)).to.have.length(0);
    });

    it('listens for popstate with addEventListener, and stops when disconnected', async () => {
      const before = window.onpopstate;
      const box = await make('', { wait: false });
      expect(window.onpopstate).to.equal(before);
      box.remove();
      setUrl({ q: 'test' });
      window.dispatchEvent(new PopStateEvent('popstate'));
      await box.updateComplete;
      expect(box.query).to.equal('');
    });

    it('a slower answer for an older query never wins', async () => {
      const box = await make('limit="3"', { wait: false });
      const hold = holdBodies('keyword: {slow}');
      try {
        box.query = 'slow';
        await box.updateComplete;
        await waitUntil(() => hold.count >= 2, 'slow query not requested');
        box.query = 'test';
        await settled(box);
        const titles = () =>
          entries(section(box, 'catalog-section')).map((e) =>
            text(e.querySelector('.bs-results--title')),
          );
        const now = titles();
        expect(now[0]).to.equal('DB Test 11/7/25');
        hold.release(); // the stale answers land last
        await new Promise((r) => setTimeout(r, 50));
        await settled(box);
        expect(titles()).to.deep.equal(now);
        expect(text(root(box).querySelector('.bs-search-term'))).to.equal('test');
      } finally {
        hold.release();
        hold.restore();
      }
    });

    it('a box moved mid-load loads again instead of showing an error', async () => {
      const box = await make('limit="3"', { wait: false });
      const hold = holdBodies('keyword: {slow}');
      const parent = box.parentElement!;
      try {
        box.query = 'slow';
        await box.updateComplete;
        await waitUntil(() => hold.count >= 2, 'slow query not requested');
        box.remove(); // aborts the loads
        hold.release();
        await new Promise((r) => setTimeout(r, 50));
        hold.restore();
        parent.append(box);
        await settled(box);
        const catalog = section(box, 'catalog-section');
        expect(root(catalog).querySelector('.bs-results--message')?.textContent ?? '').not.to.match(
          /unavailable/,
        );
        expect(entries(catalog)).to.have.length(3);
      } finally {
        hold.release();
        hold.restore();
      }
    });

    it('fetches the guest token once for the whole page', async () => {
      const rec = recordFetches();
      try {
        setUrl({ q: 'test' });
        await make('limit="3"');
        await make('limit="2" boxes="catalog,articles"');
        expect(rec.urls.filter((u) => u.endsWith('/authorize'))).to.have.length(1);
        expect(rec.urls.filter((u) => u.includes('/api/search'))).to.have.length(4);
      } finally {
        rec.restore();
      }
    });
  });

  describe('attributes', () => {
    it('boxes takes a comma list or JSON, in that order', async () => {
      setUrl({ q: 'test' });
      let box = await make('boxes="website, catalog" limit="1"');
      expect(sections(box).map((s) => s.localName)).to.deep.equal([
        'website-section',
        'catalog-section',
      ]);
      box = await make(`boxes='["libguides","articles"]' limit="1"`);
      expect(sections(box).map((s) => s.localName)).to.deep.equal([
        'libguides-section',
        'articles-section',
      ]);
      expect(parseBoxes('nope')).to.deep.equal(['catalog', 'articles', 'libguides', 'website']);
      expect(parseBoxes('[bad json')).to.deep.equal([
        'catalog',
        'articles',
        'libguides',
        'website',
      ]);
      expect(parseBoxes(['catalog', 'catalog', 'mlb'])).to.deep.equal(['catalog']);
    });

    it('has the old defaults and passes limit and no-result-describe to the sections', async () => {
      const box = document.createElement('bento-box') as BentoBox;
      expect(box.limit).to.equal(5);
      expect(box.placeholder).to.equal('Search anything...');
      expect(box.noResultDescribe).to.equal('No results found.');
      setUrl({ q: 'nothing' });
      const el = await make('no-result-describe="Nothing here." limit="2"');
      for (const s of sections(el)) {
        expect(s.limit).to.equal(2);
        expect(text(message(s))).to.equal('Nothing here.');
      }
      expect(root(el).querySelector<HTMLInputElement>('input[name=q]')!.placeholder).to.equal(
        'Search anything...',
      );
    });

    it('headings: h2 then h3 under the page h1, or as heading-level says', async () => {
      setUrl({ q: 'test' });
      const wrap = await fixture<HTMLElement>(
        '<div><h1>Search</h1><bento-box limit="1"></bento-box></div>',
      );
      let box = wrap.querySelector('bento-box') as BentoBox;
      await settled(box);
      expect(root(box).querySelector('.bs-header > *')!.localName).to.equal('h2');
      for (const s of sections(box))
        expect(root(s).querySelector('.bs-results--header > :first-child')!.localName).to.equal(
          'h3',
        );
      box = await make('heading-level="3" limit="1"');
      expect(root(box).querySelector('.bs-header > *')!.localName).to.equal('h3');
      expect(
        root(sections(box)[0]!).querySelector('.bs-results--header > :first-child')!.localName,
      ).to.equal('h4');
      box = await make('limit="1"');
      expect(root(box).querySelector('.bs-header > *')!.localName).to.equal('h2');
    });
  });

  for (const [mode, attrs] of Object.entries(MODES)) {
    describe(mode, () => {
      it('renders the DOM and classes the Drupal theme styles', async () => {
        setUrl({ q: 'test' });
        const box = await make(`limit="3" ${attrs}`);
        const r = root(box);
        // Search bar.
        const bar = r.querySelector('.bento-search-bar')!;
        expect(bar.parentNode).to.equal(r);
        expect(bar.localName).to.equal('bento-search');
        const form = bar.querySelector('form')!;
        expect(form.querySelector('input[name=q]')).to.not.equal(null);
        const submit = form.querySelector<HTMLButtonElement>('button.uvalib-button-home-search')!;
        expect(submit.type).to.equal('submit');
        expect(submit.hasAttribute('aria-label')).to.equal(false);
        expect(spoken(submit)).to.equal('Search');
        const input = form.querySelector<HTMLInputElement>('input')!;
        expect(input.labels![0]!.textContent!.trim()).to.equal('Search');
        expect(bar.querySelector(':scope > p')).to.not.equal(null);
        // Header and grid.
        expect(r.querySelector('.bs-header > h2 > .bs-search-term')).to.not.equal(null);
        expect(r.querySelector('.bs-header > p')!.textContent).to.equal('Here are the results:');
        expect(sections(box)).to.have.length(4);
        for (const s of sections(box)) {
          expect(s.noStyle).to.equal(attrs.includes('no-style'));
          expect(!s.shadowRoot).to.equal(attrs.includes('no-shadow-dom'));
          const sr = root(s);
          const header = sr.querySelector('.bs-results--header')!;
          expect(header.firstElementChild!.localName).to.equal('h3');
          expect(header.querySelector('form > button.uvalib-button[type=submit]')).to.not.equal(
            null,
          );
          const body = sr.querySelector('.bs-results--body')!;
          expect(body.querySelector('ol.bs-results--list')!.getAttribute('aria-busy')).to.equal(
            'false',
          );
          expect(entries(s)).to.have.length(3);
          expect(placeholders(s)).to.have.length(0);
          expect(message(s)).to.equal(null);
        }
        // Catalog and articles entries.
        for (const tag of ['catalog-section', 'articles-section']) {
          for (const e of entries(section(box, tag))) {
            expect(e.matches('li.bs-results--list--entry')).to.equal(true);
            expect(
              e.querySelector(
                ':scope > a.bs-results--title[href^="https://search.lib.virginia.edu/sources/"]',
              ),
            ).to.not.equal(null);
            const ul0 = e.querySelector(':scope > ul.ul-0')!;
            // ul.ul-1 sits in an li (valid markup); "ul.ul-0 ul.ul-1" still matches.
            for (const ul1 of ul0.querySelectorAll('ul.ul-1'))
              expect(ul1.parentElement!.matches('ul.ul-0 > li')).to.equal(true);
            for (const li of e.querySelectorAll('li'))
              expect(li.hasAttribute('aria-label')).to.equal(false);
          }
        }
        const catalog = entries(section(box, 'catalog-section'));
        expect(text(catalog[0]!.querySelector('.bs-results--author'))).to.equal(
          'Author, Example A',
        );
        expect(text(catalog[0]!.querySelector('ul.ul-0 ul.ul-1 .bs-results--date'))).to.equal(
          'Jul 28, 2026',
        );
        expect(text(catalog[0]!.querySelector('.bs-results--format'))).to.equal(
          'Computer Resource/Online/Dataset',
        );
        // Subject guides.
        const guide = entries(section(box, 'libguides-section'))[0]!;
        expect(guide.matches('li.bs-results--list--entry')).to.equal(true);
        expect(text(guide.querySelector(':scope > span.bs-results--title'))).to.equal(
          'Locate test instruments on Special Education',
        );
        const teaser = guide.querySelector(':scope > ul.ul-0 > li.bs-results--teaser')!;
        expect(text(teaser.querySelector('.bs-results--byline'))).to.equal(
          'by Example Librarian | Subjects: Education and Human Development',
        );
        expect(text(teaser.querySelector('mark'))).to.equal('test');
        // Website.
        const page = entries(section(box, 'website-section'))[0]!;
        expect(page.className).to.equal('');
        expect(
          page.querySelector(':scope > .bento-section-title > a')!.getAttribute('href'),
        ).to.equal('https://library.virginia.edu/services/printing-photocopying');
        expect(text(page.querySelector('.bento-section-title'))).to.equal(
          'Printing & Photocopying',
        );
        const desc = page.querySelector(':scope > .bento-section-desc')!;
        expect([...desc.querySelectorAll('mark')].map(text)).to.deep.equal(['Test', 'Test']);
        expect(desc.querySelector('strong')).to.equal(null);
        // No ids but the search bar's own (label and description), unique per element.
        const ids = [...r.querySelectorAll('[id]')].map((n) => n.id);
        expect(ids).to.have.length(2);
        for (const s of sections(box)) expect(root(s).querySelectorAll('[id]')).to.have.length(0);
        const html = box.shadowRoot ? box.shadowRoot.innerHTML : box.innerHTML;
        expect(html).to.not.include('[object Object]');
        expect(html).to.not.include('undefined');
      });

      it('passes axe at every impact level: loaded, empty and failing', async () => {
        setUrl({ q: 'test' });
        await expectNoAxeViolations(await make(`limit="3" ${attrs}`));
        setUrl({ q: 'nothing' });
        await expectNoAxeViolations(await make(`limit="3" ${attrs}`));
        resetBento();
        useBentoHost('bento-fail.test');
        bentoTiming.retries = 1;
        setUrl({ q: 'test' });
        const failing = await make(`limit="3" ${attrs}`);
        expect(sections(failing).every((s) => s.state === 'error')).to.equal(true);
        await expectNoAxeViolations(failing);
      });

      it('keeps the structural CSS (block hosts, hidden placeholders, [hidden], one-cell message)', async () => {
        setUrl({ q: 'test' });
        const box = await make(`limit="2" ${attrs}`);
        expect(getComputedStyle(box).display).to.equal('block');
        const s = section(box, 'catalog-section');
        expect(getComputedStyle(s).display).to.equal('block');
        const ol = root(s).querySelector('ol')!;
        const extra = document.createElement('li');
        extra.className = 'bs-results--list--entry bs-results--placeholder';
        ol.append(extra);
        expect(getComputedStyle(extra).visibility).to.equal('hidden');
        extra.className = '';
        extra.hidden = true;
        expect(getComputedStyle(extra).display).to.equal('none');
        extra.remove();
        expect(getComputedStyle(root(s).querySelector('.bs-results--stack')!).display).to.equal(
          'grid',
        );
        const title = root(s).querySelector('.bs-results--title')!;
        expect(getComputedStyle(title).getPropertyValue('-webkit-line-clamp')).to.equal('2');
        const label = root(box).querySelector('label')!;
        expect(label.getBoundingClientRect().width).to.be.at.most(1);
      });
    });
  }

  describe('sections', () => {
    beforeEach(() => setUrl({ q: 'test' }));

    it('catalog: one entry per group, noting editions, limit results', async () => {
      const box = await make('limit="4" boxes="catalog"');
      const list = entries(section(box, 'catalog-section'));
      expect(list.map((e) => text(e.querySelector('.bs-results--title')))).to.deep.equal([
        'DB Test 11/7/25',
        'Test Anxiety: The State of the Art',
        'Differential Item Functioning',
        'Test Success in the Brain-compatible Classroom (2nd ed.)',
      ]);
      expect(list.map((e) => text(e.querySelector('.bs-results--format')))).to.deep.equal([
        'Computer Resource/Online/Dataset',
        'EBook/Book/Online, 3 editions',
        'Book, 2 editions',
        'Book',
      ]);
      expect(text(list[1]!.querySelector('.bs-results--date'))).to.equal('1998');
      expect(list[1]!.querySelector('time')!.getAttribute('datetime')).to.equal('1998');
    });

    it('articles: the sign-in record keeps its link, with a neutral title', async () => {
      const box = await make('limit="3" boxes="articles"');
      const [first] = entries(section(box, 'articles-section'));
      const a = first!.querySelector<HTMLAnchorElement>('a.bs-results--title')!;
      expect(text(a)).to.equal('Article details available after signing in to Virgo');
      expect(a.href).to.equal(
        'https://search.lib.virginia.edu/sources/articles/items/ccm_197059126',
      );
      expect(first!.querySelector('.bs-results--author')!.getAttribute('aria-hidden')).to.equal(
        'true',
      );
      expect(spoken(first!)).to.equal(
        'Article details available after signing in to Virgo Academic Journal',
      );
      expect(text(first!.querySelector('.bs-results--format'))).to.equal('Academic Journal');
      // Same classes as the other entries.
      expect(first!.className).to.equal('bs-results--list--entry');
      expect(
        text(root(section(box, 'articles-section')).querySelector('.bs-results--qty')),
      ).to.equal('17,262,260');
    });

    it('"See all" names its section and keeps the count', async () => {
      const box = await make('limit="3"');
      const names = sections(box).map((s) =>
        spoken(root(s).querySelector('.bs-results--header button')!),
      );
      expect(names).to.deep.equal([
        'See all 138,420 results in Virgo catalog',
        'See all 17,262,260 results in Virgo articles',
        'See all results in subject guides',
        'See all 16 results in Library website',
      ]);
      const visible = (b: Element) =>
        [...b.childNodes]
          .filter(
            (n) =>
              n.nodeType === Node.TEXT_NODE ||
              (n instanceof Element && !n.classList.contains('visually-hidden')),
          )
          .map((n) => n.textContent)
          .join('')
          .replace(/\s+/g, ' ')
          .trim();
      expect(
        visible(root(sections(box)[0]!).querySelector('.bs-results--header button')!),
      ).to.equal('See all 138,420 results');
      const forms = sections(box).map((s) => {
        const f = root(s).querySelector<HTMLFormElement>('.bs-results--header form')!;
        return `${f.action}?${new URLSearchParams(new FormData(f) as never)}`;
      });
      expect(forms).to.deep.equal([
        'https://search.lib.virginia.edu/?q=test&pool=uva_library',
        'https://search.lib.virginia.edu/?q=keyword%3A+%7Btest%7D&pool=articles',
        'https://guides.lib.virginia.edu/srch.php?default_lg=1&q=test',
        'https://library.virginia.edu/search/content?search_api_fulltext=test',
      ]);
    });

    it('renders <script>, onerror and javascript: from the sources as text only', async () => {
      setUrl({ q: 'xss' });
      const box = await make('limit="3" no-shadow-dom no-style');
      await new Promise((r) => setTimeout(r, 50));
      expect((window as { __bentoXss?: number }).__bentoXss).to.equal(undefined);
      for (const s of sections(box)) {
        expect(s.state).to.equal('ready');
        expect(root(s).querySelector('script, img, [onerror], [onclick], [onmouseover]')).to.equal(
          null,
        );
        for (const a of root(s).querySelectorAll('a[href]'))
          expect(a.getAttribute('href')).to.match(/^https:\/\//);
      }
      const title = text(
        entries(section(box, 'catalog-section'))[0]!.querySelector('.bs-results--title'),
      );
      expect(title).to.include('<img src=x onerror="window.__bentoXss=1">');
      expect(title).to.include('<script>');
      const web = entries(section(box, 'website-section'))[0]!;
      expect(text(web.querySelector('.bento-section-title'))).to.include('<script>');
      expect(text(web.querySelector('.bento-section-desc mark'))).to.equal('match');
      const guide = entries(section(box, 'libguides-section'))[0]!;
      expect(text(guide.querySelector('.bs-results--title a'))).to.include('Locate <b>test</b>');
      // The guide link was javascript:, so it is dropped (its text with it).
      expect(guide.querySelector('.bs-results--guide')).to.equal(null);
    });
  });

  describe('states', () => {
    beforeEach(() => setUrl({ q: 'test' }));

    it('starts loading; state is read-only', () => {
      const el = document.createElement('catalog-section') as CatalogSection;
      expect(el.state).to.equal('loading');
      expect(() => ((el as unknown as { state: string }).state = 'ready')).to.throw();
    });

    it('while loading: limit invisible placeholders, aria-busy, and no "No results found."', async () => {
      const hold = holdBodies('keyword: {test}');
      try {
        const box = await make('limit="4" boxes="catalog,articles"', { wait: false });
        await waitUntil(() => hold.count === 2, 'not requested');
        await box.updateComplete;
        for (const s of sections(box)) {
          await s.updateComplete;
          expect(s.state).to.equal('loading');
          expect(placeholders(s)).to.have.length(4);
          expect(root(s).querySelector('ol')!.getAttribute('aria-busy')).to.equal('true');
          expect(message(s)).to.equal(null);
          expect(text(root(s))).to.not.include('No results found.');
          for (const p of placeholders(s)) {
            expect(p.getAttribute('aria-hidden')).to.equal('true');
            expect(getComputedStyle(p).visibility).to.equal('hidden');
            expect(p.querySelector('[href], [tabindex], button')).to.equal(null);
            expect(p.querySelector(':scope > .bs-results--title + ul.ul-0')).to.not.equal(null);
          }
        }
        expect(text(status(box))).to.equal('');
        await expectNoAxeViolations(box);
        hold.release();
        await settled(box);
        expect(text(status(box))).to.equal('Results updated.');
        for (const s of sections(box)) expect(placeholders(s)).to.have.length(0);
      } finally {
        hold.release();
        hold.restore();
      }
    });

    it('collapses when fewer results than limit come back', async () => {
      const box = await make('limit="10"');
      expect(entries(section(box, 'catalog-section'))).to.have.length(4);
      expect(entries(section(box, 'website-section'))).to.have.length(3);
      for (const s of sections(box)) expect(placeholders(s)).to.have.length(0);
    });

    it('empty: says so, keeps one entry height, and links to the source', async () => {
      setUrl({ q: 'nothing' });
      const box = await make('limit="3"');
      for (const s of sections(box)) {
        expect(s.state).to.equal('empty');
        expect(text(message(s))).to.equal('No results found.');
        expect(placeholders(s)).to.have.length(1);
        expect(root(s).querySelector('.bs-results--header form')).to.equal(null);
        expect(root(s).querySelector('.bs-results--header a.uvalib-button')).to.not.equal(null);
      }
      expect(
        text(root(section(box, 'catalog-section')).querySelector('.bs-results--header a')),
      ).to.equal('Search Virgo');
      expect(text(status(box))).to.equal('Results updated.');
    });

    for (const mode of ['', 'no-shadow-dom no-style']) {
      it(`error: a calm message and Retry, which keeps focus (${mode || 'shadow'})`, async () => {
        useBentoHost('bento-fail.test', ['catalog']);
        bentoTiming.retries = 1;
        const box = await make(`limit="3" ${mode}`);
        const s = section(box, 'catalog-section');
        expect(s.state).to.equal('error');
        expect(sections(box).filter((x) => x.state === 'ready')).to.have.length(3);
        expect(spoken(message(s)!)).to.equal(
          'Virgo catalog results are unavailable right now. Retry Virgo catalog',
        );
        expect(placeholders(s)).to.have.length(1);
        expect(text(status(box))).to.equal('Results updated. Some results are unavailable.');
        const button = message(s)!.querySelector<HTMLButtonElement>('button.uvalib-button')!;
        expect(button.type).to.equal('button');
        bentoEndpoints.catalog =
          'https://pool-solr-ws-uva-library.internal.lib.virginia.edu/api/search';
        button.focus();
        button.click();
        await settled(box);
        expect(s.state).to.equal('ready');
        const active = s.shadowRoot ? s.shadowRoot.activeElement : document.activeElement;
        expect(active === entries(s)[0]!.querySelector('a'), 'focus on the first result').to.equal(
          true,
        );
        expect(text(status(box))).to.equal('Results updated.');
      });
    }

    it('keeps Retry, disabled, while retrying, and focus on it when the retry fails', async () => {
      useBentoHost('bento-fail.test', ['catalog']);
      bentoTiming.retries = 1;
      const box = await make('limit="3" boxes="catalog"');
      const s = section(box, 'catalog-section');
      bentoTiming.timeout = 200;
      useBentoHost('bento-hang.test', ['catalog']);
      const button = message(s)!.querySelector('button')!;
      button.focus();
      button.click();
      await s.updateComplete;
      const now = message(s)!.querySelector('button')!;
      expect(now === button, 'the same button').to.equal(true);
      expect(button.getAttribute('aria-disabled')).to.equal('true');
      expect(text(button)).to.include('Retrying…');
      button.click(); // ignored
      await settled(box);
      expect(s.state).to.equal('error');
      const active = s.shadowRoot!.activeElement;
      expect(active === message(s)!.querySelector('button'), 'focus on Retry').to.equal(true);
    });

    it('a hung source times out into the error state', async () => {
      bentoTiming.timeout = 100;
      bentoTiming.retries = 1;
      useBentoHost('bento-hang.test', ['guides']);
      const box = await make('limit="2"');
      expect(section(box, 'libguides-section').state).to.equal('error');
    });
  });

  describe('layout stability', () => {
    /**
     * Enough of the Drupal theme (uvalib-drupal-theme scss/pages/specialty-pages/
     * _bento-search.scss under .uvalib-bento-search, and its base heading and paragraph
     * spacing) to lay out light no-style sections as library.virginia.edu does.
     */
    const DRUPAL_CSS = `
      html { font-size: 17px; line-height: 1.5; }
      h1, h2, h3 { margin-top: 3rem; margin-bottom: 1rem; }
      h4, h5 { margin-top: 1rem; margin-bottom: 0.5rem; }
      p { padding-block-end: 1rem; margin: 0; }
      .uvalib-bento-search ul, .uvalib-bento-search li { margin-left: 0; padding-left: 0; }
      .uvalib-bento-search .bs-results-container { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
      .uvalib-bento-search .bs-results--block { border: 1px solid #dadada; border-top: none; overflow: auto; }
      .uvalib-bento-search .bs-results--header { display: flex; justify-content: space-between; align-items: center; background: #dadada; padding: 0.5rem 1rem; }
      .uvalib-bento-search .bs-results--header h3 { font-size: 1.2rem; margin: 1rem 0 0.5rem; text-transform: uppercase; }
      .uvalib-bento-search .bs-results--body { padding: 1rem; }
      .uvalib-bento-search ol.bs-results--list { margin-bottom: 1rem; padding-left: 1rem; }
      .uvalib-bento-search .bs-results--list--entry { border-bottom: 1px solid #dadada; margin-bottom: 1rem; padding-bottom: 1rem; }
      .uvalib-bento-search .bs-results--list--entry:last-child { border-bottom: none; }
      .uvalib-bento-search .bs-results--title { font-weight: 700; }
      .uvalib-bento-search ul.ul-0 li { list-style-type: none; margin-bottom: 0 !important; }
      .uvalib-bento-search ul.ul-0 ul.ul-1 { display: flex; justify-content: space-between; }
      .uvalib-bento-search ul.ul-0 .bs-results--teaser { padding: 0.5rem 0; }
      .uvalib-button { display: inline-block; padding: 0.5rem 1rem; border: 1px solid; }
      @media (max-width: 992px) {
        .uvalib-bento-search .bs-results-container { grid-template-columns: 1fr !important; }
        .uvalib-bento-search .bs-results--header { flex-direction: column; }
        .uvalib-bento-search .bs-results--list--entry ul.ul-1 { flex-direction: column; }
      }`;

    /** Each section's height with its placeholders (requests held), then loaded. */
    async function heights(attrs: string, { css = '', width = 0, viewport = 1280 } = {}) {
      resetBento();
      setUrl({ q: 'test' });
      const style = document.createElement('style');
      style.textContent = css;
      document.head.append(style);
      if (css) document.body.classList.add('uvalib-bento-search');
      await setViewport({ width: viewport, height: 900 });
      const hold = holdBodies('test');
      try {
        const wrap = await fixture<HTMLElement>(
          `<div style="${width ? `width: ${width}px` : ''}"><bento-box ${attrs}></bento-box></div>`,
        );
        const box = wrap.firstElementChild as BentoBox;
        await waitUntil(() => hold.count === 4, 'not all requested');
        await box.updateComplete;
        for (const s of sections(box)) await s.updateComplete;
        const before = sections(box).map((s) => s.getBoundingClientRect().height);
        const boxBefore = box.getBoundingClientRect().height;
        hold.release();
        await settled(box);
        const after = sections(box).map((s) => s.getBoundingClientRect().height);
        return { box, before, after, boxBefore, boxAfter: box.getBoundingClientRect().height };
      } finally {
        hold.release();
        hold.restore();
        style.remove();
        document.body.classList.remove('uvalib-bento-search');
        await setViewport({ width: 800, height: 600 });
      }
    }

    for (const [name, attrs, opts] of [
      ['styled shadow, 2 columns', 'limit="3"', { width: 1100 }],
      ['styled shadow, 1 column', 'limit="3"', { width: 600 }],
      ['styled light', 'limit="3" no-shadow-dom', { width: 1100 }],
      [
        'Drupal light no-style, 2 columns',
        'limit="3" no-shadow-dom no-style',
        { css: DRUPAL_CSS, width: 1200 },
      ],
      [
        'Drupal light no-style, 1 column',
        'limit="3" no-shadow-dom no-style',
        { css: DRUPAL_CSS, width: 700, viewport: 800 },
      ],
    ] as const) {
      it(`placeholders hold the loaded height (${name})`, async () => {
        const { before, after, boxBefore, boxAfter } = await heights(attrs, opts);
        for (const [i, h] of before.entries())
          expect(Math.abs(after[i]! - h), `${TAGS[i]}: ${h} then ${after[i]}`).to.be.below(2);
        expect(Math.abs(boxAfter - boxBefore), `box: ${boxBefore} then ${boxAfter}`).to.be.below(2);
      });
    }

    it('Drupal: the theme rules reach the sections and the grid has two columns', async () => {
      const { box } = await heights('limit="3" no-shadow-dom no-style', {
        css: DRUPAL_CSS,
        width: 1200,
      });
      // Read while the page CSS is still applied: re-add it.
      const style = document.createElement('style');
      style.textContent = DRUPAL_CSS;
      document.head.append(style);
      document.body.classList.add('uvalib-bento-search');
      await setViewport({ width: 1280, height: 900 });
      try {
        const [a, b] = sections(box);
        expect(a!.getBoundingClientRect().top).to.equal(b!.getBoundingClientRect().top);
        const ul1 = box.querySelector('ul.ul-0 ul.ul-1')!;
        expect(getComputedStyle(ul1).display).to.equal('flex');
        expect(getComputedStyle(ul1.querySelector('li')!).listStyleType).to.equal('none');
        expect(getComputedStyle(box.querySelector('.bs-results--header')!).display).to.equal(
          'flex',
        );
      } finally {
        style.remove();
        document.body.classList.remove('uvalib-bento-search');
        await setViewport({ width: 800, height: 600 });
      }
    });
  });

  it('exposes the shared endpoints as a static accessor that writes through', () => {
    const ctor = customElements.get('bento-box') as unknown as typeof BentoBox;
    expect(ctor).to.equal(BentoBox);
    expect(ctor.endpoints).to.equal(bentoEndpoints);
    ctor.endpoints = { guides: 'https://bento-empty.test/production/library/libguides-proxy' };
    expect(bentoEndpoints.guides).to.equal(
      'https://bento-empty.test/production/library/libguides-proxy',
    );
    expect(bentoEndpoints.catalog).to.include('pool-solr-ws');
  });

  it('defining the tags again is a no-op', () => {
    expect(() => define('bento-box', class extends BentoBox {})).to.not.throw();
    expect(customElements.get('bento-box')).to.equal(BentoBox);
    expect(customElements.get('catalog-section')).to.equal(CatalogSection);
    for (const tag of TAGS) expect(customElements.get(tag)).to.be.a('function');
    for (const dead of [
      'bento-section',
      'libraries-section',
      'people-section',
      'mlb-section',
      'client-search-section',
    ])
      expect(customElements.get(dead), dead).to.equal(undefined);
  });
});
