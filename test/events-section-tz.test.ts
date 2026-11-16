import { expect, fixture, waitUntil } from '@open-wc/testing';
import '../src/components/events-section/events-section.js';
import type { EventsSection } from '../src/components/events-section/EventsSection.js';
import { setClock } from './helpers/hours.js';
import { resetEvents } from './helpers/events.js';

// Runs twice, in wtr groups whose browser contexts use America/New_York and Asia/Tokyo (see
// web-test-runner.config.mjs). Whatever the browser's zone, the date column, the time line
// and "has it ended" are the library's: America/New_York.
const text = (n: Element | null | undefined) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();

async function first(attrs: string): Promise<string[]> {
  const el = await fixture<EventsSection>(
    `<events-section no-shadow-dom no-style ${attrs}></events-section>`,
  );
  await waitUntil(() => el.state !== 'loading', 'still loading', { timeout: 4000 });
  await el.updateComplete;
  const card = el.querySelector('.event:not(.event-placeholder)')!;
  return [
    text(card.querySelector('.event-title')),
    text(card.querySelector('.event--month')),
    text(card.querySelector('.event--day')),
    text(card.querySelector('.event--wkday')),
    card.querySelector('time')!.getAttribute('datetime')!,
    text(card.querySelector('time')),
    text(card.querySelector('.event-time')),
  ];
}

describe(`events-section in ${Intl.DateTimeFormat().resolvedOptions().timeZone}`, () => {
  beforeEach(resetEvents);
  after(resetEvents);

  it('runs in New York or Tokyo', () => {
    expect(['America/New_York', 'Asia/Tokyo']).to.include(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
  });

  it('shows a morning event on its New York day (already the evening in Tokyo)', async () => {
    await setClock('2026-11-16T14:00:00Z');
    expect(await first('limit="1"')).to.deep.equal([
      '3D Printing Training',
      'Nov',
      '16',
      'Mon',
      '2026-11-16',
      'Monday, November 16',
      '11:00 AM - 12:00 PM EST',
    ]);
  });

  it('late evening in New York (next day in UTC and Tokyo): ended events go, the next day shows', async () => {
    await setClock('2026-11-17T03:30:00Z'); // 22:30 on Monday 16 November in New York
    expect(await first('limit="1"')).to.deep.equal([
      'FREN 4854 - Introduction to ArcGIS StoryMaps',
      'Nov',
      '17',
      'Tue',
      '2026-11-17',
      'Tuesday, November 17',
      '9:30 AM - 10:45 AM EST',
    ]);
  });

  it('an evening event stays on its New York date though it is the next day in UTC', async () => {
    await setClock('2026-11-16T14:00:00Z');
    expect(await first('query="Late evening"')).to.deep.equal([
      'Late evening event crossing UTC midnight',
      'Nov',
      '23',
      'Mon',
      '2026-11-23',
      'Monday, November 23',
      '8:30 PM - 9:30 PM EST',
    ]);
  });

  it('an event after clocks go forward says EDT', async () => {
    await setClock('2027-03-10T12:00:00Z');
    expect(await first('query="DST"')).to.deep.equal([
      'Event after DST starts',
      'Mar',
      '15',
      'Mon',
      '2027-03-15',
      'Monday, March 15',
      '10:00 AM - 11:00 AM EDT',
    ]);
  });
});
