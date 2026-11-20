import { expect } from '@open-wc/testing';
import { emulateMedia } from '@web/test-runner-commands';
import { expectNoPageAxeViolations } from './helpers/axe.js';
import { contrast, rgb, type Colors } from './helpers/scheme-colors.js';
import { editor, siteColors } from './helpers/site-colors.js';
import {
  COLOR_SCHEME_SNIPPET,
  examples,
  GROUPS,
  withCdnBase,
  type Preset,
} from '../site/src/presets.js';
import { decode, encode } from '../site/src/share.js';
import { bombHash, deflateToBase64Url, toBase64Url } from './helpers/share-payloads.js';

// Runs against the built site (`pnpm build:site --base /dist-site/`, part of `pnpm test`).
// Previews run on the unpkg.com sandbox origin, so nothing here waits on them: the
// assertions read the IDE's config and the site's own chrome only.
const SITE = '/dist-site/';

type Ide = HTMLElement & {
  config?: { files?: Record<string, { content?: string }> };
  sandboxBaseUrl?: string;
};

async function until(check: () => boolean, what: string, ms = 5000): Promise<void> {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 25));
  }
}

const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

// Each describe shares one loaded page where it can: the page starts playground-elements'
// TypeScript worker, which is heavy enough to slow test files running alongside.
let iframe: HTMLIFrameElement | undefined;

/**
 * Load `page` (relative to the site, with any hash) and wait until the document at
 * `landing` (a pathname; by default the page's own) has parsed and playground-ide is defined.
 */
async function open(
  page: string,
  landing = new URL(SITE + page, location.href).pathname,
): Promise<{ win: Window; doc: Document }> {
  iframe?.remove();
  iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:1200px;height:900px;border:0';
  document.body.append(iframe);
  iframe.src = new URL(SITE + page, location.href).href;
  // Not the iframe's load event: that also waits for the IDE's unpkg.com sandbox frame,
  // and these tests must not depend on unpkg being reachable.
  await until(() => {
    const doc = iframe!.contentDocument;
    return (
      doc !== null &&
      doc.URL !== 'about:blank' &&
      new URL(doc.URL).pathname === landing &&
      doc.readyState !== 'loading'
    );
  }, `${landing} parsed`);
  const win = iframe.contentWindow!;
  await until(
    () => win.customElements.get('playground-ide') !== undefined,
    'playground-ide defined',
  );
  return { win, doc: iframe.contentDocument! };
}

async function atWidth(width: number, run: () => Promise<void>) {
  iframe!.style.width = `${width}px`;
  await frame();
  try {
    await run();
  } finally {
    iframe!.style.width = '1200px';
    await frame();
  }
}

// axe flags two rules inside playground-elements' own CodeMirror editor, which offers no
// hook for them: aria-input-field-name (.cm-content) and scrollable-region-focusable
// (.cm-scroller). Only that third-party subtree is excluded; the site chrome is audited.
const AXE_SCOPE = { exclude: [['playground-ide']] };

/** Choose Light, Dark or System with the header's Theme control, and wait for it to apply. */
async function chooseScheme(doc: Document, scheme: 'light' | 'dark' | 'system') {
  const header = doc.querySelector('site-page')!.shadowRoot!.querySelector('site-header')!;
  header
    .shadowRoot!.querySelector<HTMLInputElement>(`fieldset.color-scheme input[value="${scheme}"]`)!
    .click();
  await until(
    () => doc.documentElement.dataset.uvaColorScheme === scheme,
    `data-uva-color-scheme="${scheme}"`,
  );
  await frame();
}

// The page's colours before dark mode (measured on the site without it). Light keeps them;
// only the body background is now the surface token's white instead of transparent (over the
// white canvas, the same on screen).
const LIGHT: Colors = {
  'body color': 'rgb(43, 43, 43)',
  'body background-color': 'rgb(255, 255, 255)',
  'heading color': 'rgb(43, 43, 43)',
  'description color': 'rgb(79, 87, 97)',
  'status color': 'rgb(79, 87, 97)',
  'button color': 'rgb(43, 43, 43)',
  'button background-color': 'rgb(255, 255, 255)',
  'button border-top-color': 'rgb(208, 212, 218)',
  'site link color': 'rgb(0, 86, 121)',
  'ide border-top-color': 'rgb(208, 212, 218)',
  'tab bar background-color': 'rgb(234, 234, 234)',
  'tab color': 'rgb(0, 0, 0)',
  'active tab color': 'rgb(11, 92, 173)',
  'active tab background-color': 'rgba(0, 0, 0, 0)',
  'editor color': 'rgb(0, 0, 0)',
  'editor background-color': 'rgb(255, 255, 255)',
  'gutter background-color': 'rgb(255, 255, 255)',
  'line number color': 'rgb(118, 118, 118)',
  'preview toolbar color': 'rgb(68, 68, 68)',
  'preview toolbar background-color': 'rgb(255, 255, 255)',
};

