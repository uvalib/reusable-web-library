import { LitElement, css, type CSSResultGroup, type CSSResultOrNative } from 'lit';
import { property } from 'lit/decorators.js';
import { installHiddenRule, installLightDomStyles } from './light-dom-styles.js';

/**
 * Each component's own `color-scheme`: `light` unless the page opted in to dark mode (then
 * the root's `--uva-color-scheme`), so a host page's `color-scheme` never turns a component
 * dark, and native controls, scrollbars and light-dark() colours inside follow the chosen one.
 */
const hostColorScheme = css`
  :host {
    color-scheme: var(--uva-color-scheme, light);
  }
`;

/** Base class for all UVA Library components: optional light DOM, optional style opt-out. */
export class UvalibElement extends LitElement {
  /**
   * Whether the host gets the colour-scheme rule. Off for elements that wrap the site's own
   * content (`<site-page>`, `<site-style>`), which must keep inheriting the page's scheme.
   */
  protected static hostColorScheme = true;

  /** Every component's styles start with the host colour-scheme rule (unless opted out). */
  protected static override finalizeStyles(styles?: CSSResultGroup): CSSResultOrNative[] {
    const own = super.finalizeStyles(styles);
    return own.length && this.hostColorScheme ? [hostColorScheme, ...own] : own;
  }

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
    const node = this.getRootNode();
    const root = node instanceof ShadowRoot || node instanceof Document ? node : undefined;
    // `hidden` hides the host in every mode, `no-style` included (see installHiddenRule).
    if (root) installHiddenRule(this.localName, root);
    if (this.lightDom && !this.noStyle) this.installLightStyles(root);
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
