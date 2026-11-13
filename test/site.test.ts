import { expect } from '@open-wc/testing';
import { expectNoAxeViolations } from './helpers/axe.js';
import { galleryExamples, presets, withCdnBase, type Preset } from '../site/src/presets.js';
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

// Each describe shares one loaded page: every site page starts playground-elements'
// TypeScript worker, which is heavy enough to slow test files running alongside.
let iframe: HTMLIFrameElement | undefined;

async function open(page: string): Promise<{ win: Window; doc: Document }> {
  iframe?.remove();
  iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:1200px;height:900px;border:0';
  document.body.append(iframe);
  const url = new URL(SITE + page, location.href);
  iframe.src = url.href;
  // Not the iframe's load event: that also waits for the IDEs' unpkg.com sandbox frames,
  // and these tests must not depend on unpkg being reachable. The hash is left out of the
  // comparison because the page clears an unreadable #files= link.
  const path = url.href.slice(0, url.href.length - url.hash.length);
  await until(() => {
    const doc = iframe!.contentDocument;
    return doc?.URL.startsWith(path) === true && doc.readyState !== 'loading';
  }, `${url.pathname} parsed`);
  const win = iframe.contentWindow!;
  await until(
    () => win.customElements.get('playground-ide') !== undefined,
    'playground-ide defined',
  );
  return { win, doc: iframe.contentDocument! };
}

async function expectFitsPhoneWidth(doc: Document) {
  iframe!.style.width = '390px';
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  try {
    expect(doc.documentElement.scrollWidth).to.be.at.most(390);
  } finally {
    iframe!.style.width = '1200px';
  }
}

// axe flags two rules inside playground-elements' own CodeMirror editor, which offers no
// hook for them: aria-input-field-name (.cm-content) and scrollable-region-focusable
// (.cm-scroller). Only that third-party subtree is excluded; the site chrome is audited.
const AXE_SCOPE = { exclude: [['playground-ide']] };

const indexHtml = (ide: Ide) => ide.config?.files?.['index.html']?.content;
const expected = (win: Window, p: Preset) =>
  withCdnBase(p, new URL('cdn/', win.location.href).href).files['index.html']!.content;

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
    () => siteHeader(doc)?.querySelector('nav[aria-label="Playground"] a') != null,
    'site-page header with the site links',
  );
}

function expectChrome(doc: Document, current: string) {
  // One <main>, the one site-page renders; the page has no chrome of its own.
  expect(deepAll(doc, 'main').length).to.equal(1);
  expect(doc.querySelectorAll('main, header, nav[aria-label="Site"], .skip-link').length).to.equal(
    0,
  );
  const header = siteHeader(doc)!;
  for (const selector of ['nav.inline', '[popover]']) {
    const links = [...header.querySelectorAll(`${selector} a`)];
    expect(
      links.map((a) => a.textContent!.trim()),
      selector,
    ).to.deep.equal(['Gallery', 'Playground', 'README']);
    expect(
      links.find((a) => a.getAttribute('aria-current') === 'page')?.textContent!.trim(),
    ).to.equal(current);
    expect((links[2] as HTMLAnchorElement).href).to.equal(
      'https://github.com/uvalib/reusable-web-library#readme',
    );
  }
  expect(header.querySelector('nav.inline')!.getAttribute('aria-label')).to.equal('Playground');
  expect(header.querySelector('nav[aria-label="Utility"]')).to.equal(null);
  // The page content lands in that single <main>.
  const h1 = doc.querySelector('site-page > h1')!;
  expect(h1.assignedSlot?.closest('main')).to.not.equal(null);
  // The playground is a tool page, so it leaves the site footer off; the gallery keeps it.
  const footer = doc.querySelector('site-page')!.shadowRoot!.querySelector('site-footer')!;
  expect(getComputedStyle(footer).display).to.equal(current === 'Playground' ? 'none' : 'block');
}

function expectDefaultSandbox(doc: Document) {
  for (const ide of doc.querySelectorAll<Ide>('playground-ide')) {
    expect(ide.hasAttribute('sandbox-base-url')).to.equal(false);
    expect(ide.sandboxBaseUrl).to.match(/^https:\/\/unpkg\.com\/playground-elements@/);
  }
}

