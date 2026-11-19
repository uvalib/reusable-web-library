import { expect, fixture, nextFrame } from '@open-wc/testing';
import { sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-metadata/uvalib-metadata.js';
import type { UvalibMetadata } from '../src/components/uvalib-metadata/UvalibMetadata.js';
import { rightsName } from '../src/components/uvalib-metadata/rights.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { recordAnalytics } from './helpers/analytics.js';
import { inDarkMode } from './helpers/dark.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const dl = (el: Element) =>
  root(el).querySelector<HTMLElement>(el.shadowRoot ? 'dl' : ':scope > dl')!;
const rows = (el: Element) => [...dl(el).querySelectorAll<HTMLElement>(':scope > .row')];
const text = (n: Element) => n.textContent!.replace(/\s+/g, ' ').trim();
/** A value's text; a list's items joined with " | ". */
const value = (d: Element) =>
  d.querySelector('li') ? [...d.querySelectorAll('li')].map(text).join(' | ') : text(d);
/** Each row as [label, ...value texts]. */
const shown = (el: Element) =>
  rows(el).map((r) => [text(r.querySelector('dt')!), ...[...r.querySelectorAll('dd')].map(value)]);
const row = (el: Element, label: string) =>
  rows(el).find((r) => text(r.querySelector('dt')!) === label)!;

async function settle(el: UvalibMetadata): Promise<void> {
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

/** Replace navigator.clipboard for one test (no permission prompt, nothing really copied). */
function stubClipboard(writeText: (t: string) => Promise<void>): () => void {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  return () => delete (navigator as { clipboard?: unknown }).clipboard;
}

/** A link click would navigate the test page: cancel it once it reaches `document`. */
const cancel = (e: Event) => {
  if (e.composedPath().some((n) => n instanceof HTMLAnchorElement)) e.preventDefault();
};

const RECORD = `<dl>
  <div><dt>Collection</dt><dd><a href="/collections/eaf/">Early American Fiction</a></dd></div>
  <div><dt>Date</dt><dd>1836</dd></div>
  <div><dt>Subjects</dt><dd><ul><li>Short stories</li><li>American literature</li></ul></dd></div>
  <div><dt>Download</dt><dd><ul>
    <li><a id="epub" href="x.epub" download data-size="184 KB">EPUB</a></li>
    <li><a href="x.txt" download="x.txt" data-size="369 KB">Plain text</a></li>
  </ul></dd></div>
  <dt>Page images</dt><dd>Available</dd><dd>From the title page</dd>
</dl>`;

const IN_C = 'http://rightsstatements.org/vocab/InC/1.0/';

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-metadata (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = (children = RECORD, attrs = '') =>
      fixture<UvalibMetadata>(`<uvalib-metadata ${attr} ${attrs}>${children}</uvalib-metadata>`);

    before(() => document.addEventListener('click', cancel));
    after(() => document.removeEventListener('click', cancel));

    it('renders the rows of a <dl> child, with or without row <div>s', async () => {
      const el = await make();
      expect(dl(el).localName).to.equal('dl');
      expect(shown(el)).to.deep.equal([
        ['Collection', 'Early American Fiction'],
        ['Date', '1836'],
        ['Subjects', 'Short stories | American literature'],
        ['Download', 'EPUB · , 184 KB | Plain text · , 369 KB'],
        ['Page images', 'Available', 'From the title page'],
      ]);
      const subjects = row(el, 'Subjects').querySelectorAll('li');
      expect(subjects).to.have.length(2);
    });

    it('does not show the source children themselves', async () => {
      const el = await make();
      const sources = [...el.querySelectorAll('dl')].filter((n) => n !== dl(el));
      expect(sources.length).to.equal(1);
      expect(sources[0]!.offsetParent).to.equal(null);
    });

    it('keeps download attributes and shows sizes, read as "EPUB, 184 KB"', async () => {
      const el = await make();
      const [epub, txt] = row(el, 'Download').querySelectorAll('a');
      expect(epub!.getAttribute('download')).to.equal('');
      expect(txt!.getAttribute('download')).to.equal('x.txt');
      expect(epub!.getAttribute('href')).to.equal('x.epub');
      expect(epub!.querySelector('[aria-hidden="true"]')!.textContent).to.equal(' · ');
      const hidden = epub!.querySelector('.visually-hidden')!;
      expect(hidden.textContent).to.equal(', ');
      expect(getComputedStyle(hidden).position).to.equal('absolute');
      // Ids are copied in shadow DOM (their own scope) and dropped in light DOM.
      expect(epub!.id).to.equal(mode === 'shadow' ? 'epub' : '');
      expect(document.querySelectorAll('#epub')).to.have.length(1);
    });

    it('follows child changes', async () => {
      const el = await make();
      const date = [...el.querySelectorAll('dd')].find(
        (d) => !dl(el).contains(d) && d.textContent === '1836',
      )!;
      date.textContent = '1837';
      await settle(el);
      expect(shown(el)[1]).to.deep.equal(['Date', '1837']);
      date.closest('div')!.remove();
      await settle(el);
      expect(shown(el).map((r) => r[0])).to.not.include('Date');
    });

    it('lays label and value side by side when wide, stacked when narrow', async () => {
      const wrap = await fixture<HTMLDivElement>(
        `<div style="width: 800px"><uvalib-metadata ${attr}>${RECORD}</uvalib-metadata></div>`,
      );
      const el = wrap.firstElementChild as UvalibMetadata;
      await settle(el);
      const [dt, dd] = [rows(el)[1]!.querySelector('dt')!, rows(el)[1]!.querySelector('dd')!];
      expect(dd.getBoundingClientRect().left).to.be.greaterThan(dt.getBoundingClientRect().right);
      expect(Math.abs(dd.getBoundingClientRect().top - dt.getBoundingClientRect().top)).to.be.below(
        2,
      );
      wrap.style.width = '300px';
      await nextFrame();
      expect(dd.getBoundingClientRect().top).to.be.at.least(dt.getBoundingClientRect().bottom - 1);
      expect(
        Math.abs(dd.getBoundingClientRect().left - dt.getBoundingClientRect().left),
      ).to.be.below(2);
    });

    it('takes items from JS: text, links, downloads and lists', async () => {
      const el = await make();
      el.items = [
        { label: 'Date', value: 1836 },
        { label: 'Collection', value: { label: 'EAF', href: '/c/eaf' } },
        { label: 'Subjects', value: ['Short stories', 'Fiction'] },
        {
          label: 'Download',
          value: [
            { label: 'EPUB', href: 'x.epub', size: '184 KB', download: true },
            { label: 'TEI XML', href: 'x.xml', download: 'x.xml' },
          ],
        },
        { label: ' ', value: 'skipped' },
      ];
      let warns: string[] = [];
      warns = await warnings(() => settle(el));
      expect(shown(el)).to.deep.equal([
        ['Date', '1836'],
        ['Collection', 'EAF'],
        ['Subjects', 'Short stories | Fiction'],
        ['Download', 'EPUB · , 184 KB | TEI XML'],
      ]);
      expect(warns).to.have.length(1);
      const [epub, xml] = row(el, 'Download').querySelectorAll('a');
      expect(epub!.getAttribute('download')).to.equal('');
      expect(xml!.getAttribute('download')).to.equal('x.xml');
      expect(row(el, 'Subjects').querySelector('ul')!.getAttribute('role')).to.equal('list');
      el.items = undefined;
      await settle(el);
      expect(shown(el)).to.have.length(5);
    });

    it('shows unsafe links in items as text, with one warning', async () => {
      const el = await make('');
      const warns = await warnings(async () => {
        el.items = [
          { label: 'A', value: { label: 'Bad', href: 'javascript:alert(1)' } },
          { label: 'B', value: { label: 'Data', href: 'data:text/html,x' } },
        ];
        await settle(el);
      });
      expect(dl(el).querySelectorAll('a')).to.have.length(0);
      expect(shown(el)).to.deep.equal([
        ['A', 'Bad'],
        ['B', 'Data'],
      ]);
      expect(warns).to.have.length(1);
    });

    it('adds the credit and rights rows: creator and organization first, rights and citation last', async () => {
      const el = await make(
        '<dl><dt>Date</dt><dd>1836</dd></dl>',
        `creator="Smith, Richard Penn" organization="Albert and Shirley Small Special Collections Library" rights="${IN_C}" rights-info="https://www.library.virginia.edu/policies/use-of-materials" citation-title="The actress of Padua"`,
      );
      expect(rows(el).map((r) => text(r.querySelector('dt')!))).to.deep.equal([
        'Creator',
        'Organization',
        'Date',
        'Rights',
        'How to cite',
      ]);
      const [statement, more] = row(el, 'Rights').querySelectorAll('a');
      expect(statement!.textContent).to.equal('In Copyright');
      expect(statement!.getAttribute('href')).to.equal(IN_C);
      expect(statement!.getAttribute('rel')).to.equal('license');
      expect(more!.textContent).to.equal('More about rights and permissions');
      expect(text(row(el, 'How to cite').querySelector('.citation')!)).to.equal(
        'The actress of Padua, Albert and Shirley Small Special Collections Library, University of Virginia',
      );
      el.citation = 'Smith, The actress of Padua (1836).';
      el.rights = 'Public domain';
      await settle(el);
      expect(text(row(el, 'How to cite').querySelector('.citation')!)).to.equal(
        'Smith, The actress of Padua (1836).',
      );
      expect(text(row(el, 'Rights').querySelector('dd')!)).to.equal(
        'Public domain More about rights and permissions',
      );
      el.rights = 'https://example.org/terms';
      await settle(el);
      expect(row(el, 'Rights').querySelector('a')!.textContent).to.equal('Rights statement');
      el.rightsLabel = 'Terms of use';
      await settle(el);
      expect(row(el, 'Rights').querySelector('a')!.textContent).to.equal('Terms of use');
    });

    it('copies the citation, announces "Copied" politely and reports it', async () => {
      const copied: string[] = [];
      const restore = stubClipboard(async (t) => void copied.push(t));
      const rec = recordAnalytics();
      try {
        const el = await make('', 'citation="Cite me."');
        expect(rec.events, 'reported on render').to.deep.equal([]);
        const status = row(el, 'How to cite').querySelector('[role="status"]')!;
        expect(status.textContent!.trim()).to.equal('');
        const button = row(el, 'How to cite').querySelector('button')!;
        expect(text(button)).to.equal('Copy citation');
        button.click();
        await new Promise((r) => setTimeout(r, 20));
        await settle(el);
        expect(copied).to.deep.equal(['Cite me.']);
        expect(status.textContent!.trim()).to.equal('Copied');
        expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
          ['uvalib-metadata', 'copy-citation'],
        ]);
        expect(JSON.stringify(rec.events)).to.not.include('Cite');
      } finally {
        rec.restore();
        restore();
      }
    });

    it('selects the citation and says so when copying fails', async () => {
      const restore = stubClipboard(() => Promise.reject(new Error('denied')));
      try {
        const el = await make('', 'citation="Cite me."');
        row(el, 'How to cite').querySelector('button')!.click();
        await new Promise((r) => setTimeout(r, 20));
        await settle(el);
        const status = row(el, 'How to cite').querySelector('[role="status"]')!;
        expect(status.textContent).to.contain('Could not copy');
        expect(document.getSelection()!.toString()).to.equal('Cite me.');
        document.getSelection()!.removeAllRanges();
      } finally {
        restore();
      }
    });

    it('has a 44px Copy citation button with a visible focus ring', async () => {
      const el = await make('', 'citation="Cite me."');
      (document.activeElement as HTMLElement | null)?.blur();
      await sendKeys({ press: 'Tab' });
      const b = row(el, 'How to cite').querySelector('button')!;
      expect(b.matches(':focus-visible')).to.equal(true);
      expect(getComputedStyle(b).outlineWidth).to.equal('3px');
      expect(b.getBoundingClientRect().height).to.be.at.least(44);
    });

    it('passes axe', async () => {
      const el = await make(
        RECORD,
        `creator="Smith" rights="${IN_C}" rights-info="/policies" citation="Cite me."`,
      );
      await expectNoAxeViolations(el);
    });

    it('passes axe in dark mode', async () => {
      await inDarkMode(async () => {
        const el = await make(RECORD, `rights="${IN_C}" citation="Cite me."`);
        expect(getComputedStyle(dl(el).querySelector('a')!).color).to.equal('rgb(145, 216, 242)');
        await expectNoAxeViolations(el);
      });
    });

    it('reflows at 320px with no horizontal scroll', async () => {
      await setViewport({ width: 320, height: 640 });
      try {
        await make(
          RECORD,
          'citation="Supercalifragilisticexpialidocious-and-a-very-long-citation-with-no-spaces"',
        );
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
    });

    it('shows unsafe links in the <dl> as text, with one warning', async () => {
      let el!: UvalibMetadata;
      const warns = await warnings(async () => {
        el = await make(
          '<dl><dt>Site</dt><dd><a href="javascript:alert(1)">Link</a> and <a href="data:text/html,x"><em>data</em></a></dd><dd><a href="https://example.edu/ok">OK</a></dd></dl>',
        );
      });
      const links = [...dl(el).querySelectorAll('a')];
      expect(links.map((a) => a.getAttribute('href'))).to.deep.equal(['https://example.edu/ok']);
      expect(shown(el)).to.deep.equal([['Site', 'Link and data', 'OK']]);
      expect(dl(el).querySelector('em')!.textContent).to.equal('data');
      expect(warns.filter((w) => w.includes('href'))).to.have.length(1);
    });

    it('adds a size once, never twice, and keeps copies apart from re-renders', async () => {
      const el = await make(
        '<dl><dt>Download</dt><dd><a href="x.epub" download data-size="184 KB">EPUB</a></dd><dd><a href="y.txt" download data-size="9 KB">Plain text · 9 KB</a></dd></dl>',
      );
      const sizes = () =>
        [...row(el, 'Download').querySelectorAll('a')].map((a) => [
          a.textContent,
          a.hasAttribute('data-size'),
        ]);
      const expected = [
        ['EPUB · , 184 KB', false],
        ['Plain text · 9 KB', false],
      ];
      expect(sizes()).to.deep.equal(expected);
      // An unrelated update keeps the very same nodes (focus inside a value is kept).
      const before = row(el, 'Download').querySelector('a')!;
      el.creator = 'Smith';
      await settle(el);
      expect(row(el, 'Download').querySelector('a')).to.equal(before);
      expect(sizes()).to.deep.equal(expected);
      // Away to items and back: fresh copies, still one size each.
      el.items = [{ label: 'Date', value: '1836' }];
      await settle(el);
      el.items = undefined;
      await settle(el);
      expect(row(el, 'Download').querySelector('a')).to.not.equal(before);
      expect(sizes()).to.deep.equal(expected);
      // A change to the source re-reads it once.
      const source = [...el.querySelectorAll('a')].find((a) => !dl(el).contains(a))!;
      source.textContent = 'EPUB 3';
      await settle(el);
      expect(sizes()[0]).to.deep.equal(['EPUB 3 · , 184 KB', false]);
    });

    it('keeps lang and dir from the source <dt> and <dd>', async () => {
      const el = await make(
        '<dl><dt lang="fr">Titre</dt><dd lang="fr" dir="ltr">L&#39;actrice</dd><dd dir="rtl" lang="ar">الممثلة</dd><dt>Date</dt><dd>1836</dd></dl>',
      );
      const r = row(el, 'Titre');
      expect(r.querySelector('dt')!.getAttribute('lang')).to.equal('fr');
      expect([...r.querySelectorAll('dd')].map((d) => [d.lang, d.dir])).to.deep.equal([
        ['fr', 'ltr'],
        ['ar', 'rtl'],
      ]);
      const d = row(el, 'Date');
      expect(d.querySelector('dt')!.hasAttribute('lang')).to.equal(false);
      expect(d.querySelector('dd')!.hasAttribute('dir')).to.equal(false);
    });

    it('keeps only the structural rules with no-style', async () => {
      const el = await make(RECORD, 'no-style');
      const ul = row(el, 'Subjects').querySelector('ul')!;
      expect(getComputedStyle(ul).listStyleType).to.equal('none');
      expect(getComputedStyle(dl(el).querySelector('dd')!).marginLeft).to.equal('0px');
      if (mode === 'shadow')
        expect(getComputedStyle(dl(el).querySelector('a')!).color).to.not.equal('rgb(0, 86, 121)');
    });
  });
}