// Dark: the role tokens' dark values (README "Dark mode") and the site's editor theme.
const DARK: Colors = {
  'body color': rgb('#e8e8e8'),
  'body background-color': rgb('#10172b'),
  'heading color': rgb('#e8e8e8'),
  'description color': rgb('#adadad'),
  'status color': rgb('#adadad'),
  'button color': rgb('#e8e8e8'),
  'button background-color': rgb('#232d4b'),
  'button border-top-color': rgb('#7a84a0'),
  'site link color': rgb('#91d8f2'),
  'ide border-top-color': rgb('#7a84a0'),
  'tab bar background-color': rgb('#232d4b'),
  'tab color': rgb('#e8e8e8'),
  'active tab color': rgb('#87b9d9'),
  'active tab background-color': rgb('#131a2f'),
  'editor color': rgb('#e8e8e8'),
  'editor background-color': rgb('#131a2f'),
  'gutter background-color': rgb('#131a2f'),
  'line number color': rgb('#8e98b0'),
  'preview toolbar color': rgb('#e8e8e8'),
  'preview toolbar background-color': rgb('#232d4b'),
};

/** The editor's text colours (`--playground-code-<name>`) the dark theme sets. */
const CODE_COLORS = [
  'default-color',
  'variable-color',
  'keyword-color',
  'atom-color',
  'number-color',
  'property-color',
  'type-color',
  'def-color',
  'operator-color',
  'variable-2-color',
  'variable-3-color',
  'comment-color',
  'string-color',
  'string-2-color',
  'meta-color',
  'qualifier-color',
  'builtin-color',
  'tag-color',
  'attribute-color',
  'linenumber-color',
];

const indexHtml = (ide: Ide) => ide.config?.files?.['index.html']?.content;
const expected = (win: Window, p: Preset) =>
  withCdnBase(p, new URL('cdn/', win.location.href).href).files['index.html']!.content;
const byId = (id: string) => examples.find((p) => p.id === id)!;

/** Every element matching `selector` in `root` and its open shadow roots. */
function deepAll(root: Document | ShadowRoot, selector: string): Element[] {
  const found = [...root.querySelectorAll(selector)];
  for (const el of root.querySelectorAll('*')) {
    if (el.shadowRoot) found.push(...deepAll(el.shadowRoot, selector));
  }
  return found;
}

/** The rendered <site-header> inside the page's <site-page> (shadow mode). */
function siteHeader(doc: Document): ShadowRoot | null | undefined {
  return doc.querySelector('site-page')?.shadowRoot?.querySelector('site-header')?.shadowRoot;
}

/** The header's main nav: the bar (wide screens) or the Menu popover's accordion. */
const bar = (doc: Document) =>
  siteHeader(doc)!.querySelector<HTMLElement>('header > site-main-nav:not([layout="accordion"])')!;
const accordion = (doc: Document) =>
  siteHeader(doc)!.querySelector<HTMLElement>('[popover] site-main-nav[layout="accordion"]')!;
const navOf = (n: Element) => n.shadowRoot!.querySelector<HTMLElement>('nav.main-nav')!;
const toggles = (n: Element) => [...navOf(n).querySelectorAll<HTMLButtonElement>('button')];
const linkTo = (n: Element, id: string) =>
  navOf(n).querySelector<HTMLAnchorElement>(`a[href="#${id}"]`)!;
const currentIds = (n: Element) =>
  [...navOf(n).querySelectorAll('a[aria-current="page"]')].map((a) =>
    a.getAttribute('href')!.slice(1),
  );
const currentGroups = (n: Element) =>
  toggles(n)
    .filter((b) => b.getAttribute('aria-current') === 'true')
    .map((b) => b.textContent!.trim());
const expandedGroups = (n: Element) =>
  toggles(n)
    .filter((b) => b.getAttribute('aria-expanded') === 'true')
    .map((b) => b.textContent!.trim());