describe('playground page', function () {
  this.timeout(10000); // full site pages: the playground-elements bundle and its IDEs
  let win: Window;
  let doc: Document;
  let ide: Ide;
  let select: HTMLSelectElement;
  before(async () => {
    ({ win, doc } = await open('playground.html'));
    ide = doc.querySelector<Ide>('playground-ide')!;
    select = doc.querySelector('select')!;
  });
  after(() => iframe?.remove());

  it('has the site chrome, a labelled preset select and the default sandbox', async () => {
    await chromeReady(doc);
    expectChrome(doc, 'Playground');
    for (const attr of ['resizable', 'line-numbers', 'editable-file-system']) {
      expect(ide.hasAttribute(attr), attr).to.equal(true);
    }
    expect(select.labels?.[0]?.textContent).to.match(/preset/i);
    expect([...select.options].map((o) => o.value)).to.deep.equal(presets.map((p) => p.id));
    expect(doc.querySelector('button#copy-link')?.textContent).to.match(/copy link/i);
    expect(doc.querySelector('button#reset')?.textContent).to.match(/reset/i);
    expectDefaultSandbox(doc);
  });

  it('sizes the IDE from its measured top (--ide-top)', async () => {
    await chromeReady(doc);
    const top = () => Math.round(ide.getBoundingClientRect().top + win.scrollY);
    await until(
      () => doc.documentElement.style.getPropertyValue('--ide-top') === `${top()}px`,
      '--ide-top set to the IDE top',
    );
    const gap = 1.5 * parseFloat(getComputedStyle(doc.documentElement).fontSize);
    const height = ide.getBoundingClientRect().height;
    const minimum = 28 * parseFloat(getComputedStyle(doc.documentElement).fontSize);
    expect(height).to.be.closeTo(Math.max(minimum, win.innerHeight - top() - gap), 1);
  });

  it('starts with the first preset', async () => {
    await until(() => indexHtml(ide) === expected(win, presets[0]!), 'first preset');
  });

  it('selecting each preset loads its files into the IDE', async () => {
    for (const p of [...presets].reverse()) {
      select.value = p.id;
      select.dispatchEvent(new Event('change'));
      await until(() => indexHtml(ide) === expected(win, p), `preset ${p.id}`);
      expect(indexHtml(ide)).to.include(new URL('cdn/site-page.js', win.location.href).href);
    }
  });

  it('"Copy link" writes the current files into the URL hash', async () => {
    const current = indexHtml(ide);
    doc.querySelector<HTMLButtonElement>('#copy-link')!.click();
    await until(() => win.location.hash.startsWith('#files='), 'hash');
    const files = await decode(win.location.hash.slice('#files='.length));
    expect(files['index.html']!.content).to.equal(current);
    await until(() => doc.querySelector('[role="status"]')!.textContent!.trim() !== '', 'status');
  });

  it('"Reset" restores the selected preset and clears the link', async () => {
    ide.config = { files: { 'index.html': { content: '<p>edited</p>' } } };
    await until(() => indexHtml(ide) === '<p>edited</p>', 'edited files');
    select.value = 'theming';
    doc.querySelector<HTMLButtonElement>('#reset')!.click();
    const theming = presets.find((p) => p.id === 'theming')!;
    await until(() => indexHtml(ide) === expected(win, theming), 'reset');
    expect(win.location.hash).to.equal('');
  });

  it('has no serious or critical axe violations in the site chrome', async () => {
    await expectNoAxeViolations(doc.body, undefined, AXE_SCOPE);
  });

  it('fits a 390px viewport without horizontal scrolling', async () => {
    await expectFitsPhoneWidth(doc);
  });
});

describe('playground share link', function () {
  this.timeout(10000);
  after(() => iframe?.remove());

  it('starts from the files in a #files= link', async () => {
    const hash = await encode({ 'index.html': { content: '<p>hi</p>' } });
    const { doc } = await open(`playground.html#files=${hash}`);
    const ide = doc.querySelector<Ide>('playground-ide')!;
    await until(() => indexHtml(ide) === '<p>hi</p>', 'shared files');
  });

  const badLinks: Record<string, () => Promise<string>> = {
    'is too long': async () => 'a'.repeat(256 * 1024 + 1),
    'inflates past the size limit': bombHash,
    'is not deflate data': async () => toBase64Url(new TextEncoder().encode('plain bytes')),
    'has the wrong shape': () => deflateToBase64Url(new Blob(['{"styles.css":{"content":""}}'])),
  };
  for (const [name, hash] of Object.entries(badLinks)) {
    it(`a link that ${name} shows the error status and the first preset`, async () => {
      const { win, doc } = await open(`playground.html#files=${await hash()}`);
      const status = doc.querySelector('[role="status"]')!;
      await until(() => /could not be read/.test(status.textContent!), 'error status');
      const ide = doc.querySelector<Ide>('playground-ide')!;
      await until(() => indexHtml(ide) === expected(win, presets[0]!), 'first preset');
      expect(win.location.hash).to.equal('');
    });
  }
});

describe('gallery page', function () {
  this.timeout(15000); // mounts every gallery IDE in turn
  let win: Window;
  let doc: Document;
  before(async () => {
    ({ win, doc } = await open('index.html'));
  });
  after(() => iframe?.remove());

  it('has one section per preset and header variant, each with an IDE', async () => {
    await chromeReady(doc);
    expectChrome(doc, 'Gallery');
    const examples = [...presets, ...galleryExamples];
    const sections = [...doc.querySelectorAll('#examples > section')];
    expect(sections.length).to.equal(examples.length);
    examples.forEach((p, i) => {
      const s = sections[i]!;
      expect(s.querySelector('h2')!.textContent!.trim()).to.equal(p.title);
      expect(s.querySelector('p')!.textContent!.trim()).to.equal(p.description);
      expect(s.getAttribute('aria-labelledby')).to.equal(s.querySelector('h2')!.id);
    });
    // IDEs mount as their sections near the viewport.
    for (const [i, s] of sections.entries()) {
      s.scrollIntoView();
      await until(() => s.querySelector('playground-ide') !== null, `IDE ${i + 1} mounted`);
      const ide = s.querySelector<Ide>('playground-ide')!;
      await until(() => indexHtml(ide) === expected(win, examples[i]!), `IDE ${i + 1} config`);
    }
    expectDefaultSandbox(doc);
  });

  it('has no serious or critical axe violations in the site chrome', async () => {
    await expectNoAxeViolations(doc.body, undefined, AXE_SCOPE);
  });

  it('fits a 390px viewport without horizontal scrolling', async () => {
    await expectFitsPhoneWidth(doc);
  });
});
