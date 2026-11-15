import { html, css, nothing, type PropertyValues } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { property, state } from 'lit/decorators.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { tokens } from '../../styles/tokens.js';
import { base, TYPEKIT_URL } from '../../styles/base.js';
import { accessible } from '../../styles/accessible.js';
import {
  applyPreference,
  colorSchemeSupported,
  installColorSchemeStyles,
  readPreference,
} from '../../base/color-scheme.js';
import {
  ALERTS_PRODUCTION_SRC,
  ALERTS_TAG,
  alertsBase,
  isAlertsEnv,
  loadAlerts,
} from './alerts.js';

export { ALERTS_PRODUCTION_SRC, ALERTS_STAGING_SRC } from './alerts.js';
export type { AlertsEnv } from './alerts.js';

/** The alert elements' `show` values: header banner, alert list, regional alerts. */
type AlertShow = 'header' | 'list' | 'regional';
/** Accessible name of the list band region. */
const ALERTS_LIST_LABEL = 'Library alerts';

const slotOf = (n: Node): string | null => (n instanceof Element ? n.getAttribute('slot') : null);

/**
 * Page wrapper: skip link (inside the header landmark in shadow mode), header, a single `<main>`, footer (unless `no-footer`), and global page styles.
 * Side-effect free: `site-page.ts` registers `<site-header>` (and its `<site-main-nav>`) and `<site-footer>`.
 *
 * The header shows the UVA Library main navigation by default (`no-main-nav` turns it off;
 * `header-variant="vendor"` never shows it).
 *
 * Shows live UVA Library alerts by default, placed as Virgo places them: a full-bleed
 * `<uvalib-alerts show="header">` banner at the top of the header landmark (after the skip
 * link), a full-bleed band between the header and `<main>` holding `<uvalib-alerts show="list">`
 * (a `<section aria-label="Library alerts">` region, hidden while the list has nothing to
 * show), and `<uvalib-alerts show="regional">` as the first child of `<main>`, inside its
 * padding. The alerts component is loaded once
 * per document, with a module script, from the alerts CDN (`alerts-env`, or `alerts-src`);
 * if it fails to load, one console warning is logged and the page works as before.
 * `no-alerts` renders no alert elements and loads nothing.
 *
 * @tagname site-page
 * @slot - Main page content, rendered inside the single `<main>`.
 * @slot pre-footer - Optional content shown in a band above the footer.
 * @slot site-links - Optional `<a href>` elements, forwarded to `<site-header>`, that replace the library utility links in the header (inline nav and Menu popover). Ignored with `header-variant="vendor"`.
 * @slot main-nav - Optional `<nav>` forwarded to `<site-header>`, whose list replaces the UVA Library main navigation's links (see `<site-main-nav>`). Ignored with `no-main-nav` and `header-variant="vendor"`.
 * @csspart main - The `<main>` landmark.
 * @csspart header - The `<header>` element inside `<site-header>` (shadow mode; exported through `exportparts`).
 * @csspart footer - The `<footer>` element inside `<site-footer>` (shadow mode; exported through `exportparts`).
 * @cssprop [--uva-brand-blue=#232d4b] - Skip link background.
 * @cssprop [--uva-brand-orange=#e57200] - Focus ring colour (focus-visible outline).
 * @cssprop [--uva-font-family=franklin-gothic-urw, Arial, Helvetica, sans-serif] - Page font family (global styles).
 * @cssprop [--uva-font-size-base=17px] - Page base font size (global styles).
 * @cssprop [--uva-grey-darkest=#2b2b2b] - Page text colour (global styles).
 * @cssprop --uva-color-surface - Dark-mode role token: page background (global styles; else none).
 * @cssprop --uva-color-text - Dark-mode role token: page text (global styles; else `--uva-grey-darkest`).
 * @cssprop --uva-color-accent-bg - Dark-mode role token: skip-link background (else `--uva-brand-blue`).
 * @cssprop --uva-color-on-accent - Dark-mode role token: skip-link text (else #fff).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 */
