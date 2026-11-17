import { define } from '../../base/define.js';
import { ArticlesSection } from './ArticlesSection.js';
import { BentoBox } from './BentoBox.js';
import { CatalogSection } from './CatalogSection.js';
import { LibGuidesSection } from './LibGuidesSection.js';
import { WebsiteSection } from './WebsiteSection.js';

// The sections first, so the box's first render upgrades them at once.
define('catalog-section', CatalogSection);
define('articles-section', ArticlesSection);
define('libguides-section', LibGuidesSection);
define('website-section', WebsiteSection);
define('bento-box', BentoBox);
