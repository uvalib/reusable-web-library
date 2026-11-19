import { expect, fixture, nextFrame } from '@open-wc/testing';
import { setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-card/uvalib-card.js';
import '../src/components/uvalib-card-grid/uvalib-card-grid.js';
import type { UvalibCard } from '../src/components/uvalib-card/UvalibCard.js';
import type { UvalibCardGrid } from '../src/components/uvalib-card-grid/UvalibCardGrid.js';
import { expectNoAxeViolations } from './helpers/axe.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;

async function warnings(fn: () => Promise<void>): Promise<string[]> {
  const orig = console.warn;
  const warns: string[] = [];
  console.warn = (...a: unknown[]) => void warns.push(a.join(' '));
  try {
    await fn();
  } finally {
    console.warn = orig;
  }
  return warns;
}

function cardsHtml(attr: string, n = 2): string {
  return Array.from({ length: n }, (_, i) => {
    const body =
      i === 0
        ? 'One line.'
        : 'A longer excerpt that wraps onto several lines so this card asks for more height than its neighbour.';
    return `<uvalib-card ${attr} href="#c${i}"><span slot="heading">Card ${i + 1}</span>${body}</uvalib-card>`;
  }).join('');
}

async function settle(el: UvalibCardGrid): Promise<void> {
  await el.updateComplete;
  await nextFrame();
  await Promise.all(
    [...el.querySelectorAll('uvalib-card')].map((c) => (c as UvalibCard).updateComplete),
  );
  await nextFrame();
}

async function columnCount(el: UvalibCardGrid, width: string): Promise<number> {
  el.style.width = width;
  await settle(el);
  const ul = root(el).querySelector('ul')!;
  return getComputedStyle(ul).gridTemplateColumns.split(' ').filter(Boolean).length;
}

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-card-grid (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = (n = 2, attrs = '') =>
      fixture<UvalibCardGrid>(
        `<uvalib-card-grid ${attr} ${attrs}>${cardsHtml(attr, n)}</uvalib-card-grid>`,
      );

    afterEach(() => {
      document.querySelectorAll('uvalib-card-grid').forEach((el) => {
        (el as HTMLElement).style.width = '';
      });
    });

    it('is a list of cards', async () => {
      const el = await make();
      await settle(el);
      const ul = root(el).querySelector('ul')!;
      expect(ul.getAttribute('role')).to.equal('list');
      const items = [...ul.querySelectorAll(':scope > li')];
      expect(items.length).to.equal(2);
      for (const li of items) expect(li.getAttribute('role')).to.equal('listitem');
      expect(ul.querySelectorAll('uvalib-card, slot').length).to.be.greaterThan(0);
    });

    it('uses 4, 2 and 1 columns at the theme breakpoints', async () => {
      const el = await make(4);
      expect(await columnCount(el, '1200px')).to.equal(4);
      expect(await columnCount(el, '993px')).to.equal(4);
      expect(await columnCount(el, '992px')).to.equal(2);
      expect(await columnCount(el, '800px')).to.equal(2);
      expect(await columnCount(el, '768px')).to.equal(2);
      expect(await columnCount(el, '767px')).to.equal(1);
      expect(await columnCount(el, '400px')).to.equal(1);
    });

    it('switches to auto-fill when min-card-width is a length', async () => {
      const el = await make(6, 'min-card-width="20rem"');
      expect(el.getAttribute('data-min-width')).to.equal('');
      expect(el.style.getPropertyValue('--uvalib-card-min')).to.equal('20rem');
      expect(await columnCount(el, '1200px')).to.equal(3);
      expect(await columnCount(el, '400px')).to.equal(1);
      const ul = root(el).querySelector('ul')!;
      expect(getComputedStyle(ul).gridTemplateColumns).to.not.equal('');
    });

    it('ignores an invalid min-card-width once and keeps 4/2/1', async () => {
      const warns = await warnings(async () => {
        const el = await make(4, 'min-card-width="20rem;color:red"');
        expect(el.hasAttribute('data-min-width')).to.equal(false);
        expect(await columnCount(el, '1200px')).to.equal(4);
        el.minCardWidth = '10px;color:blue';
        await el.updateComplete;
      });
      expect(warns.filter((w) => w.includes('min-card-width')).length).to.equal(1);
    });

    it('gives cards in a row the same height', async () => {
      const el = await make();
      await columnCount(el, '800px');
      const cards = [...el.querySelectorAll('uvalib-card')];
      for (const card of cards) {
        const excerpt = root(card).querySelector('[data-region="excerpt"]')!;
        expect((excerpt as HTMLElement).hidden).to.equal(false);
      }
      const heights = cards.map((c) => c.getBoundingClientRect().height);
      expect(heights[0]).to.be.greaterThan(40);
      expect(Math.abs(heights[0]! - heights[1]!)).to.be.lessThan(1);
    });

    it('picks up a card added later and drops one that leaves', async () => {
      const el = await make();
      await settle(el);
      const added = document.createElement('uvalib-card');
      if (attr) added.setAttribute('no-shadow-dom', '');
      added.setAttribute('href', '#c3');
      added.innerHTML = '<span slot="heading">Card 3</span>Third';
      el.append(added);
      await nextFrame();
      await settle(el);
      expect(root(el).querySelectorAll('li').length).to.equal(3);
      expect(added.querySelector('[slot="heading"]')!.textContent).to.equal('Card 3');
      expect(added.isConnected).to.equal(true);
      added.remove();
      await nextFrame();
      await settle(el);
      expect(root(el).querySelectorAll('li').length).to.equal(2);
    });

    it('warns once about children that are not cards and keeps them', async () => {
      const warns = await warnings(async () => {
        const el = await fixture<UvalibCardGrid>(
          `<uvalib-card-grid ${attr}>${cardsHtml(attr, 1)}<p class="note">Nope</p></uvalib-card-grid>`,
        );
        await settle(el);
        expect(el.querySelector('p.note')).to.not.equal(null);
        const again = document.createElement('em');
        again.textContent = 'Also no';
        el.append(again);
        await nextFrame();
        await settle(el);
        expect(el.querySelector('em')?.textContent).to.equal('Also no');
      });
      expect(warns.filter((w) => w.includes('only <uvalib-card>')).length).to.equal(1);
    });

    it('passes axe', async () => {
      const el = await make();
      await settle(el);
      await expectNoAxeViolations(el);
    });

    it('does not scroll horizontally at 320px', async () => {
      await setViewport({ width: 320, height: 640 });
      try {
        const el = await make(3);
        await settle(el);
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
        const ul = root(el).querySelector('ul')!;
        expect(getComputedStyle(ul).gridTemplateColumns.split(' ').filter(Boolean).length).to.equal(
          1,
        );
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
    });
  });
}

