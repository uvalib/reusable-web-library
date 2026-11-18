import { html, css, unsafeCSS, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { trackEvent } from '../../base/analytics.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { accessible } from '../../styles/accessible.js';
import { siteLink } from '../link.js';
import { MAIN_NAV_SNAPSHOT } from './main-nav-data.js';
import {
  loadMainNavItems,
  normalizeItems,
  readItemsMarkup,
  type MainNavItem,
  type NormalizeResult,
} from './main-nav-items.js';

export type { MainNavItem, MainNavLink } from './main-nav-items.js';

/** Light-DOM instances share the document id space, so every instance numbers its own ids. */
let navCounter = 0;

const MAIN_NAV = 'main-nav';
const isSourceChild = (n: Node): n is Element =>
  n instanceof Element && n.getAttribute('slot') === MAIN_NAV;
/** Attributes of the source markup that change what the nav renders. */
const SOURCE_ATTRS = ['href', 'slot'];

/**
 * Focus rings: inset (as on the live site) so an open panel or a neighbour never covers
 * them; orange on white, brand blue where the background is grey (hover, the open group),
 * so the ring keeps 3:1 contrast.
 */
const FOCUS_RULES = `
  .toggle:focus-visible,
  .top-link:focus-visible,
  .panel a:focus-visible {
    outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
    outline-offset: -4px;
  }
  .toggle[aria-expanded='true']:focus-visible,
  .toggle:hover:focus-visible,
  .top-link:hover:focus-visible,
  .panel a:hover:focus-visible {
    outline-color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
  }
`;
const focusRules = unsafeCSS(FOCUS_RULES);
/** The focus rules scoped to `tag`, for the unlayered light-mode sheet. */
const lightFocusRules = (tag: string) =>
  unsafeCSS(FOCUS_RULES.replace(/(^|,)\s*\./gm, `$1 ${tag} .`));

/** A URL reduced to what "the same page" means here: host (without `www.`) and path. */
function pageKey(href: string, base: string): string | null {
  try {
    const u = new URL(href, base);
    return `${u.host.replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
}
const hashOf = (href: string, base: string): string => {
  try {
    return new URL(href, base).hash;
  } catch {
    return '';
  }
};

/**
 * The UVA Library main navigation (About, Using the Library, Research & teaching support,
 * Get help), as on library.virginia.edu, following the WAI-ARIA disclosure navigation
 * pattern: one `<nav>` landmark; each group is a `<button aria-expanded aria-controls>`
 * followed by its list of links, and an entry with no group is a plain link. Click, Enter or
 * Space toggles a group and only one is open at a time; Escape closes it and returns focus to
 * its button; arrow keys, Home and End move between the buttons and between a panel's links,
 * and ArrowDown on an open button moves into its panel. In the `bar` layout a panel also closes
 * when focus leaves the nav or on a pointer press outside it. There is no hover-to-open.
 *
 * The items come from, in order of precedence: a `<nav slot="main-nav">` child holding
 * `<ul><li><a href>…</a></li></ul>` (a direct link) or `<li><span>Group</span><ul><li><a href>…`
 * (a group), kept hidden and watched for changes; the `items` property; JSON at `items-src`;
 * and the snapshot of the live menu bundled with the component (see `pnpm sync:main-nav`).
 * Invalid entries are skipped and levels deeper than two are flattened, each with one console
 * warning. Relative hrefs are joined to `root-link-domain`; absolute ones are kept, and
 * fragment-only ones (`#…`, a hash route) stay on this page. A plain click on a link closes
 * the open group.
 *
 * The link for the current page (`current`, default the page location, followed through
 * same-document navigations; host and path, ignoring the query, the hash, a trailing slash
 * and a leading `www.`) gets `aria-current="page"`, and its group button
 * `aria-current="true"`, shown bold with a thick underline. Of links that differ only by
 * hash, the one with the page's hash is marked, else the one without a hash; if every one
 * has a hash, the first is marked while the page has none, and none for a hash none has.
 *
 * `<site-header>` renders it: as a row under the logo on wide screens and as an accordion in
 * the Menu popover on narrow ones.
 *
 * @tagname site-main-nav
 * @slot main-nav - Optional `<nav>` (or `<ul>`) whose list replaces the menu: `<li><a href>` for a direct link, `<li><span>Group</span><ul><li><a href>…</a></li></ul></li>` for a group. It is never shown itself; in light mode it is moved into a hidden holder.
 * @fires site-main-nav-error - `items-src` could not be loaded: both attempts failed (network error, a 10 s timeout per attempt, or no valid entries), after about 21 s at worst; the nav shows the bundled snapshot. `detail` is `{ src, message }`. Bubbles and is composed.
 * @fires uvalib-analytics-event - For `<site-analytics>`: a group was opened, `['site-main-nav', 'menu-open', <the group's label>]` (not on close), and a link was clicked, `['site-main-nav', 'link-click', '<Group> > <Link>']` (a top-level link: its label alone; never the URL). Bubbles and is composed.
 * @cssprop [--uva-grey-darkest=#2b2b2b] - Top-level button colour.
 * @cssprop [--uva-brand-blue=#232d4b] - Bar bottom border, chevrons, panel links, and the hover and expanded button text.
 * @cssprop [--uva-grey-100=#dadada] - Hover and expanded button background, and panel link hover background.
 * @cssprop [--uva-brand-orange=#e57200] - Focus ring colour, and the underline of the current page's link and group (also bold, with a 3px underline).
 * @cssprop [--uva-font-family=franklin-gothic-urw, Arial, Helvetica, sans-serif] - Font family.
 * @cssprop --uva-color-text - Dark-mode role token: top-level button text (else `--uva-grey-darkest`).
 * @cssprop --uva-color-link - Dark-mode role token: chevrons, panel links, hover text and the focus ring over hover (else `--uva-brand-blue`).
 * @cssprop --uva-color-surface-hover - Dark-mode role token: hover and open-group background (else `--uva-grey-100`).
 * @cssprop --uva-color-surface-raised - Dark-mode role token: bar and panel background (else #ffffff).
 * @cssprop --uva-color-accent-bg - Dark-mode role token: bar bottom rule (else `--uva-brand-blue`).
 * @cssprop --uva-color-shadow - Dark-mode role token: panel shadow colour (else rgba(0, 0, 0, 0.2)).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 * @cssprop --uva-color-current - Dark-mode role token: current-page underline (else `--uva-brand-orange`).
 */
export class SiteMainNav extends UvalibElement {
  static styles = [
    accessible,
    css`
      :host {
        display: block;
        font-family: var(--uva-font-family, franklin-gothic-urw, Arial, Helvetica, sans-serif);
        font-size: 17px;
        line-height: 1.5;
      }
      :host([hidden]) {
        display: none;
      }
      ul {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .panel[hidden] {
        display: none;
      }
      .toggle,
      .top-link {
        display: flex;
        align-items: center;
        box-sizing: border-box;
        margin: 0;
        border: 0;
        border-radius: 0;
        background: transparent;
        color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
        font: inherit;
        font-weight: 500;
        line-height: 1.5;
        text-align: start;
        text-decoration: none;
        cursor: pointer;
      }
      /* Chevron: a rotated border box, turned over when expanded. */
      .toggle::after {
        content: '';
        flex: none;
        inline-size: 0.5em;
        block-size: 0.5em;
        margin-inline-start: 0.75em;
        border-style: solid;
        border-color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
        border-width: 0 1px 1px 0;
        transform: translateY(-0.15em) rotate(45deg);
      }
      .toggle[aria-expanded='true']::after {
        transform: translateY(0.15em) rotate(-135deg);
      }
      /* Grey for hover and the open group only, never for focus: the orange focus ring
         would fall below 3:1 against it. */
      .toggle:hover,
      .toggle[aria-expanded='true'],
      .top-link:hover {
        background-color: var(--uva-color-surface-hover, var(--uva-grey-100, #dadada));
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
      }
      .panel a {
        display: block;
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
        font-weight: 400;
        text-decoration: underline;
      }
      .panel a:hover {
        background-color: var(--uva-color-surface-hover, var(--uva-grey-100, #dadada));
        text-decoration: none;
      }
      ${focusRules}
      /* Current page, and the group holding it: bold with a thick underline, not colour alone. */
      [aria-current]:not([aria-current='false']),
      .panel a[aria-current]:not([aria-current='false']):hover {
        font-weight: 700;
        text-decoration-line: underline;
        text-decoration-thickness: 3px;
        text-decoration-color: var(--uva-color-current, var(--uva-brand-orange, #e57200));
        text-underline-offset: 0.3em;
      }

      /* Bar: a full-width row with the brand-blue rule, content capped at 1600px. */
      .bar {
        border-bottom: 5px solid var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
        background: var(--uva-color-surface-raised, #ffffff);
      }
      .bar > ul {
        display: flex;
        flex-wrap: wrap;
        box-sizing: border-box;
        max-inline-size: 1600px;
        margin-inline: auto;
        padding-inline: 16px;
      }
      .bar > ul > li {
        position: relative;
        display: flex;
      }
      .bar .toggle,
      .bar .top-link {
        padding: 11.5px 17px;
      }
      .bar .panel {
        position: absolute;
        top: 100%;
        inset-inline-start: 0;
        z-index: 1000;
        box-sizing: border-box;
        inline-size: max-content;
        min-inline-size: 100%;
        max-inline-size: 20rem;
        background: var(--uva-color-surface-raised, #ffffff);
        border-radius: 0 0 4px 4px;
        box-shadow: 0 8px 16px var(--uva-color-shadow, rgba(0, 0, 0, 0.2));
        /* Invisible normally; forced colors paint it, so the panel keeps an edge. */
        outline: 1px solid transparent;
      }
      .bar .panel a {
        padding: 8.5px 17px;
      }

      /* Accordion (the header's narrow-screen Menu popover): full-width rows, panels in flow. */
      .accordion .toggle,
      .accordion .top-link {
        inline-size: 100%;
        justify-content: space-between;
        padding: 0.375rem 0.5rem;
      }
      .accordion .toggle::after {
        margin-inline-end: 0.25em;
      }
      .accordion .panel {
        position: static;
        padding-inline-start: 1rem;
      }
      .accordion .panel a {
        padding: 0.375rem 0.5rem;
      }

      /* Forced colors drop backgrounds and shadows: outline the open group and hovered
         controls instead. */
      @media (forced-colors: active) {
        .toggle[aria-expanded='true']:not(:focus-visible),
        .toggle:hover:not(:focus-visible),
        .top-link:hover:not(:focus-visible),
        .panel a:hover:not(:focus-visible) {
          outline: 1px solid CanvasText;
          outline-offset: -1px;
        }
      }
    `,
  ];

  /**
   * Light mode: the focus rules again, unlayered. A page's own accessibility sheet (which
   * `<site-page>` installs unlayered) would otherwise beat the layered component rules.
   */
  protected override installLightStyles(root?: Document | ShadowRoot): void {
    super.installLightStyles(root);
    installLightDomStyles(`${this.localName}-focus`, [lightFocusRules(this.localName)], {
      root,
      scope: false,
      layer: false,
    });
  }

  /** Accessible name of the navigation landmark. */
  @property({ type: String }) label = 'Main';
  @property({ type: String, attribute: 'root-link-domain' }) rootLinkDomain =
    'https://www.library.virginia.edu';
  /** URL of JSON in the `MainNavItem[]` shape (needs CORS); the snapshot is shown until it loads, and if it fails. */
  @property({ type: String, attribute: 'items-src' }) itemsSrc?: string;
  /** `bar` (a row of buttons with floating panels) or `accordion` (stacked, panels in flow). */
  @property({ type: String }) layout: 'bar' | 'accordion' = 'bar';
  /**
   * The URL whose link is marked current. Default: the page location, followed through
   * same-document navigations (`popstate`, `hashchange`, and the Navigation API's
   * `currententrychange` where supported).
   */
  @property({ type: String }) current?: string;
  /**
   * The menu, replacing the bundled snapshot (but not `slot="main-nav"` markup):
   * `{ label, href }` for a direct link, `{ label, items: [{ label, href }] }` for a group.
   * Unset or empty uses `items-src` or the snapshot.
   */
  @property({ attribute: false }) items?: MainNavItem[];

  /** Items from slotted markup, or null when there is none. */
  @state() private slotItems: MainNavItem[] | null = null;
  /** Items loaded from `items-src`. */
  @state() private fetched: MainNavItem[] | null = null;
  /** Index of the open group. */
  @state() private open: number | null = null;

  private propItems: MainNavItem[] | null = null;
  private fetchedFor?: string;
  /** The shown items last rendered, to close the open group when they change. */
  private shownKey?: string;
  private warned = new Set<string>();
  private observer?: MutationObserver;
  private holder?: HTMLDivElement;
  private readonly idBase = `main-nav-${++navCounter}`;

  override connectedCallback(): void {
    super.connectedCallback();
    // Read the markup before the first render where it is already there (no second update);
    // the observer catches markup parsed or added later.
    this.syncSource();
    this.listenLocation(true);
    // Reconnected while a group was open: watch for outside presses again.
    this.listenOutside(this.open !== null && this.layout === 'bar');
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.observer?.disconnect();
    this.listenOutside(false);
    this.listenLocation(false);
  }

  /** Same-document navigation: re-mark the current page when `current` is not set. */
  private onLocationChange = (): void => {
    if (!this.current) this.requestUpdate();
  };

  private locationTargets(): { target: EventTarget; type: string }[] {
    const win = this.ownerDocument.defaultView;
    if (!win) return [];
    const nav = (win as Window & { navigation?: EventTarget }).navigation;
    return [
      { target: win, type: 'popstate' },
      { target: win, type: 'hashchange' },
      ...(nav ? [{ target: nav, type: 'currententrychange' }] : []),
    ];
  }

  private listeningLocation = false;
  private listenLocation(on: boolean): void {
    if (on === this.listeningLocation) return;
    this.listeningLocation = on;
    for (const { target, type } of this.locationTargets()) {
      if (on) target.addEventListener(type, this.onLocationChange);
      else target.removeEventListener(type, this.onLocationChange);
    }
  }

  private warnOnce(kind: 'invalid' | 'flattened', what: string): void {
    if (this.warned.has(kind)) return;
    this.warned.add(kind);
    console.warn(
      kind === 'invalid'
        ? `${this.localName}: ignoring invalid ${what} entries (each needs a label, and an href or links).`
        : `${this.localName}: ${what} nests deeper than two levels; the deeper links are shown in their group.`,
    );
  }

  private use(result: NormalizeResult, what: string): MainNavItem[] | null {
    if (result.invalid) this.warnOnce('invalid', what);
    if (result.flattened) this.warnOnce('flattened', what);
    return result.items.length ? result.items : null;
  }

  /** Light mode: move `slot="main-nav"` children into a hidden holder this element owns. */
  private adoptSource(): Element[] {
    const moved = [...this.children].filter(isSourceChild);
    if (moved.length && !this.holder) {
      this.holder = document.createElement('div');
      this.holder.hidden = true;
      this.holder.className = 'main-nav-source';
    }
    if (this.holder) {
      this.holder.append(...moved);
      if (this.holder.parentNode !== this) this.append(this.holder);
    }
    return this.holder ? [...this.holder.children] : [];
  }

  /** Read the `slot="main-nav"` markup, render it, and watch it for changes. */
  private syncSource(): void {
    const sources = this.lightDom ? this.adoptSource() : [...this.children].filter(isSourceChild);
    let next: MainNavItem[] | null = null;
    if (sources.length) {
      const raw = sources.flatMap((s, i) => (i === 0 ? readItemsMarkup(s) : [{}]));
      next = this.use(normalizeItems(raw), 'slot="main-nav"');
    }
    // Only a real change re-renders.
    if (JSON.stringify(next) !== JSON.stringify(this.slotItems)) this.slotItems = next;
    this.observer ??= new MutationObserver(() => this.syncSource());
    this.observer.disconnect();
    const content = {
      attributes: true,
      attributeFilter: SOURCE_ATTRS,
      characterData: true,
      childList: true,
      subtree: true,
    };
    if (this.lightDom) {
      this.observer.observe(this, { childList: true });
      if (this.holder) this.observer.observe(this.holder, content);
    } else {
      // Shadow mode: the host's children are only the source markup.
      this.observer.observe(this, content);
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has('items')) {
      this.propItems = this.items == null ? null : this.use(normalizeItems(this.items), 'items');
    }
    if (changed.has('itemsSrc') && this.fetchedFor !== this.itemsSrc) {
      this.fetched = null;
      this.fetchedFor = undefined;
    }
    const src = this.itemsSrc;
    // Fetch only when items-src is what would be shown. The result arrives asynchronously.
    if (src && !this.slotItems && !this.propItems && this.fetchedFor !== src) {
      this.fetchedFor = src;
      loadMainNavItems(src).then(
        (result) => {
          if (this.itemsSrc !== src) return;
          this.fetched = this.use(result, 'items-src');
        },
        (error: unknown) => {
          if (this.itemsSrc !== src) return;
          this.dispatchEvent(
            new CustomEvent('site-main-nav-error', {
              detail: { src, message: error instanceof Error ? error.message : String(error) },
              bubbles: true,
              composed: true,
            }),
          );
        },
      );
    }
    // A different menu: the open index would point at another group, so close it.
    const key = JSON.stringify(this.shown);
    if (this.shownKey !== undefined && key !== this.shownKey) this.open = null;
    this.shownKey = key;
  }

  protected override updated(changed: PropertyValues): void {
    if (changed.has('open') || changed.has('layout')) {
      this.listenOutside(this.isConnected && this.open !== null && this.layout === 'bar');
    }
  }

  /** The items shown, by precedence. */
  private get shown(): readonly MainNavItem[] {
    return this.slotItems ?? this.propItems ?? this.fetched ?? MAIN_NAV_SNAPSHOT;
  }

  // --- behaviour ----------------------------------------------------------------------

  private get navEl(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('nav.main-nav');
  }

  /** The top-level buttons and direct links, in order. */
  private get tops(): HTMLElement[] {
    const nav = this.navEl;
    return nav
      ? [...nav.querySelectorAll<HTMLElement>(':scope > ul > li > :is(.toggle, .top-link)')]
      : [];
  }

  private setOpen(index: number | null): void {
    this.open = index;
  }

  private onToggle(index: number): void {
    const opening = this.open !== index;
    this.setOpen(opening ? index : null);
    const label = this.shown[index]?.label;
    if (opening && label) trackEvent(this, ['site-main-nav', 'menu-open', label]);
  }

  private onOutsidePointer = (e: Event): void => {
    const nav = this.navEl;
    if (nav && !e.composedPath().includes(nav)) this.setOpen(null);
  };

  private listening = false;
  private listenOutside(on: boolean): void {
    if (on === this.listening) return;
    this.listening = on;
    const doc = this.ownerDocument;
    if (on) doc.addEventListener('pointerdown', this.onOutsidePointer, true);
    else doc.removeEventListener('pointerdown', this.onOutsidePointer, true);
  }

  private onFocusOut(e: FocusEvent): void {
    if (this.layout !== 'bar' || this.open === null) return;
    const to = e.relatedTarget as Node | null;
    // A null relatedTarget (a click on nothing focusable) is left to the pointerdown check.
    if (to && !this.navEl?.contains(to)) this.setOpen(null);
  }

  /** Arrow keys, Home and End over `nodes`, from `index` (as the live site's script does). */
  private move(e: KeyboardEvent, nodes: HTMLElement[], index: number): void {
    let to: number;
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        to = Math.max(0, index - 1);
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        to = Math.min(nodes.length - 1, index + 1);
        break;
      case 'Home':
        to = 0;
        break;
      case 'End':
        to = nodes.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    nodes[to]?.focus();
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const target = e.target as HTMLElement;
    const tops = this.tops;
    const top = tops.indexOf(target);
    const open = this.open;
    const openButton = open === null ? null : this.toggleAt(open);
    if (top >= 0) {
      if (e.key === 'Escape') {
        if (open === null) return; // nothing to close: let a surrounding popover handle it
        e.preventDefault();
        this.setOpen(null);
      } else if (e.key === 'ArrowDown' && openButton === target) {
        e.preventDefault();
        this.panelOf(openButton)?.querySelector<HTMLElement>('a')?.focus();
      } else {
        this.move(e, tops, top);
      }
      return;
    }
    const panel = target.closest('.panel');
    if (!panel || !openButton || this.panelOf(openButton) !== panel) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.setOpen(null);
      openButton.focus();
      return;
    }
    const links = [...panel.querySelectorAll<HTMLElement>('a')];
    this.move(e, links, links.indexOf(target));
  }

  private toggleAt(index: number): HTMLElement | null {
    return (
      this.navEl?.querySelector<HTMLElement>(`[aria-controls="${this.panelId(index)}"]`) ?? null
    );
  }

  /** A group button's panel: the list right after it, whose id it controls. */
  private panelOf(button: HTMLElement): HTMLElement | null {
    const next = button.nextElementSibling as HTMLElement | null;
    return next && next.id === button.getAttribute('aria-controls') ? next : null;
  }

  private panelId(index: number): string {
    return `${this.idBase}-${index}`;
  }

  // --- rendering ----------------------------------------------------------------------

  /** The one link to mark current: same host and path; then the same hash; then no hash. */
  private currentHref(hrefs: string[]): string | null {
    const here = this.current || this.ownerDocument.defaultView?.location.href || '';
    const base = this.ownerDocument.baseURI;
    const key = pageKey(here, base);
    if (!key) return null;
    const matches = hrefs.filter((h) => pageKey(h, base) === key);
    const hash = hashOf(here, base);
    return (
      matches.find((h) => hash && hashOf(h, base) === hash) ??
      matches.find((h) => !hashOf(h, base)) ??
      // Every match has a hash: with no hash of its own the page is theirs, so the first is
      // marked; a hash none of them has (a hash route the menu does not list) marks none.
      (hash ? null : matches[0]) ??
      null
    );
  }

  /** A link's href: fragment-only (`#…`) stays on this page; others go through siteLink. */
  private resolve(href: string): string {
    return href.startsWith('#') ? href : siteLink(this.rootLinkDomain, href);
  }

  /**
   * A plain click on a link closes the open group, so a single-page app that handles the
   * navigation in place does not leave the panel open. Modified clicks (a new tab or
   * window) keep it open.
   */
  private onClick(e: MouseEvent): void {
    const a = e.composedPath().find((n) => n instanceof HTMLAnchorElement);
    // Only the menu's own links (rendered here), never anything else on the click's path.
    if (a && this.renderRoot.contains(a)) {
      const text = (n: Node | null | undefined) =>
        (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
      // `Group > Link` for a link in a group, the link alone for a top-level one.
      const group = text(a.closest('.panel')?.previousElementSibling);
      const label = text(a);
      if (label)
        trackEvent(this, ['site-main-nav', 'link-click', group ? `${group} > ${label}` : label]);
    }
    if (this.open === null || e.button !== 0) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    if (e.composedPath().some((n) => n instanceof Element && n.localName === 'a')) {
      this.setOpen(null);
    }
  }

  render() {
    const items = this.shown.map((item) => ({
      label: item.label,
      href: item.items ? undefined : this.resolve(item.href!),
      items: item.items?.map((l) => ({ label: l.label, href: this.resolve(l.href) })),
    }));
    const all = items.flatMap((i) => (i.items ? i.items.map((l) => l.href) : [i.href!]));
    const current = this.currentHref(all);
    const mark = (href: string) => (href === current ? 'page' : undefined);
    let marked = false;
    return html`<nav
      class="main-nav ${this.layout === 'accordion' ? 'accordion' : 'bar'}"
      aria-label=${this.label}
      @keydown=${this.onKeyDown}
      @focusout=${this.onFocusOut}
      @click=${this.onClick}
    >
      <ul>
        ${items.map((item, i) => {
          if (!item.items) {
            const cur = !marked && mark(item.href!);
            if (cur) marked = true;
            return html`<li>
              <a class="top-link" href=${item.href!} aria-current=${ifDefined(cur || undefined)}
                >${item.label}</a
              >
            </li>`;
          }
          const id = this.panelId(i);
          const expanded = this.open === i;
          const has = !marked && item.items.some((l) => l.href === current);
          let linkMarked = false;
          if (has) marked = true;
          return html`<li>
            <button
              type="button"
              class="toggle"
              aria-expanded=${expanded ? 'true' : 'false'}
              aria-controls=${id}
              aria-current=${ifDefined(has ? 'true' : undefined)}
              @click=${() => this.onToggle(i)}
            >
              ${item.label}
            </button>
            <ul class="panel" id=${id} ?hidden=${!expanded}>
              ${item.items.map((l) => {
                const cur = has && !linkMarked && l.href === current;
                if (cur) linkMarked = true;
                return html`<li>
                  <a href=${l.href} aria-current=${ifDefined(cur ? 'page' : undefined)}
                    >${l.label}</a
                  >
                </li>`;
              })}
            </ul>
          </li>`;
        })}
      </ul>
    </nav>`;
  }
}