const menuPopover = (doc: Document) => siteHeader(doc)!.querySelector<HTMLElement>('[popover]')!;

/** Wait for <site-page> to render its header with the site links and the examples nav. */
async function chromeReady(doc: Document): Promise<void> {
  await until(
    () =>
      siteHeader(doc)?.querySelector('nav[aria-label="Web components"] a') != null &&
      bar(doc)?.shadowRoot?.querySelector(`a[href="#${examples[0]!.id}"]`) != null,
    'site-page header with the site links and the examples main nav',
  );
}

type Nav = { currentEntry: { index: number }; entries(): { url: string | null }[] };
/**
 * The page's own session history (the Navigation API): history.length is the joint history,
 * which also counts entries the cross-origin preview iframe adds. The current entry's index
 * is used, not the entry count, since a new entry drops forward entries.
 */
const navigationOf = (win: Window) => (win as Window & { navigation: Nav }).navigation;

/** Choose example `p` from the bar: open its group, then click its link. */
async function chooseFromBar(doc: Document, p: Preset) {
  const n = bar(doc);
  const button = toggles(n).find((b) => b.textContent!.trim() === p.group)!;
  if (button.getAttribute('aria-expanded') !== 'true') button.click();
  await until(() => linkTo(n, p.id).checkVisibility(), `${p.group} panel open`);
  linkTo(n, p.id).click();
}

/** Wait until the page shows example `p`: its files, heading, title and main-nav marking. */
async function expectShowing(win: Window, doc: Document, p: Preset) {
  const ide = doc.querySelector<Ide>('playground-ide')!;
  await until(() => indexHtml(ide) === expected(win, p), `${p.id} files`);
  expect(doc.querySelector('h1')!.textContent!.trim()).to.equal(p.title);
  expect(doc.querySelector('#example-description')!.textContent!.trim()).to.equal(p.description);
  // The main nav marks the example (link and group) in both layouts.
  await until(
    () =>
      [bar(doc), accordion(doc)].every(
        (n) => currentIds(n).join() === p.id && currentGroups(n).join() === p.group,
      ),
    `${p.id} marked current in the main nav`,
  );
  expect(doc.title).to.include(p.title);
  // Only ever one IDE: switching examples reuses it.
  expect(deepAll(doc, 'playground-ide').length).to.equal(1);
}

