import { LitElement, type CSSResultGroup } from 'lit';
import { property } from 'lit/decorators.js';
import { installLightDomStyles } from './light-dom-styles.js';

/** Base class for all UVA Library components: optional light DOM, optional style opt-out. */
export class UvalibElement extends LitElement {
  static shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, mode: 'open' };

  @property({ type: Boolean, attribute: 'no-shadow-dom' }) noShadowDom = false;
  @property({ type: Boolean, attribute: 'no-style' }) noStyle = false;

  /** Fixed at the first createRenderRoot(); later attribute changes have no effect. */
  private _lightDom?: boolean;
  protected get lightDom(): boolean {
    return this._lightDom ?? false;
  }

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    this._lightDom ??= this.hasAttribute('no-shadow-dom') || this.noShadowDom;
    if (this.lightDom) return this;
    const root = super.createRenderRoot() as ShadowRoot;
    if (this.noStyle) root.adoptedStyleSheets = [];
    return root;
  }

  override connectedCallback(): void {
    super.connectedCallback(); // creates the render root
    if (this.lightDom && !this.noStyle) {
      const node = this.getRootNode();
      this.installLightStyles(
        node instanceof ShadowRoot || node instanceof Document ? node : undefined,
      );
    }
  }

  /** Light mode: install `static styles` into `root`, scoped to the tag. Subclasses may override. */
  protected installLightStyles(root?: Document | ShadowRoot): void {
    installLightDomStyles(
      this.localName,
      (this.constructor as typeof LitElement).elementStyles as CSSResultGroup,
      { root },
    );
  }
}
