import { css, html, unsafeCSS, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { accessible } from '../../styles/accessible.js';

/** How long the count must stay put before it is announced (as bento-box and Pagefind). */
export const ANNOUNCE_DELAY_MS = 1000;
/** How long an announcement stays in the live region before it is cleared. */
const CLEAR_MS = 5000;

const count = (n: number) => n.toLocaleString('en-US');

/** A whole number at least 0, or undefined. */
const whole = (n: unknown): number | undefined => {
  const v = typeof n === 'number' ? n : Number.NaN;
  return Number.isFinite(v) && v >= 0 ? Math.trunc(v) : undefined;
};

/** Kept with `no-style`: the hidden live region stays hidden. */
const structuralRules = (host: string) => `
  ${host} { display: block; }
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
  ${host}[hidden] { display: none !important; }
`;
const shadowStructure = unsafeCSS(structuralRules(':host'));

/**
 * The results summary of a search or listing page, such as “Showing 48 of 3,694 shoots”, and
 * a polite live region that tells screen reader users when it changes.
 *
 * Set `total` (how many match), `shown` (how many are on the page) and `noun` (plural,
 * default “results”; `singular` for a total of one). The visible text follows at once:
 * “Showing 48 of 3,694 shoots”, “Showing all 12 shoots” (shown is the total, or unset),
 * “Showing 1 shoot” or “No shoots”; with only `shown`, “Showing 48 shoots”. Numbers use
 * thousands separators.
 *
 * The announcement waits until the text has not changed for `announce-delay` milliseconds
 * (default 1000, as `<bento-box>` and `<uvalib-pagefind-search>` settle), so typing in a
 * filter box is announced once. Nothing is announced for the first render, nor when the text
 * comes back to what was last announced. The announcement is cleared from the hidden region
 * five seconds later, so reading the page finds the count once.
 *
 * `<bento-box>` and `<uvalib-pagefind-search>` announce their own counts: use this element
 * for your own listings, not beside them.
 *
 * @tagname uvalib-results-count
 * @csspart text - The visible summary.
 * @cssprop --uva-color-text-muted - Dark-mode role token: text colour (else `--uva-grey-A`, #4f4f4f).
 */
export class UvalibResultsCount extends UvalibElement {
  static styles = [
    accessible,
    shadowStructure,
    css`
      :host {
        color: var(--uva-color-text-muted, var(--uva-grey-A, #4f4f4f));
      }
    `,
  ];

  /** How many results are shown on the page. */
  @property({ type: Number }) shown?: number;

  /** How many results match in all. */
  @property({ type: Number }) total?: number;

  /** What is counted, plural: “results” by default. */
  @property({ type: String }) noun = 'results';

  /** What is counted, singular, for a total of one. Default: “result” when `noun` is unset, else `noun`. */
  @property({ type: String }) singular = '';

  /** Milliseconds the text must stay the same before it is announced. */
  @property({ type: Number, attribute: 'announce-delay' }) announceDelay = 1000;

  /** What the live region holds now. */
  @state() private announcement = '';

  /** The text last announced, or shown at the first render. */
  private baseline = '';
  private pending?: ReturnType<typeof setTimeout>;
  private clearing?: ReturnType<typeof setTimeout>;

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

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this.pending);
    clearTimeout(this.clearing);
  }

  private word(n: number): string {
    const plural = this.noun.trim() || 'results';
    if (n !== 1) return plural;
    return this.singular.trim() || (plural === 'results' ? 'result' : plural);
  }

  /** The visible summary for the current numbers ('' when there is nothing to count). */
  get text(): string {
    const total = whole(this.total);
    const shown = whole(this.shown);
    if (total !== undefined) {
      if (total === 0) return `No ${this.word(0)}`;
      if (shown !== undefined && shown < total)
        return `Showing ${count(shown)} of ${count(total)} ${this.word(total)}`;
      if (total === 1) return `Showing 1 ${this.word(1)}`;
      return `Showing all ${count(total)} ${this.word(total)}`;
    }
    if (shown !== undefined) return `Showing ${count(shown)} ${this.word(shown)}`;
    return '';
  }

  /** Whether the first render is done (it is never announced). */
  private started = false;

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (!this.started) {
      this.started = true;
      this.baseline = this.text;
      return;
    }
    // The live region's own change is not a new count.
    if (changed.size === 1 && changed.has('announcement')) return;
    clearTimeout(this.pending);
    const delay = whole(this.announceDelay) ?? ANNOUNCE_DELAY_MS;
    this.pending = setTimeout(() => this.announce(), delay);
  }

  private announce(): void {
    const text = this.text;
    if (text === this.baseline) return;
    this.baseline = text;
    clearTimeout(this.clearing);
    this.announcement = text;
    this.clearing = setTimeout(() => (this.announcement = ''), CLEAR_MS);
  }

  protected override render() {
    return html`<span part="text" class="text">${this.text}</span
      ><span class="visually-hidden" role="status" aria-live="polite" aria-atomic="true"
        >${this.announcement}</span
      >`;
  }
}