describe('examples page', function () {
  this.timeout(20000); // the full site page: the playground-elements bundle and its IDE
  let win: Window;
  let doc: Document;
  let ide: Ide;
  before(async () => {
    ({ win, doc } = await open('index.html'));
    ide = doc.querySelector<Ide>('playground-ide')!;
    await chromeReady(doc);
  });
  after(() => iframe?.remove());

  it('has the site chrome, with Examples current, Test results and README, and no footer', () => {
    // One <main>, the one site-page renders; the page has no chrome of its own.
    expect(deepAll(doc, 'main').length).to.equal(1);
    expect(doc.querySelectorAll('main, header, .skip-link').length).to.equal(0);
    const header = siteHeader(doc)!;
    for (const selector of ['nav.inline', '[popover] nav.menu']) {
      const links = [...header.querySelectorAll<HTMLAnchorElement>(`${selector} a`)];
      expect(
        links.map((a) => a.textContent!.trim()),
        selector,
      ).to.deep.equal(['Examples', 'Test results', 'README']);
      expect(links[0]!.getAttribute('aria-current')).to.equal('page');
      expect(links[1]!.getAttribute('href')).to.equal('./report/');
      expect(links[2]!.href).to.equal('https://github.com/uvalib/reusable-web-library#readme');
    }
    expect(header.querySelector('nav[aria-label="Utility"]')).to.equal(null);
    // The example's heading lands in that single <main>.
    let top: Element = doc.querySelector('h1')!;
    while (top.parentElement?.localName !== 'site-page') top = top.parentElement!;
    expect(top.assignedSlot?.closest('main')).to.not.equal(null);
    // A tool page: site-page no-footer.
    const footer = doc.querySelector('site-page')!.shadowRoot!.querySelector('site-footer')!;
    expect(getComputedStyle(footer).display).to.equal('none');
  });

  it('the main nav is the examples menu: every example once, grouped, in the presets order', () => {
    // Slotted markup (written into the page at build time), so it is there before site-page.
    const source = doc.querySelector('site-page > nav[slot="main-nav"]')!;
    expect(source).to.not.equal(null);
    for (const n of [bar(doc), accordion(doc)]) {
      expect(navOf(n).getAttribute('aria-label')).to.equal('Examples');
      const groups = [...navOf(n).querySelectorAll(':scope > ul > li')];
      expect(
        groups.map((li) => li.querySelector(':scope > button')!.textContent!.trim()),
      ).to.deep.equal([...GROUPS]);
      for (const [i, li] of groups.entries()) {
        const want = examples.filter((p) => p.group === GROUPS[i]);
        const links = [...li.querySelectorAll<HTMLAnchorElement>(':scope > ul > li > a')];
        expect(links.map((a) => a.getAttribute('href'))).to.deep.equal(want.map((p) => `#${p.id}`));
        expect(links.map((a) => a.textContent!.trim())).to.deep.equal(want.map((p) => p.title));
      }
      expect([...navOf(n).querySelectorAll('a')].map((a) => a.getAttribute('href'))).to.deep.equal(
        examples.map((p) => `#${p.id}`),
      );
    }
    // Not the library's default main navigation.
    expect(toggles(bar(doc)).map((b) => b.textContent!.trim())).to.not.include('About');
  });

  it('has no sidebar or select: one IDE spanning the content width, plus Reset and Copy link', () => {
    expect(doc.querySelector('nav.example-menu, select, #example-select')).to.equal(null);
    expect(doc.querySelectorAll('site-page > nav:not([slot])').length).to.equal(0);
    expect(deepAll(doc, 'playground-ide').length).to.equal(1);
    const main = doc.querySelector('site-page')!.shadowRoot!.querySelector('main')!;
    const cs = getComputedStyle(main);
    const content = main.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    expect(ide.getBoundingClientRect().width).to.be.closeTo(content, 1);
    for (const attr of ['resizable', 'line-numbers', 'editable-file-system']) {
      expect(ide.hasAttribute(attr), attr).to.equal(true);
    }
    expect(ide.hasAttribute('sandbox-base-url')).to.equal(false);
    expect(ide.sandboxBaseUrl).to.match(/^https:\/\/unpkg\.com\/playground-elements@/);
    expect(doc.querySelector('button#copy-link')?.textContent).to.match(/copy link/i);
    expect(doc.querySelector('button#reset')?.textContent).to.match(/reset/i);
  });

  it('starts with the first example, marked current', async () => {
    await expectShowing(win, doc, examples[0]!);
    expect(win.location.hash).to.equal('');
  });

  it('sizes the IDE from its measured top (--ide-top)', async () => {
    const top = () => Math.round(ide.getBoundingClientRect().top + win.scrollY);
    await until(
      () => doc.documentElement.style.getPropertyValue('--ide-top') === `${top()}px`,
      '--ide-top set to the IDE top',
    );
    const rem = parseFloat(getComputedStyle(doc.documentElement).fontSize);
    const height = ide.getBoundingClientRect().height;
    expect(height).to.be.closeTo(Math.max(28 * rem, win.innerHeight - top() - 1.5 * rem), 1);
  });

  it('a main-nav link swaps the IDE files, sets the hash, marks it current and closes the panel', async () => {
    const nav = navigationOf(win);
    const start = nav.currentEntry.index;
    for (const p of [...examples].reverse()) {
      const before = nav.currentEntry.index;
      await chooseFromBar(doc, p);
      await expectShowing(win, doc, p);
      expect(win.location.hash).to.equal(`#${p.id}`);
      expect(indexHtml(ide)).to.include(new URL('cdn/site-page.js', win.location.href).href);
      // Exactly one history entry per selection.
      expect(nav.currentEntry.index).to.equal(before + 1);
      // The panel closes, and focus moves to the example's heading.
      expect(expandedGroups(bar(doc))).to.deep.equal([]);
      expect(doc.activeElement).to.equal(doc.querySelector('h1'));
    }
    // Each selection is its own history entry, without a reload, in order.
    const end = nav.currentEntry.index;
    expect(end).to.equal(start + examples.length);
    expect(
      nav
        .entries()
        .slice(start + 1, end + 1)
        .map((e) => new URL(e.url!).hash),
    ).to.deep.equal([...examples].reverse().map((p) => `#${p.id}`));
    expect(doc.querySelector('playground-ide')).to.equal(ide);
  });

  it('a modified click (new tab) is left to the browser', async () => {
    const p = byId('alerts');
    const link = linkTo(bar(doc), p.id);
    let prevented: boolean | undefined;
    const spy = (e: Event) => (prevented = e.defaultPrevented);
    win.addEventListener('click', spy);
    // Stop the browser from opening a tab: a capturing listener on the target's window would
    // also run first, so cancel it after the page's own listeners, on the window, last.
    const stop = (e: Event) => e.preventDefault();
    try {
      const before = win.location.hash;
      win.addEventListener('click', stop);
      link.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true, cancelable: true, ctrlKey: true }),
      );
      expect(prevented).to.equal(false);
      expect(win.location.hash).to.equal(before);
    } finally {
      win.removeEventListener('click', spy);
      win.removeEventListener('click', stop);
    }
  });

  it('back and forward move between the chosen examples', async () => {
    const [a, b] = [byId('weekly-hours'), byId('alerts')];
    for (const p of [a, b]) {
      await chooseFromBar(doc, p);
      await expectShowing(win, doc, p);
    }
    win.history.back();
    await until(() => win.location.hash === `#${a.id}`, 'back');
    await expectShowing(win, doc, a);
    win.history.forward();
    await until(() => win.location.hash === `#${b.id}`, 'forward');
    await expectShowing(win, doc, b);
  });

  it('"Copy link" writes the current files into the URL hash', async () => {
    const current = indexHtml(ide);
    doc.querySelector<HTMLButtonElement>('#copy-link')!.click();
    await until(() => win.location.hash.startsWith('#files='), 'hash');
    const files = await decode(win.location.hash.slice('#files='.length));
    expect(files['index.html']!.content).to.equal(current);
    await until(() => doc.querySelector('[role="status"]')!.textContent!.trim() !== '', 'status');
  });

  it('"Reset" restores the current example and its #id', async () => {
    await chooseFromBar(doc, byId('theming'));
    await expectShowing(win, doc, byId('theming'));
    ide.config = { files: { 'index.html': { content: '<p>edited</p>' } } };
    await until(() => indexHtml(ide) === '<p>edited</p>', 'edited files');
    doc.querySelector<HTMLButtonElement>('#copy-link')!.click();
    await until(() => win.location.hash.startsWith('#files='), 'share hash');
    doc.querySelector<HTMLButtonElement>('#reset')!.click();
    await expectShowing(win, doc, byId('theming'));
    expect(win.location.hash).to.equal('#theming');
  });

  for (const width of [1280, 390]) {
    for (const scheme of ['light', 'dark'] as const) {
      it(`has no axe violations at ${width}px in ${scheme}, closed and open`, async () => {
        await atWidth(width, async () => {
          await chooseScheme(doc, scheme);
          try {
            await expectNoPageAxeViolations(doc, AXE_SCOPE);
            // Open what the main nav shows at this width: a bar panel, or the Menu and a group.
            if (width === 390) {
              siteHeader(doc)!.querySelector<HTMLButtonElement>('.menu-toggle')!.click();
              await until(() => menuPopover(doc).matches(':popover-open'), 'Menu open');
            }
            const n = width === 390 ? accordion(doc) : bar(doc);
            toggles(n)[1]!.click();
            await until(() => expandedGroups(n).length === 1, 'a group open');
            await expectNoPageAxeViolations(doc, AXE_SCOPE);
          } finally {
            if (menuPopover(doc).matches(':popover-open')) menuPopover(doc).hidePopover();
            for (const n of [bar(doc), accordion(doc)]) {
              for (const b of toggles(n)) if (b.getAttribute('aria-expanded') === 'true') b.click();
            }
            await chooseScheme(doc, 'system');
          }
        });
      });
    }
  }

  describe('at 390px', () => {
    // A fresh page: the tests above add an entry per example, and Chromium keeps at most 50
    // session history entries, so on the old page this push could drop the oldest instead
    // of moving the current index on by one.
    before(async () => {
      ({ win, doc } = await open('index.html'));
      ide = doc.querySelector<Ide>('playground-ide')!;
      await chromeReady(doc);
    });

    it('lists the groups as accordions in the Menu; choosing one closes the Menu', async () => {
      await atWidth(390, async () => {
        expect(bar(doc).checkVisibility()).to.equal(false);
        const toggle = siteHeader(doc)!.querySelector<HTMLButtonElement>('.menu-toggle')!;
        toggle.click();
        await until(() => menuPopover(doc).matches(':popover-open'), 'Menu open');
        const n = accordion(doc);
        expect(n.checkVisibility()).to.equal(true);
        expect(toggles(n).map((b) => b.textContent!.trim())).to.deep.equal([...GROUPS]);
        const p = byId('weekly-hours');
        const nav = navigationOf(win);
        const start = nav.currentEntry.index;
        toggles(n)
          .find((b) => b.textContent!.trim() === p.group)!
          .click();
        await until(() => linkTo(n, p.id).checkVisibility(), 'Hours group open');
        linkTo(n, p.id).click();
        await expectShowing(win, doc, p);
        expect(win.location.hash).to.equal(`#${p.id}`);
        expect(nav.currentEntry.index).to.equal(start + 1);
        expect(menuPopover(doc).matches(':popover-open')).to.equal(false);
        expect(doc.activeElement).to.equal(doc.querySelector('h1'));
      });
    });

    it('fits a 390px viewport without horizontal scrolling', async () => {
      await atWidth(390, async () => {
        expect(doc.documentElement.scrollWidth).to.be.at.most(390);
      });
    });
  });

  describe('dark mode', () => {
    // An example with two files, so the IDE shows an active and an inactive tab.
    before(async () => {
      await chooseFromBar(doc, byId('dark-mode'));
      await expectShowing(win, doc, byId('dark-mode'));
    });
    afterEach(async () => {
      await chooseScheme(doc, 'system');
      await emulateMedia({ colorScheme: 'light' });
    });

    it('has the Light / Dark / System control on the utility row', () => {
      const control = siteHeader(doc)!.querySelector('.utility-row > fieldset.color-scheme')!;
      expect(control).to.not.equal(null);
      expect(control.checkVisibility()).to.equal(true);
      expect(
        [...control.querySelectorAll<HTMLInputElement>('input[type="radio"]')].map((i) => i.value),
      ).to.deep.equal(['light', 'dark', 'system']);
    });

    it('Light keeps the colours the page had before dark mode', async () => {
      await chooseScheme(doc, 'light');
      expect(siteColors(doc)).to.deep.equal(LIGHT);
    });

    it('Dark makes the page, its controls and the editor dark, with the palette values', async () => {
      await chooseScheme(doc, 'dark');
      expect(siteColors(doc)).to.deep.equal(DARK);
    });

    it('System follows the OS setting', async () => {
      await chooseScheme(doc, 'system');
      await emulateMedia({ colorScheme: 'dark' });
      await until(
        () => siteColors(doc)['body background-color'] === DARK['body background-color'],
        'dark',
      );
      expect(siteColors(doc)).to.deep.equal(DARK);
      await emulateMedia({ colorScheme: 'light' });
      await until(
        () => siteColors(doc)['body background-color'] === LIGHT['body background-color'],
        'light',
      );
      expect(siteColors(doc)).to.deep.equal(LIGHT);
    });

    it('the dark editor theme gives every code colour 4.5:1 on the code background', async () => {
      await chooseScheme(doc, 'dark');
      const cs = getComputedStyle(ide);
      const background = rgb(cs.getPropertyValue('--playground-code-background').trim());
      const names = [...CODE_COLORS];
      for (const name of names) {
        const value = cs.getPropertyValue(`--playground-code-${name}`).trim();
        expect(value, name).to.match(/^#[0-9a-f]{6}$/);
        expect(contrast(rgb(value), background), name).to.be.at.least(4.5);
      }
      // What CodeMirror paints: the editor and its line numbers.
      const cm = editor(doc);
      expect(getComputedStyle(cm).backgroundColor).to.equal(background);
      const lineNumber = cm.querySelector('.cm-gutterElement:not(:empty)')!;
      expect(
        contrast(getComputedStyle(lineNumber).color, background),
        'line numbers',
      ).to.be.at.least(4.5);
    });
  });
});

