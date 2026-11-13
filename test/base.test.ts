import { expect, fixture } from '@open-wc/testing';
import { css, html } from 'lit';
import { UvalibElement, define, installLightDomStyles, rewriteHost } from '../src/base.js';

class Probe extends UvalibElement {
  static styles = css`
    :host {
      display: block;
    }
    :host([hidden]) {
      display: none;
    }
    p {
      color: red;
    }
  `;
  render() {
    return html`<p>hi</p>`;
  }
}
define('x-probe', Probe);
class ProbeNoStyle extends Probe {}
define('x-probe-nostyle', ProbeNoStyle);
class ProbeToggle extends Probe {}
define('x-probe-toggle', ProbeToggle);
class ProbeInShadow extends Probe {}
define('x-probe-inshadow', ProbeInShadow);

const sheetsFor = (tag: string, root: Document | ShadowRoot = document) =>
  root.adoptedStyleSheets.filter((s) =>
    [...s.cssRules].some((l) =>
      [...((l as CSSLayerBlockRule).cssRules ?? [])].some(
        (r) => (r as CSSStyleRule).selectorText?.split(/[\s,.:[]/)[0] === tag,
      ),
    ),
  );
const color = (el: Element) => getComputedStyle(el).color;

describe('rewriteHost', () => {
  it('rewrites :host and :host(...)', () => {
    expect(rewriteHost(':host{a:b} :host([x]) p{c:d}', 'x-probe')).to.equal(
      'x-probe{a:b} x-probe[x] p{c:d}',
    );
  });
  it('handles nested parentheses', () => {
    expect(rewriteHost(':host(:not([hidden])){a:b}', 'x-probe')).to.equal(
      'x-probe:not([hidden]){a:b}',
    );
  });
  it('trims whitespace inside :host( )', () => {
    expect(rewriteHost(':host( .a ){a:b}', 'x-probe')).to.equal('x-probe.a{a:b}');
  });
  it('leaves :host-context( unrewritten', () => {
    expect(rewriteHost(':host-context(.d) p{a:b}', 'x-probe')).to.equal(':host-context(.d) p{a:b}');
  });
});

const layerText = (sheet: CSSStyleSheet) => sheet.cssRules[0].cssText;

describe('installLightDomStyles', () => {
  let prior: CSSStyleSheet[];
  beforeEach(() => (prior = [...document.adoptedStyleSheets]));
  afterEach(() => (document.adoptedStyleSheets = prior));

  it('flattens nested groups and native sheets, returns true only once', () => {
    const native = new CSSStyleSheet();
    native.replaceSync('p{color:blue}');
    const group = [
      css`
        :host {
          a: b;
        }
      `,
      [
        native,
        css`
          :host([x]) {
            c: d;
          }
        `,
      ],
    ];
    expect(installLightDomStyles('x-flat', group)).to.equal(true);
    expect(installLightDomStyles('x-flat', group)).to.equal(false);
    expect(document.adoptedStyleSheets.length).to.equal(prior.length + 1);
    const text = layerText(document.adoptedStyleSheets[prior.length]);
    expect(text).to.contain('x-flat p');
    expect(text).to.contain('x-flat[x]');
    expect(text).to.not.contain(':host');
  });

  it('prefixes comma lists and grouping rules, layers the result', () => {
    installLightDomStyles(
      'x-scope',
      css`
        :host,
        p,
        a:not(.b, .c) {
          a: b;
        }
        @media (min-width: 1px) {
          .a b {
            c: d;
          }
        }
      `,
    );
    const text = layerText(document.adoptedStyleSheets[prior.length]);
    expect(text).to.match(/^@layer uvalib/);
    expect(text).to.contain('x-scope, x-scope p, x-scope a:not(.b, .c)');
    expect(text).to.match(/@media \(min-width: 1px\)\s*\{\s*x-scope \.a b/);
  });

  it('scope:false leaves selectors alone but still layers by default', () => {
    installLightDomStyles(
      'x-global',
      css`
        p {
          a: b;
        }
      `,
      { scope: false },
    );
    const text = layerText(document.adoptedStyleSheets[prior.length]);
    expect(text).to.match(/^@layer uvalib/);
    expect(text).to.contain('p {');
    expect(text).to.not.contain('x-global');
  });

  it('layer:false installs the sheet unlayered', () => {
    installLightDomStyles(
      'x-unlayered',
      css`
        p {
          a: b;
        }
      `,
      { scope: false, layer: false },
    );
    const text = layerText(document.adoptedStyleSheets[prior.length]);
    expect(text).to.not.match(/^@layer/);
    expect(text).to.contain('p {');
  });

  it('adopts into a same-origin iframe document, exactly once', async () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    try {
      const doc = iframe.contentDocument!;
      expect(
        installLightDomStyles(
          'x-frame',
          css`
            :host {
              a: b;
            }
          `,
          { root: doc },
        ),
      ).to.equal(true);
      expect(doc.adoptedStyleSheets.length).to.equal(1);
      expect(
        installLightDomStyles(
          'x-frame',
          css`
            :host {
              a: b;
            }
          `,
          { root: doc },
        ),
      ).to.equal(false);
      expect(doc.adoptedStyleSheets.length).to.equal(1);
    } finally {
      iframe.remove();
    }
  });

  it('does not record the tag when installation throws', () => {
    const bad = {
      adoptedStyleSheets: [],
    } as unknown as Document;
    Object.defineProperty(bad, 'adoptedStyleSheets', {
      get: () => [],
      set: () => {
        throw new Error('nope');
      },
    });
    expect(() =>
      installLightDomStyles(
        'x-bad',
        css`
          p {
            a: b;
          }
        `,
        { root: bad },
      ),
    ).to.throw();
    expect(
      installLightDomStyles(
        'x-bad',
        css`
          p {
            a: b;
          }
        `,
      ),
    ).to.equal(true);
  });
});

describe('UvalibElement', () => {
  let host: HTMLElement;
  afterEach(() => host?.remove());

  it('renders into an open shadow root by default', async () => {
    const el = await fixture<Probe>(html`<x-probe></x-probe>`);
    host = el;
    expect(el.shadowRoot).to.not.equal(null);
    expect(el.shadowRoot!.mode).to.equal('open');
    expect(el.shadowRoot!.querySelector('p')!.textContent).to.equal('hi');
  });

  it('light mode renders into the element and installs one sheet for many instances', async () => {
    const wrap = await fixture<HTMLElement>(
      html`<div>
        <x-probe no-shadow-dom></x-probe><x-probe no-shadow-dom></x-probe
        ><x-probe no-shadow-dom></x-probe>
      </div>`,
    );
    host = wrap;
    const els = [...wrap.querySelectorAll<Probe>('x-probe')];
    await Promise.all(els.map((e) => e.updateComplete));
    expect(els[0].shadowRoot).to.equal(null);
    expect(els[0].querySelector('p')).to.not.equal(null);
    expect(sheetsFor('x-probe').length).to.equal(1);
  });

  it('scopes light styles to the element and lets host CSS win', async () => {
    const wrap = await fixture<HTMLElement>(
      html`<div>
        <p id="out">o</p>
        <x-probe no-shadow-dom></x-probe>
      </div>`,
    );
    host = wrap;
    const inner = wrap.querySelector('x-probe p')!;
    await wrap.querySelector<Probe>('x-probe')!.updateComplete;
    expect(color(inner)).to.equal('rgb(255, 0, 0)');
    expect(color(wrap.querySelector('#out')!)).to.not.equal('rgb(255, 0, 0)');
    const style = document.createElement('style');
    style.textContent = 'p{color:blue}';
    document.head.appendChild(style);
    try {
      expect(color(inner)).to.equal('rgb(0, 0, 255)');
    } finally {
      style.remove();
    }
  });

  it('styles a light-mode element inside an open shadow root', async () => {
    const outer = document.createElement('div');
    document.body.appendChild(outer);
    host = outer;
    const sr = outer.attachShadow({ mode: 'open' });
    sr.innerHTML = '<x-probe-inshadow no-shadow-dom></x-probe-inshadow>';
    const el = sr.querySelector<Probe>('x-probe-inshadow')!;
    await el.updateComplete;
    expect(color(el.querySelector('p')!)).to.equal('rgb(255, 0, 0)');
    expect(sheetsFor('x-probe-inshadow', sr).length).to.equal(1);
  });

  it('no-style in light mode installs no sheet', async () => {
    const el = await fixture<ProbeNoStyle>(
      html`<x-probe-nostyle no-shadow-dom no-style></x-probe-nostyle>`,
    );
    host = el;
    expect(el.querySelector('p')).to.not.equal(null);
    expect(sheetsFor('x-probe-nostyle').length).to.equal(0);
  });

  it('no-style in shadow mode adopts no styles', async () => {
    const el = await fixture<Probe>(html`<x-probe no-style></x-probe>`);
    host = el;
    expect(el.shadowRoot!.adoptedStyleSheets.length).to.equal(0);
  });

  it('re-appending a light-DOM element does not duplicate content or sheets', async () => {
    const el = await fixture<Probe>(html`<x-probe no-shadow-dom></x-probe>`);
    host = el;
    const parent = el.parentElement!;
    const before = document.adoptedStyleSheets.length;
    el.remove();
    parent.appendChild(el);
    await el.updateComplete;
    expect(el.querySelectorAll('p').length).to.equal(1);
    expect(document.adoptedStyleSheets.length).to.equal(before);
  });

  it('toggling no-shadow-dom after first render leaves the render root unchanged', async () => {
    const el = await fixture<ProbeToggle>(html`<x-probe-toggle></x-probe-toggle>`);
    host = el;
    const root = el.renderRoot;
    el.setAttribute('no-shadow-dom', '');
    await el.updateComplete;
    expect(el.renderRoot).to.equal(root);
    expect(el.shadowRoot).to.equal(root);
  });
});

describe('define', () => {
  it('is a no-op for an already-defined tag', () => {
    class Other extends HTMLElement {}
    expect(() => {
      define('x-probe', Other);
      define('x-probe', Other);
    }).to.not.throw();
    expect(customElements.get('x-probe')).to.equal(Probe);
  });
});
