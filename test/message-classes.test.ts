// base.css's inline message (.uvalib-message, issue #8), checked in an iframe that links only
// the built stylesheets (dist-cdn), as a host page would.
import { expect } from '@open-wc/testing';
import { emulateMedia } from '@web/test-runner-commands';
import { expectNoAxeViolations } from './helpers/axe.js';
import { wrapStyle } from './helpers/text-wrap.js';

const KINDS = ['error', 'warning', 'info', 'notice', 'success', 'plain'] as const;

const SAMPLE = `<main><h1>Search</h1>
  <div class="uvalib-message uvalib-message--error" role="alert" id="error">
    <strong class="uvalib-message__label">Error:</strong> the search could not be run.
    <a href="#retry" id="link">Try again</a>
  </div>
  <div class="uvalib-message uvalib-message--warning" id="warning">
    <p><strong class="uvalib-message__label">Warning:</strong> some results may be missing.</p>
  </div>
  <div class="uvalib-message uvalib-message--info" role="status" id="info">
    <svg class="uvalib-message__icon" id="icon" aria-hidden="true" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor"/></svg>
    <strong class="uvalib-message__label">Note:</strong> these are keyword results.
  </div>
  <div class="uvalib-message uvalib-message--notice" id="notice"><strong class="uvalib-message__label">Note:</strong> a notice.</div>
  <div class="uvalib-message uvalib-message--success" id="success"><strong class="uvalib-message__label">Done:</strong> saved.</div>
  <div class="uvalib-message" id="plain"><strong class="uvalib-message__label">Note:</strong> plain.</div>
  <p id="after">After.</p>
</main>`;

async function frame(
  { dark = false, width = 800, tokens = true } = {},
  body = SAMPLE,
): Promise<HTMLIFrameElement> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `width: ${width}px; height: 900px; border: 0`;
  const cdn = `${location.origin}/dist-cdn/`;
  iframe.srcdoc = `<!doctype html><html lang="en" ${dark ? 'data-uva-color-scheme="dark"' : ''}>
    <head><title>Messages</title>
    ${tokens ? `<link rel="stylesheet" href="${cdn}tokens.css" />` : ''}
    <link rel="stylesheet" href="${cdn}base.css" /></head>
    <body>${body}</body></html>`;
  document.body.append(iframe);
  await new Promise((r) => iframe.addEventListener('load', r, { once: true }));
  iframe.contentDocument!.addEventListener('click', (e) => e.preventDefault(), true);
  return iframe;
}

