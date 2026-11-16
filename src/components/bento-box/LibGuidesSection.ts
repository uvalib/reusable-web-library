import { html, nothing } from 'lit';
import { BentoSection, renderRuns, type SectionResults } from './BentoSection.js';
import { guidesSearchUrl, searchGuides, type GuideItem } from './bento-data.js';

/**
 * The first subject guide pages (LibGuides) matching `query`: the page and its guide, then
 * its author and subjects and the matching text. Only text and links are taken from
 * Springshare's HTML.
 *
 * @tagname libguides-section
 */
export class LibGuidesSection extends BentoSection<GuideItem> {
  protected readonly heading = 'Subject Guides';
  protected readonly sourceName = 'subject guide';
  protected readonly describe =
    'Subject guides contain topic-specific information to help with research and coursework.';
  protected readonly home = {
    text: 'Search Guides',
    url: 'https://guides.lib.virginia.edu/srch.php',
  };

  protected fetchResults(
    query: string,
    limit: number,
    signal: AbortSignal,
  ): Promise<SectionResults<GuideItem>> {
    return searchGuides(query, limit, signal);
  }

  protected seeAllUrl(query: string): string {
    return guidesSearchUrl(query);
  }

  protected renderItem(g: GuideItem) {
    const by = g.author
      ? html`<span class="bs-results--guide-author"
          >by <a href=${g.author.url}>${g.author.text}</a></span
        >`
      : nothing;
    const subjects = g.subjects.length
      ? html`<span class="bs-results--subjects"
          >Subjects:
          ${g.subjects.map((s, i) => html`${i ? ', ' : ''}<a href=${s.url}>${s.text}</a>`)}</span
        >`
      : nothing;
    return this.entry(
      html`<span class="bs-results--title"
          ><a href=${g.url}>${g.title}</a>${
            g.guide
              ? html` <span class="bs-results--guide"
                  >on <a href=${g.guide.url}>${g.guide.text}</a></span
                >`
              : nothing
          }</span
        >
        <ul class="ul-0">
          <li class="bs-results--teaser li-1">
            <div class="bs-results--byline">
              ${by}${g.author && g.subjects.length ? html` <span aria-hidden="true">|</span> ` : nothing}${subjects}
            </div>
            <div class="bs-results--highlights">${renderRuns(g.highlights)}</div>
          </li>
        </ul>`,
    );
  }

  protected renderPlaceholderBody() {
    return html`<span class="bs-results--title"
        ><a>Library subject guide</a>
        <span class="bs-results--guide">on <a>Research</a></span></span
      >
      <ul class="ul-0">
        <li class="bs-results--teaser li-1">
          <div class="bs-results--byline">by <a>Librarian</a></div>
          <div class="bs-results--highlights">Research help</div>
        </li>
      </ul>`;
  }
}
