import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { tokens } from '../../styles/tokens.js';
import { base } from '../../styles/base.js';

/**
 * Compatibility element. Light mode (`no-shadow-dom`) installs the tokens and base page
 * styles on the document. Shadow mode only styles inside its own shadow root, so the
 * `:root` and `html, body` rules of those sheets match nothing there and the slotted content
 * is not restyled; it inherits whatever inherited tokens and fonts the page already provides.
 *
 * @tagname site-style
 * @slot - Content rendered in shadow mode; it is not restyled by this element. In light mode there is no shadow root and the children stay in place.
 * @cssprop [--uva-font-family=franklin-gothic-urw, Arial, Helvetica, sans-serif] - Font family.
 * @cssprop [--uva-font-size-base=17px] - Base font size.
 * @cssprop [--uva-grey-darkest=#2b2b2b] - Text colour.
 */
export class SiteStyle extends UvalibElement {
  static styles = [tokens, base];

  /** Map of tag name to a module URL whose default export is a stylesheet; ported as is. */
  @property({ type: Object }) imports: { [key: string]: string } = {};

  /**
   * Accumulated text of the stylesheets loaded through `imports`. Carried over from the old
   * component for compatibility; it is not rendered anywhere.
   */
  @property({ type: String }) importedStyles = '';

  /**
   * Page-level styles: unscoped, under their own dedupe key, always on the owner
   * document (not the root node) because `:root` tokens inherit into shadow roots.
   */
  protected override installLightStyles(): void {
    installLightDomStyles('uvalib-site-style', SiteStyle.styles, {
      root: this.ownerDocument,
      scope: false,
    });
  }

  protected override firstUpdated(): void {
    if (this.imports && !this.noStyle) {
      Object.keys(this.imports).forEach((key) => {
        const imp = this.imports[key];
        if (imp) {
          import(/* @vite-ignore */ imp).then((css: { default: { toString(): string } }) => {
            this.importedStyles += css.default.toString().replace(/:host/, key.toLowerCase());
          });
        }
      });
    }
  }

  protected override render() {
    return this.lightDom ? nothing : html`<slot></slot>`;
  }
}
