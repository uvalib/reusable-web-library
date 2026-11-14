import { expect, fixture, nextFrame } from '@open-wc/testing';
import { setViewport } from '@web/test-runner-commands';
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

const SIX_LINKS = [1, 2, 3, 4, 5, 6]
  .map((i) => `<a slot="site-links" href="/s${i}">Section number ${i}</a>`)
  .join('');

// Header heights main (7d9cfa9) renders with no alert content, measured in a worktree of main
// with this exact markup. The alerts row must not change them: a wrapping flex row did, by
// breaking the logo row on max-content sizes before anything could shrink.
const MAIN_GEOMETRY = [
  {
    name: 'full header at 320px',
    width: 320,
    attrs: '',
    kids: '',
    other: '.menu-toggle',
    height: 67.0625,
  },
  {
    name: 'vendor header at 360px',
    width: 360,
    attrs: 'variant="vendor"',
    kids: '',
    other: 'nav.inline',
    height: 84,
  },
  {
    name: 'six site links at 1000px',
    width: 1000,
    attrs: '',
    kids: SIX_LINKS,
    other: 'nav.inline',
    height: 84,
  },
] as const;

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

  describe(`site-header geometry without alert content (${mode})`, () => {
    afterEach(() => setViewport({ width: 800, height: 600 }));

    for (const g of MAIN_GEOMETRY) {
      it(`keeps main's single logo row: ${g.name}`, async () => {
        await setViewport({ width: g.width, height: 800 });
        const el = await fixture<SiteHeader>(
          `<site-header ${light} ${g.attrs}>${g.kids}</site-header>`,
        );
        await settle(el);
        const header = root(el).querySelector('header')!;
        const logo = header.querySelector('.logo')!.getBoundingClientRect();
        const other = header.querySelector(g.other)!.getBoundingClientRect();
        const box = header.getBoundingClientRect();
        expect(other.top, 'shares the logo row').to.be.closeTo(logo.top, 0.5);
        expect(box.height, 'header height on main').to.be.closeTo(g.height, 0.5);
        // Still pushed to the inline end, as main's space-between did.
        const padEnd = parseFloat(getComputedStyle(header).paddingRight);
        expect(other.right).to.be.closeTo(box.right - padEnd, 1);
      });
    }

    it('keeps an open Menu popover out of flow', async () => {
      await setViewport({ width: 320, height: 800 });
      const el = await fixture<SiteHeader>(`<site-header ${light}></site-header>`);
      await settle(el);
      const header = root(el).querySelector('header')!;
      (header.querySelector('.menu-toggle') as HTMLButtonElement).click();
      await nextFrame();
      expect(header.querySelector('[popover]')!.matches(':popover-open')).to.equal(true);
      expect(header.getBoundingClientRect().height).to.be.closeTo(MAIN_GEOMETRY[0].height, 0.5);
    });

    if (mode === 'shadow') {
      it('keeps a slotted skip link out of flow', async () => {
        await setViewport({ width: 320, height: 800 });
        const el = await fixture<SiteHeader>(
          '<site-header><a slot="skip-link" class="skip-link" href="#m" style="position: absolute">Skip to main content</a></site-header>',
        );
        await settle(el);
        const header = el.shadowRoot!.querySelector('header')!;
        const logo = header.querySelector('.logo')!.getBoundingClientRect();
        expect(getComputedStyle(el.querySelector('.skip-link')!).position).to.equal('absolute');
        expect(header.getBoundingClientRect().height).to.be.closeTo(MAIN_GEOMETRY[0].height, 0.5);
        expect(logo.top - header.getBoundingClientRect().top).to.be.closeTo(
          parseFloat(getComputedStyle(header).paddingTop),
          0.5,
        );
      });
    }
  });
}
