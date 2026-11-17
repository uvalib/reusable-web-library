import { VirgoSection } from './VirgoSection.js';

/**
 * The Virgo catalog's first results for `query` (books, journals, archives, maps, music,
 * theses, videos…). A work with several editions shows once, noting how many.
 *
 * @tagname catalog-section
 */
export class CatalogSection extends VirgoSection {
  protected readonly pool = 'catalog';
  readonly analyticsName = 'Virgo catalog';
  protected readonly heading = 'Virgo Catalog';
  protected readonly sourceName = 'Virgo catalog';
  protected readonly describe =
    'Books, journals, manuscripts & archival material, maps, music and sound recordings, theses and dissertations, and videos.';
  protected readonly home = { text: 'Search Virgo', url: 'https://search.lib.virginia.edu/' };
}
