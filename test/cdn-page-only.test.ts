import { expect, nextFrame } from '@open-wc/testing';

// Imports ONLY the site-page CDN entry: the header must register through it alone.
describe('CDN site-page entry on its own', () => {
  before(async () => {
    await import(/* @vite-ignore */ '/dist-cdn/site-page.js');
  });

  for (const light of [false, true]) {
    it(`registers and renders site-header (${light ? 'light' : 'shadow'} mode)`, async () => {
      const page = document.createElement('site-page');
      if (light) page.setAttribute('no-shadow-dom', '');
      document.body.append(page);
      await (page as unknown as { updateComplete: Promise<unknown> }).updateComplete;
      expect(customElements.get('site-header')).to.not.equal(undefined);
      const header = (page.shadowRoot ?? page).querySelector('site-header') as HTMLElement & {
        updateComplete: Promise<unknown>;
      };
      expect(header).to.not.equal(null);
      await header.updateComplete;
      await nextFrame();
      if (light) {
        expect(page.querySelector('site-header header')).to.not.equal(null);
      } else {
        expect(header.shadowRoot).to.not.equal(null);
        expect(header.shadowRoot!.querySelector('header')).to.not.equal(null);
      }
      page.remove();
    });
  }
});
