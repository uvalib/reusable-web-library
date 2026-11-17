import { SiteAnalytics } from '../site-analytics/SiteAnalytics.js';

/**
 * `<site-analytics>` under its original name, for markup such as Drupal's
 * `<uvalib-analytics matomoid="10">`: the same element, attributes and events. A
 * constructor can be registered only once, hence the subclass.
 *
 * @tagname uvalib-analytics
 */
export class UvalibAnalytics extends SiteAnalytics {}
