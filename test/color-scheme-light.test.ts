import { expect, fixture, nextFrame } from '@open-wc/testing';
import '../src/components/site-style/site-style.js';
import { emulateMedia } from '@web/test-runner-commands';
import { allColors } from './helpers/scheme-fixtures.js';
import { resetHours, setClock } from './helpers/hours.js';
import { contrast, rgb, type Colors } from './helpers/scheme-colors.js';
import { MAIN } from './helpers/main-colors.js';

/** The two borders fixed for WCAG 1.4.11 (non-text contrast), with the background each sits on. */
const FIXED_BORDERS: Record<string, string> = {
  'filter chip border-top-color': 'filter chip background-color',
  'date input border-top-color': 'date input background-color',
};

const WHITE = rgb('#ffffff');

/** `actual` must equal MAIN, apart from the fixed borders, which must reach 3:1. */
function expectMainExceptBorders(actual: Colors, extra: Colors = {}): void {
  const expected = { ...MAIN, ...extra };
  for (const key of Object.keys(FIXED_BORDERS)) delete expected[key];
  const rest = { ...actual };
  for (const [border, bg] of Object.entries(FIXED_BORDERS)) {
    const value = rest[border]!;
    delete rest[border];
    expect(contrast(value, WHITE), `${border} on white`).to.be.at.least(3);
    expect(contrast(value, actual[bg]!), `${border} on its background`).to.be.at.least(3);
  }
  expect(rest).to.deep.equal(expected);
}

describe('light mode is unchanged without the color-scheme switch', function () {
  this.timeout(20000);
  before(() => setClock('2026-11-14T17:00:00Z'));
  beforeEach(resetHours);
  afterEach(async () => {
    await emulateMedia({ colorScheme: 'light' });
    document.documentElement.style.removeProperty('color-scheme');
  });

  for (const mode of ['shadow', 'light'] as const) {
    describe(mode, () => {
      it("every component matches main's colours (the two fixed borders reach 3:1)", async () => {
        expectMainExceptBorders(await allColors(mode));
        expect(document.documentElement.hasAttribute('data-uva-color-scheme')).to.equal(false);
      });

      it('stays light with the OS in dark mode and the host page declaring light dark', async () => {
        await emulateMedia({ colorScheme: 'dark' });
        document.documentElement.style.colorScheme = 'light dark';
        // The pre-footer link is the site's own content, which keeps the page's scheme, so
        // the browser's dark link colour applies, as on main.
        expectMainExceptBorders(await allColors(mode), {
          'footer pre link color': 'rgb(158, 158, 255)',
        });
        expect(document.documentElement.hasAttribute('data-uva-color-scheme')).to.equal(false);
      });
    });
  }
});

describe("the site's own content keeps the page's colour scheme without the switch", function () {
  this.timeout(10000);
  afterEach(async () => {
    await emulateMedia({ colorScheme: 'light' });
    document.documentElement.style.removeProperty('color-scheme');
  });

  // On main, content inside <site-page> and <site-style> (and the pre-footer band) inherits
  // the host page's `color-scheme`: with the OS dark and `:root { color-scheme: light dark }`
  // it is `light dark`, light-dark() picks the dark value and native inputs are dark.
  const CONTENT = `<p class="probe" style="color: light-dark(rgb(1, 2, 3), rgb(4, 5, 6))">x</p>
    <input class="probe-input" type="date" aria-label="Date" />`;

  async function expectPageScheme(root: ParentNode) {
    for (const probe of root.querySelectorAll('.probe')) {
      const cs = getComputedStyle(probe);
      expect(cs.colorScheme).to.equal('light dark');
      expect(cs.color).to.equal('rgb(4, 5, 6)');
    }
    for (const input of root.querySelectorAll('.probe-input')) {
      expect(getComputedStyle(input).colorScheme).to.equal('light dark');
    }
    expect(root.querySelectorAll('.probe').length).to.be.at.least(1);
  }

  for (const mode of ['shadow', 'light'] as const) {
    const attr = mode === 'light' ? 'no-shadow-dom' : '';
    it(`${mode}: <site-page> content and its pre-footer band`, async () => {
      await emulateMedia({ colorScheme: 'dark' });
      document.documentElement.style.colorScheme = 'light dark';
      const el = await fixture(
        `<site-page ${attr} no-alerts>${CONTENT}<div slot="pre-footer">${CONTENT}</div></site-page>`,
      );
      await customElements.whenDefined('site-footer');
      await nextFrame();
      await expectPageScheme(el);
      expect(el.querySelectorAll('.probe')).to.have.length(2);
    });

    it(`${mode}: <site-style> content`, async () => {
      await emulateMedia({ colorScheme: 'dark' });
      document.documentElement.style.colorScheme = 'light dark';
      const el = await fixture(`<site-style ${attr}>${CONTENT}</site-style>`);
      await expectPageScheme(el);
    });
  }
});
