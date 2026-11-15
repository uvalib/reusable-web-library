import { expect, nextFrame } from '@open-wc/testing';
import { emulateMedia, setViewport } from '@web/test-runner-commands';
import { allColors, mountPage } from './helpers/scheme-fixtures.js';
import { resetHours, setClock } from './helpers/hours.js';
import { rgb, rootOf, type Colors } from './helpers/scheme-colors.js';
import { MAIN } from './helpers/main-colors.js';
import { expectNoPageAxeViolations } from './helpers/axe.js';
import { COLOR_SCHEME_ATTR, COLOR_SCHEME_STORAGE_KEY } from '../src/base/color-scheme.js';

// The approved dark palette (see the README's "Dark mode"), per component. The footer keeps
// its own dark colours; the pre-footer band gets a dark band.
const c = rgb;
const DARK: Colors = {
  'body color': c('#e8e8e8'),
  'body background-color': c('#10172b'),
  'skip-link color': c('#10172b'),
  'skip-link background-color': c('#87b9d9'),
  'header background-color': c('#232d4b'),
  'utility link color': c('#91d8f2'),
  'menu button color': c('#e8e8e8'),
  'popover background-color': c('#232d4b'),
  'popover border-top-color': c('#7a84a0'),
  'popover rule border-top-color': c('#7a84a0'),
  'bar bar background-color': c('#232d4b'),
  'bar bar border-bottom-color': c('#87b9d9'),
  'bar toggle color': c('#e8e8e8'),
  'bar chevron border-right-color': c('#87b9d9'),
  'bar panel background-color': c('#232d4b'),
  'bar panel box-shadow': 'rgba(0, 0, 0, 0.6) 0px 8px 16px 0px',
  'bar panel link color': c('#87b9d9'),
  'footer pre color': c('#ffffff'),
  'footer pre background-color': c('#005679'),
  'footer pre link color': c('#ffffff'),
  'footer main color': c('#ffffff'),
  'footer main background-color': c('#232d4b'),
  'footer link color': c('#ffffff'),
  'footer post color': c('#ffffff'),
  'footer post background-color': c('#141e3c'),
  'filter divider border-bottom-color': c('#7a84a0'),
  'filter chip color': c('#87b9d9'),
  'filter chip background-color': c('#232d4b'),
  'filter chip border-top-color': c('#7a84a0'),
  'filter chip pressed color': c('#10172b'),
  'filter chip pressed background-color': c('#87b9d9'),
  'filter chip pressed border-top-color': c('#87b9d9'),
  'date legend color': c('#87b9d9'),
  'date track background-color': c('#2c3858'),
  'date range background-color': c('#87b9d9'),
  'date label color': c('#adadad'),
  'date input color': c('#e8e8e8'),
  'date input background-color': c('#232d4b'),
  'date input border-top-color': c('#7a84a0'),
  'weekly cell border-top-color': c('#7a84a0'),
  'weekly today border-left-color': c('#e57200'),
  'weekly button color': c('#87b9d9'),
  'weekly button background-color': c('#232d4b'),
  'weekly button border-top-color': c('#87b9d9'),
  'weekly heading color': c('#87b9d9'),
  'hours heading color': c('#87b9d9'),
  'hours link color': c('#87b9d9'),
};

/**
 * Opted in but light: main's colours, except the two fixed control borders and the body's
 * now explicit white background.
 */
const LIGHT_OPT_IN: Colors = {
  ...MAIN,
  'body background-color': c('#ffffff'),
  'filter chip border-top-color': c('#808080'),
  'date input border-top-color': c('#808080'),
};

async function reset(): Promise<void> {
  document.documentElement.removeAttribute(COLOR_SCHEME_ATTR);
  localStorage.removeItem(COLOR_SCHEME_STORAGE_KEY);
  await emulateMedia({ colorScheme: 'light' });
  await setViewport({ width: 800, height: 600 });
}

