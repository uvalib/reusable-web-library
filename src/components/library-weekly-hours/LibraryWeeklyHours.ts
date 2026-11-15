import { html, css, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { accessible } from '../../styles/accessible.js';
import {
  addDays,
  formatDay,
  fullDate,
  hoursEndpoints,
  hoursTiming,
  setHoursEndpoints,
  loadHours,
  loadLibraries,
  longDate,
  shortDate,
  shortWeekday,
  todayInNewYork,
  weekHeadingDate,
  weekStart,
  type HoursByCalendar,
  type HoursEndpoints,
  type LibraryInfo,
} from '../library-hours/hours-data.js';

/** Element ids share the document id space in light DOM, so each instance gets its own prefix. */
let instanceCounter = 0;

/** What the table shows: one week's data, kept on screen while the next week loads. */
interface WeekView {
  days: string[];
  library: LibraryInfo;
  spaces: LibraryInfo[];
  hours: HoursByCalendar;
}

/** `loading` until the first data arrives, then `ready`, or `error` when it cannot be loaded. */
export type HoursState = 'loading' | 'ready' | 'error';

/**
 * The layout rules the week header and table need even with `no-style`: Drupal's /hours CSS
 * relies on them. `host` is `:host` (shadow) or the tag name (light DOM, so they stay scoped).
 */
const structuralRules = (host: string) => `
  ${host} { display: block; }
  ${host}[loading] { min-height: var(--library-weekly-hours-min-height, 0); }
  ${host} .hours-placeholder { visibility: hidden; }
  /* One line even when empty, so "Loading hours…" giving way to nothing moves nothing below. */
  ${host} .weekly-hours-status { min-height: 1.5em; min-height: 1lh; }
  ${host}[hidden], ${host} [hidden] { display: none !important; }
  ${host} .weekly-hours-header-section {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    text-align: center;
  }
  ${host} .weekly-hours-header-section div[role='heading'] { flex: 1; }
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
 * One library's opening hours for a week (Sunday to Saturday, in America/New_York): a
 * header with "Previous week" / "Next week" buttons and the date range, then a table with a
 * "Building hours" row and a row per space in the library. Data comes from the library
 * website's JSON:API (same origin) and LibCal, shared between all hours elements on a page.
 * Used on library.virginia.edu/hours through `<library-hours-setup>`.
 *
 * @tagname library-weekly-hours
 * @csspart building-hours - The "Building hours" table row (shadow mode).
 * @cssprop [--library-weekly-hours-min-height=0] - Height the element keeps during its first load (while it has the `loading` attribute, before any rows show), so content below does not jump when the hours arrive. Applies with `no-style` too. Pages can reserve the same height before the element upgrades with `library-weekly-hours:not(:defined) { display: block; min-height: … }`.
 * @cssprop [--uva-brand-orange=#e57200] - Border of today's column; focus ring colour.
 * @cssprop [--uva-brand-blue=#232d4b] - Header and button colour.
 * @cssprop --uva-color-border - Dark-mode role token: table cell borders (else #dadada).
 * @cssprop --uva-color-current - Dark-mode role token: today's column border (else `--uva-brand-orange`).
 * @cssprop --uva-color-link - Dark-mode role token: heading, button text and border (else `--uva-brand-blue`).
 * @cssprop --uva-color-surface-raised - Dark-mode role token: button background (else #fff).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 */
export class LibraryWeeklyHours extends UvalibElement {
  static styles = [
    accessible,
    shadowStructure,
    css`
      table {
        width: 100%;
        border-collapse: collapse;
        margin-block: 1rem;
      }
      th,
      td {
        padding: 0.5rem;
        border: 1px solid var(--uva-color-border, #dadada);
        text-align: center;
        vertical-align: middle;
      }
      tbody th {
        text-align: start;
      }
      th.today,
      td.today {
        border-inline: 2px solid var(--uva-color-current, var(--uva-brand-orange, #e57200));
      }
      th.today {
        border-block-start: 2px solid var(--uva-color-current, var(--uva-brand-orange, #e57200));
      }
      .date-header-day {
        font-weight: bold;
      }
      tbody .date--mobile {
        display: none;
      }
      .uvalib-button {
        font: inherit;
        padding: 0.4rem 0.9rem;
        border: 1px solid var(--uva-color-link, var(--uva-brand-blue, #232d4b));
        border-radius: 0.3rem;
        background: var(--uva-color-surface-raised, #fff);
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
        cursor: pointer;
      }
      .heading-h1,
      .heading-h2,
      .heading-h3,
      .heading-h4,
      .heading-h5,
      .heading-h6 {
        font-size: 1.25rem;
        font-weight: bold;
        color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
      }
    `,
  ];

  /**
   * The data endpoints shared by all hours elements: `libraries` (the Drupal JSON:API URL,
   * relative by default) and `hours` (LibCal, with `{ids}`). Assigning an object (or setting
   * a key) changes them for every hours element from the next load on. To repoint before
   * elements already in the HTML start fetching, set `window.uvalibHoursEndpoints` before
   * the define script runs.
   */
  static get endpoints(): HoursEndpoints {
    return hoursEndpoints;
  }
  static set endpoints(value: Partial<HoursEndpoints>) {
    setHoursEndpoints(value);
  }

  /** The library's `field_slug` in Drupal (for example `clemons`). */
  @property({ type: String, attribute: 'library-slug' })
  librarySlug?: string;

  /** Which week to show: 0 is this week, 1 next week, -1 last week. Changed by the buttons. */
  @property({ type: Number, attribute: 'week-count', reflect: true })
  weekCount = 0;

  /** How often (ms) the current week's hours are fetched again. 0 turns it off. */
  @property({ type: Number, attribute: 'refresh-every' })
  refreshEvery = 600000;

  /** Hide the "Building hours" row (for a library whose building calendar is one of its spaces). */
  @property({ type: Boolean, attribute: 'hide-building-hours', reflect: true })
  hideBuildingHours = false;

  /** `aria-level` (1–6) of the week heading, also its `heading-h<n>` class. Default 2. */
  @property({ type: Number, attribute: 'heading-level' })
  headingLevel?: number;

  /** Old name of `heading-level`, still accepted; `heading-level` wins. */
  @property({ type: Number, attribute: 'headinglevelstart' })
  headingLevelStart?: number;

  /** `loading` (the default, until data arrives), `ready` or `error`. Read-only. */
  get state(): HoursState {
    return this._state;
  }

  @state() private _state: HoursState = 'loading';
  @state() private today = '';
  @state() private view?: WeekView;
  /**
   * During the first load, once the library list is in: the rows the table will have, so
   * placeholder rows can hold their height until the hours arrive.
   */
  @state() private pending?: Omit<WeekView, 'hours'>;
  @state() private announcement = '';

  private readonly uid = `library-weekly-hours-${++instanceCounter}`;
  private loadId = 0;
  /** Set by the week buttons and Retry: announce the result of the next load. */
  private userInitiated = false;
  private tickTimer?: ReturnType<typeof setInterval>;
  private refreshTimer?: ReturnType<typeof setInterval>;

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
    this.today = todayInNewYork();
    clearInterval(this.tickTimer);
    this.tickTimer = setInterval(() => {
      const today = todayInNewYork();
      if (today !== this.today) this.today = today;
      else if (this._state === 'error') void this.load({ background: true });
    }, hoursTiming.tick);
    this.restartRefresh();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearInterval(this.tickTimer);
    clearInterval(this.refreshTimer);
    this.tickTimer = this.refreshTimer = undefined;
  }

  private restartRefresh() {
    clearInterval(this.refreshTimer);
    this.refreshTimer = undefined;
    const every = this.refreshEvery;
    if (!this.isConnected || !(every > 0)) return;
    this.refreshTimer = setInterval(() => {
      if (this.weekCount === 0 && this._state !== 'loading')
        void this.load({ background: true, maxAge: every / 2 });
    }, every);
  }

  /** The seven `YYYY-MM-DD` dates of the week shown. */
  private get days(): string[] {
    const start = addDays(weekStart(this.today), (Math.trunc(this.weekCount) || 0) * 7);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }

  private get level(): number {
    const n = Math.trunc(this.headingLevel ?? this.headingLevelStart ?? 2);
    return n >= 1 && n <= 6 ? n : 2;
  }

  // A plain map: `today` is private, which PropertyValues<this> does not cover.
  protected override willUpdate(changed: Map<PropertyKey, unknown>) {
    if (!this.isConnected || !this.today) return;
    if (!this.hasUpdated || changed.has('librarySlug') || changed.has('weekCount')) {
      void this.load();
    } else if (changed.has('today')) {
      // The date rolled over: reload quietly. The same week keeps its rows on a failure.
      void this.load({ background: this.view?.days[0] === this.days[0] });
    }
  }

  protected override updated(changed: PropertyValues<this>) {
    // Only the first load, before any rows show, reserves --library-weekly-hours-min-height.
    this.toggleAttribute('loading', this._state === 'loading' && !this.view);
    // The first value is picked up by connectedCallback.
    if (changed.has('refreshEvery') && changed.get('refreshEvery') !== undefined)
      this.restartRefresh();
  }

  /**
   * Load the week shown. The previous rows stay on screen (the table is `aria-busy`) until
   * the new data lands. A `background` load (refresh, retry from the interval or a rollover
   * within the week) does not change the state to loading and, if it fails while rows for
   * the same week are shown, keeps them. Only user-initiated loads announce their result.
   */
  private async load({
    background = false,
    maxAge = Infinity,
  }: { background?: boolean; maxAge?: number } = {}) {
    const id = ++this.loadId;
    const announce = this.userInitiated;
    this.userInitiated = false;
    const slug = this.librarySlug;
    if (!slug) {
      this._state = 'ready';
      this.view = undefined;
      return;
    }
    const days = this.days;
    if (!background) {
      this._state = 'loading';
      this.announcement = '';
    }
    try {
      const libraries = await loadLibraries();
      const library = libraries.find((l) => l.slug === slug);
      if (!library) throw new Error(`no library with slug "${slug}"`);
      const spaces = libraries.filter((l) => l.parent === library.id);
      if (id === this.loadId && !this.view) this.pending = { days, library, spaces };
      const ids = [library, ...spaces]
        .map((l) => l.calId)
        .filter((n): n is number => n !== undefined);
      const hours = await loadHours(ids, days[0]!, days[6]!, maxAge);
      if (id !== this.loadId) return; // a newer load owns the element
      this.view = { days, library, spaces, hours };
      this.pending = undefined;
      this._state = 'ready';
      if (announce)
        this.announcement = `Showing hours for ${fullDate(days[0]!)} to ${fullDate(days[6]!)}`;
    } catch {
      if (id !== this.loadId) return;
      const sameWeek = this.view?.days[0] === days[0];
      if (background && sameWeek && this._state !== 'error') return;
      if (!sameWeek) this.view = undefined;
      this.pending = undefined;
      this._state = 'error';
    }
  }

  private retry() {
    this.userInitiated = true;
    const hadFocus = this.focusedInside();
    void this.load().then(() => {
      // The Retry button is gone once the hours load; keep keyboard focus in the element.
      if (hadFocus && this._state === 'ready' && !this.focusedInside())
        this.renderRoot
          .querySelector<HTMLButtonElement>('.weekly-hours-header-section button')
          ?.focus();
    });
  }

  private focusedInside(): boolean {
    const active =
      this.renderRoot instanceof ShadowRoot
        ? this.renderRoot.activeElement
        : document.activeElement;
    return !!active && (this.renderRoot as Node).contains(active) && active !== this;
  }

  private previousWeek() {
    this.userInitiated = true;
    this.weekCount = (Math.trunc(this.weekCount) || 0) - 1;
  }

  private nextWeek() {
    this.userInitiated = true;
    this.weekCount = (Math.trunc(this.weekCount) || 0) + 1;
  }

  private renderMobileDate(day: string) {
    return html`<div class="date--mobile">
      <div class="date-header-day">${shortWeekday(day)}</div>
      <div class="date-header-month">${shortDate(day)}</div>
    </div>`;
  }

  private renderCells(days: string[], hours: HoursByCalendar, calId: number | undefined) {
    const dates = calId === undefined ? undefined : hours.get(calId);
    return days.map((day) => {
      const text = formatDay(dates?.[day]);
      return html`<td
        aria-label=${text ? `${longDate(day)}: ${text}` : longDate(day)}
        class=${day === this.today ? 'today' : nothing}
      >
        ${this.renderMobileDate(day)}${text}
      </td>`;
    });
  }

  /**
   * The first load's rows before the hours arrive: the real row headers with invisible,
   * typical hours text in each cell, so the table already has its final height in whatever
   * font the page uses and nothing below it moves when the hours replace the placeholders.
   */
  private renderPlaceholderRows({ days, library: lib, spaces }: Omit<WeekView, 'hours'>) {
    const cells = () =>
      days.map(
        (day) =>
          html`<td class=${day === this.today ? 'today' : nothing}>
            ${this.renderMobileDate(day)}<span class="hours-placeholder" aria-hidden="true"
              >10am - 10pm</span
            >
          </td>`,
      );
    const building =
      !this.hideBuildingHours && lib.calId !== undefined
        ? html`<tr part="building-hours">
            <th scope="row" colspan="2">Building hours</th>
            ${cells()}
          </tr>`
        : nothing;
    return html`${building}${spaces.map(
      (space) =>
        html`<tr>
          <th scope="row" colspan="2">
            <span class=${space.siteLink ? 'lib-space-link' : 'lib-space'}>${space.title}</span>
          </th>
          ${cells()}
        </tr>`,
    )}`;
  }

  private renderRows(view: WeekView | undefined) {
    if (!view) {
      if (this.pending) return this.renderPlaceholderRows(this.pending);
      // Before the library list is in: the Building hours row nearly every library has, so
      // only a library's extra spaces can still move what follows the table.
      if (this._state === 'loading' && !this.hideBuildingHours)
        return this.renderPlaceholderRows({
          days: this.days,
          library: { calId: 0 } as LibraryInfo,
          spaces: [],
        });
      return nothing;
    }
    const { days, library: lib, spaces, hours } = view;
    const building =
      !this.hideBuildingHours && lib.calId !== undefined && hours.has(lib.calId)
        ? html`<tr part="building-hours">
            <th scope="row" colspan="2" aria-label="Building hours">Building hours</th>
            ${this.renderCells(days, hours, lib.calId)}
          </tr>`
        : nothing;
    return html`${building}${spaces.map(
      (space) =>
        html`<tr>
          <th scope="row" colspan="2" aria-label=${space.title}>
            ${
              space.siteLink
                ? html`<a class="lib-space-link" href=${space.siteLink}>${space.title}</a>`
                : html`<span class="lib-space">${space.title}</span>`
            }
          </th>
          ${this.renderCells(days, hours, space.calId)}
        </tr>`,
    )}`;
  }

  private renderStatus() {
    // Only the first load says so; later loads keep the previous rows (aria-busy) quietly.
    if (this._state === 'loading') return this.view ? nothing : 'Loading hours…';
    if (this._state === 'error')
      return html`Hours are unavailable right now.
        <button type="button" class="uvalib-button uvalib-button--basic" @click=${this.retry}>
          Retry
        </button>`;
    return this.announcement
      ? html`<span class="visually-hidden">${this.announcement}</span>`
      : nothing;
  }

  render() {
    if (!this.librarySlug || !this.today) return nothing;
    const days = this.days;
    const level = this.level;
    const headingId = `${this.uid}-heading`;
    // The table shows the data it has (the previous week while the next one loads).
    const tableDays = this.view?.days ?? days;
    return html`<div class="weekly-hours-header-section">
        <button
          type="button"
          class="uvalib-button uvalib-button--basic"
          aria-describedby=${headingId}
          @click=${this.previousWeek}
        >
          Previous week
        </button>
        <div class="heading-h${level}" role="heading" aria-level=${level} id=${headingId}>
          ${weekHeadingDate(days[0]!)} - ${weekHeadingDate(days[6]!)}
        </div>
        <button
          type="button"
          class="uvalib-button uvalib-button--basic"
          aria-describedby=${headingId}
          @click=${this.nextWeek}
        >
          Next week
        </button>
      </div>
      <table
        class="weekly-hours-body-section"
        aria-busy=${this._state === 'loading' ? 'true' : nothing}
      >
        <colgroup>
          <col class="location-column" />
          ${tableDays.map(() => html`<col />`)}
          <col />
        </colgroup>
        <thead>
          <tr>
            <th colspan="2" scope="col"><span class="visually-hidden">Day</span></th>
            ${tableDays.map(
              (day) =>
                html`<th
                  scope="col"
                  aria-label=${longDate(day)}
                  aria-current=${day === this.today ? 'date' : nothing}
                  class=${day === this.today ? 'today' : nothing}
                >
                  <div class="date-header">${this.renderMobileDate(day)}</div>
                </th>`,
            )}
          </tr>
        </thead>
        <tbody>
          ${this.renderRows(this.view)}
        </tbody>
      </table>
      <div class="weekly-hours-status" role="status">${this.renderStatus()}</div>`;
  }
}
