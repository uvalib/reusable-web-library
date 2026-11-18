import { css, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { html, unsafeStatic } from 'lit/static-html.js';
import { property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { trackContent, trackEvent } from '../../base/analytics.js';
import { accessible } from '../../styles/accessible.js';
import { ALERTS_PRODUCTION_SRC, alertsBase, isAlertsEnv } from './alerts.js';
import {
  subscribeAlerts,
  type AlertsSnapshot,
  type AlertsSubscription,
  type SiteAlert,
} from './alerts-source.js';
import { setBody } from './body.js';
import { closeIcon, criticalIcon, infoIcon, warningIcon } from './icons.js';
import { dismissedKey, dismissedStore, type DismissedStore } from './dismissed.js';

export type { SiteAlert } from './alerts-source.js';

/** Which alerts a `<site-alerts>` shows. */
export type SiteAlertsShow = 'all' | 'header' | 'list' | 'regional' | 'sitewide';
type Part = 'header' | 'list' | 'regional';

/** Severity, never by colour alone (WCAG 1.4.1): a decorative icon and text for assistive tech. */
const SEVERITY = {
  alert1: { label: 'Critical:', icon: criticalIcon },
  alert2: { label: 'Warning:', icon: warningIcon },
  alert3: { label: 'Information:', icon: infoIcon },
} as const;
type Severity = keyof typeof SEVERITY;
/** List alerts: a severity this element does not know is shown as information. */
const severityOf = (a: SiteAlert): Severity =>
  Object.hasOwn(SEVERITY, a.severity) ? (a.severity as Severity) : 'alert3';

const EMPTY: AlertsSnapshot = {
  alerts: [],
  seenAlerts: [],
  headerAlerts: [],
  menuAlerts: [],
  regionalAlerts: [],
  status: '',
};
const DEFAULT_LEVEL = 2;

/** Analytics names are capped at 100 characters. */
const cap = (s: string) => (s.length > 100 ? s.slice(0, 100) : s);
/** The alerts already reported as seen in this document (page view), shared by every copy. */
const IMPRESSIONS = Symbol.for('uvalib.site-alerts.impressions');
const impressions = (doc: Document): Set<string> =>
  ((doc as unknown as Record<symbol, Set<string>>)[IMPRESSIONS] ??= new Set());

/**
 * Kept with `no-style`: severity text stays visually hidden, the icons keep a size and
 * `[hidden]` hides. `host` is `:host` (shadow) or the tag name (light DOM, so they stay scoped).
 */
const structuralRules = (host: string) => `
  ${host} { display: block; }
  ${host}[hidden], ${host} [hidden] { display: none !important; }
  ${host} .visually-hidden { position: absolute; width: 1px; height: 1px; margin: -1px;
    padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  ${host} .icon { width: 2rem; height: 2rem; }
  ${host} .dismiss .icon { width: 1.5rem; height: 1.5rem; }
`;
const shadowStructure = unsafeCSS(structuralRules(':host'));

/**
 * Live UVA Library alerts, drawn as library.virginia.edu draws them. The alerts project
 * (github.com/uvalib/uvalib-alerts) keeps the data: a headless `<uvalib-alerts>` loaded at
 * runtime from the alerts CDN (`alerts-env`, or `alerts-src`), one per document, shared by
 * every `<site-alerts>` and created hidden at the end of `<body>`. It keeps the live
 * connection, the dismissals (per site, synced across tabs) and the regional matching (the
 * page URL, followed through single-page-app navigation). If its script fails to load, one
 * console warning is logged and nothing is shown.
 *
 * `show` picks the alerts: `header` (the banner: a polite `role="status"` row on teal),
 * `list` (critical, warning and information alerts, most severe first; only critical ones
 * are an assertive `role="alert"`), `regional` (alerts targeted at this page), `sitewide`
 * (header and list) or `all` (the default). Each list alert has a decorative icon and a
 * visually hidden "Critical:", "Warning:" or "Information:" before its title, a heading
 * (`heading-level`, default 2, as on library.virginia.edu). Warning and information alerts
 * have a dismiss button; after a dismissal focus moves to the next alert's button (or the
 * alert), else to the page's `<main>`, never to `<body>`. Alert bodies are server-sanitized
 * HTML, re-sanitized with the browser's `setHTML()` where it exists.
 *
 * `<site-page>` places three of these itself (banner, list band, regional); use this element
 * directly only on pages without `<site-page>`.
 *
 * @tagname site-alerts
 * @fires site-alerts-change - The number of alerts this element shows changed: `detail` is `{ count }`. Bubbles and is composed. The host also has `data-empty` while it shows none.
 * @cssprop [--uva-teal=#25cad3] - Header banner background.
 * @cssprop [--uva-red-100=#fbcfda] - Critical alert background (`--uva-red-B` #b30000 border).
 * @cssprop [--uva-yellow-100=#fef6c8] - Warning alert and regional alert background (`--uva-yellow` #ecc602 border).
 * @cssprop [--uva-blue-alt-300=#bfe7f7] - Information alert background (`--uva-blue-alt` #007bac border).
 * @cssprop [--uva-teal-200=#c8f2f4] - Information regional alert background (`--uva-teal` border).
 * @cssprop [--uva-grey-darkest=#2b2b2b] - Alert text.
 * @cssprop [--uva-blue-alt-B=#141e3c] - Links in alert text.
 * @cssprop --uva-color-alert-text - Dark-mode role token: alert text, icons and focus ring (else `--uva-grey-darkest`; the banner's is `--uva-color-alert-header-text`, else #000).
 * @cssprop --uva-color-alert-link - Dark-mode role token: links in alert text (else `--uva-blue-alt-B`).
 * @cssprop --uva-color-alert-header-bg - Dark-mode role token: banner background (else `--uva-teal`).
 * @cssprop --uva-color-alert-critical-bg - Dark-mode role token: critical alert background; `-border` for its border. Also `--uva-color-alert-warning-*`, `--uva-color-alert-info-*`, `--uva-color-alert-regional-*` and `--uva-color-alert-regional-info-*`.
 */
export class SiteAlerts extends UvalibElement {
  static styles = [
    accessible,
    shadowStructure,
    css`
      :host {
        color: var(--uva-color-alert-text, var(--uva-grey-darkest, #2b2b2b));
        font-size: 1rem;
        line-height: 1.5;
        text-align: left;
        overflow-wrap: anywhere;
      }
      .body a {
        color: var(--uva-color-alert-link, var(--uva-blue-alt-B, #141e3c));
        text-decoration: underline;
      }
      /* WCAG 1.4.11: the ring is drawn on the alert's own background, so it follows the text
         colour, which is chosen to read on that background (alerts project, focus.test.ts). */
      .dismiss:focus-visible,
      .body a:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }
      .body p {
        margin: 0;
      }

      /* Header banner (library.virginia.edu's .alert4). */
      .banner {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0 1.25rem;
        padding: 0.25rem 0.5rem;
        background: var(--uva-color-alert-header-bg, var(--uva-teal, #25cad3));
        color: var(--uva-color-alert-header-text, #000);
        text-align: center;
      }
      .banner .title {
        font-weight: 700;
      }
      .banner .body,
      .banner .body p {
        display: inline;
      }

      /* List alerts (.uva-alert--sitewide .alert1-3). */
      .alert {
        position: relative;
        min-height: 2rem;
        padding: 0.55rem 0.5rem 0.55rem 3.25rem;
        border-left: 10px solid;
      }
      .alert.dismissible {
        padding-right: calc(44px + 1rem);
      }
      .alert > .icon {
        position: absolute;
        top: 0.55rem;
        left: 0.55rem;
      }
      .alert .title {
        margin: 0;
        padding-block-end: 0.25rem;
        font-family: inherit;
        font-size: 1.2rem;
        font-weight: 500;
        line-height: 1.15;
        color: inherit;
      }
      .alert .body p {
        padding-block-end: 0.25rem;
      }
      .alert1 {
        background: var(--uva-color-alert-critical-bg, var(--uva-red-100, #fbcfda));
        border-left-color: var(--uva-color-alert-critical-border, var(--uva-red-B, #b30000));
      }
      .alert2 {
        background: var(--uva-color-alert-warning-bg, var(--uva-yellow-100, #fef6c8));
        border-left-color: var(--uva-color-alert-warning-border, var(--uva-yellow, #ecc602));
      }
      .alert3 {
        background: var(--uva-color-alert-info-bg, var(--uva-blue-alt-300, #bfe7f7));
        border-left-color: var(--uva-color-alert-info-border, var(--uva-blue-alt, #007bac));
      }
      /* WCAG 2.5.8 (AA, 24px) and 2.5.5 (AAA, 44px): a 44px target, inside the alert so the
         focus ring stays on its background. */
      .dismiss {
        position: absolute;
        top: 0.25rem;
        right: 0.25rem;
        display: grid;
        place-items: center;
        box-sizing: border-box;
        width: 44px;
        height: 44px;
        margin: 0;
        padding: 0;
        border: 0;
        border-radius: 4px;
        background: none;
        color: inherit;
        font: inherit;
        cursor: pointer;
      }

      /* Regional alerts (.uva-alert--r1, and .uva-alert--r2 for information). */
      .regional {
        margin: 0 0 1rem;
        padding: 0.75rem 1rem;
        border: 0.2em solid var(--uva-color-alert-regional-border, var(--uva-yellow, #ecc602));
        border-radius: 0.5em;
        background: var(--uva-color-alert-regional-bg, var(--uva-yellow-100, #fef6c8));
      }
      .regional.info {
        border-color: var(--uva-color-alert-regional-info-border, var(--uva-teal, #25cad3));
        background: var(--uva-color-alert-regional-info-bg, var(--uva-teal-200, #c8f2f4));
      }

      /* Forced colors drop the backgrounds: every alert keeps a system-colour boundary; the
         icons and hidden labels carry the severity. */
      @media (forced-colors: active) {
        .banner,
        .alert,
        .regional {
          border: 1px solid CanvasText;
        }
        .alert {
          border-left-width: 10px;
        }
        .dismiss {
          color: ButtonText;
        }
        .dismiss:focus-visible,
        .body a:focus-visible {
          outline-color: Highlight;
        }
      }
    `,
  ];

  /** Which alerts to show: `header`, `list`, `regional`, `sitewide` (header and list) or `all`. */
  @property({ type: String }) show: SiteAlertsShow = 'all';
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
  /** The level of each list alert's title heading, 1 to 6 (default 2). */
  @property({ type: Number, attribute: 'heading-level' }) headingLevel = DEFAULT_LEVEL;
  /**
   * The localStorage key for dismissed alerts, passed to the headless element (default: the
   * alerts project's, `uvalib-alerts-seen`). Elements with different keys use different
   * headless elements.
   */
  @property({ type: String, attribute: 'storage-key' }) storageKey?: string;

  /** The headless element's last state. */
  @state() private data: AlertsSnapshot = EMPTY;
  private sub?: AlertsSubscription;
  /** What the reader closed here (Information alerts included), and its unsubscribe. */
  private closed?: { key: string; store: DismissedStore; off: () => void };
  /** The dismissed alert and its place in the list, until it is gone and focus has moved. */
  private pendingFocus?: { uuid: string; index: number };
  private lastCount = 0;

  constructor() {
    super();
    // A link clicked in an alert's body (the URL is not sent). composedPath() finds it in
    // shadow and light DOM alike.
    this.addEventListener('click', (e) => {
      const path = e.composedPath();
      const link = path.find((n) => n instanceof Element && n.matches('a[href]'));
      const body = path.find(
        (n): n is HTMLElement => n instanceof HTMLElement && n.matches('.body[data-uuid]'),
      );
      if (!link || !body || !this.renderRoot.contains(body)) return;
      const a = this.shown().find((x) => x.alert.uuid === body.dataset.uuid);
      if (a) trackEvent(this, ['site-alerts', 'link-click', a.piece]);
    });
  }

  /** Every alert this element shows, with its analytics label, `<severity>: <title>`. */
  private shown(): { alert: SiteAlert; piece: string }[] {
    const d = this.data;
    const label = (a: SiteAlert, part: Part) =>
      part === 'header'
        ? 'Header'
        : part === 'regional'
          ? `Regional ${a.severity === 'alert3' ? 'information' : 'warning'}`
          : SEVERITY[severityOf(a)].label.slice(0, -1);
    const of = (alerts: SiteAlert[], part: Part) =>
      alerts.map((alert) => ({ alert, piece: cap(`${label(alert, part)}: ${alert.title}`) }));
    return [
      ...of(this.has('header') ? d.headerAlerts : [], 'header'),
      ...of(this.list, 'list'),
      ...of(this.has('regional') ? d.regionalAlerts : [], 'regional'),
    ];
  }

  /** A content impression for each alert shown, once per alert per page view. */
  private reportImpressions(): void {
    const seen = impressions(this.ownerDocument);
    for (const { alert, piece } of this.shown()) {
      if (seen.has(alert.uuid)) continue;
      seen.add(alert.uuid);
      trackContent(this, { name: 'Library alert', piece });
    }
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
    // Reconnected: subscribe again in updated().
    if (this.hasUpdated) this.requestUpdate();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.sub?.release();
    this.sub = undefined;
    this.closed?.off();
    this.closed = undefined;
  }

  /** The alerts base URL in use, from `alerts-src` or `alerts-env`. */
  private get base(): string {
    const uri = this.ownerDocument.baseURI;
    try {
      return alertsBase(this.alertsEnv, this.alertsSrc, uri);
    } catch {
      return alertsBase(this.alertsEnv, null, uri);
    }
  }

  private get level(): number {
    const n = Math.trunc(Number(this.headingLevel));
    return n >= 1 && n <= 6 ? n : DEFAULT_LEVEL;
  }

  private has(part: Part): boolean {
    const s = this.show || 'all';
    if (s === 'sitewide') return part !== 'regional';
    return s === part || !['header', 'list', 'regional'].includes(s);
  }

  /** List alerts, most severe first (the headless element's order within a severity). */
  private get list(): SiteAlert[] {
    if (!this.has('list')) return [];
    // As library.virginia.edu: every sitewide alert but the header ones, until the reader
    // closes it here. Information alerts are always "seen" by the headless element (Virgo's
    // rule), so its seen list hides only Warnings (dismissed on another page using it).
    const seen = new Set(this.data.seenAlerts);
    const closed = this.closed?.store;
    return this.data.alerts
      .filter(
        (a) =>
          a.severity !== 'alert4' &&
          !closed?.has(a.uuid) &&
          !(a.severity === 'alert2' && seen.has(a.uuid)),
      )
      .sort((a, b) => severityOf(a).localeCompare(severityOf(b)));
  }

  private get count(): number {
    const d = this.data;
    return (
      (this.has('header') ? d.headerAlerts.length : 0) +
      this.list.length +
      (this.has('regional') ? d.regionalAlerts.length : 0)
    );
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    // Before rendering, so the first render already knows what the reader closed.
    const closedKey = dismissedKey(this.storageKey?.trim());
    if (this.isConnected && this.closed?.key !== closedKey && this.ownerDocument.defaultView) {
      this.closed?.off();
      const store = dismissedStore(this.ownerDocument.defaultView, closedKey);
      this.closed = { key: closedKey, store, off: store.subscribe(() => this.requestUpdate()) };
    }
    if (changed.has('alertsEnv') && this.alertsEnv && !isAlertsEnv(this.alertsEnv)) {
      console.warn(
        `${this.localName}: unknown alerts-env "${this.alertsEnv}"; using production. Valid values: production, staging.`,
      );
    }
    if (changed.has('alertsSrc') && this.alertsSrc?.trim()) {
      try {
        alertsBase(this.alertsEnv, this.alertsSrc, this.ownerDocument.baseURI);
      } catch {
        console.warn(
          `${this.localName}: alerts-src "${this.alertsSrc}" is not a URL; ignoring it.`,
        );
      }
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (this.isConnected) {
      const base = this.base || ALERTS_PRODUCTION_SRC;
      const key = `${base}\n${this.storageKey?.trim() ?? ''}`;
      if (this.sub?.key !== key) {
        this.sub?.release();
        this.sub = subscribeAlerts(this.ownerDocument, base, this.storageKey, (s) => {
          this.data = s;
          // Forget closed alerts that are gone, once there is data to compare with.
          // An empty list is never trusted (data still loading, or a transient blip).
          if ((s.status === 'live' || s.status === 'polling') && s.alerts.length)
            this.closed?.store.keepOnly(s.alerts.map((a) => a.uuid));
        });
      }
    }
    this.fillBodies();
    if (this.isConnected) this.reportImpressions();
    this.moveFocus();
    const count = this.count;
    this.toggleAttribute('data-empty', !count);
    if (count !== this.lastCount) {
      this.lastCount = count;
      this.dispatchEvent(
        new CustomEvent('site-alerts-change', { detail: { count }, bubbles: true, composed: true }),
      );
    }
  }

  private onDismiss(a: SiteAlert, index: number): void {
    this.pendingFocus = { uuid: a.uuid, index };
    const shown = this.shown().find((x) => x.alert.uuid === a.uuid);
    if (shown) trackEvent(this, ['site-alerts', 'dismiss', shown.piece]);
    // Recorded here (Information alerts are already "seen" by the headless element); a
    // Warning is also dismissed there, so pages that use its seen list agree.
    this.closed?.store.add(a.uuid);
    if (severityOf(a) !== 'alert3') this.sub?.dismiss(a.uuid);
  }

  /**
   * After a dismissal has removed its alert: the alert now in its place (or the last one)
   * gets focus, on its dismiss button if it has one; with none left, the page's `<main>`.
   * Only while focus was lost with the button (or is still inside this element).
   */
  private moveFocus(): void {
    const pending = this.pendingFocus;
    if (!pending) return;
    const list = this.list;
    // Still listed after the update: the dismissal did nothing (already gone from the data,
    // or not dismissible), so drop the request rather than let a later update move focus.
    this.pendingFocus = undefined;
    if (list.some((a) => a.uuid === pending.uuid)) return;
    const doc = this.ownerDocument;
    let active = doc.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    if (active && active !== doc.body && !this.renderRoot.contains(active) && active !== this)
      return;
    const alerts = [...this.renderRoot.querySelectorAll<HTMLElement>('.list > .alert')];
    const next = alerts[Math.min(pending.index, alerts.length - 1)];
    if (next) {
      const button = next.querySelector<HTMLElement>('.dismiss');
      if (button) return button.focus();
      next.tabIndex = -1;
      return next.focus();
    }
    const main = this.findMain();
    if (main) {
      if (!main.hasAttribute('tabindex')) main.tabIndex = -1;
      main.focus();
    }
  }

  /** The nearest `<main>`: in this element's tree, else in each enclosing one up to the document. */
  private findMain(): HTMLElement | null {
    let root = this.getRootNode() as Document | ShadowRoot;
    for (;;) {
      const main = root.querySelector<HTMLElement>('main');
      if (main) return main;
      if (!(root instanceof ShadowRoot)) return null;
      root = root.host.getRootNode() as Document | ShadowRoot;
    }
  }

  /** An alert's body: filled in updated(), so Lit never manages its content. */
  private body(a: SiteAlert) {
    return html`<div class="body" data-uuid=${a.uuid}></div>`;
  }

  /** Insert each shown alert's body HTML into its (keyed, so stable) body element. */
  private fillBodies(): void {
    const d = this.data;
    const html = new Map([...d.alerts, ...d.regionalAlerts].map((a) => [a.uuid, a.body]));
    for (const el of this.renderRoot.querySelectorAll<HTMLElement>('.body[data-uuid]')) {
      const body = html.get(el.dataset.uuid!);
      if (body !== undefined) setBody(el, body);
    }
  }

  /** The header banner (library.virginia.edu's alert4): a polite status row. */
  private renderBanner(alerts: SiteAlert[]) {
    return html`<div class="banner" role="status">
      ${repeat(
        alerts,
        (a) => a.uuid,
        (a) =>
          html`<div class="entry"><span class="title">${a.title}:</span> ${this.body(a)}</div>`,
      )}
    </div>`;
  }

  /** One list alert: icon, heading with its severity in text, body, dismiss button. */
  private renderAlert(a: SiteAlert, index: number) {
    const sev = severityOf(a);
    const { label, icon } = SEVERITY[sev];
    const dismissible = sev !== 'alert1';
    const h = unsafeStatic(`h${this.level}`);
    return html`<div
      class="alert ${sev} ${dismissible ? 'dismissible' : ''}"
      role=${sev === 'alert1' ? 'alert' : nothing}
    >
      ${icon}
      <${h} class="title"><span class="visually-hidden">${label} </span>${a.title}</${h}>
      ${this.body(a)}
      ${
        dismissible
          ? html`<button
              class="dismiss"
              type="button"
              aria-label="Dismiss alert: ${a.title}"
              @click=${() => this.onDismiss(a, index)}
            >
              ${closeIcon}
            </button>`
          : nothing
      }
    </div>`;
  }

  /** A regional alert (.uva-alert--r1, or --r2 for information), its severity in text. */
  private renderRegional(a: SiteAlert) {
    const info = a.severity === 'alert3';
    return html`<div class="regional ${info ? 'info' : ''}">
      <span class="visually-hidden">${info ? 'Information:' : 'Warning:'} </span>${this.body(a)}
    </div>`;
  }

  protected override render() {
    const d = this.data;
    const header = this.has('header') ? d.headerAlerts : [];
    const list = this.list;
    const regional = this.has('regional') ? d.regionalAlerts : [];
    return html`${header.length ? this.renderBanner(header) : nothing}${
      list.length
        ? html`<div class="list" aria-live="polite">
            ${repeat(
              list,
              (a) => a.uuid,
              (a, i) => this.renderAlert(a, i),
            )}
          </div>`
        : nothing
    }${repeat(
      regional,
      (a) => a.uuid,
      (a) => this.renderRegional(a),
    )}`;
  }
}
