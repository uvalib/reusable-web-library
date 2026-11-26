// pagefind.css and <uvalib-pagefind-search>, against Pagefind's real default UI and a tiny
// index that test/helpers/pagefind-fixture.mjs builds locally when the test server starts
// (served at /pagefind-demo/; no network). The page is an iframe that links the built
// stylesheets from dist-cdn, as a host page would, and never Pagefind's pagefind-ui.css.
import { expect } from '@open-wc/testing';
import { emulateMedia, sendKeys } from '@web/test-runner-commands';
import { expectNoAxeViolations } from './helpers/axe.js';
import {
  countFromMessage,
  withSlash,
} from '../src/components/uvalib-pagefind-search/UvalibPagefindSearch.js';

const BUNDLE = '/pagefind-demo/';
const PAGE = '/test/fixtures/pagefind/search.html';

type PagefindWindow = Window & {
  PagefindUI?: new (o: Record<string, unknown>) => { triggerSearch(t: string): void };
};

/** sRGB relative luminance and WCAG contrast of two `rgb(…)` strings. */
const lum = (c: string) => {
  const [r, g, b] = c
    .match(/[\d.]+/g)!
    .slice(0, 3)
    .map((v) => {
      const s = Number(v) / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

/** Poll until `fn` returns something truthy (or fail after `ms`). */
async function until<T>(fn: () => T | null | undefined | false, what: string, ms = 6000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = fn();
    if (v) return v;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 30));
  }
}

/**
 * The stock UI's field is named only by its title (no label, and no id to point one at):
 * a gap CSS cannot fix. <uvalib-pagefind-search> adds the label; these stock-UI runs skip
 * that one rule, and a test below checks it is the only gap.
 */
const STOCK_AXE = { disable: ['label-title-only'] };

let iframe: HTMLIFrameElement | undefined;

/** The fixture page in an iframe, `width` wide, optionally in dark mode, with `search` added. */
async function open({
  width = 1000,
  dark = false,
  query = '',
}: { width?: number; dark?: boolean; query?: string } = {}) {
  iframe = document.createElement('iframe');
  iframe.style.cssText = `width: ${width}px; height: 900px; border: 0`;
  iframe.src = PAGE + query;
  document.body.append(iframe);
  await new Promise((r) => iframe!.addEventListener('load', r, { once: true }));
  const doc = iframe.contentDocument!;
  if (dark) doc.documentElement.setAttribute('data-uva-color-scheme', 'dark');
  // A test never follows a result link or submits the form.
  doc.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a')) e.preventDefault();
  });
  doc.addEventListener('submit', (e) => e.preventDefault(), true);
  return { doc, win: iframe.contentWindow as PagefindWindow };
}

/** Load Pagefind's own pagefind-ui.js into the frame and start the stock UI. */
async function stock(doc: Document, win: PagefindWindow, options: Record<string, unknown> = {}) {
  const script = doc.createElement('script');
  script.src = `${BUNDLE}pagefind-ui.js`;
  doc.head.append(script);
  await new Promise((r) => script.addEventListener('load', r, { once: true }));
  return new win.PagefindUI!({
    element: '#search',
    bundlePath: BUNDLE,
    showSubResults: true,
    showImages: false,
    pageSize: 2,
    translations: { placeholder: 'Search all texts' },
    ...options,
  });
}

/** Type into Pagefind's field the way its Svelte binding listens: an input event. */
function type(doc: Document, text: string) {
  const input = doc.querySelector<HTMLInputElement>('.pagefind-ui__search-input')!;
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return input;
}

/** Wait for the results to load: links in the list and the filters drawn. */
const results = (doc: Document, n = 1) =>
  until(
    () =>
      doc.querySelectorAll('.pagefind-ui__results .pagefind-ui__result-link').length >= n &&
      doc.querySelector('.pagefind-ui__filter-checkbox') &&
      !doc.querySelector('.pagefind-ui__loading'),
    'results',
  );

