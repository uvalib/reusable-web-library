import { css, html, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { trackEvent } from '../../base/analytics.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { accessible } from '../../styles/accessible.js';
import { parseRegions, toRegion, type ImageRegion } from '../uvalib-image-regions/regions.js';
import type { Compare } from './compare.js';
import {
  hrefWithParam,
  iiifIdentifier,
  paramFromLocation,
  sizedIiifUrl,
  usableImageUrl,
  usesHashParam,
  viewportIiifSize,
  type PageLocation,
} from './media.js';

/** One image in the set, in document order. */
interface Slide {
  el: HTMLAnchorElement;
  /** Deep-link id: `data-id`, else the element's id, else the IIIF identifier, else the position. */
  id: string;
  /** The href as written. */
  href: string;
  caption: string;
  alt: string;
  /** `data-details-id`, when the slide has its own details element. */
  detailsId: string | null;
  /** Regions outlined on the image (`data-regions`, or the `regions` callback). */
  regions: ImageRegion[];
  /** The page's own region list (`data-regions-list`, or the `regionsList` callback). */
  list: RegionsListElement | null;
  /** `data-image-width` / `data-image-height`: the size pixel regions are measured in. */
  imageWidth?: number;
  imageHeight?: number;
  /** `data-versions` as written, or what the `versions` callback returned (checked on use). */
  versions: string | unknown[] | null;
}

/** What the `regions` callback is given for each image. */
export interface LightboxRegionsItem {
  /** The image link. */
  element: HTMLAnchorElement;
  /** Its deep-link id. */
  id: string;
  /** Its href as written. */
  href: string;
  /** Its place in the set, from 0. */
  index: number;
}

/** Maps an image to its regions (none: an empty array, null or undefined). */
export type LightboxRegions = (
  item: LightboxRegionsItem,
) => readonly ImageRegion[] | null | undefined;

/** One version of an image: the first is the link's own `href` (which it may omit). */
export interface LightboxVersion {
  /** Its name, shown on the controls and at the end of the image's accessible name. */
  label: string;
  /** The image (http(s), relative, or a PNG, JPEG, GIF or WebP `data:` URL). */
  href?: string;
  /** Shown under the photo while this version is visible (for example how it was made). */
  note?: string;
}

/** Maps an image to its versions (none: null or undefined). */
export type LightboxVersions = (
  item: LightboxRegionsItem,
) => readonly LightboxVersion[] | null | undefined;

/** Returns the page's own region list for an image: an `<ol>` or `<ul>` of `<li data-xywh>`. */
export type LightboxRegionsList = (item: LightboxRegionsItem) => Element | null | undefined;

type RegionsListElement = HTMLOListElement | HTMLUListElement;

/** The slot (shadow mode) a page's region list is lent to while its image is open. */
const LIST_SLOT = 'uvalib-regions-list';

/** Attributes `<uvalib-image-regions>` puts on a list's entries. */
const ENTRY_MARKS = ['data-uvalib-region', 'data-uvalib-active'];

const positive = (v: string | undefined): number | undefined => {
  const n = Number(v);
  return n > 0 ? n : undefined;
};

const normalize = (s: unknown) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Kept with `no-style`: the triggers stay put, `[hidden]` hides, the dialog hugs its panel
 * (so a click outside it is the backdrop), controls are at least 44px, and the image stays
 * within the viewport. `host` is `:host` (shadow) or the tag (light DOM).
 */
const structuralRules = (host: string) => `
  ${host} { display: block; }
  ${host} .viewer { display: contents; }
  ${host} dialog {
    margin: auto;
    padding: 0;
    border: none;
    background: transparent;
    width: min(72rem, calc(100% - 2rem));
    max-height: calc(100% - 2rem);
  }
  ${host} .panel {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: calc(100dvh - 2rem);
    overflow: auto;
    overscroll-behavior: contain;
    padding: 0.75rem;
  }
  ${host} .head, ${host} .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
  ${host} .head { justify-content: space-between; }
  ${host} .caption { margin: 0; min-width: 0; overflow-wrap: anywhere; }
  ${host} .figure { margin: 0; }
  ${host} dialog img { display: block; max-width: 100%; max-height: 70dvh; width: auto; height: auto; margin: auto; }
  ${host} .count, ${host} .status { margin: 0; }
  ${host} dialog button, ${host} dialog .full {
    box-sizing: border-box;
    min-width: 44px;
    min-height: 44px;
    padding: 0.5rem 0.75rem;
    font: inherit;
  }
  ${host} .regions { display: block; }
  ${host} .stack { position: relative; width: fit-content; max-width: 100%; margin-inline: auto; }
  ${host} .details:empty { display: none; }
  ${host} > [slot="details"] { display: none; }
  ${host}[hidden], ${host} [hidden] { display: none !important; }
`;
const shadowStructure = unsafeCSS(structuralRules(':host'));

let nextCaption = 0;

/** The comparison UI, loaded the first time an open image has versions. */
let compareModule: typeof import('./compare.js') | null = null;
let compareLoading: Promise<unknown> | null = null;

/** `<uvalib-image-regions>` is loaded the first time an open image has regions. */
let regionsLoading: Promise<unknown> | null = null;
function loadRegions(): void {
  if (regionsLoading || customElements.get('uvalib-image-regions')) return;
  regionsLoading = import('../uvalib-image-regions/uvalib-image-regions.js').catch((err) => {
    regionsLoading = null;
    console.warn('uvalib-lightbox: could not load uvalib-image-regions.', err);
  });
}

/**
 * An accessible image viewer over a set of plain links. With JavaScript a primary click opens
 * a modal dialog; without it (or with a modified click) the link opens the image as before.
 * Wrap the links, or point at them with `selector` (for example `a.pb-image` on a reading
 * page). There is no autoplay and no carousel.
 *
 * The dialog is labelled by the caption (`data-caption`, else the image alt, else the link
 * text). Focus moves to Close on open and back to the trigger on close. Escape and a click on
 * the backdrop close it. With more than one image, Previous and Next and the arrow keys move
 * through the set (wrapping), and a polite “3 of 13” counter is shown. Full size opens the
 * original image in a new tab. A IIIF Image API URL keeps its region; only the size becomes
 * `!W,H` for the viewport. TIFF and JPEG2000 URLs are left as written. `url-param` (for
 * example `photo`) keeps `?photo=<id>` in sync, including on a hash route
 * (`#/text?photo=<id>`): opening pushes a history entry, stepping replaces it, and
 * Back closes.
 *
 * Optional details: children with `slot="details"` (and `data-for` equal to the item's id or
 * its position from 1; without `data-for` they show for every image), or `data-details-id` on
 * a link pointing at an element elsewhere on the page. Either is shown inside the dialog and
 * put back when the viewer moves on or closes.
 *
 * Optional regions (people, objects, inscriptions): `data-regions` on a link, a JSON array of
 * `{ label, x, y, w, h, unit? }` or `xywh` values each followed by its label, separated by
 * `;` (`percent:10,20,30,40 Person 1; percent:55,15,20,30 Sign`), or the `regions` callback.
 * The open image then shows numbered outlines (`<uvalib-image-regions>`, loaded on first use)
 * and a list of the regions beside it, with a "Show regions" toggle (`aria-pressed`) that
 * hides the outlines. Pixel regions are measured in `data-image-width` × `data-image-height`
 * when set (the viewer shows a resized IIIF image), else in the image's natural size.
 *
 * Or the page's own list, with its own buttons: `data-regions-list="<id>"` on a link (or the
 * `regionsList` callback) names an `<ol>` or `<ul>` of `<li data-xywh>` anywhere in the page,
 * usually `hidden`. While that image is open the list (the same nodes, so the page's listeners
 * keep working) is the region list: in shadow mode it becomes a child of the lightbox slotted
 * into the viewer, not moved into the shadow root, so the page's CSS still applies to it. When
 * the image changes or the viewer closes it goes back where it was, `hidden` as before. It wins
 * over `data-regions`.
 *
 * Optional versions of an image (an original scan and an AI colorization, a restoration, an
 * infrared capture): `data-versions` on a link, a JSON array of `{ label, href?, note? }`
 * whose first entry is the link's own image, or the `versions` callback. The viewer then
 * compares them over the photo (loaded on first use): Switch (a segmented control), Reveal
 * (a divider: click or tap the photo, or use the slider) or Fade (a slider), `compare`
 * choosing the first. A version's `note` shows under the photo while it is visible, and
 * the image's accessible name ends with the label of the version shown. `version-param`
 * (with `url-param`) keeps the comparison in the address: `?version=2` (Switch, the version
 * from 0), `?version=wipe:40` or `?version=fade:60` (the percentage of the other version
 * shown; `wipe:40:2` compares the original with version 2). A version with a different
 * framing (an AI-expanded frame, a crop, the whole plate) gives `frame`, the original's box
 * in it (`percent:x,y,w,h`, or pixels of its `width` × `height`): the viewer draws every
 * version at the original's scale in one box, the original lined up, and regions stay on it.
 *
 * @tagname uvalib-lightbox
 * @slot - The image links. A plain click opens the viewer; without JavaScript they open the image.
 * @slot details - Details for the open image. `data-for` selects one item by its id or position (from 1); without it the details show for every image.
 * @csspart dialog - The modal dialog.
 * @csspart panel - The surface inside the dialog.
 * @csspart caption - The caption that names the dialog.
 * @csspart image - The image.
 * @csspart controls - Previous, Next, the counter and Full size.
 * @csspart details - The details panel.
 * @csspart regions - The `<uvalib-image-regions>` around an image with regions.
 * @csspart compare - The version comparison controls and notes under the photo.
 * @fires uvalib-lightbox-version - The visitor changed the comparison (mode, version or position; once a slider settles): `detail` is `{ id, mode, index, value }` (`mode` `switch`, `wipe` or `fade`; `index` the version shown or compared, from 0; `value` the percentage of it shown, null for Switch). Not fired on open or for a comparison restored from the URL. Bubbles and is composed.
 * @fires uvalib-analytics-event - For `<site-analytics>`: `['uvalib-lightbox', 'open'|'next'|'previous'|'full-size', 'image N', N]` (N from 1, the image's place in the set), and `['uvalib-lightbox', 'compare', 'switch'|'wipe'|'fade', N]` when the visitor changes a comparison (N the version's place from 1; once a slider settles). Never the URL, the caption or a version's label. Not fired for a viewer restored from the URL or from Back and Forward. Bubbles and is composed.
 * @cssprop --uva-color-surface-raised - Dark-mode role token: dialog surface (else `--uva-color-surface`, else #fff).
 * @cssprop --uva-color-surface - Dark-mode role token: the figure behind the image (else #fff).
 * @cssprop --uva-color-text - Dark-mode role token: text (else `--uva-grey-darkest`).
 * @cssprop --uva-color-shadow - Dark-mode role token: the backdrop scrim (else rgba(16, 23, 43, 0.72)).
 * @cssprop --uva-color-border - Dark-mode role token: dialog border (else `--uva-grey-100`).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 * @cssprop --uva-color-link - Dark-mode role token: Full size text when it is not the filled control (else `--uva-brand-blue`).
 * @cssprop --uva-color-accent-bg - Dark-mode role token: Close and Full size background (else `--uva-brand-blue`).
 * @cssprop --uva-color-on-accent - Text on those controls (else #fff).
 * @cssprop [--uva-brand-orange=#e57200] - Focus ring when `--uva-color-focus` is unset.
 * @cssprop [--uva-brand-blue=#232d4b] - Control background when `--uva-color-accent-bg` is unset.
 * @cssprop [--uva-grey-darkest=#2b2b2b] - Text when `--uva-color-text` is unset.
 * @cssprop [--uva-grey-100=#dadada] - Border when `--uva-color-border` is unset.
 */
export class UvalibLightbox extends UvalibElement {
  static styles = [
    accessible,
    shadowStructure,
    css`
      .panel {
        background: var(--uva-color-surface-raised, var(--uva-color-surface, #fff));
        color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
        border: 1px solid var(--uva-color-border, var(--uva-grey-100, #dadada));
      }
      dialog::backdrop {
        background: var(--uva-color-shadow, rgba(16, 23, 43, 0.72));
      }
      .details a {
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
      }
      .figure {
        background: var(--uva-color-surface, #fff);
      }
      .caption {
        font-size: 1.125rem;
        line-height: 1.4;
        font-weight: 600;
      }
      .count {
        font-variant-numeric: tabular-nums;
      }
      dialog button,
      dialog .full {
        padding: 0.5rem 0.75rem;
        border: 2px solid transparent;
        text-decoration: none;
        cursor: pointer;
        color: var(--uva-color-on-accent, #fff);
        background: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
      }
      dialog button:focus-visible,
      dialog .full:focus-visible {
        outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
        outline-offset: 2px;
      }
      dialog button.prev,
      dialog button.next,
      dialog button.regions-toggle {
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
        background: var(--uva-color-surface, #fff);
        border-color: var(--uva-color-border, var(--uva-grey-100, #dadada));
      }
      .status {
        font-size: 1rem;
      }
      /* Pressed shows a check mark, so the state is not shown by colour alone. */
      button.regions-toggle {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }
      button.regions-toggle::before {
        content: '';
        box-sizing: border-box;
        width: 1rem;
        height: 1rem;
        border: 2px solid currentColor;
      }
      button.regions-toggle[aria-pressed='true']::before {
        border-width: 0 3px 3px 0;
        width: 0.5rem;
        margin-inline: 0.25rem;
        transform: translateY(-0.125rem) rotate(45deg);
      }
      @media (prefers-reduced-motion: no-preference) {
        .panel {
          animation: uvalib-lightbox-in 0.15s ease;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        dialog,
        dialog * {
          animation: none !important;
          transition: none !important;
          scroll-behavior: auto !important;
        }
      }
      @media (forced-colors: active) {
        .panel,
        dialog button,
        dialog .full {
          border: 1px solid CanvasText;
        }
      }
      @keyframes uvalib-lightbox-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `,
  ];

  /**
   * CSS selector for image links elsewhere in this root (the page, or the shadow root the
   * component sits in). Combined with any links inside the component. Example: `a.pb-image`.
   */
  @property({ type: String }) selector = '';

  /**
   * Query parameter kept in sync with the open image, for example `photo` → `?photo=<id>`.
   * The id is the link's `data-id`, else its `id`, else the IIIF identifier, else its position
   * from 1. On a hash route the parameter is written inside the hash. Empty: no deep link.
   */
  @property({ attribute: 'url-param' }) urlParam = '';

  /**
   * Regions for each image, instead of (or as well as) `data-regions`: called with
   * `{ element, id, href, index }`, it returns region objects (`{ label, x, y, w, h, unit? }`).
   * An image with regions shows their outlines over it, a list of them beside it, and a
   * "Show regions" toggle.
   */
  @property({ attribute: false }) regions?: LightboxRegions;

  /**
   * The page's own region list for each image, instead of `data-regions-list`: called with
   * `{ element, id, href, index }`, it returns an `<ol>` or `<ul>` of `<li data-xywh>` (or
   * null). While the image is open the list is shown as its region list, with the page's own
   * buttons and listeners; it is put back where it was when the image changes or the viewer
   * closes.
   */
  @property({ attribute: false }) regionsList?: LightboxRegionsList;

  /** The heading of the regions list (for example `People`). */
  @property({ attribute: 'regions-label' }) regionsLabel = 'Regions';

  /**
   * Versions of each image, instead of `data-versions`: called with
   * `{ element, id, href, index }`, it returns `{ label, href?, note? }` objects, the first
   * being the link's own image (null: none).
   */
  @property({ attribute: false }) versions?: LightboxVersions;

  /**
   * How an image's versions are compared first: `switch` (default: one at a time, any number
   * of versions), `wipe` (a divider over the photo) or `fade` (a cross-fade). The viewer
   * offers the others.
   */
  @property() compare: 'switch' | 'wipe' | 'fade' = 'switch';

  /**
   * Query parameter for the comparison (with `url-param`), for example `version`:
   * `?version=1`, `?version=wipe:40`, `?version=fade:60`. Written with replaceState once the
   * visitor's change settles; read when the viewer opens from the address.
   */
  @property({ attribute: 'version-param' }) versionParam = '';

  @state() private slides: Slide[] = [];
  @state() private index = 0;
  @state() private open = false;
  @state() private status: 'loading' | 'ready' | 'error' = 'loading';
  @state() private fitW = 0;
  @state() private fitH = 0;
  /** The "Show regions" toggle: outlines over an image that has regions. */
  @state() private showRegions = true;

  private readonly captionId = `uvalib-lightbox-caption-${++nextCaption}`;
  /** Where the dialog is rendered. Light DOM renders here so the author's links stay put. */
  private mount?: HTMLElement;
  private trigger: HTMLAnchorElement | null = null;
  /** The open image pushed a history entry, so Back (and Close) returns to the page. */
  private historyPushed = false;
  /** The visitor closed the viewer; a later mutation must not reopen it from the URL. */
  private userClosed = false;
  /** Disconnect (and the dialog it closes) is not a visitor action, so it must not touch history. */
  private suppressClose = false;
  private warnedSelector = false;
  private lastSrc = '';
  private observer?: MutationObserver;
  private syncQueued = false;
  private regionsChanged = false;
  private resizeTimer = 0;
  /** A close event from the dialog we just shut must not dismiss the next open. */
  private ignoreClose = false;
  private dismissing = false;
  private revealTries = 0;
  private revealFrame = 0;
  private listened = false;
  /** The root `listen` bound, so disconnect can remove the listener after leaving a shadow root. */
  private listenRoot?: Document | ShadowRoot;
  /**
   * `dialog.close()` removes `open` now and fires `close` on a later task. The attribute
   * observer runs as a microtask, which is what a caller sees after `await updateComplete`.
   */
  private dialogObserver?: MutationObserver;
  private observedDialog?: HTMLDialogElement;
  /** `history.back()` from Close has not fired `popstate` yet. */
  private pendingBack = false;
  /** Whether that entry kept the parameter in the hash. The pop leaves a hash that may not say so. */
  private backInHash = false;
  /** An image chosen while that Back is still in flight, opened once the popstate arrives. */
  private queuedOpen: { i: number; slides: Slide[] } | null = null;
  /**
   * Set while a history traversal is opening the dialog. The traversal can close the
   * dialog it just showed; that close is not the visitor, so show it again.
   */
  private reopenGuard = false;
  /** Details elements moved into the dialog, and where they go back to. */
  private parked: { el: HTMLElement; parent: Node; next: ChildNode | null; hidden: boolean }[] = [];
  private parkedKey = '';
  /** The page's region list lent to the viewer, and how to give it back as it was. */
  private lent: {
    el: RegionsListElement;
    parent: Node;
    next: ChildNode | null;
    hidden: boolean;
    slot: string | null;
  } | null = null;
  /** Each entry's own `tabindex` (null: none), so one the viewer added is removed. */
  private entryTabindex = new WeakMap<Element, string | null>();
  private warnedList = false;
  private refocus = false;
  /** The comparison controller, once its module has loaded. */
  private cmp?: Compare;
  /** The comparison from the address, for the image opened from it. */
  private pendingVersion: string | null = null;

  /** Shadow mode follows the base class. Light mode renders into `.viewer`. */
  private get isLight(): boolean {
    return this.noShadowDom || this.hasAttribute('no-shadow-dom');
  }

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    if (!this.isLight) {
      const root = super.createRenderRoot();
      if (this.noStyle && root instanceof ShadowRoot) {
        const sheets = [accessible.styleSheet, shadowStructure.styleSheet].filter(
          (sheet): sheet is CSSStyleSheet => sheet != null,
        );
        root.adoptedStyleSheets = sheets;
      }
      return root;
    }
    const mount = this.ownerDocument.createElement('div');
    mount.className = 'viewer';
    this.mount = mount;
    this.append(mount);
    return mount;
  }

  override connectedCallback(): void {
    const light = this.isLight;
    super.connectedCallback();
    // A move in the DOM disconnects and reconnects. The disconnect guard must not stick,
    // or Escape would close the dialog and leave the viewer thinking it is still open.
    this.suppressClose = false;
    if (light) this.installLight(light);
    this.listen();
    this.slides = this.collect();
    this.watch();
    this.openFromUrl();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unlisten();
    this.observer?.disconnect();
    this.dialogObserver?.disconnect();
    this.dialogObserver = undefined;
    this.observedDialog = undefined;
    window.clearTimeout(this.resizeTimer);
    this.cancelReveal();
    this.restoreDetails();
    this.pendingBack = false;
    this.queuedOpen = null;
    this.reopenGuard = false;
    // Closing the dialog here fires `close` synchronously. That is not the visitor dismissing
    // it: do not run history.back(), which could leave the page. `open` goes false so a later
    // connect can open again from the URL.
    this.suppressClose = true;
    this.open = false;
    const dialog = this.dialogEl;
    if (dialog?.open) dialog.close();
    this.suppressClose = false;
    this.ignoreClose = false;
  }

  protected override willUpdate(): void {
    this.lendList();
    if (!this.open) {
      this.lastSrc = '';
      return;
    }
    const slide = this.current;
    if (this.cmp && slide) {
      this.cmp.sync(slide, this.index, this.pendingVersion);
      this.pendingVersion = null;
    }
    const src = this.displaySrc;
    if (src !== this.lastSrc) {
      this.lastSrc = src;
      this.status = src ? 'loading' : 'error';
    } else if (!src && this.status !== 'error') {
      // A refused URL (javascript:) has an empty src. On the first open `lastSrc` is already
      // empty, so the change above does not run, and the status would stay "loading".
      this.status = 'error';
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (changed.has('selector')) this.watch();
    if (
      (changed.has('regions') || changed.has('regionsList') || changed.has('versions')) &&
      this.isConnected
    )
      this.scheduleSync(true);
    if (!this.open) {
      if (changed.has('open')) this.restoreDetails();
      return;
    }
    if (changed.has('open') || changed.has('index') || changed.has('slides')) this.placeDetails();
    if (this.current?.regions.length || this.current?.list) loadRegions();
    if (this.current?.versions) this.loadCompare();
    this.lendList(true);
    if (this.refocus) {
      this.refocus = false;
      this.closeBtn?.focus();
    }
    this.bindDialogObserver();
    if (changed.has('open')) this.reveal();
    // Reading the image and writing `status` from inside `updated` makes Lit warn and schedule
    // a nested update. A microtask is still before the next paint.
    queueMicrotask(() => {
      if (this.isConnected) this.settleImage();
    });
  }

  private installLight(light: boolean): void {
    if (!light) return;
    const node = this.getRootNode();
    const root = node instanceof Document || node instanceof ShadowRoot ? node : undefined;
    if (this.noStyle) {
      installLightDomStyles(
        `${this.localName}::structure`,
        unsafeCSS(structuralRules(this.localName)),
        { root, scope: false },
      );
      installLightDomStyles(`${this.localName}::a11y`, accessible, { root });
      return;
    }
    installLightDomStyles(
      this.localName,
      (this.constructor as typeof UvalibElement).elementStyles,
      {
        root,
      },
    );
  }

  private get scope(): Document | ShadowRoot {
    const root = this.getRootNode();
    return root instanceof Document || root instanceof ShadowRoot ? root : this.ownerDocument;
  }

  private get base(): string {
    return this.ownerDocument.baseURI || location.href;
  }

  private loc(): PageLocation {
    return { pathname: location.pathname, search: location.search, hash: location.hash };
  }

  private listen(): void {
    if (this.listened) return;
    this.listened = true;
    this.listenRoot = this.scope;
    this.listenRoot.addEventListener('click', this.onClick, true);
    window.addEventListener('popstate', this.onPop);
    window.addEventListener('resize', this.onResize);
  }

  private unlisten(): void {
    if (!this.listened) return;
    this.listened = false;
    this.listenRoot?.removeEventListener('click', this.onClick, true);
    this.listenRoot = undefined;
    window.removeEventListener('popstate', this.onPop);
    window.removeEventListener('resize', this.onResize);
  }

  private watch(): void {
    this.observer?.disconnect();
    this.observer = new MutationObserver(() => this.scheduleSync());
    this.observer.observe(this, {
      attributes: true,
      attributeFilter: [
        'href',
        'id',
        'alt',
        'title',
        'data-caption',
        'data-id',
        'data-details-id',
        'data-regions',
        'data-regions-list',
        'data-versions',
        'data-image-width',
        'data-image-height',
        'slot',
      ],
      childList: true,
      subtree: true,
    });
    if (this.selector) this.observer.observe(this.scope, { childList: true, subtree: true });
  }

  /** Ignore mutations inside the viewer (the dialog, parked details) so a render cannot loop. */
  private scheduleSync(force = false): void {
    if (force) this.regionsChanged = true;
    if (this.syncQueued) return;
    this.syncQueued = true;
    queueMicrotask(() => {
      this.syncQueued = false;
      if (!this.isConnected) return;
      const next = this.collect();
      const forced = this.regionsChanged;
      this.regionsChanged = false;
      const same =
        !forced &&
        next.length === this.slides.length &&
        next.every(
          (s, i) =>
            s.el === this.slides[i]?.el &&
            s.href === this.slides[i]?.href &&
            s.id === this.slides[i]?.id &&
            s.caption === this.slides[i]?.caption &&
            s.detailsId === this.slides[i]?.detailsId &&
            s.list === this.slides[i]?.list &&
            JSON.stringify([s.regions, s.imageWidth, s.imageHeight, s.versions]) ===
              JSON.stringify([
                this.slides[i]?.regions,
                this.slides[i]?.imageWidth,
                this.slides[i]?.imageHeight,
                this.slides[i]?.versions,
              ]),
        );
      this.noteEntries();
      if (!same) {
        const current = this.current?.el;
        this.slides = next;
        if (this.open) {
          const at = current ? next.findIndex((s) => s.el === current) : -1;
          if (at >= 0) this.index = at;
          else if (!next.length) this.dismiss('empty');
          else this.index = Math.min(this.index, next.length - 1);
        }
      }
      if (!this.open) this.openFromUrl();
    });
  }

  private collect(): Slide[] {
    const found: HTMLAnchorElement[] = [];
    const detailRoots = new Set<Element>();
    const noteDetails = (a: Element) => {
      if (!(a instanceof HTMLAnchorElement)) return;
      const id = a.getAttribute('data-details-id');
      if (!id) return;
      const el = this.scope.getElementById(id);
      if (el) detailRoots.add(el);
    };
    const candidates: Element[] = [...this.querySelectorAll('a[href]')];
    if (this.selector) {
      try {
        candidates.push(...this.scope.querySelectorAll(this.selector));
      } catch {
        if (!this.warnedSelector) {
          this.warnedSelector = true;
          console.warn(
            `${this.localName}: selector ${JSON.stringify(this.selector)} is not a valid CSS selector.`,
          );
        }
      }
    }
    for (const a of candidates) noteDetails(a);
    const push = (a: Element) => {
      if (!(a instanceof HTMLAnchorElement) || !a.hasAttribute('href')) return;
      if (a.closest('[hidden]')) return;
      if (this.mount?.contains(a) || a.closest('dialog')) return;
      if (a.closest('[slot="details"]')) return;
      // Links in a page's region list are its actions, not images (and it may be lent here).
      if (this.lent?.el.contains(a)) return;
      for (const root of detailRoots) {
        if (root.contains(a)) return;
      }
      const owner = a.closest('uvalib-lightbox');
      if (owner && owner !== this) return;
      found.push(a);
    };
    for (const a of candidates) push(a);
    const unique = [...new Set(found)];
    unique.sort((a, b) => {
      if (a === b) return 0;
      const pos = a.compareDocumentPosition(b);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
    return unique.map((el, i) => this.slide(el, i));
  }

  private slide(el: HTMLAnchorElement, index: number): Slide {
    const href = el.getAttribute('href') ?? '';
    const img = el.querySelector('img');
    const alt = normalize(img?.getAttribute('data-uvalib-alt') || img?.getAttribute('alt'));
    const text = this.linkText(el);
    const caption =
      normalize(el.dataset.caption) ||
      alt ||
      text ||
      normalize(el.getAttribute('title')) ||
      'Image';
    const id =
      normalize(el.dataset.id) || el.id || iiifIdentifier(href, this.base) || String(index + 1);
    const list = this.listOf(el, id, href, index);
    const regions = this.regionsOf(el, id, href, index);
    if (list && regions.length && !this.warnedList) {
      this.warnedList = true;
      console.warn(
        `${this.localName}: an image has both regions and a regions list; the list is used.`,
      );
    }
    return {
      el,
      id,
      href,
      caption,
      alt: alt || caption,
      detailsId: normalize(el.dataset.detailsId) || null,
      regions: list ? [] : regions,
      list,
      imageWidth: positive(el.dataset.imageWidth),
      imageHeight: positive(el.dataset.imageHeight),
      versions: this.versionsOf(el, id, href, index),
    };
  }

  /** `data-versions` (checked by the comparison module), else the `versions` callback's list. */
  private versionsOf(el: HTMLAnchorElement, id: string, href: string, index: number) {
    const raw = el.dataset.versions?.trim();
    if (raw) return raw;
    if (typeof this.versions !== 'function') return null;
    try {
      const list = this.versions({ element: el, id, href, index });
      return Array.isArray(list) && list.length ? [...list] : null;
    } catch (err) {
      console.warn(`${this.localName}: the versions callback threw.`, err);
      return null;
    }
  }

  /** Load the comparison module (once per page), then make this viewer's controller. */
  private loadCompare(): void {
    if (this.cmp) return;
    if (compareModule) {
      this.cmp = new compareModule.Compare(this.compareHost());
      this.requestUpdate();
      return;
    }
    compareLoading ??= import('./compare.js')
      .then((m) => {
        compareModule = m;
      })
      .catch((err) => {
        compareLoading = null;
        console.warn('uvalib-lightbox: could not load the version comparison.', err);
      });
    void compareLoading.then(() => {
      if (compareModule && this.isConnected) this.loadCompare();
    });
  }

  /** What the comparison module may use of this viewer. */
  private compareHost() {
    return {
      el: this as HTMLElement,
      light: this.isLight,
      root: this.isLight ? this.scope : this.renderRoot,
      noStyle: this.noStyle,
      mode: () => this.compare,
      size: (href: string) => this.sized(href),
      write: (value: string | null) => {
        if (this.versionParam && this.open)
          this.writeParam(this.current?.id ?? null, 'replace', undefined, value);
      },
      update: () => this.requestUpdate(),
    };
  }
  /** `data-regions`, then whatever the `regions` callback adds. */
  private regionsOf(el: HTMLAnchorElement, id: string, href: string, index: number) {
    const found = parseRegions(el.dataset.regions);
    if (typeof this.regions === 'function') {
      let more: unknown;
      try {
        more = this.regions({ element: el, id, href, index });
      } catch (err) {
        console.warn(`${this.localName}: the regions callback threw.`, err);
      }
      if (Array.isArray(more))
        for (const r of more) {
          const region = toRegion(r);
          if (region) found.push(region);
        }
    }
    return found;
  }

  /** `data-regions-list` (an id in this root), else the `regionsList` callback's element. */
  private listOf(
    el: HTMLAnchorElement,
    id: string,
    href: string,
    index: number,
  ): RegionsListElement | null {
    let found: unknown = null;
    const ref = normalize(el.dataset.regionsList);
    if (ref) found = this.scope.getElementById(ref);
    else if (typeof this.regionsList === 'function') {
      try {
        found = this.regionsList({ element: el, id, href, index });
      } catch (err) {
        console.warn(`${this.localName}: the regionsList callback threw.`, err);
      }
    }
    if (!(found instanceof HTMLOListElement || found instanceof HTMLUListElement)) return null;
    // Not one that holds the viewer or the image link itself.
    return found.contains(this) || found.contains(el) ? null : found;
  }

  /** The link's own text, not the alt of its image and not a details subtree. */
  private linkText(el: HTMLAnchorElement): string {
    const parts: string[] = [];
    const walk = (n: Node) => {
      if (n instanceof HTMLImageElement) return;
      if (
        n instanceof HTMLElement &&
        (n.hidden ||
          n.getAttribute('slot') === 'details' ||
          n.getAttribute('slot') === 'badge' ||
          n.classList.contains('badge') ||
          n.classList.contains('visually-hidden') ||
          n.hasAttribute('data-uvalib-generated-badge') ||
          n.hasAttribute('data-uvalib-badge-sep'))
      )
        return;
      if (n.nodeType === Node.TEXT_NODE) {
        parts.push(n.textContent ?? '');
        return;
      }
      n.childNodes.forEach(walk);
    };
    el.childNodes.forEach(walk);
    return normalize(parts.join(' '));
  }

  private get current(): Slide | undefined {
    return this.slides[this.index];
  }

  private get multiple(): boolean {
    return this.slides.length > 1;
  }

  /** The URL the `<img>` should load: a viewport-sized IIIF request, or the href itself. */
  private get displaySrc(): string {
    return this.sized(this.current?.href ?? '');
  }

  private sized(href: string): string {
    if (!usableImageUrl(href, this.base)) return '';
    const w = this.fitW || viewportIiifSize(window).w;
    const h = this.fitH || viewportIiifSize(window).h;
    return sizedIiifUrl(href, this.base, w, h) ?? href;
  }

  private measure(): void {
    const { w, h } = viewportIiifSize(window);
    if (w !== this.fitW) this.fitW = w;
    if (h !== this.fitH) this.fitH = h;
  }

  private readonly onResize = (): void => {
    if (!this.open) return;
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      if (this.isConnected && this.open) this.measure();
    }, 150);
  };

  private readonly onClick = (e: Event): void => {
    if (
      !(e instanceof MouseEvent) ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    )
      return;
    const link = this.linkFrom(e);
    if (!link) return;
    const slides = this.collect();
    const i = slides.findIndex((s) => s.el === link);
    if (i < 0) return;
    e.preventDefault();
    this.activate(i, slides);
  };

  private linkFrom(e: Event): HTMLAnchorElement | null {
    for (const n of e.composedPath()) {
      if (n instanceof HTMLAnchorElement) return n;
    }
    const t = e.target;
    return t instanceof Element ? t.closest('a[href]') : null;
  }

  /** A visitor chose `slides[i]`. The first open pushes a history entry; a later choice replaces it. */
  private activate(i: number, slides: Slide[]): void {
    const already = this.open;
    if (already && this.index === i) return;
    this.slides = slides;
    this.index = i;
    this.trigger = slides[i]?.el ?? null;
    this.userClosed = false;
    this.pendingVersion = null;
    this.cmp?.reset();
    this.measure();
    this.open = true;
    if (this.pendingBack) {
      // Close already asked for history.back(). Writing now would push on the entry that
      // popstate is about to remove, and that pop would shut the viewer again.
      this.queuedOpen = { i, slides };
    } else if (this.urlParam) {
      const id = slides[i]?.id ?? null;
      const hashMode = usesHashParam(location.hash);
      if (already) this.writeParam(id, 'replace', hashMode);
      else {
        // The address can already carry this param (a leftover entry). Replace it away
        // on the current entry, then push, so Back still closes onto this page. Both
        // writes share hashMode: stripping `?photo` from `#chapter?photo=1` leaves
        // `#chapter`, which would otherwise fall out of the hash.
        if (paramFromLocation(this.loc(), this.urlParam))
          this.writeParam(null, 'replace', hashMode);
        this.historyPushed = this.writeParam(id, 'push', hashMode);
      }
    }
    trackEvent(this, ['uvalib-lightbox', 'open', `image ${i + 1}`, i + 1]);
  }

  /** Restore a viewer the URL already points at. No analytics: it is not a new action. */
  private openFromUrl(): void {
    if (this.open || this.userClosed || !this.urlParam) return;
    const id = paramFromLocation(this.loc(), this.urlParam);
    if (!id) return;
    const slides = this.slides.length ? this.slides : this.collect();
    const i = slides.findIndex((s) => s.id === id);
    if (i < 0) return;
    this.slides = slides;
    this.index = i;
    this.trigger = slides[i]?.el ?? null;
    this.measure();
    const version = this.versionFromUrl();
    this.pendingVersion = version;
    // Make Back close the viewer onto this page instead of leaving it. Remember the hash
    // route before the first write removes the `?` that marked it.
    const hashMode = usesHashParam(location.hash);
    this.writeParam(null, 'replace', hashMode);
    this.historyPushed = this.writeParam(id, 'push', hashMode, version);
    this.open = true;
  }

  private versionFromUrl(): string | null {
    return this.versionParam ? paramFromLocation(this.loc(), this.versionParam) : null;
  }

  private step(delta: number): void {
    const n = this.slides.length;
    if (n < 2) return;
    const i = (this.index + delta + n) % n;
    this.index = i;
    this.pendingVersion = null;
    this.trigger = this.slides[i]?.el ?? this.trigger;
    if (this.urlParam) this.writeParam(this.slides[i]?.id ?? null, 'replace');
    const action = delta < 0 ? 'previous' : 'next';
    trackEvent(this, ['uvalib-lightbox', action, `image ${i + 1}`, i + 1]);
  }

  /**
   * Close. `ui` is Close, Escape or the backdrop (Back when this viewer pushed, else drop the
   * param). `pop` is the browser already moving: the URL is already right. `empty` is the
   * last image leaving the page: drop the param and do not reopen from it.
   */
  private dismiss(source: 'ui' | 'pop' | 'empty'): void {
    if (this.dismissing) return;
    const dialog = this.dialogEl;
    if (!this.open && !dialog?.open) return;
    this.dismissing = true;
    this.cmp?.reset();
    try {
      const pushed = this.historyPushed;
      this.historyPushed = false;
      this.ignoreClose = true;
      this.cancelReveal();
      this.open = false;
      if (source === 'ui' || source === 'empty') this.userClosed = true;
      this.restoreDetails();
      if (dialog?.open) dialog.close();
      this.focusTrigger();
      if (source === 'ui' && this.urlParam) {
        if (pushed) {
          this.backInHash = usesHashParam(location.hash);
          this.pendingBack = true;
          history.back();
        } else this.writeParam(null, 'replace', usesHashParam(location.hash));
      } else if (source === 'empty' && this.urlParam) {
        this.pendingBack = false;
        this.queuedOpen = null;
        this.writeParam(null, 'replace', usesHashParam(location.hash));
      }
    } finally {
      // Leave `ignoreClose` set. `dialog.close()` can queue a second close event for the
      // next task; clearing the guard here lets that event dismiss a viewer that has
      // already been opened again. `reveal` clears it once `showModal` has succeeded, which
      // is still before a later Escape. A throw while restoring details must not leave the
      // viewer stuck dismissing.
      this.dismissing = false;
    }
  }

  /**
   * Returns false when this document cannot change the address (for example an iframe
   * srcdoc). `version` is the comparison (`version-param`), dropped with the image.
   */
  private writeParam(
    id: string | null,
    mode: 'push' | 'replace',
    hashMode?: boolean,
    version: string | null = null,
  ): boolean {
    if (!this.urlParam) return false;
    const loc = this.loc();
    let next = hrefWithParam(loc, this.urlParam, id, hashMode);
    const vp = this.versionParam;
    if (vp && vp !== this.urlParam) {
      // The path is unchanged; a search string never contains `#`.
      const rest = next.slice(loc.pathname.length);
      const h = rest.indexOf('#');
      const at = {
        pathname: loc.pathname,
        search: h < 0 ? rest : rest.slice(0, h),
        hash: h < 0 ? '' : rest.slice(h),
      };
      next = hrefWithParam(at, vp, id === null ? null : version, hashMode);
    }
    const now = location.pathname + location.search + location.hash;
    if (next === now) return false;
    const prev = history.state && typeof history.state === 'object' ? history.state : {};
    try {
      history[mode === 'push' ? 'pushState' : 'replaceState'](
        { ...prev, uvalibLightbox: this.urlParam },
        '',
        next,
      );
      return true;
    } catch {
      // A sandboxed document (an iframe srcdoc) cannot take a history entry. The viewer
      // still opens; the address is left as it is.
      return false;
    }
  }

  private readonly onPop = (): void => {
    if (!this.urlParam) return;
    if (this.pendingBack) {
      this.pendingBack = false;
      const queued = this.queuedOpen;
      this.queuedOpen = null;
      if (!this.isConnected || !queued) return;
      this.slides = queued.slides;
      this.index = queued.i;
      this.trigger = queued.slides[queued.i]?.el ?? null;
      this.userClosed = false;
      this.measure();
      const id = queued.slides[queued.i]?.id ?? null;
      this.historyPushed = this.writeParam(id, 'push', this.backInHash);
      if (!this.open) this.open = true;
      return;
    }
    const id = paramFromLocation(this.loc(), this.urlParam);
    if (!id) {
      this.historyPushed = false;
      if (this.open) this.dismiss('pop');
      return;
    }
    this.userClosed = false;
    const slides = this.collect();
    const i = slides.findIndex((s) => s.id === id);
    if (i < 0) {
      if (this.open) this.dismiss('pop');
      return;
    }
    this.pendingVersion = this.versionFromUrl();
    this.slides = slides;
    this.index = i;
    this.trigger = slides[i]?.el ?? null;
    this.historyPushed = true;
    this.measure();
    this.armReopenGuard();
    if (!this.open) this.open = true;
  };

  /** Ignore the close event a history traversal fires on the dialog it just opened. */
  private armReopenGuard(): void {
    this.reopenGuard = true;
    const view = this.ownerDocument.defaultView;
    if (!view) return;
    view.requestAnimationFrame(() => {
      this.reopenGuard = false;
    });
  }

  private readonly onKey = (e: KeyboardEvent): void => {
    if (this.typing(e)) return;
    if (this.cmp?.key(e) || !this.multiple || e.type !== 'keydown') return;
    // Left is previous in LTR and next in RTL, so the key matches the direction of the set.
    const rtl = getComputedStyle(this).direction === 'rtl';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    if (e.key !== back && e.key !== forward) return;
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    this.step(e.key === forward ? 1 : -1);
  };

  private typing(e: KeyboardEvent): boolean {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return false;
    return t.isContentEditable || !!t.closest('input, textarea, select');
  }

  private readonly onDialogClick = (e: MouseEvent): void => {
    // A drag over the photo that ends on the backdrop is not a click on it.
    if (e.target === this.dialogEl && !this.cmp?.dragged()) this.dismiss('ui');
  };

  private readonly onStack = (e: PointerEvent): void => {
    this.cmp?.pointer(e);
  };

  /** The dialog element is stable across renders. Watch `open` on whichever node is current. */
  private bindDialogObserver(): void {
    const dialog = this.dialogEl;
    if (!dialog || dialog === this.observedDialog) return;
    this.dialogObserver?.disconnect();
    this.observedDialog = dialog;
    const observer = new MutationObserver(() => this.onNativeClose());
    observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    this.dialogObserver = observer;
  }

  private readonly onDialogClose = (): void => {
    this.onNativeClose();
  };

  /**
   * Escape, the backdrop's close, and a direct `dialog.close()` all clear `open`. The
   * event itself is a later task; the attribute change is observable on the microtask
   * that `await updateComplete` flushes. A close that leaves the dialog open (a queued
   * event after `showModal`, or a history traversal) is not the visitor dismissing it.
   */
  private onNativeClose(): void {
    if (this.ignoreClose || this.suppressClose || !this.open) return;
    if (this.dialogEl?.open) return;
    if (this.reopenGuard) {
      const view = this.ownerDocument.defaultView;
      view?.queueMicrotask(() => {
        if (this.open && this.isConnected && !this.dialogEl?.open) this.reveal();
      });
      return;
    }
    this.dismiss('ui');
  }

  private readonly onFullSize = (): void => {
    const i = this.index;
    trackEvent(this, ['uvalib-lightbox', 'full-size', `image ${i + 1}`, i + 1]);
  };

  private get dialogEl(): HTMLDialogElement | null {
    return this.renderRoot.querySelector('dialog');
  }

  private get closeBtn(): HTMLButtonElement | null {
    return this.renderRoot.querySelector('button.close');
  }

  private get detailsBox(): HTMLElement | null {
    return this.renderRoot.querySelector('.details');
  }

  private focusTrigger(): void {
    const trigger = this.trigger;
    if (trigger?.isConnected) trigger.focus();
  }

  /**
   * Open the dialog and focus Close. `showModal` can throw while a dialog is still leaving
   * the top layer (a reopen from Back/Forward, or the first paint), so try again on the next
   * frames. Those frames are queued before a test's own `nextFrame`.
   */
  /** History restore can drop the light-DOM mount or orphan a shadow root. Put it back. */
  private ensureRoot(): void {
    const root = this.renderRoot;
    if (!this.isConnected) return;
    if (root instanceof HTMLElement && !root.isConnected) this.append(root);
    if (root instanceof ShadowRoot && this.shadowRoot && root !== this.shadowRoot) {
      (this as unknown as { renderRoot: ShadowRoot }).renderRoot = this.shadowRoot;
      this.requestUpdate();
    }
  }

  private cancelReveal(): void {
    const view = this.ownerDocument.defaultView;
    if (this.revealFrame && view) view.cancelAnimationFrame(this.revealFrame);
    this.revealFrame = 0;
  }

  private reveal(): void {
    this.ensureRoot();
    const dialog = this.dialogEl;
    if (!this.open || !dialog) return;
    const again = () => {
      if (this.revealTries++ > 8) {
        this.ignoreClose = false;
        return;
      }
      const view = this.ownerDocument.defaultView;
      if (!view) return;
      this.revealFrame = view.requestAnimationFrame(() => {
        this.revealFrame = 0;
        if (this.open) this.reveal();
      });
    };
    if (!dialog.isConnected) {
      again();
      return;
    }
    if (!dialog.open) {
      try {
        dialog.showModal();
      } catch {
        again();
        return;
      }
    }
    this.revealTries = 0;
    this.cancelReveal();
    // A close event already queued by the dialog we shut must not dismiss this open.
    // Clearing the guard here is synchronous, so Escape after this update still closes.
    this.ignoreClose = false;
    // A later reveal (a retry, or the history traversal showing the dialog again) must
    // not pull focus back to Close after the visitor has moved it inside the dialog.
    const active = this.shadowRoot?.activeElement ?? this.ownerDocument.activeElement;
    if (!active || !dialog.contains(active)) this.closeBtn?.focus();
  }

  /** A cached image may already be complete before the load listener runs. */
  private settleImage(): void {
    const img = this.renderRoot.querySelector('img');
    if (!img || this.status !== 'loading') return;
    if (img.complete && img.naturalWidth > 0) this.status = 'ready';
    else if (img.complete && img.getAttribute('src') && img.naturalWidth === 0)
      this.status = 'error';
  }

  private readonly onLoad = (): void => {
    if (this.status === 'loading') this.status = 'ready';
  };

  private readonly onError = (): void => {
    this.status = 'error';
  };

  /** Stable identity for a details element, so parking it does not look like a new one. */
  private detailTokens = new WeakMap<HTMLElement, number>();
  private detailTokenSeq = 0;
  private detailToken(el: HTMLElement): string {
    let n = this.detailTokens.get(el);
    if (n === undefined) this.detailTokens.set(el, (n = ++this.detailTokenSeq));
    return String(n);
  }

  /**
   * Details for the open image: `slot="details"` children (honouring `data-for`) and the
   * element named by `data-details-id`. Elements already parked in the dialog stay in the
   * set, so this does not move them again.
   */
  private matchingDetails(): HTMLElement[] {
    const slide = this.current;
    const id = slide?.id ?? '';
    const position = String(this.index + 1);
    const pool: HTMLElement[] = [];
    const add = (el: HTMLElement | null) => {
      if (el && el !== this && !pool.includes(el)) pool.push(el);
    };
    for (const el of this.querySelectorAll(':scope > [slot="details"]')) {
      if (el instanceof HTMLElement) add(el);
    }
    for (const item of this.parked) add(item.el);
    if (slide?.detailsId) add(this.scope.getElementById(slide.detailsId));
    return pool.filter((el) => {
      if (el.getAttribute('slot') === 'details') {
        const f = el.getAttribute('data-for');
        return !f || f === id || f === position;
      }
      return !!slide?.detailsId && el.id === slide.detailsId;
    });
  }

  private placeDetails(): void {
    const want = this.matchingDetails();
    const key = `${want.map((el) => this.detailToken(el)).join('|')}@${this.index}`;
    if (key === this.parkedKey) return;
    const keep = new Set(want);
    const still: typeof this.parked = [];
    for (const item of this.parked) {
      if (keep.has(item.el) && this.detailsBox?.contains(item.el)) still.push(item);
      else this.putBack(item);
    }
    this.parked = still;
    const box = this.detailsBox;
    if (box) {
      for (const el of want) {
        if (box.contains(el)) continue;
        const parent = el.parentNode;
        if (!parent) continue;
        this.parked.push({ el, parent, next: el.nextSibling, hidden: el.hidden });
        el.hidden = false;
        box.append(el);
      }
    }
    this.parkedKey = key;
  }

  /**
   * Put a parked element back. Restoring later siblings first keeps `next` inside `parent`;
   * if it is not (it was parked too), insert at the end instead of throwing NotFoundError.
   */
  private putBack(item: (typeof this.parked)[number]): void {
    item.el.hidden = item.hidden;
    const next = item.next?.parentNode === item.parent ? item.next : null;
    item.parent.insertBefore(item.el, next);
  }

  private restoreDetails(): void {
    for (let i = this.parked.length - 1; i >= 0; i--) this.putBack(this.parked[i]!);
    this.parked = [];
    this.parkedKey = '';
    this.returnList();
  }

  /** The list the open image shows (none while its image cannot be drawn). */
  private get wantedList(): RegionsListElement | null {
    if (!this.open) return null;
    const list = this.current?.list ?? null;
    return list && this.displaySrc ? list : null;
  }

  /**
   * Lend the open image's list to the viewer, giving back any other. Shadow mode (before
   * render): the list becomes a light-DOM child of the lightbox with `slot`, and the viewer's
   * `<uvalib-image-regions>` slots it on, so it stays in the page (its styles and listeners
   * apply). Light DOM (`rendered`, after render): it is moved into `<uvalib-image-regions>`.
   */
  private lendList(rendered = false): void {
    const want = this.wantedList;
    if (this.lent && this.lent.el !== want) this.returnList();
    if (!want) return;
    if (this.isLight && !rendered) return;
    const target: Element | null = this.isLight
      ? this.renderRoot.querySelector('uvalib-image-regions')
      : this;
    if (!target || want.parentNode === target) return;
    if (!this.lent) {
      const parent = want.parentNode;
      if (!parent) return;
      this.lent = {
        el: want,
        parent,
        next: want.nextSibling,
        hidden: want.hidden,
        slot: want.getAttribute('slot'),
      };
    }
    this.noteEntries();
    if (this.isLight) want.removeAttribute('slot');
    else want.setAttribute('slot', LIST_SLOT);
    want.hidden = false;
    target.append(want);
  }

  /** Remember each entry's own tabindex before the viewer can add one. */
  private noteEntries(): void {
    const list = this.lent?.el;
    if (!list) return;
    for (const li of list.children) {
      if (!this.entryTabindex.has(li)) this.entryTabindex.set(li, li.getAttribute('tabindex'));
    }
  }

  /** Give the lent list back: same place, same `hidden` and `slot`, no marks of the viewer's. */
  private returnList(): void {
    const lent = this.lent;
    if (!lent) return;
    this.lent = null;
    const { el } = lent;
    const active = this.shadowRoot?.activeElement ?? this.ownerDocument.activeElement;
    // Focus in the list would be lost with it; Close takes it while the viewer stays open.
    if (this.open && active && el.contains(active)) this.refocus = true;
    for (const li of el.children) {
      for (const name of ENTRY_MARKS) li.removeAttribute(name);
      if (this.entryTabindex.has(li)) {
        const was = this.entryTabindex.get(li);
        if (was == null) li.removeAttribute('tabindex');
        else li.setAttribute('tabindex', was);
      }
    }
    this.entryTabindex = new WeakMap();
    if (lent.slot == null) el.removeAttribute('slot');
    else el.setAttribute('slot', lent.slot);
    el.hidden = lent.hidden;
    const next = lent.next?.parentNode === lent.parent ? lent.next : null;
    lent.parent.insertBefore(el, next);
  }

  private get statusText(): string {
    if (!this.open) return '';
    if (this.status === 'loading') return 'Loading image.';
    if (this.status === 'error') return 'This image could not be loaded.';
    return '';
  }

  private readonly toggleRegions = (): void => {
    this.showRegions = !this.showRegions;
  };

  /**
   * The image, inside `<uvalib-image-regions>` when it has regions (or the page's list). An
   * image with versions sits in a `.stack` (the same element before and after the comparison
   * loads, so the image is not loaded again), with the comparison's layers over it and its
   * controls under it.
   */
  private renderImage(slide: Slide, src: string, regions: ImageRegion[] | null) {
    const outlined = !!(regions || slide.list);
    const cmp = slide.versions && this.cmp?.active ? this.cmp : null;
    let img = html`<img
      part="image"
      slot=${outlined && !slide.versions ? 'image' : nothing}
      alt=${cmp ? cmp.alt(slide.alt) : slide.alt}
      src=${src}
      aria-busy=${this.status === 'loading' ? 'true' : 'false'}
      @load=${this.onLoad}
      @error=${this.onError}
    />`;
    let controls: unknown = nothing;
    if (slide.versions) {
      img = html`<div
        class="stack ${cmp?.stackClass ?? ''}"
        slot=${outlined ? 'image' : nothing}
        style=${cmp?.stackStyle ?? nothing}
        @pointerdown=${this.onStack}
        @pointermove=${this.onStack}
        @pointerup=${this.onStack}
        @pointercancel=${this.onStack}
      >
        ${img}${cmp ? cmp.layers() : nothing}
      </div>`;
      if (cmp) controls = cmp.controls(outlined ? 'controls' : '');
    }
    if (!outlined) return html`${img}${controls}`;
    // The page's list: slotted on from the lightbox's light DOM (shadow mode), or moved in
    // after render (light DOM).
    const list = slide.list && !this.isLight ? html`<slot name=${LIST_SLOT}></slot>` : nothing;
    return html`<uvalib-image-regions
      class="regions"
      part="regions"
      .items=${slide.list ? null : regions}
      label=${normalize(this.regionsLabel) || 'Regions'}
      image-width=${slide.imageWidth ?? nothing}
      image-height=${slide.imageHeight ?? nothing}
      ?hide-outlines=${!this.showRegions}
      ?no-style=${this.noStyle}
      style=${cmp?.regionsStyle || nothing}
      >${img}${controls}${list}</uvalib-image-regions
    >`;
  }

  protected override render() {
    const slide = this.open ? this.current : undefined;
    const src = slide ? this.displaySrc : '';
    const full = slide && usableImageUrl(slide.href, this.base) ? slide.href : '';
    const fullLinks = full && slide?.versions && this.cmp?.active ? this.cmp.full() : null;
    const shown = this.statusText;
    const regions = slide?.regions.length ? slide.regions : null;
    const outlined = !!(regions || slide?.list);
    const counter = this.multiple
      ? html`<p class="count" aria-live="polite">${this.index + 1} of ${this.slides.length}</p>`
      : nothing;
    // Shadow mode needs a slot or the author's links are not rendered and cannot take focus.
    // Light mode renders into `.viewer`; a `<slot>` there would not show the siblings.
    return html`
      ${this.isLight ? nothing : html`<slot></slot><slot name="details" hidden></slot>`}
      <dialog
        part="dialog"
        aria-labelledby=${this.captionId}
        @click=${this.onDialogClick}
        @close=${this.onDialogClose}
        @keydown=${this.onKey}
        @keyup=${this.onKey}
      >
        <div class="panel" part="panel">
          <div class="head">
            <p class="caption" part="caption" id=${this.captionId}>${slide?.caption ?? 'Image'}</p>
            <button type="button" class="close" autofocus @click=${() => this.dismiss('ui')}>
              Close
            </button>
          </div>
          <figure class="figure">${src ? this.renderImage(slide!, src, regions) : nothing}</figure>
          <p class="status ${shown ? '' : 'visually-hidden'}" role="status">${shown}</p>
          <div class="toolbar" part="controls">
            ${
              outlined && src
                ? html`<button
                    type="button"
                    class="regions-toggle"
                    aria-pressed=${this.showRegions ? 'true' : 'false'}
                    @click=${this.toggleRegions}
                  >
                    Show regions
                  </button>`
                : nothing
            }
            ${
              this.multiple
                ? html`<button type="button" class="prev" @click=${() => this.step(-1)}>
                      Previous
                    </button>
                    <button type="button" class="next" @click=${() => this.step(1)}>Next</button>
                    ${counter}`
                : nothing
            }
            ${(fullLinks ?? (full ? [{ href: full, label: '' }] : [])).map(
              (link) =>
                html`<a
                  class="full"
                  href=${link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  @click=${this.onFullSize}
                  >Full size${link.label ? `, ${link.label}` : ''}<span class="visually-hidden">
                    (opens in a new tab)</span
                  ></a
                >`,
            )}
          </div>
          <div class="details" part="details"></div>
        </div>
      </dialog>
    `;
  }
}
