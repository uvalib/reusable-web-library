import { html, css, nothing, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { siteLink } from '../link.js';
import { accessible } from '../../styles/accessible.js';
import { ColorSchemeController, type ColorSchemePreference } from '../../base/color-scheme.js';
import {
  normalizeItems,
  readItemsMarkup,
  type MainNavItem,
} from '../site-main-nav/main-nav-items.js';

const ACCOUNT_URL = 'https://search.lib.virginia.edu/account';

const FULL_LINKS: ReadonlyArray<{ label: string; path: string }> = [
  { label: 'My account', path: ACCOUNT_URL },
  { label: 'Ask a Librarian', path: '/askalibrarian' },
  { label: 'Hours', path: '/hours' },
  { label: 'Give', path: '/support-library' },
  { label: 'Alerts', path: '/status#alerts' },
  { label: 'Search', path: '/search' },
];

const VENDOR_LINKS = FULL_LINKS.filter((l) => l.label === 'Ask a Librarian');

/** Light-DOM instances share the document id space, so each gets its own popover id. */
let menuCounter = 0;
/** Radio group names are per instance and per control (two controls per header). */
let schemeCounter = 0;

/** The reversed (white) library logo, for dark mode. Same aspect ratio as the navy one. */
export const DARK_LOGO_URL =
  'https://static.lib.virginia.edu/files/downloads/LibraryLogos/UVALIB_primary_color_white_web.png';
const SCHEME_OPTIONS: ReadonlyArray<{ value: ColorSchemePreference; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

/** A site's own link, read from an `<a slot="site-links">` child. */
interface SiteLinkItem {
  href: string;
  text: string;
  current?: string;
  target?: string;
  rel?: string;
  hreflang?: string;
}

const SITE_LINKS = 'site-links';
const isSiteLinksChild = (n: Node): n is Element =>
  n instanceof Element && n.getAttribute('slot') === SITE_LINKS;
const MAIN_NAV = 'main-nav';
const isMainNavChild = (n: Node): n is Element =>
  n instanceof Element && n.getAttribute('slot') === MAIN_NAV;
const ALERTS = 'alerts';
const isAlertsChild = (n: Node | null): n is Element =>
  n instanceof Element && n.getAttribute('slot') === ALERTS;
/** Attributes of a source anchor that change what the header renders. */
const LINK_ATTRS = ['href', 'aria-current', 'target', 'rel', 'hreflang'];
/** Swallows the popover accordion's copy of an `items-src` error the bar also reports. */
const stopEvent = (e: Event) => e.stopPropagation();

/**
 * UVA Library site header: logo, utility navigation, and a popover menu on narrow screens.
 *
 * A site can replace the library utility links (My account, Ask a Librarian, Hours, Give,
 * Alerts, Search) with its own: give the header `<a slot="site-links" href="…">` children.
 * They are shown, in order, in the inline nav and the Menu popover, with `href` as written
 * (not joined to `root-link-domain`) and their `aria-current`, `target`, `rel` and
 * `hreflang`. The source anchors themselves stay hidden. Children that are not `<a href>`
 * with text (empty or whitespace-only text counts as none) are ignored with one console
 * warning. The `vendor` variant ignores site links and keeps
 * its own reduced link set.
 *
 * The full header also shows the UVA Library main navigation (`<site-main-nav>`): a row
 * under the logo row on wide screens, and an accordion at the top of the Menu popover on
 * narrow ones (992px and below), above the utility or site links. `no-main-nav` turns it
 * off, leaving the header exactly as it was without it; the `vendor` variant never shows it.
 * A `<nav slot="main-nav">` child replaces its links (see `<site-main-nav>`), and
 * `main-nav-src` loads them from JSON; `main-nav-current` sets the URL marked current.
 *
 * `color-scheme-switch` opts in to dark mode (off by default; see the README's "Dark mode"):
 * a Light / Dark / System radio group ("Theme") at the end of the utility-links row on wide
 * screens and at the bottom of the Menu popover on narrow ones. The `vendor` variant, which
 * has no Menu, shows it after its inline link, on a row of its own under the logo row on
 * narrow screens. In dark mode the logo is the reversed (white) one.
 *
 * @tagname site-header
 * @slot skip-link - Shadow mode only: optional skip link, rendered first inside `<header>` (`<site-page>` uses it).
 * @slot alerts - Optional alert banner (`<site-page>` passes its `<uvalib-alerts show="header">`), shown as a full-bleed row at the very top of `<header>` (flush with its top and both edges, outside its padding), after the skip link and before the logo row. In light mode the children are moved to the start of `<header>`. The header never loads alerts itself.
 * @slot main-nav - Optional `<nav>` whose `<ul>` replaces the main navigation's links in both layouts: `<li><a href>` for a direct link, `<li><span>Group</span><ul><li><a href>…</a></li></ul></li>` for a group. Invalid entries are skipped with one console warning. Never shown itself; in light mode it is moved into a hidden holder. Ignored with `no-main-nav` and by the `vendor` variant.
 * @slot site-links - Optional `<a href>` elements with text that replace the library utility links in the inline nav and the Menu popover (ignored by the `vendor` variant). In light mode they are moved into a hidden holder.
 * @csspart header - The `<header>` element.
 * @fires site-main-nav-error - `main-nav-src` could not be loaded; the bundled main navigation is shown. `detail` is `{ src, message }`. Fired once, from the bar's `<site-main-nav>`; bubbles and is composed.
 * @cssprop [--uva-blue-alt-dark=#005679] - Utility link colour.
 * @cssprop [--uva-grey-darkest=#2b2b2b] - Menu button colour.
 * @cssprop [--uva-brand-orange=#e57200] - Focus ring colour (focus-visible outline), and the underline colour of an `aria-current` link (also bold, with a 3px underline).
 * @cssprop [--uva-brand-blue=#232d4b] - Skip-link background for a skip link slotted into `skip-link` (shadow mode, shared accessibility sheet).
 * @cssprop --uva-color-surface-raised - Dark-mode role token: header, Menu popover and theme control background (else #ffffff).
 * @cssprop --uva-color-utility-link - Dark-mode role token: utility and site link colour (else `--uva-blue-alt-dark`).
 * @cssprop --uva-color-text - Dark-mode role token: Menu button and theme control text (else `--uva-grey-darkest`).
 * @cssprop --uva-color-border - Dark-mode role token: popover border and rules (else #ccc).
 * @cssprop --uva-color-control-border - Dark-mode role token: theme control border (else #808080).
 * @cssprop --uva-color-accent-bg - Dark-mode role token: selected theme option and skip-link background (else `--uva-brand-blue`).
 * @cssprop --uva-color-on-accent - Dark-mode role token: selected theme option and skip-link text (else #fff).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 * @cssprop --uva-color-current - Dark-mode role token: current-page underline (else `--uva-brand-orange`).
 */
export class SiteHeader extends UvalibElement {
  static styles = [
    accessible,
    css`
      :host {
        display: block;
        width: 100%;
      }
      /* Logo on the start, everything else on the end, as one row. A grid (not a wrapping
         flex row) so an alerts row can span the top without changing where the logo row
         breaks: flex wrapping decides lines on max-content sizes before anything shrinks. */
      header {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: start;
        position: relative;
        background-color: var(--uva-color-surface-raised, #ffffff);
        --_pad-block: 0.5rem;
        --_pad-inline: 16px; /* old: .w3-container 16px side padding */
        padding: var(--_pad-block) var(--_pad-inline);
      }
      header > :not(.logo) {
        grid-column: 2;
        justify-self: end;
      }
      /* The alerts (slot="alerts") are a full-bleed row above the logo row, as in Virgo:
         negative margins equal to the header's padding put them flush with the top and both
         edges, and the bottom margin gives the logo row back its top padding. With no
         alerts content they take no space, so the logo row is exactly where it was. */
      ::slotted([slot='alerts']),
      header > [slot='alerts'] {
        grid-column: 1 / -1;
        justify-self: stretch;
        min-inline-size: 0;
        margin: calc(-1 * var(--_pad-block)) calc(-1 * var(--_pad-inline)) var(--_pad-block);
      }
      .logo {
        display: block;
        text-decoration: none;
      }
      .logo img {
        display: block;
        max-width: 225px;
        height: auto;
      }
      nav ul {
        list-style-type: none;
        margin: 0;
        padding: 0;
      }
      /* Old nav hung from the top of the header below the default 1em list margin. */
      nav.inline ul {
        margin: 1em 0;
        display: flex;
        gap: 1.5rem;
      }
      a {
        color: var(--uva-color-utility-link, var(--uva-blue-alt-dark, #005679));
      }
      /* Current page: bold with a thick underline, so it does not rely on colour alone. */
      nav a[aria-current]:not([aria-current='false']) {
        font-weight: 700;
        text-decoration-line: underline;
        text-decoration-thickness: 3px;
        text-decoration-color: var(--uva-color-current, var(--uva-brand-orange, #e57200));
        text-underline-offset: 0.3em;
      }
      .menu-toggle {
        display: none;
        align-items: center;
        gap: 0.25rem;
        background: none;
        border: none;
        color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
        font: inherit;
        cursor: pointer;
      }
      /* Old shared sheet sized every inline svg at 17px. */
      .menu-toggle svg {
        width: 17px;
        height: 17px;
      }
      [popover] {
        position: fixed;
        inset: auto;
        /* Fallback offset (about the header height) for engines without anchor(). */
        top: 4.75rem;
        inset-inline-end: 1rem;
        inline-size: min(80dvw, 24rem);
        max-inline-size: calc(100dvw - 2rem);
        block-size: fit-content;
        max-block-size: calc(100dvh - 6rem);
        overflow: auto;
        box-sizing: border-box;
        margin: 0.5rem 0 0;
        padding: 0.5rem 1rem;
        border: 1px solid var(--uva-color-border, #ccc);
        background: var(--uva-color-surface-raised, #ffffff);
      }
      nav.menu li {
        padding: 0.375rem 0;
      }
      /* The main navigation: a full-bleed row under the logo row, flush with the header's
         bottom (its 5px rule is the header's bottom edge), 0.5rem below the logo row. */
      header > site-main-nav.bar {
        grid-column: 1 / -1;
        justify-self: stretch;
        min-inline-size: 0;
        margin: var(--_pad-block) calc(-1 * var(--_pad-inline)) calc(-1 * var(--_pad-block));
      }
      /* Narrow screens: the main navigation leads the Menu popover, then a rule, then the
         utility or site links. */
      .menu-popover > site-main-nav + nav.menu > ul,
      .menu-popover > .color-scheme {
        margin-block-start: 0.5rem;
        padding-block-start: 0.5rem;
        border-block-start: 1px solid var(--uva-color-border, #ccc);
      }
      nav.menu {
        display: contents;
      }
      @supports (top: anchor(--x bottom)) {
        [popover] {
          top: anchor(var(--menu-anchor) bottom);
        }
      }
      .utility-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-end;
        column-gap: 1.5rem;
      }
      .color-scheme {
        min-inline-size: 0;
        margin: 0;
        padding: 0;
        border: 0;
        color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
      }
      .color-scheme legend {
        padding: 0;
        font-weight: 700;
      }
      .segments {
        display: flex;
        border: 1px solid var(--uva-color-control-border, var(--uva-grey, #808080));
        border-radius: 0.3rem;
        background: var(--uva-color-surface-raised, #ffffff);
      }
      .segments label {
        position: relative;
        display: flex;
        flex: 1;
        min-inline-size: 28px;
        font-size: 0.875rem;
        cursor: pointer;
      }
      .segments label + label {
        border-inline-start: 1px solid var(--uva-color-control-border, var(--uva-grey, #808080));
      }
      .segment {
        display: flex;
        flex: 1;
        align-items: center;
        justify-content: center;
        min-block-size: 28px;
        padding: 0.125rem 0.625rem;
      }
      .segments input {
        position: absolute;
        inset: 0;
        inline-size: 100%;
        block-size: 100%;
        margin: 0;
        opacity: 0;
        cursor: pointer;
      }
      .segments input:checked + .segment {
        background: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
        color: var(--uva-color-on-accent, #ffffff);
        font-weight: 700;
      }
      .segments input:focus-visible + .segment {
        position: relative;
        z-index: 1;
        outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
        outline-offset: 2px;
      }
      /* Floated, so it is not drawn into the fieldset's top border (the popover rule). */
      .menu-popover > .color-scheme legend {
        float: inline-start;
        inline-size: 100%;
        margin-block-end: 0.375rem;
      }
      .menu-popover > .color-scheme .segments {
        clear: both;
      }
      @media (forced-colors: active) {
        .segments input:checked + .segment {
          forced-color-adjust: none;
          background: Highlight;
          color: HighlightText;
        }
      }
      @media screen and (max-width: 992px) {
        header:not(.vendor) nav.inline,
        header:not(.vendor) .utility-row,
        header > site-main-nav.bar {
          display: none;
        }
        header.vendor .utility-row {
          display: contents;
        }
        header.vendor .utility-row > nav.inline {
          grid-column: 2;
          justify-self: end;
        }
        header.vendor .utility-row > .color-scheme {
          grid-column: 1 / -1;
          justify-self: end;
          margin-block-end: 0.5rem;
        }
        .menu-toggle {
          display: inline-flex;
        }
      }
      @media screen and (min-width: 993px) {
        .menu-toggle,
        [popover] {
          display: none;
        }
      }
    `,
  ];

  @property({ type: String, attribute: 'root-link-domain' }) rootLinkDomain =
    'https://www.library.virginia.edu';
  @property({ type: String, reflect: true }) variant: 'full' | 'vendor' = 'full';
  /** Accessible name of the nav when site links replace the utility links (default "Site"; the popover nav's name adds " menu"). */
  @property({ type: String, attribute: 'site-links-label' }) siteLinksLabel?: string;

  /** Hide the UVA Library main navigation (the row under the logo and the popover accordion). */
  @property({ type: Boolean, attribute: 'no-main-nav' }) noMainNav = false;
  /** Accessible name of the main navigation (default "Main"). */
  @property({ type: String, attribute: 'main-nav-label' }) mainNavLabel?: string;
  /** URL of JSON main navigation items (`MainNavItem[]`, needs CORS), passed to `<site-main-nav items-src>`. */
  @property({ type: String, attribute: 'main-nav-src' }) mainNavSrc?: string;
  /**
   * The URL whose main-navigation link is marked current, passed to `<site-main-nav current>`.
   * Default: the page location, followed through same-document navigations.
   */
  @property({ type: String, attribute: 'main-nav-current' }) mainNavCurrent?: string;

  /**
   * Opt in to dark mode: the page follows the OS light or dark preference ("System"), and a
   * Light / Dark / System control (at the end of the utility-links row on wide screens, at
   * the bottom of the Menu popover on narrow ones) lets the visitor override it, remembered
   * per site in localStorage (`uvalib-color-scheme`). Sets `data-uva-color-scheme` on the root
   * element, and swaps in the reversed logo while dark. Ignored (the page stays light and no
   * control is shown) in browsers without CSS `light-dark()`.
   */
  @property({ type: Boolean, attribute: 'color-scheme-switch' }) colorSchemeSwitch = false;

  private readonly scheme = new ColorSchemeController(
    this,
    () => this.colorSchemeSwitch,
    () => this.noStyle,
  );
  private readonly schemeName = `uva-color-scheme-${++schemeCounter}`;

  /** Main navigation items from `slot="main-nav"` markup, or null for the default. */
  @state() private mainNavItems: MainNavItem[] | null = null;
  private warnedMainNav = false;
  /** Light mode: hidden container this element owns for the `slot="main-nav"` children. */
  private mainNavHolder?: HTMLDivElement;

  /** The site's own links, or null to show the library utility links. */
  @state() private siteLinks: SiteLinkItem[] | null = null;
  private warnedInvalid = false;
  private observer?: MutationObserver;
  /** Light mode: hidden container this element owns for the `slot="site-links"` children. */
  private holder?: HTMLDivElement;

  override connectedCallback(): void {
    super.connectedCallback();
    // Reconnect after a disconnect; the first connect reads the links in firstUpdated().
    if (this.hasUpdated) this.syncChildren();
    // The main-nav markup is read before the first render too, so it costs no second update.
    else this.syncMainNav();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.observer?.disconnect();
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (!changed.has('colorSchemeSwitch')) return;
    const was = this.scheme.active;
    this.scheme.sync();
    // Light mode: turning dark mode on or off swaps the header template, and Lit clears
    // everything after its start marker: the alerts moved into the old <header> and the
    // hidden source holders. Move them before the marker; updated() re-adopts the alerts.
    if (this.lightDom && this.hasUpdated && was !== this.scheme.active) {
      const header = this.querySelector(':scope > header');
      const keep = [...(header?.children ?? [])].filter(isAlertsChild);
      for (const holder of [this.holder, this.mainNavHolder]) if (holder) keep.push(holder);
      this.prepend(...keep);
    }
  }

  protected override updated(changed: PropertyValues): void {
    if (changed.has('colorSchemeSwitch') && this.hasUpdated) this.adoptAlerts();
  }

  protected override firstUpdated(): void {
    this.syncChildren();
  }

  /** The navy logo, or the reversed (white) one while the page shows dark mode. */
  private logoSrc(): string {
    return this.scheme.logoDark
      ? DARK_LOGO_URL
      : siteLink(this.rootLinkDomain, '/sites/default/files/2022-09/library_rgb.png');
  }

  private onSchemeChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.checked) this.scheme.choose(input.value as ColorSchemePreference);
  }

  /**
   * The Light / Dark / System radio group. `inline` sits in the utility-links row, with its
   * legend visually hidden; `menu` closes the Menu popover, legend shown. "System" names
   * what it resolves to (the OS preference, whichever option is chosen), for screen readers.
   * Each option's look is on the span after its radio (no `:has()`, which Firefox 120 lacks).
   */
  private schemeControl(where: 'inline' | 'menu') {
    const { preference, systemDark } = this.scheme;
    const hint = ` (currently ${systemDark ? 'dark' : 'light'})`;
    const name = `${this.schemeName}-${where}`;
    return html`<fieldset class="color-scheme ${where}">
      <legend class=${where === 'inline' ? 'visually-hidden' : ''}>Theme</legend>
      <div class="segments">
        ${SCHEME_OPTIONS.map(
          (o) =>
            html`<label
              ><input
                type="radio"
                name=${name}
                value=${o.value}
                .checked=${preference === o.value}
                @change=${this.onSchemeChange}
              /><span class="segment"
                >${o.label}${
                  o.value === 'system'
                    ? html`<span class="visually-hidden">${hint}</span>`
                    : nothing
                }</span
              ></label
            >`,
        )}
      </div>
    </fieldset>`;
  }

  /** Light mode: place slotted alerts in `<header>`, then read the site links and main nav. */
  private syncChildren(): void {
    this.adoptAlerts();
    this.syncSources();
  }

  /** Read the site links and the main-nav markup, and watch both. */
  private syncSources(): void {
    const sources = [...this.syncSiteLinks(), ...this.syncMainNav()];
    this.watch(sources);
  }

  /**
   * Shadow mode: the `slot="main-nav"` children, with a forwarded `<slot>` (from
   * `<site-page>`) replaced by what is assigned to it. Needs no rendered slot.
   */
  private get slottedMainNav(): Element[] {
    return [...this.children]
      .filter(isMainNavChild)
      .flatMap((k) => (k instanceof HTMLSlotElement ? k.assignedElements({ flatten: true }) : [k]));
  }

  /** Light mode: move `slot="main-nav"` children into their own hidden holder. */
  private adoptMainNav(): Element[] {
    const moved = [...this.children].filter(isMainNavChild);
    if (moved.length && !this.mainNavHolder) {
      this.mainNavHolder = document.createElement('div');
      this.mainNavHolder.hidden = true;
      this.mainNavHolder.className = 'main-nav-source';
    }
    if (this.mainNavHolder) {
      this.mainNavHolder.append(...moved);
      if (this.mainNavHolder.parentNode !== this) this.append(this.mainNavHolder);
    }
    return this.mainNavHolder ? [...this.mainNavHolder.children] : [];
  }

  /** Read the `slot="main-nav"` markup once, for both main-nav instances. */
  private syncMainNav(): Element[] {
    const sources = this.lightDom ? this.adoptMainNav() : this.slottedMainNav;
    if (!sources.length) {
      if (this.mainNavItems) this.mainNavItems = null;
      return sources;
    }
    const raw = sources.flatMap((s, i) => (i === 0 ? readItemsMarkup(s) : [{}]));
    const result = normalizeItems(raw);
    if ((result.invalid || result.flattened) && !this.warnedMainNav) {
      this.warnedMainNav = true;
      console.warn(
        `${this.localName}: ignoring invalid slot="${MAIN_NAV}" entries (each needs a label, and an href or links; deeper levels are shown in their group).`,
      );
    }
    const next = result.items.length ? result.items : null;
    // Only a real change re-renders the header and both navs.
    if (JSON.stringify(next) !== JSON.stringify(this.mainNavItems)) this.mainNavItems = next;
    return sources;
  }

  /**
   * Light mode has no slots: move `slot="alerts"` children to the start of `<header>`, after
   * any alerts already there. That is before every Lit part in the header, so re-renders
   * never touch them.
   */
  private adoptAlerts(): void {
    if (!this.lightDom) return;
    const header = this.querySelector(':scope > header');
    const incoming = [...this.children].filter(isAlertsChild);
    if (!header || !incoming.length) return;
    let ref = header.firstChild;
    while (isAlertsChild(ref)) ref = ref.nextSibling;
    for (const n of incoming) header.insertBefore(n, ref);
  }

  /** Shadow mode: the elements assigned to the site-links slot, through forwarded slots. */
  private get slotted(): Element[] {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>(`slot[name="${SITE_LINKS}"]`);
    return slot?.assignedElements({ flatten: true }) ?? [];
  }

  /** Light mode has no slots: move `slot="site-links"` children into the hidden holder. */
  private adoptSiteLinks(): Element[] {
    const moved = [...this.children].filter(isSiteLinksChild);
    if (moved.length && !this.holder) {
      this.holder = document.createElement('div');
      this.holder.hidden = true;
      this.holder.className = 'site-links-source';
    }
    if (this.holder) {
      this.holder.append(...moved);
      if (this.holder.parentNode !== this) this.append(this.holder);
    }
    return this.holder ? [...this.holder.children] : [];
  }

  /** Read the source links and render them; returns the sources to watch. */
  private syncSiteLinks(): Element[] {
    const sources = this.lightDom ? this.adoptSiteLinks() : this.slotted;
    const items: SiteLinkItem[] = [];
    let invalid = false;
    for (const el of sources) {
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      // A link with no text would have no accessible name.
      if (!(el instanceof HTMLAnchorElement) || !el.hasAttribute('href') || !text) {
        invalid = true;
        continue;
      }
      const attr = (name: string) => el.getAttribute(name) ?? undefined;
      items.push({
        href: el.getAttribute('href')!,
        text,
        current: attr('aria-current'),
        target: attr('target'),
        rel: attr('rel'),
        hreflang: attr('hreflang'),
      });
    }
    if (invalid && !this.warnedInvalid) {
      this.warnedInvalid = true;
      console.warn(
        `${this.localName}: ignoring slot="${SITE_LINKS}" children that are not <a href> elements with text.`,
      );
    }
    this.siteLinks = items.length ? items : null;
    return sources;
  }

  /**
   * Shadow mode: slotchange reports added and removed links, and the observer watches the
   * assigned anchors' attributes and text. Light mode: the observer also watches the host
   * for new children and the holder for removals.
   */
  private watch(sources: Element[]): void {
    this.observer ??= new MutationObserver(() => this.syncChildren());
    this.observer.disconnect();
    const content = {
      attributes: true,
      attributeFilter: LINK_ATTRS,
      characterData: true,
      childList: true,
      subtree: true,
    };
    if (this.lightDom) {
      this.observer.observe(this, { childList: true });
      if (this.holder) this.observer.observe(this.holder, content);
      if (this.mainNavHolder)
        this.observer.observe(this.mainNavHolder, { ...content, attributeFilter: ['href'] });
    } else {
      for (const el of sources) this.observer.observe(el, content);
    }
  }

  private onSourcesChange(): void {
    this.syncSources();
  }

  private _menuId?: string;
  private get menuId(): string {
    this._menuId ??= this.lightDom ? `utility-menu-${++menuCounter}` : 'utility-menu';
    return this._menuId;
  }

  /**
   * The header with dark mode on: the inline nav and the control share the utility row, the
   * Menu popover ends with the control, and the logo follows the scheme. A template of its
   * own, so the header without the switch renders exactly what it did before dark mode.
   */
  private renderWithScheme(
    items: unknown,
    label: string,
    mainNav: boolean,
    mainNavEl: (accordion: boolean) => unknown,
  ) {
    const root = this.rootLinkDomain;
    const vendor = this.variant === 'vendor';
    const id = this.menuId;
    const anchor = `--${id}`;
    const menu = html`<button
        popovertarget=${id}
        aria-controls=${id}
        class="menu-toggle"
        style="anchor-name: ${anchor}"
      >
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="butt"
          stroke-linejoin="bevel"
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
        Menu
      </button>
      <div id=${id} popover class="menu-popover" style="--menu-anchor: ${anchor}">
        ${mainNav ? mainNavEl(true) : nothing}
        <nav class="menu" aria-label=${`${label} menu`}>
          <ul>
            ${items}
          </ul>
        </nav>
        ${this.schemeControl('menu')}
      </div>
      ${mainNav ? mainNavEl(false) : nothing}`;
    return html`
      <header part="header" class=${vendor ? 'vendor' : ''}>
        ${this.lightDom ? nothing : html`<slot name="skip-link"></slot><slot name="alerts"></slot>`}
        <a class="logo" href=${siteLink(root, '/')}
          ><img src=${this.logoSrc()} alt="UVA Library home" width="304" height="69"
        /></a>
        <div class="utility-row">
          <nav class="inline" aria-label=${label}>
            <ul>
              ${items}
            </ul>
          </nav>
          ${this.schemeControl('inline')}
        </div>
        ${vendor ? nothing : menu}
      </header>
      ${
        this.lightDom
          ? nothing
          : html`<div hidden>
                <slot name="site-links" @slotchange=${this.onSourcesChange}></slot>
              </div>
              <div hidden>
                <slot name="main-nav" @slotchange=${this.onSourcesChange}></slot>
              </div>`
      }
    `;
  }

  render() {
    const root = this.rootLinkDomain;
    const vendor = this.variant === 'vendor';
    const own = vendor ? null : this.siteLinks;
    const items = own
      ? own.map(
          (l) =>
            html`<li>
              <a
                href=${l.href}
                aria-current=${ifDefined(l.current)}
                target=${ifDefined(l.target)}
                rel=${ifDefined(l.rel)}
                hreflang=${ifDefined(l.hreflang)}
                >${l.text}</a
              >
            </li>`,
        )
      : (vendor ? VENDOR_LINKS : FULL_LINKS).map(
          (l) => html`<li><a href=${siteLink(root, l.path)}>${l.label}</a></li>`,
        );
    const label = own ? this.siteLinksLabel || 'Site' : 'Utility';
    const id = this.menuId;
    const anchor = `--${id}`;
    const mainNav = !vendor && !this.noMainNav;
    // Without the main navigation the header renders exactly what it did before it existed,
    // whitespace included: these two templates are kept verbatim (prettier-ignore).
    // prettier-ignore
    const classic = html`<button
                  popovertarget=${id}
                  aria-controls=${id}
                  class="menu-toggle"
                  style="anchor-name: ${anchor}"
                >
                  <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="butt"
                    stroke-linejoin="bevel"
                  >
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </svg>
                  Menu
                </button>
                <nav class="menu" aria-label=${`${label} menu`}>
                  <ul id=${id} popover style="--menu-anchor: ${anchor}">
                    ${items}
                  </ul>
                </nav>`;
    // prettier-ignore
    const classicHidden = html`<div hidden>
              <slot name="site-links" @slotchange=${this.onSourcesChange}></slot>
            </div>`;
    const mainNavEl = (accordion: boolean) =>
      html`<site-main-nav
        class=${accordion ? 'accordion' : 'bar'}
        layout=${ifDefined(accordion ? 'accordion' : undefined)}
        ?no-shadow-dom=${this.lightDom}
        ?no-style=${this.noStyle}
        label=${this.mainNavLabel || 'Main'}
        root-link-domain=${root}
        items-src=${ifDefined(this.mainNavSrc || undefined)}
        current=${ifDefined(this.mainNavCurrent || undefined)}
        .items=${this.mainNavItems ?? undefined}
        @site-main-nav-error=${accordion ? stopEvent : nothing}
      ></site-main-nav>`;
    // With it: the Menu popover holds the accordion and then the utility links, and the bar
    // is the header's last child, a row of its own.
    const withMainNav = html`<button
        popovertarget=${id}
        aria-controls=${id}
        class="menu-toggle"
        style="anchor-name: ${anchor}"
      >
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="butt"
          stroke-linejoin="bevel"
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
        Menu
      </button>
      <div id=${id} popover class="menu-popover" style="--menu-anchor: ${anchor}">
        ${mainNavEl(true)}
        <nav class="menu" aria-label=${`${label} menu`}>
          <ul>
            ${items}
          </ul>
        </nav>
      </div>
      ${mainNavEl(false)}`;
    const withMainNavHidden = html`<div hidden>
        <slot name="site-links" @slotchange=${this.onSourcesChange}></slot>
      </div>
      <div hidden>
        <slot name="main-nav" @slotchange=${this.onSourcesChange}></slot>
      </div>`;
    if (this.scheme.active) return this.renderWithScheme(items, label, mainNav, mainNavEl);
    return html`
      <header part="header" class=${vendor ? 'vendor' : ''}>
        ${this.lightDom ? nothing : html`<slot name="skip-link"></slot><slot name="alerts"></slot>`}
        <a class="logo" href=${siteLink(root, '/')}
          ><img src=${this.logoSrc()} alt="UVA Library home" width="304" height="69"
        /></a>
        <nav class="inline" aria-label=${label}>
          <ul>
            ${items}
          </ul>
        </nav>
        ${vendor ? nothing : mainNav ? withMainNav : classic}
      </header>
      ${this.lightDom ? nothing : mainNav ? withMainNavHidden : classicHidden}
    `;
  }
}
