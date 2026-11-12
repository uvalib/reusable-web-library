import { define } from '../../base/define.js';
import { SitePage } from './SitePage.js';
import '../site-header/site-header.js';
// The footer sits at the bottom of the page, so it loads asynchronously.
import('../site-footer/site-footer.js').catch((err) =>
  console.error('site-page: failed to load site-footer', err),
);

define('site-page', SitePage);
