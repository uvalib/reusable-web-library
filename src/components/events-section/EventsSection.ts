import { precedingHeadingLevel } from '../../base/heading-level.js';
import { css, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { html, unsafeStatic, type StaticValue } from 'lit/static-html.js';
import { property, state } from 'lit/decorators.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { accessible } from '../../styles/accessible.js';
import {
  eventWhen,
  eventsEndpoints,
  eventsTiming,
  loadEvents,
  setEventsEndpoints,
  upcoming,
  type EventItem,
  type EventsEndpoints,
} from './events-data.js';

/**
 * `loading` until the first answer, then `ready` (events shown), `empty` (no upcoming events)
 * or `error` (they could not be loaded).
 */
export type EventsState = 'loading' | 'ready' | 'empty' | 'error';

const DEFAULT_LIMIT = 8;
const DEFAULT_LEVEL = 3;

/**
 * The rules the element needs even with `no-style`, where the Drupal theme styles the cards:
 * the host is a block, placeholder cards are invisible, titles are clamped to three lines (the
 * whole title stays in the DOM), the status line sits over the top of the cards at a constant
 * one-line height so it never moves anything, and `[hidden]` hides. `host` is `:host`
 * (shadow) or the tag name (light DOM, so they stay scoped).
 */
const structuralRules = (host: string) => `
  ${host} { display: block; position: relative; }
  ${host}[loading] { min-height: var(--events-section-min-height, 0); }
  ${host} .event-placeholder { visibility: hidden; }
  ${host} .event-title {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
  }
  ${host} .event-url:hover .event-title { text-decoration: underline; }
  ${host} .events-status {
    position: absolute;
    inset-block-start: 0;
    inset-inline: 0;
    min-height: 1.5em;
    min-height: 1lh;
    pointer-events: none;
  }
  ${host} .events-status button { pointer-events: auto; }
  ${host}[hidden], ${host} [hidden] { display: none !important; }
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
`;
const shadowStructure = unsafeCSS(structuralRules(':host'));

/**
 * Light DOM only, unlayered: the card title's top margin. The Drupal theme gives `h3` a 3rem
 * top margin and `h4` 1rem, and `.event-title` sets none, so without this the default h3
 * titles would push every card 2rem taller than the old h4 ones. 1rem is the old h4 value,
 * so the cards keep their geometry whatever `heading-level` is. Unlayered (and more
 * specific than a bare `h3`) so it beats the page's own heading rules.
 */
const lightTitleMargin = (tag: string) =>
  unsafeCSS(`${tag} .event-url .event-title { margin-block-start: 1rem; }`);

/**
 * Upcoming UVA Library events from LibCal, as on the library.virginia.edu home page: a grid of
 * cards, each one link with the event's title, a date column (month, day, weekday) and its
 * time, in America/New_York. Events that have ended are left out. Light DOM output keeps the
 * classes the Drupal theme styles (`event-container`, `event`, `event-url`, `event-title`,
 * `event-date`, `event--month`, `event--day`, `event--wkday`, `event-time`).
 *
 * @tagname events-section
 * @cssprop [--events-section-min-height=0] - Height the element keeps during its first load (while it has the `loading` attribute). Its placeholder cards already hold the final height; this only matters for a page that wants more. Applies with `no-style` too. Pages can reserve height before the element upgrades with `events-section:not(:defined) { display: block; min-height: … }`.
 * @cssprop [--uva-brand-orange-dark=#b35900] - Background of the date column (white text on it is 4.8:1).
 * @cssprop [--uva-brand-blue=#232d4b] - Event title colour.
 * @cssprop --uva-color-link - Dark-mode role token: event title colour (else `--uva-brand-blue`).
 * @cssprop --uva-color-text - Dark-mode role token: time and status text (else #2b2b2b).
 * @cssprop --uva-color-border - Dark-mode role token: card border (else #dadada).
 * @cssprop --uva-color-surface-raised - Dark-mode role token: card and button background (else #fff).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 */
export class EventsSection extends UvalibElement {
  static styles = [
    accessible,
    shadowStructure,
    css`
      :host {
        container-type: inline-size;
        color: var(--uva-color-text, var(--uva-grey-darkest, #2b2b2b));
      }
      .event-container {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 2rem;
        align-items: stretch;
      }
      /* Four columns only where each card leaves its time line room for a multi-day range
         on two lines; two below 75rem (as the Drupal theme does inside /rmc's columns), one
         below 40rem. */
      @container (width < 75rem) {
        .event-container {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @container (width < 40rem) {
        .event-container {
          grid-template-columns: minmax(0, 1fr);
        }
      }
      .event {
        display: grid;
      }
      .event-url {
        display: grid;
        grid-template-columns: 4.5rem minmax(0, 1fr);
        grid-template-rows: 1fr auto;
        column-gap: 1rem;
        min-height: 9rem;
        box-sizing: border-box;
        border: 1px solid var(--uva-color-border, var(--uva-grey-100, #dadada));
        background: var(--uva-color-surface-raised, #fff);
        color: inherit;
        text-decoration: none;
      }
      .event-date {
        grid-area: 1 / 1 / 3 / 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        margin: 0;
        padding: 1rem 0.25rem;
        background: var(--uva-brand-orange-dark, #b35900);
        color: #fff;
        text-align: center;
        line-height: 1.2;
        font-weight: bold;
      }
      .event--month,
      .event--wkday {
        font-size: 1.0625rem;
      }
      .event--day {
        font-size: 1.75rem;
      }
      .event-title {
        grid-area: 1 / 2 / 2 / 3;
        align-self: start;
        /* A 1rem top margin, as light DOM gets unlayered (see lightTitleMargin). */
        margin: 1rem 0 0;
        padding: 0 1rem 0 0;
        min-height: 3lh;
        font-size: 1rem;
        line-height: 1.3;
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
      }
      .event-time {
        grid-area: 2 / 2 / 3 / 3;
        margin: 0;
        padding: 0.5rem 1rem 1rem 0;
        /* Two lines, so a multi-day range ("Nov 20, 9:00 AM - Nov 21, 5:00 PM EST") that
           wraps does not make its row taller than the placeholders. */
        min-height: 2lh;
        font-size: 0.9375rem;
        line-height: 1.3;
      }
      .events-status {
        line-height: 1.5;
      }
      .uvalib-button {
        font: inherit;
        margin-inline-start: 0.5rem;
        padding: 0.1rem 0.75rem;
        border: 1px solid var(--uva-color-link, var(--uva-brand-blue, #232d4b));
        border-radius: 0.3rem;
        background: var(--uva-color-surface-raised, #fff);
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
        cursor: pointer;
      }
      .uvalib-button[aria-disabled='true'] {
        cursor: progress;
      }
    `,
  ];

  /**
   * The LibCal URLs shared by every `<events-section>`: `events` and `search` (used with
   * `query`). Assigning an object (or setting a key) changes them for every element from the
   * next load on. To repoint before elements already in the HTML start fetching, set
   * `window.uvalibEventsEndpoints` before the define script runs.
   */
  static get endpoints(): EventsEndpoints {
    return eventsEndpoints;
  }
  static set endpoints(value: Partial<EventsEndpoints>) {
    setEventsEndpoints(value);
  }

  /** How many events to show (at most; fewer when fewer are coming up). */
  @property({ type: Number })
  limit = 8;

  /** Only events in this LibCal category (its id, for example `38740`; several comma-separated). */
  @property({ type: String })
  category?: string;

  /** Only events matching this search text (LibCal's event search). */
  @property({ type: String })
  query?: string;

  /**
   * Cut titles longer than this many characters, with "…", for sighted users; assistive
   * technology still gets the whole title. Titles are clamped to three lines anyway, so this
   * is only kept for old pages.
   */
  @property({ type: Number, attribute: 'max-title-length' })
  maxTitleLength?: number;

  /**
   * The level of each event's title heading, 1 to 6. Unset (the default), it is one below
   * the nearest heading before the element in the page (an `<h2>` above gives `<h3>`
   * titles), or 3 when there is none.
   */
  @property({ type: Number, attribute: 'heading-level' })
  headingLevel?: number;

  /** One below the nearest preceding heading, worked out on connect (see `level`). */
  @state() private inferredLevel = DEFAULT_LEVEL;

  /** `loading` (the default, until the first answer), `ready`, `empty` or `error`. Read-only. */
  get state(): EventsState {
    return this._state;
  }

  @state() private _state: EventsState = 'loading';
  /** The events shown: kept on screen while a later load (an attribute change) runs. */
  @state() private events?: EventItem[];
  /** A Retry click's load is running: the button stays, disabled, so focus stays on it. */
  @state() private retrying = false;

  private loadId = 0;
  private retryTimer?: ReturnType<typeof setInterval>;

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
    const above = precedingHeadingLevel(this);
    this.inferredLevel = above === null ? DEFAULT_LEVEL : Math.min(above + 1, 6);
    if (this.lightDom) {
      const node = this.getRootNode();
      const root = node instanceof ShadowRoot || node instanceof Document ? node : undefined;
      if (this.noStyle)
        installLightDomStyles(
          `${this.localName}::structure`,
          unsafeCSS(structuralRules(this.localName)),
          { root, scope: false },
        );
      installLightDomStyles(`${this.localName}::title-margin`, lightTitleMargin(this.localName), {
        root,
        scope: false,
        layer: false,
      });
    }
    clearInterval(this.retryTimer);
    // Quietly try again after an error; once loaded, drop events that have since ended
    // (from the cache), fetching them again when the cached answer is an hour old.
    this.retryTimer = setInterval(() => {
      if (this._state !== 'loading')
        void this.load({ background: true, maxAge: eventsTiming.maxAge });
    }, eventsTiming.retryEvery);
    // Reconnected after a disconnect: catch up.
    if (this.hasUpdated) void this.load({ background: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearInterval(this.retryTimer);
    this.retryTimer = undefined;
  }

  private get count(): number {
    const n = Math.trunc(this.limit);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 100) : DEFAULT_LIMIT;
  }

  private get level(): number {
    const n = Math.trunc(this.headingLevel ?? Number.NaN);
    return n >= 1 && n <= 6 ? n : this.inferredLevel;
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    if (!this.isConnected) return;
    if (!this.hasUpdated || changed.has('limit') || changed.has('category') || changed.has('query'))
      void this.load();
  }

  protected override updated() {
    // Only while nothing real is shown does --events-section-min-height apply.
    this.toggleAttribute('loading', this._state === 'loading' && !this.events?.length);
  }

  /**
   * Load the events. The current cards stay on screen until the new ones land. A
   * `background` load (the retry interval) does not show the loading state and, if it fails
   * while events are shown, keeps them.
   */
  private async load({
    background = false,
    maxAge = Infinity,
  }: { background?: boolean; maxAge?: number } = {}) {
    const id = ++this.loadId;
    const limit = this.count;
    if (!background) this._state = 'loading';
    try {
      const all = await loadEvents(
        {
          limit,
          category: this.category?.trim() || undefined,
          query: this.query?.trim() || undefined,
        },
        maxAge,
      );
      if (id !== this.loadId) return; // a newer load owns the element
      this.events = upcoming(all, limit);
      this._state = this.events.length ? 'ready' : 'empty';
    } catch {
      if (id !== this.loadId) return;
      if (background && this._state !== 'error') return;
      this.events = undefined;
      this._state = 'error';
    }
  }

  private async retry() {
    if (this.retrying) return;
    const hadFocus = this.focusedInside();
    this.retrying = true;
    try {
      await this.load();
    } finally {
      this.retrying = false;
    }
    await this.updateComplete;
    // Keep keyboard focus in the element: on the first event, on Retry again, or on the
    // status line when there is nothing else to focus.
    if (!hadFocus) return;
    const r = this.renderRoot;
    if (this._state === 'ready') r.querySelector<HTMLAnchorElement>('.event-url[href]')?.focus();
    else if (this._state === 'error')
      r.querySelector<HTMLButtonElement>('.events-status button')?.focus();
    else r.querySelector<HTMLElement>('.events-status')?.focus();
  }

  private focusedInside(): boolean {
    const active =
      this.renderRoot instanceof ShadowRoot
        ? this.renderRoot.activeElement
        : document.activeElement;
    return !!active && (this.renderRoot as Node).contains(active) && active !== this;
  }

  /** The title, or with `max-title-length` a cut copy for the eye and the whole for AT. */
  private renderTitle(title: string) {
    const max = Math.trunc(this.maxTitleLength ?? 0);
    const chars = [...title];
    if (!(max > 0) || chars.length <= max) return title;
    return html`<span aria-hidden="true">${chars.slice(0, max).join('').trimEnd()}…</span
      ><span class="visually-hidden">${title}</span>`;
  }

  private renderEvent(e: EventItem, h: StaticValue) {
    const when = eventWhen(e);
    return html`<div class="event">
      <a href=${e.url} class="event-url">
        <${h} class="event-title">${this.renderTitle(e.title)}</${h}>
        <p class="event-date">
          <span class="event--month" aria-hidden="true">${when.month}</span>
          <span class="event--day" aria-hidden="true">${when.day}</span>
          <span class="event--wkday" aria-hidden="true">${when.weekday}</span>
          <time class="visually-hidden" datetime=${when.datetime}>${when.fullDate}</time>
        </p>
        <p class="event-time">${when.time}</p>
      </a>
    </div>`;
  }

  /**
   * An invisible card with the real DOM and classes and typical text, so the section has its
   * final height, in the page's own font and grid, before the events arrive. Its link has no
   * href, so nothing in it is focusable.
   */
  private renderPlaceholder(h: StaticValue) {
    return html`<div class="event event-placeholder" aria-hidden="true">
      <a class="event-url">
        <${h} class="event-title">Library event</${h}>
        <p class="event-date">
          <span class="event--month">Nov</span>
          <span class="event--day">30</span>
          <span class="event--wkday">Mon</span>
        </p>
        <p class="event-time">10:00 AM - 11:00 AM EST</p>
      </a>
    </div>`;
  }

  private renderStatus() {
    if (this.retrying || this._state === 'error')
      return html`Events are unavailable right now.
        <button
          type="button"
          class="uvalib-button uvalib-button--basic"
          aria-disabled=${this.retrying ? 'true' : nothing}
          @click=${this.retry}
        >
          ${this.retrying ? 'Retrying…' : 'Retry'}
        </button>`;
    switch (this._state) {
      case 'loading':
        return this.events?.length ? nothing : 'Loading events…';
      case 'empty':
        return 'No upcoming events.';
      default:
        return nothing;
    }
  }

  render() {
    const h = unsafeStatic(`h${this.level}`);
    const events = this.events?.length ? this.events : undefined;
    // Before the first answer: the limit's worth of placeholders, so the section has its
    // final height. Empty, failed or retrying: one row, so a failure does not leave a long
    // blank area (a phone stacks the cards in one column).
    const placeholders = events ? 0 : this._state === 'loading' && !this.retrying ? this.count : 1;
    return html`<div class="event-container">
        ${
          events
            ? events.map((e) => this.renderEvent(e, h))
            : Array.from({ length: placeholders }, () => this.renderPlaceholder(h))
        }
      </div>
      <div class="events-status" role="status" tabindex="-1">${this.renderStatus()}</div>`;
  }
}
