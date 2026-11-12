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

const sheetsFor = (tag: string) =>
  document.adoptedStyleSheets.filter((s) => [...s.cssRules].some((r) => r.cssText.startsWith(tag)));

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
  it('leaves :host-context( unrewritten', () => {
    expect(rewriteHost(':host-context(.d) p{a:b}', 'x-probe')).to.equal(':host-context(.d) p{a:b}');
  });
});

describe('installLightDomStyles', () => {
  it('flattens nested groups and native sheets, returns true only once', () => {
    const native = new CSSStyleSheet();
    native.replaceSync(':host{color:blue}');
    const doc = document;
    const prior = [...doc.adoptedStyleSheets];
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
    expect(installLightDomStyles('x-flat', group, doc)).to.equal(true);
    expect(installLightDomStyles('x-flat', group, doc)).to.equal(false);
    expect(doc.adoptedStyleSheets.length).to.equal(prior.length + 1);
    const text = [...doc.adoptedStyleSheets[prior.length].cssRules]
      .map((r) => r.cssText)
      .join('\n');
    expect(text).to.contain('x-flat');
    expect(text).to.contain('color: blue');
    expect(text).to.not.contain(':host');
    doc.adoptedStyleSheets = prior;
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
