import { html, css, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { accessible } from '../../styles/accessible.js';
import {
  addDays,
  formatDay,
  fullDate,
  hoursTiming,
  loadHours,
  loadLibraries,
  longDate,
  shortDate,
  shortWeekday,
  todayInNewYork,
  weekHeadingDate,
  weekStart,
  type HoursByCalendar,
  type LibraryInfo,
} from '../library-hours/hours-data.js';

/** `loading` until the first data arrives, then `ready`, or `error` when it cannot be loaded. */
export type HoursState = 'loading' | 'ready' | 'error';

/**
 * The layout rules the week header and table need even with `no-style`: Drupal's /hours CSS
 * relies on them. `host` is `:host` (shadow) or the tag name (light DOM, so they stay scoped).
 */
const structuralRules = (host: string) => `
  ${host} { display: block; }
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
 * @cssprop [--uva-brand-orange=#e57200] - Border of today's column; focus ring colour.
 * @cssprop [--uva-brand-blue=#232d4b] - Header and button colour.
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
        border: 1px solid #dadada;
        text-align: center;
        vertical-align: middle;
      }
      tbody th {
        text-align: start;
      }
      th.today,
      td.today {
        border-inline: 2px solid var(--uva-brand-orange, #e57200);
      }
      th.today {
        border-block-start: 2px solid var(--uva-brand-orange, #e57200);
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
        border: 1px solid var(--uva-brand-blue, #232d4b);
        border-radius: 0.3rem;
        background: #fff;
        color: var(--uva-brand-blue, #232d4b);
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
        color: var(--uva-brand-blue, #232d4b);
      }
    `,
  ];

  /** The library's `field_slug` in Drupal (for example `clemons`). */
  @property({ type: String, attribute: 'library-slug' })
  librarySlug?: string;

  /** Which week to show: 0 is this week, 1 next week, -1 last week. Changed by the buttons. */
  @property({ type: Number, attribute: 'week-count', reflect: true })
  weekCount = 0;

  /** How often (ms) the current week's hours are fetched again. 0 turns it off. */
  @property({ type: Number, attribute: 'refresh-every' })
  refreshEvery = 600_000;

  /** Hide the "Building hours" row (for a library whose building calendar is one of its spaces). */
  @property({ type: Boolean, attribute: 'hide-building-hours', reflect: true })
  hideBuildingHours = false;

  /** `aria-level` (1–6) of the week heading, also its `heading-h<n>` class. Default 2. */
  @property({ type: Number, attribute: 'heading-level' })
  headingLevel?: number;

  /** Old name of `heading-level`, still accepted; `heading-level` wins. */
  @property({ type: Number, attribute: 'headinglevelstart' })
  headingLevelStart?: number;

  /** Read-only: `loading`, `ready` or `error`. */
  @state()
  state: HoursState = 'ready';

  @state() private today = '';
  @state() private library?: LibraryInfo;
  @state() private spaces: LibraryInfo[] = [];
  @state() private hours?: HoursByCalendar;
  @state() private announcement = '';

  private loadId = 0;
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
      if (this.weekCount === 0 && this.state === 'ready')
        void this.load({ quiet: true, maxAge: every / 2 });
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
    if (changed.has('librarySlug') || changed.has('weekCount') || changed.has('today')) {
      void this.load({ announce: this.hasUpdated && changed.has('weekCount') });
    }
  }

  protected override updated(changed: PropertyValues<this>) {
    // The first value is picked up by connectedCallback.
    if (changed.has('refreshEvery') && changed.get('refreshEvery') !== undefined)
      this.restartRefresh();
  }

  private async load({
    quiet = false,
    announce = false,
    maxAge = Infinity,
  }: { quiet?: boolean; announce?: boolean; maxAge?: number } = {}) {
    const id = ++this.loadId;
    const slug = this.librarySlug;
    if (!slug) {
      this.state = 'ready';
      this.library = undefined;
      return;
    }
    const days = this.days;
    if (!quiet) {
      this.state = 'loading';
      this.hours = undefined;
      this.announcement = '';
    }
    try {
      const libraries = await loadLibraries();
      const library = libraries.find((l) => l.slug === slug);
      if (!library) throw new Error(`no library with slug "${slug}"`);
      const spaces = libraries.filter((l) => l.parent === library.id);
      const ids = [library, ...spaces]
        .map((l) => l.calId)
        .filter((n): n is number => n !== undefined);
      const hours = await loadHours(ids, days[0]!, days[6]!, maxAge);
      if (id !== this.loadId) return;
      this.library = library;
      this.spaces = spaces;
      this.hours = hours;
      this.state = 'ready';
      if (announce)
        this.announcement = `Showing hours for ${fullDate(days[0]!)} to ${fullDate(days[6]!)}`;
    } catch {
      if (id !== this.loadId || quiet) return;
      this.state = 'error';
    }
  }

  private previousWeek() {
    this.weekCount = (Math.trunc(this.weekCount) || 0) - 1;
  }

  private nextWeek() {
    this.weekCount = (Math.trunc(this.weekCount) || 0) + 1;
  }

  private renderMobileDate(day: string) {
    return html`<div class="date--mobile">
      <div class="date-header-day">${shortWeekday(day)}</div>
      <div class="date-header-month">${shortDate(day)}</div>
    </div>`;
  }

  private renderCells(days: string[], calId: number | undefined) {
    const dates = calId === undefined ? undefined : this.hours?.get(calId);
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

  private renderRows(days: string[]) {
    const lib = this.library;
    if (this.state !== 'ready' || !lib || !this.hours) return nothing;
    const building =
      !this.hideBuildingHours && lib.calId !== undefined && this.hours.has(lib.calId)
        ? html`<tr part="building-hours">
            <th scope="row" colspan="2" aria-label="Building hours">Building hours</th>
            ${this.renderCells(days, lib.calId)}
          </tr>`
        : nothing;
    return html`${building}${this.spaces.map(
      (space) =>
        html`<tr>
          <th scope="row" colspan="2" aria-label=${space.title}>
            ${
              space.siteLink
                ? html`<a class="lib-space-link" href=${space.siteLink}>${space.title}</a>`
                : html`<span class="lib-space">${space.title}</span>`
            }
          </th>
          ${this.renderCells(days, space.calId)}
        </tr>`,
    )}`;
  }

  private renderStatus() {
    if (this.state === 'loading') return 'Loading hours…';
    if (this.state === 'error')
      return html`Hours are unavailable right now.
        <a href="/hours">See all hours and locations</a>`;
    return this.announcement
      ? html`<span class="visually-hidden">${this.announcement}</span>`
      : nothing;
  }

  render() {
    if (!this.librarySlug || !this.today) return nothing;
    const days = this.days;
    const level = this.level;
    const table =
      this.state === 'error'
        ? nothing
        : html`<div class="weekly-hours-header-section">
              <button
                type="button"
                class="uvalib-button uvalib-button--basic"
                @click=${this.previousWeek}
              >
                Previous week
              </button>
              <div class="heading-h${level}" role="heading" aria-level=${level}>
                ${weekHeadingDate(days[0]!)} - ${weekHeadingDate(days[6]!)}
              </div>
              <button
                type="button"
                class="uvalib-button uvalib-button--basic"
                @click=${this.nextWeek}
              >
                Next week
              </button>
            </div>
            <table class="weekly-hours-body-section">
              <colgroup>
                <col class="location-column" />
                ${days.map(() => html`<col />`)}
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th colspan="2" scope="col"><span class="visually-hidden">Day</span></th>
                  ${days.map(
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
                ${this.renderRows(days)}
              </tbody>
            </table>`;
    return html`${table}
      <div class="weekly-hours-status" role="status">${this.renderStatus()}</div>`;
  }
}