export class SitePage extends UvalibElement {
  /** The page's content keeps the page's own colour scheme. */
  protected static override hostColorScheme = false;
  @property({ type: String, attribute: 'root-link-domain' }) rootLinkDomain =
    'https://www.library.virginia.edu';
  @property({ type: String, attribute: 'header-variant' }) headerVariant: 'full' | 'vendor' =
    'full';
  @property({ type: Boolean, attribute: 'no-global-styles' }) noGlobalStyles = false;
  /**
   * Hide the footer (and any pre-footer band), for tools and app-like pages where the site
   * footer does not belong. The footer is kept hidden rather than removed, so toggling the
   * attribute keeps pre-footer content.
   */
  @property({ type: Boolean, attribute: 'no-footer', reflect: true }) noFooter = false;
  /** Accessible name of the header navigation when site links are given (default "Site"). */
  @property({ type: String, attribute: 'site-links-label' }) siteLinksLabel?: string;
  /** Hide the UVA Library main navigation in the header. */
  @property({ type: Boolean, attribute: 'no-main-nav' }) noMainNav = false;
  /** Accessible name of the header's main navigation (default "Main"). */
  @property({ type: String, attribute: 'main-nav-label' }) mainNavLabel?: string;
  /** URL of JSON main navigation items, forwarded to `<site-header main-nav-src>`. */
  @property({ type: String, attribute: 'main-nav-src' }) mainNavSrc?: string;
  /**
   * The URL whose main-navigation link is marked current, forwarded to `<site-header
   * main-nav-current>`. Default: the page location, followed through same-document
   * navigations; set it when a single-page app's route is not its URL.
   */
  @property({ type: String, attribute: 'main-nav-current' }) mainNavCurrent?: string;
  /**
   * Alerts environment: `production` (default) or `staging`. Any other value logs one
   * console warning and uses production. Ignored when `alerts-src` is set.
   */
  @property({ type: String, attribute: 'alerts-env' }) alertsEnv = 'production';
  /**
   * Alerts base URL (holding `config.json`, `alerts.json` and `v1/uvalib-alerts.js`); overrides
   * `alerts-env`. For a custom domain, local development and tests.
   */
  @property({ type: String, attribute: 'alerts-src' }) alertsSrc?: string;
  /** Render no alert elements and load no alerts script. */
  @property({ type: Boolean, attribute: 'no-alerts' }) noAlerts = false;
  /**
   * Opt in to dark mode, forwarded to `<site-header color-scheme-switch>`: the page follows
   * the OS preference, and a Light / Dark / System control in the header lets the visitor
   * override it (remembered per site). Off by default: the page is always light. The page's
   * own content must support it (see the README's "Dark mode").
   */
  @property({ type: Boolean, attribute: 'color-scheme-switch' }) colorSchemeSwitch = false;

  static styles = [
    accessible,
    css`
      :host {
        display: block;
      }
      site-header,
      site-footer,
      main {
        display: block;
        width: 100%;
      }
      site-footer[hidden] {
        display: none;
      }
      /* Virgo's alert list: a full-bleed band flush under the header, above main's padding. */
      .alerts-list {
        display: block;
        width: 100%;
        margin: 0;
        padding: 0;
      }
      .alerts-list[hidden] {
        display: none;
      }
      .alerts-list > uvalib-alerts {
        display: block;
      }
      /* Old layout: .main-container-inner (max 1600px, centred) > .w3-row-padding 8px
         > .w3-col 8px > .d8-fade 24px = 40px each side; 12px margin + 24px padding below. */
      main {
        box-sizing: border-box;
        max-width: 1600px;
        margin: 0 auto;
        padding: 36px 40px;
      }
      @media screen and (min-width: 993px) {
        main {
          padding-top: 24px; /* old: .breadcrumb-found dropped its 12px top margin */
        }
      }
    `,
  ];

