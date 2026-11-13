import { html, css, nothing, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { accessible } from '../../styles/accessible.js';

/** One checkbox in a facet: a value, how many results it matches, and whether it is selected. */
export interface FilterBucket {
  key: string;
  doc_count: number;
  selected: boolean;
}

/** A facet: a machine name (used in events and input names), a title and its buckets. */
export interface FilterFacet {
  name: string;
  title: string;
  position: number;
  buckets: FilterBucket[];
}

/** One scope chip: the value reported in `scope-change` and the visible label. */
export interface FilterScopeOption {
  value: string;
  label: string;
}

/** Element ids share the document id space in light DOM, so each instance gets its own prefix. */
let instanceCounter = 0;

/**
 * A faceted-search filter: a fieldset of checkboxes (value plus result count), optional
 * toggle chips ("scopes") above them, and "See more" / "See less" buttons when `limit` is set.
 * It is controlled: set `filter`, `value` and `scopeValue` from your search state and listen
 * for the change events.
 *
 * @tagname uvalib-filter
 * @fires filter-change - A checkbox was toggled. `detail` is `{ name, value }`: the facet name and the new array of selected keys. Does not bubble.
 * @fires scope-change - A scope chip was toggled. `detail` is `{ value }`: the new array of pressed scope values. Does not bubble.
 * @csspart see-more - The "See more" button (shadow mode).
 * @csspart see-less - The "See less" button (shadow mode).
 * @cssprop [--uva-brand-blue=#232d4b] - Scope chip text, hover border and pressed background.
 * @cssprop [--uva-brand-orange=#e57200] - Focus ring colour (focus-visible outline).
 */
export class UvalibFilter extends UvalibElement {
  static styles = [
    accessible,
    css`
      :host {
        display: block;
      }
      fieldset {
        border: none;
        padding: 0;
        margin: 0;
      }
      legend {
        font-weight: bold;
        margin-bottom: 0.5rem;
      }
      .scopes {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        margin: 0 0 0.85rem;
        padding: 0 0 0.75rem;
        border-bottom: 1px solid #e5e7eb;
      }
      .scope {
        appearance: none;
        margin: 0;
        border: 1px solid #c5cdd8;
        background: #fff;
        color: var(--uva-brand-blue, #232d4b);
        border-radius: 999px;
        padding: 0.2rem 0.7rem;
        font: inherit;
        font-size: 0.8rem;
        font-weight: 600;
        line-height: 1.4;
        cursor: pointer;
      }
      .scope:hover {
        border-color: var(--uva-brand-blue, #232d4b);
      }
      .scope[aria-pressed='true'] {
        background: var(--uva-brand-blue, #232d4b);
        border-color: var(--uva-brand-blue, #232d4b);
        color: #fff;
      }
      .checkbox {
        margin: 0.5rem 0;
      }
      input[type='checkbox'] {
        margin-right: 0.5rem;
      }
    `,
  ];

  /** The facet to show: `{ name, title, position, buckets: [{ key, doc_count, selected }] }`. */
  @property({ type: Object })
  filter: FilterFacet = { name: '', title: '', position: 0, buckets: [] };

  /** Selected bucket keys (matched case-insensitively). */
  @property({ type: Array })
  value: string[] = [];

  /** Optional toggle chips shown under the legend (for example attendee types): `[{ value, label }]`. */
  @property({ type: Array })
  scopes: FilterScopeOption[] = [];

  /** Pressed scope values (matched case-insensitively). */
  @property({ type: Array })
  scopeValue: string[] = [];

  /** Accessible name of the scope chip group. Empty (the default) means `Filter <title> by type`. */
  @property({ type: String, attribute: 'scopes-label' })
  scopesLabel = '';

  /** Maximum buckets to show at first; 0 shows all. "See more" doubles it, "See less" halves it back. */
  @property({ type: Number })
  limit = 0;

  @state()
  private currentLimit = 0;

  private readonly uid = `uvalib-filter-${++instanceCounter}`;

  private get buckets(): FilterBucket[] {
    return this.filter?.buckets ?? [];
  }

  private onChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const values = new Set(this.value);
    if (input.checked) values.add(input.value);
    else values.delete(input.value);
    this.value = Array.from(values);
    this.dispatchEvent(
      new CustomEvent('filter-change', { detail: { name: this.filter.name, value: this.value } }),
    );
  }

  private toggleScope(key: string, e: Event) {
    e.preventDefault();
    e.stopPropagation();
    const values = new Set(this.scopeValue);
    if (values.has(key)) values.delete(key);
    else values.add(key);
    this.scopeValue = Array.from(values);
    this.dispatchEvent(new CustomEvent('scope-change', { detail: { value: this.scopeValue } }));
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // A new filter or limit starts collapsed again.
    if (changed.has('limit') || changed.has('filter')) {
      this.currentLimit = this.limit > 0 ? this.limit : this.buckets.length;
    }
  }

  private showMore() {
    this.currentLimit = Math.min(this.currentLimit * 2, this.buckets.length);
  }

  private showLess() {
    this.currentLimit = Math.max(Math.ceil(this.currentLimit / 2), this.limit);
  }

  render() {
    const total = this.buckets.length;
    const title = this.filter?.title ?? '';
    const shown = Math.min(this.currentLimit || total, total);
    const collapsible = this.limit > 0;
    const listId = `${this.uid}-list`;
    const lower = (s: string) => s.toLowerCase();
    return html`
      <fieldset>
        <legend>${title}</legend>
        ${
          this.scopes.length
            ? html`<div
                class="scopes"
                role="group"
                aria-label=${this.scopesLabel || `Filter ${title} by type`}
              >
                ${this.scopes.map((scope) => {
                  const pressed = this.scopeValue.some((v) => lower(v) === lower(scope.value));
                  return html`<button
                    type="button"
                    class="scope"
                    value=${scope.value}
                    aria-pressed=${pressed ? 'true' : 'false'}
                    @click=${(e: Event) => this.toggleScope(scope.value, e)}
                  >
                    ${scope.label}
                  </button>`;
                })}
              </div>`
            : nothing
        }
        <div id=${listId}>
          ${this.buckets.slice(0, shown).map((bucket, idx) => {
            const id = `${this.uid}-${idx}`;
            return html`<div class="checkbox">
              <input
                type="checkbox"
                id=${id}
                name=${this.filter.name}
                value=${bucket.key}
                @change=${this.onChange}
                .checked=${this.value.some((v) => lower(v) === lower(bucket.key))}
              />
              <label for=${id}>${bucket.key || '(empty)'} (${bucket.doc_count})</label>
            </div>`;
          })}
        </div>
        ${
          collapsible && shown < total
            ? html`<button
                type="button"
                part="see-more"
                aria-controls=${listId}
                @click=${this.showMore}
              >
                See more<span class="visually-hidden"> ${title}</span>
              </button>`
            : nothing
        }
        ${
          collapsible && shown > this.limit
            ? html`<button
                type="button"
                part="see-less"
                aria-controls=${listId}
                @click=${this.showLess}
              >
                See less<span class="visually-hidden"> ${title}</span>
              </button>`
            : nothing
        }
      </fieldset>
    `;
  }
}
