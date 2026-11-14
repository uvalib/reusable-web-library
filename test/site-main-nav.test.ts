import { expect, fixture, html, nextFrame, oneEvent } from '@open-wc/testing';
import { sendKeys, sendMouse, setViewport } from '@web/test-runner-commands';
import '../src/components/site-main-nav/site-main-nav.js';
import type { SiteMainNav } from '../src/components/site-main-nav/SiteMainNav.js';
import { mainNavTiming } from '../src/components/site-main-nav/main-nav-items.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { MAIN_NAV_TEST_ITEMS } from './helpers/main-nav-intercept.mjs';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;

async function settle(el: SiteMainNav): Promise<void> {
  for (let i = 0; i < 2; i++) {
    await nextFrame();
    await el.updateComplete;
  }
}

const nav = (el: Element) => root(el).querySelector('nav.main-nav')!;
const toggles = (el: Element) => [
  ...root(el).querySelectorAll<HTMLButtonElement>('nav.main-nav button'),
];
const toggle = (el: Element, label: string) =>
  toggles(el).find((b) => b.textContent!.trim() === label)!;
const panelOf = (el: Element, b: HTMLButtonElement) =>
  (
    root(el) as ParentNode & { getElementById?: (id: string) => HTMLElement | null }
  ).querySelector<HTMLElement>(`[id="${b.getAttribute('aria-controls')}"]`)!;
const openPanels = (el: Element) =>
  [...root(el).querySelectorAll<HTMLElement>('nav.main-nav ul ul')].filter((u) => !u.hidden);
/** The deepest focused element, through shadow roots. */
function active(): Element | null {
  let a = document.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a;
}

type Tree = { label: string; href?: string; items?: { label: string; href: string }[] }[];
/** What the nav shows: top-level entries with resolved hrefs. */
function tree(el: Element): Tree {
  const top = [...root(el).querySelectorAll('nav.main-nav > ul > li')];
  return top.map((li) => {
    const b = li.querySelector(':scope > button');
    if (!b) {
      const a = li.querySelector(':scope > a')!;
      return { label: a.textContent!.trim(), href: a.getAttribute('href')! };
    }
    return {
      label: b.textContent!.trim(),
      items: [...li.querySelectorAll(':scope > ul > li > a')].map((a) => ({
        label: a.textContent!.trim(),
        href: a.getAttribute('href')!,
      })),
    };
  });
}

const W = 'https://www.library.virginia.edu';
const DEFAULT_TREE: Tree = [
  {
    label: 'About',
    items: [
      { label: 'About UVA Library', href: `${W}/about-uva-library` },
      {
        label: 'News & announcements',
        href: 'https://library.virginia.edu/news/all?mtm_campaign=main-nav',
      },
      { label: 'Plan a visit', href: `${W}/about-uva-library#visit` },
      { label: 'Library Assessment', href: `${W}/assessment` },
      { label: 'Staff directory', href: `${W}/staff` },
    ],
  },
  {
    label: 'Using the Library',
    items: [
      { label: 'Search, borrow, request', href: `${W}/services` },
      { label: 'Library spaces', href: `${W}/spaces` },
      { label: 'Equipment & technology', href: `${W}/equipment-and-tech` },
    ],
  },
  {
    label: 'Research & teaching support',
    items: [
      { label: 'Research & teaching support', href: `${W}/research-and-teaching` },
      { label: 'Research support', href: `${W}/research-and-teaching/research` },
      { label: 'Instruction assistance', href: `${W}/research-and-teaching/teach` },
      { label: 'Writing & publication', href: `${W}/research-and-teaching/write` },
    ],
  },
  {
    label: 'Get help',
    items: [
      { label: 'Get help', href: `${W}/help` },
      { label: 'Ask a Librarian', href: `${W}/askalibrarian` },
      { label: 'Accessibility services', href: `${W}/accessibility` },
      { label: 'Subject specialists', href: 'https://guides.lib.virginia.edu/subjectlibrarians' },
    ],
  },
];

