import { css, html, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { trackEvent } from '../../base/analytics.js';
import { inlineCopy, langDir } from '../../base/inline-copy.js';
import { normalize, safeHref, SourceChildren } from '../../base/source-children.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { accessible } from '../../styles/accessible.js';

/** One tag: its visible text and, when it is a link, where it goes; `lang`/`dir` if they differ. */
export interface TagItem {
  label: string;
  href?: string;
  lang?: string;
  dir?: string;
}

/** A tag as read and drawn: `nodes` is a safe inline copy of a child's content, `rich` its key. */
interface Tag extends TagItem {
  rich?: string;
  nodes?: Node[];
}

/** Compare two reads, leaving out the copied nodes (their `rich` key stands for them). */
const keyOf = (tags: Tag[]) =>
  JSON.stringify(tags, (k, v: unknown) => (k === 'nodes' ? undefined : v));

/** A blank href is no href (it would reload the page and skip `href-template`). */
const hrefOf = (h: string | null | undefined): string | undefined => {
  const t = h?.trim();
  return t ? t : undefined;
};

/**
 * Kept with `no-style`: the tags wrap in a row with gaps, no bullets, every link and the
 * toggle at least 24px with space around (WCAG 2.5.8), the hidden label stays hidden and
 * `[hidden]` hides. `host` is `:host` or the tag name.
 */
const structuralRules = (host: string) => `
  ${host} { display: block; }
  ${host} ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  ${host} li { display: flex; max-width: 100%; min-width: 0; }
  ${host} :where(a.tag, .toggle) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-height: 24px;
    min-width: 24px;
  }
  ${host} :where(.toggle) { margin-top: 0.5rem; }
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
 * are filled chips (the card chip's colours), so a link never looks like a label. Every tag
 * and the toggle are at least 2rem (34px) tall and wide, 0.5rem apart.
 *
 * Give the tags as children: `<a href>` for a link, any other element (`<span>`) for plain
 * text. A child's `lang` and `dir` are kept, and so is inline markup inside it (`em`, `cite`,
 * `abbr`, `bdi`, a `span lang`…), copied element by element (never parsed as HTML). Or set
 * `href-template` (with `{tag}`, replaced by the URL-encoded text) to make every tag without
 * its own href a link; a blank href counts as none. Apps can set the `items` property
 * (`{ label, href?, lang?, dir? }`) instead; it wins over the children. Children with no text
 * are skipped with one warning.
 *
 * `label` names the list (shown above it, or visually hidden with `hide-label`); without one
 * a console warning is logged. `limit` shows that many tags and a “Show all N” button
 * (`aria-expanded`, `aria-controls`), which reveals the rest in place and keeps focus.
 *
 * Analytics never sends a tag's text (record tags can be user-submitted or machine-made), and
 * by default not the label either, which a template may fill from a record: the name is the
 * list's place among the tag lists on the page, `list N`. Add `track-label` when the label is
 * fixed text the page author wrote (“Subjects”), to send it instead.
 *
 * @tagname uvalib-tag-list
 * @fires uvalib-analytics-event - For `<site-analytics>`: a primary-button click on a tag link, `['uvalib-tag-list', 'tag-click', '<name>', <n>]` (n from 1, the tag's place in the list), and the toggle, `['uvalib-tag-list', 'show-all'|'show-fewer', '<name>']`. The name is `list N` (N from 1, the list's place among the tag lists in its document or shadow root), or with `track-label` the list's `label`; never the tag text or URL. Bubbles and is composed.
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
        margin-block-end: 0.5rem;
        font-weight: 600;
      }
      .tag {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        max-width: 100%;
        min-height: 2rem;
        min-width: 2rem;
        padding: 0.15rem 0.7rem;
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
        min-height: 2rem;
        min-width: 2rem;
        padding: 0.15rem 0.35rem;
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

  /** The list's name: shown above the tags (and, with `track-label`, the analytics name). */
  @property({ type: String }) label = '';

  /** Hide the label visually; it still names the list. */
  @property({ type: Boolean, attribute: 'hide-label' }) hideLabel = false;

  /**
   * Send the label as the analytics name. Only for fixed text the page author wrote, never a
   * label filled from a record. Without it the name is `list N`.
   */
  @property({ type: Boolean, attribute: 'track-label' }) trackLabel = false;

  /** Show this many tags and a “Show all N” button. Zero or empty shows every tag. */
  @property({ type: Number }) limit?: number;

  /**
   * Href for tags without their own, with `{tag}` where the URL-encoded text goes, for
   * example `/search?q={tag}`. Empty: such tags are plain text.
   */
  @property({ type: String, attribute: 'href-template' }) hrefTemplate = '';

  /** The tags as data (`{ label, href?, lang?, dir? }`), for apps. Wins over the children while set. */
  @property({ attribute: false }) items?: TagItem[];

  /** Whether every tag is shown (after Show all). */
  @state() private expanded = false;
  /** The tags read from the children. */
  @state() private childTags: Tag[] = [];

  private readonly uid = `uvalib-tag-list-${++instances}`;
  private warned = new Set<string>();

  constructor() {
    super();
    // Light DOM: the children move to a hidden holder before every render, also when the
    // element is connected, moved or reconnected before its first update.
    new SourceChildren(
      this,
      () => this.lightDom,
      (nodes) => this.read(nodes),
    );
  }

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
  }

  protected override firstUpdated(): void {
    if (!normalize(this.label))
      this.warnOnce('label', 'set label to name the list (for example “Subjects”).');
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has('items') && this.items?.some((i) => !normalize(i?.label)))
      this.warnOnce('text', 'ignoring tags with no text.');
  }

  private warnOnce(key: string, message: string): void {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    console.warn(`${this.localName}: ${message}`);
  }

  /** Read the tags from the source children. */
  private read(nodes: Node[]): void {
    const tags: Tag[] = [];
    let invalid = false;
    for (const n of nodes) {
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
      const tag: Tag = { label, ...langDir(n) };
      const href = n instanceof HTMLAnchorElement ? hrefOf(n.getAttribute('href')) : undefined;
      if (href !== undefined) tag.href = href;
      const copy = inlineCopy(n.childNodes, this.ownerDocument);
      if (copy.rich) {
        tag.rich = copy.key;
        tag.nodes = copy.nodes;
      }
      tags.push(tag);
    }
    if (invalid) this.warnOnce('text', 'ignoring tags with no text.');
    if (keyOf(tags) !== keyOf(this.childTags)) this.childTags = tags;
  }

  private safe(href: string): boolean {
    const ok = safeHref(href, this.ownerDocument.baseURI);
    if (!ok)
      this.warnOnce(
        'href',
        'showing a tag as text: its href is not http(s), mailto, tel or relative.',
      );
    return ok;
  }

  /** What is shown: `items` while set, else the children; hrefs from the template; unsafe ones dropped. */
  private get tags(): Tag[] {
    const source: Tag[] = this.items
      ? this.items
          .filter((i) => normalize(i?.label))
          .map((i) => {
            const t: Tag = { label: normalize(i.label) };
            const href = hrefOf(i.href);
            if (href !== undefined) t.href = href;
            if (i.lang !== undefined) t.lang = i.lang;
            if (i.dir) t.dir = i.dir;
            return t;
          })
      : this.childTags;
    const template = this.hrefTemplate.trim();
    return source.map((t) => {
      const href =
        t.href ??
        (template.includes('{tag}')
          ? template.replaceAll('{tag}', encodeURIComponent(t.label))
          : undefined);
      const out: Tag = { ...t };
      if (href !== undefined && this.safe(href)) out.href = href;
      else delete out.href;
      return out;
    });
  }

  /** The `limit`, when it hides anything: a positive whole number. */
  private get max(): number {
    const n = Math.trunc(this.limit ?? 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  /** The analytics name: the label with `track-label`, else `list N` (this list's place in its root). */
  private get name(): string {
    const label = normalize(this.label);
    if (this.trackLabel && label) return label;
    const root = this.getRootNode() as Document | ShadowRoot;
    const lists = root.querySelectorAll ? [...root.querySelectorAll(this.localName)] : [];
    const i = lists.indexOf(this);
    return `list ${i < 0 ? 1 : i + 1}`;
  }

  private onClick(e: MouseEvent): void {
    const node = e.target instanceof Node ? e.target : null;
    const el = node instanceof Element ? node : node?.parentElement;
    const a = el?.closest('a[href]');
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

  private renderTag(t: Tag, i: number) {
    const text = t.nodes ? t.nodes.map((n) => n.cloneNode(true)) : t.label;
    return t.href !== undefined
      ? html`<a
          class="tag"
          href=${t.href}
          data-index=${i}
          lang=${t.lang ?? nothing}
          dir=${t.dir ?? nothing}
          >${text}</a
        >`
      : html`<span class="tag" lang=${t.lang ?? nothing} dir=${t.dir ?? nothing}>${text}</span>`;
  }

  protected override render() {
    const tags = this.tags;
    const max = this.max;
    const collapsible = max > 0 && tags.length > max;
    const label = normalize(this.label);
    const labelId = `${this.uid}-label`;
    const listId = `${this.uid}-list`;
    const toggleText = this.expanded ? 'Show fewer' : `Show all ${tags.length}`;
    // One wrapper, always rendered.
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
              ${this.renderTag(t, i)}
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
