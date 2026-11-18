import { expect, fixture, nextFrame } from '@open-wc/testing';
import { sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-card/uvalib-card.js';
import '../src/components/uvalib-card-grid/uvalib-card-grid.js';
import type { UvalibCard } from '../src/components/uvalib-card/UvalibCard.js';
import type { UvalibCardGrid } from '../src/components/uvalib-card-grid/UvalibCardGrid.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { recordAnalytics } from './helpers/analytics.js';

const IMG = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const titleOf = (el: Element) => root(el).querySelector<HTMLElement>('.title')!;
const linkOf = (el: Element) => root(el).querySelector<HTMLAnchorElement>('a.title-link');

/** A link click would navigate the test page: cancel it once it reaches `document`. */
const cancel = (e: Event) => {
  if (e.composedPath().some((n) => n instanceof HTMLAnchorElement)) e.preventDefault();
};

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

function regionText(el: Element, name: string): string {
  const region = root(el).querySelector(`[data-region="${name}"]`);
  if (!region) return '';
  if (el.shadowRoot) {
    const slot = region.querySelector('slot');
    return (slot ? slot.assignedNodes({ flatten: true }) : [])
      .map((n) => n.textContent ?? '')
      .join('');
  }
  return region.textContent ?? '';
}

const PHOTO = `
  <img slot="media" alt="A courtyard arch" src="${IMG}">
  <span slot="badge">13 photos</span>
  <span slot="heading">Rotunda</span>
  <time slot="meta" datetime="2020-05">May 2020</time>
  <span slot="chip">Architecture</span>
  The north terrace.
`;

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-card (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = (inner: string, attrs = '') =>
      fixture<UvalibCard>(`<uvalib-card ${attr} ${attrs}>${inner}</uvalib-card>`);

    beforeEach(() => document.addEventListener('click', cancel));
    afterEach(() => document.removeEventListener('click', cancel));

    it('makes the heading the link and stretches it over the card', async () => {
      const el = await make(`<span slot="heading">Early fiction</span>100 texts`, 'href="#early"');
      const title = titleOf(el);
      const link = linkOf(el)!;
      expect(title.localName).to.equal('h3');
      expect(link.getAttribute('href')).to.equal('#early');
      // Slotted text is not part of the shadow link's textContent; the author's node is.
      expect(el.querySelector('[slot="heading"]')!.textContent).to.equal('Early fiction');
      expect(regionText(el, 'heading')).to.contain('Early fiction');
      expect(title.querySelector('.arrow')?.getAttribute('aria-hidden')).to.equal('true');
      const after = getComputedStyle(link, '::after');
      expect(after.position).to.equal('absolute');
      expect(after.top).to.equal('0px');
      expect(after.right).to.equal('0px');
      expect(after.bottom).to.equal('0px');
      expect(after.left).to.equal('0px');
      expect(getComputedStyle(root(el).querySelector('.card')!).position).to.equal('relative');
      expect(regionText(el, 'excerpt')).to.contain('100 texts');
    });

    it('leaves a static card’s own links uncovered', async () => {
      const el = await make(`<span slot="heading">About</span><a href="#more">Read more</a>`);
      expect(linkOf(el)).to.equal(null);
      // The author's link stays in light DOM when slotted, and is moved into the excerpt in light mode.
      const inner = el.querySelector<HTMLAnchorElement>('a[href="#more"]')!;
      expect(inner.getAttribute('href')).to.equal('#more');
      expect(regionText(el, 'excerpt')).to.contain('Read more');
      expect(getComputedStyle(inner, '::after').position).to.not.equal('absolute');
    });

    it('places media, badge, date, chip and excerpt', async () => {
      const el = await make(PHOTO, 'href="#rotunda"');
      expect(regionText(el, 'heading')).to.contain('Rotunda');
      expect(regionText(el, 'badge')).to.contain('13 photos');
      expect(regionText(el, 'meta')).to.contain('May 2020');
      expect(regionText(el, 'chip')).to.contain('Architecture');
      expect(regionText(el, 'excerpt')).to.contain('The north terrace.');
      const img = el.querySelector('img')!;
      expect(img.getAttribute('alt')).to.equal('A courtyard arch');
      expect(img.getAttribute('src')).to.equal(IMG);
      const media = root(el).querySelector('[data-region="media"] img, [data-region="media"] slot');
      expect(media).to.not.equal(null);
    });

    it('uses an explicit heading level and ignores an invalid one', async () => {
      const set = await make(`<span slot="heading">Title</span>`, 'heading-level="2" href="#t"');
      expect(titleOf(set).localName).to.equal('h2');
      const bad = await make(`<span slot="heading">Title</span>`, 'heading-level="9" href="#t"');
      expect(titleOf(bad).localName).to.equal('h3');
      const nan = await make(`<span slot="heading">Title</span>`, 'heading-level="nope"');
      expect(titleOf(nan).localName).to.equal('h3');
    });

    it('infers one level below the nearest preceding heading', async () => {
      const page = await fixture(`<div>
        <h1>Page</h1>
        <uvalib-card ${attr} href="#a"><span slot="heading">Under h1</span></uvalib-card>
        <h2>Section</h2>
        <uvalib-card ${attr} href="#b"><span slot="heading">Under h2</span></uvalib-card>
      </div>`);
      const [underH1, underH2] = [...page.querySelectorAll('uvalib-card')];
      expect(titleOf(underH1!).localName).to.equal('h2');
      expect(titleOf(underH2!).localName).to.equal('h3');
    });

    it('hides an empty heading so it is not an empty heading', async () => {
      const el = await make(`No title here`, 'href="#x"');
      expect(titleOf(el).hidden).to.equal(true);
    });

    it('hides a heading with no accessible name and warns when the card is a link', async () => {
      const warns = await warnings(async () => {
        const blank = await make(
          `<img slot="heading" alt="" src="${IMG}"><img slot="media" alt="" src="${IMG}">`,
          'href="#item"',
        );
        expect(titleOf(blank).hidden).to.equal(true);
        expect(linkOf(blank)).to.not.equal(null);
        const media = root(blank).querySelector<HTMLElement>('[data-region="media"]')!;
        expect(media.hidden).to.equal(false);
        await expectNoAxeViolations(blank);

        const named = await make(
          `<img slot="heading" alt="Rotunda" src="${IMG}">`,
          'href="#rotunda"',
        );
        expect(titleOf(named).hidden).to.equal(false);
        expect(linkOf(named)!.getAttribute('href')).to.equal('#rotunda');
        expect(named.querySelector('img')!.getAttribute('alt')).to.equal('Rotunda');
        await expectNoAxeViolations(named);

        const titled = await make(
          `<svg slot="heading" role="img"><title>Rotunda seal</title></svg>`,
          'href="#seal"',
        );
        expect(titleOf(titled).hidden).to.equal(false);

        const labelled = await make(
          `<svg slot="heading" role="img" aria-label="Library clock"></svg>`,
          'href="#clock"',
        );
        expect(titleOf(labelled).hidden).to.equal(false);

        const bare = await make(`<svg slot="heading"></svg>`, 'href="#bare"');
        expect(titleOf(bare).hidden).to.equal(true);
        expect(linkOf(bare)).to.not.equal(null);

        const missing = await make(`No title here`, 'href="#missing"');
        expect(titleOf(missing).hidden).to.equal(true);

        const quiet = await make(`No title`);
        expect(titleOf(quiet).hidden).to.equal(true);
        expect(linkOf(quiet)).to.equal(null);
      });
      expect(warns.filter((w) => w.includes('no accessible name')).length).to.equal(3);
    });

    it('does not link an empty or unsafe href, and warns once for the unsafe one', async () => {
      const blank = await make(`<span slot="heading">Plain</span>`, 'href="  "');
      expect(linkOf(blank)).to.equal(null);
      const warns = await warnings(async () => {
        const el = await make(`<span slot="heading">Script</span>`, 'href="javascript:alert(1)"');
        expect(linkOf(el)).to.equal(null);
        el.href = 'javascript:alert(2)';
        await el.updateComplete;
      });
      expect(warns.filter((w) => w.includes('not linking')).length).to.equal(1);
    });

    it('warns once when a clickable card contains another link or button', async () => {
      const warns = await warnings(async () => {
        const el = await make(
          `<span slot="heading">Title</span><a href="#x">Inside</a><button type="button">Go</button>`,
          'href="#card"',
        );
        await nextFrame();
        el.requestUpdate();
        await el.updateComplete;
      });
      expect(warns.filter((w) => w.includes('must not contain')).length).to.equal(1);
    });

    it('warns once when a clickable card contains another control', async () => {
      const warns = await warnings(async () => {
        const el = await make(
          `<span slot="heading">Title</span>
           <input type="hidden" name="h" value="1">
           <input type="text" aria-label="Search">
           <select aria-label="Pick"><option>A</option></select>
           <textarea aria-label="Note"></textarea>
           <details><summary>More</summary><p>Body</p></details>
           <span role="button" tabindex="0">Act</span>
           <span role="link">Go</span>`,
          'href="#card"',
        );
        await nextFrame();
        await el.updateComplete;
        const skipped = await make(
          `<span slot="heading">Title</span><span tabindex="-1">Skip</span><input type="hidden" value="1">`,
          'href="#ok"',
        );
        await nextFrame();
        await skipped.updateComplete;
        const stat = await make(
          `<span slot="heading">Title</span><input type="text" aria-label="Search">`,
        );
        await nextFrame();
        await stat.updateComplete;
      });
      expect(warns.filter((w) => w.includes('must not contain')).length).to.equal(1);
    });

    it('follows a heading change and a chip added later', async () => {
      const el = await make(PHOTO, 'href="#rotunda"');
      el.querySelector('[slot="heading"]')!.textContent = 'The Lawn';
      await nextFrame();
      expect(regionText(el, 'heading')).to.contain('The Lawn');
      const chip = document.createElement('span');
      chip.slot = 'chip';
      chip.textContent = 'Grounds';
      el.append(chip);
      await nextFrame();
      await el.updateComplete;
      expect(regionText(el, 'chip')).to.contain('Grounds');
    });

    it('reports a card click as single, never the title or URL, and not on render', async () => {
      const rec = recordAnalytics();
      try {
        const el = await make(`<span slot="heading">Early fiction</span>`, 'href="#early"');
        await el.updateComplete;
        await nextFrame();
        expect(rec.events).to.deep.equal([]);
        linkOf(el)!.click();
        expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
          ['uvalib-card', 'card-click', 'single'],
        ]);
        expect(JSON.stringify(rec.events)).to.not.include('Early');
        expect(JSON.stringify(rec.events)).to.not.include('#early');
      } finally {
        rec.restore();
      }
    });

    it('reports the 1-based place in the nearest grid, and skips no-analytics', async () => {
      const rec = recordAnalytics();
      try {
        const grid = await fixture<UvalibCardGrid>(`<uvalib-card-grid ${attr}>
          <uvalib-card ${attr} href="#a"><span slot="heading">A</span></uvalib-card>
          <uvalib-card ${attr} href="#b"><span slot="heading">B</span></uvalib-card>
          <uvalib-card ${attr} no-analytics href="#c"><span slot="heading">C</span></uvalib-card>
        </uvalib-card-grid>`);
        await grid.updateComplete;
        await nextFrame();
        const cards = [...grid.querySelectorAll('uvalib-card')];
        await Promise.all(cards.map((c) => (c as UvalibCard).updateComplete));
        linkOf(cards[1]!)!.click();
        linkOf(cards[2]!)!.click();
        expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
          ['uvalib-card', 'card-click', '2', 2],
        ]);
      } finally {
        rec.restore();
      }
    });

    it('fires a cancelable uvalib-card-navigate on a plain click only', async () => {
      const el = await make(`<span slot="heading">Early</span>`, 'href="#early"');
      const link = linkOf(el)!;
      const seen: unknown[] = [];
      const prevented: boolean[] = [];
      const route = (e: Event) => {
        seen.push((e as CustomEvent).detail);
        e.preventDefault();
      };
      // After the component's listener (same node, registered later), before document's
      // navigation cancel, so a modified click is still not prevented by the component.
      root(el)
        .querySelector('.card')!
        .addEventListener('click', (e) => {
          prevented.push(e.defaultPrevented);
          e.preventDefault();
        });
      document.addEventListener('uvalib-card-navigate', route);
      try {
        link.dispatchEvent(
          new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }),
        );
        link.dispatchEvent(
          new MouseEvent('click', {
            bubbles: true,
            composed: true,
            cancelable: true,
            metaKey: true,
          }),
        );
        expect(prevented).to.deep.equal([true, false]);
        expect(seen).to.deep.equal([{ href: '#early', position: 'single' }]);
      } finally {
        document.removeEventListener('uvalib-card-navigate', route);
      }
    });

    it('ignores a canceled or non-primary click and still tracks a modified one', async () => {
      const rec = recordAnalytics();
      const el = await make(`<span slot="heading">Early</span>`, 'href="#early"');
      const link = linkOf(el)!;
      const navs: unknown[] = [];
      const route = (e: Event) => navs.push((e as CustomEvent).detail);
      const stop = (e: Event) => e.preventDefault();
      document.addEventListener('uvalib-card-navigate', route);
      try {
        link.addEventListener('click', stop, { capture: true });
        link.dispatchEvent(
          new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }),
        );
        link.removeEventListener('click', stop, { capture: true });
        link.dispatchEvent(
          new MouseEvent('click', { bubbles: true, composed: true, cancelable: true, button: 2 }),
        );
        expect(rec.of('uvalib-analytics-event')).to.deep.equal([]);
        expect(navs).to.deep.equal([]);
        link.dispatchEvent(
          new MouseEvent('click', {
            bubbles: true,
            composed: true,
            cancelable: true,
            ctrlKey: true,
          }),
        );
        expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
          ['uvalib-card', 'card-click', 'single'],
        ]);
        expect(navs).to.deep.equal([]);
      } finally {
        link.removeEventListener('click', stop, { capture: true });
        document.removeEventListener('uvalib-card-navigate', route);
        rec.restore();
      }
    });

    it('paints the badge from the accent role tokens so it stays readable on the card', async () => {
      const el = await make(
        `<span slot="badge">13 photos</span><span slot="heading">Rotunda</span>`,
        'href="#rotunda"',
      );
      const badge = root(el).querySelector<HTMLElement>('.badge')!;
      const card = root(el).querySelector<HTMLElement>('.card')!;
      const media = root(el).querySelector<HTMLElement>('.media')!;
      expect(badge.hidden).to.equal(false);
      expect(media.hidden).to.equal(false);
      expect(getComputedStyle(badge).backgroundColor).to.equal('rgb(35, 45, 75)');
      expect(getComputedStyle(badge).color).to.equal('rgb(255, 255, 255)');
      // The shadow colour transitions, so a same-turn read would still be the start value.
      card.style.transition = 'none';
      const link = linkOf(el)!;
      link.focus();
      expect(el.matches(':focus-within')).to.equal(true);
      expect(getComputedStyle(card).boxShadow).to.contain('rgb(218, 218, 218)');
      el.style.setProperty('--uva-color-accent-bg', '#87b9d9');
      el.style.setProperty('--uva-color-on-accent', '#10172b');
      el.style.setProperty('--uva-color-surface-raised', '#232d4b');
      el.style.setProperty('--uva-color-shadow', 'rgb(1, 2, 3)');
      expect(getComputedStyle(badge).backgroundColor).to.equal('rgb(135, 185, 217)');
      expect(getComputedStyle(badge).color).to.equal('rgb(16, 23, 43)');
      expect(getComputedStyle(card).backgroundColor).to.equal('rgb(35, 45, 75)');
      expect(getComputedStyle(card).boxShadow).to.contain('rgb(1, 2, 3)');
      el.style.removeProperty('--uva-color-accent-bg');
      el.style.removeProperty('--uva-color-on-accent');
      el.style.removeProperty('--uva-color-surface-raised');
      el.style.removeProperty('--uva-color-shadow');
      expect(getComputedStyle(badge).backgroundColor).to.equal('rgb(35, 45, 75)');
      expect(getComputedStyle(badge).color).to.equal('rgb(255, 255, 255)');
      expect(getComputedStyle(card).boxShadow).to.contain('rgb(218, 218, 218)');
      link.blur();
    });

    it('shows the focus ring on the card when the heading link is focused', async () => {
      const el = await make(`<span slot="heading">Early fiction</span>`, 'href="#early"');
      const link = linkOf(el)!;
      (document.activeElement as HTMLElement | null)?.blur();
      await sendKeys({ press: 'Tab' });
      expect(link.matches(':focus-visible')).to.equal(true);
      const card = root(el).querySelector('.card')!;
      const ring = getComputedStyle(card);
      expect(ring.outlineStyle).to.equal('solid');
      expect(ring.outlineWidth).to.equal('3px');
      expect(ring.outlineColor).to.equal('rgb(229, 114, 0)');
      expect(getComputedStyle(link).outlineStyle).to.equal('none');
      link.blur();
    });

    it('passes axe', async () => {
      const el = await make(PHOTO, 'href="#rotunda"');
      await expectNoAxeViolations(el);
    });

    it('does not scroll horizontally at 320px', async () => {
      await setViewport({ width: 320, height: 640 });
      try {
        const el = await make(
          `<span slot="heading">Supercalifragilisticexpialidocious collection title</span>
           A very long excerpt that should wrap inside the card rather than widen the page.`,
          'href="#long"',
        );
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
        expect(el.getBoundingClientRect().right).to.be.at.most(320);
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
    });

    it('keeps the stretch with no-style and drops the link colour', async () => {
      const el = await make(`<span slot="heading">Early</span>`, 'no-style href="#early"');
      const link = linkOf(el)!;
      expect(getComputedStyle(link, '::after').position).to.equal('absolute');
      if (mode === 'shadow') expect(getComputedStyle(link).color).to.not.equal('rgb(35, 45, 75)');
    });
  });
}

describe('uvalib-card light DOM styles', () => {
  it('installs its styles in @layer uvalib, so page CSS wins', async () => {
    await fixture(
      `<uvalib-card no-shadow-dom href="#a"><span slot="heading">A</span></uvalib-card>`,
    );
    const texts = document.adoptedStyleSheets.map((s) =>
      [...s.cssRules].map((r) => r.cssText).join('\n'),
    );
    const own = texts.filter((t) => t.includes('uvalib-card .title-link'));
    expect(own.length).to.be.greaterThan(0);
    for (const t of own) expect(t.startsWith('@layer uvalib')).to.equal(true);
  });
});
