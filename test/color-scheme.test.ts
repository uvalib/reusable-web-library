import { expect, fixture, nextFrame, waitUntil } from '@open-wc/testing';
import { emulateMedia, sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/site-page/site-page.js';
import '../src/components/site-header/site-header.js';
import type { SitePage } from '../src/components/site-page/SitePage.js';
import { DARK_LOGO_URL, type SiteHeader } from '../src/components/site-header/SiteHeader.js';
import { COLOR_SCHEME_ATTR, COLOR_SCHEME_STORAGE_KEY } from '../src/base/color-scheme.js';
import { normalizeMarkup, HEADER_SNAPSHOT } from './helpers/header-snapshot.js';
import { rootOf } from './helpers/scheme-colors.js';

const html = document.documentElement;
const stored = () => localStorage.getItem(COLOR_SCHEME_STORAGE_KEY);
const attr = () => html.getAttribute(COLOR_SCHEME_ATTR);

/** Undo everything a test may leave on the shared document. */
async function reset(): Promise<void> {
  html.removeAttribute(COLOR_SCHEME_ATTR);
  html.style.removeProperty('color-scheme');
  localStorage.removeItem(COLOR_SCHEME_STORAGE_KEY);
  await emulateMedia({ colorScheme: 'light' });
  await setViewport({ width: 800, height: 600 });
}

const modeAttr = (mode: string) => (mode === 'light' ? 'no-shadow-dom' : '');

async function page(mode: string, attrs = 'color-scheme-switch'): Promise<SitePage> {
  return fixture<SitePage>(
    `<site-page ${modeAttr(mode)} no-alerts ${attrs}><h1>Page</h1></site-page>`,
  );
}

async function headerOf(el: SitePage): Promise<SiteHeader> {
  const header = rootOf(el).querySelector('site-header') as SiteHeader;
  await header.updateComplete;
  return header;
}

const controls = (header: SiteHeader) => [
  ...rootOf(header).querySelectorAll<HTMLFieldSetElement>('fieldset.color-scheme'),
];
const inlineControl = (h: SiteHeader) => rootOf(h).querySelector('fieldset.color-scheme.inline')!;
const menuControl = (h: SiteHeader) => rootOf(h).querySelector('fieldset.color-scheme.menu')!;
const radio = (fs: Element, value: string) =>
  fs.querySelector<HTMLInputElement>(`input[type=radio][value="${value}"]`)!;
const checkedValue = (fs: Element) =>
  fs.querySelector<HTMLInputElement>('input[type=radio]:checked')?.value;
const logoSrc = (h: SiteHeader) => rootOf(h).querySelector<HTMLImageElement>('.logo img')!.src;
const currentlyText = (fs: Element) =>
  radio(fs, 'system').closest('label')!.querySelector('.visually-hidden')!.textContent;

/** Click a radio like a visitor (fires input and change). */
async function pick(header: SiteHeader, fs: Element, value: string): Promise<void> {
  radio(fs, value).click();
  await header.updateComplete;
}

describe('dark mode (color-scheme-switch)', function () {
  this.timeout(10000);
  afterEach(reset);

  describe('off by default', () => {
    for (const mode of ['shadow', 'light']) {
      it(`${mode}: no control, no attribute, even with the OS dark`, async () => {
        await emulateMedia({ colorScheme: 'dark' });
        const el = await page(mode, '');
        const header = await headerOf(el);
        expect(controls(header)).to.have.length(0);
        expect(html.hasAttribute(COLOR_SCHEME_ATTR)).to.equal(false);
        expect(logoSrc(header)).to.not.equal(DARK_LOGO_URL);
        expect(getComputedStyle(header).colorScheme).to.equal('light');
      });

      it(`${mode}: inert: no storage read, no media query, no storage listener`, async () => {
        await emulateMedia({ colorScheme: 'dark' });
        const reads: string[] = [];
        const queries: string[] = [];
        const listeners: string[] = [];
        const getItem = Storage.prototype.getItem;
        const matchMedia = window.matchMedia;
        const addEventListener = window.addEventListener;
        Storage.prototype.getItem = function (key: string) {
          reads.push(key);
          return getItem.call(this, key);
        };
        window.matchMedia = (q: string) => (queries.push(q), matchMedia.call(window, q));
        window.addEventListener = function (this: Window, type: string, ...rest: unknown[]) {
          listeners.push(type);
          return (addEventListener as (...a: unknown[]) => void).call(this, type, ...rest);
        } as typeof window.addEventListener;
        try {
          const el = await page(mode, '');
          const header = await headerOf(el);
          header.requestUpdate();
          await header.updateComplete;
          await nextFrame();
        } finally {
          Storage.prototype.getItem = getItem;
          window.matchMedia = matchMedia;
          window.addEventListener = addEventListener;
        }
        expect(reads).to.not.include(COLOR_SCHEME_STORAGE_KEY);
        expect(queries.filter((q) => /prefers-color-scheme|forced-colors/.test(q))).to.deep.equal(
          [],
        );
        expect(listeners).to.not.include('storage');
      });
    }

    it('an inert header starts following once another component turns dark mode on', async () => {
      localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'dark');
      const off = await fixture<SiteHeader>(`<site-header></site-header>`);
      await off.updateComplete;
      expect(logoSrc(off)).to.not.equal(DARK_LOGO_URL);
      const on = document.createElement('site-header') as SiteHeader;
      on.setAttribute('color-scheme-switch', '');
      off.after(on);
      await on.updateComplete;
      await off.updateComplete;
      expect(attr()).to.equal('dark');
      expect(logoSrc(off)).to.equal(DARK_LOGO_URL);
      on.remove();
      await off.updateComplete;
      expect(html.hasAttribute(COLOR_SCHEME_ATTR)).to.equal(false);
      expect(logoSrc(off)).to.not.equal(DARK_LOGO_URL);
    });

    describe('the header markup with the switch off is byte-identical to main (raw)', () => {
      before(async () => {
        const { SiteHeaderBeforeDarkMode } =
          await import('./fixtures/main-header/SiteHeaderBeforeDarkMode.js');
        if (!customElements.get('site-header-before-dark'))
          customElements.define('site-header-before-dark', SiteHeaderBeforeDarkMode);
      });

      /** Raw markup, whitespace and Lit markers kept; only per-instance ids numbered. */
      const raw = (el: Element) =>
        [...rootOf(el).childNodes]
          .map((n) =>
            n instanceof Element
              ? n.outerHTML
              : n.nodeType === 3
                ? n.textContent
                : `<!--${(n as Comment).data}-->`,
          )
          .join('')
          .replace(/utility-menu-\d+/g, 'utility-menu-N')
          .replace(/main-nav-\d+-/g, 'main-nav-N-');

      for (const mode of ['shadow', 'light'] as const) {
        for (const [name, attrs, kids] of [
          ['default', '', ''],
          ['no-main-nav', 'no-main-nav', ''],
          [
            'site links',
            'site-links-label="Docs"',
            '<a slot="site-links" href="/a" aria-current="page">A</a><a slot="site-links" href="/b">B</a>',
          ],
          ['vendor', 'variant="vendor"', ''],
        ] as const) {
          it(`${mode}, ${name}`, async () => {
            await emulateMedia({ colorScheme: 'dark' });
            const light = modeAttr(mode);
            const wrap = await fixture(
              `<div><site-header ${light} ${attrs}>${kids}</site-header><site-header-before-dark ${light} ${attrs}>${kids}</site-header-before-dark></div>`,
            );
            const [now, then] = [...wrap.children] as SiteHeader[];
            await now!.updateComplete;
            await then!.updateComplete;
            await nextFrame();
            expect(raw(now!)).to.equal(raw(then!));
          });
        }
      }
    });

    it('the header markup with the switch off matches the normalised snapshot', async () => {
      for (const [mode, key] of [
        ['shadow', 'shadow'],
        ['light', 'light'],
      ] as const) {
        const h = await fixture<SiteHeader>(`<site-header ${modeAttr(mode)}></site-header>`);
        await h.updateComplete;
        expect(normalizeMarkup(rootOf(h).querySelector('header')!.outerHTML)).to.equal(
          HEADER_SNAPSHOT[key],
        );
      }
    });
  });

  describe('without light-dark() support', () => {
    let supports: typeof CSS.supports;
    beforeEach(() => {
      supports = CSS.supports;
      CSS.supports = () => false;
    });
    afterEach(() => {
      CSS.supports = supports;
    });

    it('shows no control, sets no attribute and stays light', async () => {
      localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'dark');
      await emulateMedia({ colorScheme: 'dark' });
      const header = await headerOf(await page('shadow'));
      expect(controls(header)).to.have.length(0);
      expect(html.hasAttribute(COLOR_SCHEME_ATTR)).to.equal(false);
      expect(logoSrc(header)).to.not.equal(DARK_LOGO_URL);
      expect(getComputedStyle(document.body).backgroundColor).to.equal('rgba(0, 0, 0, 0)');
    });
  });

  for (const mode of ['shadow', 'light']) {
    describe(`opt-in (${mode})`, () => {
      it('defaults to System, which follows the OS preference live', async () => {
        const header = await headerOf(await page(mode));
        expect(attr()).to.equal('system');
        const fs = inlineControl(header);
        expect(checkedValue(fs)).to.equal('system');
        expect(getComputedStyle(html).colorScheme).to.equal('light dark');
        expect(getComputedStyle(document.body).backgroundColor).to.equal('rgb(255, 255, 255)');
        expect(currentlyText(fs)).to.equal(' (currently light)');

        await emulateMedia({ colorScheme: 'dark' });
        await waitUntil(() => currentlyText(inlineControl(header)) === ' (currently dark)');
        expect(getComputedStyle(document.body).backgroundColor).to.equal('rgb(16, 23, 43)');
        expect(logoSrc(header)).to.equal(DARK_LOGO_URL);
        expect(stored()).to.equal(null);

        await emulateMedia({ colorScheme: 'light' });
        await waitUntil(() => currentlyText(inlineControl(header)) === ' (currently light)');
        expect(getComputedStyle(document.body).backgroundColor).to.equal('rgb(255, 255, 255)');
      });

      it('Light and Dark override the OS, are stored, and System removes the key', async () => {
        await emulateMedia({ colorScheme: 'dark' });
        const header = await headerOf(await page(mode));
        await pick(header, inlineControl(header), 'light');
        expect(stored()).to.equal('light');
        expect(attr()).to.equal('light');
        expect(getComputedStyle(document.body).backgroundColor).to.equal('rgb(255, 255, 255)');
        expect(logoSrc(header)).to.not.equal(DARK_LOGO_URL);
        // Both controls show the choice.
        expect(checkedValue(menuControl(header))).to.equal('light');

        await emulateMedia({ colorScheme: 'light' });
        await pick(header, inlineControl(header), 'dark');
        expect(stored()).to.equal('dark');
        expect(attr()).to.equal('dark');
        expect(getComputedStyle(document.body).backgroundColor).to.equal('rgb(16, 23, 43)');
        expect(logoSrc(header)).to.equal(DARK_LOGO_URL);

        await pick(header, menuControl(header), 'system');
        expect(stored()).to.equal(null);
        expect(attr()).to.equal('system');
        expect(checkedValue(inlineControl(header))).to.equal('system');
        expect(logoSrc(header)).to.not.equal(DARK_LOGO_URL);
      });

      it('keeps a stored choice when the OS preference comes to match it', async () => {
        const header = await headerOf(await page(mode));
        await pick(header, inlineControl(header), 'dark');
        await emulateMedia({ colorScheme: 'dark' });
        await emulateMedia({ colorScheme: 'light' });
        await nextFrame();
        expect(stored()).to.equal('dark');
        expect(checkedValue(inlineControl(header))).to.equal('dark');
      });

      it('restores the stored choice on the next page load', async () => {
        localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'dark');
        const header = await headerOf(await page(mode));
        expect(attr()).to.equal('dark');
        expect(checkedValue(inlineControl(header))).to.equal('dark');
        expect(logoSrc(header)).to.equal(DARK_LOGO_URL);
      });

      it('follows a change made in another tab (storage event)', async () => {
        const header = await headerOf(await page(mode));
        localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'dark');
        window.dispatchEvent(
          new StorageEvent('storage', { key: COLOR_SCHEME_STORAGE_KEY, newValue: 'dark' }),
        );
        await header.updateComplete;
        expect(checkedValue(inlineControl(header))).to.equal('dark');
        expect(attr()).to.equal('dark');
        localStorage.removeItem(COLOR_SCHEME_STORAGE_KEY);
        window.dispatchEvent(new StorageEvent('storage', { key: null }));
        await header.updateComplete;
        expect(checkedValue(inlineControl(header))).to.equal('system');
        expect(attr()).to.equal('system');
      });

      it('still works for the page when storage throws', async () => {
        const proto = Storage.prototype;
        const saved = { get: proto.getItem, set: proto.setItem, remove: proto.removeItem };
        const fail = () => {
          throw new DOMException('denied', 'SecurityError');
        };
        proto.getItem = fail;
        proto.setItem = fail;
        proto.removeItem = fail;
        try {
          const header = await headerOf(await page(mode));
          expect(attr()).to.equal('system');
          await pick(header, inlineControl(header), 'dark');
          expect(attr()).to.equal('dark');
          expect(checkedValue(menuControl(header))).to.equal('dark');
          expect(logoSrc(header)).to.equal(DARK_LOGO_URL);
          await pick(header, inlineControl(header), 'system');
          expect(attr()).to.equal('system');
        } finally {
          Object.assign(proto, {
            getItem: saved.get,
            setItem: saved.set,
            removeItem: saved.remove,
          });
        }
      });

      it('is a native radio group with a "Theme" legend, unique names, and arrow keys', async () => {
        const el = await page(mode);
        const header = await headerOf(el);
        const [inline, menu] = [inlineControl(header), menuControl(header)];
        for (const fs of [inline, menu]) {
          expect(fs.querySelector('legend')!.textContent!.trim()).to.equal('Theme');
          const radios = [...fs.querySelectorAll<HTMLInputElement>('input')];
          expect(radios.map((r) => r.type)).to.deep.equal(['radio', 'radio', 'radio']);
          expect(radios.map((r) => r.closest('label')!.textContent!.trim())).to.deep.equal([
            'Light',
            'Dark',
            'System (currently light)',
          ]);
          expect(new Set(radios.map((r) => r.name)).size).to.equal(1);
        }
        expect(radio(inline, 'light').name).to.not.equal(radio(menu, 'light').name);
        // No menu or switch roles: a plain radio group.
        expect(rootOf(header).querySelector('.color-scheme [role]')).to.equal(null);

        await setViewport({ width: 1280, height: 900 });
        radio(inline, 'system').focus();
        await sendKeys({ press: 'ArrowLeft' });
        await header.updateComplete;
        expect(checkedValue(inline)).to.equal('dark');
        expect(attr()).to.equal('dark');
        await sendKeys({ press: 'ArrowLeft' });
        await header.updateComplete;
        expect(attr()).to.equal('light');
      });

      it('two light-DOM pages never share radio names or popover ids', async () => {
        const a = await headerOf(await page(mode));
        const b = await headerOf(await page(mode));
        const names = (h: SiteHeader) => controls(h).map((fs) => fs.querySelector('input')!.name);
        expect(names(a).filter((n) => names(b).includes(n))).to.deep.equal([]);
      });

      it('wide screens: at the end of the utility row, on the same line, targets >= 24px', async () => {
        await setViewport({ width: 1280, height: 900 });
        const header = await headerOf(await page(mode));
        const fs = inlineControl(header);
        const row = fs.parentElement!;
        expect(row.matches('.utility-row')).to.equal(true);
        expect(row.querySelector(':scope > nav.inline')).to.not.equal(null);
        expect(row.lastElementChild).to.equal(fs);
        // Not inside the list of links.
        expect(fs.closest('ul')).to.equal(null);
        const nav = rootOf(header).querySelector('nav.inline a')!.getBoundingClientRect();
        const box = fs.getBoundingClientRect();
        expect(box.top).to.be.below(nav.bottom);
        expect(box.bottom).to.be.above(nav.top);
        expect(box.left).to.be.above(nav.right);
        for (const label of fs.querySelectorAll('label')) {
          const r = label.getBoundingClientRect();
          expect(r.width, label.textContent!).to.be.at.least(24);
          expect(r.height, label.textContent!).to.be.at.least(24);
        }
        expect(menuControl(header).checkVisibility()).to.equal(false);
        // The logo row keeps the offsets it has without the switch.
        const offsets = (h: SiteHeader) => {
          const top = rootOf(h).querySelector('header')!.getBoundingClientRect().top;
          return ['.logo img', 'nav.inline a'].map(
            (sel) => rootOf(h).querySelector(sel)!.getBoundingClientRect().top - top,
          );
        };
        const off = await headerOf(await page(mode, ''));
        expect(offsets(header)).to.deep.equal(offsets(off));
      });

      for (const width of [993, 1100]) {
        it(`does not overflow the header at ${width}px`, async () => {
          await setViewport({ width, height: 900 });
          const header = await headerOf(await page(mode));
          const h = rootOf(header).querySelector('header')!;
          expect(h.scrollWidth).to.be.at.most(h.clientWidth);
          const logo = rootOf(header).querySelector('.logo')!.getBoundingClientRect();
          expect(inlineControl(header).getBoundingClientRect().left).to.be.above(logo.right);
        });
      }

      it('phones: last in the Menu popover, full width, legend visible, with a rule', async () => {
        await setViewport({ width: 390, height: 844 });
        const header = await headerOf(await page(mode));
        expect(inlineControl(header).checkVisibility()).to.equal(false);
        rootOf(header).querySelector<HTMLButtonElement>('.menu-toggle')!.click();
        const pop = rootOf(header).querySelector<HTMLElement>('.menu-popover')!;
        expect(pop.matches(':popover-open')).to.equal(true);
        const fs = menuControl(header);
        expect(pop.lastElementChild).to.equal(fs);
        expect(fs.checkVisibility()).to.equal(true);
        const legend = fs.querySelector('legend')!.getBoundingClientRect();
        expect(legend.width).to.be.above(20);
        // Below the rule (the fieldset's top border), not drawn into it.
        const top =
          fs.getBoundingClientRect().top + parseFloat(getComputedStyle(fs).borderTopWidth);
        expect(legend.top).to.be.at.least(top);
        const seg = fs.querySelector('.segments')!.getBoundingClientRect();
        const cs = getComputedStyle(pop);
        const inner = pop.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        expect(seg.width).to.be.closeTo(inner, 1);
        expect(getComputedStyle(fs).borderTopStyle).to.equal('solid');
        for (const label of fs.querySelectorAll('label')) {
          expect(label.getBoundingClientRect().height).to.be.at.least(24);
        }
        await pick(header, fs, 'dark');
        expect(attr()).to.equal('dark');
      });

      it('no-main-nav: the popover becomes a container holding the list and the control', async () => {
        await setViewport({ width: 390, height: 844 });
        const header = await headerOf(await page(mode, 'color-scheme-switch no-main-nav'));
        const pop = rootOf(header).querySelector<HTMLElement>('[popover]')!;
        expect(pop.localName).to.equal('div');
        expect(pop.querySelector(':scope > nav.menu > ul > li')).to.not.equal(null);
        expect(pop.lastElementChild).to.equal(menuControl(header));
        // No rule above the list: it is the popover's first item.
        expect(getComputedStyle(pop.querySelector('nav.menu > ul')!).borderTopStyle).to.equal(
          'none',
        );
        rootOf(header).querySelector<HTMLButtonElement>('.menu-toggle')!.click();
        expect(menuControl(header).checkVisibility()).to.equal(true);
      });

      for (const width of [1280, 390]) {
        it(`vendor variant: after the inline nav, no overflow at ${width}px`, async () => {
          await setViewport({ width, height: 844 });
          const header = await headerOf(
            await page(mode, 'color-scheme-switch header-variant="vendor"'),
          );
          expect(controls(header)).to.have.length(1);
          const fs = inlineControl(header);
          expect(fs.checkVisibility()).to.equal(true);
          expect(fs.previousElementSibling!.matches('nav.inline')).to.equal(true);
          const h = rootOf(header).querySelector('header')!;
          expect(h.scrollWidth).to.be.at.most(h.clientWidth);
          expect(document.documentElement.scrollWidth).to.be.at.most(window.innerWidth);
          const logo = rootOf(header).querySelector('.logo img')!.getBoundingClientRect();
          const link = rootOf(header).querySelector('nav.inline a')!.getBoundingClientRect();
          expect(link.top).to.be.below(logo.bottom); // the logo row does not wrap
          await pick(header, fs, 'dark');
          expect(attr()).to.equal('dark');
        });
      }

      it('swaps the logo to the reversed one in dark mode and back, keeping its size', async () => {
        await setViewport({ width: 1280, height: 900 });
        const header = await headerOf(await page(mode));
        const img = rootOf(header).querySelector<HTMLImageElement>('.logo img')!;
        await pick(header, inlineControl(header), 'dark');
        expect(img.src).to.equal(DARK_LOGO_URL);
        await waitUntil(() => img.complete && img.naturalWidth === 300, 'stub logo loads');
        expect([img.getAttribute('width'), img.getAttribute('height')]).to.deep.equal([
          '304',
          '69',
        ]);
        expect(img.getBoundingClientRect().width).to.equal(225);
        await pick(header, inlineControl(header), 'light');
        expect(img.src).to.match(/library_rgb\.png$/);
      });
    });
  }

  for (const mode of ['shadow', 'light']) {
    it(`${mode}: switching on and off at runtime keeps the header alert in place`, async () => {
      const el = await fixture<SitePage>(
        `<site-page ${modeAttr(mode)} alerts-src="https://alerts.test/"
          ><h1>x</h1><a slot="site-links" href="/a">Site A</a></site-page
        >`,
      );
      const header = await headerOf(el);
      const alertIn = () =>
        mode === 'light'
          ? !!rootOf(header).querySelector(':scope > header > site-alerts[slot="alerts"]')
          : !!header.querySelector(':scope > site-alerts[slot="alerts"]');
      expect(alertIn()).to.equal(true);
      for (const on of [true, false, true]) {
        el.colorSchemeSwitch = on;
        await el.updateComplete;
        await header.updateComplete;
        await nextFrame();
        expect(controls(header).length > 0, `on=${on}`).to.equal(on);
        expect(alertIn(), `on=${on}`).to.equal(true);
        const links = [...rootOf(header).querySelectorAll('nav.inline a')].map(
          (x) => x.textContent,
        );
        expect(links, `on=${on}`).to.deep.equal(['Site A']);
        expect(html.hasAttribute(COLOR_SCHEME_ATTR)).to.equal(on);
      }
    });
  }

  describe('long site links: the control stays at the end of the utility row', () => {
    const LINKS = [
      'Collections',
      'Research guides',
      'Digital exhibits',
      'Contact us',
      'About this site',
    ]
      .map((t, i) => `<a slot="site-links" href="/l${i}">${t}</a>`)
      .join('');
    for (const mode of ['shadow', 'light']) {
      for (const extra of ['', 'no-main-nav']) {
        for (const width of [1280, 1000, 993]) {
          it(`${mode}${extra ? `, ${extra}` : ''}, ${width}px`, async () => {
            await setViewport({ width, height: 900 });
            const el = await fixture<SitePage>(
              `<site-page ${modeAttr(mode)} no-alerts color-scheme-switch ${extra}>${LINKS}<h1>x</h1></site-page>`,
            );
            const header = await headerOf(el);
            await nextFrame();
            const r = rootOf(header);
            const h = r.querySelector('header')!;
            const fs = inlineControl(header).getBoundingClientRect();
            const links = [...r.querySelectorAll('nav.inline a')].map((a) =>
              a.getBoundingClientRect(),
            );
            expect(links).to.have.length(5);
            const logo = r.querySelector('.logo img')!.getBoundingClientRect();
            // Same line as the first row of links, after every link, nothing overflowing.
            expect(fs.top).to.be.below(links[0]!.bottom);
            expect(fs.bottom).to.be.above(links[0]!.top);
            for (const l of links) expect(fs.left).to.be.at.least(l.right);
            expect(fs.right).to.be.at.most(h.getBoundingClientRect().right);
            expect(h.scrollWidth).to.be.at.most(h.clientWidth);
            expect(document.documentElement.scrollWidth).to.be.at.most(window.innerWidth);
            // The logo row does not wrap: the links start beside the logo.
            expect(links[0]!.top).to.be.below(logo.bottom);
            expect(links[0]!.left).to.be.above(logo.right);
          });
        }
      }
    }
  });

  describe('the "System" hint always names the OS preference', () => {
    for (const mode of ['shadow', 'light']) {
      it(`${mode}: with Light chosen and the OS dark it reads "(currently dark)", live`, async () => {
        await emulateMedia({ colorScheme: 'dark' });
        const header = await headerOf(await page(mode));
        await pick(header, inlineControl(header), 'light');
        expect(currentlyText(inlineControl(header))).to.equal(' (currently dark)');
        expect(currentlyText(menuControl(header))).to.equal(' (currently dark)');
        await emulateMedia({ colorScheme: 'light' });
        await waitUntil(() => currentlyText(inlineControl(header)) === ' (currently light)');
        await pick(header, inlineControl(header), 'dark');
        expect(currentlyText(inlineControl(header))).to.equal(' (currently light)');
      });
    }
  });

  describe('a stray data-uva-color-scheme (the snippet on a page without the switch)', () => {
    for (const mode of ['shadow', 'light']) {
      it(`${mode}: <site-page> without the switch removes it; the page stays light`, async () => {
        await emulateMedia({ colorScheme: 'dark' });
        localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'dark');
        html.setAttribute(COLOR_SCHEME_ATTR, 'dark');
        const header = await headerOf(await page(mode, ''));
        expect(html.hasAttribute(COLOR_SCHEME_ATTR)).to.equal(false);
        expect(logoSrc(header)).to.not.equal(DARK_LOGO_URL);
        expect(controls(header)).to.have.length(0);
        // The stored choice is the visitor's: it is left alone.
        expect(stored()).to.equal('dark');
      });

      it(`${mode}: a standalone <site-header> without the switch removes it too`, async () => {
        html.setAttribute(COLOR_SCHEME_ATTR, 'system');
        await fixture(`<site-header ${modeAttr(mode)}></site-header>`);
        expect(html.hasAttribute(COLOR_SCHEME_ATTR)).to.equal(false);
      });
    }
  });

  describe('several components on one page', () => {
    it('a header without the switch follows a dark root: never the navy logo', async () => {
      localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'dark');
      const wrap = await fixture(
        `<div><site-header color-scheme-switch></site-header><site-header no-shadow-dom></site-header></div>`,
      );
      const [on, off] = [...wrap.children] as SiteHeader[];
      await on!.updateComplete;
      await off!.updateComplete;
      // The passive header neither removed the owner's attribute nor kept the navy logo.
      expect(attr()).to.equal('dark');
      expect(logoSrc(off!)).to.equal(DARK_LOGO_URL);
      expect(controls(off!)).to.have.length(0);
      await pick(on!, inlineControl(on!), 'light');
      await off!.updateComplete;
      expect(logoSrc(off!)).to.not.equal(DARK_LOGO_URL);
    });

    it('turning one owner off keeps the attribute; the last one off removes it', async () => {
      const wrap = await fixture(
        `<div><site-header color-scheme-switch></site-header><site-header color-scheme-switch no-shadow-dom></site-header></div>`,
      );
      const [a, b] = [...wrap.children] as SiteHeader[];
      await a!.updateComplete;
      expect(attr()).to.equal('system');
      a!.removeAttribute('color-scheme-switch');
      await a!.updateComplete;
      expect(attr()).to.equal('system');
      b!.remove();
      expect(html.hasAttribute(COLOR_SCHEME_ATTR)).to.equal(false);
    });

    it('disconnecting the last owning <site-page> releases and removes the attribute', async () => {
      const el = await page('shadow');
      expect(attr()).to.equal('system');
      const other = await fixture<SiteHeader>(`<site-header color-scheme-switch></site-header>`);
      el.remove();
      expect(attr()).to.equal('system'); // the standalone header still owns it
      other.remove();
      expect(html.hasAttribute(COLOR_SCHEME_ATTR)).to.equal(false);
    });
  });

  describe('forced colors (a contrast theme repaints the header)', () => {
    afterEach(() => emulateMedia({ forcedColors: 'none' }));

    it('picks the logo from the OS theme, not the stored choice', async () => {
      localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'dark');
      const header = await headerOf(await page('shadow'));
      expect(logoSrc(header)).to.equal(DARK_LOGO_URL);
      await emulateMedia({ forcedColors: 'active', colorScheme: 'light' });
      await waitUntil(() => logoSrc(header) !== DARK_LOGO_URL, 'navy logo on a light theme');
      await emulateMedia({ forcedColors: 'active', colorScheme: 'dark' });
      await waitUntil(() => logoSrc(header) === DARK_LOGO_URL, 'white logo on a dark theme');
    });
  });

  describe('standalone <site-header color-scheme-switch>', () => {
    for (const mode of ['shadow', 'light']) {
      it(`${mode}: sets the attribute, installs the rules and renders the control`, async () => {
        localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'dark');
        const header = await fixture<SiteHeader>(
          `<site-header ${modeAttr(mode)} color-scheme-switch></site-header>`,
        );
        await header.updateComplete;
        expect(attr()).to.equal('dark');
        expect(checkedValue(inlineControl(header))).to.equal('dark');
        expect(getComputedStyle(rootOf(header).querySelector('header')!).backgroundColor).to.equal(
          'rgb(35, 45, 75)',
        );
      });
    }

    it('removing the attribute turns dark mode off again', async () => {
      const header = await fixture<SiteHeader>(`<site-header color-scheme-switch></site-header>`);
      expect(attr()).to.equal('system');
      header.removeAttribute('color-scheme-switch');
      await header.updateComplete;
      expect(html.hasAttribute(COLOR_SCHEME_ATTR)).to.equal(false);
      expect(controls(header)).to.have.length(0);
    });

    it('no-style: still sets the attribute and color-scheme on <html> for the host CSS', async () => {
      const header = await fixture<SiteHeader>(
        `<site-header no-style color-scheme-switch></site-header>`,
      );
      expect(attr()).to.equal('system');
      expect(html.style.colorScheme).to.equal('light dark');
      await pick(header, inlineControl(header), 'dark');
      expect(attr()).to.equal('dark');
      expect(html.style.colorScheme).to.equal('dark');
    });
  });
});
