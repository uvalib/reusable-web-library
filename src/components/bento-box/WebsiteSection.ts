import { html } from 'lit';
import { BentoSection, renderRuns, type SectionResults } from './BentoSection.js';
import { searchWebsite, websiteSearchUrl, type WebsiteItem } from './bento-data.js';

/**
 * The library website's first pages (pages, people, libraries, news) matching `query`, from
 * Drupal's search index, with its excerpt (the matched words marked). The index sends no
 * CORS headers, so this section works on library.virginia.edu (or wherever
 * `BentoBox.endpoints.website` points to a same-origin copy) only.
 *
 * @tagname website-section
 */
export class WebsiteSection extends BentoSection<WebsiteItem> {
  protected readonly heading = 'Website';
  protected readonly sourceName = 'Library website';
  protected readonly describe = 'Results from the main Library website.';
  protected readonly home = {
    text: 'Search Library website',
    url: 'https://library.virginia.edu/search/content',
  };
  protected override entryClass = '';

  protected fetchResults(
    query: string,
    limit: number,
    signal: AbortSignal,
  ): Promise<SectionResults<WebsiteItem>> {
    return searchWebsite(query, limit, signal);
  }

  protected seeAllUrl(query: string): string {
    return websiteSearchUrl(query);
  }

  protected renderItem(w: WebsiteItem) {
    return this.entry(
      html`<div class="bento-section-title"><a href=${w.url}>${w.title}</a></div>
        <div class="bento-section-desc">${renderRuns(w.excerpt)}</div>`,
    );
  }

  protected renderPlaceholderBody() {
    return html`<div class="bento-section-title"><a>Library page</a></div>
      <div class="bento-section-desc">Library website page</div>`;
  }
}
