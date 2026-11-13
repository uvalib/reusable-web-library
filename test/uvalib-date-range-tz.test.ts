import { expect, fixture } from '@open-wc/testing';
import '../src/components/uvalib-date-range/uvalib-date-range.js';
import type { UvalibDateRange } from '../src/components/uvalib-date-range/UvalibDateRange.js';

// Runs in its own wtr group (see web-test-runner.config.mjs) whose browser context uses
// America/New_York, where `new Date('2000-01-01').getFullYear()` is 1999.
describe('uvalib-date-range in a time zone west of UTC', () => {
  it('runs in America/New_York', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).to.equal('America/New_York');
  });

  for (const mode of ['', 'no-shadow-dom']) {
    it(`reads years from ISO dates without a time-zone shift (${mode || 'shadow'})`, async () => {
      const el = await fixture<UvalibDateRange>(
        `<uvalib-date-range ${mode} min="2000-01-01" max="2010-12-31"></uvalib-date-range>`,
      );
      const root = el.shadowRoot ?? el;
      const sliders = [...root.querySelectorAll<HTMLInputElement>('input[type=range]')];
      expect(sliders.map((s) => [s.min, s.max, s.value])).to.deep.equal([
        ['2000', '2010', '2000'],
        ['2000', '2010', '2010'],
      ]);
    });
  }
});
