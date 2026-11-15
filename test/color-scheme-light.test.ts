import { expect } from '@open-wc/testing';
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
        expectMainExceptBorders(await allColors(mode));
        expect(document.documentElement.hasAttribute('data-uva-color-scheme')).to.equal(false);
      });
    });
  }
});