describe('pagefind.css with the stock Pagefind UI', function () {
  this.timeout(20000);
  afterEach(async () => {
    iframe?.remove();
    await emulateMedia({ forcedColors: 'none', colorScheme: 'light' });
  });

  it('looks like the library search: field, filters, titles, marks, tags, Load more', async () => {
    const { doc, win } = await open();
    await stock(doc, win);
    type(doc, 'virginia');
    await results(doc);
    const cs = (sel: string, pseudo?: string) =>
      win.getComputedStyle(doc.querySelector(sel)!, pseudo);
    const box = (sel: string) => doc.querySelector(sel)!.getBoundingClientRect();
    const white = 'rgb(255, 255, 255)';

    // The field: .uvalib-input's border and radius, 17px+ text, a readable placeholder.
    const input = cs('.pagefind-ui__search-input');
    expect(input.borderTopColor).to.equal('rgb(128, 128, 128)');
    expect(input.borderRadius).to.equal('5px');
    expect(parseFloat(input.fontSize)).to.be.at.least(17);
    expect(box('.pagefind-ui__search-input').height).to.be.at.least(44);
    const ph = cs('.pagefind-ui__search-input', '::placeholder');
    expect(ph.opacity).to.equal('1');
    expect(contrast(ph.color, white)).to.be.at.least(7);

    // Clear: a 44px outline button inside the field, AAA text.
    const clear = cs('.pagefind-ui__search-clear');
    expect(clear.visibility).to.equal('visible');
    expect(box('.pagefind-ui__search-clear').height).to.be.at.least(44);
    expect(contrast(clear.color, clear.backgroundColor)).to.be.at.least(7);

    // Filters: bold 44px headings, native 24px checkboxes in 44px rows, "value (count)".
    expect(box('.pagefind-ui__filter-name').height).to.be.at.least(44);
    const checkbox = cs('.pagefind-ui__filter-checkbox');
    expect(checkbox.appearance).to.equal('auto');
    expect(box('.pagefind-ui__filter-checkbox').width).to.equal(24);
    expect(box('.pagefind-ui__filter-value').height).to.be.at.least(44);
    expect(doc.querySelector('.pagefind-ui__filter-label')!.textContent).to.match(/\(\d+\)$/);
    expect(cs('.pagefind-ui__filter-group-label').position).to.equal('absolute');

    // Results: link-coloured, underlined titles; the library's <mark>; tags; Load more.
    const link = cs('.pagefind-ui__result-link');
    expect(link.color).to.equal('rgb(35, 45, 75)');
    expect(link.textDecorationLine).to.equal('underline');
    expect(contrast(link.color, white)).to.be.at.least(7);
    const mark = cs('.pagefind-ui__result-excerpt mark');
    expect(mark.backgroundColor).to.equal('rgb(255, 201, 153)');
    expect(contrast(mark.color, mark.backgroundColor)).to.be.at.least(7);
    const tag = cs('.pagefind-ui__result-tag');
    expect(contrast(tag.color, tag.backgroundColor)).to.be.at.least(7);
    expect(
      cs('.pagefind-ui__result-nested .pagefind-ui__result-link', '::before').content,
    ).to.equal('none');
    const more = cs('.pagefind-ui__button');
    expect(more.backgroundColor).to.equal('rgb(0, 123, 172)');
    expect(more.color).to.equal(white);
    expect(box('.pagefind-ui__button').height).to.be.at.least(44);
    expect(box('.pagefind-ui__button').width).to.be.below(box('.pagefind-ui__results').width);
    expect(contrast(more.color, more.backgroundColor)).to.be.at.least(4.5);

    await expectNoAxeViolations(doc.documentElement, undefined, STOCK_AXE);
  });

  it("has one gap left that needs script: the field's missing label", async () => {
    const { doc, win } = await open();
    await stock(doc, win);
    let error = '';
    await expectNoAxeViolations(doc.documentElement, undefined, {
      rules: ['label-title-only', 'label'],
    }).catch((e: Error) => (error = e.message));
    expect(error).to.match(/label-title-only/);
  });

  it('hides the empty Clear button from the tab order and screen readers', async () => {
    const { doc, win } = await open();
    await stock(doc, win);
    const clear = doc.querySelector<HTMLButtonElement>('.pagefind-ui__search-clear')!;
    expect(clear.classList.contains('pagefind-ui__suppressed')).to.equal(true);
    expect(win.getComputedStyle(clear).visibility).to.equal('hidden');
    clear.focus();
    expect(doc.activeElement).to.not.equal(clear);
  });

  it('shows a 3px library-orange focus ring on the field, filters, links and buttons', async () => {
    const { doc, win } = await open();
    await stock(doc, win);
    type(doc, 'virginia');
    await results(doc);
    const input = doc.querySelector<HTMLInputElement>('.pagefind-ui__search-input')!;
    input.focus();
    // Keyboard focus, so :focus-visible applies to each control in turn.
    for (const sel of [
      '.pagefind-ui__search-clear',
      '.pagefind-ui__filter-name',
      '.pagefind-ui__result-link',
      '.pagefind-ui__button',
    ]) {
      const el = doc.querySelector<HTMLElement>(sel)!;
      for (let i = 0; i < 40 && doc.activeElement !== el; i++) await sendKeys({ press: 'Tab' });
      expect(doc.activeElement, `focus on ${sel}`).to.equal(el);
      const s = win.getComputedStyle(el);
      expect([s.outlineStyle, s.outlineWidth, s.outlineColor], sel).to.deep.equal([
        'solid',
        '3px',
        'rgb(229, 114, 0)',
      ]);
    }
  });

  it('is readable in dark mode (pagefind.css carries the role tokens it reads)', async () => {
    const { doc, win } = await open({ dark: true });
    await stock(doc, win);
    type(doc, 'virginia');
    await results(doc);
    const cs = (sel: string) => win.getComputedStyle(doc.querySelector(sel)!);
    const bg = win.getComputedStyle(doc.body).backgroundColor;
    expect(bg).to.equal('rgb(16, 23, 43)');
    const pairs: [string, string, string, number][] = [
      ['title', cs('.pagefind-ui__result-link').color, bg, 7],
      ['excerpt', cs('.pagefind-ui__result-excerpt').color, bg, 7],
      ['message', cs('.pagefind-ui__message').color, bg, 7],
      ['filter', cs('.pagefind-ui__filter-label').color, bg, 7],
      [
        'field',
        cs('.pagefind-ui__search-input').color,
        cs('.pagefind-ui__search-input').backgroundColor,
        7,
      ],
      [
        'clear',
        cs('.pagefind-ui__search-clear').color,
        cs('.pagefind-ui__search-clear').backgroundColor,
        7,
      ],
      ['mark', cs('mark').color, cs('mark').backgroundColor, 7],
      [
        'tag',
        cs('.pagefind-ui__result-tag').color,
        cs('.pagefind-ui__result-tag').backgroundColor,
        7,
      ],
      ['button', cs('.pagefind-ui__button').color, cs('.pagefind-ui__button').backgroundColor, 7],
    ];
    for (const [name, fg, back, min] of pairs)
      expect(contrast(fg, back), `${name} ${fg} on ${back}`).to.be.at.least(min);
    expect(cs('mark').backgroundColor).to.equal('rgb(133, 66, 0)');
    await expectNoAxeViolations(doc.documentElement, undefined, STOCK_AXE);
  });

  it('keeps its controls visible in forced colors', async () => {
    await emulateMedia({ forcedColors: 'active' });
    const { doc, win } = await open();
    await stock(doc, win);
    type(doc, 'virginia');
    await results(doc);
    const cs = (sel: string) => win.getComputedStyle(doc.querySelector(sel)!);
    // Native checkboxes (the stock ones are drawn with appearance: none and vanish).
    expect(cs('.pagefind-ui__filter-checkbox').appearance).to.equal('auto');
    for (const sel of ['.pagefind-ui__search-clear', '.pagefind-ui__button']) {
      const s = cs(sel);
      expect(s.borderTopStyle, sel).to.equal('solid');
      expect(s.borderTopColor, sel).to.not.equal(s.backgroundColor);
    }
    const input = cs('.pagefind-ui__search-input');
    expect(input.borderTopStyle).to.equal('solid');
    // Tags keep an outline, and a loading result a grey outlined bar.
    const tag = cs('.pagefind-ui__result-tag');
    expect(tag.borderTopStyle).to.equal('solid');
    expect(tag.borderTopColor).to.not.match(/rgba\(0, 0, 0, 0\)/);
    const loading = doc.createElement('p');
    loading.className = 'pagefind-ui__result-title pagefind-ui__loading';
    loading.textContent = '. . . .';
    doc.querySelector('.pagefind-ui__results')!.append(loading);
    const l = win.getComputedStyle(loading);
    expect(l.borderTopStyle).to.equal('solid');
    expect(l.borderTopColor).to.not.match(/rgba\(0, 0, 0, 0\)/);
    expect(l.color).to.not.match(/rgba\(0, 0, 0, 0\)/);
  });

  it('reflows at 320px with no sideways scrolling', async () => {
    const { doc, win } = await open({ width: 320 });
    await stock(doc, win);
    type(doc, 'virginia');
    await results(doc);
    expect(doc.documentElement.scrollWidth).to.be.at.most(320);
    const panel = doc.querySelector('.pagefind-ui__filter-panel')!.getBoundingClientRect();
    const area = doc.querySelector('.pagefind-ui__results-area')!.getBoundingClientRect();
    expect(area.top).to.be.at.least(panel.bottom - 1); // stacked
    await expectNoAxeViolations(doc.documentElement, undefined, STOCK_AXE);
  });

  it('keeps its text when spaced out (WCAG 1.4.12): no fixed heights clip it', async () => {
    const { doc, win } = await open();
    const style = doc.createElement('style');
    style.textContent = `* { line-height: 1.5 !important; letter-spacing: 0.12em !important;
      word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }`;
    doc.head.append(style);
    await stock(doc, win);
    type(doc, 'virginia');
    await results(doc);
    for (const sel of [
      '.pagefind-ui__message',
      '.pagefind-ui__filter-name',
      '.pagefind-ui__button',
    ]) {
      const el = doc.querySelector<HTMLElement>(sel)!;
      expect(el.scrollHeight, sel).to.be.at.most(el.clientHeight + 1);
    }
  });
});