/** Capture console.warn calls while `fn` runs. */
async function warnings(fn: () => Promise<void>): Promise<unknown[][]> {
  const warn = console.warn;
  const calls: unknown[][] = [];
  console.warn = (...args: unknown[]) => void calls.push(args);
  try {
    await fn();
  } finally {
    console.warn = warn;
  }
  return calls;
}

for (const mode of ['shadow', 'light'] as const) {
  const light = mode === 'light' ? 'no-shadow-dom' : '';

  describe(`site-main-nav (${mode})`, () => {
    const make = async (attrs = '', children = ''): Promise<SiteMainNav> => {
      const el = await fixture<SiteMainNav>(
        `<site-main-nav ${light} ${attrs}>${children}</site-main-nav>`,
      );
      await settle(el);
      return el;
    };
    afterEach(() => setViewport({ width: 800, height: 600 }));

    it('renders the bundled snapshot: four groups with their links', async () => {
      const el = await make();
      expect(tree(el)).to.deep.equal(DEFAULT_TREE);
    });

    it('is one navigation landmark named "Main", or from label', async () => {
      const el = await make();
      const navs = root(el).querySelectorAll('nav');
      expect(navs[0]).to.equal(nav(el));
      expect(navs.length).to.equal(1);
      expect(navs[0].getAttribute('aria-label')).to.equal('Main');
      el.setAttribute('label', 'Library');
      await settle(el);
      expect(nav(el).getAttribute('aria-label')).to.equal('Library');
    });

    it('uses the disclosure pattern: buttons controlling hidden lists, no ARIA menus', async () => {
      const el = await make();
      const r = root(el);
      expect(r.querySelector('[role=menu],[role=menuitem],[role=menubar],[role=button]')).to.equal(
        null,
      );
      expect(r.querySelector('a[href="#"]')).to.equal(null);
      expect(r.querySelector('li > li')).to.equal(null);
      expect(r.querySelector('[title]')).to.equal(null);
      const ids = new Set<string>();
      for (const b of toggles(el)) {
        expect(b.type).to.equal('button');
        const id = b.getAttribute('aria-controls')!;
        expect(id).to.be.a('string').and.not.equal('');
        ids.add(id);
        const panel = panelOf(el, b);
        expect(panel, `aria-controls ${id} resolves`).to.not.equal(null);
        expect(panel.localName).to.equal('ul');
        expect(b.nextElementSibling).to.equal(panel);
        expect(b.getAttribute('aria-expanded')).to.equal('false');
        expect(panel.hidden).to.equal(true);
      }
      expect(ids.size).to.equal(4);
    });

    it('gives each instance its own ids', async () => {
      const wrap = await fixture(
        html`<div>
          <site-main-nav ?no-shadow-dom=${!!light}></site-main-nav
          ><site-main-nav ?no-shadow-dom=${!!light}></site-main-nav>
        </div>`,
      );
      const [a, b] = [...wrap.querySelectorAll<SiteMainNav>('site-main-nav')];
      await settle(a);
      await settle(b);
      const idsA = toggles(a).map((t) => t.getAttribute('aria-controls'));
      const idsB = toggles(b).map((t) => t.getAttribute('aria-controls'));
      for (const id of idsA) expect(idsB).to.not.include(id);
      if (mode === 'light') {
        for (const id of [...idsA, ...idsB]) {
          expect(document.querySelectorAll(`[id="${id}"]`).length).to.equal(1);
        }
      }
    });

    it('a click toggles a group, and only one is open at a time', async () => {
      const el = await make();
      const about = toggle(el, 'About');
      const using = toggle(el, 'Using the Library');
      about.click();
      await settle(el);
      expect(about.getAttribute('aria-expanded')).to.equal('true');
      expect(openPanels(el)).to.deep.equal([panelOf(el, about)]);
      using.click();
      await settle(el);
      expect(about.getAttribute('aria-expanded')).to.equal('false');
      expect(using.getAttribute('aria-expanded')).to.equal('true');
      expect(openPanels(el)).to.deep.equal([panelOf(el, using)]);
      using.click();
      await settle(el);
      expect(using.getAttribute('aria-expanded')).to.equal('false');
      expect(openPanels(el)).to.deep.equal([]);
    });

    for (const key of ['Enter', ' ']) {
      it(`${key === ' ' ? 'Space' : key} toggles a group`, async () => {
        const el = await make();
        const about = toggle(el, 'About');
        about.focus();
        await sendKeys({ press: key === ' ' ? 'Space' : key });
        await settle(el);
        expect(about.getAttribute('aria-expanded')).to.equal('true');
        expect(panelOf(el, about).hidden).to.equal(false);
        await sendKeys({ press: key === ' ' ? 'Space' : key });
        await settle(el);
        expect(about.getAttribute('aria-expanded')).to.equal('false');
      });
    }

    it('Escape closes the panel and returns focus to its button', async () => {
      const el = await make();
      const about = toggle(el, 'About');
      about.focus();
      await sendKeys({ press: 'Enter' });
      await settle(el);
      await sendKeys({ press: 'ArrowDown' });
      expect(active()!.textContent).to.equal('About UVA Library');
      await sendKeys({ press: 'Escape' });
      await settle(el);
      expect(about.getAttribute('aria-expanded')).to.equal('false');
      expect(panelOf(el, about).hidden).to.equal(true);
      expect(active()).to.equal(about);
      // On the button itself, Escape closes too.
      await sendKeys({ press: 'Enter' });
      await settle(el);
      await sendKeys({ press: 'Escape' });
      await settle(el);
      expect(about.getAttribute('aria-expanded')).to.equal('false');
    });

    it('closes when focus leaves the nav', async () => {
      const wrap = await fixture(
        html`<div>
          <site-main-nav ?no-shadow-dom=${!!light}></site-main-nav><button id="after">x</button>
        </div>`,
      );
      const el = wrap.querySelector<SiteMainNav>('site-main-nav')!;
      await settle(el);
      const about = toggle(el, 'About');
      about.focus();
      about.click();
      await settle(el);
      // Moving within the nav keeps it open.
      toggle(el, 'Get help').focus();
      await settle(el);
      expect(about.getAttribute('aria-expanded')).to.equal('true');
      wrap.querySelector<HTMLButtonElement>('#after')!.focus();
      await settle(el);
      expect(about.getAttribute('aria-expanded')).to.equal('false');
    });

    it('closes on a pointerdown outside the nav, not inside it', async () => {
      await setViewport({ width: 1280, height: 800 });
      const el = await make();
      const about = toggle(el, 'About');
      about.click();
      await settle(el);
      const link = panelOf(el, about).querySelector('a')!.getBoundingClientRect();
      // Pressing inside the open panel (on a link's padding, without releasing) keeps it open.
      await sendMouse({
        type: 'move',
        position: [Math.round(link.left + 4), Math.round(link.top + 4)],
      });
      await sendMouse({ type: 'down' });
      await settle(el);
      expect(about.getAttribute('aria-expanded')).to.equal('true');
      await sendMouse({ type: 'move', position: [1200, 700] });
      await sendMouse({ type: 'up' });
      // Outside: the document body, far from the nav.
      await sendMouse({ type: 'click', position: [1200, 700] });
      await settle(el);
      expect(about.getAttribute('aria-expanded')).to.equal('false');
    });

    it('arrow keys, Home and End move between the top-level buttons', async () => {
      const el = await make();
      const [about, using, research, help] = toggles(el);
      about.focus();
      await sendKeys({ press: 'ArrowRight' });
      expect(active()).to.equal(using);
      await sendKeys({ press: 'ArrowDown' }); // closed: next button
      expect(active()).to.equal(research);
      await sendKeys({ press: 'End' });
      expect(active()).to.equal(help);
      await sendKeys({ press: 'ArrowRight' }); // stays at the end
      expect(active()).to.equal(help);
      await sendKeys({ press: 'Home' });
      expect(active()).to.equal(about);
      await sendKeys({ press: 'ArrowLeft' });
      expect(active()).to.equal(about);
      help.focus();
      await sendKeys({ press: 'ArrowUp' });
      expect(active()).to.equal(research);
    });

    it('ArrowDown on an open button enters its panel; arrows, Home and End move inside', async () => {
      const el = await make();
      const using = toggle(el, 'Using the Library');
      using.focus();
      await sendKeys({ press: 'Enter' });
      await settle(el);
      await sendKeys({ press: 'ArrowDown' });
      expect(active()!.textContent).to.equal('Search, borrow, request');
      await sendKeys({ press: 'ArrowDown' });
      expect(active()!.textContent).to.equal('Library spaces');
      await sendKeys({ press: 'End' });
      expect(active()!.textContent).to.equal('Equipment & technology');
      await sendKeys({ press: 'ArrowDown' });
      expect(active()!.textContent).to.equal('Equipment & technology');
      await sendKeys({ press: 'ArrowUp' });
      expect(active()!.textContent).to.equal('Library spaces');
      await sendKeys({ press: 'Home' });
      expect(active()!.textContent).to.equal('Search, borrow, request');
      // Tab still moves through the links (it is navigation, not a menu).
      await sendKeys({ press: 'Tab' });
      expect(active()!.textContent).to.equal('Library spaces');
    });

    describe('current page', () => {
      const currentLinks = (el: Element) =>
        [...root(el).querySelectorAll('nav.main-nav [aria-current]')].map((n) => [
          n.textContent!.trim(),
          n.getAttribute('aria-current'),
        ]);

      it('marks the matching link and its group button, ignoring query, hash and a trailing slash', async () => {
        const el = await make(`current="${W}/spaces/?from=x#top"`);
        expect(currentLinks(el)).to.deep.equal([
          ['Using the Library', 'true'],
          ['Library spaces', 'page'],
        ]);
      });

      it('shows the group marker as bold with a thick underline, not colour alone', async () => {
        await setViewport({ width: 1280, height: 800 });
        const el = await make(`current="${W}/spaces"`);
        const using = toggle(el, 'Using the Library');
        const about = toggle(el, 'About');
        const s = getComputedStyle(using);
        expect(s.fontWeight).to.equal('700');
        expect(s.textDecorationLine).to.equal('underline');
        expect(s.textDecorationThickness).to.equal('3px');
        expect(s.textDecorationColor).to.equal('rgb(229, 114, 0)');
        expect(getComputedStyle(about).fontWeight).to.not.equal('700');
        expect(getComputedStyle(about).textDecorationLine).to.equal('none');
      });

      it('matches on host and path: another host or path marks nothing', async () => {
        expect(currentLinks(await make('current="https://example.edu/spaces"'))).to.deep.equal([]);
        expect(currentLinks(await make(`current="${W}/spaces/more"`))).to.deep.equal([]);
      });

      it('treats www. and the bare host as the same site', async () => {
        const el = await make('current="https://library.virginia.edu/staff"');
        expect(currentLinks(el)).to.deep.equal([
          ['About', 'true'],
          ['Staff directory', 'page'],
        ]);
      });

      it('marks one link when two differ only by hash: the one with the same hash, else the one without', async () => {
        expect(currentLinks(await make(`current="${W}/about-uva-library"`))).to.deep.equal([
          ['About', 'true'],
          ['About UVA Library', 'page'],
        ]);
        expect(currentLinks(await make(`current="${W}/about-uva-library#visit"`))).to.deep.equal([
          ['About', 'true'],
          ['Plan a visit', 'page'],
        ]);
      });

      it('defaults to the page location', async () => {
        const el = await make(
          '',
          `<nav slot="main-nav"><ul><li><a href="${location.pathname}">Here</a></li><li><a href="/elsewhere">There</a></li></ul></nav>`,
        );
        el.rootLinkDomain = location.origin;
        await settle(el);
        expect(currentLinks(el)).to.deep.equal([['Here', 'page']]);
      });
    });

    it('joins relative hrefs to root-link-domain and keeps absolute ones', async () => {
      const el = await make('root-link-domain="https://x.example.edu/"');
      const using = tree(el)[1].items!;
      expect(using[1]).to.deep.equal({
        label: 'Library spaces',
        href: 'https://x.example.edu/spaces',
      });
      const about = tree(el)[0].items!;
      expect(about[1].href).to.equal('https://library.virginia.edu/news/all?mtm_campaign=main-nav');
      expect(tree(el)[3].items![3].href).to.equal(
        'https://guides.lib.virginia.edu/subjectlibrarians',
      );
    });

    describe('slot="main-nav" markup', () => {
      const MARKUP = `<nav slot="main-nav"><ul>
          <li><a href="/direct">Direct</a></li>
          <li><span>Group</span><ul><li><a href="/g1">G one</a></li><li><a href="https://e.edu/g2">G two</a></li></ul></li>
        </ul></nav>`;

      it('replaces the snapshot, and the source stays hidden', async () => {
        const el = await make('', MARKUP);
        expect(tree(el)).to.deep.equal([
          { label: 'Direct', href: `${W}/direct` },
          {
            label: 'Group',
            items: [
              { label: 'G one', href: `${W}/g1` },
              { label: 'G two', href: 'https://e.edu/g2' },
            ],
          },
        ]);
        const source = el.querySelector('[slot="main-nav"]')!;
        expect(source.checkVisibility()).to.equal(false);
        // The direct link is a plain link, not a button.
        expect(root(el).querySelector('nav.main-nav > ul > li > a')!.textContent).to.equal(
          'Direct',
        );
        expect(toggles(el).length).to.equal(1);
      });

      it('skips invalid children with one warning', async () => {
        let el!: SiteMainNav;
        const calls = await warnings(async () => {
          el = await make(
            '',
            `<nav slot="main-nav"><ul>
              <li><a href="/ok">OK</a></li>
              <li>loose text</li>
              <li><a>No href</a></li>
              <div>not an li</div>
              <li><span>Empty group</span><ul></ul></li>
              <li><span>Group</span><ul><li><a href="/g">G</a></li><li><span>bad</span></li></ul></li>
            </ul></nav>`,
          );
          // A later change with more invalid entries does not warn again.
          el.querySelector('[slot="main-nav"] ul')!.append(document.createElement('p'));
          await settle(el);
        });
        expect(tree(el)).to.deep.equal([
          { label: 'OK', href: `${W}/ok` },
          { label: 'Group', items: [{ label: 'G', href: `${W}/g` }] },
        ]);
        const mine = calls.filter((c) => String(c[0]).includes('site-main-nav'));
        expect(mine.length).to.equal(1);
      });

      it('follows live changes to the markup', async () => {
        const el = await make('', MARKUP);
        const source = el.querySelector('[slot="main-nav"]')!;
        const li = document.createElement('li');
        li.innerHTML = '<a href="/added">Added</a>';
        source.querySelector('ul')!.append(li);
        await settle(el);
        expect(tree(el).map((i) => i.label)).to.deep.equal(['Direct', 'Group', 'Added']);
        source.querySelector('a')!.textContent = 'Renamed';
        await settle(el);
        expect(tree(el)[0].label).to.equal('Renamed');
        source.querySelector('a')!.setAttribute('href', '/moved');
        await settle(el);
        expect(tree(el)[0].href).to.equal(`${W}/moved`);
        source.remove();
        await settle(el);
        expect(tree(el)).to.deep.equal(DEFAULT_TREE);
      });

      it('is read when added after the first render', async () => {
        const el = await make();
        el.insertAdjacentHTML('beforeend', MARKUP);
        await settle(el);
        expect(tree(el)[0].label).to.equal('Direct');
      });
    });

    describe('.items', () => {
      it('replaces the snapshot', async () => {
        const el = await make();
        el.items = [
          { label: 'One', href: '/one' },
          { label: 'Two', items: [{ label: 'Two a', href: '/two-a' }] },
        ];
        await settle(el);
        expect(tree(el)).to.deep.equal([
          { label: 'One', href: `${W}/one` },
          { label: 'Two', items: [{ label: 'Two a', href: `${W}/two-a` }] },
        ]);
        el.items = undefined;
        await settle(el);
        expect(tree(el)).to.deep.equal(DEFAULT_TREE);
      });

      it('flattens deeper levels into their group, with one warning', async () => {
        const el = await make();
        const calls = await warnings(async () => {
          el.items = [
            {
              label: 'G',
              items: [
                { label: 'A', href: '/a' },
                // Deeper than the nav shows.
                {
                  label: 'Sub',
                  items: [{ label: 'B', href: '/b' }],
                } as unknown as { label: string; href: string },
              ],
            },
          ];
          await settle(el);
          el.items = [...el.items!];
          await settle(el);
        });
        expect(tree(el)).to.deep.equal([
          {
            label: 'G',
            items: [
              { label: 'A', href: `${W}/a` },
              { label: 'B', href: `${W}/b` },
            ],
          },
        ]);
        expect(calls.filter((c) => String(c[0]).includes('site-main-nav')).length).to.equal(1);
      });

      it('loses to slotted markup', async () => {
        const el = await make(
          '',
          '<nav slot="main-nav"><ul><li><a href="/m">Markup</a></li></ul></nav>',
        );
        el.items = [{ label: 'Prop', href: '/p' }];
        await settle(el);
        expect(tree(el).map((i) => i.label)).to.deep.equal(['Markup']);
      });
    });

    describe('items-src', () => {
      it('loads the items from a URL', async () => {
        const el = await make('items-src="https://main-nav.test/items.json"');
        await waitFor(() => tree(el)[0]?.label === 'Fetched group');
        expect(tree(el)).to.deep.equal([
          { label: 'Fetched group', items: [{ label: 'Fetched one', href: `${W}/fetched-one` }] },
          { label: 'Fetched link', href: 'https://example.edu/fetched' },
        ]);
        expect(MAIN_NAV_TEST_ITEMS.length).to.equal(2);
      });

      it('loses to .items', async () => {
        const el = await make('items-src="https://main-nav.test/items.json"');
        el.items = [{ label: 'Prop', href: '/p' }];
        await settle(el);
        await new Promise((r) => setTimeout(r, 100));
        await settle(el);
        expect(tree(el).map((i) => i.label)).to.deep.equal(['Prop']);
      });

      for (const [name, url] of [
        ['a failed fetch', 'https://main-nav-fail.test/items.json'],
        ['a response with no valid entries', 'https://main-nav.test/bad.json'],
      ]) {
        it(`falls back to the snapshot and fires site-main-nav-error after ${name}`, async () => {
          const saved = { ...mainNavTiming };
          Object.assign(mainNavTiming, { attempts: 1 });
          try {
            const el = document.createElement('site-main-nav') as SiteMainNav;
            if (light) el.setAttribute('no-shadow-dom', '');
            el.setAttribute('items-src', url);
            const parent = await fixture('<div></div>');
            const event = oneEvent(el, 'site-main-nav-error');
            parent.append(el);
            const e = (await event) as CustomEvent<{ src: string; message: string }>;
            expect(e.detail.src).to.equal(url);
            expect(e.detail.message).to.be.a('string');
            expect(e.bubbles && e.composed).to.equal(true);
            await settle(el);
            expect(tree(el)).to.deep.equal(DEFAULT_TREE);
          } finally {
            Object.assign(mainNavTiming, saved);
          }
        });
      }

      it('times out a hung fetch', async () => {
        const saved = { ...mainNavTiming };
        Object.assign(mainNavTiming, { attempts: 1, timeout: 200 });
        try {
          const el = document.createElement('site-main-nav') as SiteMainNav;
          if (light) el.setAttribute('no-shadow-dom', '');
          el.setAttribute('items-src', 'https://main-nav-hang.test/items.json');
          const parent = await fixture('<div></div>');
          const started = performance.now();
          const event = oneEvent(el, 'site-main-nav-error');
          parent.append(el);
          await event;
          expect(performance.now() - started).to.be.below(2000);
          expect(tree(el)).to.deep.equal(DEFAULT_TREE);
        } finally {
          Object.assign(mainNavTiming, saved);
        }
      });
    });

    it('lays the accordion out in flow, with the same disclosure buttons', async () => {
      await setViewport({ width: 390, height: 800 });
      const el = await make('layout="accordion"');
      const about = toggle(el, 'About');
      about.click();
      await settle(el);
      const panel = panelOf(el, about);
      expect(getComputedStyle(panel).position).to.equal('static');
      expect(about.getAttribute('aria-expanded')).to.equal('true');
      // Buttons span the nav's width.
      expect(about.getBoundingClientRect().width).to.be.closeTo(
        nav(el).getBoundingClientRect().width,
        1,
      );
    });

    it('lays the bar out with the live look', async () => {
      await setViewport({ width: 1280, height: 800 });
      const el = await make();
      const n = nav(el);
      expect(getComputedStyle(n).borderBottom).to.equal('5px solid rgb(35, 45, 75)');
      const about = toggle(el, 'About');
      const s = getComputedStyle(about);
      expect(s.fontSize).to.equal('17px');
      expect(s.fontWeight).to.equal('500');
      expect(s.color).to.equal('rgb(43, 43, 43)');
      expect(s.paddingTop).to.equal('11.5px');
      expect(s.paddingLeft).to.equal('17px');
      expect(about.getBoundingClientRect().height).to.be.closeTo(48.5, 1);
      about.click();
      await settle(el);
      const open = getComputedStyle(about);
      expect(open.backgroundColor).to.equal('rgb(218, 218, 218)');
      expect(open.color).to.equal('rgb(35, 45, 75)');
      const panel = panelOf(el, about);
      const p = getComputedStyle(panel);
      expect(p.position).to.equal('absolute');
      expect(p.zIndex).to.equal('1000');
      expect(p.backgroundColor).to.equal('rgb(255, 255, 255)');
      // Panel links do not wrap their labels.
      const news = [...panel.querySelectorAll('a')].find((a) => a.textContent!.startsWith('News'))!;
      const lineHeight = parseFloat(getComputedStyle(news).lineHeight);
      const r = news.getBoundingClientRect();
      expect(r.height - 17).to.be.below(lineHeight * 1.5);
      const a = getComputedStyle(news);
      expect(a.color).to.equal('rgb(35, 45, 75)');
      expect(a.textDecorationLine).to.equal('underline');
      expect(a.paddingTop).to.equal('8.5px');
      expect(a.paddingLeft).to.equal('17px');
    });

    for (const width of [1280, 390]) {
      for (const state of ['closed', 'open'] as const) {
        it(`has no axe violations at any impact at ${width}px, ${state}`, async () => {
          await setViewport({ width, height: 800 });
          const el = await make(`current="${W}/spaces"`);
          if (state === 'open') {
            toggle(el, 'Using the Library').click();
            await settle(el);
          }
          await expectNoAxeViolations(el);
        });
      }
    }
  });
}

/** Wait (up to 3s) until `check` passes. */
async function waitFor(check: () => boolean): Promise<void> {
  const until = performance.now() + 3000;
  while (!check()) {
    if (performance.now() > until) throw new Error('timed out waiting');
    await new Promise((r) => setTimeout(r, 20));
  }
}