describe('example links', function () {
  this.timeout(10000);
  after(() => iframe?.remove());

  it('#weekly-hours opens that example', async () => {
    const { win, doc } = await open('index.html#weekly-hours');
    await chromeReady(doc);
    await expectShowing(win, doc, byId('weekly-hours'));
    expect(win.location.hash).to.equal('#weekly-hours');
  });

  it('an unknown id falls back to the first example', async () => {
    const { win, doc } = await open('index.html#no-such-example');
    await chromeReady(doc);
    await expectShowing(win, doc, examples[0]!);
  });

  it('a #files= share link opens with its files and no current menu item', async () => {
    const hash = await encode({ 'index.html': { content: '<p>hi</p>' } });
    const { win, doc } = await open(`index.html#files=${hash}`);
    const ide = doc.querySelector<Ide>('playground-ide')!;
    await until(() => indexHtml(ide) === '<p>hi</p>', 'shared files');
    await chromeReady(doc);
    for (const n of [bar(doc), accordion(doc)]) {
      expect(currentIds(n)).to.deep.equal([]);
      expect(currentGroups(n)).to.deep.equal([]);
    }
    expect(win.location.hash).to.equal(`#files=${hash}`);
  });

  const badLinks: Record<string, () => Promise<string>> = {
    'is too long': async () => 'a'.repeat(256 * 1024 + 1),
    'inflates past the size limit': bombHash,
    'is not deflate data': async () => toBase64Url(new TextEncoder().encode('plain bytes')),
    'has the wrong shape': () => deflateToBase64Url(new Blob(['{"styles.css":{"content":""}}'])),
  };
  for (const [name, hash] of Object.entries(badLinks)) {
    it(`a share link that ${name} shows the error status and the first example`, async () => {
      const { win, doc } = await open(`index.html#files=${await hash()}`);
      await chromeReady(doc);
      const status = doc.querySelector('[role="status"]')!;
      await until(() => /could not be read/.test(status.textContent!), 'error status');
      await expectShowing(win, doc, examples[0]!);
      expect(win.location.hash).to.equal('');
    });
  }
});

