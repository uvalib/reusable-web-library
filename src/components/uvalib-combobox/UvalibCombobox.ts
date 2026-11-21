import { css, html, nothing, svg, unsafeCSS, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import { trackError, trackEvent } from '../../base/analytics.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { normalize, SourceChildren } from '../../base/source-children.js';
import { accessible } from '../../styles/accessible.js';

/**
 * One suggestion: the value submitted with the form and reported in events, the text shown
 * (default: the value), an optional second line, and whether it can be chosen. Other fields
 * are kept: `select` and `change` hand back the object you gave.
 */
export interface ComboboxItem {
  value: string;
  label?: string;
  description?: string;
  disabled?: boolean;
  [key: string]: unknown;
}

/** Turns a `src` response into suggestions (default: the response is already an array). */
export type ComboboxTransform = (data: unknown, query: string) => (ComboboxItem | string)[];

/**
 * `debounce`: milliseconds after the last keystroke before `src` is fetched. `announce`:
 * milliseconds the suggestion count must stay put before it is announced. Tests may shorten them.
 */
export const comboboxTiming = { debounce: 250, announce: 500 };

const TAG = 'uvalib-combobox';
/** How long an announcement stays in the live region before it is cleared. */
const CLEAR_MS = 5000;
/** Responses kept per `src`, so Backspace does not fetch again. */
const CACHE_SIZE = 30;
let uid = 0;

/** A suggestion as shown: its display text, folded for matching, and what was given. */
interface Entry {
  value: string;
  label: string;
  description?: string;
  disabled: boolean;
  fold: string;
  /** What events and `selected` hand back: the given object, or `{ value, label }` for a string. */
  raw: ComboboxItem;
}

const MARKS = /\p{M}/gu;
/** Case- and accent-insensitive form: “Ébène” and “ebene” match. */
export const fold = (s: string): string => s.normalize('NFD').replace(MARKS, '').toLowerCase();

/** `label` folded, with the index in `label` that each folded character came from. */
function foldMap(label: string): { text: string; map: number[] } {
  let text = '';
  const map: number[] = [];
  let i = 0;
  for (const ch of label) {
    const f = fold(ch);
    for (let k = 0; k < f.length; k++) map.push(i);
    text += f;
    i += ch.length;
  }
  map.push(i);
  return { text, map };
}

const WORD = /[\p{L}\p{N}]/u;

function toEntry(raw: unknown): Entry | null {
  if (typeof raw === 'string' || typeof raw === 'number') {
    const s = normalize(raw);
    return s
      ? { value: s, label: s, disabled: false, fold: fold(s), raw: { value: s, label: s } }
      : null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as ComboboxItem;
  const label = normalize(r.label ?? r.value);
  if (!label) return null;
  const e: Entry = {
    value: String(r.value ?? label),
    label,
    disabled: !!r.disabled,
    fold: fold(label),
    raw: r,
  };
  const d = normalize(r.description);
  if (d) e.description = d;
  return e;
}

const toEntries = (list: unknown): Entry[] =>
  Array.isArray(list) ? list.map(toEntry).filter((e): e is Entry => e !== null) : [];

const count = (n: number) => n.toLocaleString('en-US');

/**
 * Kept with `no-style`: the popup under the field, 44px options and clear button, and the
 * hidden live region. `host` is `:host` or the tag.
 */
const structuralRules = (host: string) => `
  ${host} { display: block; max-width: 100%; line-height: 1.5; }
  ${host} .label { display: block; margin-block-end: 0.25rem; }
  ${host} .field { position: relative; }
  ${host} .input {
    box-sizing: border-box;
    inline-size: 100%;
    min-block-size: 44px;
    margin: 0;
    padding-inline-end: 44px;
    font: inherit;
  }
  ${host} .clear {
    position: absolute;
    inset-block-start: 0;
    inset-inline-end: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    inline-size: 44px;
    block-size: 44px;
    margin: 0;
    padding: 0;
    cursor: pointer;
  }
  ${host} .popup {
    position: absolute;
    inset-inline: 0;
    inset-block-start: calc(100% + 2px);
    z-index: 20;
    box-sizing: border-box;
    max-block-size: min(18rem, 60vh);
    margin: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  ${host} .listbox { margin: 0; padding: 0; list-style: none; }
  ${host} .option {
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-sizing: border-box;
    min-block-size: 44px;
    overflow-wrap: anywhere;
    cursor: pointer;
  }
  ${host} .option[aria-disabled='true'] { cursor: not-allowed; }
  ${host} .message { box-sizing: border-box; min-block-size: 44px; margin: 0; }
  ${host} .description { margin: 0.25rem 0 0; }
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

const BORDER = unsafeCSS('var(--uva-color-control-border, var(--uva-grey, #808080))');
const ACCENT = unsafeCSS('var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b))');
const MUTED = unsafeCSS('var(--uva-color-text-muted, var(--uva-grey-A, #4f4f4f))');
const TEXT = unsafeCSS('var(--uva-color-input-text, var(--uva-grey-darkest, #2b2b2b))');
const RAISED = unsafeCSS('var(--uva-color-surface-raised, #ffffff)');

const CLEAR_ICON = svg`<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

/**
 * An editable text field that suggests values as you type, from a local list or a URL: a
 * person, place or subject picker. It follows the WAI-ARIA APG “Editable Combobox With List
 * Autocomplete”: a real `<input role="combobox">` and a `role="listbox"` popup under it.
 *
 * Suggestions come from the `items` property (`{ value, label?, description?, disabled? }`
 * objects, or strings), from `<option>` children (directly or inside a `<datalist>`; the
 * `label` attribute or text is the label, `data-description` the second line), or from `src`,
 * a URL template with `{q}` (fetched 250 ms after the last keystroke once the text has
 * `min-length` characters, default 1; a newer keystroke aborts the older request; the
 * response is a JSON array of the same shape, or anything `transform(data, query)` turns
 * into one). `items` wins over the children while set. Local suggestions match anywhere in
 * the label, ignoring case and accents, those starting with the text first, then those with
 * a word starting with it; at most `max-results` (default 50, 0 for all) are shown, which
 * keeps a list of 16,000 people fast. The matched text is bold and underlined in a `<mark>`.
 *
 * Keys: Down opens the list on the first suggestion and moves (wrapping), Up opens on the
 * last, Alt+Down opens without moving, Alt+Up closes, Enter chooses the active suggestion
 * (and then does not submit the form; with none active, Enter submits as in any field),
 * Escape closes the list and a second Escape clears the field, Home, End, Left and Right move
 * the caret, and Tab leaves without choosing. A real clear button (“Clear <label>”, 44px,
 * shown only with text) empties the field and returns focus to it.
 *
 * Free text is allowed: `value` is whatever is in the field, and `selected` the chosen
 * suggestion (or null); typing after choosing clears it, and leaving the field with text that
 * is exactly one suggestion's label chooses it. `must-choose` makes any other text invalid
 * (“Choose one of the suggestions.”). The element is form-associated: with `name` it submits
 * the chosen suggestion's value, or else the text, and a form reset restores the `value`
 * attribute. `required` and `disabled` (also from a disabled fieldset) work as on an input.
 *
 * A polite status says “5 suggestions”, “50 of 1,234 suggestions”, “No suggestions”,
 * “Loading suggestions” or “Couldn't load suggestions” half a second after the list settles
 * (never on the first render); the popup shows the same notes visibly. A failed load never
 * throws.
 *
 * Before it upgrades, `base.css` shows the label (from the attribute) and holds the field's
 * height. A fallback `<input list>` child works as a plain field meanwhile; on upgrade its
 * text, `name` and `placeholder` carry over, and it is disabled so it does not submit twice.
 *
 * @tagname uvalib-combobox
 * @fires input - The text changed by typing (the native event of the field, composed). Not fired when an option is chosen.
 * @fires select - A suggestion was chosen (click or Enter). `detail` is `{ item }`, the object given. Bubbles and is composed.
 * @fires change - The value was committed: a suggestion chosen, the field cleared, or the field left with changed text. `detail` is `{ value, item }` (`item` is the chosen suggestion or null). Not fired when the app sets `value` or `selected`. Bubbles and is composed.
 * @fires uvalib-analytics-event - For `<site-analytics>`: `['uvalib-combobox', 'select', '<label>', <position from 1>]` when a suggestion is chosen, `['uvalib-combobox', 'clear', '<label>']` when the clear button or Escape empties the field, and `['uvalib-combobox', 'error', 'load']` once when `src` fails. Never the typed text or a suggestion's text or value. Bubbles and is composed.
 * @csspart label - The visible label.
 * @csspart input - The text field.
 * @csspart clear - The clear button.
 * @csspart popup - The popup under the field.
 * @csspart option - Each suggestion.
 * @csspart description - The hint under the field.
 * @cssprop --uva-color-surface-raised - Dark-mode role token: field and popup background (else #fff).
 * @cssprop --uva-color-control-border - Dark-mode role token: field and popup border (else `--uva-grey`, #808080).
 * @cssprop --uva-color-input-text - Dark-mode role token: field and suggestion text (else #2b2b2b).
 * @cssprop --uva-color-text-muted - Dark-mode role token: descriptions, notes and the clear icon (else #4f4f4f).
 * @cssprop --uva-color-surface-hover - Dark-mode role token: active suggestion background (else #dadada).
 * @cssprop --uva-color-track - Dark-mode role token: hovered suggestion background (else #f1f1f1).
 * @cssprop --uva-color-accent-bg - Dark-mode role token: the active suggestion's bar and outline (else `--uva-brand-blue`).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 * @cssprop --uva-color-shadow - Dark-mode role token: popup shadow.
 */
export class UvalibCombobox extends UvalibElement {
  static formAssociated = true;
  static override shadowRootOptions: ShadowRootInit = {
    ...UvalibElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static styles = [
    accessible,
    shadowStructure,
    css`
      .label {
        font-weight: 600;
      }
      .input {
        padding-block: 0.5rem;
        padding-inline-start: 0.75rem;
        border: 1px solid ${BORDER};
        border-radius: 5px;
        background: ${RAISED};
        color: ${TEXT};
        line-height: 1.2;
      }
      .input::placeholder {
        color: ${MUTED};
        opacity: 1;
      }
      .input:disabled {
        background: var(--uva-color-track, var(--uva-grey-200, #f1f1f1));
        color: ${MUTED};
        cursor: not-allowed;
      }
      .input[aria-invalid='true'] {
        border-width: 2px;
      }
      .clear {
        border: 0;
        border-radius: 5px;
        background: none;
        color: ${MUTED};
      }
      .clear:hover {
        color: ${TEXT};
      }
      .clear:focus-visible {
        outline-offset: -4px;
      }
      .popup {
        padding-block: 0.25rem;
        border: 1px solid ${BORDER};
        border-radius: 5px;
        background: ${RAISED};
        color: ${TEXT};
        box-shadow: 0 4px 12px var(--uva-color-shadow, rgba(0, 0, 0, 0.2));
      }
      .option {
        padding: 0.375rem 0.75rem;
        border-inline-start: 4px solid transparent;
      }
      .option:hover {
        background: var(--uva-color-track, var(--uva-grey-200, #f1f1f1));
      }
      /* The active suggestion: a fill, a bar at the start and an outline, never colour alone. */
      .option[aria-selected='true'] {
        border-inline-start-color: ${ACCENT};
        background: var(--uva-color-surface-hover, var(--uva-grey-100, #dadada));
        outline: 2px solid ${ACCENT};
        outline-offset: -2px;
      }
      .option[aria-disabled='true'] {
        color: ${MUTED};
        font-style: italic;
      }
      .option-description {
        color: ${MUTED};
        font-size: 0.875em;
      }
      mark {
        background: none;
        color: inherit;
        font-weight: 700;
        text-decoration: underline;
        text-underline-offset: 0.15em;
      }
      .message {
        padding: 0.625rem 0.75rem;
        color: ${MUTED};
      }
      .description {
        color: ${MUTED};
      }
      @media (forced-colors: active) {
        .input,
        .popup {
          border-color: CanvasText;
        }
        .clear {
          color: ButtonText;
        }
        .option[aria-selected='true'] {
          forced-color-adjust: none;
          border-inline-start-color: HighlightText;
          background: Highlight;
          color: HighlightText;
          outline-color: HighlightText;
        }
        .option[aria-selected='true'] .option-description {
          color: HighlightText;
        }
        .option[aria-disabled='true'] {
          color: GrayText;
        }
      }
    `,
  ];

  /** The field's visible label (required); also the analytics name. */
  @property({ type: String }) label = '';

  /** A hint under the field, read with it (aria-describedby). */
  @property({ type: String }) description = '';

  @property({ type: String }) placeholder = '';

  /** The form field name. */
  @property({ type: String, reflect: true }) name = '';

  /**
   * The text in the field. The attribute is the starting text, and what a form reset
   * restores. Setting it does not fire `change`.
   */
  @property({ type: String }) value = '';

  /**
   * The chosen suggestion, or null. Set it (an item or a string) to show a choice: the field
   * shows its label. Setting it does not fire `change`.
   */
  @property({ attribute: false }) selected: ComboboxItem | null = null;

  /** Suggestions as data: `{ value, label?, description?, disabled? }` or strings. Wins over the children. */
  @property({ attribute: false }) items?: (ComboboxItem | string)[];

  /** A URL template with `{q}` (the trimmed text, URL-encoded) that returns suggestions as JSON. */
  @property({ type: String }) src = '';

  /** Maps a `src` response to suggestions, e.g. `(data) => data.results`. */
  @property({ attribute: false }) transform?: ComboboxTransform;

  /** Characters typed before suggestions appear (and `src` is fetched). */
  @property({ type: Number, attribute: 'min-length' }) minLength = 1;

  /** The most suggestions shown at once; 0 for all. */
  @property({ type: Number, attribute: 'max-results' }) maxResults = 50;

  /** Text that is not one of the suggestions is invalid. */
  @property({ type: Boolean, attribute: 'must-choose' }) mustChoose = false;

  @property({ type: Boolean, reflect: true }) required = false;
  @property({ type: Boolean, reflect: true }) disabled = false;

  @state() private open = false;
  @state() private active = -1;
  @state() private shown: Entry[] = [];
  @state() private total = 0;
  @state() private loading: 'idle' | 'loading' | 'error' = 'idle';
  @state() private announcement = '';
  @state() private formDisabled = false;
  @state() private invalidShown = false;
  @state() private childEntries: Entry[] = [];

  private internals: ElementInternals;
  private readonly uid = `${TAG}-${++uid}`;
  private warned = new Set<string>();
  /** The last committed state: `change` fires when it differs. */
  private committed: { value: string; item: ComboboxItem | null } = { value: '', item: null };
  /** Values this element set itself (any other change is the app's). */
  private ownValue?: string;
  private ownSelected?: ComboboxItem | null;
  private itemEntries?: Entry[];
  private itemsSource?: unknown;
  private remote: Entry[] = [];
  private remoteQuery?: string;
  private cache = new Map<string, Entry[]>();
  private abort?: AbortController;
  private fetchTimer?: ReturnType<typeof setTimeout>;
  private announceTimer?: ReturnType<typeof setTimeout>;
  private clearTimer?: ReturnType<typeof setTimeout>;
  private lastAnnounced = '';
  private adopted = new WeakSet<HTMLInputElement>();
  private started = false;

  constructor() {
    super();
    this.internals = this.attachInternals();
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

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.cancelFetch();
    clearTimeout(this.announceTimer);
    clearTimeout(this.clearTimer);
    this.open = false;
  }

  /* ---------- form association ---------- */

  get form(): HTMLFormElement | null {
    return this.internals.form;
  }
  get validity(): ValidityState {
    return this.internals.validity;
  }
  get validationMessage(): string {
    return this.internals.validationMessage;
  }
  get willValidate(): boolean {
    return this.internals.willValidate;
  }
  checkValidity(): boolean {
    return this.internals.checkValidity();
  }
  reportValidity(): boolean {
    return this.internals.reportValidity();
  }

  formResetCallback(): void {
    this.cancelFetch();
    this.open = false;
    this.active = -1;
    this.invalidShown = false;
    this.setOwn(this.getAttribute('value') ?? '', null);
    this.committed = { value: this.value, item: null };
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === 'string') {
      this.setOwn(state, null);
      this.committed = { value: state, item: null };
    }
  }

  private get input(): HTMLInputElement | null {
    return this.renderRoot.querySelector<HTMLInputElement>(`#${this.uid}-input`);
  }

  override focus(options?: FocusOptions): void {
    const input = this.input;
    if (input) input.focus(options);
    else super.focus(options);
  }

  private updateForm(): void {
    const v = this.selected ? String(this.selected.value) : this.value;
    this.internals.setFormValue(v, this.value);
    const input = this.input ?? undefined;
    if (this.required && !this.value.trim())
      this.internals.setValidity({ valueMissing: true }, 'Fill in this field.', input);
    else if (this.mustChoose && this.value.trim() && !this.selected)
      this.internals.setValidity({ customError: true }, 'Choose one of the suggestions.', input);
    else this.internals.setValidity({});
  }

  /* ---------- data ---------- */

  private warnOnce(kind: string, message: string): void {
    if (this.warned.has(kind)) return;
    this.warned.add(kind);
    console.warn(`${this.localName}: ${message}`);
  }

  /** Read `<option>`s (direct or in a `<datalist>`) and adopt a fallback `<input>`. */
  private read(nodes: Node[]): void {
    const options: HTMLOptionElement[] = [];
    for (const n of nodes) {
      if (n instanceof HTMLOptionElement) options.push(n);
      else if (n instanceof HTMLDataListElement) options.push(...n.options);
      else if (n instanceof HTMLInputElement) {
        this.adopt(n);
        if (n.list && !nodes.includes(n.list)) options.push(...n.list.options);
      }
    }
    const entries = toEntries(
      options.map((o) => {
        const label = normalize(o.getAttribute('label') ?? o.textContent) || o.value;
        const item: ComboboxItem = { value: o.value || label, label };
        const d = o.getAttribute('data-description');
        if (d) item.description = d;
        if (o.disabled) item.disabled = true;
        return item;
      }),
    );
    const key = (list: Entry[]) =>
      list
        .map((e) => `${e.value}\u0001${e.label}\u0001${e.description ?? ''}\u0001${+e.disabled}`)
        .join('\u0000');
    if (key(entries) !== key(this.childEntries)) this.childEntries = entries;
  }

  /** The no-JavaScript field: its text, name and placeholder carry over, then it is disabled. */
  private adopt(input: HTMLInputElement): void {
    if (this.adopted.has(input)) return;
    this.adopted.add(input);
    if (!this.name && input.name) this.name = input.name;
    if (!this.placeholder && input.placeholder) this.placeholder = input.placeholder;
    if (!this.value && input.value) this.setOwn(input.value, null);
    input.disabled = true;
  }

  /** Local suggestions: `items` while set, else the children. */
  private get local(): Entry[] {
    if (this.items) {
      if (this.items !== this.itemsSource) {
        this.itemsSource = this.items;
        this.itemEntries = toEntries(this.items);
      }
      return this.itemEntries!;
    }
    return this.childEntries;
  }

  /** The trimmed text, and folded for matching. */
  private get query(): { text: string; folded: string } {
    const text = normalize(this.value);
    return { text, folded: fold(text) };
  }

  private get max(): number {
    const m = Math.trunc(Number(this.maxResults));
    return Number.isFinite(m) && m > 0 ? m : Infinity;
  }

  /** Prefix matches, then word-start matches, then the rest, each in the given order. */
  private filter(q: string): void {
    const all = this.local;
    const max = this.max;
    if (!q) {
      this.shown = all.slice(0, max);
      this.total = all.length;
      return;
    }
    const buckets: Entry[][] = [[], [], []];
    let total = 0;
    for (const e of all) {
      const i = e.fold.indexOf(q);
      if (i < 0) continue;
      total++;
      const b = i === 0 ? 0 : WORD.test(e.fold[i - 1]!) ? 2 : 1;
      if (buckets[b]!.length < max) buckets[b]!.push(e);
    }
    this.shown = buckets.flat().slice(0, max);
    this.total = total;
  }

  private cancelFetch(): void {
    clearTimeout(this.fetchTimer);
    this.fetchTimer = undefined;
    this.abort?.abort();
    this.abort = undefined;
  }

  private showRemote(q: string, entries: Entry[]): void {
    this.remote = entries;
    this.remoteQuery = q;
    this.loading = 'idle';
    this.shown = entries.slice(0, this.max);
    this.total = entries.length;
  }

  /** `src`: the cached response, or a fetch once typing pauses. */
  private request(q: string): void {
    this.cancelFetch();
    const cached = this.cache.get(q);
    if (cached) {
      this.showRemote(q, cached);
      return;
    }
    this.loading = 'loading';
    this.fetchTimer = setTimeout(() => void this.load(q), comboboxTiming.debounce);
  }

  private async load(q: string): Promise<void> {
    const ctrl = new AbortController();
    this.abort = ctrl;
    const url = this.src.replaceAll('{q}', encodeURIComponent(q));
    try {
      const res = await fetch(new URL(url, this.ownerDocument.baseURI), {
        signal: ctrl.signal,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json();
      const list = this.transform ? this.transform(data, q) : data;
      if (!Array.isArray(list)) throw new Error('the response is not an array');
      if (ctrl.signal.aborted) return;
      const entries = toEntries(list);
      this.cache.set(q, entries);
      if (this.cache.size > CACHE_SIZE) this.cache.delete(this.cache.keys().next().value!);
      if (this.query.text !== q) return;
      this.showRemote(q, entries);
      this.active = -1;
    } catch (err) {
      if (ctrl.signal.aborted) return;
      this.loading = 'error';
      this.shown = [];
      this.total = 0;
      this.remoteQuery = undefined;
      this.warnOnce('load', `couldn't load suggestions (${(err as Error).message}).`);
      trackError(this, TAG, 'load');
    } finally {
      if (this.abort === ctrl) this.abort = undefined;
    }
  }

  /** Recompute the suggestions for the current text. */
  private refresh(): void {
    const q = this.query;
    if (this.src) {
      if (q.text.length < this.minLength) {
        this.cancelFetch();
        this.loading = 'idle';
        this.shown = [];
        this.total = 0;
        return;
      }
      if (q.text === this.remoteQuery && this.loading !== 'error') {
        this.shown = this.remote.slice(0, this.max);
        this.total = this.remote.length;
        return;
      }
      this.request(q.text);
      return;
    }
    this.filter(q.folded);
  }

  /* ---------- state changes ---------- */

  private setOwn(value: string, item: ComboboxItem | null): void {
    this.value = this.ownValue = value;
    this.selected = this.ownSelected = item;
  }

  private emit(type: string, detail: object): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  /** The suggestion whose label is exactly the text (ignoring case and accents), if one. */
  private exact(): Entry | undefined {
    const q = this.query.folded;
    if (!q) return undefined;
    const pool = this.src ? this.remote : this.local;
    const hits = pool.filter((e) => !e.disabled && e.fold === q);
    return hits.length === 1 ? hits[0] : undefined;
  }

  private commit(): void {
    if (!this.selected) {
      const m = this.exact();
      if (m) this.setOwn(m.label, m.raw);
    }
    const { value, selected } = this;
    this.invalidShown = this.mustChoose && !!value.trim() && !selected;
    if (value === this.committed.value && selected === this.committed.item) return;
    this.committed = { value, item: selected };
    this.emit('change', { value, item: selected });
  }

  private close(): void {
    this.open = false;
    this.active = -1;
  }

  private openList(at: 'none' | 'first' | 'last'): void {
    if (this.src && this.query.text.length < this.minLength) return;
    this.refresh();
    this.open = true;
    this.active =
      at === 'none'
        ? -1
        : this.step(at === 'first' ? -1 : this.shown.length, at === 'first' ? 1 : -1);
  }

  /** The next choosable index from `from` in `dir`, wrapping; -1 when there is none. */
  private step(from: number, dir: 1 | -1): number {
    const n = this.shown.length;
    for (let k = 1; k <= n; k++) {
      const i = (((from + dir * k) % n) + n) % n;
      if (!this.shown[i]!.disabled) return i;
    }
    return -1;
  }

  private choose(index: number): void {
    const e = this.shown[index];
    if (!e || e.disabled) return;
    this.cancelFetch();
    this.setOwn(e.label, e.raw);
    this.close();
    this.invalidShown = false;
    this.emit('select', { item: e.raw });
    trackEvent(this, [TAG, 'select', this.label.trim(), index + 1]);
    this.commit();
  }

  private clear(): void {
    this.cancelFetch();
    this.loading = 'idle';
    this.setOwn('', null);
    this.close();
    trackEvent(this, [TAG, 'clear', this.label.trim()]);
    this.commit();
    this.focus();
  }

  /* ---------- handlers ---------- */

  private onInput(e: Event): void {
    const text = (e.target as HTMLInputElement).value;
    const keep = this.selected && text === normalize(this.selected.label ?? this.selected.value);
    this.setOwn(text, keep ? this.selected : null);
    this.invalidShown = false;
    this.active = -1;
    if (this.query.text.length < this.minLength) {
      this.cancelFetch();
      this.loading = 'idle';
      this.close();
      return;
    }
    this.refresh();
    this.open = true;
  }

  private onKeydown(e: KeyboardEvent): void {
    if (e.isComposing) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (e.altKey) {
          if (!this.open) this.openList('none');
        } else if (!this.open) this.openList('first');
        else this.active = this.step(this.active, 1);
        return;
      case 'ArrowUp':
        e.preventDefault();
        if (e.altKey) this.close();
        else if (!this.open) this.openList('last');
        else this.active = this.step(this.active < 0 ? this.shown.length : this.active, -1);
        return;
      case 'Enter':
        if (this.open && this.active >= 0) {
          e.preventDefault();
          this.choose(this.active);
          return;
        }
        this.close();
        this.commit();
        this.updateForm();
        if (!this.lightDom && this.form) {
          // A shadow field is not the form's own: submit as a native field would.
          e.preventDefault();
          this.submit(this.form);
        }
        return;
      case 'Escape':
        if (this.open) {
          e.preventDefault();
          e.stopPropagation();
          this.cancelFetch();
          if (this.loading === 'loading') this.loading = 'idle';
          this.close();
        } else if (this.value) {
          e.preventDefault();
          e.stopPropagation();
          this.clear();
        }
        return;
      case 'Home':
      case 'End':
      case 'ArrowLeft':
      case 'ArrowRight':
        this.active = -1;
        return;
    }
  }

  /** Implicit submission: click the default button, or submit when there is none. */
  private submit(form: HTMLFormElement): void {
    const button = [...form.elements].find(
      (el): el is HTMLButtonElement | HTMLInputElement =>
        (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) &&
        (el.type === 'submit' || el.type === 'image'),
    );
    if (button) {
      if (!button.disabled) button.click();
      return;
    }
    form.requestSubmit();
  }

  private onBlur(): void {
    this.cancelFetch();
    if (this.loading === 'loading') this.loading = 'idle';
    this.close();
    this.commit();
  }

  private onOptionClick(e: MouseEvent): void {
    const li = (e.target as Element).closest<HTMLElement>('[role="option"]');
    if (!li) return;
    this.choose(Number(li.dataset.index));
  }

  /* ---------- status ---------- */

  /** The visible note in the popup, and what the live region says. */
  private get note(): { visible: string; spoken: string } {
    if (this.loading === 'loading' && !this.shown.length)
      return { visible: 'Loading suggestions…', spoken: 'Loading suggestions' };
    if (this.loading === 'error')
      return { visible: "Couldn't load suggestions", spoken: "Couldn't load suggestions" };
    const n = this.shown.length;
    if (!n) return { visible: 'No suggestions', spoken: 'No suggestions' };
    if (this.total > n)
      return {
        visible: `Showing ${count(n)} of ${count(this.total)}. Type more to narrow them.`,
        spoken: `${count(n)} of ${count(this.total)} suggestions`,
      };
    return { visible: '', spoken: `${count(n)} suggestion${n === 1 ? '' : 's'}` };
  }

  private scheduleAnnouncement(): void {
    clearTimeout(this.announceTimer);
    const text = this.open ? this.note.spoken : '';
    if (!text) {
      this.lastAnnounced = '';
      return;
    }
    if (text === this.lastAnnounced) return;
    this.announceTimer = setTimeout(() => {
      const now = this.open ? this.note.spoken : '';
      if (!now || now === this.lastAnnounced) return;
      this.lastAnnounced = now;
      this.announcement = now;
      clearTimeout(this.clearTimer);
      this.clearTimer = setTimeout(() => (this.announcement = ''), CLEAR_MS);
    }, comboboxTiming.announce);
  }

  /* ---------- lifecycle ---------- */

  protected override willUpdate(changed: PropertyValues): void {
    if (!this.label.trim()) this.warnOnce('label', 'set label: the field needs a visible label.');
    if (changed.has('selected') && this.selected !== this.ownSelected) {
      // Set by the app: show it.
      const s = this.selected as ComboboxItem | string | null;
      const e = s === null || s === undefined ? null : toEntry(s);
      this.selected = this.ownSelected = e ? e.raw : null;
      if (e) this.value = this.ownValue = e.label;
      this.committed = { value: this.value, item: this.selected };
    } else if (changed.has('value') && this.value !== this.ownValue) {
      this.value = this.ownValue = String(this.value ?? '');
      if (this.selected && this.value !== normalize(this.selected.label ?? this.selected.value))
        this.selected = this.ownSelected = null;
      this.committed = { value: this.value, item: this.selected };
    }
    if (changed.has('src') || changed.has('transform')) {
      this.cache.clear();
      this.remoteQuery = undefined;
    }
    if (
      this.open &&
      (changed.has('items') || changed.has('childEntries') || changed.has('maxResults'))
    )
      this.refresh();
    if (this.open && this.active >= this.shown.length) this.active = -1;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (!this.started) {
      this.started = true;
      this.updateForm();
      return;
    }
    if (
      changed.has('value') ||
      changed.has('selected') ||
      changed.has('required') ||
      changed.has('mustChoose')
    )
      this.updateForm();
    if (
      changed.has('open') ||
      changed.has('shown') ||
      changed.has('total') ||
      changed.has('loading')
    )
      this.scheduleAnnouncement();
    if (changed.has('active') && this.active >= 0) this.reveal();
  }

  /** Scroll the active suggestion into view inside the popup (not the page). */
  private reveal(): void {
    const popup = this.renderRoot.querySelector<HTMLElement>('.popup');
    const opt = this.renderRoot.querySelector<HTMLElement>(`#${this.uid}-opt-${this.active}`);
    if (!popup || !opt) return;
    const top = opt.offsetTop;
    const bottom = top + opt.offsetHeight;
    if (top < popup.scrollTop) popup.scrollTop = top;
    else if (bottom > popup.scrollTop + popup.clientHeight)
      popup.scrollTop = bottom - popup.clientHeight;
  }

  /* ---------- render ---------- */

  private marked(label: string, q: string) {
    if (!q) return label;
    const { text, map } = foldMap(label);
    const parts: unknown[] = [];
    let last = 0;
    let from = 0;
    for (let i = text.indexOf(q); i !== -1; i = text.indexOf(q, from)) {
      const s = map[i]!;
      const end = map[i + q.length]!;
      if (s > last) parts.push(label.slice(last, s));
      parts.push(html`<mark>${label.slice(s, end)}</mark>`);
      last = end;
      from = i + q.length;
    }
    parts.push(label.slice(last));
    return parts;
  }

  protected override render() {
    const id = this.uid;
    const label = this.label.trim();
    const off = this.disabled || this.formDisabled;
    const expanded = this.open && this.shown.length > 0;
    const note = this.open ? this.note.visible : '';
    const q = this.query.folded;
    return html`<label class="label" part="label" id="${id}-label" for="${id}-input"
        >${label}</label
      >
      <div class="field">
        <input
          id="${id}-input"
          class="input"
          part="input"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded=${expanded ? 'true' : 'false'}
          aria-controls="${id}-listbox"
          aria-activedescendant=${expanded && this.active >= 0 ? `${id}-opt-${this.active}` : nothing}
          aria-describedby=${this.description ? `${id}-description` : nothing}
          aria-required=${this.required ? 'true' : nothing}
          aria-invalid=${this.invalidShown ? 'true' : nothing}
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          placeholder=${this.placeholder || nothing}
          .value=${live(this.value)}
          ?disabled=${off}
          @input=${this.onInput}
          @keydown=${this.onKeydown}
          @blur=${this.onBlur}
          @change=${(e: Event) => e.stopPropagation()}
          @select=${(e: Event) => e.stopPropagation()}
        /><button
          type="button"
          class="clear"
          part="clear"
          aria-label="Clear ${label}"
          ?hidden=${!this.value || off}
          @mousedown=${(e: MouseEvent) => e.preventDefault()}
          @click=${this.clear}
        >
          ${CLEAR_ICON}
        </button>
        <div
          class="popup"
          part="popup"
          ?hidden=${!this.open || (!this.shown.length && !note)}
          @mousedown=${(e: MouseEvent) => e.preventDefault()}
        >
          <ul
            id="${id}-listbox"
            class="listbox"
            role="listbox"
            aria-labelledby="${id}-label"
            ?hidden=${!expanded}
            @click=${this.onOptionClick}
          >
            ${
              expanded
                ? this.shown.map(
                    (e, i) =>
                      html`<li
                        id="${id}-opt-${i}"
                        class="option"
                        part="option"
                        role="option"
                        data-index=${i}
                        aria-selected=${i === this.active ? 'true' : 'false'}
                        aria-disabled=${e.disabled ? 'true' : nothing}
                      >
                        <span class="option-label">${this.marked(e.label, q)}</span>${
                          e.description
                            ? html`<span class="option-description">${e.description}</span>`
                            : nothing
                        }
                      </li>`,
                  )
                : nothing
            }
          </ul>
          <p class="message" ?hidden=${!note}>${note}</p>
        </div>
      </div>
      <p class="description" part="description" id="${id}-description" ?hidden=${!this.description}>
        ${this.description}
      </p>
      <span class="visually-hidden" role="status" aria-live="polite" aria-atomic="true"
        >${this.announcement}</span
      >`;
  }
}
