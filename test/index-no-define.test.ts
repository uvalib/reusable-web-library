import { expect } from '@open-wc/testing';
import * as lib from '../src/index.js';

// This file must never import a define file: wtr gives it its own page.
describe('index', () => {
  it('exports the component classes without defining any element', async () => {
    expect(lib.SitePage).to.be.a('function');
    expect(lib.SiteStyle).to.be.a('function');
    expect(lib.SiteMainNav).to.be.a('function');
    await new Promise((r) => setTimeout(r, 50)); // let any dynamic import settle
    expect(lib.UvalibFilter).to.be.a('function');
    expect(lib.UvalibDateRange).to.be.a('function');
    expect(lib.UvalibDateHistogram).to.be.a('function');
    expect(lib.SiteHoursSection).to.be.a('function');
    expect(lib.LibraryWeeklyHours).to.be.a('function');
    expect(lib.LibraryHoursSetup).to.be.a('function');
    expect(lib.EventsSection).to.be.a('function');
    expect(lib.BentoBox).to.be.a('function');
    expect(lib.UvalibBreadcrumbs).to.be.a('function');
    expect(lib.UvalibCard).to.be.a('function');
    expect(lib.UvalibCardGrid).to.be.a('function');
    expect(lib.UvalibPager).to.be.a('function');
    expect(lib.UvalibContents).to.be.a('function');
    expect(lib.UvalibMetadata).to.be.a('function');
    expect(lib.UvalibPagefindSearch).to.be.a('function');
    expect(lib.UvalibLightbox).to.be.a('function');
    expect(lib.UvalibPhotoGrid).to.be.a('function');
    expect(lib.UvalibChipGroup).to.be.a('function');
    expect(lib.UvalibTagList).to.be.a('function');
    expect(lib.UvalibResultsCount).to.be.a('function');
    expect(lib.UvalibCombobox).to.be.a('function');
    expect(lib.UvalibImageRegions).to.be.a('function');
    expect(lib.UvalibMap).to.be.a('function');
    expect(lib.SiteAlerts).to.be.a('function');
    expect(lib.UvalibAnalytics).to.be.a('function');
    expect(lib.SiteAnalyticsMixin).to.be.a('function');
    expect(lib.UvalibAnalyticsMixin).to.be.a('function');
    expect(lib.trackEvent).to.be.a('function');
    expect(lib.trackSearch).to.be.a('function');
    for (const c of [
      lib.CatalogSection,
      lib.ArticlesSection,
      lib.LibGuidesSection,
      lib.WebsiteSection,
    ])
      expect(c).to.be.a('function');
    for (const tag of [
      'site-page',
      'site-header',
      'site-main-nav',
      'site-footer',
      'site-analytics',
      'uvalib-analytics',
      'site-style',
      'uvalib-filter',
      'uvalib-date-range',
      'uvalib-date-histogram',
      'uvalib-breadcrumbs',
      'uvalib-card',
      'uvalib-card-grid',
      'uvalib-pager',
      'uvalib-contents',
      'uvalib-metadata',
      'uvalib-pagefind-search',
      'uvalib-lightbox',
      'uvalib-photo-grid',
      'uvalib-chip-group',
      'uvalib-tag-list',
      'uvalib-results-count',
      'site-alerts',
      'site-hours-section',
      'library-weekly-hours',
      'library-hours-setup',
      'events-section',
      'bento-box',
      'catalog-section',
      'articles-section',
      'libguides-section',
      'website-section',
      'uvalib-tabs',
      'uvalib-combobox',
      'uvalib-image-regions',
      'uvalib-map',
    ]) {
      expect(customElements.get(tag) === undefined, `${tag} is defined`).to.equal(true);
    }
  });
});
