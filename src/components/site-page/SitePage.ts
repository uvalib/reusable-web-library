import { html, css, nothing, type PropertyValues } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { property } from 'lit/decorators.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { tokens } from '../../styles/tokens.js';
import { base, TYPEKIT_URL } from '../../styles/base.js';
import { accessible } from '../../styles/accessible.js';
import { ALERTS_TAG, alertsBase, isAlertsEnv, loadAlerts } from './alerts.js';

export { ALERTS_PRODUCTION_SRC, ALERTS_STAGING_SRC } from './alerts.js';
export type { AlertsEnv } from './alerts.js';

/** The alert elements, in document order: header banner, alert list, regional alerts. */
const ALERT_SHOWS = ['header', 'list', 'regional'] as const;

const slotOf = (n: Node): string | null => (n instanceof Element ? n.getAttribute('slot') : null);

/**
 * Page wrapper: skip link (inside the header landmark in shadow mode), header, a single `<main>`, footer (unless `no-footer`), and global page styles.
 * Side-effect free: `site-page.ts` registers `<site-header>` and `<site-footer>`.
 *
 * Shows live UVA Library alerts by default: a `<uvalib-alerts show="header">` banner inside
 * the header landmark, after the skip link, and `<uvalib-alerts show="list">` then
 * `show="regional"` as the first children of `<main>`. The alerts component is loaded once
 * per document, with a module script, from the alerts CDN (`alerts-env`, or `alerts-src`);
 * if it fails to load, one console warning is logged and the page works as before.
 * `no-alerts` renders no alert elements and loads nothing.
 *
 * @tagname site-page
 * @slot - Main page content, rendered inside the single `<main>`.
 * @slot pre-footer - Optional content shown in a band above the footer.
 * @slot site-links - Optional `<a href>` elements, forwarded to `<site-header>`, that replace the library utility links in the header (inline nav and Menu popover). Ignored with `header-variant="vendor"`.
 * @csspart main - The `<main>` landmark.
 * @csspart header - The `<header>` element inside `<site-header>` (shadow mode; exported through `exportparts`).
 * @csspart footer - The `<footer>` element inside `<site-footer>` (shadow mode; exported through `exportparts`).
 * @cssprop [--uva-brand-blue=#232d4b] - Skip link background.
 * @cssprop [--uva-brand-orange=#e57200] - Focus ring colour (focus-visible outline).
 * @cssprop [--uva-font-family=franklin-gothic-urw, Arial, Helvetica, sans-serif] - Page font family (global styles).
 * @cssprop [--uva-font-size-base=17px] - Page base font size (global styles).
 * @cssprop [--uva-grey-darkest=#2b2b2b] - Page text colour (global styles).
 */
export class SitePage extends UvalibElement {
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
  private alertsUrl = alertsBase('production');
  /** Light mode: the alert elements this element created (header, list, regional). */
  private lightAlerts?: HTMLElement[];

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.noGlobalStyles && !this.globalsInstalled) {
      this.globalsInstalled = true;
      this.installGlobalStyles(this.ownerDocument);
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

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has('alertsEnv') && this.alertsEnv && !isAlertsEnv(this.alertsEnv)) {
      console.warn(
        `${this.localName}: unknown alerts-env "${this.alertsEnv}"; using production. Valid values: production, staging.`,
      );
    }
    this.alertsUrl = alertsBase(this.alertsEnv, this.alertsSrc);
  }

  protected override updated(): void {
    if (this.lightDom) this.syncLightAlerts();
    if (!this.noAlerts) loadAlerts(this.ownerDocument, this.alertsUrl);
  }

  /**
   * Light mode keeps <main> free of Lit parts, so the alert elements are managed here: the
   * header one is handed to <site-header> as a `slot="alerts"` child (it moves it into its
   * <header>), and list and regional stay the first children of <main>. They are chrome, so
   * route() never moves them.
   */
  private syncLightAlerts(): void {
    const main = this.querySelector(':scope > main');
    const header = this.querySelector(':scope > site-header');
    if (!main || !header) return;
    if (this.noAlerts) {
      for (const a of this.lightAlerts ?? []) a.remove();
      this.lightAlerts = undefined;
      return;
    }
    this.lightAlerts ??= ALERT_SHOWS.map((show) => {
      const a = this.ownerDocument.createElement(ALERTS_TAG);
      a.setAttribute('show', show);
      if (show === 'header') a.slot = 'alerts';
      this.chrome.add(a);
      return a;
    });
    const [top, list, regional] = this.lightAlerts as [HTMLElement, HTMLElement, HTMLElement];
    for (const a of this.lightAlerts) {
      if (a.getAttribute('src') !== this.alertsUrl) a.setAttribute('src', this.alertsUrl);
    }
    if (!header.contains(top)) header.append(top);
    if (main.firstChild !== list || list.nextSibling !== regional) main.prepend(list, regional);
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
   * site links to the header.
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
      (slot === 'pre-footer' ? footer : slot === 'site-links' ? header : main).append(n);
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
    const alert = (show: (typeof ALERT_SHOWS)[number]) =>
      html`<uvalib-alerts
        slot=${ifDefined(show === 'header' ? 'alerts' : undefined)}
        show=${show}
        src=${this.alertsUrl}
      ></uvalib-alerts>`;
    return html`
      ${light ? skip : nothing}
      <site-header
        exportparts="header"
        ?no-shadow-dom=${light}
        ?no-style=${this.noStyle}
        variant=${this.headerVariant}
        root-link-domain=${this.rootLinkDomain}
        site-links-label=${ifDefined(this.siteLinksLabel)}
        >${
          light
            ? nothing
            : html`${skip}${alerts ? alert('header') : nothing}<slot
                  name="site-links"
                  slot="site-links"
                ></slot>`
        }</site-header
      >
      ${
        light
          ? html`<main id="main-content" tabindex="-1" part="main"></main>`
          : html`<main id="main-content" tabindex="-1" part="main">
              ${alerts ? html`${alert('list')}${alert('regional')}` : nothing}<slot></slot>
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