  /** Light mode: nodes this element rendered itself (incl. Lit markers), never routed. */
  private chrome = new WeakSet<Node>();
  private observer?: MutationObserver;
  private globalsInstalled = false;
  /** The alerts base URL in use, from `alerts-src` or `alerts-env`. */
  private alertsUrl = ALERTS_PRODUCTION_SRC;
  /** Light mode: the alert elements this element created, and the list band. */
  private lightAlerts?: {
    top: HTMLElement;
    band: HTMLElement;
    list: HTMLElement;
    regional: HTMLElement;
  };
  /** Whether the list alerts have anything to show, from their last update event. */
  @state() private listShown = false;

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.noGlobalStyles && !this.globalsInstalled) {
      this.globalsInstalled = true;
      this.installGlobalStyles(this.ownerDocument);
    }
    // As early as possible, before the header renders: the stored choice, so pages without
    // the inline snippet flash as little as possible. The header keeps it current after.
    const doc = this.ownerDocument;
    if (this.colorSchemeSwitch && colorSchemeSupported(doc)) {
      if (!this.noStyle) installColorSchemeStyles(doc);
      applyPreference(doc, readPreference(doc), this.noStyle);
    }
    // Reconnect after a disconnect; the first connect starts routing in update().
    if (this.lightDom && this.hasUpdated) {
      this.route(this.childNodes);
      this.observe();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.observer?.disconnect();
  }

  private installGlobalStyles(doc: Document): void {
    // Tokens stay layered so a host's own `:root { --uva-*: … }` wins; base and accessibility
    // rules are unlayered so they beat host resets.
    installLightDomStyles('uvalib-tokens', [tokens], { root: doc, scope: false });
    installLightDomStyles('uvalib-global', [base, accessible], {
      root: doc,
      scope: false,
      layer: false,
    });
    if (!doc.head.querySelector(`link[href="${TYPEKIT_URL}"]`)) {
      const link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.href = TYPEKIT_URL;
      doc.head.append(link);
    }
  }

  /** The list element's `uvalib-alerts-update`: show the band only while it lists alerts. */
  private onListUpdate(e: Event): void {
    if (e.target !== e.currentTarget) return;
    const detail = (e as CustomEvent<{ menuAlerts?: unknown[] }>).detail;
    this.listShown = Array.isArray(detail?.menuAlerts) && detail.menuAlerts.length > 0;
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has('noAlerts') && this.noAlerts) this.listShown = false;
    if (changed.has('alertsEnv') && this.alertsEnv && !isAlertsEnv(this.alertsEnv)) {
      console.warn(
        `${this.localName}: unknown alerts-env "${this.alertsEnv}"; using production. Valid values: production, staging.`,
      );
    }
    try {
      this.alertsUrl = alertsBase(this.alertsEnv, this.alertsSrc, this.ownerDocument.baseURI);
    } catch {
      if (changed.has('alertsSrc')) {
        console.warn(
          `${this.localName}: alerts-src "${this.alertsSrc}" is not a URL; ignoring it.`,
        );
      }
      this.alertsUrl = alertsBase(this.alertsEnv, null, this.ownerDocument.baseURI);
    }
  }

  protected override updated(): void {
    if (this.lightDom) this.syncLightAlerts();
    if (!this.noAlerts) loadAlerts(this.ownerDocument, this.alertsUrl);
  }

  /**
   * Light mode keeps <main> free of Lit parts, so the alert elements are managed here: the
   * header one is handed to <site-header> as a `slot="alerts"` child (it moves it into its
   * <header>), the list band goes right after <site-header>, and regional stays the first
   * child of <main>. The band and the elements are chrome, so route() never moves them.
   */
  private syncLightAlerts(): void {
    const main = this.querySelector(':scope > main');
    const header = this.querySelector(':scope > site-header');
    if (!main || !header) return;
    if (this.noAlerts) {
      const a = this.lightAlerts;
      for (const n of a ? [a.top, a.band, a.regional] : []) n.remove();
      this.lightAlerts = undefined;
      return;
    }
    if (!this.lightAlerts) {
      const doc = this.ownerDocument;
      const make = (show: AlertShow) => {
        const a = doc.createElement(ALERTS_TAG);
        a.setAttribute('show', show);
        this.chrome.add(a);
        return a;
      };
      const top = make('header');
      top.slot = 'alerts';
      const list = make('list');
      list.addEventListener('uvalib-alerts-update', (e) => this.onListUpdate(e));
      const band = doc.createElement('section');
      band.className = 'alerts-list';
      band.setAttribute('aria-label', ALERTS_LIST_LABEL);
      band.append(list);
      this.chrome.add(band);
      this.lightAlerts = { top, band, list, regional: make('regional') };
    }
    const { top, band, list, regional } = this.lightAlerts;
    for (const a of [top, list, regional]) {
      if (a.getAttribute('src') !== this.alertsUrl) a.setAttribute('src', this.alertsUrl);
    }
    band.hidden = !this.listShown;
    if (!header.contains(top)) header.append(top);
    // Directly after <site-header>, before any Lit marker, so no part ever clears it.
    if (header.nextSibling !== band) header.after(band);
    if (main.firstChild !== regional) main.prepend(regional);
  }

  protected override update(changed: PropertyValues): void {
    if (this.hasUpdated || !this.lightDom) {
      super.update(changed);
      return;
    }
    const content = [...this.childNodes];
    super.update(changed); // first render appends the chrome after the content
    for (const n of this.childNodes) if (!content.includes(n)) this.chrome.add(n);
    this.route(content);
    this.observe();
  }

  private observe(): void {
    this.observer ??= new MutationObserver((records) => {
      for (const r of records) this.route(r.addedNodes);
    });
    this.observer.observe(this, { childList: true });
  }

  /**
   * Light mode has no slots: move content into `<main>`, pre-footer nodes to the footer and
   * site links and main-nav markup to the header.
   */
  private route(nodes: Iterable<Node>): void {
    const main = this.querySelector(':scope > main');
    const header = this.querySelector(':scope > site-header');
    const footer = this.querySelector(':scope > site-footer');
    if (!main || !header || !footer) return;
    for (const n of [...nodes]) {
      if (n.parentNode !== this || this.chrome.has(n)) continue;
      if (n.nodeType === Node.TEXT_NODE && !n.textContent?.trim()) continue;
      // The header and footer adopt their own slotted children, even before they upgrade.
      const slot = slotOf(n);
      const to =
        slot === 'pre-footer'
          ? footer
          : slot === 'site-links' || slot === 'main-nav'
            ? header
            : main;
      to.append(n);
    }
  }

  private onSkip(e: Event): void {
    e.preventDefault();
    this.renderRoot.querySelector<HTMLElement>('main')?.focus();
  }

  protected override render() {
    const light = this.lightDom;
    // Light mode keeps <main> and <site-footer> free of Lit parts so moved content is never cleared.
    const skip = html`<a
      class="skip-link"
      href="#main-content"
      slot=${ifDefined(light ? undefined : 'skip-link')}
      @click=${this.onSkip}
      >Skip to main content</a
    >`;
    // Shadow mode: the link is slotted into <site-header>'s <header> landmark, because axe
    // looks the #main-content target up on the document and cannot see it in this shadow root,
    // so it would flag a skip link that sits outside every landmark ("region").
    // Light mode: the link stays the first child, where the target resolves.
    const alerts = !this.noAlerts && !light;
    const alert = (show: AlertShow) =>
      html`<uvalib-alerts
        slot=${ifDefined(show === 'header' ? 'alerts' : undefined)}
        show=${show}
        src=${this.alertsUrl}
      ></uvalib-alerts>`;
    // Shadow mode's list band; light mode builds the same in syncLightAlerts().
    const band = html`<section
      class="alerts-list"
      aria-label=${ALERTS_LIST_LABEL}
      ?hidden=${!this.listShown}
    >
      <uvalib-alerts
        show="list"
        src=${this.alertsUrl}
        @uvalib-alerts-update=${this.onListUpdate}
      ></uvalib-alerts>
    </section>`;
    return html`
      ${light ? skip : nothing}
      <site-header
        exportparts="header"
        ?no-shadow-dom=${light}
        ?no-style=${this.noStyle}
        variant=${this.headerVariant}
        root-link-domain=${this.rootLinkDomain}
        site-links-label=${ifDefined(this.siteLinksLabel)}
        ?no-main-nav=${this.noMainNav}
        main-nav-label=${ifDefined(this.mainNavLabel)}
        main-nav-src=${ifDefined(this.mainNavSrc)}
        main-nav-current=${ifDefined(this.mainNavCurrent)}
        ?color-scheme-switch=${this.colorSchemeSwitch}
        >${
          light
            ? nothing
            : html`${skip}${alerts ? alert('header') : nothing}<slot
                  name="site-links"
                  slot="site-links"
                ></slot
                ><slot name="main-nav" slot="main-nav"></slot>`
        }</site-header
      >
      ${alerts ? band : nothing}
      ${
        light
          ? html`<main id="main-content" tabindex="-1" part="main"></main>`
          : html`<main id="main-content" tabindex="-1" part="main">
              ${alerts ? alert('regional') : nothing}<slot></slot>
            </main>`
      }
      ${
        light
          ? html`<site-footer
              no-shadow-dom
              ?hidden=${this.noFooter}
              ?no-style=${this.noStyle}
              root-link-domain=${this.rootLinkDomain}
            ></site-footer>`
          : html`<site-footer
              exportparts="footer"
              ?hidden=${this.noFooter}
              ?no-style=${this.noStyle}
              root-link-domain=${this.rootLinkDomain}
              ><slot name="pre-footer" slot="pre-footer"></slot
            ></site-footer>`
      }
    `;
  }
}
