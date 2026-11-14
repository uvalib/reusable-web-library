import { expect, fixture, nextFrame } from '@open-wc/testing';
import { emulateMedia, sendKeys, sendMouse, setViewport } from '@web/test-runner-commands';
import '../src/components/site-page/site-page.js';
import '../src/components/site-main-nav/site-main-nav.js';
import type { SiteMainNav } from '../src/components/site-main-nav/SiteMainNav.js';
import type { SitePage } from '../src/components/site-page/SitePage.js';

type Updatable = Element & { updateComplete: Promise<unknown> };
const root = (el: Element): ParentNode => el.shadowRoot ?? el;

async function settle(...els: Element[]): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await nextFrame();
    for (const el of els) await (el as Updatable).updateComplete;
  }
}

/** The deepest focused element, through shadow roots. */
function active(): HTMLElement {
  let a = document.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a as HTMLElement;
}

const channels = (c: string): number[] => {
  const m = c.match(/[\d.]+/g)!.map(Number);
  return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1];
};
const luminance = ([r, g, b]: number[]): number => {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a: string, b: string): number => {
  const [la, lb] = [luminance(channels(a)), luminance(channels(b))].sort((x, y) => y - x);
  return (la + 0.05) / (lb + 0.05);
};
/** The first opaque background at or above `el`, crossing shadow boundaries; white if none. */
function backgroundOf(el: Element): string {
  let n: Element | null = el;
  while (n) {
    const bg = getComputedStyle(n).backgroundColor;
    if (channels(bg)[3] > 0) return bg;
    n = n.parentElement ?? ((n.getRootNode() as ShadowRoot).host as Element | undefined) ?? null;
  }
  return 'rgb(255, 255, 255)';
}
/**
 * The contrast of `el`'s focus ring against what it is drawn on: its own background for an
 * inset ring (negative offset), else the background around it.
 */
function ringContrast(el: HTMLElement): number {
  const s = getComputedStyle(el);
  expect(s.outlineStyle, 'a visible focus ring').to.not.equal('none');
  const inset = parseFloat(s.outlineOffset) < 0;
  const under = inset ? backgroundOf(el) : backgroundOf(el.parentElement!);
  return contrast(s.outlineColor, under);
}

/** Tab from a button before the nav to its first group button, so focus is :focus-visible. */
async function focusFirstToggle(before: HTMLElement): Promise<HTMLElement> {
  before.focus();
  await sendKeys({ press: 'Tab' });
  const t = active();
  expect(t.localName).to.equal('button');
  expect(t.matches(':focus-visible')).to.equal(true);
  return t;
}

const MIN = 3; // WCAG 1.4.11 non-text contrast

for (const mode of ['shadow', 'light'] as const) {
  describe(`site-main-nav focus rings (${mode})`, () => {
    beforeEach(async () => {
      await setViewport({ width: 1280, height: 800 });
      await sendMouse({ type: 'move', position: [1270, 790] }); // hover nothing in the nav
    });
    afterEach(() => setViewport({ width: 800, height: 600 }));

    const make = async () => {
      const wrap = await fixture(
        `<div><button id="before">before</button><site-main-nav ${mode === 'light' ? 'no-shadow-dom' : ''}></site-main-nav></div>`,
      );
      const el = wrap.querySelector<SiteMainNav>('site-main-nav')!;
      await settle(el);
      return { el, before: wrap.querySelector<HTMLElement>('#before')! };
    };

    it('keeps 3:1 against the background on a closed toggle, an expanded toggle and a panel link', async () => {
      const { el, before } = await make();
      const toggle = await focusFirstToggle(before);
      const closed = ringContrast(toggle);
      await sendKeys({ press: 'Enter' });
      await settle(el);
      expect(toggle.getAttribute('aria-expanded')).to.equal('true');
      const expanded = ringContrast(toggle);
      await sendKeys({ press: 'ArrowDown' });
      const link = active();
      expect(link.localName).to.equal('a');
      const panelLink = ringContrast(link);
      console.log(
        `focus ring contrast (${mode}): closed ${closed.toFixed(2)}, expanded ${expanded.toFixed(2)}, panel link ${panelLink.toFixed(2)}`,
      );
      expect(closed, 'closed toggle').to.be.at.least(MIN);
      expect(expanded, 'expanded toggle').to.be.at.least(MIN);
      expect(panelLink, 'panel link').to.be.at.least(MIN);
    });

    it('keeps the ring inside the control (outline-offset -4px)', async () => {
      const { el, before } = await make();
      const toggle = await focusFirstToggle(before);
      expect(getComputedStyle(toggle).outlineOffset).to.equal('-4px');
      await sendKeys({ press: 'Enter' });
      await settle(el);
      await sendKeys({ press: 'ArrowDown' });
      expect(getComputedStyle(active()).outlineOffset).to.equal('-4px');
    });
  });
}

