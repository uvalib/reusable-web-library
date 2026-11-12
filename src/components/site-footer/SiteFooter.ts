import { html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { siteLink } from '../link.js';
import { accessible } from '../../styles/accessible.js';
import { facebookIcon, instagramIcon, fdlpLogo } from './icons.js';

type FooterLink = { label: string; path: string };

const USING: FooterLink[] = [
  { label: 'Search, borrow, request', path: '/services' },
  { label: 'Research & teaching', path: '/research-and-teaching' },
  { label: 'Library spaces', path: '/spaces' },
  { label: 'Equipment & technology', path: '/equipment-and-tech' },
  { label: 'Get help', path: '/help' },
];

const ABOUT: FooterLink[] = [
  { label: 'About UVA Library', path: '/about-uva-library' },
  { label: 'Jobs and fellowships', path: '/jobs/' },
  { label: 'Staff directory', path: '/staff/' },
  { label: 'Library policies', path: '/policies' },
  { label: 'Status dashboard', path: '/status' },
];

export class SiteFooter extends UvalibElement {
  @property({ type: String, attribute: 'root-link-domain' }) rootLinkDomain =
    'https://www.library.virginia.edu';

  static styles = [
    accessible, // focus rings on the dark background
    css`
      :host {
        display: block;
        width: 100%;
      }
      footer {
        display: flex;
        flex-direction: column;
        width: 100%;
      }
      .footer--pre {
        display: none;
        background-color: var(--uva-blue-alt-300, #bfe7f7);
      }
      .footer--pre.has-content {
        display: block;
      }
      .footer--pre ::slotted([slot='pre-footer']),
      .footer--pre [slot='pre-footer'] {
        text-align: center;
        padding-top: 0.5rem;
        padding-bottom: 0.5rem;
      }
      .footer--main {
        background-color: var(--uva-brand-blue, #232d4b);
        color: #fff;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        padding-top: 2rem;
      }
      .footer--main > .block {
        width: 300px;
        box-sizing: border-box;
      }
      .footer--main h2,
      .footer--main a,
      .footer--main address {
        color: #fff;
      }
      .footer--main ul {
        list-style-type: none;
        padding-left: 0;
      }
      .footer--main address {
        font-style: normal;
      }
      .footer--main .social-media {
        display: flex;
      }
      .footer--main .social-media a {
        display: inline-block;
        height: 2rem;
        width: 2rem;
        margin-right: 1rem;
        fill: #fff;
      }
      .footer--main .social-media a:hover,
      .footer--main .social-media a:focus {
        fill: var(--uva-brand-orange, #e57200);
      }
      .footer--post {
        background-color: var(--uva-blue-alt-darkest, #141e3c);
        color: #fff;
        padding: 1rem 2rem;
      }
      .footer--post .post-footer {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1.5rem;
        margin: 0 auto;
      }
      .footer--post p {
        margin: 0;
      }
      .footer--post a {
        display: inline-flex;
      }
      @media screen and (max-width: 767px) {
        .footer--main > .block {
          padding: 1rem;
        }
      }
    `,
  ];

  private get preFooter(): HTMLElement | null {
    return this.renderRoot.querySelector('.footer--pre');
  }

  private observer?: MutationObserver;

  /** Light DOM has no slots: move host children marked slot="pre-footer" into the wrapper. */
  private adoptPreFooterChildren(): void {
    const wrapper = this.preFooter;
    if (!wrapper) return;
    const moved = [...this.children].filter(
      (c) => c.getAttribute('slot') === 'pre-footer' && !wrapper.contains(c),
    );
    wrapper.append(...moved);
    if (moved.length) wrapper.classList.add('has-content');
  }

  private observe(): void {
    this.observer ??= new MutationObserver(() => this.adoptPreFooterChildren());
    this.observer.observe(this, { childList: true });
  }

  protected override firstUpdated(): void {
    if (!this.lightDom) return;
    this.adoptPreFooterChildren();
    this.observe();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Reconnect after a disconnect; the first connect starts observing in firstUpdated.
    if (this.lightDom && this.hasUpdated) this.observe();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.observer?.disconnect();
  }

  private onPreSlotChange(e: Event): void {
    const slot = e.target as HTMLSlotElement;
    // flatten: a forwarded <slot> with nothing assigned must not count as content.
    const has = slot.assignedElements({ flatten: true }).length > 0;
    this.preFooter?.classList.toggle('has-content', has);
  }

  private links(links: FooterLink[]) {
    return html`<ul>
      ${links.map((l) => html`<li><a href=${siteLink(this.rootLinkDomain, l.path)}>${l.label}</a></li>`)}
    </ul>`;
  }

  protected override render() {
    const root = this.rootLinkDomain;
    return html`
      <footer part="footer">
        <div class="footer--pre">
          ${this.lightDom ? null : html`<slot name="pre-footer" @slotchange=${this.onPreSlotChange}></slot>`}
        </div>
        <div class="footer--main">
          <div class="block">
            <h2>Using the Library</h2>
            ${this.links(USING)}
          </div>
          <div class="block">
            <h2>About</h2>
            ${this.links(ABOUT)}
          </div>
          <div class="block">
            <h2>Contact us</h2>
            <address>
              <a href="tel:+14349243021">(434) 924-3021</a><br />
              <a href="mailto:library@virginia.edu">library@virginia.edu</a><br />
              UVA Shannon Library<br />
              P.O. Box 400113<br />
              160 McCormick Road<br />
              Charlottesville, VA 22904
            </address>
            <ul>
              <li><a href=${siteLink(root, '/askalibrarian')}>Ask a Librarian</a></li>
              <li><a href=${siteLink(root, '/site-feedback')}>Site feedback</a></li>
            </ul>
            <ul class="social-media">
              <li>
                <a href="https://www.facebook.com/UVALibrary/" aria-label="UVA Library on Facebook"
                  >${facebookIcon}</a
                >
              </li>
              <li>
                <a href="https://instagram.com/uvalibrary" aria-label="UVA Library on Instagram"
                  >${instagramIcon}</a
                >
              </li>
            </ul>
          </div>
        </div>
        <div class="footer--post">
          <div class="post-footer">
            <p>
              Copyright ${new Date().getFullYear()} by the Rector and Visitors of the University of
              Virginia
            </p>
            <a
              href="https://guides.lib.virginia.edu/findinggovinfo"
              aria-label="Federal Depository Library Program"
              >${fdlpLogo}</a
            >
          </div>
        </div>
      </footer>
    `;
  }
}
