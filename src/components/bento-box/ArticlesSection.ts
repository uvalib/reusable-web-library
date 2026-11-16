import { VirgoSection } from './VirgoSection.js';

/**
 * Virgo's first article results for `query`. Articles Virgo hides from guests keep their
 * link, under a neutral title ("Article details available after signing in to Virgo").
 *
 * @tagname articles-section
 */
export class ArticlesSection extends VirgoSection {
  protected readonly pool = 'articles';
  protected readonly heading = 'Article';
  protected readonly sourceName = 'Virgo article';
  protected readonly describe =
    'An aggregation of tens of millions of articles made available through Library subscriptions.';
  protected readonly home = { text: 'Search articles', url: 'https://search.lib.virginia.edu/' };
}
