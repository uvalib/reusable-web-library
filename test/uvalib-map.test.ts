import { expect, fixture } from '@open-wc/testing';
import { emulateMedia, sendKeys, sendMouse, setViewport } from '@web/test-runner-commands';
import * as L from 'leaflet/dist/leaflet-src.esm.js';
import type * as Leaflet from 'leaflet';
import '../src/components/uvalib-map/uvalib-map.js';
import {
  MAP_INSTRUCTIONS,
  type MapItem,
  type UvalibMap,
} from '../src/components/uvalib-map/UvalibMap.js';
import { recordAnalytics } from './helpers/analytics.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { inDarkMode } from './helpers/dark.js';

const PLACES: MapItem[] = [
  {
    id: 'rotunda',
    name: 'The Rotunda',
    lat: 38.0356,
    lng: -78.5034,
    count: 2702,
    href: '/places/rotunda',
  },
  { id: 'lawn', name: 'The Lawn', lat: 38.0336, lng: -78.5048, count: 900, href: '/places/lawn' },
  {
    id: 'alderman',
    name: 'Alderman Library',
    lat: 38.0364,
    lng: -78.5054,
    count: 150,
    href: '/places/alderman',
  },
  {
    id: 'stadium',
    name: 'Scott Stadium',
    lat: 38.0311,
    lng: -78.5137,
    count: 1,
    description: 'Football and commencement',
  },
];

type Internals = { map?: Leaflet.Map };
const leafletMap = (el: UvalibMap) => (el as unknown as Internals).map!;
const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const markers = (el: Element) => [
  ...root(el).querySelectorAll<HTMLElement>('.uvalib-map-marker .marker'),
];
const icons = (el: Element) => [...root(el).querySelectorAll<HTMLElement>('.uvalib-map-marker')];
const places = (el: Element) => [...root(el).querySelectorAll<HTMLElement>('li.place')];
const focused = (el: HTMLElement): Element | null =>
  el.shadowRoot ? el.shadowRoot.activeElement : document.activeElement;
const frame = () => new Promise((r) => requestAnimationFrame(() => r(undefined)));
/** The tooltip's text, or null when there is none (or it is fading out). */
const tooltipText = (el: Element) => {
  const tip = root(el).querySelector<HTMLElement>('.leaflet-tooltip');
  if (!tip || tip.style.opacity === '0') return null;
  return tip.textContent!.replace(/\s+/g, ' ').trim();
};

/** Collect console.warn calls made while `fn` runs. */
async function warnings<T>(fn: () => Promise<T>): Promise<{ result: T; warns: string[] }> {
  const orig = console.warn;
  const warns: string[] = [];
  console.warn = (...a: unknown[]) => void warns.push(a.join(' '));
  try {
    return { result: await fn(), warns };
  } finally {
    console.warn = orig;
  }
}

