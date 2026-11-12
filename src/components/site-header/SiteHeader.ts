import { html, css, nothing } from 'lit';
import { property } from 'lit/decorators.js';
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

/**
 * UVA Library site header: logo, utility navigation, and a popover menu on narrow screens.
 *
 * @tagname site-header
 * @csspart header - The `<header>` element.
 * @cssprop [--uva-brand-blue=#232d4b] - Link and menu button colour.
 * @cssprop [--uva-brand-orange=#e57200] - Focus ring colour.
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
        align-items: center;
        justify-content: space-between;
        position: relative;
        background-color: #ffffff;
        padding: 0.5rem 1rem;
      }
      .logo {
        display: block;
        margin-top: 4px;
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
      nav.inline ul {
        display: flex;
        gap: 1.5rem;
      }
      a {
        color: var(--uva-brand-blue, #232d4b);
      }
      .menu-toggle {
        display: none;
        align-items: center;
        gap: 0.25rem;
        background: none;
        border: none;
        color: var(--uva-brand-blue, #232d4b);
        font: inherit;
        cursor: pointer;
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

  private _menuId?: string;
  private get menuId(): string {
    this._menuId ??= this.lightDom ? `utility-menu-${++menuCounter}` : 'utility-menu';
    return this._menuId;
  }

  render() {
    const root = this.rootLinkDomain;
    const vendor = this.variant === 'vendor';
    const links = vendor ? VENDOR_LINKS : FULL_LINKS;
    const items = links.map((l) => html`<li><a href=${siteLink(root, l.path)}>${l.label}</a></li>`);
    const id = this.menuId;
    const anchor = `--${id}`;
    return html`
      <header part="header" class=${vendor ? 'vendor' : ''}>
        <a class="logo" href=${siteLink(root, '/')}
          ><img
            src=${siteLink(root, '/sites/default/files/2022-09/library_rgb.png')}
            alt="UVA Library home"
        /></a>
        <nav class="inline" aria-label="Utility">
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
                <nav class="menu" aria-label="Utility menu">
                  <ul id=${id} popover style="--menu-anchor: ${anchor}">
                    ${items}
                  </ul>
                </nav>`
        }
      </header>
    `;
  }
}
