import { define } from '../../base/define.js';
import { SiteHeader } from './SiteHeader.js';
import { SiteMainNav } from '../site-main-nav/SiteMainNav.js';
import '../site-main-nav/site-main-nav.js';

define('site-header', SiteHeader);

// Another build (a second copy of the package, or the CDN and npm on one page) registered
// <site-main-nav> first: the header then renders that version, which may not match it.
const registered = customElements.get('site-main-nav');
if (registered && registered !== SiteMainNav) {
  console.warn(
    'site-header: <site-main-nav> is already defined by another copy of @uvalib/web-components; the header uses that one. Load the components from one source only.',
  );
}