describe('playground.html', function () {
  this.timeout(10000);
  after(() => iframe?.remove());

  it('redirects to the examples page, keeping the hash', async () => {
    const { win, doc } = await open('playground.html#weekly-hours', SITE);
    await chromeReady(doc);
    expect(win.location.hash).to.equal('#weekly-hours');
    await expectShowing(win, doc, byId('weekly-hours'));
  });

  it('redirects a share link with its query and files intact', async () => {
    const hash = await encode({ 'index.html': { content: '<p>shared</p>' } });
    const { win, doc } = await open(`playground.html?from=old#files=${hash}`, SITE);
    expect(win.location.search).to.equal('?from=old');
    expect(win.location.hash).to.equal(`#files=${hash}`);
    const ide = doc.querySelector<Ide>('playground-ide')!;
    await until(() => indexHtml(ide) === '<p>shared</p>', 'shared files');
  });

  it('has a canonical link and a no-script refresh to the examples page', async () => {
    const html = await (await fetch(`${SITE}playground.html`)).text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).to.equal('./');
    const refresh = doc.querySelector('noscript')?.innerHTML ?? '';
    expect(refresh).to.match(/http-equiv="refresh"[^>]*url=\.\//);
  });
});

// playground.html redirects to ./, so the site's directory URL must serve the page.
it('the site root serves the examples page, its main nav and dark mode written in', async () => {
  const res = await fetch(SITE);
  expect(res.ok).to.equal(true);
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const page = doc.querySelector('site-page')!;
  expect(page.hasAttribute('color-scheme-switch')).to.equal(true);
  expect(page.getAttribute('main-nav-label')).to.equal('Examples');
  // The main nav markup is in the page as served, slotted like hand-written markup.
  const source = page.querySelector(':scope > nav[slot="main-nav"]')!;
  expect(
    [...source.querySelectorAll(':scope > ul > li > span')].map((s) => s.textContent),
  ).to.deep.equal([...GROUPS]);
  expect([...source.querySelectorAll('a')].map((a) => a.getAttribute('href'))).to.deep.equal(
    examples.map((p) => `#${p.id}`),
  );
  // Dark mode's anti-flash snippet, the README's, after the linked tokens.css and base.css and
  // before any module script.
  const head = doc.head.innerHTML;
  const links = [...doc.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map((l) =>
    l.getAttribute('href'),
  );
  expect(links.slice(0, 2)).to.deep.equal(['./cdn/tokens.css', './cdn/base.css']);
  const snippet = [...doc.head.querySelectorAll('script:not([src])')].map((s) => s.textContent);
  expect(snippet).to.deep.equal([COLOR_SCHEME_SNIPPET]);
  expect(head.indexOf(COLOR_SCHEME_SNIPPET)).to.be.below(head.indexOf('type="module"'));
  for (const file of ['tokens.css', 'base.css']) {
    expect((await fetch(`${SITE}cdn/${file}`)).ok, file).to.equal(true);
  }
});