/** Never let a test follow a marker or list link. */
const stopLinks = (e: Event) => {
  if (e.composedPath().some((n) => n instanceof HTMLAnchorElement && n.href)) e.preventDefault();
};
before(() => window.addEventListener('click', stopLinks, true));
after(() => window.removeEventListener('click', stopLinks, true));

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-map (${mode})`, function () {
    this.timeout(8000);
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';

    async function make(extra = 'label="Places on Grounds" count-label="photos"', items = PLACES) {
      const el = await fixture<UvalibMap>(`<uvalib-map ${attr} ${extra}></uvalib-map>`);
      el.leaflet = L;
      el.items = items;
      await el.updateComplete;
      await frame();
      return el;
    }

    // The pointer rests away from the maps, so no marker is hovered by accident.
    beforeEach(() => sendMouse({ type: 'move', position: [790, 590] }));
    afterEach(async () => {
      await emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'none' });
    });

    it('draws a marker per place: a link (or a button) named with its count, sized by the count', async () => {
      const el = await make();
      const m = markers(el);
      expect(m.map((x) => x.textContent)).to.deep.equal([
        'The Rotunda, 2,702 photos',
        'The Lawn, 900 photos',
        'Alderman Library, 150 photos',
        'Scott Stadium, 1 photo',
      ]);
      expect(m.map((x) => x.localName)).to.deep.equal(['a', 'a', 'a', 'button']);
      expect(m[0]!.getAttribute('href')).to.equal('/places/rotunda');
      expect((m[3] as HTMLButtonElement).type).to.equal('button');
      const dots = m.map(
        (x) => x.querySelector<HTMLElement>('.dot')!.getBoundingClientRect().width,
      );
      expect(dots[0]).to.equal(56);
      expect(dots[3]).to.be.within(24, 26);
      // sqrt scale: 900 of 2,702 is about 58% of the way from 24 to 56.
      expect(dots[1]).to.be.within(41, 44);
      expect(dots[0]! > dots[1]! && dots[1]! > dots[2]! && dots[2]! > dots[3]!).to.equal(true);
      for (const x of m) {
        const r = x.getBoundingClientRect();
        expect(r.width, x.textContent!).to.be.at.least(44);
        expect(r.height, x.textContent!).to.be.at.least(44);
        expect(x.querySelector('.dot')!.getAttribute('aria-hidden')).to.equal('true');
      }
      // Markers do not carry Leaflet's own role or tab stop on the wrapper.
      for (const i of icons(el)) {
        expect(i.hasAttribute('tabindex')).to.equal(false);
        expect(i.hasAttribute('role')).to.equal(false);
      }
    });

    it('lists the same places with links, count badges and descriptions', async () => {
      const el = await make();
      const li = places(el);
      expect(li).to.have.length(4);
      expect(li[0]!.querySelector('a')!.getAttribute('href')).to.equal('/places/rotunda');
      expect(li[0]!.querySelector('a')!.textContent).to.equal('The Rotunda');
      expect(li[0]!.querySelector('.count')!.textContent).to.equal('2,702 photos');
      expect(li[3]!.querySelector('a')).to.equal(null);
      expect(li[3]!.querySelector('.name')!.textContent).to.equal('Scott Stadium');
      expect(li[3]!.querySelector('.description')!.textContent).to.equal(
        'Football and commencement',
      );
      const list = root(el).querySelector('ul.places')!;
      expect(list.getAttribute('aria-label')).to.equal('Places on Grounds, list');
    });

    it('is a labelled region after a skip link and the key instructions', async () => {
      const el = await make();
      const r = root(el);
      const region = r.querySelector<HTMLElement>('[role="region"]')!;
      expect(region.getAttribute('aria-label')).to.equal('Places on Grounds, map');
      expect(region.classList.contains('leaflet-container')).to.equal(true);
      expect(r.querySelector('.instructions')!.textContent).to.equal(MAP_INSTRUCTIONS);
      const skip = r.querySelector<HTMLAnchorElement>('a.skip-link')!;
      expect(skip.textContent!.trim()).to.equal('Skip map, go to the list');
      // The skip link comes first, the region next, the list last.
      const order = [...r.querySelectorAll('a.skip-link, [role="region"], ul.places')];
      expect(order.map((n) => n.localName)).to.deep.equal(['a', 'div', 'ul']);
      skip.focus();
      expect(skip.getBoundingClientRect().height).to.be.greaterThan(0);
      skip.click();
      expect(focused(el)?.localName).to.equal('ul');
    });

    it('Tab and the arrow keys move between markers, with a tooltip and the list entry highlighted', async () => {
      const el = await make();
      const m = markers(el);
      m[0]!.focus();
      await el.updateComplete;
      expect(tooltipText(el)).to.equal('The Rotunda2,702 photos');
      expect(places(el)[0]!.classList.contains('is-active')).to.equal(true);
      expect(icons(el)[0]!.classList.contains('is-active')).to.equal(true);
      await sendKeys({ press: 'ArrowRight' });
      await el.updateComplete;
      expect(focused(el) === m[1]).to.equal(true);
      expect(tooltipText(el)).to.equal('The Lawn900 photos');
      expect(places(el)[0]!.classList.contains('is-active')).to.equal(false);
      expect(places(el)[1]!.classList.contains('is-active')).to.equal(true);
      await sendKeys({ press: 'End' });
      expect(focused(el) === m[3]).to.equal(true);
      await sendKeys({ press: 'ArrowDown' });
      expect(focused(el) === m[3]).to.equal(true);
      await sendKeys({ press: 'Home' });
      expect(focused(el) === m[0]).to.equal(true);
      await sendKeys({ press: 'Tab' });
      expect(focused(el) === m[1]).to.equal(true);
      await sendKeys({ press: 'Escape' });
      await el.updateComplete;
      expect(tooltipText(el)).to.equal(null);
      expect(icons(el)[1]!.classList.contains('is-active')).to.equal(false);
      m[1]!.blur();
    });

    it('Enter on a marker fires a cancelable select, and cancelling keeps the page', async () => {
      const el = await make();
      const seen: { id?: string; prevented: boolean }[] = [];
      el.addEventListener('select', (e) => {
        const ce = e as CustomEvent<{ item: MapItem }>;
        ce.preventDefault();
        seen.push({ id: ce.detail.item.id, prevented: ce.defaultPrevented });
      });
      let followed = 0;
      const watch = (e: Event) => {
        if (!e.defaultPrevented) followed++;
      };
      window.addEventListener('click', watch);
      try {
        markers(el)[0]!.focus();
        await sendKeys({ press: 'Enter' });
        markers(el)[3]!.focus();
        await sendKeys({ press: 'Enter' });
        await sendKeys({ press: 'Space' });
      } finally {
        window.removeEventListener('click', watch);
      }
      expect(seen).to.deep.equal([
        { id: 'rotunda', prevented: true },
        { id: 'stadium', prevented: true },
        { id: 'stadium', prevented: true },
      ]);
      expect(followed).to.equal(0);
      markers(el)[3]!.blur();
    });

    it('hovering or focusing a list entry highlights its marker with a ring and a larger dot', async () => {
      const el = await make();
      const li = places(el)[2]!;
      const dot = () => markers(el)[2]!.querySelector<HTMLElement>('.dot')!;
      const before = getComputedStyle(dot()).boxShadow;
      li.dispatchEvent(new MouseEvent('mouseenter'));
      await el.updateComplete;
      expect(icons(el)[2]!.classList.contains('is-active')).to.equal(true);
      expect(getComputedStyle(dot()).transform).to.not.equal('none');
      expect(getComputedStyle(dot()).boxShadow).to.not.equal(before);
      expect(tooltipText(el)).to.equal('Alderman Library150 photos');
      li.dispatchEvent(new MouseEvent('mouseleave'));
      await el.updateComplete;
      expect(icons(el)[2]!.classList.contains('is-active')).to.equal(false);
      li.querySelector('a')!.focus();
      await el.updateComplete;
      expect(icons(el)[2]!.classList.contains('is-active')).to.equal(true);
      li.querySelector('a')!.blur();
      await el.updateComplete;
      expect(icons(el)[2]!.classList.contains('is-active')).to.equal(false);
    });

    it('hovering a marker highlights its list entry until the pointer leaves the map', async () => {
      const el = await make();
      const r = markers(el)[1]!.getBoundingClientRect();
      markers(el)[1]!.dispatchEvent(
        new MouseEvent('mouseover', {
          bubbles: true,
          clientX: r.x + r.width / 2,
          clientY: r.y + r.height / 2,
        }),
      );
      await el.updateComplete;
      expect(places(el)[1]!.classList.contains('is-active')).to.equal(true);
      expect(tooltipText(el)).to.equal('The Lawn900 photos');
      root(el).querySelector('.map')!.dispatchEvent(new MouseEvent('mouseleave'));
      await el.updateComplete;
      expect(places(el)[1]!.classList.contains('is-active')).to.equal(false);
      expect(tooltipText(el)).to.equal(null);
    });

    it('opens on the places, or on center and zoom', async () => {
      const el = await make();
      const map = leafletMap(el);
      const bounds = map.getBounds();
      for (const p of PLACES) expect(bounds.contains([p.lat, p.lng]), p.name).to.equal(true);
      const fixed = await make('label="Rotunda" center="38.0356,-78.5034" zoom="18"');
      const c = leafletMap(fixed).getCenter();
      expect(leafletMap(fixed).getZoom()).to.equal(18);
      expect(c.lat).to.be.closeTo(38.0356, 1e-4);
      expect(c.lng).to.be.closeTo(-78.5034, 1e-4);
    });

    it('zoom buttons are 44px, named, focusable with a visible ring, and Space presses them', async () => {
      const el = await make();
      const buttons = [...root(el).querySelectorAll<HTMLAnchorElement>('.leaflet-control-zoom a')];
      expect(buttons.map((b) => b.getAttribute('aria-label'))).to.deep.equal([
        'Zoom in',
        'Zoom out',
      ]);
      for (const b of buttons) {
        const r = b.getBoundingClientRect();
        expect(r.width).to.equal(44);
        expect(r.height).to.equal(44);
      }
      markers(el)[3]!.focus();
      await sendKeys({ press: 'Tab' });
      expect(focused(el) === buttons[0]).to.equal(true);
      const s = getComputedStyle(buttons[0]!);
      expect(s.outlineStyle).to.equal('solid');
      expect(s.outlineWidth).to.equal('3px');
      const z = leafletMap(el).getZoom();
      await sendKeys({ press: 'Space' });
      await new Promise((r) => setTimeout(r, 400));
      expect(leafletMap(el).getZoom()).to.equal(z + 1);
      buttons[0]!.blur();
    });

    it('keeps the attribution, readable and linked', async () => {
      const el = await make();
      const attribution = root(el).querySelector<HTMLElement>('.leaflet-control-attribution')!;
      expect(attribution.textContent).to.include('OpenStreetMap');
      expect(attribution.textContent).to.include('Leaflet');
      expect(parseFloat(getComputedStyle(attribution).fontSize)).to.be.at.least(13);
      const osm = [...attribution.querySelectorAll('a')].find((a) =>
        a.href.includes('openstreetmap.org/copyright'),
      );
      expect(osm).to.not.equal(undefined);
      expect(getComputedStyle(osm!).textDecorationLine).to.equal('underline');
    });

    it('loads tiles from tile-url (stubbed) under the attribution', async () => {
      const el = await make();
      const deadline = Date.now() + 3000;
      while (!root(el).querySelector('img.leaflet-tile-loaded') && Date.now() < deadline)
        await new Promise((r) => setTimeout(r, 50));
      const tile = root(el).querySelector<HTMLImageElement>('img.leaflet-tile-loaded')!;
      expect(tile.src).to.match(/^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/);
      expect(tile.alt).to.equal('');
      expect(tile.getBoundingClientRect().width).to.be.within(128, 512); // half zoom steps scale tiles
    });

    it('turns off zoom, fade and marker animations under reduced motion', async () => {
      await emulateMedia({ reducedMotion: 'reduce' });
      const el = await make();
      const o = leafletMap(el).options;
      expect([o.zoomAnimation, o.fadeAnimation, o.markerZoomAnimation, o.inertia]).to.deep.equal([
        false,
        false,
        false,
        false,
      ]);
      const dot = markers(el)[0]!.querySelector<HTMLElement>('.dot')!;
      expect(getComputedStyle(dot).transitionDuration).to.equal('0s');
    });

    it('keeps marker and control borders in forced colors', async () => {
      await emulateMedia({ forcedColors: 'active' });
      const el = await make();
      const dot = getComputedStyle(markers(el)[0]!.querySelector('.dot')!);
      expect(dot.borderTopStyle).to.equal('solid');
      expect(dot.borderTopWidth).to.equal('3px');
      const zoom = getComputedStyle(root(el).querySelector('.leaflet-control-zoom a')!);
      expect(zoom.borderTopStyle).to.equal('solid');
      places(el)[0]!.dispatchEvent(new MouseEvent('mouseenter'));
      await el.updateComplete;
      const ring = getComputedStyle(markers(el)[0]!.querySelector('.dot')!);
      expect(ring.outlineStyle).to.equal('solid');
    });

    it('dark mode: the tiles are filtered, the markers and controls are not', async () => {
      await inDarkMode(async () => {
        const el = await make();
        await el.updateComplete;
        const r = root(el);
        expect(getComputedStyle(r.querySelector('.leaflet-tile-pane')!).filter).to.include(
          'invert',
        );
        for (const sel of ['.leaflet-marker-pane', '.leaflet-control-container', '.map'])
          expect(getComputedStyle(r.querySelector(sel)!).filter, sel).to.equal('none');
        const zoom = getComputedStyle(r.querySelector('.leaflet-control-zoom a')!);
        expect(zoom.backgroundColor).to.equal('rgb(35, 45, 75)'); // --uva-color-surface-raised
        await expectNoAxeViolations(el);
      });
    });

    it('dark mode: dark-tile-url swaps the tiles and drops the filter', async () => {
      await inDarkMode(async () => {
        const el = await make(
          'label="Places" dark-tile-url="https://tile.openstreetmap.org/{z}/{x}/{y}.png?dark"',
        );
        const r = root(el);
        expect(getComputedStyle(r.querySelector('.leaflet-tile-pane')!).filter).to.equal('none');
        expect(r.querySelector<HTMLImageElement>('img.leaflet-tile')!.src).to.include('?dark');
      });
      // Back in light mode, the light tiles.
      const el = await make(
        'label="Places" dark-tile-url="https://tile.openstreetmap.org/{z}/{x}/{y}.png?dark"',
      );
      expect(root(el).querySelector<HTMLImageElement>('img.leaflet-tile')!.src).to.not.include(
        '?dark',
      );
    });

    it('follows a change of the page scheme after it renders', async () => {
      const el = await make();
      const pane = () => getComputedStyle(root(el).querySelector('.leaflet-tile-pane')!).filter;
      expect(pane()).to.equal('none');
      await inDarkMode(async () => {
        await new Promise((r) => setTimeout(r, 0));
        await el.updateComplete;
        expect(pane()).to.include('invert');
      });
      await new Promise((r) => setTimeout(r, 0));
      await el.updateComplete;
      expect(pane()).to.equal('none');
    });

    it('passes axe with the map rendered (light)', async () => {
      const el = await make();
      await expectNoAxeViolations(el);
      markers(el)[0]!.focus();
      await el.updateComplete;
      await expectNoAxeViolations(el);
      markers(el)[0]!.blur();
    });

    it('reflows at 320px: no sideways scroll, the map a sensible height, the list under it', async () => {
      await setViewport({ width: 320, height: 640 });
      try {
        const el = await make();
        await new Promise((r) => setTimeout(r, 50));
        const map = root(el).querySelector<HTMLElement>('.map')!.getBoundingClientRect();
        const list = root(el).querySelector('ul.places')!.getBoundingClientRect();
        expect(el.getBoundingClientRect().width).to.be.at.most(320);
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
        expect(map.height).to.be.within(192, 400);
        expect(list.top).to.be.at.least(map.bottom);
        for (const li of places(el)) expect(li.getBoundingClientRect().right).to.be.at.most(320);
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
    });

    it('reads the places from a child list, which stays the list', async () => {
      const el =
        await fixture<UvalibMap>(`<uvalib-map ${attr} label="Libraries" count-label="photos">
        <ul>
          <li><a href="/a" data-lat="38.0364" data-lng="-78.5054" data-count="12" data-id="a">Alderman Library</a></li>
          <li><a href="/c" data-lat="38.0332" data-lng="-78.5079" data-description="Science">Clark Hall</a></li>
          <li data-lat="38.0311" data-lng="-78.5137">Scott Stadium</li>
          <li>No coordinates</li>
        </ul>
      </uvalib-map>`);
      el.leaflet = L;
      await el.updateComplete;
      await frame();
      expect(markers(el).map((m) => m.textContent)).to.deep.equal([
        'Alderman Library, 12 photos',
        'Clark Hall',
        'Scott Stadium',
      ]);
      expect(places(el).map((li) => li.querySelector('a, .name')!.textContent)).to.deep.equal([
        'Alderman Library',
        'Clark Hall',
        'Scott Stadium',
      ]);
      expect(places(el)[1]!.querySelector('.description')!.textContent).to.equal('Science');
      // The author's list is not shown twice.
      const source = el.querySelector(':scope > ul, :scope > .uvalib-map-source')!;
      expect(source.getBoundingClientRect().height).to.equal(0);
    });

    it('without Leaflet shows only the list, with one console warning', async () => {
      const { result: el, warns } = await warnings(async () => {
        const x = await fixture<UvalibMap>(`<uvalib-map ${attr} label="Places"></uvalib-map>`);
        x.items = PLACES;
        await x.updateComplete;
        x.countLabel = 'photos';
        await x.updateComplete;
        await new Promise((r) => setTimeout(r, 1100));
        return x;
      });
      expect(root(el).querySelector('[role="region"]')).to.equal(null);
      expect(root(el).querySelector('.skip-link')).to.equal(null);
      expect(places(el)).to.have.length(4);
      expect(warns.filter((w) => w.includes('Leaflet was not found'))).to.have.length(1);
      await expectNoAxeViolations(el);
      // Leaflet given later: the map appears.
      el.leaflet = L;
      await el.updateComplete;
      expect(markers(el)).to.have.length(4);
    });

    it('uses window.L when no leaflet property is set', async () => {
      const w = window as unknown as { L?: unknown };
      w.L = L;
      try {
        const el = await fixture<UvalibMap>(`<uvalib-map ${attr} label="Places"></uvalib-map>`);
        el.items = PLACES;
        await el.updateComplete;
        expect(markers(el)).to.have.length(4);
        expect(markers(el)[0]!.textContent).to.equal('The Rotunda, 2,702 items');
      } finally {
        delete w.L;
      }
    });

    it('warns once without a label', async () => {
      const { warns } = await warnings(() => make(''));
      expect(warns.filter((w) => w.includes('label is required'))).to.have.length(1);
    });

    it('rebuilds after it is moved in the document', async () => {
      const el = await make();
      const parent = el.parentElement!;
      el.remove();
      parent.append(el);
      await el.updateComplete;
      await frame();
      expect(markers(el)).to.have.length(4);
      expect(root(el).querySelectorAll('.leaflet-map-pane')).to.have.length(1);
    });

    it('reports select with the label and position, and zoom with the level; never a place', async () => {
      const rec = recordAnalytics();
      try {
        const el = await make();
        markers(el)[1]!.click();
        const buttons = root(el).querySelectorAll<HTMLAnchorElement>('.leaflet-control-zoom a');
        const z = leafletMap(el).getZoom();
        buttons[1]!.click();
        await new Promise((r) => setTimeout(r, 1100));
        const events = rec.of('uvalib-analytics-event').map((d) => d.event);
        expect(events).to.deep.equal([
          ['uvalib-map', 'select', 'Places on Grounds', 2],
          ['uvalib-map', 'zoom', 'Places on Grounds', z - 1],
        ]);
        expect(JSON.stringify(events)).to.not.include('Lawn');
      } finally {
        rec.restore();
      }
    });

    it('reports nothing with no-analytics, and nothing on render or hover', async () => {
      const rec = recordAnalytics();
      try {
        const el = await make('label="Places" no-analytics');
        places(el)[0]!.dispatchEvent(new MouseEvent('mouseenter'));
        markers(el)[1]!.click();
        const quiet = await make();
        places(quiet)[0]!.dispatchEvent(new MouseEvent('mouseenter'));
        await quiet.updateComplete;
        expect(rec.events).to.deep.equal([]);
      } finally {
        rec.restore();
      }
    });
  });
}

describe('uvalib-map (no-shadow-dom, page loads leaflet.css)', () => {
  let link: HTMLLinkElement;
  before(async () => {
    link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/node_modules/leaflet/dist/leaflet.css';
    const loaded = new Promise((r) => link.addEventListener('load', r));
    document.head.append(link);
    await loaded;
  });
  after(() => link.remove());

  it('keeps 44px zoom buttons, its tooltip colours and attribution', async () => {
    const el = await fixture<UvalibMap>(
      `<uvalib-map no-shadow-dom label="Places" count-label="photos"></uvalib-map>`,
    );
    el.leaflet = L;
    el.items = PLACES;
    await el.updateComplete;
    for (const b of el.querySelectorAll('.leaflet-control-zoom a')) {
      expect(b.getBoundingClientRect().width).to.equal(44);
      expect(b.getBoundingClientRect().height).to.equal(44);
    }
    const attribution = el.querySelector('.leaflet-control-attribution')!;
    expect(parseFloat(getComputedStyle(attribution).fontSize)).to.be.at.least(13);
    markers(el)[0]!.focus();
    await el.updateComplete;
    const tip = getComputedStyle(el.querySelector('.leaflet-tooltip')!);
    expect(tip.backgroundColor).to.equal('rgb(255, 255, 255)');
    expect(tip.color).to.equal('rgb(43, 43, 43)');
    await expectNoAxeViolations(el);
    markers(el)[0]!.blur();
  });
});

describe('uvalib-map (no-style)', () => {
  for (const mode of ['', 'no-shadow-dom']) {
    it(`keeps the Leaflet layout and 44px targets ${mode || 'in shadow DOM'}`, async () => {
      const el = await fixture<UvalibMap>(
        `<uvalib-map ${mode} no-style label="Places"></uvalib-map>`,
      );
      el.leaflet = L;
      el.items = PLACES;
      await el.updateComplete;
      const r = root(el);
      expect(getComputedStyle(r.querySelector('.leaflet-tile-pane')!).position).to.equal(
        'absolute',
      );
      expect(r.querySelector('.map')!.getBoundingClientRect().height).to.be.greaterThan(150);
      for (const m of markers(el)) expect(m.getBoundingClientRect().width).to.be.at.least(44);
      expect(
        r.querySelector('.uvalib-map-marker .visually-hidden')!.getBoundingClientRect().width,
      ).to.be.at.most(1);
    });
  }
});
