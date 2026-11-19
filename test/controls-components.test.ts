// base.css's .uvalib-button rules must not restyle the buttons the library's own components
// render in light DOM: the real elements, in their error states (Retry) and with results
// (bento's "See all"), are compared with base.css linked and with it switched off.
import { expect, fixture, waitUntil } from '@open-wc/testing';
import '../src/components/events-section/events-section.js';
import '../src/components/library-weekly-hours/library-weekly-hours.js';
import '../src/components/bento-box/bento-box.js';
import { OWN_BUTTON_TAGS } from '../src/styles/controls.js';
import { resetEvents, useEventsHost } from './helpers/events.js';
import { resetHours, useHoursHost } from './helpers/hours.js';
import { resetBento, useBentoHost } from './helpers/bento.js';
import { bentoTiming } from '../src/components/bento-box/bento-data.js';

const PROPS = [
  'background-color',
  'color',
  'border-top-width',
  'border-top-color',
  'border-top-left-radius',
  'padding-top',
  'padding-left',
  'min-height',
  'height',
  'width',
  'display',
  'font-size',
  'font-weight',
  'pointer-events',
];

describe("base.css and the components' own buttons (light DOM)", function () {
  this.timeout(10000);
  // base.css as linked, and the same file without its controls (the page rules, which set
  // the root font size, stay): only the controls may differ between the two.
  // One adopted sheet whose text is swapped: the components add their own light-DOM sheets
  // to the document's list, which must stay as it is.
  const sheet = new CSSStyleSheet();
  let text = '';
  let pageText = '';

  before(async () => {
    text = await (await fetch('/dist-cdn/base.css')).text();
    const start = text.indexOf('.uvalib-button');
    expect(start).to.be.greaterThan(0);
    pageText = text.slice(0, start);
    sheet.replaceSync(text);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  });
  after(() => {
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== sheet);
    resetEvents();
    resetHours();
    resetBento();
  });

  const styles = (buttons: Element[]) =>
    buttons.map((b) => {
      const s = getComputedStyle(b);
      return `${b.textContent!.replace(/\s+/g, ' ').trim()}: ${PROPS.map((p) => s.getPropertyValue(p)).join(' ')}`;
    });

  it('excludes every tag that renders a .uvalib-button', () => {
    expect(OWN_BUTTON_TAGS).to.include.members([
      'bento-box',
      'catalog-section',
      'articles-section',
      'libguides-section',
      'website-section',
      'events-section',
      'library-weekly-hours',
    ]);
  });

  it('a host .uvalib-button is styled, the components’ buttons are not', async () => {
    useEventsHost('events-fail.test');
    useHoursHost('hours-fail.test');
    useBentoHost('bento-fail.test', ['catalog']);
    bentoTiming.retries = 1;
    const wrap = await fixture<HTMLDivElement>(`<div>
      <button class="uvalib-button" id="host" type="button">Host</button>
      <events-section no-shadow-dom limit="2"></events-section>
      <library-weekly-hours no-shadow-dom library-slug="clemons"></library-weekly-hours>
      <bento-box no-shadow-dom limit="2" query="test"></bento-box>
    </div>`);
    const own = () => [...wrap.querySelectorAll('.uvalib-button')].filter((b) => b.id !== 'host');
    // Retry (events, hours, the catalog section), the week buttons, each "See all" and the
    // website section's link button.
    await waitUntil(
      () =>
        wrap.querySelector('events-section .uvalib-button') &&
        wrap.querySelectorAll('library-weekly-hours .uvalib-button').length >= 3 &&
        wrap.querySelector('catalog-section .uvalib-button[type=button]') &&
        wrap.querySelectorAll('bento-box .bs-results--see-all .uvalib-button').length >= 3 &&
        wrap.querySelectorAll('bento-box .uvalib-button').length >= 5,
      'component buttons not rendered',
      { timeout: 8000 },
    );
    const host = document.getElementById('host')!;
    const withBase = { host: styles([host]), own: styles(own()) };
    sheet.replaceSync(pageText);
    try {
      const without = { host: styles([host]), own: styles(own()) };
      expect(withBase.host, 'base.css styles a host button').to.not.deep.equal(without.host);
      expect(withBase.own).to.deep.equal(without.own);
      expect(withBase.own.length).to.be.at.least(9);
    } finally {
      sheet.replaceSync(text);
    }
  });
});
