// Mount every component the colour tests compare, in shadow or light mode.
import { fixture, nextFrame } from '@open-wc/testing';
import '../../src/components/site-page/site-page.js';
import '../../src/components/uvalib-filter/uvalib-filter.js';
import '../../src/components/uvalib-date-range/uvalib-date-range.js';
import '../../src/components/library-weekly-hours/library-weekly-hours.js';
import '../../src/components/site-hours-section/site-hours-section.js';
import type { SitePage } from '../../src/components/site-page/SitePage.js';
import type { UvalibFilter } from '../../src/components/uvalib-filter/UvalibFilter.js';
import type { LibraryWeeklyHours } from '../../src/components/library-weekly-hours/LibraryWeeklyHours.js';
import type { SiteHoursSection } from '../../src/components/site-hours-section/SiteHoursSection.js';
import { settled } from './hours.js';
import {
  dateRangeColors,
  filterColors,
  hoursSectionColors,
  pageColors,
  rootOf,
  weeklyHoursColors,
  type Colors,
} from './scheme-colors.js';

export type Mode = 'shadow' | 'light';
const modeAttr = (mode: Mode) => (mode === 'light' ? 'no-shadow-dom' : '');

/** A full page with alerts (the test stub), a pre-footer band and its footer rendered. */
export async function mountPage(mode: Mode, attrs = ''): Promise<SitePage> {
  const el = await fixture<SitePage>(
    `<site-page ${modeAttr(mode)} alerts-src="https://alerts.test/" ${attrs}>
      <h1>Page</h1><p>Content</p><div slot="pre-footer"><p>Pre-footer</p></div>
    </site-page>`,
  );
  await customElements.whenDefined('site-footer');
  const footer = rootOf(el).querySelector('site-footer') as HTMLElement & {
    updateComplete: Promise<boolean>;
  };
  await footer.updateComplete;
  await nextFrame();
  return el;
}

export async function mountFilter(mode: Mode): Promise<UvalibFilter> {
  const el = await fixture<UvalibFilter>(`<uvalib-filter ${modeAttr(mode)}></uvalib-filter>`);
  el.filter = {
    name: 'type',
    title: 'Type',
    position: 0,
    buckets: [
      { key: 'Book', doc_count: 3, selected: false },
      { key: 'Map', doc_count: 1, selected: true },
    ],
  };
  el.scopes = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
  ];
  el.scopeValue = ['a'];
  await el.updateComplete;
  return el;
}

export async function mountDateRange(mode: Mode): Promise<HTMLElement> {
  const el = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
    `<uvalib-date-range ${modeAttr(mode)} min="1900-01-01" max="2026-12-31"></uvalib-date-range>`,
  );
  await el.updateComplete;
  return el;
}

export async function mountWeeklyHours(mode: Mode): Promise<LibraryWeeklyHours> {
  const el = await fixture<LibraryWeeklyHours>(
    `<library-weekly-hours ${modeAttr(mode)} library-slug="clemons"></library-weekly-hours>`,
  );
  await settled(el);
  return el;
}

export async function mountHoursSection(mode: Mode): Promise<SiteHoursSection> {
  const el = await fixture<SiteHoursSection>(
    `<site-hours-section ${modeAttr(mode)} limited></site-hours-section>`,
  );
  await settled(el);
  return el;
}

/** Every component's colours, mounted one after another in `mode`. */
export async function allColors(mode: Mode, pageAttrs = ''): Promise<Colors> {
  return {
    ...pageColors(await mountPage(mode, pageAttrs)),
    ...filterColors(await mountFilter(mode)),
    ...dateRangeColors(await mountDateRange(mode)),
    ...weeklyHoursColors(await mountWeeklyHours(mode)),
    ...hoursSectionColors(await mountHoursSection(mode)),
  };
}