describe('uvalib-card-grid light DOM reconnect', () => {
  it('keeps its cards when the grid reconnects before the first update', async () => {
    const holder = document.createElement('div');
    document.body.append(holder);
    const grid = document.createElement('uvalib-card-grid') as UvalibCardGrid;
    grid.setAttribute('no-shadow-dom', '');
    const card = document.createElement('uvalib-card') as UvalibCard;
    card.setAttribute('no-shadow-dom', '');
    card.innerHTML = '<span slot="heading">Kept</span>';
    grid.append(card);
    try {
      holder.append(grid);
      holder.removeChild(grid);
      holder.append(grid);
      await grid.updateComplete;
      await card.updateComplete;
      await nextFrame();
      expect(grid.contains(card)).to.equal(true);
      expect(card.textContent).to.contain('Kept');
      expect(root(grid).querySelectorAll(':scope > ul > li').length).to.equal(1);
    } finally {
      holder.remove();
    }
  });
});

describe('uvalib-card-grid shadow slots', () => {
  it('clears the slot it assigned when a card leaves the grid', async () => {
    const el = await fixture<UvalibCardGrid>(
      `<uvalib-card-grid>${cardsHtml('', 1)}</uvalib-card-grid>`,
    );
    await settle(el);
    const card = el.querySelector('uvalib-card')!;
    expect(card.getAttribute('slot')).to.equal('card-0');
    expect(card.hasAttribute('data-grid-slot')).to.equal(true);
    const holder = document.createElement('div');
    document.body.append(holder);
    holder.append(card);
    await (card as UvalibCard).updateComplete;
    expect(card.hasAttribute('slot')).to.equal(false);
    expect(card.hasAttribute('data-grid-slot')).to.equal(false);
    holder.remove();
  });
});