const channels = (c: string) => c.match(/[\d.]+/g)!.map(Number);
const lum = (c: string) => {
  const [r, g, b] = channels(c)
    .slice(0, 3)
    .map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

describe('base.css .uvalib-message', function () {
  this.timeout(8000);
  let iframe: HTMLIFrameElement;
  let doc: Document;
  let win: Window;
  const $ = (id: string) => doc.getElementById(id)!;
  const cs = (id: string) => win.getComputedStyle($(id));
  const open = async (opts?: Parameters<typeof frame>[0], body?: string) => {
    iframe = await frame(opts, body);
    doc = iframe.contentDocument!;
    win = iframe.contentWindow!;
  };

  afterEach(async () => {
    iframe?.remove();
    await emulateMedia({ forcedColors: 'none', colorScheme: 'light' });
  });

  for (const [dark, tokens] of [
    [false, true],
    [true, true],
    [false, false],
    [true, false],
  ] as const) {
    describe(`${dark ? 'dark' : 'light'}${tokens ? '' : ', base.css alone'}`, () => {
      beforeEach(() => open({ dark, tokens }));

      it('text and links reach 7:1 (AAA) on every kind', () => {
        for (const id of KINDS) {
          const s = cs(id);
          expect(s.backgroundColor, id).to.not.equal('rgba(0, 0, 0, 0)');
          expect(contrast(s.color, s.backgroundColor), id).to.be.at.least(7);
        }
        const link = win.getComputedStyle($('link'));
        expect(contrast(link.color, cs('error').backgroundColor)).to.be.at.least(7);
        expect(link.textDecorationLine).to.equal('underline');
      });

      it('each kind has its own colours, and notice is info', () => {
        const look = (id: string) => `${cs(id).backgroundColor} ${cs(id).borderLeftColor}`;
        const kinds = ['error', 'warning', 'info', 'success'].map(look);
        expect(new Set(kinds).size).to.equal(4);
        expect(look('notice')).to.equal(look('info'));
        expect(look('plain')).to.equal(look('info'));
      });

      it('has no axe violations', async () => {
        await expectNoAxeViolations(doc.documentElement);
      });
    });
  }

  it('matches <site-alerts> list alerts: the alert colours and a thick start border', async () => {
    await open();
    expect(cs('error').backgroundColor).to.equal('rgb(251, 207, 218)');
    expect(cs('error').borderLeftColor).to.equal('rgb(179, 0, 0)');
    expect(cs('warning').backgroundColor).to.equal('rgb(254, 246, 200)');
    expect(cs('info').backgroundColor).to.equal('rgb(191, 231, 247)');
    expect(cs('success').backgroundColor).to.equal('rgb(221, 239, 220)');
    expect(cs('error').borderLeftWidth).to.equal('6px');
    expect(cs('error').display).to.equal('block');
  });

  it('is inline content size: no outer margins on its first and last child, text at body size', async () => {
    await open();
    const p = win.getComputedStyle(doc.querySelector('#warning p')!);
    expect([p.marginTop, p.marginBottom]).to.deep.equal(['0px', '0px']);
    expect(cs('error').fontSize).to.equal(win.getComputedStyle(doc.body).fontSize);
    expect(
      win.getComputedStyle(doc.querySelector('#error .uvalib-message__label')!).fontWeight,
    ).to.equal('700');
    expect($('icon').getBoundingClientRect().width).to.be.closeTo(17 * 1.25, 0.5);
  });

  it('severity is in the text, not colour alone', async () => {
    await open();
    for (const id of KINDS)
      expect($(id).querySelector('.uvalib-message__label')!.textContent!.trim(), id).to.match(/:$/);
    expect($('error').getAttribute('role')).to.equal('alert');
    expect($('info').getAttribute('role')).to.equal('status');
  });

  it('wraps its text pretty (no one-word last line), never balanced in its box', async () => {
    await open();
    const pretty = wrapStyle($('error'), 'pretty');
    if (pretty !== null) expect(pretty).to.equal('pretty');
  });

  it('reflows at 320px with no horizontal scroll', async () => {
    await open({ width: 320 });
    for (const id of KINDS) expect($(id).getBoundingClientRect().right, id).to.be.at.most(320);
    expect(doc.documentElement.scrollWidth).to.be.at.most(320);
  });

  it('forced colors: every message keeps a visible border, thicker at the start', async () => {
    await emulateMedia({ forcedColors: 'active' });
    await open();
    for (const id of KINDS) {
      const s = cs(id);
      for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
        expect(s[`border${side}Style`], `${id} ${side}`).to.equal('solid');
        expect(s[`border${side}Color`], `${id} ${side}`).to.not.equal('rgba(0, 0, 0, 0)');
        expect(s[`border${side}Color`], `${id} ${side}`).to.not.equal(s.backgroundColor);
      }
      expect(s.borderLeftWidth, id).to.equal('6px');
    }
    await expectNoAxeViolations(doc.documentElement);
  });

  it('the link focus ring follows the text colour', async () => {
    await open();
    $('link').focus();
    const s = win.getComputedStyle($('link'));
    // :focus-visible after a script focus() on a link is the browser's call; read the rule.
    const rule = [...doc.styleSheets]
      .flatMap((sh) => [...sh.cssRules])
      .find((r) => (r as CSSStyleRule).selectorText === '.uvalib-message a:focus-visible') as
      CSSStyleRule | undefined;
    expect(rule?.style.outline).to.contain('currentcolor');
    expect(contrast(s.color, cs('error').backgroundColor)).to.be.at.least(3);
  });
});
