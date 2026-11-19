// pagefind.css and <uvalib-pagefind-search>, against Pagefind's real default UI and a tiny
// index that test/helpers/pagefind-fixture.mjs builds locally when the test server starts
// (served at /pagefind-fixture/; no network). The page is an iframe that links the built
// stylesheets from dist-cdn, as a host page would, and never Pagefind's pagefind-ui.css.
import { expect } from '@open-wc/testing';
import { emulateMedia, sendKeys } from '@web/test-runner-commands';
import { expectNoAxeViolations } from './helpers/axe.js';

const BUNDLE = '/pagefind-fixture/';
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
  async function element(attrs = '', query = '', wait = true) {
    const { doc, win } = await open({ query });
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
