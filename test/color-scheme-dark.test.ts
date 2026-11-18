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

  it('dark alert colours: <site-alerts> reads the --uva-color-alert-* role tokens', async () => {
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'dark');
    const page = await mountPage('shadow', 'color-scheme-switch');
    await customElements.whenDefined('site-alerts');
    await customElements.whenDefined('uvalib-alerts');
    (window as StubWindow).__uvalibAlertsStubSet!(ALERTS);
    for (let i = 0; i < 2; i++) await nextFrame();
    // Every alert surface: header banner, alert1-3, regional (warning and information).
    const els = [...rootOf(page).querySelectorAll('site-alerts')]
      .concat([
        ...rootOf(rootOf(page).querySelector('site-header')!).querySelectorAll('site-alerts'),
      ])
      .concat([...page.querySelectorAll('site-alerts')]);
    const surfaces = els.flatMap((a) => [
      ...rootOf(a).querySelectorAll<HTMLElement>('.banner, .alert, .regional'),
    ]);
    const name = (d: HTMLElement) =>
      d.classList.contains('banner')
        ? 'header'
        : d.classList.contains('regional')
          ? `regional${d.classList.contains('info') ? '-info' : ''}`
          : [...d.classList].find((k) => /^alert\d$/.test(k))!;
    const bgs = Object.fromEntries(
      surfaces.map((d) => [name(d), getComputedStyle(d).backgroundColor]),
    );
    expect(bgs).to.deep.equal({
      header: c('#0e4a57'),
      alert1: c('#4a1622'),
      alert2: c('#3d3510'),
      alert3: c('#0d3247'),
      regional: c('#3d3510'),
      'regional-info': c('#0f3a3d'),
    });
    const borders = Object.fromEntries(
      surfaces
        .filter((d) => !d.classList.contains('banner'))
        .map((d) => {
          const cs = getComputedStyle(d);
          return [name(d), d.classList.contains('alert') ? cs.borderLeftColor : cs.borderTopColor];
        }),
    );
    expect(borders).to.deep.equal({
      alert1: c('#ef3f6b'),
      alert2: c('#ecc602'),
      alert3: c('#55c4ec'),
      regional: c('#ecc602'),
      'regional-info': c('#25cad3'),
    });
    for (const d of surfaces) expect(getComputedStyle(d).color).to.equal(c('#e8e8e8'));
    (window as StubWindow).__uvalibAlertsStubSet!(undefined);
    // The alerts project's own properties are gone: nothing sets them any more.
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
  regionalAlerts: [
    { uuid: 'r', title: 'Regional alert', body: 'Snow.', severity: 'alert2' },
    { uuid: 'r3', title: 'Regional notice', body: 'Tours.', severity: 'alert3' },
  ],
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
          await customElements.whenDefined('site-alerts');
          (window as StubWindow).__uvalibAlertsStubSet!(ALERTS);
          await nextFrame();
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
