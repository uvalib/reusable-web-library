import { LitElement, type CSSResultGroup } from 'lit';
import { property } from 'lit/decorators.js';
import { installLightDomStyles } from './light-dom-styles.js';

/** Base class for all UVA Library components: optional light DOM, optional style opt-out. */
export class UvalibElement extends LitElement {
  static shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, mode: 'open' };

  @property({ type: Boolean, attribute: 'no-shadow-dom' }) noShadowDom = false;
  @property({ type: Boolean, attribute: 'no-style' }) noStyle = false;

  /** Fixed at the first createRenderRoot(); later attribute changes have no effect. */
  protected lightDom!: boolean;

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    this.lightDom ??= this.hasAttribute('no-shadow-dom');
    if (this.lightDom) return this;
    const root = super.createRenderRoot() as ShadowRoot;
    if (this.noStyle) root.adoptedStyleSheets = [];
    return root;
  }

  override connectedCallback(): void {
    super.connectedCallback(); // creates the render root
    if (this.lightDom && !this.noStyle) {
      installLightDomStyles(
        this.localName,
        (this.constructor as typeof LitElement).elementStyles as CSSResultGroup,
      );
    }
  }
}
