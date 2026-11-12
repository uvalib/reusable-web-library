import { html, css, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { tokens } from '../../styles/tokens.js';
import { base, TYPEKIT_URL } from '../../styles/base.js';
import { accessible } from '../../styles/accessible.js';

const isPreFooter = (n: Node): boolean =>
  n instanceof Element && n.getAttribute('slot') === 'pre-footer';

/**
 * Page wrapper: skip link, header, a single `<main>`, footer, and global page styles.
 * Side-effect free: `site-page.ts` registers `<site-header>` and `<site-footer>`.
 *
 * @tagname site-page
 * @slot - Main page content, rendered inside the single `<main>`.
 * @slot pre-footer - Optional content shown in a band above the footer.
 * @csspart main - The `<main>` landmark.
 * @csspart header - The `<header>` element inside `<site-header>` (shadow mode; exported through `exportparts`).
 * @csspart footer - The `<footer>` element inside `<site-footer>` (shadow mode; exported through `exportparts`).
 * @cssprop [--uva-brand-blue=#232d4b] - Skip link background (and header and footer link colours).
 * @cssprop [--uva-brand-orange=#e57200] - Focus ring colour.
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
    `,
  ];

  /** Light mode: nodes this element rendered itself (incl. Lit markers), never routed. */
  private chrome = new WeakSet<Node>();
  private observer?: MutationObserver;
  private globalsInstalled = false;

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
    installLightDomStyles('uvalib-global', [tokens, base, accessible], {
      root: doc,
      scope: false,
    });
    if (!doc.head.querySelector(`link[href="${TYPEKIT_URL}"]`)) {
      const link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.href = TYPEKIT_URL;
      doc.head.append(link);
    }
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

  /** Light mode has no slots: move content into `<main>` and pre-footer nodes to the footer. */
  private route(nodes: Iterable<Node>): void {
    const main = this.querySelector(':scope > main');
    const footer = this.querySelector(':scope > site-footer');
    if (!main || !footer) return;
    for (const n of [...nodes]) {
      if (n.parentNode !== this || this.chrome.has(n)) continue;
      if (n.nodeType === Node.TEXT_NODE && !n.textContent?.trim()) continue;
      // The footer adopts its own slot="pre-footer" children, even before it upgrades.
      (isPreFooter(n) ? footer : main).append(n);
    }
  }

  private onSkip(e: Event): void {
    e.preventDefault();
    this.renderRoot.querySelector<HTMLElement>('main')?.focus();
  }

  protected override render() {
    const light = this.lightDom;
    // Light mode keeps <main> and <site-footer> free of Lit parts so moved content is never cleared.
    return html`
      <a class="skip-link" href="#main-content" @click=${this.onSkip}>Skip to main content</a>
      <site-header
        exportparts="header"
        ?no-shadow-dom=${light}
        ?no-style=${this.noStyle}
        variant=${this.headerVariant}
        root-link-domain=${this.rootLinkDomain}
      ></site-header>
      ${
        light
          ? html`<main id="main-content" tabindex="-1" part="main"></main>`
          : html`<main id="main-content" tabindex="-1" part="main"><slot></slot></main>`
      }
      ${
        light
          ? html`<site-footer
              no-shadow-dom
              ?no-style=${this.noStyle}
              root-link-domain=${this.rootLinkDomain}
            ></site-footer>`
          : html`<site-footer
              exportparts="footer"
              ?no-style=${this.noStyle}
              root-link-domain=${this.rootLinkDomain}
              ><slot name="pre-footer" slot="pre-footer"></slot
            ></site-footer>`
      }
    `;
  }
}
