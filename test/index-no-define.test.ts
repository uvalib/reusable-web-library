import { expect } from '@open-wc/testing';
import * as lib from '../src/index.js';

// This file must never import a define file: wtr gives it its own page.
describe('index', () => {
  it('exports the component classes without defining any element', async () => {
    expect(lib.SitePage).to.be.a('function');
    expect(lib.SiteStyle).to.be.a('function');
    await new Promise((r) => setTimeout(r, 50)); // let any dynamic import settle
    for (const tag of ['site-page', 'site-header', 'site-footer', 'site-analytics', 'site-style']) {
      expect(customElements.get(tag) === undefined, `${tag} is defined`).to.equal(true);
    }
  });
});