describe('rightsName', () => {
  it('names rightsstatements.org statements and Creative Commons licences and tools', () => {
    expect(rightsName('http://rightsstatements.org/vocab/InC/1.0/')).to.equal('In Copyright');
    expect(rightsName('https://rightsstatements.org/page/NoC-US/1.0/?language=en')).to.equal(
      'No Copyright – United States',
    );
    expect(rightsName('http://rightsstatements.org/vocab/InC-EDU/1.0/')).to.equal(
      'In Copyright – Educational Use Permitted',
    );
    expect(rightsName('https://creativecommons.org/licenses/by/4.0/')).to.equal('CC BY 4.0');
    expect(rightsName('https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en')).to.equal(
      'CC BY-NC-SA 4.0',
    );
    expect(rightsName('https://creativecommons.org/publicdomain/zero/1.0/')).to.equal('CC0 1.0');
    expect(rightsName('https://creativecommons.org/publicdomain/mark/1.0/')).to.equal(
      'Public Domain Mark 1.0',
    );
    expect(rightsName('https://example.org/licenses/by/4.0/')).to.equal(undefined);
    expect(rightsName('http://rightsstatements.org/vocab/Nope/1.0/')).to.equal(undefined);
    expect(rightsName('not a url')).to.equal(undefined);
  });
});
