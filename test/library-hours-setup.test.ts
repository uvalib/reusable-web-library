import { expect, fixture, nextFrame, waitUntil } from '@open-wc/testing';
// Only the setup entry: it must register library-weekly-hours itself.
import '../src/components/library-hours-setup/library-hours-setup.js';
import type { LibraryWeeklyHours } from '../src/components/library-weekly-hours/LibraryWeeklyHours.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { recordFetches, resetHours, setClock, settled } from './helpers/hours.js';

const SLUGS = ['clemons', 'main', 'science', 'fine-arts', 'music', 'harrison'];
const placeholder = (slug: string, inner = '') =>
  `<div type="library-weekly-hours" library-slug="${slug}" no-shadow-dom no-style>${inner}</div>`;

/** Drupal's /hours markup: six placeholders and the setup element. */
const page = (extra = '') =>
  `<div>${SLUGS.map((s) => placeholder(s, `<p class="drupal-note">${s}</p>`)).join('')}${extra}<library-hours-setup></library-hours-setup></div>`;

const weekly = (root: ParentNode) => [
  ...root.querySelectorAll<LibraryWeeklyHours>('library-weekly-hours'),
];

describe('library-hours-setup', () => {
  before(() => setClock('2026-11-14T17:00:00Z'));
  beforeEach(resetHours);
  after(resetHours);

  it('registers library-weekly-hours', () => {
    expect(customElements.get('library-weekly-hours')).to.be.a('function');
  });

  it('replaces each placeholder, copying attributes except type and moving the children', async () => {
    const el = await fixture(page());
    const els = weekly(el);
    expect(el.querySelectorAll('div[type="library-weekly-hours"]')).to.have.length(0);
    expect(els.map((e) => e.getAttribute('library-slug'))).to.deep.equal(SLUGS);
    for (const e of els) {
      expect(e.hasAttribute('type')).to.equal(false);
      expect(e.hasAttribute('no-shadow-dom')).to.equal(true);
      expect(e.hasAttribute('no-style')).to.equal(true);
      expect(e.shadowRoot).to.equal(null);
      expect(e.querySelectorAll(':scope > p.drupal-note')).to.have.length(1);
    }
    // Harrison shares LibCal 4114 with its own building space, so the building row is hidden.
    expect(els.map((e) => e.hasAttribute('hide-building-hours'))).to.deep.equal([
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
  });

  it('makes one JSON:API request for six instances', async () => {
    const rec = recordFetches();
    try {
      const el = await fixture(page());
      for (const e of weekly(el)) await settled(e);
      expect(rec.urls.filter((u) => u.includes('/jsonapi/'))).to.have.length(1);
      for (const e of weekly(el)) expect(e.state).to.equal('ready');
    } finally {
      rec.restore();
    }
  });

  it('passes axe as Drupal uses it (light DOM, no-style)', async () => {
    const el = await fixture(page());
    for (const e of weekly(el)) await settled(e);
    await expectNoAxeViolations(el);
  });

  it('does nothing until connected', async () => {
    const container = await fixture(`<div>${placeholder('clemons')}</div>`);
    const setup = document.createElement('library-hours-setup');
    await nextFrame();
    expect(weekly(container)).to.have.length(0);
    container.append(setup);
    expect(weekly(container)).to.have.length(1);
  });

  it('upgrades placeholders added later, and stops once disconnected', async () => {
    const el = await fixture(page());
    const late = document.createElement('section');
    late.innerHTML = placeholder('music', '<span>late</span>');
    el.append(late);
    await waitUntil(() => weekly(late).length === 1, 'late placeholder not upgraded');
    expect(weekly(late)[0]!.querySelector('span')!.textContent).to.equal('late');

    el.querySelector('library-hours-setup')!.remove();
    el.insertAdjacentHTML('beforeend', placeholder('clemons'));
    await nextFrame();
    await nextFrame();
    expect(el.querySelectorAll('div[type="library-weekly-hours"]')).to.have.length(1);
  });

  it('upgrades each placeholder once, even with two setup elements', async () => {
    const el = await fixture(page('<library-hours-setup></library-hours-setup>'));
    el.insertAdjacentHTML('beforeend', placeholder('clemons', '<i>once</i>'));
    await waitUntil(() => weekly(el).length === 7, 'late placeholder not upgraded');
    await nextFrame();
    expect(weekly(el)).to.have.length(7);
    expect(el.querySelectorAll('i')).to.have.length(1);
  });

  it('works within its own root node (a shadow root), not the whole document', async () => {
    const outside = await fixture(`<div>${placeholder('clemons')}</div>`);
    const host = await fixture('<div></div>');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `${placeholder('main')}<library-hours-setup></library-hours-setup>`;
    expect(weekly(shadow)).to.have.length(1);
    expect(weekly(outside)).to.have.length(0);
  });
});
