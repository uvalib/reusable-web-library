import { html, css, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { accessible } from '../../styles/accessible.js';
import {
  formatDay,
  fullDate,
  hoursEndpoints,
  hoursTiming,
  setHoursEndpoints,
  loadHours,
  loadLibraries,
  sanitizeHoursHtml,
  sortLibraries,
  todayInNewYork,
  type HoursByCalendar,
  type HoursEndpoints,
  type LibraryInfo,
} from '../library-hours/hours-data.js';
import type { HoursState } from '../library-weekly-hours/LibraryWeeklyHours.js';

/**
 * Today's hours for the UVA libraries, as on the library.virginia.edu home page: the date
 * (in America/New_York), a "Today's hours" heading, a list of library and hours pairs and a
 * link to /hours. Data comes from the library website's JSON:API (same origin) and LibCal,
 * shared between all hours elements on a page. The date and hours update when the date
 * changes in New York.
 *
 * @tagname site-hours-section
 * @fires got-library-hours - The hours were loaded. `detail` is `{ message }`. Bubbles and is composed.
 * @fires got-libraries - The libraries were loaded (fired after `got-library-hours`). `detail` is `{ message }`. Bubbles and is composed.
 * @cssprop [--uva-brand-blue=#232d4b] - Heading and link colour.
 * @cssprop [--uva-brand-orange=#e57200] - Focus ring colour.
 */
export class SiteHoursSection extends UvalibElement {
  static styles = [
    accessible,
    css`
      :host {
        display: block;
      }
      .home-hour-date {
        font-size: 0.875rem;
      }
      .hour-head {
        margin: 0.25rem 0 0.75rem;
        color: var(--uva-brand-blue, #232d4b);
      }
      .hours-locations {
        display: grid;
        grid-template-columns: auto auto;
        gap: 0.25rem 1rem;
        margin: 0;
      }
      .hours-locations dt {
        font-weight: bold;
      }
      .hours-locations dd {
        margin: 0;
        text-align: end;
      }
      .hours-locations dd p {
        margin: 0;
      }
      a {
        color: var(--uva-brand-blue, #232d4b);
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

  /** Only libraries with a priority placement (the home page's short list). */
  @property({ type: Boolean })
  limited = false;

  /** Only libraries of this type (`Library`, `space` or `other-professional`). */
  @property({ type: String, attribute: 'place-type' })
  placeType: string | null = null;

  /** `loading` (the default, until data arrives), `ready` or `error`. Read-only. */
  get state(): HoursState {
    return this._state;
  }

  @state() private _state: HoursState = 'loading';
  @state() private today = '';
  @state() private libraries: LibraryInfo[] = [];
  @state() private hours?: HoursByCalendar;
  /** The date `hours` belong to: shown (with the hours) until the next day's hours arrive. */
  @state() private hoursDate = '';

  private loadId = 0;
  private tickTimer?: ReturnType<typeof setInterval>;
  /** Sanitised hours information per library, so re-renders keep the same nodes. */
  private infoNodes = new Map<string, { source: string; nodes: Node[] }>();

  override connectedCallback(): void {
    super.connectedCallback();
    this.today = todayInNewYork();
    clearInterval(this.tickTimer);
    this.tickTimer = setInterval(() => {
      const today = todayInNewYork();
      if (today !== this.today) this.today = today;
      // Retry quietly while the list or the hours could not be loaded.
      else if (this._state === 'error' || (this._state === 'ready' && !this.hours))
        void this.load();
    }, hoursTiming.tick);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearInterval(this.tickTimer);
    this.tickTimer = undefined;
  }

  // A plain map: `today` is private, which PropertyValues<this> does not cover.
  protected override willUpdate(changed: Map<PropertyKey, unknown>) {
    if (this.isConnected && this.today && changed.has('today')) void this.load();
  }

  private async load() {
    const id = ++this.loadId;
    const today = this.today;
    // Only the first load shows "Loading hours…"; later ones keep the list until data lands.
    if (!this.libraries.length && this._state !== 'error') this._state = 'loading';
    let libraries: LibraryInfo[];
    try {
      libraries = sortLibraries(await loadLibraries());
    } catch {
      if (id === this.loadId) this._state = 'error';
      return;
    }
    let hours: HoursByCalendar | undefined;
    try {
      const ids = libraries.map((l) => l.calId).filter((n): n is number => n !== undefined);
      hours = await loadHours(ids, today, today);
    } catch {
      hours = undefined; // libraries with a calendar show "Hours unavailable"
    }
    if (id !== this.loadId) return;
    this.libraries = libraries;
    this.hours = hours;
    this.hoursDate = today;
    this._state = 'ready';
    const init = { bubbles: true, composed: true };
    this.dispatchEvent(
      new CustomEvent('got-library-hours', {
        ...init,
        detail: { message: 'fetched hours for libraries' },
      }),
    );
    this.dispatchEvent(
      new CustomEvent('got-libraries', { ...init, detail: { message: 'fetched libraries' } }),
    );
  }

  private get shown(): LibraryInfo[] {
    return this.libraries
      .filter((l) => !this.placeType || l.placeType === this.placeType)
      .filter((l) => !this.limited || (l.priorityPlacement ?? 0) > 0);
  }

  /** A library's sanitised hours information: its own nodes (a node can be in one place only). */
  private info(lib: LibraryInfo, source: string): Node[] {
    let entry = this.infoNodes.get(lib.id);
    if (entry?.source !== source) {
      entry = { source, nodes: [...sanitizeHoursHtml(source, this.ownerDocument).childNodes] };
      this.infoNodes.set(lib.id, entry);
    }
    return entry.nodes;
  }

  private renderHours(lib: LibraryInfo) {
    const unavailable = html`Hours unavailable. <a href="/hours">See all hours</a>`;
    if (lib.calId !== undefined) {
      const text = formatDay(this.hours?.get(lib.calId)?.[this.hoursDate]);
      return text || unavailable;
    }
    if (lib.siteLink) return html`<a href=${lib.siteLink}>See site</a>`;
    if (lib.hoursInformation) return this.info(lib, lib.hoursInformation);
    return unavailable;
  }

  private renderStatus() {
    if (this._state === 'loading') return 'Loading hours…';
    // The "See all hours and locations" link is right above.
    if (this._state === 'error' || !this.libraries.length)
      return 'Hours are unavailable right now.';
    return nothing;
  }

  render() {
    if (!this.today) return nothing;
    return html`
      <div class="home-hours-block">
        <div id="homehoursdate" class="home-hour-date">
          ${fullDate(this.hoursDate || this.today)}
        </div>
        <h3 class="hour-head">Today's hours</h3>
        <dl class="dl--inline hours-locations">
          ${repeat(
            this._state === 'ready' ? this.shown : [],
            (lib) => lib.id,
            (lib) =>
              html`<dt class="location">${lib.shortTitle || lib.title}</dt>
                <dd class="hours">${this.renderHours(lib)}</dd>`,
          )}
        </dl>
        <p class="hours-see-all"><a href="/hours">See all hours and locations</a></p>
        <div class="hours-status" role="status">${this.renderStatus()}</div>
      </div>
    `;
  }
}
