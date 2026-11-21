/**
 * The analytics helpers on their own, without Lit or any element: `trackEvent`, `trackSearch`,
 * `trackContent`, `analyticsAllowed` and `createSearchTracker`. A page's own scripts import
 * them from the CDN (`…/web-components/v1/analytics.js`) or npm
 * (`@uvalib/web-components/analytics.js`); `base.js` exports the same functions.
 */
export { analyticsAllowed, trackContent, trackEvent, trackSearch } from './base/analytics.js';
export type { AnalyticsContent, AnalyticsEvent } from './base/analytics.js';
export { createSearchTracker } from './base/search-tracker.js';
export type { SearchTracker, SearchTrackerOptions, TrackedSearch } from './base/search-tracker.js';
