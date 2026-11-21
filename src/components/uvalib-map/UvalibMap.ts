import { html, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
// Types only: Leaflet is the host page's (the `leaflet` property or `window.L`), never bundled.
import type * as Leaflet from 'leaflet';
import { trackEvent } from '../../base/analytics.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { normalize, safeHref, SourceChildren } from '../../base/source-children.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { accessible } from '../../styles/accessible.js';

/** One place on the map, and in the list beside it. */
export interface MapItem {
  /** Your own key, passed back in `select`. */
  id?: string;
  /** The place's name: the list entry, the marker's accessible name and its tooltip. */
  name: string;
  lat: number;
  lng: number;
  /** A count (photos, items, …) that sizes the marker and is part of its name. */
  count?: number;
  /** The place's page: the list entry and the marker are links to it. */
  href?: string;
  /** A line under the name in the list. */
  description?: string;
}

type LeafletNS = typeof Leaflet;

/** Places drawn as one marker at the current zoom. */
interface MapGroup {
  /** The places' indexes, ascending, joined by commas. */
  key: string;
  /** The places' indexes, largest count first. */
  members: number[];
  marker: Leaflet.Marker;
  ctl: HTMLElement;
  /** Dot diameter (px). */
  d: number;
  sum: number;
  /** Whether any place in it has a count. */
  counted: boolean;
}

const countOf = (p?: MapItem) =>
  p && Number.isFinite(p.count) && (p.count as number) > 0 ? (p.count as number) : 0;

/** The analytics category. */
const TAG = 'uvalib-map';

/** OpenStreetMap's standard tiles: fine for low traffic only (see the README). */
export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Where the map opens with no places and no `center`: the Lawn. */
const GROUNDS: [number, number] = [38.0336, -78.5048];

/** Marker dot diameters (px): the smallest and largest count. Every target is at least 44px. */
const MIN_DOT = 24;
const MAX_DOT = 56;
const HIT = 44;
/** Space kept between two markers' hit areas (WCAG 2.5.8's 24px spacing): closer ones are grouped. */
const GAP = 24;
/** A group's dot: big enough for the number of places in it, and never larger than this. */
const MIN_GROUP_DOT = 32;
const MAX_GROUP_DOT = 64;

const MAP_HEIGHT = 'var(--uvalib-map-height, min(24rem, 75vw))';

/** Shown above the map, and kept in step with base.css's pre-upgrade placeholder. */
export const MAP_INSTRUCTIONS =
  'Tab or arrow keys move between places; Enter opens one. With the map focused, arrow keys pan and + and − zoom.';

let instanceCounter = 0;

const fmt = (n: number) => n.toLocaleString('en-US');

/** "photos" for most counts, "photo" for one. */
const noun = (unit: string, n: number) => (n === 1 && /s$/.test(unit) ? unit.slice(0, -1) : unit);

const validPlace = (p: MapItem) =>
  Number.isFinite(p.lat) &&
  Number.isFinite(p.lng) &&
  Math.abs(p.lat) <= 90 &&
  Math.abs(p.lng) <= 180;

/** Parse `"lat, lng"`; null unless both are numbers in range. */
function parseCenter(s: string): [number, number] | null {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(s);
  if (!m) return null;
  const [lat, lng] = [Number(m[1]), Number(m[2])];
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
}

/** Whether the page shows the opt-in dark mode (`data-uva-color-scheme` on the root element). */
function pageIsDark(doc: Document): boolean {
  const attr = doc.documentElement.getAttribute('data-uva-color-scheme');
  if (attr === null) return false;
  try {
    if (!doc.defaultView?.CSS?.supports?.('color', 'light-dark(#000, #fff)')) return false;
  } catch {
    return false;
  }
  if (attr === 'dark') return true;
  if (attr === 'light') return false;
  return !!doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

/**
 * Leaflet's own layout rules that the map needs (panes, tiles, controls, the tooltip), so
 * Leaflet's leaflet.css is optional and the map works inside the shadow root. Kept with
 * `no-style`, with the map's height, the 44px marker and zoom targets, the hidden marker
 * names and skip link, and forced-colors borders. `host` is `:host` or the tag. Sizes that
 * leaflet.css also sets are `!important`, so a page that loads it (light DOM) keeps them.
 */
const structuralRules = (host: string) => `
  ${host} { display: block; position: relative; max-width: 100%; min-width: 0; box-sizing: border-box; }
  ${host}[hidden], ${host} [hidden] { display: none !important; }
  ${host} .visually-hidden {
    position: absolute !important; width: 1px !important; height: 1px !important; margin: -1px; padding: 0;
    overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
  }
  ${host} .skip-link { position: absolute; inset-inline-start: 0; inset-block-start: 0; z-index: 1100; transform: translateY(-120%); }
  ${host} .skip-link:focus-visible { transform: translateY(0); }
  ${host} .map { position: relative; block-size: ${MAP_HEIGHT}; min-block-size: 12rem; box-sizing: border-box; }
  ${host} .leaflet-pane, ${host} .leaflet-tile, ${host} .leaflet-marker-icon, ${host} .leaflet-marker-shadow,
  ${host} .leaflet-tile-container, ${host} .leaflet-pane > svg, ${host} .leaflet-pane > canvas,
  ${host} .leaflet-zoom-box, ${host} .leaflet-image-layer, ${host} .leaflet-layer {
    position: absolute; left: 0; top: 0;
  }
  ${host} .leaflet-container { overflow: hidden; -webkit-tap-highlight-color: transparent; }
  ${host} .leaflet-tile, ${host} .leaflet-marker-icon { user-select: none; -webkit-user-drag: none; }
  ${host} .leaflet-marker-icon { display: block; }
  ${host} .leaflet-container .leaflet-tile-pane img, ${host} .leaflet-container .leaflet-tile {
    max-width: none !important; max-height: none !important; width: auto; padding: 0;
  }
  ${host} .leaflet-container.leaflet-touch-zoom { touch-action: pan-x pan-y; }
  ${host} .leaflet-container.leaflet-touch-drag { touch-action: pinch-zoom; }
  ${host} .leaflet-container.leaflet-touch-drag.leaflet-touch-zoom { touch-action: none; }
  ${host} .leaflet-tile { filter: inherit; visibility: hidden; }
  ${host} .leaflet-tile-loaded { visibility: inherit; }
  ${host} .leaflet-zoom-box { width: 0; height: 0; box-sizing: border-box; z-index: 800; }
  ${host} .leaflet-pane { z-index: 400; }
  ${host} .leaflet-tile-pane { z-index: 200; }
  ${host} .leaflet-overlay-pane { z-index: 400; }
  ${host} .leaflet-shadow-pane { z-index: 500; }
  ${host} .leaflet-marker-pane { z-index: 600; }
  ${host} .leaflet-tooltip-pane { z-index: 650; }
  ${host} .leaflet-popup-pane { z-index: 700; }
  ${host} .leaflet-control { position: relative; z-index: 800; pointer-events: auto; float: left; clear: both; }
  ${host} .leaflet-top, ${host} .leaflet-bottom { position: absolute; z-index: 1000; pointer-events: none; }
  ${host} .leaflet-top { top: 0; }
  ${host} .leaflet-right { right: 0; }
  ${host} .leaflet-bottom { bottom: 0; }
  ${host} .leaflet-left { left: 0; }
  ${host} .leaflet-right .leaflet-control { float: right; }
  ${host} .leaflet-top .leaflet-control { margin-top: 10px; }
  ${host} .leaflet-bottom .leaflet-control { margin-bottom: 10px; }
  ${host} .leaflet-left .leaflet-control { margin-left: 10px; }
  ${host} .leaflet-right .leaflet-control { margin-right: 10px; }
  ${host} .leaflet-control-attribution { margin: 0 !important; }
  ${host} .leaflet-zoom-animated { transform-origin: 0 0; }
  ${host} .leaflet-zoom-anim .leaflet-zoom-animated { transition: transform 0.25s cubic-bezier(0, 0, 0.25, 1); }
  ${host} .leaflet-zoom-anim .leaflet-tile, ${host} .leaflet-pan-anim .leaflet-tile { transition: none; }
  ${host} .leaflet-zoom-anim .leaflet-zoom-hide { visibility: hidden; }
  ${host} .leaflet-interactive { cursor: pointer; }
  ${host} .leaflet-grab { cursor: grab; }
  ${host} .leaflet-dragging .leaflet-grab, ${host} .leaflet-dragging .leaflet-grab .leaflet-interactive { cursor: grabbing; }
  ${host} .leaflet-marker-icon, ${host} .leaflet-tile-container { pointer-events: none; }
  ${host} .leaflet-marker-icon.leaflet-interactive { pointer-events: auto; }
  ${host} .leaflet-tooltip { position: absolute; pointer-events: none; white-space: nowrap; user-select: none; }
  ${host} .uvalib-map-marker .marker {
    box-sizing: border-box; display: flex; align-items: center; justify-content: center;
    inline-size: 100%; block-size: 100%; margin: 0; padding: 0; border: 0; background: none;
    cursor: pointer; font: inherit; color: inherit;
  }
  ${host} .uvalib-map-marker .dot { box-sizing: border-box; display: block; flex: none; inline-size: var(--d); block-size: var(--d); border-radius: 50%; }
  ${host} .uvalib-map-marker.is-group .dot { display: flex; align-items: center; justify-content: center; font-weight: 700; line-height: 1; }
  ${host} .leaflet-bar a {
    box-sizing: border-box; display: flex !important; align-items: center; justify-content: center;
    inline-size: 44px !important; block-size: 44px !important; line-height: 1 !important;
  }
  @media (prefers-reduced-motion: reduce) {
    ${host} .leaflet-zoom-anim .leaflet-zoom-animated { transition: none; }
  }
  @media (forced-colors: active) {
    ${host} .uvalib-map-marker .dot {
      forced-color-adjust: none; background: Canvas !important; color: CanvasText !important; border: 3px solid CanvasText !important; box-shadow: none !important;
    }
    ${host} .uvalib-map-marker.is-group .dot { border-style: double !important; border-width: 6px !important; }
    ${host} .uvalib-map-marker.is-active .dot { outline: 3px solid Highlight; outline-offset: 3px; }
    ${host} .uvalib-map-marker .marker:focus-visible .dot { outline: 3px solid Highlight; outline-offset: 6px; }
    ${host} .map, ${host} .map .leaflet-bar, ${host} .map .leaflet-bar a, ${host} .map .leaflet-tooltip,
    ${host} .map .leaflet-control-attribution, ${host} .place {
      border: 1px solid CanvasText !important;
    }
    ${host} .place.is-active { outline: 3px solid Highlight; outline-offset: 1px; }
    ${host} :is(.map, .leaflet-bar a, a, .skip-link):focus-visible { outline: 3px solid Highlight; outline-offset: 2px; }
  }
`;
const shadowStructure = unsafeCSS(structuralRules(':host'));

/**
 * A map of places with a linked list of the same places: buildings, rooms or outdoor spaces,
 * each a marker sized by a count, with a link to the place's page. It wraps
 * [Leaflet](https://leafletjs.com) 1.9, which the page provides (the library never bundles
 * it): set the `leaflet` property to the Leaflet module (`import * as L from 'leaflet'`), or
 * load leaflet.js so that `window.L` exists. Without Leaflet only the list is shown, with
 * one console warning. Leaflet's leaflet.css is optional: the element carries the layout
 * rules it needs, in shadow DOM and light DOM alike.
 *
 * Places come from `items` (`{ id?, name, lat, lng, count?, href?, description? }`) or from
 * a child `<ul>`/`<ol>` of `<li><a href data-lat data-lng data-count>Name</a></li>`, which is
 * the list before the script runs (and without it). The list always stays, under the map:
 * it is the text equivalent.
 *
 * Each marker is a real link (a button when the place has no `href`) named like "The
 * Rotunda, 2,702 photos" (`count-label` is the noun), sized by the square root of its count
 * (a 24 to 56px dot in a hit area of at least 44px). Tab or the arrow keys move between
 * markers, Enter follows the link (or chooses the place), and Escape hides the tooltip.
 * Hovering or focusing a marker shows a tooltip with its name and count and highlights its
 * list entry; hovering or focusing a list entry highlights its marker (a ring and a larger
 * dot, not colour alone) and brings it into view.
 *
 * Markers whose targets would overlap, or come within 24px of each other, at the current
 * zoom are drawn as one group marker (regrouped after every zoom and resize): a button
 * showing how many places it holds, sized by their summed count and named like "The Rotunda
 * and 2 more places, 3,610 photos" (the largest place's name; `place-label` is the noun).
 * Choosing it zooms in until its places part; when they cannot (one point, or the
 * maximum zoom) it spreads them in a ring around it instead, with focus on the first;
 * Escape or a zoom closes the ring and focus returns to the group. The arrow keys move
 * between the markers shown (a group is one); a place in the list that is in a group
 * highlights the group, whose tooltip names the place.
 *
 * The map is a region named by `label`, after a "Skip map, go to the list" link and a line
 * of key instructions. It opens on the bounds of the places, or on `center` and `zoom`. The
 * zoom buttons are 44px with a visible focus ring; the attribution stays. Tiles come from
 * `tile-url` (OpenStreetMap by default: low-traffic use only) with `attribution`. In the
 * page's dark mode the tiles are inverted with a CSS filter (`--uvalib-map-dark-filter`)
 * unless `dark-tile-url` gives dark tiles; markers and controls are never filtered. With
 * `prefers-reduced-motion` nothing animates.
 *
 * @tagname uvalib-map
 * @slot - A `<ul>` or `<ol>` of places: each `<li>` holds an `<a href>` (or the `<li>` itself) with `data-lat`, `data-lng` and optionally `data-count`, `data-id` and `data-description`. Used when `items` is empty; without JavaScript it is the list.
 * @fires select - A place's marker was chosen (click, Enter or Space); never a group's. `detail` is `{ item }`. Cancelable: for a place with `href`, `preventDefault()` keeps the page from following the link. Bubbles and is composed.
 * @fires uvalib-analytics-event - For `<site-analytics>`: `['uvalib-map', 'select', '<label>', <position from 1>]` when a place's marker is chosen, `['uvalib-map', 'expand', '<label>', <places in it>]` when a group is chosen (it zooms in or opens its ring), and `['uvalib-map', 'zoom', '<label>', <zoom level>]` 1 s after the last zoom-button press. Never a place's name, coordinates or URL. Bubbles and is composed.
 * @csspart map - The map region (the Leaflet container).
 * @csspart instructions - The line of key instructions above the map.
 * @csspart list - The list of places.
 * @csspart place - Each list entry.
 * @cssprop [--uvalib-map-height=min(24rem, 75vw)] - Height of the map.
 * @cssprop [--uvalib-map-dark-filter=invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9)] - The filter on the tiles in dark mode, when there is no `dark-tile-url`.
 * @cssprop [--uva-brand-blue=#232d4b] - Marker fill.
 * @cssprop [--uva-brand-orange=#e57200] - Focus ring when `--uva-color-focus` is unset.
 * @cssprop [--uva-font-family=inherit] - Font family.
 * @cssprop --uva-color-accent-bg - Dark-mode role token: marker fill (else `--uva-brand-blue`).
 * @cssprop --uva-color-on-accent - Dark-mode role token: marker border (else #fff).
 * @cssprop --uva-color-text - Dark-mode role token: text and the highlight ring (else #2b2b2b).
 * @cssprop --uva-color-text-muted - Dark-mode role token: instructions and descriptions (else #4b5563).
 * @cssprop --uva-color-link - Dark-mode role token: links (else `--uva-brand-blue`).
 * @cssprop --uva-color-surface - Dark-mode role token: attribution background and the highlight ring's gap (else #fff).
 * @cssprop --uva-color-surface-raised - Dark-mode role token: zoom buttons, tooltip and list entries (else #fff).
 * @cssprop --uva-color-surface-hover - Dark-mode role token: hovered zoom button (else #dadada).
 * @cssprop --uva-color-track - Dark-mode role token: the map before tiles load, and count badges (else #e5e7eb).
 * @cssprop --uva-color-control-border - Dark-mode role token: borders (else #808080).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 * @cssprop --uva-color-shadow - Dark-mode role token: control and tooltip shadow.
 */
export class UvalibMap extends UvalibElement {
  static styles = [
    accessible,
    shadowStructure,
    unsafeCSS(`
      :host { font-family: var(--uva-font-family, inherit); color: var(--uva-color-text, #2b2b2b); }
      .instructions {
        margin: 0 0 0.5rem;
        font-size: 0.875rem;
        line-height: 1.5;
        color: var(--uva-color-text-muted, #4b5563);
      }
      .map {
        border: 1px solid var(--uva-color-control-border, #808080);
        border-radius: 4px;
        background: var(--uva-color-track, #e5e7eb) !important;
        font-family: inherit !important;
        font-size: 1rem !important;
        line-height: 1.5 !important;
      }
      .map:focus-visible {
        outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
        outline-offset: 2px;
      }
      .dark-tiles .leaflet-tile-pane {
        filter: var(--uvalib-map-dark-filter, invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9));
      }
      .uvalib-map-marker .dot {
        background: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
        border: 2px solid var(--uva-color-on-accent, #fff);
        box-shadow: 0 0 0 1px var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      /* A group: its number of places, and a second ring (not colour alone). */
      .uvalib-map-marker.is-group .dot {
        color: var(--uva-color-on-accent, #fff);
        font-family: var(--uva-font-family, system-ui, sans-serif);
        font-size: 0.875rem;
        box-shadow:
          0 0 0 1px var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b)),
          0 0 0 3px var(--uva-color-on-accent, #fff),
          0 0 0 5px var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
      }
      .uvalib-map-marker.is-active .dot {
        transform: scale(1.25);
        box-shadow:
          0 0 0 3px var(--uva-color-surface, #fff),
          0 0 0 6px var(--uva-color-text, #2b2b2b);
      }
      .uvalib-map-marker .marker:focus-visible { outline: none; }
      .uvalib-map-marker .marker:focus-visible .dot {
        outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
        outline-offset: 6px;
      }
      .leaflet-bar {
        border: 1px solid var(--uva-color-control-border, #808080) !important;
        border-radius: 4px !important;
        background: var(--uva-color-surface-raised, #fff) !important;
        box-shadow: 0 1px 4px var(--uva-color-shadow, rgba(0, 0, 0, 0.2)) !important;
      }
      .leaflet-bar a {
        border: 0 !important;
        border-radius: 0 !important;
        background: var(--uva-color-surface-raised, #fff) !important;
        color: var(--uva-color-text, #2b2b2b) !important;
        font: 600 1.5rem/1 var(--uva-font-family, system-ui, sans-serif) !important;
        text-decoration: none !important;
      }
      .leaflet-bar a:first-child { border-radius: 3px 3px 0 0 !important; }
      .leaflet-bar a:last-child { border-radius: 0 0 3px 3px !important; }
      .leaflet-bar a + a { border-block-start: 1px solid var(--uva-color-control-border, #808080) !important; }
      .leaflet-bar a:hover { background: var(--uva-color-surface-hover, #dadada) !important; }
      .leaflet-bar a.leaflet-disabled {
        background: var(--uva-color-track, #e5e7eb) !important;
        color: var(--uva-color-text-muted, #4b5563) !important;
        cursor: not-allowed;
      }
      .leaflet-bar a:focus-visible { position: relative; z-index: 1; }
      .leaflet-control-attribution {
        padding: 0.125rem 0.375rem !important;
        background: var(--uva-color-surface, #fff) !important;
        color: var(--uva-color-text, #2b2b2b) !important;
        font-size: 0.8125rem !important;
        line-height: 1.5 !important;
      }
      .leaflet-control-attribution a {
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b)) !important;
        text-decoration: underline !important;
      }
      .leaflet-tooltip {
        padding: 0.25rem 0.5rem !important;
        border: 1px solid var(--uva-color-control-border, #808080) !important;
        border-radius: 4px !important;
        background: var(--uva-color-surface-raised, #fff) !important;
        color: var(--uva-color-text, #2b2b2b) !important;
        box-shadow: 0 1px 4px var(--uva-color-shadow, rgba(0, 0, 0, 0.2)) !important;
        font-size: 0.875rem !important;
        line-height: 1.4 !important;
      }
      .leaflet-tooltip::before { display: none !important; }
      .tip-name { display: block; font-weight: 600; }
      .tip-note { display: block; }
      .places {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
        gap: 0.5rem;
        margin: 1rem 0 0;
        padding: 0;
        list-style: none;
      }
      .places:focus { outline: none; }
      .places:focus-visible {
        outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
        outline-offset: 2px;
      }
      .place {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.25rem 0.5rem;
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--uva-color-control-border, #808080);
        border-radius: 4px;
        background: var(--uva-color-surface-raised, #fff);
        color: var(--uva-color-text, #2b2b2b);
      }
      .place.is-active {
        outline: 3px solid var(--uva-color-text, #2b2b2b);
        outline-offset: 1px;
      }
      .place a, .place .name {
        display: inline-block;
        min-block-size: 24px;
        font-weight: 600;
        line-height: 1.5;
      }
      .place a { color: var(--uva-color-link, var(--uva-brand-blue, #232d4b)); text-decoration: underline; }
      .count {
        padding: 0 0.5rem;
        border: 1px solid var(--uva-color-control-border, #808080);
        border-radius: 999px;
        background: var(--uva-color-track, #e5e7eb);
        color: var(--uva-color-text, #2b2b2b);
        font-size: 0.875rem;
        white-space: nowrap;
      }
      .description {
        flex-basis: 100%;
        font-size: 0.875rem;
        color: var(--uva-color-text-muted, #4b5563);
      }
      @media (prefers-reduced-motion: reduce) {
        .uvalib-map-marker .dot { transition: none; }
      }
    `),
  ];

  /** The places. When non-empty, wins over the child list. Set a new array to update. */
  @property({ type: Array })
  items: MapItem[] = [];

  /** The map's name (required): the region's label, the list's label and the analytics name. */
  @property({ type: String })
  label = '';

  /** The noun after each count, plural ("photos"); a count of one drops a trailing s. */
  @property({ type: String, attribute: 'count-label' })
  countLabel = 'items';

  /**
   * The noun for places in a group's name, plural: "The Rotunda and 2 more places" (one
   * drops a trailing s: "and 1 more place"). For example "rooms".
   */
  @property({ type: String, attribute: 'place-label' })
  placeLabel = 'places';

  /** The tile URL template (`{z}/{x}/{y}`, optionally `{s}` and `{r}`). */
  @property({ type: String, attribute: 'tile-url' })
  tileUrl = OSM_TILE_URL;

  /** Tiles for the page's dark mode. Without it, dark mode filters the light tiles instead. */
  @property({ type: String, attribute: 'dark-tile-url' })
  darkTileUrl = '';

  /** The tiles' attribution, as HTML. Required by most tile sources; always shown. */
  @property({ type: String })
  attribution = OSM_ATTRIBUTION;

  /** Where the map opens, `"lat,lng"`. Without it the map fits every place. */
  @property({ type: String })
  center = '';

  /** The opening zoom level (with `center`, or centred on the places). */
  @property({ type: Number })
  zoom?: number;

  /**
   * The Leaflet module (`import * as L from 'leaflet'; map.leaflet = L`). Without it
   * `window.L` is used (leaflet.js from a script tag).
   */
  @property({ attribute: false })
  leaflet?: unknown;

  @state() private sourceItems: MapItem[] = [];
  @state() private hasLeaflet = false;
  /** The highlighted target: "3" a place, "g:1,3" a group, "" none. */
  @state() private active = '';
  @state() private dark = false;

  private readonly uid = `uvalib-map-${++instanceCounter}`;
  private sourceKey = '[]';
  private L?: LeafletNS;
  private map?: Leaflet.Map;
  private tiles?: Leaflet.TileLayer;
  private tooltip?: Leaflet.Tooltip;
  private markers: (Leaflet.Marker | undefined)[] = [];
  private dots: number[] = [];
  private maxCount = 0;
  /** The groups drawn at the current zoom, by key. */
  private groups = new Map<string, MapGroup>();
  /** A grouped place's index → its group's key. */
  private groupOf = new Map<number, string>();
  /** The key of the group whose places are spread in a ring, or "". */
  private ring = '';
  /** The visible markers' controls, in keyboard (and document) order. */
  private order: HTMLElement[] = [];
  private activeIcon?: { marker: Leaflet.Marker; z: number };
  private drawn: MapItem[] = [];
  private reduceMotion = false;
  /** The visitor moved the map: a resize no longer refits it. */
  private userMoved = false;
  private fitting = false;
  private hoverKey = '';
  private focusKey = '';
  private dismissed = false;
  private warnedLabel = false;
  private warnedLeaflet = false;
  private zoomTimer?: ReturnType<typeof setTimeout>;
  private ro?: ResizeObserver;
  private schemeObserver?: MutationObserver;
  private darkQuery?: MediaQueryList;

  constructor() {
    super();
    new SourceChildren(
      this,
      () => this.lightDom,
      (nodes) => this.readList(nodes),
    );
    this.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.active) {
        this.dismissed = true;
        this.syncActive();
      }
    });
  }

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    const root = super.createRenderRoot();
    if (root instanceof ShadowRoot && this.noStyle) {
      const sheet = shadowStructure.styleSheet;
      if (sheet) root.adoptedStyleSheets = [sheet];
    }
    return root;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.lightDom && this.noStyle) {
      const node = this.getRootNode();
      installLightDomStyles(
        `${this.localName}::structure`,
        unsafeCSS(structuralRules(this.localName)),
        {
          root: node instanceof ShadowRoot || node instanceof Document ? node : undefined,
          scope: false,
        },
      );
    }
    const doc = this.ownerDocument;
    this.schemeObserver = new MutationObserver(() => this.readScheme());
    this.schemeObserver.observe(doc.documentElement, {
      attributes: true,
      attributeFilter: ['data-uva-color-scheme'],
    });
    this.darkQuery = doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
    this.darkQuery?.addEventListener('change', this.readScheme);
    this.readScheme();
    // leaflet.js loaded with async (or after this script): look again once the page has loaded.
    if (doc.readyState !== 'complete')
      doc.defaultView?.addEventListener('load', this.onPageLoad, { once: true });
    if (this.hasUpdated) this.requestUpdate();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.ownerDocument.defaultView?.removeEventListener('load', this.onPageLoad);
    this.schemeObserver?.disconnect();
    this.darkQuery?.removeEventListener('change', this.readScheme);
    this.teardown();
  }

  private onPageLoad = () => this.requestUpdate();

  private readScheme = () => {
    this.dark = pageIsDark(this.ownerDocument);
  };

  /** The places shown: `items`, else the child list. */
  private get places(): MapItem[] {
    return this.items?.length ? this.items : this.sourceItems;
  }

  /** The child list's places, compared with the last read so only a real change re-renders. */
  private readList(nodes: Node[]): void {
    const list = nodes.find(
      (n): n is HTMLElement =>
        n instanceof Element && (n.localName === 'ul' || n.localName === 'ol'),
    );
    const out: MapItem[] = [];
    for (const li of list ? [...list.children] : []) {
      if (li.localName !== 'li') continue;
      const src = (li.matches('[data-lat]') ? li : li.querySelector('[data-lat]')) as HTMLElement;
      if (!src) continue;
      const a = li.querySelector('a[href]');
      const d = src.dataset;
      const item: MapItem = {
        name: normalize((a ?? src).textContent),
        lat: Number(d.lat),
        lng: Number(d.lng),
      };
      const id = d.id ?? (li.id || undefined);
      if (id) item.id = id;
      if (d.count !== undefined && d.count.trim() !== '' && Number.isFinite(Number(d.count)))
        item.count = Number(d.count);
      const href = a?.getAttribute('href');
      if (href) item.href = href;
      const description = d.description ?? (li as HTMLElement).dataset.description;
      if (description) item.description = normalize(description);
      out.push(item);
    }
    const key = JSON.stringify(out);
    if (key === this.sourceKey) return;
    this.sourceKey = key;
    this.sourceItems = out;
  }

  /** The page's Leaflet: the `leaflet` property (a module namespace or its default), or `window.L`. */
  private findLeaflet(): LeafletNS | undefined {
    const isL = (x: unknown): x is LeafletNS =>
      !!x &&
      typeof (x as LeafletNS).map === 'function' &&
      typeof (x as LeafletNS).divIcon === 'function' &&
      typeof (x as LeafletNS).tileLayer === 'function';
    const own = this.leaflet as { default?: unknown } | undefined;
    const win = this.ownerDocument.defaultView as (Window & { L?: unknown }) | null;
    for (const x of [own, own?.default, win?.L]) if (isL(x)) return x;
    return undefined;
  }

  protected override willUpdate(changed: PropertyValues): void {
    const L = this.findLeaflet();
    if (L !== this.L) {
      if (this.map) this.teardown();
      this.L = L;
    }
    this.hasLeaflet = !!L;
    if (changed.has('label') && !this.label.trim() && !this.warnedLabel) {
      this.warnedLabel = true;
      console.warn(`<${TAG}>: label is required; it names the map region and the list.`);
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (!this.L) {
      // A page script may set `leaflet` just after this renders: warn only if it is still
      // missing a second after the page has loaded.
      if (!this.warnedLeaflet && this.ownerDocument.readyState === 'complete') {
        this.warnedLeaflet = true;
        setTimeout(() => {
          if (this.isConnected && !this.findLeaflet())
            console.warn(
              `<${TAG}>: Leaflet was not found (set the leaflet property, or load leaflet.js for window.L); showing the list only.`,
            );
        }, 1000);
      }
      return;
    }
    const created = this.setUpMap();
    const map = this.map;
    if (!map) return;
    if (
      !created &&
      (changed.has('tileUrl') ||
        changed.has('darkTileUrl') ||
        changed.has('attribution') ||
        changed.has('dark'))
    )
      this.drawTiles();
    if (
      created ||
      this.places !== this.drawn ||
      changed.has('countLabel') ||
      changed.has('placeLabel')
    ) {
      this.drawMarkers();
      if (created || !this.userMoved) this.fit();
      this.regroup();
    } else if (changed.has('center') || changed.has('zoom')) {
      this.fit();
    }
    if (changed.has('active')) this.showActive();
  }

  private get container(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>(`#${this.uid}-map`);
  }

  /** Create the Leaflet map once its container is rendered. True when it was created now. */
  private setUpMap(): boolean {
    const L = this.L;
    const el = this.container;
    if (!L || !el || this.map) return false;
    const win = this.ownerDocument.defaultView;
    this.reduceMotion = !!win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const still = !this.reduceMotion;
    const map = L.map(el, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      zoomAnimation: still,
      fadeAnimation: still,
      markerZoomAnimation: still,
      inertia: still,
      keyboard: true,
      // Half steps, so the opening view fits the places as closely as it can.
      zoomSnap: 0.5,
    });
    this.map = map;
    L.control.zoom({ position: 'topleft' }).addTo(map);
    L.control
      .attribution({
        position: 'bottomright',
        prefix: '<a href="https://leafletjs.com">Leaflet</a>',
      })
      .addTo(map);
    this.tooltip = L.tooltip({
      direction: 'top',
      opacity: 1,
      className: 'uvalib-map-tooltip',
    });
    map.on('movestart', () => {
      if (!this.fitting) this.userMoved = true;
    });
    // Any zoom closes a ring; every zoom regroups.
    map.on('zoomstart', () => {
      if (!this.ring) return;
      this.unring();
      this.regroup();
    });
    map.on('zoomend', () => this.regroup());
    this.drawTiles();
    this.ro = new ResizeObserver(() => {
      if (!this.map) return;
      this.map.invalidateSize({ animate: false });
      if (!this.userMoved) this.fit();
      this.regroup();
    });
    this.ro.observe(el);
    return true;
  }

  private teardown(): void {
    clearTimeout(this.zoomTimer);
    this.ro?.disconnect();
    this.ro = undefined;
    this.map?.remove();
    this.map = undefined;
    this.tiles = undefined;
    this.tooltip = undefined;
    this.markers = [];
    this.groups.clear();
    this.groupOf.clear();
    this.ring = '';
    this.order = [];
    this.activeIcon = undefined;
    this.drawn = [];
    this.userMoved = false;
  }

  /** The tile layer for the current scheme: dark tiles when given, else the filtered light ones. */
  private drawTiles(): void {
    const { L, map } = this;
    if (!L || !map) return;
    const url = this.dark && this.darkTileUrl ? this.darkTileUrl : this.tileUrl || OSM_TILE_URL;
    this.tiles?.remove();
    this.tiles = L.tileLayer(url, { attribution: this.attribution, maxZoom: 19 }).addTo(map);
  }

  /** Marker dot diameter: the square root of the count, between MIN_DOT and MAX_DOT. */
  private dotSize(count: number | undefined, max: number): number {
    if (!(max > 0) || count === undefined || !(count > 0)) return MIN_DOT;
    return Math.round(MIN_DOT + (MAX_DOT - MIN_DOT) * Math.sqrt(count / max));
  }

  /** "The Rotunda, 2,702 photos", or the name alone without a count. */
  private placeName(p: MapItem): string {
    return p.count === undefined ? p.name : `${p.name}, ${this.countText(p.count)}`;
  }

  private countText(n: number): string {
    return `${fmt(n)} ${noun(this.countLabel || 'items', n)}`;
  }

  private href(p: MapItem): string | null {
    return p.href && safeHref(p.href, this.ownerDocument.baseURI) ? p.href : null;
  }

  /** A group's dot: by the square root of its summed count, between MIN_GROUP_DOT and MAX_GROUP_DOT. */
  private groupDot(sum: number): number {
    const max = this.maxCount;
    if (!(max > 0) || !(sum > 0)) return MIN_GROUP_DOT;
    const d = Math.round(MIN_DOT + (MAX_DOT - MIN_DOT) * Math.sqrt(sum / max));
    return Math.min(MAX_GROUP_DOT, Math.max(MIN_GROUP_DOT, d));
  }

  /** "The Rotunda and 2 more places": the largest place's name and how many more. */
  private groupName(members: number[]): string {
    const n = members.length - 1;
    return `${this.places[members[0]!]!.name} and ${fmt(n)} more ${noun(this.placeLabel || 'places', n)}`;
  }

  /** A marker's hit area (px): its dot, at least 44px; a group's dot for several places. */
  private hitOf(members: number[]): number {
    if (members.length === 1) return Math.max(HIT, this.dots[members[0]!] ?? MIN_DOT);
    return Math.max(HIT, this.groupDot(members.reduce((s, i) => s + countOf(this.places[i]), 0)));
  }

  private makeMarker(
    ll: Leaflet.LatLngExpression,
    ctl: HTMLElement,
    d: number,
    className: string,
  ): Leaflet.Marker {
    const L = this.L!;
    const hit = Math.max(HIT, d);
    return L.marker(ll, {
      icon: L.divIcon({
        className,
        html: ctl,
        iconSize: [hit, hit],
        iconAnchor: [hit / 2, hit / 2],
      }),
      keyboard: false,
      // Smaller dots above larger ones.
      zIndexOffset: (MAX_DOT - d) * 10,
    });
  }

  /** The control inside a marker: its dot (with `text`, for a group) and its hidden name. */
  private makeControl(tag: 'a' | 'button', d: number, label: string, text = ''): HTMLElement {
    const doc = this.ownerDocument;
    const ctl = doc.createElement(tag);
    if (ctl instanceof HTMLButtonElement) ctl.type = 'button';
    ctl.className = 'marker';
    ctl.style.setProperty('--d', `${d}px`);
    const dot = doc.createElement('span');
    dot.className = 'dot';
    dot.setAttribute('aria-hidden', 'true');
    dot.textContent = text;
    const name = doc.createElement('span');
    name.className = 'visually-hidden';
    name.textContent = label;
    ctl.append(dot, name);
    return ctl;
  }

  /** One marker per place, not yet on the map: `regroup()` adds the ones not in a group. */
  private drawMarkers(): void {
    const { L, map } = this;
    if (!L || !map) return;
    for (const m of this.markers) m?.remove();
    for (const g of this.groups.values()) g.marker.remove();
    this.groups.clear();
    this.groupOf.clear();
    this.ring = '';
    this.order = [];
    this.activeIcon = undefined;
    const places = this.places;
    this.drawn = places;
    this.maxCount = Math.max(0, ...places.map(countOf));
    this.dots = places.map((p) => this.dotSize(p.count, this.maxCount));
    this.markers = places.map((p, i) => {
      if (!validPlace(p)) return undefined;
      const d = this.dots[i]!;
      const href = this.href(p);
      const ctl = this.makeControl(href ? 'a' : 'button', d, this.placeName(p));
      if (ctl instanceof HTMLAnchorElement) ctl.href = href!;
      ctl.dataset.index = String(i);
      const marker = this.makeMarker([p.lat, p.lng], ctl, d, 'uvalib-map-marker');
      marker.on('mouseover', () => this.hover(String(i)));
      return marker;
    });
    this.hoverKey = '';
    this.focusKey = '';
    if (this.active) this.active = '';
  }

  /**
   * Greedy screen-space grouping at `zoom`: largest count first, each place takes every
   * later one whose hit area (plus GAP) would overlap its own; then groups whose larger
   * markers now overlap merge, until none do. Each group's largest place comes first.
   */
  private cluster(idx: number[], zoom: number): number[][] {
    const map = this.map!;
    const places = this.places;
    const byCount = (a: number, b: number) => countOf(places[b]) - countOf(places[a]) || a - b;
    const pt = new Map(idx.map((i) => [i, map.project([places[i]!.lat, places[i]!.lng], zoom)]));
    const clash = (a: number[], b: number[]) => {
      const p = pt.get(a[0]!)!;
      const q = pt.get(b[0]!)!;
      const t = (this.hitOf(a) + this.hitOf(b)) / 2 + GAP;
      return Math.abs(p.x - q.x) < t && Math.abs(p.y - q.y) < t;
    };
    const sorted = [...idx].sort(byCount);
    const out: number[][] = [];
    const taken = new Set<number>();
    for (const i of sorted) {
      if (taken.has(i)) continue;
      const c = [i];
      taken.add(i);
      for (const j of sorted)
        if (!taken.has(j) && clash([i], [j])) {
          c.push(j);
          taken.add(j);
        }
      out.push(c);
    }
    for (let merged = true; merged;) {
      merged = false;
      for (let a = 0; a < out.length && !merged; a++)
        for (let b = a + 1; b < out.length && !merged; b++)
          if (clash(out[a]!, out[b]!)) {
            out[a] = [...out[a]!, ...out[b]!].sort(byCount);
            out.splice(b, 1);
            merged = true;
          }
    }
    return out;
  }

  private makeGroup(key: string, members: number[]): MapGroup {
    const p = this.places;
    const lead = p[members[0]!]!;
    const sum = members.reduce((s, i) => s + countOf(p[i]), 0);
    const counted = members.some((i) => Number.isFinite(p[i]!.count));
    const d = this.groupDot(sum);
    const name = this.groupName(members);
    const ctl = this.makeControl(
      'button',
      d,
      counted ? `${name}, ${this.countText(sum)}` : name,
      String(members.length),
    );
    ctl.dataset.group = key;
    const marker = this.makeMarker([lead.lat, lead.lng], ctl, d, 'uvalib-map-marker is-group');
    marker.on('mouseover', () => this.hover(`g:${key}`));
    return { key, members, marker, ctl, d, sum, counted };
  }

  /** The marker control that has focus, if any. */
  private focusedControl(): HTMLElement | null {
    const r = this.renderRoot;
    const a = r instanceof ShadowRoot ? r.activeElement : this.ownerDocument.activeElement;
    const ctl = a?.closest?.('.marker') as HTMLElement | null;
    return ctl && this.container?.contains(ctl) ? ctl : null;
  }

  /**
   * Group the markers whose hit areas would overlap at the current zoom, show one marker
   * per group (and the ring's places, when one is open), keep the markers' document order
   * the keyboard order, and give focus back if its marker went.
   */
  private regroup(): void {
    const { map } = this;
    if (!map || !(map as unknown as { _loaded?: boolean })._loaded) return;
    const had = this.focusedControl();
    const hadKey = had ? this.keyOf(had) : '';
    const lead = hadKey.startsWith('g:')
      ? (this.groups.get(hadKey.slice(2))?.members[0] ?? -1)
      : hadKey
        ? Number(hadKey)
        : -1;
    const idx = this.markers.flatMap((m, i) => (m ? [i] : []));
    const groups = new Map<string, MapGroup>();
    this.groupOf.clear();
    for (const c of this.cluster(idx, map.getZoom())) {
      if (c.length < 2) continue;
      const key = [...c].sort((a, b) => a - b).join(',');
      groups.set(key, this.groups.get(key) ?? this.makeGroup(key, c));
      for (const i of c) this.groupOf.set(i, key);
    }
    for (const [key, g] of this.groups) if (!groups.has(key)) g.marker.remove();
    if (this.ring && !groups.has(this.ring)) this.unring();
    this.groups = groups;

    // The visible markers, by the first place in each; a ring's places follow its group.
    const spots: { first: number; list: { marker: Leaflet.Marker; ctl: HTMLElement }[] }[] = [];
    const shown = new Set<number>();
    for (const i of idx)
      if (!this.groupOf.has(i)) {
        shown.add(i);
        spots.push({ first: i, list: [this.spot(i)] });
      }
    for (const g of groups.values()) {
      const list = [{ marker: g.marker, ctl: g.ctl }];
      if (this.ring === g.key)
        for (const i of g.members) {
          shown.add(i);
          list.push(this.spot(i));
        }
      spots.push({ first: Number(g.key.split(',')[0]), list });
    }
    spots.sort((a, b) => a.first - b.first);
    const added = new Set<HTMLElement>();
    for (const i of idx) {
      const m = this.markers[i]!;
      if (shown.has(i) && !map.hasLayer(m)) {
        m.addTo(map);
        added.add(m.getElement()!);
      } else if (!shown.has(i) && map.hasLayer(m)) m.remove();
    }
    for (const g of groups.values())
      if (!map.hasLayer(g.marker)) {
        g.marker.addTo(map);
        added.add(g.marker.getElement()!);
      }
    const flat = spots.flatMap((s) => s.list);
    // Move only the markers just added, so a focused one is never moved.
    const els = flat.map((s) => s.marker.getElement()!);
    for (let k = els.length - 2; k >= 0; k--) if (added.has(els[k]!)) els[k + 1]!.before(els[k]!);
    this.order = flat.map((s) => s.ctl);
    for (const g of groups.values())
      if (this.ring === g.key) g.ctl.setAttribute('aria-expanded', 'true');
      else g.ctl.removeAttribute('aria-expanded');

    if (had && !had.isConnected && lead >= 0) {
      const to = shown.has(lead)
        ? this.spot(lead).ctl
        : groups.get(this.groupOf.get(lead) ?? '')?.ctl;
      to?.focus({ preventScroll: true });
    }
    // A group hovered or focused that is gone highlights nothing.
    const gone = (k: string) => k.startsWith('g:') && !groups.has(k.slice(2));
    if (gone(this.hoverKey)) this.hoverKey = '';
    if (gone(this.focusKey)) this.focusKey = '';
    this.syncActive();
    this.showActive();
  }

  private spot(i: number): { marker: Leaflet.Marker; ctl: HTMLElement } {
    const marker = this.markers[i]!;
    const html = (marker.options.icon as Leaflet.DivIcon).options.html as HTMLElement;
    return { marker, ctl: html };
  }

  /** The first zoom (in zoomSnap steps, up to the maximum) at which a group's places part. */
  private splitZoom(members: number[]): number | undefined {
    const map = this.map!;
    const step = map.options.zoomSnap || 1;
    const max = map.getMaxZoom();
    for (let z = map.getZoom() + step; z <= max + 1e-9; z += step)
      if (this.cluster(members, z).length > 1) return z;
    return undefined;
  }

  /** A group chosen: zoom in until its places part, or (when they cannot) spread them in a ring. */
  private expand(key: string): void {
    const { L, map } = this;
    const g = this.groups.get(key);
    if (!L || !map || !g) return;
    if (this.ring === key) {
      this.unring();
      this.regroup();
      return;
    }
    trackEvent(this, [TAG, 'expand', this.label, g.members.length]);
    const z = this.splitZoom(g.members);
    if (z === undefined) {
      this.spread(g);
      return;
    }
    const bounds = L.latLngBounds(
      g.members.map((i) => [this.places[i]!.lat, this.places[i]!.lng] as [number, number]),
    );
    map.setView(bounds.getCenter(), z, { animate: !this.reduceMotion });
  }

  /**
   * Spread a group's places in a ring around it, far enough apart that each 44px target
   * keeps 24px from its neighbours and from the group's own marker; focus the first.
   */
  private spread(g: MapGroup): void {
    const map = this.map!;
    if (this.ring) this.unring();
    const z = map.getZoom();
    const c = map.project(g.marker.getLatLng(), z);
    const h = Math.max(...g.members.map((i) => Math.max(HIT, this.dots[i] ?? MIN_DOT)));
    const n = g.members.length;
    // Square hit areas: centres √2 × (size + gap) apart are clear in every direction.
    const r = Math.ceil(
      Math.max(
        ((h + GAP) * Math.SQRT2) / (2 * Math.sin(Math.PI / n)),
        ((Math.max(HIT, g.d) + h) / 2 + GAP) * Math.SQRT2,
      ),
    );
    g.members.forEach((i, k) => {
      const a = -Math.PI / 2 + (2 * Math.PI * k) / n;
      this.markers[i]!.setLatLng(map.unproject(c.add([r * Math.cos(a), r * Math.sin(a)]), z));
    });
    this.ring = g.key;
    this.regroup();
    const size = map.getSize();
    const pad = r + h / 2 + 8;
    const at = map.latLngToContainerPoint(g.marker.getLatLng());
    if (at.x < pad || at.y < pad || at.x > size.x - pad || at.y > size.y - pad)
      map.panTo(g.marker.getLatLng(), { animate: !this.reduceMotion });
    this.spot(g.members[0]!).ctl.focus();
  }

  /** Put a ring's places back on their own point (the next regroup hides them). */
  private unring(): void {
    const g = this.groups.get(this.ring);
    for (const i of g?.members ?? []) {
      const p = this.places[i];
      if (p) this.markers[i]?.setLatLng([p.lat, p.lng]);
    }
    this.ring = '';
  }

  /** Open on `center`/`zoom`, else on the places' bounds, else on Grounds. */
  private fit(): void {
    const { L, map } = this;
    if (!L || !map) return;
    const pts = this.places.filter(validPlace).map((p) => L.latLng(p.lat, p.lng));
    const center = parseCenter(this.center);
    const zoom = Number.isFinite(this.zoom) ? this.zoom! : undefined;
    this.fitting = true;
    try {
      if (center) map.setView(center, zoom ?? 16, { animate: false });
      else if (pts.length === 1) map.setView(pts[0]!, zoom ?? 16, { animate: false });
      else if (pts.length && zoom !== undefined)
        map.setView(L.latLngBounds(pts).getCenter(), zoom, { animate: false });
      else if (pts.length) {
        // As close as the largest marker allows; again clear of the zoom buttons (top
        // left) and the attribution (bottom right) if a marker would sit under them.
        const bounds = L.latLngBounds(pts);
        const edge = MAX_DOT / 2 + 4;
        map.fitBounds(bounds, { padding: [edge, edge], maxZoom: 17, animate: false });
        if (this.underControls(pts))
          map.fitBounds(bounds, {
            paddingTopLeft: [80, 40],
            paddingBottomRight: [40, 40],
            maxZoom: 17,
            animate: false,
          });
      } else map.setView(GROUNDS, 15, { animate: false });
    } finally {
      this.fitting = false;
    }
  }

  /** Whether any of `pts` is under (or within 12px of) the zoom buttons or the attribution. */
  private underControls(pts: Leaflet.LatLng[]): boolean {
    const map = this.map!;
    const box = map.getContainer().getBoundingClientRect();
    const rects = [
      ...map.getContainer().querySelectorAll('.leaflet-control-zoom, .leaflet-control-attribution'),
    ].map((c) => c.getBoundingClientRect());
    return pts.some((ll) => {
      const p = map.latLngToContainerPoint(ll);
      const [x, y] = [p.x + box.left, p.y + box.top];
      return rects.some(
        (r) =>
          r.width > 0 &&
          x >= r.left - 12 &&
          x <= r.right + 12 &&
          y >= r.top - 12 &&
          y <= r.bottom + 12,
      );
    });
  }

  /** The marker on the map for a target ("3" a place, "g:1,3" a group): a place's own, or its group's. */
  private markerFor(key: string): { marker: Leaflet.Marker; group?: MapGroup } | undefined {
    if (key.startsWith('g:')) {
      const g = this.groups.get(key.slice(2));
      return g && { marker: g.marker, group: g };
    }
    const i = Number(key);
    const m = this.markers[i];
    if (!m || !this.map) return undefined;
    if (this.map.hasLayer(m)) return { marker: m };
    const g = this.groups.get(this.groupOf.get(i) ?? '');
    return g && { marker: g.marker, group: g };
  }

  private hover(key: string): void {
    this.hoverKey = key;
    this.dismissed = false;
    this.syncActive();
  }

  /** The highlighted target: the one hovered, else the one focused (none after Escape). */
  private syncActive(): void {
    this.active = this.dismissed ? '' : this.hoverKey || this.focusKey;
  }

  /**
   * Highlight the active target's marker (a place inside a group highlights the group) and
   * show its tooltip: the name and count, and for a place in a group, how many share it.
   */
  private showActive(): void {
    const { map, tooltip } = this;
    if (!map || !tooltip) return;
    const prev = this.activeIcon;
    if (prev) {
      prev.marker.getElement()?.classList.remove('is-active');
      prev.marker.setZIndexOffset(prev.z);
      this.activeIcon = undefined;
    }
    const key = this.active;
    const spot = key ? this.markerFor(key) : undefined;
    const el = spot?.marker.getElement();
    if (!spot || !el) {
      tooltip.remove();
      return;
    }
    const g = spot.group;
    const own = spot.marker === this.markers[Number(key)];
    const d = own ? (this.dots[Number(key)] ?? MIN_DOT) : (g?.d ?? MIN_DOT);
    el.classList.add('is-active');
    this.activeIcon = { marker: spot.marker, z: (MAX_DOT - d) * 10 };
    spot.marker.setZIndexOffset(10000);
    const doc = this.ownerDocument;
    const content = doc.createElement('span');
    const name = doc.createElement('span');
    name.className = 'tip-name';
    content.append(name);
    if (key.startsWith('g:') && g) {
      name.textContent = this.groupName(g.members);
      if (g.counted) content.append(this.countText(g.sum));
    } else {
      const p = this.places[Number(key)]!;
      name.textContent = p.name;
      if (p.count !== undefined) content.append(this.countText(p.count));
      if (g) {
        const note = doc.createElement('span');
        note.className = 'tip-note';
        note.textContent = `One of ${fmt(g.members.length)} ${this.placeLabel || 'places'} here`;
        content.append(note);
      }
    }
    const size = Math.max(HIT, d);
    tooltip.options.offset = [0, -Math.round(size * 0.6)];
    tooltip.setLatLng(spot.marker.getLatLng()).setContent(content);
    if (!map.hasLayer(tooltip)) tooltip.addTo(map);
    else tooltip.update();
  }

  /** Bring a target's marker into view (on focus), without animation under reduced motion. */
  private reveal(key: string): void {
    const { map } = this;
    const spot = this.markerFor(key);
    if (!map || !spot) return;
    const ll = spot.marker.getLatLng();
    if (!map.getBounds().pad(-0.15).contains(ll)) map.panTo(ll, { animate: !this.reduceMotion });
  }

  /** "3" for a place's marker, "g:1,3" for a group's. */
  private keyOf(ctl: HTMLElement): string {
    return ctl.dataset.group !== undefined ? `g:${ctl.dataset.group}` : (ctl.dataset.index ?? '');
  }

  private targetOf(e: Event): string {
    const ctl = (e.target as Element | null)?.closest?.('.marker') as HTMLElement | null;
    return ctl ? this.keyOf(ctl) : '';
  }

  private onMapClick = (e: MouseEvent) => {
    const t = e.target as Element;
    if (t.closest?.('.leaflet-control-zoom a')) {
      this.queueZoomReport();
      return;
    }
    const key = this.targetOf(e);
    if (!key) return;
    // The end of a drag that started on a marker is not a choice (a key press always is).
    const drag = this.map?.dragging as unknown as { moved?: () => boolean } | undefined;
    if (e.detail !== 0 && drag?.moved?.()) {
      e.preventDefault();
      return;
    }
    if (key.startsWith('g:')) {
      this.expand(key.slice(2));
      return;
    }
    const i = Number(key);
    const p = this.places[i];
    if (!p) return;
    trackEvent(this, [TAG, 'select', this.label, i + 1]);
    const go = this.dispatchEvent(
      new CustomEvent('select', {
        detail: { item: p },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    if (!go) e.preventDefault();
  };

  /** Report the zoom level 1 s after the last zoom-button press. */
  private queueZoomReport(): void {
    clearTimeout(this.zoomTimer);
    this.zoomTimer = setTimeout(() => {
      if (this.map) trackEvent(this, [TAG, 'zoom', this.label, this.map.getZoom()]);
    }, 1000);
  }

  private onMapKeydown = (e: KeyboardEvent) => {
    const t = e.target as Element;
    // Leaflet's zoom buttons are links with role="button": Space presses them too.
    if (e.key === ' ' && t.closest?.('.leaflet-control-zoom a')) {
      e.preventDefault();
      (t.closest('a') as HTMLElement).click();
      return;
    }
    const ctl = t.closest?.('.marker') as HTMLElement | null;
    if (!ctl) return;
    // Escape in a ring (on its places or its group) closes it; focus goes to the group.
    if (e.key === 'Escape' && this.ring) {
      const key = this.keyOf(ctl);
      const g = this.groups.get(this.ring);
      if (g && (key === `g:${g.key}` || g.members.includes(Number(key)))) {
        e.preventDefault();
        e.stopPropagation();
        this.unring();
        this.regroup();
        return;
      }
    }
    const order = this.order;
    const at = order.indexOf(ctl);
    let next: HTMLElement | undefined;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = order[at + 1];
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = at > 0 ? order[at - 1] : undefined;
    else if (e.key === 'Home') next = order[0];
    else if (e.key === 'End') next = order[order.length - 1];
    else if (e.key === ' ' && t.localName === 'a') {
      // A link marker is a control here: Space chooses it, like Enter.
      e.preventDefault();
      (t as HTMLElement).click();
      return;
    } else return;
    e.preventDefault();
    e.stopPropagation();
    if (next) {
      this.reveal(this.keyOf(next));
      next.focus();
    }
  };

  private onMapFocusIn = (e: FocusEvent) => {
    const key = this.targetOf(e);
    if (!key) return;
    this.focusKey = key;
    this.dismissed = false;
    this.reveal(key);
    this.syncActive();
  };

  private onMapFocusOut = (e: FocusEvent) => {
    if (!this.targetOf(e)) return;
    const to = e.relatedTarget as Element | null;
    if (to?.closest?.('.marker')) return; // the next marker's focusin sets it
    this.focusKey = '';
    this.syncActive();
  };

  private onMapLeave = () => {
    this.hoverKey = '';
    this.syncActive();
  };

  private onPlaceEnter(i: number): void {
    this.hover(String(i));
  }

  private onPlaceLeave(): void {
    this.hoverKey = '';
    this.syncActive();
  }

  private onPlaceFocusIn(i: number): void {
    this.focusKey = String(i);
    this.dismissed = false;
    this.reveal(String(i));
    this.syncActive();
  }

  private onPlaceFocusOut(e: FocusEvent): void {
    const to = e.relatedTarget as Element | null;
    if (to?.closest?.('.place')) return;
    this.focusKey = '';
    this.syncActive();
  }

  /** The skip link: focus the list (a fragment link cannot reach into a shadow root). */
  private skipToList = (e: Event) => {
    e.preventDefault();
    this.renderRoot.querySelector<HTMLElement>(`#${this.uid}-list`)?.focus();
  };

  override render() {
    const places = this.places;
    const label = this.label.trim() || 'Places';
    // A list entry is highlighted with its place, or with its group.
    const a = this.active;
    const lit = new Set(
      a.startsWith('g:') ? a.slice(2).split(',').map(Number) : a ? [Number(a)] : [],
    );
    const listId = `${this.uid}-list`;
    const map = this.hasLeaflet
      ? html`<a class="skip-link" href="#${listId}" @click=${this.skipToList}
            >Skip map, go to the list</a
          >
          <p class="instructions" part="instructions">${MAP_INSTRUCTIONS}</p>
          <div class=${this.dark && !this.darkTileUrl ? 'frame dark-tiles' : 'frame'}>
            <div
              id="${this.uid}-map"
              class="map"
              part="map"
              role="region"
              aria-label=${`${label}, map`}
              @click=${{ handleEvent: this.onMapClick, capture: true }}
              @keydown=${this.onMapKeydown}
              @focusin=${this.onMapFocusIn}
              @focusout=${this.onMapFocusOut}
              @mouseleave=${this.onMapLeave}
            ></div>
          </div>`
      : nothing;
    return html`${map}
      <ul class="places" part="list" id=${listId} tabindex="-1" aria-label=${`${label}, list`}>
        ${places.map((p, i) => {
          const href = this.href(p);
          return html`<li
            class=${lit.has(i) ? 'place is-active' : 'place'}
            part="place"
            @mouseenter=${() => this.onPlaceEnter(i)}
            @mouseleave=${() => this.onPlaceLeave()}
            @focusin=${() => this.onPlaceFocusIn(i)}
            @focusout=${(e: FocusEvent) => this.onPlaceFocusOut(e)}
          >
            ${
              href ? html`<a href=${href}>${p.name}</a>` : html`<span class="name">${p.name}</span>`
            }
            ${
              p.count !== undefined && Number.isFinite(p.count)
                ? html`<span class="count">${this.countText(p.count)}</span>`
                : nothing
            }
            ${p.description ? html`<span class="description">${p.description}</span>` : nothing}
          </li>`;
        })}
      </ul>`;
  }
}
