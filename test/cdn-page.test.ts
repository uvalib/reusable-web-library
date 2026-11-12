import { expect } from '@open-wc/testing';

// Runs against the built output: `pnpm test` builds dist-cdn in the node tests first.
describe('CDN build in a page', () => {
  it('loads site-page with a header and fetches each chunk once', async () => {
    await import(/* @vite-ignore */ '/dist-cdn/site-page.js');
    await import(/* @vite-ignore */ '/dist-cdn/site-header.js');
    const page = document.createElement('site-page');
    document.body.append(page);
    await customElements.whenDefined('site-footer');
    await (page as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    const root = page.shadowRoot ?? page;
    expect(root.querySelector('site-header')).to.not.equal(null);
    const urls = performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .filter((n) => n.includes('/dist-cdn/chunks/'));
    expect(urls.length).to.be.greaterThan(0);
    expect(new Set(urls).size).to.equal(urls.length);
    page.remove();
  });

  it('tolerates a CDN copy loading after an npm copy and keeps the first definition', async () => {
    await import('../src/components/site-header/site-header.js');
    const first = customElements.get('site-header');
    expect(first).to.not.equal(undefined);
    let error: unknown;
    try {
      await import(/* @vite-ignore */ '/dist-cdn/site-header.js');
    } catch (e) {
      error = e;
    }
    expect(error).to.equal(undefined);
    expect(customElements.get('site-header')).to.equal(first);
  });
});
