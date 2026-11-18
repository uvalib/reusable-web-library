import { html, css, nothing, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { trackEvent } from '../../base/analytics.js';
import { UvalibElement } from '../../base/UvalibElement.js';

/** Element ids share the document id space in light DOM, so each instance gets its own prefix. */
let instanceCounter = 0;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date written `YYYY-MM-DD`. Parsed by hand: `new Date()` shifts years by time zone. */
function isIsoDate(s: unknown): s is string {
  const m = typeof s === 'string' ? ISO_DATE.exec(s) : null;
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  date.setUTCFullYear(y); // years below 100 are otherwise mapped to 19xx
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

const yearOf = (iso: string): number => Number(iso.slice(0, 4));

/** How long (ms) after the last change the range is reported to analytics. Tests shorten it. */
export const dateRangeTiming = { debounce: 1000 };
const clamp = (iso: string, lo: string, hi: string): string =>
  iso < lo ? lo : iso > hi ? hi : iso;

/**
 * A date-range picker: a two-thumb year slider plus "From" and "To" date inputs. `min` and
 * `max` (ISO dates, `YYYY-MM-DD`) are required; without valid ones the element renders nothing
 * and logs a console warning once. The start can never pass the end, and both stay within
 * `min`..`max`.
 *
 * @tagname uvalib-date-range
 * @fires date-range-change - The range changed from a slider or a date input. `detail` is `{ value: [start, end] }` (ISO dates). Bubbles and is composed.
 * @fires uvalib-analytics-event - For `<site-analytics>`: `['uvalib-date-range', 'range-change', '<from year>–<to year>']`, 1 s after the visitor's last change (not when the range ends where it started). Bubbles and is composed.
 * @cssprop [--uva-brand-blue=#232d4b] - Selected slider range, thumbs, legend and focused date input border.
 * @cssprop [--uva-brand-orange=#e57200] - Focus ring colour (focus-visible outline).
 * @cssprop [--uva-font-family=inherit] - Font family.
 * @cssprop --uva-color-link - Dark-mode role token: legend and focused date input border (else `--uva-brand-blue`).
 * @cssprop --uva-color-track - Dark-mode role token: slider track (else #e5e7eb).
 * @cssprop --uva-color-accent-bg - Dark-mode role token: selected range and thumbs (else `--uva-brand-blue`).
 * @cssprop --uva-color-surface-raised - Dark-mode role token: date input background and thumb ring (else #ffffff).
 * @cssprop --uva-color-input-text - Dark-mode role token: date input text (else #1f2937).
 * @cssprop --uva-color-text-muted - Dark-mode role token: From / To labels (else #4b5563).
 * @cssprop --uva-color-control-border - Dark-mode role token: date input border (else `--uva-grey`, #808080).
 * @cssprop --uva-color-focus - Dark-mode role token: focus ring (else `--uva-brand-orange`).
 */
export class UvalibDateRange extends UvalibElement {
  static styles = css`
    :host {
      display: block;
      font-family: var(--uva-font-family, inherit);
      margin-bottom: 1.5rem;
    }
    fieldset {
      border: none;
      padding: 0;
      margin: 0;
    }
    legend {
      font-weight: bold;
      margin-bottom: 0.5rem;
      color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
    }
    .date-range-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .slider-wrapper {
      position: relative;
      height: 24px;
      margin: 0.5rem 0;
      display: flex;
      align-items: center;
    }
    .slider-track {
      position: absolute;
      height: 6px;
      border-radius: 3px;
      background-color: var(--uva-color-track, #e5e7eb);
      left: 0;
      right: 0;
      z-index: 1;
    }
    .slider-highlight {
      position: absolute;
      height: 6px;
      border-radius: 3px;
      background-color: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
      z-index: 2;
    }
    /* Each input fills the 24px wrapper so it meets the minimum touch-target size; the track stays a 6px bar. */
    input[type='range'] {
      position: absolute;
      width: 100%;
      height: 24px;
      background: none;
      pointer-events: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      margin: 0;
      padding: 0;
      z-index: 3;
    }
    input[type='range']:focus {
      outline: none;
    }
    /* The end input is later in the DOM, so it is on top. When both thumbs sit on the same year
     in the upper half, the start input goes on top so the pair can still be pulled apart. */
    input[type='range'].on-top {
      z-index: 4;
    }
    input[type='range']::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      height: 24px;
      width: 24px;
      border-radius: 50%;
      background-color: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
      border: 2px solid var(--uva-color-surface-raised, #ffffff);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      pointer-events: auto;
      transition:
        transform 0.1s ease,
        background-color 0.1s ease;
    }
    input[type='range']::-webkit-slider-thumb:hover {
      transform: scale(1.1);
      background-color: #ffc71a;
    }
    input[type='range']:focus-visible::-webkit-slider-thumb {
      outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
      outline-offset: 2px;
    }
    input[type='range']::-moz-range-thumb {
      height: 20px;
      width: 20px;
      border-radius: 50%;
      background-color: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
      border: 2px solid var(--uva-color-surface-raised, #ffffff);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      pointer-events: auto;
      transition:
        transform 0.1s ease,
        background-color 0.1s ease;
    }
    input[type='range']::-moz-range-thumb:hover {
      transform: scale(1.1);
      background-color: #ffc71a;
    }
    input[type='range']:focus-visible::-moz-range-thumb {
      outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
      outline-offset: 2px;
    }
    .inputs-wrapper {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }
    .input-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
    }
    .input-label {
      font-size: 0.75rem;
      color: var(--uva-color-text-muted, #4b5563);
      font-weight: 500;
    }
    .date-input {
      padding: 0.375rem 0.5rem;
      border: 1px solid var(--uva-color-control-border, var(--uva-grey, #808080));
      border-radius: 0.375rem;
      font-size: 0.875rem;
      color: var(--uva-color-input-text, #1f2937);
      background-color: var(--uva-color-surface-raised, #ffffff);
      width: 100%;
    }
    .date-input:focus-visible {
      border-color: var(--uva-color-link, var(--uva-brand-blue, #232d4b));
      outline: 2px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
      outline-offset: 1px;
    }
  `;

  /** Earliest selectable date, `YYYY-MM-DD`. Required. */
  @property({ type: String })
  min = '';

  /** Latest selectable date, `YYYY-MM-DD`. Required. */
  @property({ type: String })
  max = '';

  /** Selected `[start, end]` ISO dates. Missing, invalid or out-of-range entries fall back to `min` / `max`. */
  @property({ type: Array })
  value: string[] = [];

  /** Legend text; the two sliders are named from it ("<label>: start year"). */
  @property({ type: String })
  label = 'Date range';

  private readonly uid = `uvalib-date-range-${++instanceCounter}`;
  private warned = false;

  private get valid(): boolean {
    return isIsoDate(this.min) && isIsoDate(this.max) && this.min <= this.max;
  }

  /** The selected range as valid ISO dates inside `min`..`max`, with start <= end. */
  private get range(): [string, string] {
    const [a, b] = Array.isArray(this.value) ? this.value : [];
    const start = isIsoDate(a) ? clamp(a, this.min, this.max) : this.min;
    const end = isIsoDate(b) ? clamp(b, this.min, this.max) : this.max;
    return start <= end ? [start, end] : [end, end];
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    if (!this.warned && (changed.has('min') || changed.has('max')) && !this.valid) {
      this.warned = true;
      console.warn(
        `<uvalib-date-range>: set "min" and "max" to ISO dates (YYYY-MM-DD) with min <= max; nothing is rendered until then.`,
      );
    }
  }

  /** `iso` moved to `year`, keeping month and day; falls back to `fallbackMonthDay` (for example 29 Feb in a common year). */
  private withYear(iso: string, year: number, fallbackMonthDay: string): string {
    const y = String(year).padStart(4, '0');
    const moved = `${y}-${iso.slice(5)}`;
    return isIsoDate(moved) ? moved : `${y}-${fallbackMonthDay}`;
  }

  private onStartYearInput(e: Event) {
    const slider = e.target as HTMLInputElement;
    const [start, end] = this.range;
    const year = Math.min(Number(slider.value), yearOf(end));
    slider.value = String(year);
    this.updateRange(clamp(this.withYear(start, year, '01-01'), this.min, end), end);
  }

  private onEndYearInput(e: Event) {
    const slider = e.target as HTMLInputElement;
    const [start, end] = this.range;
    const year = Math.max(Number(slider.value), yearOf(start));
    slider.value = String(year);
    this.updateRange(start, clamp(this.withYear(end, year, '12-31'), start, this.max));
  }

  private onDateInputChange(e: Event, index: 0 | 1) {
    const input = e.target as HTMLInputElement;
    if (!isIsoDate(input.value)) return;
    const [start, end] = this.range;
    if (index === 0) this.updateRange(clamp(input.value, this.min, end), end);
    else this.updateRange(start, clamp(input.value, start, this.max));
  }

  /** Analytics: the years before the visitor's current run of changes, and its debounce. */
  private reported?: string;
  private reportTimer?: ReturnType<typeof setTimeout>;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this.reportTimer);
    this.reported = undefined;
  }

  private years(): string {
    const [start, end] = this.range;
    return `${yearOf(start)}–${yearOf(end)}`;
  }

  private updateRange(start: string, end: string) {
    this.reported ??= this.years();
    clearTimeout(this.reportTimer);
    this.reportTimer = setTimeout(() => {
      const years = this.years();
      if (years !== this.reported) trackEvent(this, ['uvalib-date-range', 'range-change', years]);
      this.reported = undefined;
    }, dateRangeTiming.debounce);
    this.value = [start, end];
    this.dispatchEvent(
      new CustomEvent('date-range-change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    if (!this.valid) return nothing;
    const minYear = yearOf(this.min);
    const maxYear = yearOf(this.max);
    const [start, end] = this.range;
    const startYear = yearOf(start);
    const endYear = yearOf(end);
    const totalRange = maxYear - minYear || 1;
    const startPercent = ((startYear - minYear) / totalRange) * 100;
    const endPercent = ((endYear - minYear) / totalRange) * 100;
    const startId = `${this.uid}-start`;
    const endId = `${this.uid}-end`;
    return html`
      <fieldset>
        <legend>${this.label}</legend>
        <div class="date-range-container">
          <div class="slider-wrapper">
            <div class="slider-track"></div>
            <div
              class="slider-highlight"
              style="left: ${startPercent}%; width: ${endPercent - startPercent}%;"
            ></div>
            <input
              type="range"
              .min=${String(minYear)}
              .max=${String(maxYear)}
              .value=${String(startYear)}
              class=${startYear === endYear && startYear * 2 > minYear + maxYear ? 'on-top' : ''}
              @input=${this.onStartYearInput}
              aria-label="${this.label}: start year"
            />
            <input
              type="range"
              .min=${String(minYear)}
              .max=${String(maxYear)}
              .value=${String(endYear)}
              @input=${this.onEndYearInput}
              aria-label="${this.label}: end year"
            />
          </div>
          <div class="inputs-wrapper">
            <div class="input-group">
              <label class="input-label" for=${startId}>From</label>
              <input
                type="date"
                id=${startId}
                class="date-input"
                .min=${this.min}
                .max=${end}
                .value=${start}
                @change=${(e: Event) => this.onDateInputChange(e, 0)}
              />
            </div>
            <div class="input-group">
              <label class="input-label" for=${endId}>To</label>
              <input
                type="date"
                id=${endId}
                class="date-input"
                .min=${start}
                .max=${this.max}
                .value=${end}
                @change=${(e: Event) => this.onDateInputChange(e, 1)}
              />
            </div>
          </div>
        </div>
      </fieldset>
    `;
  }
}