describe('dark mode colours', function () {
  this.timeout(20000);
  before(() => setClock('2026-11-14T17:00:00Z'));
  beforeEach(resetHours);
  afterEach(reset);

  for (const mode of ['shadow', 'light'] as const) {
    it(`${mode}: every component uses the dark palette when Dark is chosen`, async () => {
      localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'dark');
      expect(await allColors(mode, 'color-scheme-switch')).to.deep.equal(DARK);
    });

    it(`${mode}: System with the OS dark gives the same palette`, async () => {
      await emulateMedia({ colorScheme: 'dark' });
      expect(await allColors(mode, 'color-scheme-switch')).to.deep.equal(DARK);
    });

    it(`${mode}: Light (opted in) keeps the light colours`, async () => {
      await emulateMedia({ colorScheme: 'dark' });
      localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'light');
      expect(await allColors(mode, 'color-scheme-switch')).to.deep.equal(LIGHT_OPT_IN);
    });
  }

  it('dark alert colours go to the alerts component through its own custom properties', async () => {
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'dark');
    await mountPage('shadow', 'color-scheme-switch');
    const cs = getComputedStyle(document.documentElement);
    const v = (p: string) => cs.getPropertyValue(p).trim();
    expect(v('--uvalib-alerts-text')).to.equal('#e8e8e8');
    expect(v('--uvalib-alerts-header-bg')).to.equal('#0e4a57');
    expect(
      ['alert1', 'alert2', 'alert3'].map((a) => [
        v(`--uvalib-alerts-${a}-bg`),
        v(`--uvalib-alerts-${a}-border`),
      ]),
    ).to.deep.equal([
      ['#4a1622', '#ef3f6b'],
      ['#3d3510', '#ecc602'],
      ['#0d3247', '#55c4ec'],
    ]);
    expect(v('--uvalib-alerts-regional-bg')).to.equal('#0f3a3d');
    // Every alert surface the stub draws with them: header, alert1-3, regional.
    await customElements.whenDefined('uvalib-alerts');
    (window as StubWindow).__uvalibAlertsStubSet!(ALERTS);
    await nextFrame();
    const surfaces = [...document.querySelectorAll('*')]
      .flatMap((n) => (n.shadowRoot ? [n.shadowRoot] : []))
      .flatMap((r) => [...r.querySelectorAll('uvalib-alerts')])
      .concat([...document.querySelectorAll('uvalib-alerts')])
      .flatMap((a) => [...(a.shadowRoot?.querySelectorAll('.a') ?? [])]);
    const bgs = Object.fromEntries(
      surfaces.map((d) => [d.classList[1], getComputedStyle(d).backgroundColor]),
    );
    expect(bgs).to.deep.equal({
      header: c('#0e4a57'),
      alert1: c('#4a1622'),
      alert2: c('#3d3510'),
      alert3: c('#0d3247'),
      regional: c('#0f3a3d'),
    });
    for (const d of surfaces) expect(getComputedStyle(d).color).to.equal(c('#e8e8e8'));
    (window as StubWindow).__uvalibAlertsStubSet!(undefined);
    // Light (opted in) leaves them to the component's own defaults.
    document.documentElement.setAttribute(COLOR_SCHEME_ATTR, 'light');
    expect(
      getComputedStyle(document.documentElement).getPropertyValue('--uvalib-alerts-text'),
    ).to.equal('');
  });
});

/** The alerts stub's state: one alert of each kind, so every alert surface is audited. */
type StubWindow = Window & { __uvalibAlertsStubSet?: (s?: unknown) => void };
const ALERTS = {
  headerAlerts: [{ uuid: 'h', title: 'Header alert', body: 'Closed today.' }],
  menuAlerts: [1, 2, 3].map((severity) => ({
    uuid: `m${severity}`,
    title: `Severity ${severity} alert`,
    body: 'Wi-Fi is down.',
    severity,
  })),
  regionalAlerts: [{ uuid: 'r', title: 'Regional alert', body: 'Snow.' }],
};

describe('dark mode accessibility (axe, every impact level)', function () {
  this.timeout(20000);
  afterEach(async () => {
    (window as StubWindow).__uvalibAlertsStubSet?.(undefined);
    await reset();
  });

  for (const mode of ['shadow', 'light'] as const) {
    for (const scheme of ['light', 'dark'] as const) {
      for (const width of [1280, 390]) {
        it(`${mode}, ${scheme}, ${width}px, alerts shown${width < 993 ? ', Menu open' : ''}`, async () => {
          await setViewport({ width, height: 900 });
          localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, scheme);
          const page = await mountPage(mode, 'color-scheme-switch');
          await customElements.whenDefined('uvalib-alerts');
          (window as StubWindow).__uvalibAlertsStubSet!(ALERTS);
          await nextFrame();
          const header = rootOf(page).querySelector('site-header')!;
          if (width < 993) {
            rootOf(header).querySelector<HTMLButtonElement>('.menu-toggle')!.click();
            expect(
              rootOf(header).querySelector('.menu-popover')!.matches(':popover-open'),
            ).to.equal(true);
          }
          await nextFrame();
          await expectNoPageAxeViolations();
        });
      }
    }
  }
});
