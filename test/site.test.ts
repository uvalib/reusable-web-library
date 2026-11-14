import { expect } from '@open-wc/testing';
import { expectNoAxeViolations } from './helpers/axe.js';
import { examples, GROUPS, withCdnBase, type Preset } from '../site/src/presets.js';
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

/** Wait for <site-page> to render its header with the site links. */
async function chromeReady(doc: Document): Promise<void> {
  await until(
    () => siteHeader(doc)?.querySelector('nav[aria-label="Web components"] a') != null,
    'site-page header with the site links',
  );
}

const menu = (doc: Document) => doc.querySelector<HTMLElement>('nav[aria-label="Examples"]')!;
const menuLinks = (doc: Document) => [...menu(doc).querySelectorAll<HTMLAnchorElement>('a')];
const currentIds = (doc: Document) =>
  menuLinks(doc)
    .filter((a) => a.getAttribute('aria-current') === 'page')
    .map((a) => a.hash.slice(1));
const picker = (doc: Document) => doc.querySelector<HTMLSelectElement>('select#example-select')!;

/** Wait until the page shows example `p`: its files, heading, menu item and select option. */
async function expectShowing(win: Window, doc: Document, p: Preset) {
  const ide = doc.querySelector<Ide>('playground-ide')!;
  await until(() => indexHtml(ide) === expected(win, p), `${p.id} files`);
  expect(doc.querySelector('h1')!.textContent!.trim()).to.equal(p.title);
  expect(doc.querySelector('#example-description')!.textContent!.trim()).to.equal(p.description);
  expect(currentIds(doc)).to.deep.equal([p.id]);
  expect(picker(doc).value).to.equal(p.id);
  expect(doc.title).to.include(p.title);
  // Only ever one IDE: switching examples reuses it.
  expect(deepAll(doc, 'playground-ide').length).to.equal(1);
}

