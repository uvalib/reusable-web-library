import { expect, fixture } from '@open-wc/testing';
import '../src/components/site-style/site-style.js';
import type { SiteStyle } from '../src/components/site-style/SiteStyle.js';

const brandBlue = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--uva-brand-blue').trim();

describe('site-style (shadow)', () => {
  it('renders a slot with tokens and base styles', async () => {
    const el = await fixture<SiteStyle>('<site-style><p id="s">x</p></site-style>');
    const slot = el.shadowRoot!.querySelector('slot')!;
    expect(slot.assignedElements()[0].id).to.equal('s');
    const text = el
      .shadowRoot!.adoptedStyleSheets.flatMap((s) => [...s.cssRules].map((r) => r.cssText))
      .join('\n');
    expect(text).to.contain('--uva-brand-blue');
    expect(text).to.contain('box-sizing');
  });

  it('keeps the imports and importedStyles properties', async () => {
    const el = await fixture<SiteStyle>('<site-style></site-style>');
    expect(el.imports).to.deep.equal({});
    expect(el.importedStyles).to.equal('');
  });
});

describe('site-style (light)', () => {
  it('installs tokens on the document', async () => {
    const el = await fixture<SiteStyle>('<site-style no-shadow-dom></site-style>');
    expect(el.shadowRoot).to.equal(null);
    expect(brandBlue()).to.equal('#232D4B');
  });

  it('installs the document sheet only once and no tag-scoped copy', async () => {
    const first = await fixture<SiteStyle>('<site-style no-shadow-dom></site-style>');
    const before = document.adoptedStyleSheets.length;
    const second = document.createElement('site-style') as SiteStyle;
    second.setAttribute('no-shadow-dom', '');
    first.after(second);
    await second.updateComplete;
    expect(document.adoptedStyleSheets.length).to.equal(before);
    const rules = document.adoptedStyleSheets.flatMap((s) =>
      [...s.cssRules].flatMap((l) => [...((l as CSSLayerBlockRule).cssRules ?? [])]),
    );
    expect(rules.filter((r) => (r as CSSStyleRule).selectorText === ':root').length).to.equal(1);
    expect(rules.some((r) => (r as CSSStyleRule).selectorText?.startsWith('site-style'))).to.equal(
      false,
    );
    second.remove();
  });
});
