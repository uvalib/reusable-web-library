import { css, html, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { trackEvent } from '../../base/analytics.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { accessible } from '../../styles/accessible.js';

/** One tag: its visible text and, when it is a link, where it goes. */
export interface TagItem {
  label: string;
  href?: string;
}

/** The analytics name when the list has no label. */
const UNLABELLED = 'tags';

/** Schemes a tag may link to; anything else (javascript:, data:, …) is shown as text. */
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/** What the observer watches in the author's tags: the elements, their hrefs and text. */
const CONTENT: MutationObserverInit = {
  attributes: true,
  attributeFilter: ['href'],
  characterData: true,
  childList: true,
  subtree: true,
};

const normalize = (s: unknown) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Kept with `no-style`: the tags wrap in a row with gaps, no bullets, the hidden label stays
 * hidden and `[hidden]` hides. `host` is `:host` or the tag name.
 */
const structuralRules = (host: string) => `
  ${host} { display: block; }
  ${host} ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem 0.5rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  ${host} li { display: flex; max-width: 100%; min-width: 0; }
  ${host} .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  ${host}[hidden], ${host} [hidden] { display: none !important; }
`;
const shadowStructure = unsafeCSS(structuralRules(':host'));

let instances = 0;

/**
 * A labelled list of keywords or subjects that wraps: each tag a link (for example a search
 * for that term) or plain text. Link tags are outlined pills in the link colour; plain tags
 * are filled chips (the card chip's colours), so a link never looks like a label.
 *
 * Give the tags as children: `<a href>` for a link, any other element (`<span>`) for plain
 * text. Or set `href-template` (with `{tag}`, replaced by the URL-encoded text) to make every
 * tag without its own href a link. Apps can set the `items` property (`{ label, href? }`)
 * instead; it wins over the children. Children with no text are skipped with one warning.
 *
 * `label` names the list (shown above it, or visually hidden with `hide-label`); without one
 * a console warning is logged. `limit` shows that many tags and a “Show all N” button
 * (`aria-expanded`, `aria-controls`), which reveals the rest in place and keeps focus.
 *
 * Analytics never sends a tag's text (record tags can be user-submitted or machine-made):
 * only the list's label, which the page author writes.
 *
 * @tagname uvalib-tag-list
 * @fires uvalib-analytics-event - For `<site-analytics>`: a primary-button click on a tag link, `['uvalib-tag-list', 'tag-click', '<label>', <n>]` (n from 1, the tag's place in the list), and the toggle, `['uvalib-tag-list', 'show-all'|'show-fewer', '<label>']`. The name is the list's `label` (else `tags`), never the tag text or URL. Bubbles and is composed.
 * @fires uvalib-tag-list-navigate - A plain click on a tag link: `detail` is `{ href, tag, index }` (index from 0). Cancel it (`preventDefault()`) to route in the app; the click's default is then prevented. Bubbles and is composed.
 * @cssprop [--uva-blue-alt-300=#BFE7F7] - Plain tag background (the card chip's).
 * @cssprop [--uva-blue-alt-dark=#005679] - Plain tag text.
 * @cssprop --uva-color-link - Dark-mode role token: link tag text (else `--uva-brand-blue`).
 * @cssprop --uva-color-control-border - Dark-mode role token: link tag outline (else `--uva-grey`).
 * @cssprop --uva-color-text - Dark-mode role token: the label (else `--uva-grey-darkest`).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 */
export class UvalibTagList extends UvalibElement {
  static styles = [
    accessible,
    shadowStructure,
    css`
      :host {
        color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
      }
      .label {
        display: block;
        margin-block-end: 0.375rem;
        font-weight: 600;
      }
      .tag {
        display: inline-flex;
        align-items: center;
        box-sizing: border-box;
        max-width: 100%;
        min-height: 1.75rem;
        padding: 0.1rem 0.6rem;
        border: 1px solid transparent;
        border-radius: 999px;
        font-size: 0.875rem;
        line-height: 1.4;
        overflow-wrap: anywhere;
      }
      span.tag {
        background: var(--uva-blue-alt-300, #bfe7f7);
        color: var(--uva-blue-alt-dark, #005679);
      }
      a.tag {
        border-color: var(--uva-color-control-border, var(--uva-grey, #808080));
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
        text-decoration: none;
      }
      a.tag:hover {
        border-color: currentColor;
        text-decoration: underline;
      }
      .toggle {
        display: inline-flex;
        align-items: center;
        min-height: 1.75rem;
        margin: 0.375rem 0 0;
        padding: 0.1rem 0.25rem;
        border: 0;
        background: none;
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
        font: inherit;
        font-size: 0.875rem;
        text-decoration: underline;
        cursor: pointer;
      }
      @media (forced-colors: active) {
        span.tag {
          border-color: CanvasText;
        }
        a.tag {
          border-color: LinkText;
          color: LinkText;
        }
        .toggle {
          color: ButtonText;
        }
      }
    `,
  ];

  /** The list's name: shown above the tags, and the analytics name. */
  @property({ type: String }) label = '';

  /** Hide the label visually; it still names the list. */
  @property({ type: Boolean, attribute: 'hide-label' }) hideLabel = false;

  /** Show this many tags and a “Show all N” button. Zero or empty shows every tag. */
  @property({ type: Number }) limit?: number;

  /**
   * Href for tags without their own, with `{tag}` where the URL-encoded text goes, for
   * example `/search?q={tag}`. Empty: such tags are plain text.
   */
  @property({ type: String, attribute: 'href-template' }) hrefTemplate = '';

  /** The tags as data (`{ label, href? }`), for apps. Wins over the children while set. */
  @property({ attribute: false }) items?: TagItem[];

  /** Whether every tag is shown (after Show all). */
  @state() private expanded = false;
  /** The tags read from the children. */
  @state() private childItems: TagItem[] = [];

  private readonly uid = `uvalib-tag-list-${++instances}`;
  private warned = false;
  private warnedHref = false;
  private warnedLabel = false;
  private observer?: MutationObserver;
  /** Light mode: the hidden container this element owns for the author's children. */
  private holder?: HTMLDivElement;
  /** Light mode: nodes this element rendered itself (incl. Lit markers), never adopted. */
  private own = new WeakSet<Node>();

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
    this.sync();
    if (this.hasUpdated) this.watch();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.observer?.disconnect();
  }

  protected override firstUpdated(): void {
    if (this.lightDom) for (const n of this.childNodes) if (n !== this.holder) this.own.add(n);
    this.sync();
    this.watch();
    if (!normalize(this.label) && !this.warnedLabel) {
      this.warnedLabel = true;
      console.warn(`${this.localName}: set label to name the list (for example “Subjects”).`);
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has('items') && this.items?.some((i) => !normalize(i?.label))) this.warn();
  }

  private warn(): void {
    if (this.warned) return;
    this.warned = true;
    console.warn(`${this.localName}: ignoring tags with no text.`);
  }

  /** Light mode has no slots: move the author's children into the hidden holder. */
  private adopt(): Node[] {
    const incoming = [...this.childNodes].filter((n) => n !== this.holder && !this.own.has(n));
    if (incoming.length && !this.holder) {
      this.holder = this.ownerDocument.createElement('div');
      this.holder.hidden = true;
      this.holder.className = 'tag-list-source';
      if (this.observer && this.hasUpdated) this.observer.observe(this.holder, CONTENT);
    }
    if (this.holder) {
      this.holder.append(...incoming);
      if (this.holder.parentNode !== this) this.prepend(this.holder);
    }
    return this.holder ? [...this.holder.childNodes] : [];
  }

  /** Read the tags from the children. */
  private sync(): void {
    const sources = this.lightDom ? this.adopt() : [...this.childNodes];
    const items: TagItem[] = [];
    let invalid = false;
    for (const n of sources) {
      if (n.nodeType === Node.TEXT_NODE) {
        if (normalize(n.textContent)) invalid = true;
        continue;
      }
      if (!(n instanceof Element)) continue;
      const label = normalize(n.textContent);
      if (!label) {
        invalid = true;
        continue;
      }
      const href = n instanceof HTMLAnchorElement ? n.getAttribute('href') : null;
      items.push(href === null ? { label } : { label, href });
    }
    if (invalid) this.warn();
    if (JSON.stringify(items) !== JSON.stringify(this.childItems)) this.childItems = items;
  }

  private watch(): void {
    this.observer ??= new MutationObserver(() => this.sync());
    this.observer.disconnect();
    if (this.lightDom) {
      this.observer.observe(this, { childList: true });
      if (this.holder) this.observer.observe(this.holder, CONTENT);
    } else {
      this.observer.observe(this, CONTENT);
    }
  }

  private safe(href: string): boolean {
    let ok = false;
    try {
      ok = SAFE_SCHEMES.has(new URL(href, this.ownerDocument.baseURI).protocol);
    } catch {
      ok = false;
    }
    if (!ok && !this.warnedHref) {
      this.warnedHref = true;
      console.warn(
        `${this.localName}: showing a tag as text: its href is not http(s), mailto, tel or relative.`,
      );
    }
    return ok;
  }

  /** What is shown: `items` while set, else the children; hrefs from the template; unsafe ones dropped. */
  private get tags(): TagItem[] {
    const source = this.items
      ? this.items
          .filter((i) => normalize(i?.label))
          .map((i) => ({ label: normalize(i.label), href: i.href ?? undefined }))
      : this.childItems;
    const template = this.hrefTemplate.trim();
    return source.map((t) => {
      const href =
        t.href ??
        (template.includes('{tag}')
          ? template.replaceAll('{tag}', encodeURIComponent(t.label))
          : undefined);
      return href !== undefined && this.safe(href) ? { label: t.label, href } : { label: t.label };
    });
  }

  /** The `limit`, when it hides anything: a positive whole number. */
  private get max(): number {
    const n = Math.trunc(this.limit ?? 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  private get name(): string {
    return normalize(this.label) || UNLABELLED;
  }

  private onClick(e: MouseEvent): void {
    const a = (e.target as Element | null)?.closest?.('a[href]');
    if (!(a instanceof HTMLAnchorElement) || !this.renderRoot.contains(a)) return;
    if (e.defaultPrevented || e.button !== 0) return;
    const index = Number(a.dataset.index);
    trackEvent(this, ['uvalib-tag-list', 'tag-click', this.name, index + 1]);
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const go = new CustomEvent('uvalib-tag-list-navigate', {
      detail: { href: a.getAttribute('href'), tag: normalize(a.textContent), index },
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    if (!this.dispatchEvent(go)) e.preventDefault();
  }

  private toggle(): void {
    this.expanded = !this.expanded;
    trackEvent(this, ['uvalib-tag-list', this.expanded ? 'show-all' : 'show-fewer', this.name]);
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.toggleAttribute('data-empty', !this.tags.length);
  }

  protected override render() {
    const tags = this.tags;
    const max = this.max;
    const collapsible = max > 0 && tags.length > max;
    const label = normalize(this.label);
    const labelId = `${this.uid}-label`;
    const listId = `${this.uid}-list`;
    const toggleText = this.expanded ? 'Show fewer' : `Show all ${tags.length}`;
    // One wrapper, always rendered: in light DOM nothing new appears among the host's
    // children later (the observer would take it for an author's tag).
    return html`<div class="tag-list" ?hidden=${!tags.length}>
      ${
        label
          ? html`<span id=${labelId} class=${this.hideLabel ? 'label visually-hidden' : 'label'}
              >${label}</span
            >`
          : nothing
      }
      <ul
        role="list"
        id=${listId}
        aria-labelledby=${label ? labelId : nothing}
        @click=${this.onClick}
      >
        ${tags.map(
          (t, i) =>
            html`<li role="listitem" ?hidden=${collapsible && !this.expanded && i >= max}>
              ${
                t.href !== undefined
                  ? html`<a class="tag" href=${t.href} data-index=${i}>${t.label}</a>`
                  : html`<span class="tag">${t.label}</span>`
              }
            </li>`,
        )}
      </ul>
      ${
        collapsible
          ? html`<button
              type="button"
              class="toggle"
              aria-expanded=${this.expanded ? 'true' : 'false'}
              aria-controls=${listId}
              @click=${this.toggle}
            >
              ${toggleText}${label ? html`<span class="visually-hidden"> ${label}</span>` : nothing}
            </button>`
          : nothing
      }
    </div>`;
  }
}
