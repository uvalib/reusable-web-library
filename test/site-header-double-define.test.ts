import { expect } from '@open-wc/testing';

// Its own page (wtr runs each file separately), so nothing has defined the tags yet.
describe('site-header with another build of site-main-nav already defined', () => {
  it('warns once', async () => {
    customElements.define('site-main-nav', class extends HTMLElement {});
    const warn = console.warn;
    const calls: unknown[][] = [];
    console.warn = (...args: unknown[]) => void calls.push(args);
    try {
      await import('../src/components/site-header/site-header.js');
    } finally {
      console.warn = warn;
    }
    const mine = calls.filter((c) => String(c[0]).includes('site-main-nav'));
    expect(mine.length).to.equal(1);
    expect(String(mine[0][0])).to.contain('another copy');
  });
});
