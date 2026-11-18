import { html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';

/**
 * A length `min-card-width` may be. Anything else (including a value with extra CSS) is
 * ignored, so the attribute cannot inject declarations.
 */
const MIN_WIDTH = /^\d+(\.\d+)?(px|rem|em|ch|%)$/;

/**
 * Kept with `no-style`: a list of equal-height cards, four columns until the grid is
 * 992px wide, two until 767px, then one. `min-card-width` switches that to
 * `auto-fill` / `minmax`. `host` is `:host` or the tag.
 */
/** `:host([data-min-width])` in shadow, `uvalib-card-grid[data-min-width]` in a document sheet. */
const hostFn = (host: string, pseudo: string) =>
  host === ':host' ? `:host(${pseudo})` : `${host}${pseudo}`;

const structuralRules = (host: string) => `
  ${host} {
    display: block;
    container-type: inline-size;
    min-width: 0;
  }
  ${host} ul {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1.5rem;
    align-items: stretch;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  @container (width <= 992px) {
    ${host} ul { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @container (width <= 767px) {
    ${host} ul { grid-template-columns: minmax(0, 1fr); }
  }
  ${hostFn(host, '[data-min-width]')} ul {
    grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--uvalib-card-min)), 1fr));
  }
  ${host} li { display: flex; min-width: 0; }
  /* The slot is the flex item in shadow DOM; the card is, in light DOM. Stretch either
     so a short card matches the tallest in the row. No ::slotted(): it is invalid in a
     document sheet and would drop the light-DOM rules. */
  ${host} li > slot, ${host} li > uvalib-card {
    display: flex;
    flex: 1 1 auto;
    min-width: 0;
    width: 100%;
  }
  ${host} .grid-rest { display: none !important; }
  ${host}[hidden], ${host} [hidden] { display: none !important; }
`;
const shadowStructure = unsafeCSS(structuralRules(':host'));

/**
 * A grid of `<uvalib-card>` elements. It is a list, so a screen reader announces how many
 * cards there are. Safari drops that list when markers are removed, so the list role is
 * set as well as the `<ul>`.
 *
 * Columns follow the theme’s breakpoints on the grid’s own width (a container query, so a
 * sidebar collapses the grid too): four above 992px, two through 767px, then one. Cards in
 * a row match the height of the tallest.
 *
 * Set `min-card-width` (a length: `16rem`, `240px`, …) to use
 * `repeat(auto-fill, minmax(min(100%, <width>), 1fr))` instead. An invalid value is
 * ignored, with one console warning, and the 4/2/1 columns stay.
 *
 * Only `<uvalib-card>` children are listed. Anything else is left in the tree (hidden in
 * light DOM) and warned about once. The grid gives each card a `slot` while it is inside;
 * that attribute is removed when the card leaves, so it is not hidden by another shadow root.
 *
 * @tagname uvalib-card-grid
 * @slot - `<uvalib-card>` elements, one per cell.
 * @cssprop [--uvalib-card-min] - Set from `min-card-width` when that value is a length. The grid uses it as the `auto-fill` minimum.
 */
export class UvalibCardGrid extends UvalibElement {
  static styles = [shadowStructure];

  /**
   * When a length (`16rem`, `240px`, `20ch`, `40%`), the grid fills by that minimum
   * instead of the fixed 4/2/1 columns. Any other value is ignored.
   */
  @property({ type: String, attribute: 'min-card-width' }) minCardWidth?: string;

  /** Shadow DOM: one named slot per card, so each card is its own grid cell. */
  private names: string[] = [];
  private observer?: MutationObserver;
  private warnedOther = false;
  private warnedWidth = false;
  /** Author nodes captured before the first light-DOM render. */
  private stash: Node[] = [];
  /** Set once those nodes have been lifted off the host, including a reconnect before the first render. */
  private captured = false;
  private own = new WeakSet<Node>();
  private placing = false;

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    const root = super.createRenderRoot();
    if (root instanceof ShadowRoot && this.noStyle) {
      const sheet = shadowStructure.styleSheet;
      if (sheet) root.adoptedStyleSheets = [sheet];
    }
    return root;
  }

  override connectedCallback(): void {
    const light = this.hasAttribute('no-shadow-dom') || this.noShadowDom;
    // A parent (for example `<site-page no-shadow-dom>`) can move this grid, and so
    // disconnect and reconnect it, before the first update. Capturing again would
    // replace `stash` with an empty child list and drop the cards.
    if (light && !this.hasUpdated && !this.captured) {
      this.captured = true;
      this.stash = [...this.childNodes];
      for (const n of this.stash) n.parentNode?.removeChild(n);
    }
    super.connectedCallback();
    this.applyMinWidth();
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
    if (!this.lightDom) this.assignSlots(true);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.observer?.disconnect();
  }

  /** A valid `min-card-width` wins over the breakpoint columns, via `--uvalib-card-min`. */
  private applyMinWidth(): void {
    const raw = this.minCardWidth?.trim() ?? '';
    const ok = raw !== '' && MIN_WIDTH.test(raw);
    if (raw && !ok && !this.warnedWidth) {
      this.warnedWidth = true;
      console.warn(
        `${this.localName}: ignoring min-card-width "${raw}"; expected a length such as 16rem.`,
      );
    }
    if (ok) {
      this.style.setProperty('--uvalib-card-min', raw);
      this.toggleAttribute('data-min-width', true);
    } else {
      this.style.removeProperty('--uvalib-card-min');
      this.toggleAttribute('data-min-width', false);
    }
  }

  private warnOthers(has: boolean): void {
    if (!has || this.warnedOther) return;
    this.warnedOther = true;
    console.warn(
      `${this.localName}: only <uvalib-card> children are listed; other children are left in place.`,
    );
  }

  /**
   * Point each direct card at `card-N`. A `<slot>` is one grid item, so the cards cannot
   * share a default slot. `fromUpdate` skips requesting another render.
   */
  private assignSlots(fromUpdate: boolean): void {
    const cards: Element[] = [];
    let others = false;
    for (const child of this.children) {
      if (child.localName === 'uvalib-card') cards.push(child);
      else others = true;
    }
    this.warnOthers(others);
    cards.forEach((card, i) => {
      const name = `card-${i}`;
      card.setAttribute('data-grid-slot', '');
      if (card.getAttribute('slot') !== name) card.setAttribute('slot', name);
    });
    const names = cards.map((_, i) => `card-${i}`);
    if (names.join('|') !== this.names.join('|')) {
      this.names = names;
      if (!fromUpdate && this.hasUpdated) this.requestUpdate();
    }
  }

  private collectLight(): { cards: Element[]; others: Node[] } {
    const cards: Element[] = [];
    const others: Node[] = [];
    const seen = new Set<Node>();
    const visit = (n: Node): void => {
      if (seen.has(n)) return;
      if (n instanceof Element && n.localName === 'ul' && this.own.has(n)) {
        seen.add(n);
        for (const li of n.children) {
          const card = [...li.children].find((c) => c.localName === 'uvalib-card');
          if (card && !seen.has(card)) {
            seen.add(card);
            cards.push(card);
          }
        }
        return;
      }
      if (n instanceof Element && n.classList.contains('grid-rest')) {
        seen.add(n);
        for (const c of [...n.childNodes]) visit(c);
        return;
      }
      if (this.own.has(n)) return;
      seen.add(n);
      if (n instanceof Element && n.localName === 'uvalib-card') cards.push(n);
      else if (n instanceof Element || (n.nodeType === Node.TEXT_NODE && !!n.textContent?.trim()))
        others.push(n);
    };
    for (const n of this.stash) visit(n);
    this.stash = [];
    for (const n of [...this.childNodes]) visit(n);
    return { cards, others };
  }

  /** Wrap each card in an `<li>` inside the template’s list. Leave the list when unchanged. */
  private layoutLight(): void {
    const ul = this.renderRoot.querySelector('ul');
    const rest = this.renderRoot.querySelector('.grid-rest');
    if (!ul || !rest) return;
    this.observer?.disconnect();
    this.placing = true;
    try {
      const { cards, others } = this.collectLight();
      this.warnOthers(others.length > 0);
      if (others.length) rest.append(...others);
      const current = [...ul.querySelectorAll(':scope > li > uvalib-card')];
      // An empty <li> (its card was removed) must go too, not only a change of order.
      const same =
        ul.children.length === cards.length &&
        current.length === cards.length &&
        current.every((card, i) => card === cards[i]);
      if (!same) {
        ul.replaceChildren(
          ...cards.map((card) => {
            const parent = card.parentElement;
            if (parent?.localName === 'li' && parent.parentElement === ul) return parent;
            const li = this.ownerDocument.createElement('li');
            li.setAttribute('role', 'listitem');
            li.append(card);
            return li;
          }),
        );
      }
    } finally {
      this.placing = false;
      this.arm();
    }
  }

  private arm(): void {
    if (this.placing) return;
    this.observer ??= new MutationObserver(() => {
      if (this.placing) return;
      if (this.lightDom) this.layoutLight();
      else this.assignSlots(false);
    });
    this.observer.observe(this, { childList: true });
    // subtree: a card lives in an <li>, so removing it does not change the <ul>'s own children.
    const ul = this.lightDom ? this.renderRoot.querySelector('ul') : null;
    if (ul) this.observer.observe(ul, { childList: true, subtree: true });
  }

  protected override willUpdate(): void {
    this.applyMinWidth();
    if (!this.lightDom) this.assignSlots(true);
  }

  protected override firstUpdated(): void {
    if (this.lightDom) for (const n of this.childNodes) this.own.add(n);
  }

  protected override updated(): void {
    if (!this.lightDom) {
      this.arm();
      return;
    }
    if (this.placing) return;
    this.layoutLight();
  }

  protected override render() {
    if (this.lightDom)
      return html`<div class="grid-rest" hidden></div>
        <ul role="list"></ul>`;
    return html`<ul role="list">
      ${this.names.map((name) => html`<li role="listitem"><slot name=${name}></slot></li>`)}
    </ul>`;
  }
}