describe('<uvalib-pagefind-search>', function () {
  this.timeout(20000);
  afterEach(() => iframe?.remove());

  /** The fixture page with the element (from dist-cdn) in place of #search. */
  async function element(attrs = '', query = '', wait = true, stub?: unknown, width?: number) {
    const { doc, win } = await open({ query, width });
    if (stub) (win as unknown as { PagefindUI: unknown }).PagefindUI = stub;
    const analytics: unknown[] = [];
    doc.addEventListener('uvalib-analytics-search', (e) =>
      analytics.push(['search', (e as CustomEvent).detail]),
    );
    doc.addEventListener('uvalib-analytics-event', (e) =>
      analytics.push((e as CustomEvent).detail.event),
    );
    doc.getElementById('search')!.outerHTML =
      // \`attrs\` first: the parser keeps the first of two same-named attributes.
      `<uvalib-pagefind-search ${attrs} bundle-path="${BUNDLE}" page-size="2" show-sub-results placeholder="Search all texts"></uvalib-pagefind-search>`;
    const script = doc.createElement('script');
    script.type = 'module';
    script.src = '/dist-cdn/uvalib-pagefind-search.js';
    doc.head.append(script);
    const el = doc.querySelector('uvalib-pagefind-search') as HTMLElement & {
      ready: Promise<unknown>;
    };
    await until(() => win.customElements.get('uvalib-pagefind-search'), 'define');
    if (wait) await el.ready;
    return { doc, win, el, analytics };
  }

  const status = (doc: Document) => doc.querySelector('[role="status"]')!;

  it('labels the field visibly and announces the settled result count', async () => {
    const { doc, el } = await element();
    const input = doc.querySelector<HTMLInputElement>('.pagefind-ui__search-input')!;
    const label = el.querySelector('label')!;
    expect(label.textContent).to.equal('Search all texts');
    expect(label.htmlFor).to.equal(input.id);
    expect(input.labels![0]).to.equal(label);
    expect(input.placeholder).to.equal('Search all texts');
    const results = new Promise<CustomEvent>((r) =>
      el.addEventListener('search-results', (e) => r(e as CustomEvent), { once: true }),
    );
    type(doc, 'virginia');
    const e = await results;
    expect(e.detail.query).to.equal('virginia');
    expect(e.detail.count).to.equal(7);
    expect(status(doc).textContent).to.equal('7 results for virginia');
    // Not a fresh node per search: the same polite region, hidden from sight.
    expect(status(doc).getBoundingClientRect().width).to.be.at.most(1);
    await expectNoAxeViolations(doc.documentElement);
  });

  it('reads ?q= when it starts and writes the settled query back', async () => {
    const { doc, win, el } = await element('', '?q=rivers');
    const input = doc.querySelector<HTMLInputElement>('.pagefind-ui__search-input')!;
    await until(() => input.value === 'rivers', 'the query from the URL');
    await results(doc);
    const settled = new Promise((r) => el.addEventListener('search-results', r, { once: true }));
    type(doc, 'mountains');
    await settled;
    expect(new URLSearchParams(win.location.search).get('q')).to.equal('mountains');
  });

  it('leaves the URL alone with query-param=""', async () => {
    const { doc, win, el } = await element('query-param=""');
    const settled = new Promise((r) => el.addEventListener('search-results', r, { once: true }));
    type(doc, 'virginia');
    await settled;
    expect(win.location.search).to.equal('');
  });

  it('keeps focus in the field after Clear and Escape', async () => {
    const { doc } = await element();
    const input = type(doc, 'virginia');
    await results(doc);
    input.focus();
    doc.querySelector<HTMLButtonElement>('.pagefind-ui__search-clear')!.click();
    await until(() => doc.activeElement === input, 'focus back on the field');
    expect(input.value).to.equal('');
    type(doc, 'virginia');
    input.focus();
    await sendKeys({ press: 'Escape' });
    await until(() => doc.activeElement === input && input.value === '', 'Escape');
  });

  it('moves focus to the first new result after Load more results', async () => {
    const { doc } = await element();
    type(doc, 'virginia');
    await results(doc, 2);
    doc.querySelector<HTMLButtonElement>('.pagefind-ui__button')!.click();
    const third = await until(
      () => doc.querySelectorAll('.pagefind-ui__results > li')[2]?.querySelector('a'),
      'the third result',
    );
    await until(() => doc.activeElement === third, 'focus on the third result');
  });

  it('reports the settled search once, and filter changes', async () => {
    const { doc, el, analytics } = await element();
    const settled = () =>
      new Promise((r) => el.addEventListener('search-results', r, { once: true }));
    let s = settled();
    type(doc, 'virginia');
    await s;
    await results(doc);
    const box = [...doc.querySelectorAll<HTMLInputElement>('.pagefind-ui__filter-checkbox')].find(
      (b) => b.name === 'author' && b.value === 'Jefferson, Thomas',
    )!;
    s = settled();
    box.click();
    await s;
    expect(analytics).to.deep.equal([
      ['search', { searchQuery: 'virginia', searchCategory: 'Pagefind', resultCount: 7 }],
      ['uvalib-pagefind-search', 'filter-change', 'author: Jefferson, Thomas', 1],
      ['search', { searchQuery: 'virginia', searchCategory: 'Pagefind', resultCount: 2 }],
    ]);
    expect(status(doc).textContent).to.equal('2 results for virginia');
  });

  /** A stand-in PagefindUI that records its options and whether it was destroyed. */
  function recorder() {
    const made: { options: Record<string, unknown>; destroyed: boolean }[] = [];
    class FakeUI {
      rec: { options: Record<string, unknown>; destroyed: boolean };
      constructor(options: Record<string, unknown>) {
        this.rec = { options, destroyed: false };
        made.push(this.rec);
      }
      triggerSearch() {}
      triggerFilters() {}
      destroy() {
        this.rec.destroyed = true;
      }
    }
    return { FakeUI, made };
  }

  it('adds the trailing slash bundle paths need, here and in merge-index', async () => {
    expect(withSlash('/pagefind')).to.equal('/pagefind/');
    expect(withSlash('/pagefind/')).to.equal('/pagefind/');
    const { FakeUI, made } = recorder();
    await element(
      `bundle-path="/pagefind/s0" merge-index='[{"bundlePath": "/pagefind/s1"}, {"bundlePath": "/pagefind/s2/"}, 3]'`,
      '',
      true,
      FakeUI,
    );
    expect(made[0]!.options.bundlePath).to.equal('/pagefind/s0/');
    expect(made[0]!.options.mergeIndex).to.deep.equal([
      { bundlePath: '/pagefind/s1/' },
      { bundlePath: '/pagefind/s2/' },
    ]);
  });

  it('loads a real bundle from a bundle-path without its slash', async () => {
    const { doc } = await element(`bundle-path="${BUNDLE.slice(0, -1)}"`);
    type(doc, 'virginia');
    await results(doc);
  });

  it('keeps its own container, and ignores JSON of the wrong shape', async () => {
    const { FakeUI, made } = recorder();
    const { el } = await element(
      `options='{"element": "#elsewhere", "openFilters": ["author"]}' merge-index='{"bundlePath": "/a/"}' translations='["x"]'`,
      '',
      true,
      FakeUI,
    );
    const o = made[0]!.options;
    expect(o.element).to.equal(el.querySelector('.uvalib-pagefind-search__ui'));
    expect(o.openFilters).to.deep.equal(['author']);
    expect(o.mergeIndex).to.deep.equal([]);
    expect(o.translations).to.deep.equal({ placeholder: 'Search all texts' });
  });

  it('destroys Pagefind when removed, and starts afresh when inserted again', async () => {
    const { FakeUI, made } = recorder();
    const { doc, el } = await element('', '', true, FakeUI);
    const parent = el.parentElement!;
    // Moved within one task: kept.
    parent.append(el);
    await new Promise((r) => setTimeout(r, 0));
    expect(made.length).to.equal(1);
    expect(made[0]!.destroyed).to.equal(false);
    el.remove();
    await new Promise((r) => setTimeout(r, 0));
    expect(made[0]!.destroyed).to.equal(true);
    expect(el.children.length).to.equal(0);
    parent.append(el);
    await el.ready;
    expect(made.length).to.equal(2);
    expect(doc.querySelectorAll('uvalib-pagefind-search label').length).to.equal(1);
  });

  it('works again with the real UI after being removed and inserted', async () => {
    const { doc, el } = await element();
    const parent = el.parentElement!;
    el.remove();
    await new Promise((r) => setTimeout(r, 0));
    parent.append(el);
    await el.ready;
    expect(doc.querySelectorAll('.pagefind-ui').length).to.equal(1);
    const settled = new Promise<CustomEvent>((r) =>
      el.addEventListener('search-results', (e) => r(e as CustomEvent), { once: true }),
    );
    type(doc, 'virginia');
    expect((await settled).detail.count).to.equal(7);
  });

  it('holds the height of the label and field before Pagefind draws them', async () => {
    const { doc, win } = await open();
    doc.getElementById('search')!.outerHTML =
      `<uvalib-pagefind-search bundle-path="${BUNDLE}" placeholder="Search all texts"></uvalib-pagefind-search>`;
    const el = doc.querySelector('uvalib-pagefind-search')!;
    const before = el.getBoundingClientRect().height;
    const script = doc.createElement('script');
    script.type = 'module';
    script.src = '/dist-cdn/uvalib-pagefind-search.js';
    doc.head.append(script);
    await until(() => win.customElements.get('uvalib-pagefind-search'), 'define');
    await (el as unknown as { ready: Promise<unknown> }).ready;
    expect(Math.abs(el.getBoundingClientRect().height - before)).to.be.below(1);
  });

  it('lets Escape leave an empty field', async () => {
    const { doc } = await element();
    const input = doc.querySelector<HTMLInputElement>('.pagefind-ui__search-input')!;
    input.focus();
    await sendKeys({ press: 'Escape' });
    await new Promise((r) => setTimeout(r, 50));
    expect(doc.activeElement).to.not.equal(input);
  });

  it('reports a cleared search, and follows Back and Forward through ?q=', async () => {
    const { doc, win, el } = await element();
    const next = () =>
      new Promise<CustomEvent>((r) =>
        el.addEventListener('search-results', (e) => r(e as CustomEvent), { once: true }),
      );
    let e = next();
    type(doc, 'virginia');
    await e;
    e = next();
    doc.querySelector<HTMLButtonElement>('.pagefind-ui__search-clear')!.click();
    expect((await e).detail).to.deep.equal({ query: '', count: 0 });
    expect(win.location.search).to.equal('');
    const input = doc.querySelector<HTMLInputElement>('.pagefind-ui__search-input')!;
    win.history.pushState(null, '', '?q=rivers');
    win.dispatchEvent(new PopStateEvent('popstate'));
    await until(() => input.value === 'rivers', 'the query from Back');
    e = next();
    await e;
    win.history.pushState(null, '', '?');
    win.dispatchEvent(new PopStateEvent('popstate'));
    await until(() => input.value === '', 'the field cleared by Forward');
  });

  it('settles only once the results have loaded', async () => {
    const { doc, el } = await element();
    let loadingAtSettle: boolean | undefined;
    el.addEventListener(
      'search-results',
      () => (loadingAtSettle = !!doc.querySelector('.pagefind-ui__loading')),
      { once: true },
    );
    type(doc, 'virginia');
    await until(() => loadingAtSettle !== undefined, 'search-results');
    expect(loadingAtSettle).to.equal(false);
  });

  it('reads the count from the message, whatever digits the query holds', () => {
    const en = '[COUNT] results for [SEARCH_TERM]';
    expect(countFromMessage('12 results for 1', '1', en)).to.equal(12);
    expect(countFromMessage('11 results for 1', '1', en)).to.equal(11);
    expect(countFromMessage('1,234 results for 1865', '1865', en)).to.equal(1234);
    expect(countFromMessage('7 results for virginia', 'virginia')).to.equal(7);
    expect(countFromMessage('12 results for 1', '1')).to.equal(12);
    // A language that puts the query first.
    expect(countFromMessage('1 için 11 sonuç', '1', '[SEARCH_TERM] için [COUNT] sonuç')).to.equal(
      11,
    );
  });

  describe('holding the page while a search from the URL loads (issue #37)', () => {
    afterEach(() =>
      emulateMedia({ forcedColors: 'none', colorScheme: 'light', reducedMotion: 'no-preference' }),
    );
    const SK = '.uvalib-pagefind-search__skeleton';
    const tick = () => new Promise((r) => setTimeout(r, 0));
    const frames = (win: Window) =>
      new Promise((r) => win.requestAnimationFrame(() => win.requestAnimationFrame(r)));

    /** A stand-in PagefindUI that draws the field and an empty results area; tests fill it. */
    function blank() {
      return class {
        constructor(o: Record<string, unknown>) {
          (o.element as HTMLElement).innerHTML =
            `<div class="pagefind-ui"><form class="pagefind-ui__form">
            <input class="pagefind-ui__search-input"><div class="pagefind-ui__drawer">
            <div class="pagefind-ui__results-area"></div></div></form></div>`;
        }
        triggerSearch() {}
        triggerFilters() {}
        destroy() {}
      };
    }

    it('shows placeholder results in place of the results area until they have loaded', async () => {
      const { doc, win, el } = await element('searching', '?q=virginia', true, blank());
      const sk = el.querySelector(SK)!;
      expect(sk.getAttribute('aria-hidden')).to.equal('true');
      // page-size="2" rows, two sections each with show-sub-results, in base.css's bars.
      expect(sk.querySelectorAll('.uvalib-pagefind-search__skeleton-result').length).to.equal(2);
      expect(sk.querySelectorAll('.uvalib-pagefind-search__skeleton-sub').length).to.equal(4);
      expect(
        win.getComputedStyle(sk.querySelector('.uvalib-skeleton-text')!).animationName,
      ).to.equal('uvalib-skeleton-shimmer');
      expect(sk.previousElementSibling!.className).to.equal('uvalib-pagefind-search__ui');
      expect(el.getBoundingClientRect().height).to.be.at.least(win.innerHeight - 1);
      const drawer = doc.querySelector('.pagefind-ui__drawer')!;
      expect(win.getComputedStyle(drawer).display).to.equal('none');

      // Searching, then results still loading: held.
      const area = doc.querySelector('.pagefind-ui__results-area')!;
      area.innerHTML = '<p class="pagefind-ui__message">Searching for virginia...</p>';
      await tick();
      area.innerHTML = `<p class="pagefind-ui__message">2 results for virginia</p>
        <ol class="pagefind-ui__results"><li class="pagefind-ui__result"></li><li><p class="pagefind-ui__loading">. .</p></li></ol>`;
      await tick();
      expect(!!el.querySelector(SK)).to.equal(true);
      expect(el.hasAttribute('searching')).to.equal(true);
      // Loaded: released, with the element still reaching the window's bottom.
      area.querySelector('.pagefind-ui__loading')!.remove();
      await tick();
      expect(!!el.querySelector(SK)).to.equal(false);
      expect(el.hasAttribute('searching')).to.equal(false);
      expect(win.getComputedStyle(drawer).display).to.not.equal('none');
      expect(el.style.minBlockSize).to.match(/px$/);
      expect(el.getBoundingClientRect().bottom).to.be.at.least(win.innerHeight - 1);
      // The visitor using the search lets the fold go.
      type(doc, 'rivers');
      expect(el.style.minBlockSize).to.equal('');
    });

    it('releases on "no results" (an empty list)', async () => {
      const { doc, el } = await element('searching', '?q=zzz', true, blank());
      doc.querySelector('.pagefind-ui__results-area')!.innerHTML =
        '<p class="pagefind-ui__message">No results for zzz</p><ol class="pagefind-ui__results"></ol>';
      await tick();
      expect(!!el.querySelector(SK)).to.equal(false);
      expect(el.hasAttribute('searching')).to.equal(false);
    });

    it('lets the visitor take over: typing during the hold releases it, keeping nothing', async () => {
      const { doc, el } = await element('searching', '?q=virginia', true, blank());
      type(doc, 'rivers');
      expect(!!el.querySelector(SK)).to.equal(false);
      expect(el.hasAttribute('searching')).to.equal(false);
      expect(el.style.minBlockSize).to.equal('');
    });

    it('leaves a page that starts without a query as it was', async () => {
      for (const attrs of ['', 'searching']) {
        const { el } = await element(attrs, '', true, blank());
        expect(!!el.querySelector(SK), attrs).to.equal(false);
        // A searching attribute without a query in the URL is dropped.
        expect(el.hasAttribute('searching'), attrs).to.equal(false);
        expect(el.getBoundingClientRect().height, attrs).to.be.below(150);
        iframe?.remove();
      }
    });

    it('does not hold without searching from the page (it would run after first paint)', async () => {
      const { el } = await element('', '?q=virginia', true, blank());
      expect(!!el.querySelector(SK)).to.equal(false);
      expect(el.hasAttribute('searching')).to.equal(false);
    });

    it('does nothing with no-skeleton', async () => {
      const { doc, win, el } = await element('searching no-skeleton', '?q=virginia', true, blank());
      expect(!!el.querySelector(SK)).to.equal(false);
      expect(el.hasAttribute('searching')).to.equal(false);
      const drawer = doc.querySelector('.pagefind-ui__drawer')!;
      expect(win.getComputedStyle(drawer).display).to.not.equal('none');
    });

    it('releases, and says so, when Pagefind cannot be loaded', async () => {
      const { doc, el } = await element(
        'searching bundle-path="/no-such-pagefind/"',
        '?q=virginia',
        false,
      );
      await until(() => doc.querySelector('.uvalib-pagefind-search__error'), 'the error message');
      expect(!!el.querySelector(SK)).to.equal(false);
      expect(el.hasAttribute('searching')).to.equal(false);
    });

    it('draws the same placeholders before the script loads, where the script will', async () => {
      const { doc, win } = await open({ query: '?q=virginia' });
      doc.getElementById('search')!.outerHTML =
        `<uvalib-pagefind-search searching show-sub-results bundle-path="${BUNDLE}" label="Search the texts"></uvalib-pagefind-search>`;
      const el = doc.querySelector('uvalib-pagefind-search')!;
      expect(el.getBoundingClientRect().height).to.be.at.least(win.innerHeight - 1);
      const before = win.getComputedStyle(el, '::before');
      const after = win.getComputedStyle(el, '::after');
      expect(before.backgroundImage).to.match(/gradient/);
      expect(after.backgroundImage).to.match(/gradient/);
      const rowsAt = parseFloat(before.height);
      const row = parseFloat(after.backgroundSize.split(',')[0]!.trim().split(' ')[1]!);
      // Forced colors would drop the gradients: kept, in GrayText.
      await emulateMedia({ forcedColors: 'active' });
      expect(win.getComputedStyle(el, '::after').forcedColorAdjust).to.equal('none');
      await emulateMedia({ forcedColors: 'none' });
      (win as unknown as { PagefindUI: unknown }).PagefindUI = blank();
      const script = doc.createElement('script');
      script.type = 'module';
      script.src = '/dist-cdn/uvalib-pagefind-search.js';
      doc.head.append(script);
      await until(() => win.customElements.get('uvalib-pagefind-search'), 'define');
      // The rows start where the drawn ones did, and are as tall.
      const top = el.getBoundingClientRect().top;
      const rows = el.querySelectorAll('.uvalib-pagefind-search__skeleton-result');
      expect(rows[0]!.getBoundingClientRect().top - top).to.be.closeTo(rowsAt, 1);
      expect(
        rows[1]!.getBoundingClientRect().top - rows[0]!.getBoundingClientRect().top,
      ).to.be.closeTo(row, 1);
      expect(win.getComputedStyle(el, '::before').content).to.equal('none');
    });

    /** Layout shifts (CLS) in the frame while a real search from `?q=virginia` loads. */
    async function shifts(attrs: string, width: number) {
      const { doc, win } = await open({ query: '?q=virginia', width });
      doc.getElementById('search')!.outerHTML =
        `<uvalib-pagefind-search ${attrs} bundle-path="${BUNDLE}" page-size="10" show-sub-results placeholder="Search all texts"></uvalib-pagefind-search>`;
      const footer = doc.createElement('footer');
      footer.style.cssText = 'block-size: 300px; background: #eee';
      doc.body.append(footer);
      await frames(win);
      let cls = 0;
      const PO = (win as unknown as typeof globalThis).PerformanceObserver;
      new PO((list) => {
        for (const e of list.getEntries()) cls += (e as unknown as { value: number }).value;
      }).observe({ type: 'layout-shift' });
      const el = doc.querySelector('uvalib-pagefind-search')!;
      const settled = new Promise((r) => el.addEventListener('search-results', r, { once: true }));
      const script = doc.createElement('script');
      script.type = 'module';
      script.src = '/dist-cdn/uvalib-pagefind-search.js';
      doc.head.append(script);
      await settled;
      await frames(win);
      iframe?.remove();
      return cls;
    }

    it('keeps a real ?q= search from moving the page (CLS under 0.05; without it, more)', async () => {
      for (const width of [1000, 320]) {
        expect(await shifts('searching', width), `searching, ${width}px`).to.be.below(0.05);
        expect(await shifts('', width), `no searching, ${width}px`).to.be.above(0.05);
      }
    });

    it('holds again on Back and Forward to a new query, reporting as before', async () => {
      const { doc, win, el, analytics } = await element();
      const next = () =>
        new Promise<CustomEvent>((r) =>
          el.addEventListener('search-results', (e) => r(e as CustomEvent), { once: true }),
        );
      let s = next();
      type(doc, 'virginia');
      await s;
      expect(!!el.querySelector(SK)).to.equal(false);
      s = next();
      win.history.pushState(null, '', '?q=rivers');
      win.dispatchEvent(new PopStateEvent('popstate'));
      expect(!!el.querySelector(SK)).to.equal(true);
      expect(el.hasAttribute('searching')).to.equal(true);
      expect((await s).detail).to.deep.equal({ query: 'rivers', count: 7 });
      expect(!!el.querySelector(SK)).to.equal(false);
      expect(el.hasAttribute('searching')).to.equal(false);
      expect(status(doc).textContent).to.equal('7 results for rivers');
      expect(analytics).to.deep.equal([
        ['search', { searchQuery: 'virginia', searchCategory: 'Pagefind', resultCount: 7 }],
        ['search', { searchQuery: 'rivers', searchCategory: 'Pagefind', resultCount: 7 }],
      ]);
    });

    it('starts a real search held, announced and reported once, as without the hold', async () => {
      const { doc, el, analytics } = await element('searching', '?q=virginia', false);
      expect(!!el.querySelector(SK)).to.equal(true);
      const e = await new Promise<CustomEvent>((r) =>
        el.addEventListener('search-results', (ev) => r(ev as CustomEvent), { once: true }),
      );
      expect(e.detail).to.deep.equal({ query: 'virginia', count: 7 });
      expect(!!el.querySelector(SK)).to.equal(false);
      expect(status(doc).textContent).to.equal('7 results for virginia');
      expect(analytics).to.deep.equal([
        ['search', { searchQuery: 'virginia', searchCategory: 'Pagefind', resultCount: 7 }],
      ]);
      await expectNoAxeViolations(doc.documentElement);
    });

    it('is readable in dark mode and forced colors, still with reduced motion, and reflows at 320px', async () => {
      const { doc, win, el } = await element('searching', '?q=virginia', true, blank(), 320);
      const bar = el.querySelector<HTMLElement>(`${SK} .uvalib-skeleton-text`)!;
      expect(doc.documentElement.scrollWidth).to.be.at.most(320);
      await expectNoAxeViolations(doc.documentElement);
      const light = win.getComputedStyle(bar).backgroundColor;
      doc.documentElement.setAttribute('data-uva-color-scheme', 'dark');
      await emulateMedia({ colorScheme: 'dark' });
      expect(win.getComputedStyle(bar).backgroundColor).to.not.equal(light);
      await expectNoAxeViolations(doc.documentElement);
      await emulateMedia({ reducedMotion: 'reduce' });
      expect(win.getComputedStyle(bar).animationName).to.equal('none');
      await emulateMedia({ forcedColors: 'active' });
      expect(win.getComputedStyle(bar).borderTopStyle).to.equal('solid');
    });
  });

  describe('filter-params', () => {
    const FP = 'filter-params="collection author"';
    const box = (doc: Document, name: string, value: string) =>
      [...doc.querySelectorAll<HTMLInputElement>('.pagefind-ui__filter-checkbox')].find(
        (b) => b.name === name && b.value === value,
      );
    const checkedKeys = (doc: Document) =>
      [...doc.querySelectorAll<HTMLInputElement>('.pagefind-ui__filter-checkbox')]
        .filter((b) => b.checked)
        .map((b) => `${b.name}:${b.value}`)
        .sort();
    const firstResults = (el: HTMLElement) =>
      new Promise<CustomEvent>((r) =>
        el.addEventListener('search-results', (e) => r(e as CustomEvent), { once: true }),
      );

    /** A stand-in PagefindUI that draws two filter groups and records every call in order. */
    function filterRecorder() {
      const calls: unknown[] = [];
      let options: Record<string, unknown> = {};
      class FakeUI {
        constructor(o: Record<string, unknown>) {
          options = o;
          const c = o.element as HTMLElement;
          const input = c.ownerDocument.createElement('input');
          input.className = 'pagefind-ui__search-input';
          // Pagefind loads its index on focus; the filters are drawn once it has.
          input.addEventListener('focus', () => {
            calls.push(['load']);
            setTimeout(() => {
              c.insertAdjacentHTML(
                'beforeend',
                `<details><summary>Collection</summary>
                  <input type="checkbox" class="pagefind-ui__filter-checkbox" name="collection" value="Modern English">
                  <input type="checkbox" class="pagefind-ui__filter-checkbox" name="collection" value="Early American Fiction">
                </details><details><summary>Author</summary>
                  <input type="checkbox" class="pagefind-ui__filter-checkbox" name="author" value="Poe, Edgar Allan">
                </details>`,
              );
            }, 20);
          });
          c.append(input);
        }
        triggerSearch(t: string) {
          calls.push(['search', t]);
        }
        triggerFilters(f: unknown) {
          calls.push(['filters', f]);
        }
        destroy() {}
      }
      return { FakeUI, calls, options: () => options };
    }

    it('applies repeated URL filters with the query in one go, dropping unknown values', async () => {
      const { FakeUI, calls, options } = filterRecorder();
      const { doc, win, el } = await element(
        FP,
        '?collection=Modern+English&collection=early+american+fiction&collection=Nope&author=Nobody&decade=1830s&q=rivers&x=1',
        true,
        FakeUI,
      );
      await until(() => calls.length >= 3, 'the filters and the search');
      await new Promise((r) => setTimeout(r, 50));
      expect(calls).to.deep.equal([
        ['load'],
        ['filters', { collection: ['Modern English', 'Early American Fiction'] }],
        ['search', 'rivers'],
      ]);
      // Groups named in the URL start open, after any given in `options`.
      expect(options().openFilters).to.deep.equal(['collection', 'author']);
      expect(el.querySelector('details')!.open).to.equal(true);
      // The unknown values leave the URL; the known one takes the index's case; others stay.
      const p = new URLSearchParams(win.location.search);
      expect(p.getAll('collection')).to.deep.equal(['Modern English', 'Early American Fiction']);
      expect(p.has('author')).to.equal(false);
      expect([p.get('decade'), p.get('q'), p.get('x')]).to.deep.equal(['1830s', 'rivers', '1']);
      expect(doc.querySelectorAll('details[open]').length).to.equal(1);
    });

    it('waits for no filter list without filters in the URL (the old start)', async () => {
      const { FakeUI, calls } = filterRecorder();
      await element(FP, '?q=rivers', true, FakeUI);
      expect(calls).to.deep.equal([['search', 'rivers']]);
    });

    it('starts a real search narrowed by ?collection=, reported once with its filter', async () => {
      const { doc, win, el, analytics } = await element(
        FP,
        '?collection=Modern+English&q=virginia',
        false,
      );
      const e = await firstResults(el);
      expect(e.detail).to.deep.equal({ query: 'virginia', count: 4 });
      expect(checkedKeys(doc)).to.deep.equal(['collection:Modern English']);
      expect(box(doc, 'collection', 'Modern English')!.closest('details')!.open).to.equal(true);
      expect(box(doc, 'author', 'Poe, Edgar Allan')!.closest('details')!.open).to.equal(false);
      expect(status(doc).textContent).to.equal('4 results for virginia');
      await new Promise((r) => setTimeout(r, 1500));
      // No filter-change event (the URL set it, not the visitor), and one search.
      expect(analytics).to.deep.equal([
        ['search', { searchQuery: 'virginia', searchCategory: 'Pagefind', resultCount: 4 }],
      ]);
      expect(new URLSearchParams(win.location.search).get('collection')).to.equal('Modern English');
      await expectNoAxeViolations(doc.documentElement);
    });

    it('takes several values of one filter from repeated parameters', async () => {
      const { doc, el } = await element(
        FP,
        '?collection=Modern+English&collection=Early+American+Fiction&author=Poe%2C+Edgar+Allan&q=virginia',
        false,
      );
      const e = await firstResults(el);
      // As when the boxes are checked by hand: Pagefind wants pages with every checked value.
      expect(e.detail.count).to.equal(0);
      expect(checkedKeys(doc)).to.deep.equal([
        'author:Poe, Edgar Allan',
        'collection:Early American Fiction',
        'collection:Modern English',
      ]);
    });

    it('ignores values the index does not have, without an error or empty results', async () => {
      const errors: unknown[] = [];
      const { doc, win, el } = await element(FP, '?collection=Nope&q=virginia', false);
      win.addEventListener('error', (e) => errors.push(e.message));
      const e = await firstResults(el);
      expect(e.detail.count).to.equal(7);
      expect(checkedKeys(doc)).to.deep.equal([]);
      expect(win.location.search).to.equal('?q=virginia');
      expect(errors).to.deep.equal([]);
    });

    it('writes checked filters to the URL, keeping other parameters', async () => {
      const { doc, win, el } = await element(FP, '?x=1');
      let s = firstResults(el);
      type(doc, 'virginia');
      await s;
      await results(doc);
      box(doc, 'author', 'Jefferson, Thomas')!.click();
      box(doc, 'author', 'Poe, Edgar Allan')!.click();
      // decade is not in filter-params: not written.
      box(doc, 'decade', '1830s')!.click();
      let p = new URLSearchParams(win.location.search);
      expect(p.getAll('author')).to.deep.equal(['Jefferson, Thomas', 'Poe, Edgar Allan']);
      expect([p.get('x'), p.has('decade')]).to.deep.equal(['1', false]);
      box(doc, 'author', 'Jefferson, Thomas')!.click();
      box(doc, 'author', 'Poe, Edgar Allan')!.click();
      p = new URLSearchParams(win.location.search);
      expect(p.has('author')).to.equal(false);
      s = firstResults(el);
      await s;
      expect(new URLSearchParams(win.location.search).get('q')).to.equal('virginia');
      expect(new URLSearchParams(win.location.search).get('x')).to.equal('1');
    });

    it('follows Back and Forward through the filters and the query', async () => {
      const { doc, win, el } = await element(FP);
      let s = firstResults(el);
      type(doc, 'virginia');
      await s;
      await results(doc);
      // decade (not in filter-params) stays as the visitor set it.
      box(doc, 'decade', '1830s')!.click();
      s = firstResults(el);
      win.history.pushState(null, '', '?q=virginia&collection=Modern+English');
      win.dispatchEvent(new PopStateEvent('popstate'));
      expect((await s).detail.count).to.equal(1);
      expect(checkedKeys(doc)).to.deep.equal(['collection:Modern English', 'decade:1830s']);
      s = firstResults(el);
      win.history.pushState(null, '', '?q=rivers');
      win.dispatchEvent(new PopStateEvent('popstate'));
      const input = doc.querySelector<HTMLInputElement>('.pagefind-ui__search-input')!;
      expect((await s).detail.count).to.equal(2);
      expect(input.value).to.equal('rivers');
      expect(checkedKeys(doc)).to.deep.equal(['decade:1830s']);
    });

    it('leaves URL filters alone without filter-params (the old behaviour)', async () => {
      const { doc, win, el } = await element('', '?collection=Modern+English&q=virginia', false);
      const e = await firstResults(el);
      expect(e.detail.count).to.equal(7);
      expect(checkedKeys(doc)).to.deep.equal([]);
      box(doc, 'collection', 'Modern English')!.click();
      box(doc, 'author', 'Poe, Edgar Allan')!.click();
      const p = new URLSearchParams(win.location.search);
      expect(p.getAll('collection')).to.deep.equal(['Modern English']);
      expect(p.has('author')).to.equal(false);
    });
  });

  it('says so, and reports it, when Pagefind cannot be loaded', async () => {
    const { doc, analytics } = await element('bundle-path="/no-such-pagefind/"', '', false);
    const error = await until(
      () => doc.querySelector('.uvalib-pagefind-search__error'),
      'the error message',
    );
    expect(error.textContent).to.match(/not available/);
    expect(doc.querySelector('uvalib-pagefind-search label')).to.equal(null);
    expect(analytics).to.deep.equal([['uvalib-pagefind-search', 'error', 'load']]);
  });
});
