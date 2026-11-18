// base.css's button, toggle and form classes for host content, checked in an iframe that
// links only the built stylesheets (dist-cdn), as a host page would.
import { expect } from '@open-wc/testing';
import { emulateMedia } from '@web/test-runner-commands';
import { expectNoAxeViolations } from './helpers/axe.js';

const SAMPLE = `
  <main>
    <h1>Electronic Text Collections</h1>
    <form class="uvalib-search-form" role="search" action="#">
      <label for="q">Search the collections</label>
      <input class="uvalib-input" id="q" name="q" type="search" />
      <button class="uvalib-button" type="submit">Search</button>
    </form>
    <p>
      <button class="uvalib-button" id="primary" type="button">Primary</button>
      <button class="uvalib-button uvalib-button--secondary" id="secondary" type="button">Secondary</button>
      <button class="uvalib-button uvalib-button--subtle" id="subtle" type="button">Subtle</button>
      <a class="uvalib-button" id="link" href="#top">Link button</a>
      <a class="uvalib-button uvalib-button--secondary" id="link2" href="#top">Outline link</a>
    </p>
    <p>
      <button class="uvalib-button uvalib-button--small" id="small" type="button">Small</button>
      <button class="uvalib-button uvalib-button--large" id="large" type="button">Large</button>
      <button class="uvalib-button" id="disabled" type="button" disabled>Disabled</button>
      <button class="uvalib-button uvalib-button--secondary" id="adisabled" type="button" aria-disabled="true">Busy</button>
      <input class="uvalib-input" id="dinput" aria-label="Disabled field" disabled />
    </p>
    <p>
      <button class="uvalib-button" id="off" type="button" aria-pressed="false">Show original line breaks</button>
      <button class="uvalib-button" id="on" type="button" aria-pressed="true">Show original line breaks</button>
    </p>
    <events-section><button class="uvalib-button" id="own" type="button">Retry</button></events-section>
  </main>`;

async function frame(
  { dark = false, width = 800 }: { dark?: boolean; width?: number } = {},
  body = SAMPLE,
): Promise<HTMLIFrameElement> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `width: ${width}px; height: 700px; border: 0`;
  const cdn = `${location.origin}/dist-cdn/`;
  iframe.srcdoc = `<!doctype html><html lang="en" ${dark ? 'data-uva-color-scheme="dark"' : ''}>
    <head><title>Controls</title>
    <link rel="stylesheet" href="${cdn}tokens.css" />
    <link rel="stylesheet" href="${cdn}base.css" /></head>
    <body>${body}</body></html>`;
  document.body.append(iframe);
  await new Promise((r) => iframe.addEventListener('load', r, { once: true }));
  return iframe;
}

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