describe('site-main-nav focus rings inside a light-mode site-page', () => {
  beforeEach(async () => {
    await setViewport({ width: 1280, height: 800 });
    await sendMouse({ type: 'move', position: [1270, 790] });
  });
  afterEach(() => setViewport({ width: 800, height: 600 }));

  it('match shadow mode although the page installs the unlayered accessibility sheet', async () => {
    const page = await fixture<SitePage>(
      '<site-page no-shadow-dom no-alerts><button id="before">before</button></site-page>',
    );
    const header = page.querySelector('site-header') as Element;
    await settle(page, header);
    const bar = header.querySelector<SiteMainNav>('header > site-main-nav')!;
    await settle(bar);
    // Tab from the last utility link into the bar.
    const utility = [...header.querySelectorAll<HTMLElement>('nav.inline a')].at(-1)!;
    const toggle = await focusFirstToggle(utility);
    expect(bar.contains(toggle)).to.equal(true);
    expect(getComputedStyle(toggle).outlineOffset).to.equal('-4px');
    expect(ringContrast(toggle)).to.be.at.least(MIN);
    await sendKeys({ press: 'Enter' });
    await settle(bar);
    expect(getComputedStyle(toggle).outlineOffset).to.equal('-4px');
    expect(ringContrast(toggle)).to.be.at.least(MIN);
    await sendKeys({ press: 'ArrowDown' });
    expect(getComputedStyle(active()).outlineOffset).to.equal('-4px');
    expect(ringContrast(active())).to.be.at.least(MIN);
    // Other components keep the page's ring.
    utility.focus();
    await sendKeys({ press: 'Shift+Tab' });
    expect(getComputedStyle(active()).outlineOffset).to.equal('2px');
  });
});

for (const mode of ['shadow', 'light'] as const) {
  describe(`site-main-nav in forced colors (${mode})`, () => {
    before(() => emulateMedia({ forcedColors: 'active' }));
    after(() => emulateMedia({ forcedColors: 'none' }));
    afterEach(() => setViewport({ width: 800, height: 600 }));

    it('gives the open panel an edge and the expanded button a visible outline', async () => {
      await setViewport({ width: 1280, height: 800 });
      expect(matchMedia('(forced-colors: active)').matches).to.equal(true);
      const el = await fixture<SiteMainNav>(
        `<site-main-nav ${mode === 'light' ? 'no-shadow-dom' : ''}></site-main-nav>`,
      );
      await settle(el);
      const [about, using] = [...root(el).querySelectorAll<HTMLButtonElement>('nav button')];
      expect(getComputedStyle(using).outlineStyle).to.equal('none');
      about.click();
      await settle(el);
      const s = getComputedStyle(about);
      expect(s.outlineStyle).to.equal('solid');
      expect(parseFloat(s.outlineWidth)).to.be.at.least(1);
      const panel = about.nextElementSibling as HTMLElement;
      const p = getComputedStyle(panel);
      const edge =
        (p.outlineStyle !== 'none' && parseFloat(p.outlineWidth) >= 1) ||
        (p.borderTopStyle !== 'none' && parseFloat(p.borderTopWidth) >= 1);
      expect(edge, 'panel has a border or outline').to.equal(true);
    });
  });
}
