import { html, css, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { siteLink } from '../link.js';
import { accessible } from '../../styles/accessible.js';

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
/** Attributes of a source anchor that change what the header renders. */
const LINK_ATTRS = ['href', 'aria-current', 'target', 'rel', 'hreflang'];

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
 * @tagname site-header
 * @slot skip-link - Shadow mode only: optional skip link, rendered first inside `<header>` (`<site-page>` uses it).
 * @slot site-links - Optional `<a href>` elements with text that replace the library utility links in the inline nav and the Menu popover (ignored by the `vendor` variant). In light mode they are moved into a hidden holder.
 * @csspart header - The `<header>` element.
 * @cssprop [--uva-blue-alt-dark=#005679] - Utility link colour.
 * @cssprop [--uva-grey-darkest=#2b2b2b] - Menu button colour.
 * @cssprop [--uva-brand-orange=#e57200] - Focus ring colour (focus-visible outline), and the underline colour of an `aria-current` link (also bold, with a 3px underline).
 * @cssprop [--uva-brand-blue=#232d4b] - Skip-link background for a skip link slotted into `skip-link` (shadow mode, shared accessibility sheet).
 */
export class SiteHeader extends UvalibElement {
  static styles = [
    accessible,
    css`
      :host {
        display: block;
        width: 100%;
      }
      header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        position: relative;
        background-color: #ffffff;
        padding: 0.5rem 16px; /* old: .w3-container 16px side padding */
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
        color: var(--uva-blue-alt-dark, #005679);
      }
      /* Current page: bold with a thick underline, so it does not rely on colour alone. */
      nav a[aria-current]:not([aria-current='false']) {
        font-weight: 700;
        text-decoration-line: underline;
        text-decoration-thickness: 3px;
        text-decoration-color: var(--uva-brand-orange, #e57200);
        text-underline-offset: 0.3em;
      }
      .menu-toggle {
        display: none;
        align-items: center;
        gap: 0.25rem;
        background: none;
        border: none;
        color: var(--uva-grey-darkest, #2b2b2b);
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
        border: 1px solid #ccc;
        background: #ffffff;
      }
      [popover] li {
        padding: 0.375rem 0;
      }
      nav.menu {
        display: contents;
      }
      @supports (top: anchor(--x bottom)) {
        [popover] {
          top: anchor(var(--menu-anchor) bottom);
        }
      }
      @media screen and (max-width: 992px) {
        header:not(.vendor) nav.inline {
          display: none;
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

  /** The site's own links, or null to show the library utility links. */
  @state() private siteLinks: SiteLinkItem[] | null = null;
  private warnedInvalid = false;
  private observer?: MutationObserver;
  /** Light mode: hidden container this element owns for the `slot="site-links"` children. */
  private holder?: HTMLDivElement;

  override connectedCallback(): void {
    super.connectedCallback();
    // Reconnect after a disconnect; the first connect reads the links in firstUpdated().
    if (this.hasUpdated) this.syncSiteLinks();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.observer?.disconnect();
  }

  protected override firstUpdated(): void {
    this.syncSiteLinks();
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

  /** Read the source links, render them, and watch them for changes. */
  private syncSiteLinks(): void {
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
    this.watch(sources);
  }

  /**
   * Shadow mode: slotchange reports added and removed links, and the observer watches the
   * assigned anchors' attributes and text. Light mode: the observer also watches the host
   * for new children and the holder for removals.
   */
  private watch(sources: Element[]): void {
    this.observer ??= new MutationObserver(() => this.syncSiteLinks());
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
    } else {
      for (const el of sources) this.observer.observe(el, content);
    }
  }

  private onSiteLinksChange(): void {
    this.syncSiteLinks();
  }

  private _menuId?: string;
  private get menuId(): string {
    this._menuId ??= this.lightDom ? `utility-menu-${++menuCounter}` : 'utility-menu';
    return this._menuId;
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
    return html`
      <header part="header" class=${vendor ? 'vendor' : ''}>
        ${this.lightDom ? nothing : html`<slot name="skip-link"></slot>`}
        <a class="logo" href=${siteLink(root, '/')}
          ><img
            src=${siteLink(root, '/sites/default/files/2022-09/library_rgb.png')}
            alt="UVA Library home"
        /></a>
        <nav class="inline" aria-label=${label}>
          <ul>
            ${items}
          </ul>
        </nav>
        ${
          vendor
            ? nothing
            : html`<button
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
                </nav>`
        }
      </header>
      ${
        this.lightDom
          ? nothing
          : html`<div hidden>
              <slot name="site-links" @slotchange=${this.onSiteLinksChange}></slot>
            </div>`
      }
    `;
  }
}