describe('base.css buttons and forms', function () {
  this.timeout(8000);
  let iframe: HTMLIFrameElement;
  let doc: Document;
  let win: Window;
  const $ = (id: string) => doc.getElementById(id)!;
  const cs = (id: string, pseudo?: string) => win.getComputedStyle($(id), pseudo);

  afterEach(async () => {
    iframe?.remove();
    await emulateMedia({ forcedColors: 'none', colorScheme: 'light' });
  });

  describe('light', () => {
    beforeEach(async () => {
      iframe = await frame();
      doc = iframe.contentDocument!;
      win = iframe.contentWindow!;
    });

    it("primary is the library's blue-alt button, at least 44px tall", () => {
      const s = cs('primary');
      expect(s.backgroundColor).to.equal('rgb(0, 123, 172)');
      expect(s.color).to.equal('rgb(255, 255, 255)');
      expect(s.borderRadius).to.equal('5px');
      expect(s.cursor).to.equal('pointer');
      expect($('primary').getBoundingClientRect().height).to.be.at.least(44);
      expect(contrast(s.color, s.backgroundColor)).to.be.at.least(4.5);
      // A link styled as a button looks the same, with no underline.
      const a = cs('link');
      expect([a.backgroundColor, a.color, a.textDecorationLine]).to.deep.equal([
        s.backgroundColor,
        s.color,
        'none',
      ]);
    });

    it('secondary is an outline, subtle a pale blue fill, both readable', () => {
      const sec = cs('secondary');
      expect(sec.backgroundColor).to.equal('rgba(0, 0, 0, 0)');
      expect(sec.color).to.equal('rgb(0, 123, 172)');
      expect([sec.borderTopWidth, sec.borderTopStyle, sec.borderTopColor]).to.deep.equal([
        '2px',
        'solid',
        'rgb(0, 123, 172)',
      ]);
      expect(cs('link2').color).to.equal('rgb(0, 123, 172)');
      const sub = cs('subtle');
      expect(sub.backgroundColor).to.equal('rgb(191, 231, 247)');
      expect(contrast(sub.color, sub.backgroundColor)).to.be.at.least(7);
    });

    it('sizes: small keeps a 32px target, large is bigger', () => {
      const h = (id: string) => $(id).getBoundingClientRect().height;
      expect(h('small')).to.be.at.least(32);
      expect(h('large')).to.be.greaterThan(h('primary'));
      expect(parseFloat(cs('small').fontSize)).to.be.below(parseFloat(cs('primary').fontSize));
    });

    it('the focus ring is the library orange, 3:1 against the page', () => {
      for (const id of ['primary', 'q']) {
        $(id).focus();
        const s = cs(id);
        expect($(id).matches(':focus-visible'), id).to.equal(true);
        expect([s.outlineStyle, s.outlineWidth, s.outlineColor]).to.deep.equal([
          'solid',
          '3px',
          'rgb(229, 114, 0)',
        ]);
        expect(contrast(s.outlineColor, 'rgb(255, 255, 255)')).to.be.at.least(3);
      }
    });

    it('a toggle shows its state by a ticked box, not colour alone', () => {
      const off = cs('off', '::before');
      const on = cs('on', '::before');
      expect(off.content).to.equal('""');
      expect(on.content).to.match(/^"✓"/);
      // Both have the box; only the pressed one is filled.
      expect(off.borderTopStyle).to.equal('solid');
      expect(on.borderTopStyle).to.equal('solid');
      expect(cs('off').backgroundColor).to.equal('rgba(0, 0, 0, 0)');
      expect(cs('on').backgroundColor).to.equal('rgb(0, 123, 172)');
    });

    it('disabled buttons and fields are readable and not clickable-looking', () => {
      for (const id of ['disabled', 'adisabled', 'dinput']) {
        const s = cs(id);
        expect(s.cursor, id).to.equal('not-allowed');
        expect(contrast(s.color, s.backgroundColor), id).to.be.at.least(4.5);
      }
    });

    it("leaves the components' own .uvalib-button alone (light DOM)", () => {
      const s = cs('own');
      expect(s.backgroundColor).to.not.equal('rgb(0, 123, 172)');
      expect(s.minHeight).to.not.equal('44px');
    });

    it('the search form keeps label, field and button in a row', () => {
      const [label, input, button] = ['label[for=q]', '#q', 'form button'].map((q) =>
        doc.querySelector(q)!.getBoundingClientRect(),
      );
      expect(
        Math.abs(label!.top + label!.height / 2 - (input!.top + input!.height / 2)),
      ).to.be.below(2);
      expect(input!.left).to.be.greaterThan(label!.right);
      expect(button!.left).to.be.greaterThan(input!.right);
      expect(input!.height).to.be.at.least(44);
    });

    it('has no axe violations', async () => {
      await expectNoAxeViolations(doc.documentElement);
    });
  });

  it('the search form wraps at 320px with no horizontal scroll', async () => {
    iframe = await frame({ width: 320 });
    doc = iframe.contentDocument!;
    const form = doc.querySelector('form')!;
    for (const el of form.children) {
      const r = el.getBoundingClientRect();
      expect(r.right, el.localName).to.be.at.most(320);
    }
    expect(doc.documentElement.scrollWidth).to.be.at.most(320);
  });

  describe('dark', () => {
    beforeEach(async () => {
      iframe = await frame({ dark: true });
      doc = iframe.contentDocument!;
      win = iframe.contentWindow!;
    });

    it('uses the role tokens: light blue with dark text, readable on the dark surface', () => {
      const s = cs('primary');
      expect(s.backgroundColor).to.equal('rgb(85, 196, 236)');
      expect(s.color).to.equal('rgb(16, 23, 43)');
      expect(contrast(s.color, s.backgroundColor)).to.be.at.least(7);
      const page = win.getComputedStyle(doc.body).backgroundColor;
      expect(contrast(cs('secondary').color, page)).to.be.at.least(4.5);
      const sub = cs('subtle');
      expect(contrast(sub.color, sub.backgroundColor)).to.be.at.least(7);
      const input = cs('q');
      expect(contrast(input.color, input.backgroundColor)).to.be.at.least(7);
      $('primary').focus();
      expect(contrast(cs('primary').outlineColor, page)).to.be.at.least(3);
    });

    it('has no axe violations', async () => {
      await expectNoAxeViolations(doc.documentElement);
    });
  });

  describe('forced colors', () => {
    beforeEach(async () => {
      await emulateMedia({ forcedColors: 'active' });
      iframe = await frame();
      doc = iframe.contentDocument!;
      win = iframe.contentWindow!;
    });

    it('keeps every outline, and shows a pressed toggle in Highlight', () => {
      for (const id of ['primary', 'secondary', 'subtle', 'off']) {
        const s = cs(id);
        expect([s.borderTopStyle, s.borderTopWidth], id).to.deep.equal(['solid', '2px']);
        expect(s.borderTopColor, id).to.not.equal('rgba(0, 0, 0, 0)');
      }
      expect(cs('on').backgroundColor).to.not.equal(cs('off').backgroundColor);
      expect(cs('on', '::before').content).to.match(/^"✓"/);
    });
  });
});