describe('examples page', function () {
  this.timeout(15000); // the full site page: the playground-elements bundle and its IDE
  let win: Window;
  let doc: Document;
  let ide: Ide;
  before(async () => {
    ({ win, doc } = await open('index.html'));
    ide = doc.querySelector<Ide>('playground-ide')!;
    await chromeReady(doc);
  });
  after(() => iframe?.remove());

  it('has the site chrome, with Examples current and README, and no footer', () => {
    // One <main>, the one site-page renders; the page has no chrome of its own.
    expect(deepAll(doc, 'main').length).to.equal(1);
    expect(doc.querySelectorAll('main, header, .skip-link').length).to.equal(0);
    const header = siteHeader(doc)!;
    for (const selector of ['nav.inline', '[popover]']) {
      const links = [...header.querySelectorAll<HTMLAnchorElement>(`${selector} a`)];
      expect(
        links.map((a) => a.textContent!.trim()),
        selector,
      ).to.deep.equal(['Examples', 'README']);
      expect(links[0]!.getAttribute('aria-current')).to.equal('page');
      expect(links[1]!.href).to.equal('https://github.com/uvalib/reusable-web-library#readme');
    }
    expect(header.querySelector('nav[aria-label="Utility"]')).to.equal(null);
    // The menu and the example's heading land in that single <main>.
    for (const el of [menu(doc), doc.querySelector('h1')!]) {
      let top: Element = el;
      while (top.parentElement?.localName !== 'site-page') top = top.parentElement!;
      expect(top.assignedSlot?.closest('main')).to.not.equal(null);
    }
    // A tool page: site-page no-footer.
    const footer = doc.querySelector('site-page')!.shadowRoot!.querySelector('site-footer')!;
    expect(getComputedStyle(footer).display).to.equal('none');
  });

  it('the menu lists every example exactly once, under its group heading', () => {
    const nav = menu(doc);
    expect(getComputedStyle(nav).display).to.not.equal('none');
    const headings = [...nav.querySelectorAll('h2')];
    expect(headings.map((h) => h.textContent!.trim())).to.deep.equal([...GROUPS]);
    for (const [i, h] of headings.entries()) {
      const list = h.nextElementSibling!;
      expect(list.localName).to.equal('ul');
      expect(list.getAttribute('aria-labelledby')).to.equal(h.id);
      const want = examples.filter((p) => p.group === GROUPS[i]);
      const links = [...list.querySelectorAll<HTMLAnchorElement>(':scope > li > a')];
      expect(links.map((a) => a.getAttribute('href'))).to.deep.equal(want.map((p) => `#${p.id}`));
      expect(links.map((a) => a.textContent!.trim())).to.deep.equal(want.map((p) => p.title));
    }
    expect(menuLinks(doc).map((a) => a.hash)).to.deep.equal(examples.map((p) => `#${p.id}`));
  });

  it('has one editable IDE on the default sandbox, plus Reset and Copy link', () => {
    for (const attr of ['resizable', 'line-numbers', 'editable-file-system']) {
      expect(ide.hasAttribute(attr), attr).to.equal(true);
    }
    expect(ide.hasAttribute('sandbox-base-url')).to.equal(false);
    expect(ide.sandboxBaseUrl).to.match(/^https:\/\/unpkg\.com\/playground-elements@/);
    expect(doc.querySelector('button#copy-link')?.textContent).to.match(/copy link/i);
    expect(doc.querySelector('button#reset')?.textContent).to.match(/reset/i);
  });

  it('starts with the first example', async () => {
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

  it('clicking an item swaps the IDE files, updates the hash and sets aria-current', async () => {
    const length = win.history.length;
    for (const p of [...examples].reverse()) {
      menuLinks(doc)
        .find((a) => a.hash === `#${p.id}`)!
        .click();
      await expectShowing(win, doc, p);
      expect(win.location.hash).to.equal(`#${p.id}`);
      expect(indexHtml(ide)).to.include(new URL('cdn/site-page.js', win.location.href).href);
    }
    // Each selection is its own history entry, without a reload.
    expect(win.history.length).to.equal(length + examples.length);
    expect(doc.querySelector('playground-ide')).to.equal(ide);
  });

  it('back and forward move between the selected examples', async () => {
    const [a, b] = [byId('weekly-hours'), byId('alerts')];
    for (const p of [a, b]) {
      menuLinks(doc)
        .find((l) => l.hash === `#${p.id}`)!
        .click();
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
    menuLinks(doc)
      .find((a) => a.hash === '#theming')!
      .click();
    await expectShowing(win, doc, byId('theming'));
    ide.config = { files: { 'index.html': { content: '<p>edited</p>' } } };
    await until(() => indexHtml(ide) === '<p>edited</p>', 'edited files');
    doc.querySelector<HTMLButtonElement>('#copy-link')!.click();
    await until(() => win.location.hash.startsWith('#files='), 'share hash');
    doc.querySelector<HTMLButtonElement>('#reset')!.click();
    await expectShowing(win, doc, byId('theming'));
    expect(win.location.hash).to.equal('#theming');
  });

  it('has no serious or critical axe violations in the site chrome', async () => {
    await expectNoAxeViolations(doc.body, undefined, AXE_SCOPE);
  });

  describe('below 48rem', () => {
    it('replaces the menu with a labelled select, grouped with optgroups', async () => {
      await atWidth(390, async () => {
        const select = picker(doc);
        expect(getComputedStyle(menu(doc)).display).to.equal('none');
        expect(getComputedStyle(select).display).to.not.equal('none');
        expect(select.labels?.[0]?.textContent).to.match(/example/i);
        // The select sits above the editor.
        expect(select.getBoundingClientRect().bottom).to.be.at.most(
          ide.getBoundingClientRect().top,
        );
        const groups = [...select.querySelectorAll('optgroup')];
        expect(groups.map((g) => g.label)).to.deep.equal([...GROUPS]);
        for (const [i, g] of groups.entries()) {
          expect([...g.querySelectorAll('option')].map((o) => o.value)).to.deep.equal(
            examples.filter((p) => p.group === GROUPS[i]).map((p) => p.id),
          );
        }
        expect(select.options.length).to.equal(examples.length);
      });
    });

    it('choosing an option opens that example and adds a history entry', async () => {
      await atWidth(390, async () => {
        const select = picker(doc);
        const before = win.location.hash;
        select.value = 'weekly-hours';
        const length = win.history.length;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        await until(() => win.location.hash === '#weekly-hours', 'hash');
        await expectShowing(win, doc, byId('weekly-hours'));
        expect(win.history.length).to.equal(length + 1);
        win.history.back();
        await until(() => win.location.hash === before, 'back');
        expect(select.value).to.equal(before.slice(1));
      });
    });

    it('fits a 390px viewport without horizontal scrolling', async () => {
      await atWidth(390, async () => {
        expect(doc.documentElement.scrollWidth).to.be.at.most(390);
      });
    });

    it('has no serious or critical axe violations', async () => {
      await atWidth(390, async () => {
        await expectNoAxeViolations(doc.body, undefined, AXE_SCOPE);
      });
    });
  });
});

describe('example links', function () {
  this.timeout(10000);
  after(() => iframe?.remove());

  it('#weekly-hours opens that example', async () => {
    const { win, doc } = await open('index.html#weekly-hours');
    await expectShowing(win, doc, byId('weekly-hours'));
    expect(win.location.hash).to.equal('#weekly-hours');
  });

  it('an unknown id falls back to the first example', async () => {
    const { win, doc } = await open('index.html#no-such-example');
    await expectShowing(win, doc, examples[0]!);
  });

  it('a #files= share link opens with its files and no current menu item', async () => {
    const hash = await encode({ 'index.html': { content: '<p>hi</p>' } });
    const { win, doc } = await open(`index.html#files=${hash}`);
    const ide = doc.querySelector<Ide>('playground-ide')!;
    await until(() => indexHtml(ide) === '<p>hi</p>', 'shared files');
    expect(currentIds(doc)).to.deep.equal([]);
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
it('the site root serves the examples page', async () => {
  const res = await fetch(SITE);
  expect(res.ok).to.equal(true);
  expect(await res.text()).to.include('aria-label="Examples"');
});
