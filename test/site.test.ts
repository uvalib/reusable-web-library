import { expect } from '@open-wc/testing';
import { expectNoAxeViolations } from './helpers/axe.js';
import { galleryExamples, presets, withCdnBase, type Preset } from '../site/src/presets.js';
import { decode, encode } from '../site/src/share.js';

// Runs against the built site (`pnpm build:site --base /dist-site/`, part of `pnpm test`),
// in a separate serial wtr pass (`pnpm test:browser`) so its IDEs do not slow other files.
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
  const loaded = new Promise((r) => iframe!.addEventListener('load', r, { once: true }));
  iframe.src = SITE + page;
  await loaded;
  const win = iframe.contentWindow!;
  await Promise.race([
    win.customElements.whenDefined('playground-ide'),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('playground-ide undefined')), 5000),
    ),
  ]);
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

function expectChrome(doc: Document, current: string) {
  expect(doc.querySelectorAll('main').length).to.equal(1);
  const nav = doc.querySelector('nav[aria-label="Site"]')!;
  expect(nav).to.not.equal(null);
  const links = [...nav.querySelectorAll('a')];
  expect(links.map((a) => a.textContent!.trim())).to.deep.equal([
    'Gallery',
    'Playground',
    'README',
  ]);
  expect(
    links.find((a) => a.getAttribute('aria-current') === 'page')?.textContent!.trim(),
  ).to.equal(current);
  expect(links[2]!.href).to.equal('https://github.com/uvalib/reusable-web-library#readme');
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

  it('has the site chrome, a labelled preset select and the default sandbox', () => {
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
    expectChrome(doc, 'Gallery');
    const examples = [...presets, ...galleryExamples];
    const sections = [...doc.querySelectorAll('main section')];
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
