// Issue #7: `hidden` hides every element that uses a base.css (or pagefind.css) class, though
// the classes set `display`. Read from the built stylesheets, as a host page links them.
import { expect } from '@open-wc/testing';
import { HIDDEN_CLASSES } from '../src/styles/hidden.js';

const CDN = `${location.origin}/dist-cdn/`;

async function frame(body: string): Promise<HTMLIFrameElement> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width: 800px; height: 600px; border: 0';
  iframe.srcdoc = `<!doctype html><html lang="en"><head><title>Hidden</title>
    <link rel="stylesheet" href="${CDN}base.css" />
    <link rel="stylesheet" href="${CDN}pagefind.css" /></head>
    <body>${body}</body></html>`;
  document.body.append(iframe);
  await new Promise((r) => iframe.addEventListener('load', r, { once: true }));
  return iframe;
}

/** The style rules of a stylesheet, inside @media and @supports too. */
function* styleRules(rules: CSSRuleList): Generator<CSSStyleRule> {
  for (const r of rules) {
    if (r instanceof CSSStyleRule) yield r;
    else if ('cssRules' in r) yield* styleRules((r as CSSGroupingRule).cssRules);
  }
}

/** Every `.uvalib-*` class named by a rule that sets a display other than none. */
async function displayClasses(file: string): Promise<Set<string>> {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(await (await fetch(`${CDN}${file}`)).text());
  const out = new Set<string>();
  for (const rule of styleRules(sheet.cssRules)) {
    const display = rule.style.getPropertyValue('display');
    if (!display || display === 'none' || rule.selectorText.includes('[hidden]')) continue;
    // Every block or element class the selector names, outside :not() (which only excludes);
    // modifiers ride on their block class.
    let sel = rule.selectorText;
    for (let prev = ''; prev !== sel;) [prev, sel] = [sel, sel.replace(/:not\([^()]*\)/g, '')];
    for (const m of sel.matchAll(/\.(uvalib-[\w-]+)/g)) if (!m[1]!.includes('--')) out.add(m[1]!);
  }
  return out;
}

describe('hidden hides base.css classes (issue #7)', function () {
  this.timeout(8000);
  let iframe: HTMLIFrameElement | undefined;
  afterEach(() => iframe?.remove());

  it('lists every class whose rules set display', async () => {
    const found = await displayClasses('base.css');
    const missing = [...found].filter((c) => !HIDDEN_CLASSES.includes(c));
    expect(missing).to.deep.equal([]);
    // And the pagefind.css label (its own rule there).
    expect([...(await displayClasses('pagefind.css'))]).to.include('uvalib-pagefind-search__label');
  });

  it('every listed class is hidden by hidden, on a div and on a button, link and input', async () => {
    iframe = await frame(
      `<main>${HIDDEN_CLASSES.map(
        (c) =>
          `<div class="${c}" hidden data-c="${c}">x</div><button class="${c}" hidden data-c="${c} button">x</button>`,
      ).join('')}
      <a class="uvalib-button" href="#x" hidden data-c="a.uvalib-button">x</a>
      <a class="uvalib-button uvalib-button--secondary uvalib-button--small" href="#x" hidden data-c="secondary small">x</a>
      <button class="uvalib-button" aria-pressed="true" hidden data-c="toggle">x</button>
      <input class="uvalib-input" hidden data-c="input" />
      <form class="uvalib-search-form"><input class="uvalib-input" hidden data-c="form input" /></form>
      <div class="uvalib-media"><img alt="" hidden data-c="media img" /></div>
      <span class="uvalib-pagefind-search__label" hidden data-c="pagefind label">x</span>
      <uvalib-pagefind-search hidden data-c="uvalib-pagefind-search"></uvalib-pagefind-search>
      <ul class="uvalib-result-list"><li class="uvalib-result" hidden data-c="li result">x</li></ul>
      </main>`,
    );
    const doc = iframe.contentDocument!;
    const nodes = [...doc.querySelectorAll('[data-c]')];
    expect(nodes.length).to.equal(HIDDEN_CLASSES.length * 2 + 9);
    for (const n of nodes)
      expect(getComputedStyle(n).display, n.getAttribute('data-c')!).to.equal('none');
    // Not hidden: still shown with each class's own display.
    for (const n of nodes) n.removeAttribute('hidden');
    for (const c of ['uvalib-button', 'uvalib-search-form', 'uvalib-message', 'uvalib-result'])
      expect(getComputedStyle(doc.querySelector(`div.${c}`)!).display, c).to.not.equal('none');
  });

  it('pre-upgrade rules: an undefined element with hidden is hidden', async () => {
    const tags = [
      'site-page',
      'uvalib-breadcrumbs',
      'uvalib-card',
      'uvalib-card-grid',
      'uvalib-pager',
      'uvalib-contents',
      'uvalib-metadata',
      'uvalib-tag-list',
      'uvalib-results-count',
      'uvalib-chip-group',
      'uvalib-tabs',
      'uvalib-combobox',
      'uvalib-image-regions',
      'uvalib-map',
    ];
    iframe = await frame(
      `${tags.map((t) => `<${t} hidden data-c="${t}">x</${t}>`).join('')}
      <uvalib-combobox><input hidden data-c="combobox input" /></uvalib-combobox>
      <uvalib-image-regions><img alt="" hidden data-c="regions img" /></uvalib-image-regions>`,
    );
    for (const n of iframe.contentDocument!.querySelectorAll('[data-c]'))
      expect(getComputedStyle(n).display, n.getAttribute('data-c')!).to.equal('none');
  });

  it('is scoped: base.css does not hide other [hidden] content a host page shows', async () => {
    iframe = await frame(
      `<style>.shown-anyway[hidden] { display: block; }</style>
      <div class="shown-anyway" hidden id="host">host content</div>`,
    );
    const el = iframe.contentDocument!.getElementById('host')!;
    expect(getComputedStyle(el).display).to.equal('block');
  });
});
