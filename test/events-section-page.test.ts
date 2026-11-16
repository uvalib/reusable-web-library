import { expect, fixture, fixtureCleanup, nextFrame, waitUntil } from '@open-wc/testing';
import { emulateMedia } from '@web/test-runner-commands';
import '../src/components/site-page/site-page.js';
import '../src/components/events-section/events-section.js';
import type { EventsSection } from '../src/components/events-section/EventsSection.js';
import { COLOR_SCHEME_ATTR, COLOR_SCHEME_STORAGE_KEY } from '../src/base/color-scheme.js';
import { expectNoPageAxeViolations } from './helpers/axe.js';
import { contrast, rgb, rootOf } from './helpers/scheme-colors.js';
import { setClock } from './helpers/hours.js';
import { resetEvents, useEventsHost } from './helpers/events.js';

// <events-section> in a whole page, as the library home page uses it: under an h2 and
// followed by Drupal's "See all" paragraph, in light and dark, styled and unstyled.
const MARKUP = (attrs: string) => `
  <h1>Library</h1>
  <h2>Library events</h2>
  <events-section limit="4" ${attrs}></events-section>
  <p class="events-see-all"><a href="https://cal.lib.virginia.edu/calendar/events">See all Library events</a></p>`;

async function mount(attrs: string, scheme: 'light' | 'dark'): Promise<EventsSection> {
  localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, scheme);
  const page = await fixture<HTMLElement>(
    `<site-page color-scheme-switch alerts-src="https://alerts.test/">${MARKUP(attrs)}</site-page>`,
  );
  await customElements.whenDefined('site-footer');
  const el = page.querySelector('events-section') as EventsSection;
  await waitUntil(() => el.state !== 'loading', 'still loading', { timeout: 4000 });
  await el.updateComplete;
  await nextFrame();
  return el;
}

async function reset(): Promise<void> {
  document.documentElement.removeAttribute(COLOR_SCHEME_ATTR);
  localStorage.removeItem(COLOR_SCHEME_STORAGE_KEY);
  await emulateMedia({ colorScheme: 'light' });
}

const color = (el: Element, prop = 'color') => getComputedStyle(el).getPropertyValue(prop);

describe('events-section in a page', function () {
  this.timeout(20000);
  before(() => setClock('2026-11-16T14:00:00Z'));
  beforeEach(resetEvents);
  afterEach(reset);
  after(resetEvents);

  for (const scheme of ['light', 'dark'] as const) {
    for (const [mode, attrs] of [
      ['shadow', ''],
      ['light DOM', 'no-shadow-dom'],
      ['light DOM no-style (Drupal)', 'no-shadow-dom no-style'],
    ] as const) {
      it(`${scheme}, ${mode}: passes axe at every impact level, loaded and failing`, async () => {
        await mount(attrs, scheme);
        await expectNoPageAxeViolations();
        fixtureCleanup();
        useEventsHost('events-fail.test');
        const failing = await mount(attrs, scheme);
        expect(failing.state).to.equal('error');
        await expectNoPageAxeViolations();
      });
    }

    for (const [mode, attrs] of [
      ['shadow', ''],
      ['light DOM', 'no-shadow-dom'],
    ] as const) {
      it(`${scheme}, ${mode}: styled colours come from the role tokens and pass AA`, async () => {
        const el = await mount(attrs, scheme);
        const r = rootOf(el);
        const card = r.querySelector('.event-url')!;
        const date = r.querySelector('.event-date')!;
        const bg = color(card, 'background-color');
        const pairs = {
          'date text on the date column': [
            color(r.querySelector('.event--day')!),
            color(date, 'background-color'),
          ],
          'title on the card': [color(r.querySelector('.event-title')!), bg],
          'time on the card': [color(r.querySelector('.event-time')!), bg],
        };
        for (const [what, [fg, back]] of Object.entries(pairs))
          expect(contrast(fg!, back!), `${what}: ${fg} on ${back}`).to.be.at.least(4.5);
        expect(color(date, 'background-color')).to.equal(rgb('#b35900'));
        if (scheme === 'dark') {
          expect(bg).to.equal(rgb('#232d4b'));
          expect(color(r.querySelector('.event-title')!)).to.equal(rgb('#87b9d9'));
          expect(color(r.querySelector('.event-time')!)).to.equal(rgb('#e8e8e8'));
          expect(color(card, 'border-top-color')).to.equal(rgb('#7a84a0'));
        } else {
          expect(bg).to.equal(rgb('#ffffff'));
          expect(color(r.querySelector('.event-title')!)).to.equal(rgb('#232d4b'));
          expect(color(r.querySelector('.event-time')!)).to.equal(rgb('#2b2b2b'));
        }
      });
    }
  }
});
