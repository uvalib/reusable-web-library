import { expect, fixture, nextFrame } from '@open-wc/testing';
import '../src/components/site-header/site-header.js';
import type { SiteHeader } from '../src/components/site-header/SiteHeader.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;

async function settle(el: SiteHeader): Promise<void> {
  for (let i = 0; i < 2; i++) {
    await nextFrame();
    await el.updateComplete;
  }
}

/** Every element matching `selector` in `node` and its open shadow roots. */
function deepAll(node: ParentNode, selector: string): Element[] {
  const found = [...node.querySelectorAll(selector)];
  for (const el of node.querySelectorAll('*')) {
    if (el.shadowRoot) found.push(...deepAll(el.shadowRoot, selector));
  }
  return found;
}

const alertsOf = (el: Element) => deepAll(root(el), 'uvalib-alerts');

for (const mode of ['shadow', 'light'] as const) {
  const light = mode === 'light' ? 'no-shadow-dom' : '';

  describe(`site-header alerts slot (${mode})`, () => {
    it('a standalone header renders no alerts of its own', async () => {
      const el = await fixture<SiteHeader>(`<site-header ${light}></site-header>`);
      await settle(el);
      expect(alertsOf(el)).to.deep.equal([]);
      if (mode === 'shadow') {
        const slot = el.shadowRoot!.querySelector('header > slot[name="alerts"]');
        expect(slot).to.not.equal(null);
      }
    });

    it('puts a slot="alerts" child inside <header>, before the logo', async () => {
      const el = await fixture<SiteHeader>(
        `<site-header ${light}><div slot="alerts" id="a">notice</div></site-header>`,
      );
      await settle(el);
      const a = document.getElementById('a')!;
      if (mode === 'shadow') {
        const slot = a.assignedSlot!;
        expect(slot.name).to.equal('alerts');
        expect(slot.parentElement!.localName).to.equal('header');
        expect(slot.nextElementSibling!.classList.contains('logo')).to.equal(true);
      } else {
        const header = el.querySelector(':scope > header')!;
        expect(a.parentElement).to.equal(header);
        expect(header.firstElementChild).to.equal(a);
      }
      expect(a.checkVisibility()).to.equal(true);
      // Later-added alert children are adopted the same way, after the first.
      const b = Object.assign(document.createElement('div'), { id: 'b', slot: 'alerts' });
      el.append(b);
      await settle(el);
      if (mode === 'light') {
        const header = el.querySelector(':scope > header')!;
        expect([...header.children].slice(0, 2)).to.deep.equal([a, b]);
      } else {
        expect(b.assignedSlot).to.equal(a.assignedSlot);
      }
    });

    it('lays the alerts out as a full-width row above the logo row', async () => {
      const el = await fixture<SiteHeader>(
        `<site-header ${light}><div slot="alerts" id="a" style="height: 20px">notice</div></site-header>`,
      );
      await settle(el);
      const a = document.getElementById('a')!.getBoundingClientRect();
      const header = root(el).querySelector('header')!;
      const logo = header.querySelector('.logo')!.getBoundingClientRect();
      const inner = header.getBoundingClientRect();
      const cs = getComputedStyle(header);
      expect(a.width).to.be.closeTo(
        inner.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
        1,
      );
      expect(logo.top).to.be.at.least(a.bottom - 0.5);
    });
  });
}
