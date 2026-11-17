import { html } from 'lit';
import { BentoSection, type SectionResults } from './BentoSection.js';
import {
  formatPublished,
  searchVirgo,
  virgoSearchUrl,
  type VirgoItem,
  type VirgoPool,
} from './bento-data.js';

/**
 * A Virgo pool's results (the catalog or the articles): each entry is its title linking to
 * Virgo, then its authors, and a row with the published date and the formats (with, for a
 * work with several editions, how many: on the same line, so every entry keeps one shape). Not registered itself.
 */
export abstract class VirgoSection extends BentoSection<VirgoItem> {
  protected abstract readonly pool: VirgoPool;

  protected fetchResults(
    query: string,
    limit: number,
    signal: AbortSignal,
  ): Promise<SectionResults<VirgoItem>> {
    return searchVirgo(this.pool, query, limit, signal);
  }

  protected seeAllUrl(query: string): string {
    return virgoSearchUrl(this.pool, query);
  }

  /**
   * An `li` with `body`, or, when there is none, an empty one hidden from assistive
   * technology, so every entry has the same lines (and height) as its placeholder.
   */
  private line(cls: string, body: unknown) {
    return body
      ? html`<li class="${cls} li-1">${body}</li>`
      : html`<li class="${cls} li-1" aria-hidden="true"> </li>`;
  }

  protected renderItem(r: VirgoItem) {
    const editions =
      r.editions > 1
        ? html`<span class="bs-results--editions"
            >${r.formats.length ? ', ' : ''}${r.editions} editions</span
          >`
        : '';
    const formats = r.formats.length || editions ? html`${r.formats.join('/')}${editions}` : '';
    return this.entry(
      html`<a href=${r.url} class="bs-results--title">${r.title}</a>
        <ul class="ul-0">
          ${this.line('bs-results--author', r.authors.join('; '))}
          <li>
            <ul class="ul-1">
              ${this.line(
                'bs-results--date',
                r.published
                  ? html`<time datetime=${r.published}>${formatPublished(r.published)}</time>`
                  : '',
              )}
              ${this.line('bs-results--format', formats)}
            </ul>
          </li>
        </ul>`,
    );
  }

  protected renderPlaceholderBody() {
    return html`<a class="bs-results--title">Library search result</a>
      <ul class="ul-0">
        <li class="bs-results--author li-1">Author, Example</li>
        <li>
          <ul class="ul-1">
            <li class="bs-results--date li-1">2024</li>
            <li class="bs-results--format li-1">Book</li>
          </ul>
        </li>
      </ul>`;
  }
}
