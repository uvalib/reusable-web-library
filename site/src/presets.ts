// The site's examples, grouped by component for its menu. Pages follow the snippets in
// skills/uvalib-web-components (SKILL.md and reference/snippets.md), so the playground
// teaches the same patterns as the agent skill. `{{CDN}}` is replaced at runtime with the
// absolute URL of the site's own copy of the CDN build (see withCdnBase).

/** The menu's groups, in order: one per component. */
export const GROUPS = [
  'Page',
  'Header',
  'Alerts',
  'Breadcrumbs',
  'Cards',
  'Chips',
  'Contents',
  'Metadata',
  'Tables',
  'Images',
  'Maps',
  'Search',
  'Hours',
  'Events',
  'Analytics',
] as const;
export type Group = (typeof GROUPS)[number];

export interface Preset {
  /** The example's URL fragment (`#<id>`): lowercase letters, digits and hyphens only. */
  id: string;
  title: string;
  description: string;
  /** The menu group the example is listed under. */
  group: Group;
  files: Record<string, { content: string; hidden?: boolean }>;
}

export const CDN_TOKEN = '{{CDN}}';

/**
 * The search-results example's styles.css: before bento-box's script runs, reserve the height
 * it will take (the search bar, the heading and three sections of three results), so the
 * links and footer below do not jump. The sections stack in one column below 48rem and sit
 * two to a row from there: the container widths the element itself uses, measured on this
 * wrapper (which is exactly as wide as the element).
 */
const RESULTS_CSS = `.results {
  container-type: inline-size;
}
bento-box:not(:defined) {
  display: block;
  min-height: 135.37rem; /* one column */
}
@container (width >= 48rem) {
  bento-box:not(:defined) {
    min-height: 90.87rem; /* two columns */
  }
}
.virgo-links {
  text-align: center;
}
`;

/**
 * The analytics example's styles.css: the results' reserved height, and an event log of a
 * fixed height (it scrolls), so new entries never move the page.
 */
const ANALYTICS_CSS = `${RESULTS_CSS}.event-log {
  margin: 1.5rem 0;
}
.event-log ol {
  box-sizing: border-box;
  height: 12rem;
  margin: 0;
  padding: 0.5rem 0.75rem 0.5rem 2.5rem;
  overflow-y: auto;
  border: 1px solid var(--uva-color-control-border, #808080);
  border-radius: 0.3rem;
  background: var(--uva-color-surface-raised, #ffffff);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.875rem;
}
.event-log ol:focus-visible {
  outline: 2px solid var(--uva-color-focus, #e57200);
  outline-offset: 2px;
}
`;

/**
 * The analytics example's log: a classic script at the end of <body>, so its listeners are
 * there before any component (module scripts run later) fires. It shows each event's type
 * and detail as text, newest last (the log scrolls to it), and sends nothing.
 */
const ANALYTICS_LOG = `    <script>
      // No analytics element on this page: nothing is loaded or sent. The components only fire
      // events, which this log shows; with an analytics element they would go to Matomo.
      const log = document.querySelector('#event-log');
      for (const family of ['uvalib-analytics', 'site-analytics'])
        for (const kind of ['event', 'search', 'pageview', 'content'])
          document.addEventListener(\`\${family}-\${kind}\`, (e) => {
            const li = document.createElement('li');
            li.textContent = \`\${e.type} \${JSON.stringify(e.detail)}\`;
            // Appended (newest last) and scrolled into view: prepending would move every
            // earlier entry, which counts as layout shift; scrolling does not.
            log.append(li);
            log.scrollTop = log.scrollHeight;
          });
    </script>`;

/**
 * Dark mode's anti-flash snippet (the README's "Dark mode"): a classic inline script for
 * `<head>` that applies the stored choice before the first paint, only where light-dark()
 * is supported.
 */
export const COLOR_SCHEME_SNIPPET =
  "try{var s=localStorage.getItem('uvalib-color-scheme')}catch(e){}" +
  "if(window.CSS&&CSS.supports('color','light-dark(#000,#fff)'))" +
  "document.documentElement.dataset.uvaColorScheme=s==='light'||s==='dark'?s:'system'";

function page({
  title,
  body,
  styles = false,
  components = [],
  head = '',
}: {
  title: string;
  body: string;
  styles?: boolean;
  /** Extra component entries to load besides site-page. */
  components?: string[];
  /** Extra `<head>` markup, after the title. */
  head?: string;
}): string {
  const link = styles ? '\n    <link rel="stylesheet" href="./styles.css" />' : '';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>${head}
    <link rel="stylesheet" href="${CDN_TOKEN}base.css" />${link}
    <script type="module" src="${CDN_TOKEN}site-page.js"></script>${components
      .map((c) => `\n    <script type="module" src="${CDN_TOKEN}${c}.js"></script>`)
      .join('')}
  </head>
  <body>
${body}
  </body>
</html>
`;
}

/** The tables example's wide table: made-up monthly loans for five libraries. */
const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const CIRCULATION = (
  [
    ['Clemons Library', 4210],
    ['Shannon Library', 6385],
    ['Fine Arts Library', 1172],
    ['Music Library', 893],
    ['Albert and Shirley Small Special Collections Library', 318],
  ] as const
)
  .map(
    ([name, n], r) =>
      `            <tr><th scope="row">${name}</th>${SHORT_MONTHS.map(
        (_, i) =>
          `<td class="uvalib-table__num">${Math.round((n * (90 + ((i * 7 + r * 3) % 21))) / 100).toLocaleString('en-US')}</td>`,
      ).join('')}</tr>`,
  )
  .join('\n');

/**
 * Example images from the Library's own IIIF server (never copied into this repository):
 * Holsinger Studio photographs of Grounds (Albert and Shirley Small Special Collections
 * Library, MSS 9862) and book pages from Electronic Text Collections. `iiif(id, region, size)`
 * builds a IIIF Image API URL; tests and Lighthouse answer this host with local stand-ins.
 */
const iiif = (id: string, size: string, region = 'full') =>
  `https://iiif.lib.virginia.edu/iiif/uva-lib:${id}/${region}/${size}/0/default.jpg`;
/** One photo-grid link: the full-size image, a thumbnail about twice the row height. */
const photo = (id: string, caption: string, w: number, h: number, region = 'full', key = id) =>
  `          <a href="${iiif(id, '!1600,1600', region)}" data-caption="${caption}" data-id="${key}"><img src="${iiif(id, ',440', region)}" alt="${caption}" width="${w}" height="${h}" loading="lazy"></a>`;
const PHOTOS = [
  photo('1042806', 'Rotunda, north front in snow, 1914', 5805, 4729),
  photo('1049095', 'The Lawn', 5867, 4668),
  photo('1042806', 'Rotunda in snow (detail)', 2554, 4729, 'pct:28,0,44,100', '1042806-detail'),
  photo('1043731', 'Rotunda and Lawn', 5820, 4668),
  photo('1040162', 'Lawn games', 5888, 4723),
  photo('1039613', 'Rotunda', 5882, 4307),
].join('\n');
/** Page links as Electronic Text Collections renders them (page images on IIIF). */
const pageLink = (id: string, n: number) =>
  `        <a class="page" href="${iiif(id, '!1600,1600')}" data-caption="Page ${n}" data-id="${n}">p. ${n}</a>`;

/** One shoot in the results example: a photo with its count badge, a title and badges. */
const shoot = (
  id: string,
  title: string,
  photos: number,
  category: string,
  decade: string,
  status = '',
) =>
  `          <li data-category="${category}" data-decade="${decade}">
            <div class="uvalib-media">
              <img src="${iiif(id, '!480,320')}" alt="" width="480" height="320" loading="lazy" />
              <span class="uvalib-badge uvalib-badge--count">${photos} photos</span>
            </div>
            <h2>${title}</h2>
            <p class="shoot-badges">
              <span class="uvalib-badge uvalib-badge--category">${category}</span>${status}
            </p>
          </li>`;
const SHOOTS = [
  shoot(
    '1042806',
    'Rotunda in snow',
    13,
    'Architecture',
    '1910',
    '\n              <span class="uvalib-badge uvalib-badge--status uvalib-badge--info">Largest</span>',
  ),
  shoot('1049095', 'The Lawn', 8, 'Architecture', '1910'),
  shoot(
    '1043731',
    'Rotunda and Lawn',
    21,
    'Architecture',
    '1920',
    '\n              <span class="uvalib-badge uvalib-badge--new">New</span>',
  ),
  shoot('1040162', 'Lawn games', 5, 'Student life', '1920'),
  shoot(
    '1039613',
    'Rotunda from the south',
    3,
    'Architecture',
    '1920',
    '\n              <span class="uvalib-badge uvalib-badge--status uvalib-badge--warning">Processing</span>',
  ),
  shoot('1049095', 'Students on the Lawn', 9, 'Student life', '1910'),
].join('\n');
/** Placeholders the size of a shoot: a 3:2 image and two lines. */
/**
 * The results-list example's rows: made-up committee reports, twelve a year for ten years,
 * newest first, grouped by year (a heading and a list each), as plain base.css rows.
 */
const REPORT_TOPICS = [
  'opening hours',
  'the map collection',
  'digitization',
  'group study rooms',
  'rare books',
  'accessible entrances',
  'the reading room lights',
  'interlibrary loan',
];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const REPORT_YEARS = Array.from({ length: 10 }, (_, i) => 2024 - i)
  .map((year) => {
    const rows = Array.from({ length: 12 }, (_, i) => {
      const month = 11 - i;
      const n = (year - 2015) * 12 + month + 1;
      const date = `${MONTHS[month]} ${(n % 27) + 1}, ${year}`;
      const a = REPORT_TOPICS[n % REPORT_TOPICS.length];
      const b = REPORT_TOPICS[(n * 3 + 1) % REPORT_TOPICS.length];
      const title = `Reading Room Committee, meeting ${n}`;
      return `          <li class="uvalib-result">
            <p class="uvalib-result__meta"><span class="uvalib-badge uvalib-badge--category">${date}</span><span>${(n % 9) + 2} pages</span></p>
            <h3 class="uvalib-result__title"><a href="#report-${n}">${title}</a></h3>
            <p class="uvalib-result__snippet">The committee discussed ${a} and agreed to report on ${b} at its next meeting.</p>
            <div class="uvalib-result__actions"><a class="uvalib-button uvalib-button--secondary uvalib-button--small" href="#report-${n}-pdf">PDF<span class="visually-hidden"> of ${title}, ${date}</span></a></div>
          </li>`;
    }).join('\n');
    return `      <section class="year" aria-labelledby="y${year}">
        <h2 id="y${year}">${year}</h2>
        <ul class="uvalib-result-list">
${rows}
        </ul>
      </section>`;
  })
  .join('\n');

const SKELETONS = Array.from(
  { length: 3 },
  () => `          <div>
            <div class="uvalib-skeleton uvalib-skeleton--media"></div>
            <p><span class="uvalib-skeleton-text"></span><span class="uvalib-skeleton-text"></span></p>
          </div>`,
).join('\n');

export const presets: Preset[] = [
  {
    id: 'full-page',
    group: 'Page',
    title: 'Full page',
    description:
      'The default for any library page: one site-page wraps the content and renders the skip link, header, single main and footer.',
    files: {
      'index.html': {
        content: page({
          title: 'Page with sidebar',
          styles: true,
          body: `    <site-page>
      <div class="layout">
        <nav aria-label="Section">
          <ul>
            <li><a href="#a">Section A</a></li>
            <li><a href="#b">Section B</a></li>
          </ul>
        </nav>
        <article>
          <h1>Page with sidebar</h1>
          <p>Sidebars and articles are plain children. Do not add a second main element.</p>
        </article>
      </div>
    </site-page>`,
        }),
      },
      'styles.css': {
        content: `/* Page layout for your own content; the chrome needs no CSS. */
.layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 2rem;
  padding: 1rem;
}
`,
      },
    },
  },
  {
    id: 'pre-footer',
    group: 'Page',
    title: 'Pre-footer slot',
    description:
      'Put an element with slot="pre-footer" inside site-page for a band of content above the footer links; it only renders when it has content.',
    files: {
      'index.html': {
        content: page({
          title: 'Page with a pre-footer band',
          body: `    <site-page>
      <h1>Page with a pre-footer band</h1>
      <p>The band below sits between the page content and the footer.</p>
      <div slot="pre-footer">
        <h2>Need help?</h2>
        <p><a href="https://www.library.virginia.edu/askalibrarian">Ask a Librarian</a></p>
      </div>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'theming',
    group: 'Page',
    title: 'Theming with tokens and parts',
    description:
      'Change appearance only through inherited --uva-* tokens and site-page::part(header|footer|main); never pierce the shadow roots.',
    files: {
      'index.html': {
        content: page({
          title: 'Themed page',
          styles: true,
          body: `    <site-page>
      <h1>Themed page</h1>
      <p>Edit styles.css: tokens are set on :root, parts style the chrome's landmarks.</p>
    </site-page>`,
        }),
      },
      'styles.css': {
        content: `/* Inherited tokens: set them on :root or an ancestor of site-page. */
:root {
  --uva-brand-blue: #141e3c;
  --uva-brand-orange: #b35900;
  --uva-font-size-base: 18px;
}

/* Shadow parts re-exported by site-page. */
site-page::part(header) {
  border-block-end: 4px solid var(--uva-brand-orange);
}

site-page::part(main) {
  max-inline-size: 60rem;
  margin-inline: auto;
  padding: 1rem;
}

site-page::part(footer) {
  margin-block-start: 2rem;
}
`,
      },
    },
  },
  {
    id: 'light-dom-host-css',
    group: 'Page',
    title: 'Light DOM styled by host CSS',
    description:
      'Use no-shadow-dom only when the host site’s own stylesheet should style the chrome: unlayered host CSS wins over the components’ @layer uvalib styles.',
    files: {
      'index.html': {
        content: page({
          title: 'Host-styled page',
          styles: true,
          body: `    <site-page no-shadow-dom>
      <h1>Host-styled page</h1>
      <p>The site stylesheet styles the header, footer and content.</p>
    </site-page>`,
        }),
      },
      'styles.css': {
        content: `/* Unlayered host CSS wins over the components' @layer uvalib styles. */
site-header a {
  color: #232d4b;
  text-decoration-thickness: 2px;
}

site-footer footer {
  border-block-start: 6px solid #e57200;
}
`,
      },
    },
  },
  {
    id: 'dark-mode',
    group: 'Page',
    title: 'Dark mode',
    description:
      'Opt in with color-scheme-switch: the page follows the system light or dark setting, and a Light / Dark / System control in the header overrides it. Only for sites whose own content supports dark mode.',
    files: {
      'index.html': {
        content: page({
          title: 'Dark mode',
          styles: true,
          head: `
    <!-- Dark mode: apply the stored choice before the first paint. -->
    <link rel="stylesheet" href="${CDN_TOKEN}tokens.css" />
    <script>${COLOR_SCHEME_SNIPPET}</script>`,
          body: `    <site-page color-scheme-switch>
      <h1>Dark mode</h1>
      <p>
        Choose Light, Dark or System under Theme in the header (in the Menu on narrow screens).
        The choice is remembered for this site.
      </p>
      <section class="card" aria-labelledby="own">
        <h2 id="own">Your own content</h2>
        <p>
          Style it with the role tokens, which switch with the scheme, and
          <a href="https://www.library.virginia.edu/askalibrarian">links</a> follow too.
        </p>
      </section>
    </site-page>`,
        }),
      },
      'styles.css': {
        content: `/* Your content follows the scheme through the --uva-color-* role tokens. */
.card {
  max-inline-size: 40rem;
  padding: 1rem 1.5rem;
  border: 1px solid var(--uva-color-control-border, #808080);
  border-radius: 0.3rem;
  background: var(--uva-color-surface-raised, #ffffff);
}

.card h2,
.card a {
  color: var(--uva-color-link, #232d4b);
}
`,
      },
    },
  },
  {
    id: 'buttons-forms',
    group: 'Page',
    title: 'Buttons and forms',
    description:
      "base.css's classes give your own content the library's buttons, toggles and search box: .uvalib-button (with --secondary, --subtle, --small and --large), a toggle with aria-pressed, .uvalib-input and .uvalib-search-form.",
    files: {
      'index.html': {
        content: page({
          title: 'Buttons and forms',
          body: `    <site-page>
      <h1>Buttons and forms</h1>
      <form class="uvalib-search-form" role="search" action="#results">
        <label for="q">Search the texts</label>
        <input class="uvalib-input" id="q" name="q" type="search" />
        <button class="uvalib-button" type="submit">Search</button>
      </form>
      <h2>Buttons</h2>
      <p>
        <button class="uvalib-button" type="button">Primary</button>
        <button class="uvalib-button uvalib-button--secondary" type="button">Secondary</button>
        <button class="uvalib-button uvalib-button--subtle" type="button">Subtle</button>
        <button class="uvalib-button" type="button" disabled>Disabled</button>
      </p>
      <p>
        <button class="uvalib-button uvalib-button--small" type="button">Small</button>
        <button class="uvalib-button uvalib-button--large" type="button">Large</button>
        <a class="uvalib-button uvalib-button--secondary" href="#next">Next page</a>
      </p>
      <h2>Toggle</h2>
      <p>
        <button class="uvalib-button" type="button" aria-pressed="false" id="breaks">
          Show original line breaks
        </button>
      </p>
      <script>
        document.querySelector('#breaks').addEventListener('click', (e) => {
          const b = e.currentTarget;
          b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
        });
      </script>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'back-to-top',
    group: 'Page',
    title: 'Back to top',
    description:
      'uvalib-back-to-top, last in a long page: hidden until the top 400px scroll away (an IntersectionObserver, not a scroll listener), then a 44px “Back to top” button in the bottom corner. It scrolls to the top (smoothly unless you prefer reduced motion) and moves focus to the h1, so keyboard and screen reader users land there too. Hidden, it is not a tab stop. It keeps its own space at the end of the content and sits in it there, so it never covers the last lines or the footer. Hidden in print.',
    files: {
      'index.html': {
        content: page({
          title: 'Minutes of the Board of Visitors',
          components: ['uvalib-back-to-top'],
          body: `    <site-page>
      <h1>Minutes of the Board of Visitors</h1>
${Array.from(
  { length: 8 },
  (_, i) => `      <h2>Session ${i + 1}</h2>
      <p>
        The Board met at the Rotunda. The minutes of the previous session were read and approved.
        The committee on the library reported on the purchase of books and the care of the
        collection, and the Proctor reported on the accounts of the University.
      </p>
      <p>
        Resolved, that the report be received and entered on the journal, and that the Proctor
        be directed to settle the accounts before the next meeting of the Board.
      </p>`,
).join('\n')}
      <uvalib-back-to-top></uvalib-back-to-top>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'vendor-header',
    group: 'Header',
    title: 'Vendor header',
    description:
      'For third-party or vendor sites that are not library.virginia.edu: the header shows only the logo and Ask a Librarian.',
    files: {
      'index.html': {
        content: page({
          title: 'Vendor-hosted page',
          body: `    <site-page header-variant="vendor">
      <h1>Vendor-hosted page</h1>
      <p>Logo and Ask a Librarian only in the header.</p>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'site-navigation',
    group: 'Header',
    title: 'Site navigation',
    description:
      'A site with its own navigation gives site-page <a slot="site-links"> children: they replace the library utility links in the header and its Menu popover, and site-links-label names the nav. Mark the current page with aria-current="page".',
    files: {
      'index.html': {
        content: page({
          title: 'Site navigation',
          body: `    <site-page site-links-label="Exhibits">
      <a slot="site-links" href="./">Home</a>
      <a slot="site-links" href="#current" aria-current="page">Current exhibits</a>
      <a slot="site-links" href="#past">Past exhibits</a>
      <a slot="site-links" href="#visit">Visit</a>
      <h1>Current exhibits</h1>
      <p>The header shows this site's links instead of the library utility links. Narrow the preview to see them in the Menu popover.</p>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'site-name',
    group: 'Header',
    title: 'Site name',
    description:
      "A sub-site names itself with site-name: shown after the library logo as a link to the site's home (site-name-href, default /). The logo still links to library.virginia.edu; the page keeps its own h1.",
    files: {
      'index.html': {
        content: page({
          title: 'Electronic Text Collections',
          body: `    <site-page site-name="Electronic Text Collections" site-name-href="./" site-links-label="Collections">
      <a slot="site-links" href="#collections">Collections</a>
      <a slot="site-links" href="#search">Search</a>
      <h1>Electronic Text Collections</h1>
      <p>The site's name sits in the header next to the library logo. Narrow the preview: it moves under the logo.</p>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'main-navigation',
    group: 'Header',
    title: 'Main navigation',
    description:
      'Every full header shows the library main navigation (About, Using the Library, Research & teaching support, Get help): a row under the logo, and accordions at the top of the Menu popover on narrow screens. Add no-main-nav to turn it off. A <nav slot="main-nav"> child replaces its links, shown here on a standalone site-main-nav.',
    files: {
      'index.html': {
        content: page({
          title: 'Main navigation',
          body: `    <site-page>
      <h1>Main navigation</h1>
      <p>The header above shows the library main navigation by default. Open a group with a click, Enter or Space; Escape closes it. Narrow the preview to see it as accordions at the top of the Menu popover. Add <code>no-main-nav</code> to site-page to turn it off.</p>
      <h2>A custom menu</h2>
      <p>To replace the links, give site-page (or site-header) a <code>&lt;nav slot="main-nav"&gt;</code> child. Here the same markup fills a standalone site-main-nav:</p>
      <site-main-nav label="Example menu">
        <nav slot="main-nav">
          <ul>
            <li><a href="/exhibits">Exhibits</a></li>
            <li>
              <span>Collections</span>
              <ul>
                <li><a href="/collections/maps">Maps</a></li>
                <li><a href="/collections/manuscripts">Manuscripts</a></li>
              </ul>
            </li>
          </ul>
        </nav>
      </site-main-nav>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'alerts',
    group: 'Alerts',
    title: 'Library alerts',
    description:
      'site-page shows live UVA Library alerts by default with site-alerts, in library.virginia.edu\'s look: a teal banner in the header, the critical, warning and information alerts in a band under it, and regional alerts at the top of main. Severity is in text as well as colour and icon, warning and information alerts can be dismissed, and the text meets AAA contrast in light and dark. The data comes from the alerts project, loaded headless. Staging deployments use alerts-env="staging"; an app that renders alerts itself sets no-alerts.',
    files: {
      'index.html': {
        content: page({
          title: 'Library alerts',
          body: `    <!-- Production alerts are the default. Staging sites use alerts-env="staging";
         an app that shows alerts itself uses <site-page no-alerts>.
         Without site-page: <site-alerts show="sitewide"> and <site-alerts show="regional">
         from site-alerts.js. -->
    <site-page alerts-env="staging">
      <h1>Library alerts</h1>
      <p>Current staging alerts appear in the header, in the band under it and above this heading. Without alerts nothing is shown. Dismissed alerts stay dismissed on this site, in every tab.</p>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'breadcrumbs',
    group: 'Breadcrumbs',
    title: 'Breadcrumbs',
    description:
      'uvalib-breadcrumbs is the breadcrumb trail: <a href> children ending with the current page (a <span>, or a link with aria-current="page"). Given slot="breadcrumbs", site-page places it where library.virginia.edu does: after the header and alerts, before main and outside it, lined up with the content. It is a nav named "Breadcrumb" with an ordered list; the slashes are hidden from screen readers, and long trails wrap.',
    files: {
      'index.html': {
        content: page({
          title: 'Breadcrumbs',
          components: ['uvalib-breadcrumbs'],
          body: `    <site-page>
      <uvalib-breadcrumbs slot="breadcrumbs">
        <a href="./">Home</a>
        <a href="#research">Research &amp; teaching support</a>
        <span>Writing &amp; publication</span>
      </uvalib-breadcrumbs>
      <h1>Writing &amp; publication</h1>
      <p>The trail above sits between the header and main, so the skip link lands past it. Narrow the preview to see a long trail wrap.</p>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'breadcrumbs-standalone',
    group: 'Breadcrumbs',
    title: 'Breadcrumbs from JavaScript',
    description:
      'Without the slot, uvalib-breadcrumbs is an ordinary block anywhere in the page: here the first thing in the content, above the h1. Apps that build the trail in JavaScript (React, Vue) set its items property, an array of { label, href? } with the current page last; assigning a new array re-renders, and hash links stay hash links.',
    files: {
      'index.html': {
        content: page({
          title: 'Breadcrumbs from JavaScript',
          components: ['uvalib-breadcrumbs'],
          body: `    <site-page>
      <uvalib-breadcrumbs id="trail"></uvalib-breadcrumbs>
      <h1>Search results</h1>
      <p><button type="button" id="open">Open the first result</button></p>
    </site-page>
    <script type="module">
      await customElements.whenDefined('uvalib-breadcrumbs');
      const trail = document.querySelector('#trail');
      trail.items = [{ label: 'Home', href: './' }, { label: 'Search' }];
      document.querySelector('#open').addEventListener('click', () => {
        trail.items = [
          { label: 'Home', href: './' },
          { label: 'Search', href: '#/search' },
          { label: 'First result' },
        ];
        document.querySelector('h1').textContent = 'First result';
      });
    </script>`,
        }),
      },
    },
  },
  {
    id: 'breadcrumbs-search',
    group: 'Breadcrumbs',
    title: 'Back to the search',
    description:
      'On a record reached from search results, data-return-from on the Search crumb names the search page\'s path (or several, separated by spaces). When the visitor came from that page on the same site with a query string, the crumb links back to that search (/?q=budget&date_start=2023) instead of a blank search; its text stays "Search". Opened in a new tab, or from anywhere else, it keeps its href. Only document.referrer is read: nothing is stored or sent, and hash routes cannot be returned to (referrers never carry the hash).',
    files: {
      'index.html': {
        content: page({
          title: 'Back to the search',
          components: ['uvalib-breadcrumbs'],
          body: `    <site-page>
      <uvalib-breadcrumbs slot="breadcrumbs">
        <a href="./" data-return-from="./">Search</a>
        <a href="#2023">2023</a>
        <span>Meeting minutes, June 2023</span>
      </uvalib-breadcrumbs>
      <h1>Meeting minutes, June 2023</h1>
      <p>Reached from a search such as <code>/?q=budget</code> on this site, the Search crumb above links back to it. Here, opened directly, it links to the search page as written.</p>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'collection-cards',
    group: 'Cards',
    title: 'Collection cards',
    description:
      'A grid of collection cards. Each uvalib-card with href makes its heading the one link, stretched over the card; the arrow is only a visual aid. The excerpt is the count of texts. The grid is a list (a screen reader announces how many), four columns above 992px, two through 767px, then one, and cards in a row share a height. Do not wrap a card in an <a>, and do not put another link or button inside a clickable card.',
    files: {
      'index.html': {
        content: page({
          title: 'Collections',
          components: ['uvalib-card', 'uvalib-card-grid'],
          body: `    <site-page>
      <h1>Collections</h1>
      <uvalib-card-grid>
        <uvalib-card href="#early-american-fiction">
          <span slot="heading">Early American Fiction</span>
          128 texts
        </uvalib-card>
        <uvalib-card href="#african-american-newspapers">
          <span slot="heading">African American Newspapers</span>
          42 texts
        </uvalib-card>
        <uvalib-card href="#civil-war-newspapers">
          <span slot="heading">Civil War Newspapers</span>
          17 texts
        </uvalib-card>
      </uvalib-card-grid>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'photo-card',
    group: 'Cards',
    title: 'Photo card',
    description:
      'A photo card: an image (alt text that is not the heading, or alt="" when the heading already names it), a count badge, a date in <time>, one category chip, the title and an excerpt. href makes the heading the card’s only link. A card with no href may contain its own links.',
    files: {
      'index.html': {
        content: page({
          title: 'Rotunda',
          components: ['uvalib-card'],
          body: `    <site-page>
      <h1>Addison collection</h1>
      <uvalib-card href="#rotunda">
        <img slot="media" alt="The Rotunda and Lawn, about 1910" src="${iiif('1043731', '!800,600')}" width="5820" height="4668" />
        <span slot="badge">13 photos</span>
        <span slot="heading">Rotunda</span>
        <time slot="meta" datetime="1910">1910</time>
        <span slot="chip">Architecture</span>
        Holsinger Studio photographs of the Rotunda and the Lawn.
      </uvalib-card>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'section-pager',
    group: 'Cards',
    title: 'Previous and next',
    description:
      'Previous and next section links, as on a reading page. Each side shows a Previous or Next kicker and the section title, with rel="prev" or rel="next". A long title truncates visually; the full text stays in the accessible name. The landmark is named Sections. One pager per page, or give each a different label.',
    files: {
      'index.html': {
        content: page({
          title: 'Chapter',
          components: ['uvalib-pager'],
          body: `    <site-page>
      <h1>Chapter two</h1>
      <p>The reading continues here. The links below move to the previous and next sections.</p>
      <uvalib-pager
        prev-href="#the-opening"
        prev-label="The opening"
        next-href="#what-follows"
        next-label="What follows the fire, and the years after it"
      ></uvalib-pager>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'numbered-pager',
    group: 'Cards',
    title: 'Numbered pages',
    description:
      'Numbered pages. page is the current page (text with aria-current="page", not a link) and pages is how many there are. href-template builds each other page’s address, and must contain {page}. A long range keeps the first page, a window around the current page, the last page, and an ellipsis where numbers are skipped. The landmark is named Pagination.',
    files: {
      'index.html': {
        content: page({
          title: 'Page 10',
          components: ['uvalib-pager'],
          body: `    <site-page>
      <h1>Search results</h1>
      <p>Page 10 of 20. The current page is not a link.</p>
      <uvalib-pager page="10" pages="20" href-template="#p-{page}"></uvalib-pager>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'chip-groups',
    group: 'Chips',
    title: 'Year rail, sort and suggestions',
    description:
      'Three uvalib-chip-group modes. A year rail (mode="single", the default): radios drawn as chips in a radio group named by label, one row that scrolls sideways (scroll), each count read as part of the name ("2005, 461 shoots", from count-label). Tab enters at the selected year and the arrow keys move and select. A sort toggle (segmented): the same radios joined into one bar. Its description, the hint under it, is tied to the radio group with aria-describedby, so it is read when focus enters the group. Category filters (mode="multi"): toggle buttons with aria-pressed and an array value. Suggestions (mode="links"): plain links that fire a cancelable select. A colour key (data-swatch): the category chips with a decorative colour square each, as the legend of a chart or map; the name stays the label. A selected chip is filled and ticked, never colour alone. Each fires change with { value }; the line under the rail shows it. url-param="year" would keep the year in the address.',
    files: {
      'index.html': {
        content: page({
          title: 'Browse the archive',
          components: ['uvalib-chip-group'],
          body: `    <site-page>
      <h1>Browse the archive</h1>
      <h2>Year</h2>
      <uvalib-chip-group id="years" label="Year" count-label="shoots" value="" scroll>
        <button value="" data-count="3694">All Years</button>
        <button value="2004" data-count="213">2004</button>
        <button value="2005" data-count="461">2005</button>
        <button value="2006" data-count="388">2006</button>
        <button value="2007" data-count="520">2007</button>
        <button value="2008" data-count="297">2008</button>
        <button value="2009" data-count="344">2009</button>
        <button value="2010" data-count="412">2010</button>
        <button value="2011" data-count="276">2011</button>
        <button value="2012" data-count="301">2012</button>
        <button value="2013" data-count="482">2013</button>
      </uvalib-chip-group>
      <p id="status" role="status">Showing all years.</p>
      <h2>Sort</h2>
      <uvalib-chip-group
        label="Sort by"
        segmented
        value="photos"
        description="Most photos puts the largest series first. Date runs from the oldest shoot to the newest."
      >
        <button value="photos">Most photos</button>
        <button value="date">Date</button>
        <button value="title">Title A–Z</button>
      </uvalib-chip-group>
      <h2>Category</h2>
      <uvalib-chip-group mode="multi" label="Category" count-label="series" value="traditions">
        <button value="traditions" data-count="9">Traditions</button>
        <button value="architecture" data-count="14">Architecture</button>
        <button value="sports" data-count="21">Sports</button>
        <button value="people" data-count="6">People</button>
      </uvalib-chip-group>
      <h2>Photos by category</h2>
      <p>The chips are the map's colour key: each colour is also named by its label.</p>
      <uvalib-chip-group mode="multi" label="Map categories" count-label="photos" value="athletics,architecture">
        <button value="athletics" data-count="4203" data-swatch="#e57200">Athletics</button>
        <button value="architecture" data-count="1180" data-swatch="#232d4b">Architecture</button>
        <button value="traditions" data-count="912" data-swatch="#25cad3">Traditions</button>
        <button value="people" data-count="640" data-swatch="#62bb46">People</button>
      </uvalib-chip-group>
      <h2>Try a search</h2>
      <uvalib-chip-group mode="links" label="Suggested searches">
        <a href="#q=snow-on-the-lawn">snow on the Lawn</a>
        <a href="#q=rotunda-fire">Rotunda fire</a>
        <a href="#q=graduation">graduation</a>
      </uvalib-chip-group>
    </site-page>
    <script>
      document.querySelector('#years').addEventListener('change', (e) => {
        document.querySelector('#status').textContent = e.detail.value
          ? \`Showing \${e.detail.value}.\`
          : 'Showing all years.';
      });
    </script>`,
        }),
      },
    },
  },
  {
    id: 'tabs',
    group: 'Cards',
    title: 'Tabs',
    description:
      'uvalib-tabs builds the tablist from each section’s data-tab label. Arrow keys move and select; Home and End jump. url-param="tab" puts the panel id in the address, and Back restores the previous tab. The first panel is visible before the element upgrades.',
    files: {
      'index.html': {
        content: page({
          title: 'Tabs',
          components: ['uvalib-tabs'],
          body: `    <site-page>
      <h1>The archive</h1>
      <uvalib-tabs url-param="tab">
        <section data-tab="Events" id="events">
          <h2>Events</h2>
          <p>Talks and exhibitions this month.</p>
        </section>
        <section data-tab="Stories" id="stories">
          <h2>Stories</h2>
          <p>Essays from the collections.</p>
        </section>
        <section data-tab="People" id="people">
          <h2>People</h2>
          <p>Staff and the people in the photographs.</p>
        </section>
      </uvalib-tabs>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'person-cards',
    group: 'Cards',
    title: 'Person cards',
    description:
      'media-shape="circle" crops each portrait to a circle and keeps the image alt. The count badge still sits on the picture. The heading is the card’s one link.',
    files: {
      'index.html': {
        content: page({
          title: 'People',
          components: ['uvalib-card', 'uvalib-card-grid'],
          body: `    <site-page>
      <h1>People</h1>
      <uvalib-card-grid>
        <uvalib-card media-shape="circle" href="#ada">
          <img slot="media" alt="Portrait of Ada Lovelace" src="${iiif('1043731', ',440')}" width="5820" height="4668">
          <span slot="badge">3</span>
          <span slot="heading">Ada Lovelace</span>
        </uvalib-card>
        <uvalib-card media-shape="circle" href="#alan">
          <img slot="media" alt="Portrait of Alan Turing" src="${iiif('1039613', ',440')}" width="5882" height="4307">
          <span slot="heading">Alan Turing</span>
        </uvalib-card>
      </uvalib-card-grid>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'story-card',
    group: 'Cards',
    title: 'Story card',
    description:
      'A static card (no href) can hold an actions row: “Read the story” and “Photos (132)”. A clickable card must not contain those controls, because its link covers the whole card.',
    files: {
      'index.html': {
        content: page({
          title: 'Stories',
          components: ['uvalib-card'],
          body: `    <site-page>
      <h1>Stories</h1>
      <uvalib-card>
        <img slot="media" alt="" src="${iiif('1049095', ',800')}" width="5867" height="4668">
        <span slot="heading">The Lawn in winter</span>
        <a slot="actions" href="#story">Read the story</a>
        <a slot="actions" href="#photos">Photos (132)</a>
        Snow on the Lawn, looking toward the Rotunda.
      </uvalib-card>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'load-more',
    group: 'Cards',
    title: 'Load more',
    description:
      'mode="load-more" is a Load more button and “Showing N of M”. The click fires load-more with the next page. This page appends a story and calls loaded() so focus moves to it. for names the list.',
    files: {
      'index.html': {
        content: page({
          title: 'Load more',
          components: ['uvalib-pager'],
          body: `    <site-page>
      <h1>All stories</h1>
      <ul id="stories">
        <li><a href="#story-1">Story 1</a></li>
        <li><a href="#story-2">Story 2</a></li>
        <li><a href="#story-3">Story 3</a></li>
      </ul>
      <uvalib-pager mode="load-more" for="stories" shown="3" total="6" page="1" label="Stories"></uvalib-pager>
    </site-page>
    <script type="module">
      const pager = document.querySelector('uvalib-pager');
      const list = document.getElementById('stories');
      pager.addEventListener('load-more', (e) => {
        const n = list.children.length + 1;
        const a = document.createElement('a');
        a.href = '#story-' + n;
        a.textContent = 'Story ' + n;
        const li = document.createElement('li');
        li.append(a);
        list.append(li);
        pager.shown = n;
        pager.page = e.detail.page;
        pager.loaded(a);
      });
    </script>`,
        }),
      },
    },
  },
  {
    id: 'load-more-unknown-total',
    group: 'Cards',
    title: 'Load more, unknown total',
    description:
      'Ranked search often cannot know the total. With no total the count reads “Showing N”. has-more keeps the button; after the last page the app sets hasMore = false and calls loaded(), so the button goes away and focus stays on the first new result.',
    files: {
      'index.html': {
        content: page({
          title: 'Load more, unknown total',
          components: ['uvalib-pager'],
          body: `    <site-page>
      <h1>Best matches</h1>
      <ul id="matches">
        <li><a href="#match-1">Match 1</a></li>
        <li><a href="#match-2">Match 2</a></li>
      </ul>
      <uvalib-pager mode="load-more" for="matches" shown="2" has-more label="Matches"></uvalib-pager>
    </site-page>
    <script type="module">
      const pager = document.querySelector('uvalib-pager');
      const list = document.getElementById('matches');
      pager.addEventListener('load-more', (e) => {
        let first;
        for (let i = 0; i < 2; i++) {
          const n = list.children.length + 1;
          const a = document.createElement('a');
          a.href = '#match-' + n;
          a.textContent = 'Match ' + n;
          const li = document.createElement('li');
          li.append(a);
          list.append(li);
          first ??= a;
        }
        pager.shown = list.children.length;
        pager.page = e.detail.page;
        // This demo's candidate pool runs out after three pages.
        pager.hasMore = e.detail.page < 3;
        pager.loaded(first);
      });
    </script>`,
        }),
      },
    },
  },
  {
    id: 'contents-sidebar',
    group: 'Contents',
    title: 'Contents sidebar',
    description:
      'uvalib-contents is sub-navigation or a table of contents: a nav landmark named and headed "Contents" (label) holding a nested <ol> or <ul> of links, to any depth. It marks the link to this page with aria-current="page" and the link to the section in the URL hash with aria-current="location", following hash changes. In a sidebar, sticky keeps it in view; at 64rem and below it collapses into a disclosure button that starts closed.',
    files: {
      'index.html': {
        content: page({
          title: 'Contents sidebar',
          styles: true,
          components: ['uvalib-contents'],
          body: `    <site-page>
      <h1>The actress of Padua, and other tales</h1>
      <div class="reader">
        <uvalib-contents sticky>
          <ol>
            <li><a href="#preface">Preface</a></li>
            <li>
              <a href="#part-1">The actress of Padua</a>
              <ol>
                <li><a href="#part-1">Part I. The Key</a></li>
                <li><a href="#part-2">Part II. The Crucifix</a></li>
                <li><a href="#part-3">Part III. The White for the Black</a></li>
              </ol>
            </li>
            <li>
              Other tales
              <ul>
                <li><a href="#tales">The campaigner&#39;s tale</a></li>
              </ul>
            </li>
          </ol>
        </uvalib-contents>
        <article>
          <h2 id="preface">Preface</h2>
          <p>Select an entry in the contents: the link to the section in the address bar is marked as the current location.</p>
          <h2 id="part-1">Part I. The Key</h2>
          <p>The contents stay in view on wide screens (sticky) and scroll by themselves when they are longer than the window.</p>
          <h2 id="part-2">Part II. The Crucifix</h2>
          <p>Narrow the preview below 64rem: the contents collapse into a Contents button, closed until opened.</p>
          <h2 id="part-3">Part III. The White for the Black</h2>
          <p>Each nested level has a bar beside it; top-level entries are divided by rules.</p>
          <h2 id="tales">Other tales</h2>
          <p>A group label without a page of its own is plain text.</p>
        </article>
      </div>
    </site-page>`,
        }),
      },
      'styles.css': {
        content: `/* The reader's layout is your own CSS: a sidebar on wide screens, stacked below 64rem. */
.reader {
  display: grid;
  gap: 2rem;
}
@media (width > 64rem) {
  .reader {
    grid-template-columns: 18rem minmax(0, 1fr);
  }
}
article h2 {
  margin-top: 0;
  padding-top: 1rem;
}
article p {
  min-height: 20rem;
}
`,
      },
    },
  },
  {
    id: 'contents-headings',
    group: 'Contents',
    title: 'Contents from headings',
    description:
      'For a long document, uvalib-contents headings-from="#report" builds the table of contents from the headings in that element: levels="2-3" (the default) lists the h2s with their h3s nested; min="3" shows nothing for a document with fewer than three top-level sections. A heading without an id gets one from its text (the-year-in-numbers, -2 for a repeat); existing ids (#gifts) are kept, so links to sections keep working. It follows headings added or retitled; call refresh() after other changes. Without JavaScript there is no list, so a site that can render the list at build time, as children, should.',
    files: {
      'index.html': {
        content: page({
          title: 'Contents from headings',
          styles: true,
          components: ['uvalib-contents'],
          body: `    <site-page>
      <h1>Friends of the Library: annual report</h1>
      <div class="reader">
        <uvalib-contents sticky headings-from="#report" levels="2-3" min="3"></uvalib-contents>
        <article id="report">
          <h2>Letter from the chair</h2>
          <p>This report is made up for the example. Scroll it: the contents stay in view on wide screens and mark the section in the address bar.</p>
          <h2>The year in numbers</h2>
          <p>Each h2 is a top-level entry; the h3s under it are nested beneath it.</p>
          <h3>Visits and loans</h3>
          <p>Visits and loans are a made-up h3, nested under the year in numbers.</p>
          <h3>Digital collections</h3>
          <p>Headings without an id get one from their text: this one is #digital-collections.</p>
          <h2 id="gifts">Gifts and acquisitions</h2>
          <p>This heading had its own id, #gifts, and keeps it.</p>
          <h3>Manuscripts</h3>
          <p>Select an entry in the contents: its link becomes the current location.</p>
          <h3>Rare books</h3>
          <p>Rare books, another nested entry.</p>
          <h3>Photographs</h3>
          <p>Photographs, the last entry in this group.</p>
          <h2>Events</h2>
          <p>Events, a top-level section.</p>
          <h3>Lectures</h3>
          <p>Lectures, nested under events.</p>
          <h3>Exhibitions</h3>
          <p>Exhibitions, nested under events.</p>
          <h2>Volunteers</h2>
          <p>Volunteers, a section with no sub-sections.</p>
          <h2>Looking ahead</h2>
          <p>Narrow the preview below 64rem: the contents collapse into a Contents button, closed until opened.</p>
          <h2>Appendix: Financial summary</h2>
          <p>Links to sections are stable: the ids come from the headings' text.</p>
        </article>
      </div>
    </site-page>`,
        }),
      },
      'styles.css': {
        content: `/* The reader's layout is your own CSS: a sidebar on wide screens, stacked below 64rem. */
.reader {
  display: grid;
  gap: 2rem;
}
@media (width > 64rem) {
  .reader {
    grid-template-columns: 18rem minmax(0, 1fr);
  }
}
article p {
  min-height: 12rem;
}
`,
      },
    },
  },
  {
    id: 'record-metadata',
    group: 'Metadata',
    title: 'Record metadata',
    description:
      'uvalib-metadata shows a record\'s details from a plain <dl>: label and value side by side when there is room, stacked when narrow. Values can be text, links or lists; a download link with data-size shows its size ("EPUB · 184 KB") and keeps its download attribute. Its attributes add the credit and rights rows Special Collections asks for: creator, organization, rights (a rightsstatements.org or Creative Commons URL, shown by its short name), a link about rights and permissions, and How to cite with a Copy citation button. list-limit="8" shortens the long Participants list (made-up names) to eight and a "Show all 34 participants" button that reveals the rest in place and moves focus to the first one revealed.',
    files: {
      'index.html': {
        content: page({
          title: 'Record metadata',
          components: ['uvalib-metadata'],
          body: `    <site-page>
      <h1>The actress of Padua, and other tales</h1>
      <uvalib-metadata
        creator="Smith, Richard Penn"
        organization="Albert and Shirley Small Special Collections Library"
        rights="http://rightsstatements.org/vocab/NoC-US/1.0/"
        rights-info="https://www.library.virginia.edu/policies/use-of-materials"
        citation-title="The actress of Padua, and other tales"
        list-limit="8"
      >
        <dl>
          <div>
            <dt>Collection</dt>
            <dd><a href="#collection">Early American Fiction, 1789-1875</a></dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>1836</dd>
          </div>
          <div>
            <dt>Subjects</dt>
            <dd>
              <ul>
                <li>Short stories</li>
                <li>American literature -- 1783-1850</li>
                <li>American literature -- 19th century</li>
              </ul>
            </dd>
          </div>
          <div>
            <dt>Download</dt>
            <dd>
              <ul>
                <li><a href="eaf375v1.epub" download data-size="184 KB">EPUB</a></li>
                <li><a href="eaf375v1.txt" download data-size="369 KB">Plain text</a></li>
                <li><a href="eaf375v1.xml" download data-size="494 KB">TEI XML (source)</a></li>
              </ul>
            </dd>
          </div>
          <div>
            <dt>Page images</dt>
            <dd>Available: select a page number in the text</dd>
          </div>
          <div>
            <dt>Participants</dt>
            <dd>
              <ul>
                <li>Ada Whitcombe</li>
                <li>Bernard Ashford</li>
                <li>Clara Penrose</li>
                <li>Desmond Hale</li>
                <li>Eleanor Briggs</li>
                <li>Franklin Moreau</li>
                <li>Grace Talbot</li>
                <li>Henry Calloway</li>
                <li>Iris Dunmore</li>
                <li>Julian Pryce</li>
                <li>Katherine Vance</li>
                <li>Lionel Mercer</li>
                <li>Margaret Holloway</li>
                <li>Nathaniel Brooke</li>
                <li>Olivia Strand</li>
                <li>Percival Lane</li>
                <li>Quentin Ashby</li>
                <li>Rosalind Keene</li>
                <li>Silas Thornbury</li>
                <li>Theodora Wren</li>
                <li>Ulysses Fairfax</li>
                <li>Vivian Lockhart</li>
                <li>Walter Endicott</li>
                <li>Xavier Dalton</li>
                <li>Yvonne Marsh</li>
                <li>Zachary Pell</li>
                <li>Amelia Crane</li>
                <li>Benedict Royce</li>
                <li>Cecilia Hartwell</li>
                <li>Dorian Sayre</li>
                <li>Evangeline Moss</li>
                <li>Frederick Garland</li>
                <li>Georgiana Tate</li>
                <li>Harold Winslow</li>
              </ul>
            </dd>
          </div>
        </dl>
      </uvalib-metadata>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'citation',
    group: 'Metadata',
    title: 'Citation',
    description:
      'uvalib-citation shows one record\'s citation in MLA, APA, Chicago and Bluebook, as Virgo\'s Cite dialog does. The formats are a segmented radio group (one tab stop, the arrow keys choose, the selected one filled and ticked); the selected citation is selectable text in a region named "MLA citation". Copy citation copies it as plain text and as HTML, so the italic title survives a paste into a word processor, and says "MLA citation copied" in a polite status next to the button (AAA text colour, no toast). If the clipboard is unavailable it selects the citation and says so. ris-href adds a Download RIS link. It can sit inline, as here, or inside a dialog. With base.css only the first citation shows before the script runs, and the space for the formats and the button is held, so nothing moves.',
    files: {
      'index.html': {
        content: page({
          title: 'Citation',
          components: ['uvalib-citation'],
          body: `    <site-page>
      <h1>Notes on the State of Virginia</h1>
      <uvalib-citation ris-href="notes-on-the-state-of-virginia.ris">
        <blockquote data-format="MLA">
          Jefferson, Thomas. <i>Notes on the State of Virginia</i>. Edited by William Peden, U of
          North Carolina P, 1955.
        </blockquote>
        <blockquote data-format="APA">
          Jefferson, T. (1955). <i>Notes on the state of Virginia</i> (W. Peden, Ed.). University
          of North Carolina Press. (Original work published 1785)
        </blockquote>
        <blockquote data-format="Chicago">
          Jefferson, Thomas. <i>Notes on the State of Virginia</i>. Edited by William Peden. Chapel
          Hill: University of North Carolina Press, 1955.
        </blockquote>
        <blockquote data-format="Bluebook">
          Thomas Jefferson, <i>Notes on the State of Virginia</i> (William Peden ed., Univ. of N.C.
          Press 1955).
        </blockquote>
      </uvalib-citation>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'tables',
    group: 'Tables',
    title: 'Tables',
    description:
      "base.css's .uvalib-table: holdings grouped by library (a heading per library, then its table with a caption), with a long barcode that wraps instead of pushing the page sideways on a phone; a striped, compact schedule with right-aligned numbers (.uvalib-table--striped, --compact, __num); and a wide table in .uvalib-table-scroll, a focusable region named by its caption that scrolls inside itself. Every table has a caption; header cells have scope.",
    files: {
      'index.html': {
        content: page({
          title: 'Holdings and schedules',
          body: `    <site-page>
      <h1>Holdings and schedules</h1>
      <h2>Holdings</h2>
      <h3>Clemons Library</h3>
      <table class="uvalib-table">
        <caption>Clemons Library holdings</caption>
        <thead>
          <tr><th scope="col">Location</th><th scope="col">Call number</th><th scope="col">Barcode</th></tr>
        </thead>
        <tbody>
          <tr><td>Stacks</td><td>PS3545 .O337 Z5 2004</td><td>X004812345</td></tr>
          <tr><td>Course reserve</td><td>PS3545 .O337 Z5 2004 c.2</td><td>X004812346</td></tr>
        </tbody>
      </table>
      <h3>Law Library</h3>
      <table class="uvalib-table">
        <caption>Law Library holdings</caption>
        <thead>
          <tr><th scope="col">Location</th><th scope="col">Call number</th><th scope="col">Barcode</th></tr>
        </thead>
        <tbody>
          <tr><td>Law Library Stacks, Lower Level</td><td>KF4550 .A2 1787a vol. 1–4 suppl.</td><td>35000101234567890123456789</td></tr>
        </tbody>
      </table>
      <h2>Opening hours</h2>
      <table class="uvalib-table uvalib-table--striped uvalib-table--compact">
        <caption>Study rooms this week</caption>
        <thead>
          <tr><th scope="col">Day</th><th scope="col">Hours</th><th scope="col" class="uvalib-table__num">Rooms free</th></tr>
        </thead>
        <tbody>
          <tr><th scope="row">Monday</th><td>8 a.m. – midnight</td><td class="uvalib-table__num">12</td></tr>
          <tr><th scope="row">Tuesday</th><td>8 a.m. – midnight</td><td class="uvalib-table__num">7</td></tr>
          <tr><th scope="row">Wednesday</th><td>8 a.m. – midnight</td><td class="uvalib-table__num">14</td></tr>
          <tr><th scope="row">Thursday</th><td>8 a.m. – midnight</td><td class="uvalib-table__num">3</td></tr>
          <tr><th scope="row">Friday</th><td>8 a.m. – 6 p.m.</td><td class="uvalib-table__num">21</td></tr>
        </tbody>
      </table>
      <h2>Circulation by library</h2>
      <div class="uvalib-table-scroll" role="region" tabindex="0" aria-labelledby="circ-caption">
        <table class="uvalib-table">
          <caption id="circ-caption">Items borrowed per month, 2025</caption>
          <thead>
            <tr><th scope="col">Library</th>${SHORT_MONTHS.map((m) => `<th scope="col" class="uvalib-table__num">${m}</th>`).join('')}</tr>
          </thead>
          <tbody>
${CIRCULATION}
          </tbody>
        </table>
      </div>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'photo-grid',
    group: 'Images',
    title: 'Photo grid',
    description:
      'uvalib-photo-grid lays each link out in a justified row from its image width and height (about 220px tall, 140px on a phone). Inside uvalib-lightbox a plain click opens the viewer: Close takes focus, Previous and Next move through the set, and url-param="photo" puts ?photo= in the address so the open image can be shared. Without JavaScript the links still open the image.',
    files: {
      'index.html': {
        content: page({
          title: 'Photo grid',
          components: ['uvalib-lightbox', 'uvalib-photo-grid'],
          body: `    <site-page>
      <h1>Photographs</h1>
      <uvalib-lightbox url-param="photo">
        <uvalib-photo-grid>
${PHOTOS}
        </uvalib-photo-grid>
        <p slot="details">
          Holsinger Studio Collection (MSS 9862), Albert and Shirley Small Special Collections
          Library, University of Virginia. Shown from the Library's IIIF image server.
        </p>
      </uvalib-lightbox>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'photo-grid-badges',
    group: 'Images',
    title: 'Photo grid badges',
    description:
      'data-badge draws a label over the thumbnail (“seq”, “3 photos”) and includes it in the link’s accessible name. The alt caption is unchanged. A span slot="badge" inside the link does the same.',
    files: {
      'index.html': {
        content: page({
          title: 'Photo grid badges',
          components: ['uvalib-photo-grid'],
          body: `    <site-page>
      <h1>Sequences</h1>
      <uvalib-photo-grid>
        <a href="${iiif('1042806', '!1600,1600')}" data-badge="seq">
          <img src="${iiif('1042806', ',440')}" alt="Rotunda in snow" width="5805" height="4729" loading="lazy">
        </a>
        <a href="${iiif('1049095', '!1600,1600')}" data-badge="3 photos">
          <img src="${iiif('1049095', ',440')}" alt="The Lawn" width="5867" height="4668" loading="lazy">
        </a>
        <a href="${iiif('1039613', '!1600,1600')}">
          <img src="${iiif('1039613', ',440')}" alt="Rotunda" width="5882" height="4307" loading="lazy">
          <span slot="badge">seq</span>
        </a>
      </uvalib-photo-grid>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'page-images',
    group: 'Images',
    title: 'Page images',
    description:
      'uvalib-lightbox can enhance links that are not inside it. selector="a.page" turns these page-number links into the viewer; a modified click, or no JavaScript, still follows the link. The same url-param works on a hash route, written inside the hash.',
    files: {
      'index.html': {
        content: page({
          title: 'Page images',
          styles: true,
          components: ['uvalib-lightbox'],
          body: `    <site-page>
      <h1>A reading page</h1>
      <p>Smith, Richard Penn. <cite>The actress of Padua, and other tales</cite>, 1836. Page images:</p>
      <uvalib-lightbox selector="a.page" url-param="photo"></uvalib-lightbox>
      <p>
${[286686, 286687, 286688, 286689].map((id, i) => pageLink(String(id), i + 2)).join('\n')}
      </p>
    </site-page>`,
        }),
      },
      'styles.css': {
        content: `a.page {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 44px;
  min-height: 44px;
  margin: 0.25rem;
  padding: 0.5rem 0.75rem;
}
`,
      },
    },
  },
  {
    id: 'image-regions',
    group: 'Images',
    title: 'Image regions',
    description:
      'uvalib-image-regions outlines regions of a photograph (people, objects) and lists them beside it, under it on a phone. The list is the way in: hover or focus an entry, or its button, and its outline thickens and shows its label while the others dim; hover an outline and its entry is marked; click an outline and focus moves to its entry. The outlines are hidden from screen readers and are not tab stops. Each entry is the page’s own <li data-xywh="percent:x,y,w,h">, so the list works before the script loads, and its buttons are the page’s. Below, the same photograph in uvalib-lightbox: data-regions-list names a hidden <ol> in the page, with its own buttons, which the viewer shows as the region list (the same elements, so the page’s click listener still updates the status line in the viewer’s details) and puts back on close. A Show regions toggle hides the outlines and keeps the list. Region labels here are generic.',
    files: {
      'index.html': {
        content: page({
          title: 'Image regions',
          components: ['uvalib-image-regions', 'uvalib-lightbox'],
          body: `    <site-page>
      <h1>Lawn games</h1>
      <uvalib-image-regions id="regions" label="In this photograph">
        <img src="${iiif('1040162', ',600')}" alt="Dancers in white dresses circle a maypole on the Lawn in front of the Rotunda, watched by a crowd." width="746" height="600">
        <ol>
          <li data-xywh="percent:37.5,58,7,22">Person 1 <button type="button" class="uvalib-button uvalib-button--small" data-name="Person 1">Name Person 1</button></li>
          <li data-xywh="percent:51.5,58,7,22">Person 2 <button type="button" class="uvalib-button uvalib-button--small" data-name="Person 2">Name Person 2</button></li>
          <li data-xywh="percent:62,15,4.5,5.5">Clock</li>
          <li data-xywh="percent:63.5,47,4,7">Doorway</li>
        </ol>
      </uvalib-image-regions>
      <p id="said" role="status"></p>
      <h2>In the viewer</h2>
      <uvalib-lightbox regions-label="In this photograph">
        <a href="${iiif('1040162', '!1600,1600')}" data-caption="Lawn games" data-regions-list="lawn-people"><img src="${iiif('1040162', ',200')}" alt="Lawn games" width="249" height="200" loading="lazy"></a>
        <p slot="details" id="viewer-said" role="status"></p>
      </uvalib-lightbox>
      <ol id="lawn-people" hidden>
        <li data-xywh="percent:37.5,58,7,22">Person 1 <button type="button" class="uvalib-button uvalib-button--small" data-name="Person 1" data-act="Named">Name Person 1</button> <button type="button" class="uvalib-button uvalib-button--small" data-name="Person 1" data-act="Not">Not Person 1</button></li>
        <li data-xywh="percent:51.5,58,7,22">Person 2 <button type="button" class="uvalib-button uvalib-button--small" data-name="Person 2" data-act="Named">Name Person 2</button> <button type="button" class="uvalib-button uvalib-button--small" data-name="Person 2" data-act="Not">Not Person 2</button></li>
        <li data-xywh="percent:62,15,4.5,5.5">Clock</li>
        <li data-xywh="percent:63.5,47,4,7">Doorway</li>
      </ol>
    </site-page>
    <script type="module">
      // The buttons are the page's own: the component only numbers and highlights the entries.
      const said = document.querySelector('#said');
      document.querySelector('#regions').addEventListener('click', (e) => {
        const button = e.target.closest('button[data-name]');
        if (button) said.textContent = 'Naming ' + button.dataset.name + ' (an example: nothing is saved).';
      });
      // The viewer's list is the page's too: this listener keeps working while it is open.
      const viewerSaid = document.querySelector('#viewer-said');
      document.querySelector('#lawn-people').addEventListener('click', (e) => {
        const button = e.target.closest('button[data-act]');
        if (!button) return;
        const what = button.dataset.act === 'Not' ? 'Marked as not ' : 'Naming ';
        viewerSaid.textContent = what + button.dataset.name + ' (an example: nothing is saved).';
      });
      document.querySelector('#regions').addEventListener('select', (e) => {
        said.textContent = 'Outline ' + (e.detail.index + 1) + ' chosen: ' + e.detail.item.label + '.';
      });
    </script>`,
        }),
      },
    },
  },
  {
    id: 'image-versions',
    group: 'Images',
    title: 'Image versions',
    description:
      'data-versions on a lightbox link names other versions of the same picture (an AI colorization, a restoration, an infrared capture), and the viewer compares them over the photo: Reveal moves a divider (click or tap the photo, or use the slider: arrows, Shift+arrow, Home and End), Fade cross-fades, and Switch shows one at a time. compare="wipe" starts with Reveal. The other version loads only when it is first shown, the image keeps its place, and its accessible name ends with what is on screen. version-param="version" keeps the comparison in the address (?version=wipe:40). Here the second version is the same Library IIIF image in its bitonal quality; a real colorization would add a note saying the colours are an AI model’s guess. A version with a different framing gives frame, the original’s box in it: the second photo is a IIIF region (the middle of the plate) whose Full plate version is the whole image with frame="percent:15,15,70,70", so the viewer draws both at the same scale with the detail lined up, and Reveal shows exactly what lies around it (for an AI-expanded frame the note would say “Everything outside the original edges is painted by an AI model.”). A crop’s frame reaches past it: the third photo is the whole image with a Cropped detail version (a IIIF region) whose frame="percent:-125,-62.5,250,250" starts left of and above it, and data-version="1" opens the link on the crop the thumbnail shows, still compared with the original around it.',
    files: {
      'index.html': {
        content: page({
          title: 'Image versions',
          components: ['uvalib-lightbox'],
          body: `    <site-page>
      <h1>Lawn games, two ways</h1>
      <uvalib-lightbox url-param="photo" version-param="version" compare="wipe">
        <a href="${iiif('1040162', '!1600,1600')}" data-caption="Lawn games" data-versions='[{"label":"Original"},{"label":"Bitonal","href":"${iiif('1040162', '!1600,1600').replace('default.jpg', 'bitonal.jpg')}","note":"The IIIF server’s bitonal rendering: every pixel black or white."}]'><img src="${iiif('1040162', ',200')}" alt="Lawn games" width="249" height="200" loading="lazy"></a>
        <a href="${iiif('1040162', '!1600,1600', 'pct:15,15,70,70')}" data-caption="Lawn games, a detail" data-versions='[{"label":"Detail"},{"label":"Full plate","href":"${iiif('1040162', '!1600,1600')}","frame":"percent:15,15,70,70","note":"The whole photograph; the detail is its middle, cropped by the IIIF server."}]'><img src="${iiif('1040162', ',200', 'pct:15,15,70,70')}" alt="Lawn games, a detail" width="249" height="200" loading="lazy"></a>
        <a href="${iiif('1040162', '!1600,1600')}" data-caption="Lawn games, the right side" data-version="1" data-versions='[{"label":"Original"},{"label":"Cropped detail","href":"${iiif('1040162', '!1600,1600', 'pct:50,25,40,40')}","frame":"percent:-125,-62.5,250,250","note":"A crop of the photograph, cut by the IIIF server; the rest of it is not shown."}]'><img src="${iiif('1040162', ',200', 'pct:50,25,40,40')}" alt="Lawn games, the right side" width="249" height="200" loading="lazy"></a>
        <p slot="details">
          Holsinger Studio Collection (MSS 9862), Albert and Shirley Small Special Collections
          Library, University of Virginia. Shown from the Library's IIIF image server.
        </p>
      </uvalib-lightbox>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'places-map',
    group: 'Maps',
    title: 'Map: places on Grounds',
    description:
      'uvalib-map draws a map over the page\'s own Leaflet (here leaflet.js 1.9.4 from unpkg, pinned with an integrity hash and loaded with defer before the components; the library never bundles Leaflet, and Leaflet\'s CSS is optional) with the list of places under it. The places are the child list, so without JavaScript, or without Leaflet, the list is still there. Each marker is a link named like "The Rotunda, 2,702 photos" and sized by its count. Tab or the arrow keys move between markers, Enter follows one, and hovering or focusing a list entry highlights its marker (a ring and a larger dot). The Rotunda, its Dome Room and the Jefferson statue share one point, so they are one group marker, "The Rotunda and 2 more places, 3,610 photos" (as are any markers that would overlap at the current zoom): choosing it zooms in, or, when the places cannot part, spreads them in a ring. A skip link jumps past the map. The tiles are OpenStreetMap\'s, fine for an example but not for a busy page (see the README for a tile source). The counts are made up.',
    files: {
      'index.html': {
        content: page({
          title: 'Places on Grounds',
          components: ['uvalib-map'],
          head: `
    <script
      defer
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>`,
          body: `    <site-page>
      <h1>Places on Grounds</h1>
      <p>Photographs in the archive, by the place they show.</p>
      <uvalib-map id="places" label="Places on Grounds" count-label="photos">
        <ul>
          <li><a href="#rotunda" data-lat="38.0356" data-lng="-78.5034" data-count="2702" data-description="Jefferson's library for the University, from 1826.">The Rotunda</a></li>
          <li><a href="#dome-room" data-lat="38.0356" data-lng="-78.5034" data-count="600" data-description="The room under the dome.">Dome Room</a></li>
          <li><a href="#jefferson-statue" data-lat="38.0356" data-lng="-78.5034" data-count="308">Jefferson statue</a></li>
          <li><a href="#lawn" data-lat="38.0322" data-lng="-78.5045" data-count="1890" data-description="The pavilions, the gardens and the student rooms.">The Lawn</a></li>
          <li><a href="#alderman" data-lat="38.0367" data-lng="-78.5055" data-count="640">Alderman Library</a></li>
          <li><a href="#brooks" data-lat="38.0361" data-lng="-78.5007" data-count="85">Brooks Hall</a></li>
          <li><a href="#fralin" data-lat="38.0384" data-lng="-78.5027" data-count="120">The Fralin Museum of Art</a></li>
          <li><a href="#carrs-hill" data-lat="38.0393" data-lng="-78.507" data-count="48">Carr's Hill</a></li>
          <li><a href="#memorial-gym" data-lat="38.0372" data-lng="-78.5099" data-count="330">Memorial Gymnasium</a></li>
          <li><a href="#clark" data-lat="38.0327" data-lng="-78.5087" data-count="210">Clark Hall</a></li>
          <li><a href="#scott-stadium" data-lat="38.0311" data-lng="-78.5137" data-count="1150" data-description="Football, and Final Exercises in May.">Scott Stadium</a></li>
          <li><a href="#hospital" data-lat="38.0314" data-lng="-78.499" data-count="96">University Hospital</a></li>
        </ul>
      </uvalib-map>
      <p id="chosen" role="status"></p>
    </site-page>
    <script type="module">
      // Each marker and list entry links to the place (#rotunda here). select fires for a
      // marker first; call preventDefault() on it to stay on the page.
      document.querySelector('#places').addEventListener('select', (e) => {
        document.querySelector('#chosen').textContent = 'You chose ' + e.detail.item.name + '.';
      });
    </script>`,
        }),
      },
    },
  },
  {
    id: 'search-facets',
    group: 'Search',
    title: 'Search facets',
    description:
      'uvalib-filter (checkbox facet with scope chips and a limit) and uvalib-date-range (year slider plus date inputs). Both are controlled: set their properties from your search state and listen for filter-change, scope-change and date-range-change. The Subject group (150 made-up subjects) shows the filter-group options: collapsible with the library caret (the selected count shows while closed), searchable (accent-insensitive; checked subjects stay at the top), sortable (Count | Name (A–Z)), clearable and match="any". The Format group uses apply-button: changes are staged until Apply, so one search runs per Apply.',
    files: {
      'index.html': {
        content: page({
          title: 'Search facets',
          styles: true,
          components: ['uvalib-filter', 'uvalib-date-range'],
          body: `    <site-page>
      <h1>Search facets</h1>
      <div class="facets">
        <uvalib-filter id="people" limit="3"></uvalib-filter>
        <uvalib-filter
          id="subjects"
          collapsible
          heading-level="2"
          searchable
          sortable
          clearable
          match="any"
          unit="subjects"
          limit="5"
        ></uvalib-filter>
        <uvalib-filter
          id="formats"
          collapsible
          heading-level="2"
          apply-button
          clearable
          match="any"
        ></uvalib-filter>
        <uvalib-date-range
          id="dates"
          min="1819-01-01"
          max="2026-12-31"
          label="Meeting date"
        ></uvalib-date-range>
      </div>
      <h2>Events</h2>
      <pre id="log" aria-live="polite">Change a facet to see its event.</pre>
    </site-page>
    <script type="module">
      const log = (name, detail) => {
        document.querySelector('#log').textContent = name + ' ' + JSON.stringify(detail, null, 2);
      };

      const people = document.querySelector('#people');
      await customElements.whenDefined('uvalib-filter');
      people.filter = {
        name: 'participants',
        title: 'Participants',
        position: 0,
        buckets: ['Thomas Jefferson', 'James Madison', 'James Monroe', 'John Hartwell Cocke', 'Joseph C. Cabell'].map(
          (key, i) => ({ key, doc_count: 40 - i * 7, selected: false }),
        ),
      };
      people.scopes = [
        { value: 'Board member', label: 'Board' },
        { value: 'Staff', label: 'Staff' },
      ];
      people.scopesLabel = 'Show participants by role';
      people.addEventListener('filter-change', (e) => log('filter-change', e.detail));
      people.addEventListener('scope-change', (e) => log('scope-change', e.detail));

      // 150 made-up subjects: 30 topics, each alone and with four subdivisions.
      const topics = ['Agriculture', 'Architecture', 'Astronomy', 'Botany', 'Café culture', 'Cartography',
        'Ceramics', 'Climate', 'Dance', 'Écologie', 'Economics', 'Education', 'Engineering', 'Folklore',
        'Geology', 'Glassmaking', 'Horticulture', 'Journalism', 'Linguistics', 'Mathematics', 'Medicine',
        'Música', 'Navigation', 'Philosophy', 'Photography', 'Poetry', 'Railroads', 'Rivers', 'Textiles',
        'Weather'];
      const parts = ['', ' — History', ' — Maps', ' — Periodicals', ' — Biography'];
      const subjects = document.querySelector('#subjects');
      subjects.filter = {
        name: 'subject',
        title: 'Subject',
        position: 1,
        buckets: parts
          .flatMap((part) => topics.map((topic) => topic + part))
          .map((key, i) => ({ key, doc_count: ((i * 37) % 97) + 1, selected: false }))
          .sort((a, b) => b.doc_count - a.doc_count),
      };
      subjects.addEventListener('filter-change', (e) => {
        subjects.value = e.detail.value;
        log('filter-change', e.detail);
      });

      const formats = document.querySelector('#formats');
      formats.filter = {
        name: 'format',
        title: 'Format',
        position: 2,
        buckets: ['Book', 'Manuscript', 'Map', 'Photograph', 'Sound recording', 'Video'].map(
          (key, i) => ({ key, doc_count: 120 - i * 17, selected: false }),
        ),
      };
      formats.addEventListener('filter-change', (e) => {
        formats.value = e.detail.value;
        log('filter-change (applied)', e.detail);
      });
      for (const el of [subjects, formats]) {
        el.addEventListener('toggle', (e) => log('toggle', e.detail));
        el.addEventListener('sort', (e) => log('sort', e.detail));
      }

      const dates = document.querySelector('#dates');
      await customElements.whenDefined('uvalib-date-range');
      dates.addEventListener('date-range-change', (e) => log('date-range-change', e.detail));
    </script>`,
        }),
      },
      'styles.css': {
        content: `/* The facets are plain children of site-page; lay them out like a search sidebar. */
.facets {
  display: grid;
  gap: 1.5rem;
  max-inline-size: 22rem;
  padding: 1rem 0;
}

pre {
  min-block-size: 4rem;
  padding: 0.5rem;
  background: #f1f1f1;
  white-space: pre-wrap;
}
`,
      },
    },
  },
  {
    id: 'search-results',
    group: 'Search',
    title: 'Search results (bento-box)',
    description:
      'bento-box is library.virginia.edu/search: a search bar, then the first results from the Virgo catalog, Virgo articles and the subject guides, each with a "See all" link to the full search. The query comes from the page URL (?q=) or the query attribute; searching pushes ?q= to the history, and Back restores it. Its headings follow the page’s own: h2 then h3 under the h1. The catalog, articles and guides allow any origin, so they run live here; the fourth section, website, reads the library website’s search index, which only answers library.virginia.edu itself, so this example leaves it out with boxes. While results load, invisible placeholder entries hold the final height, and styles.css reserves the box’s height before the script runs, so nothing below jumps.',
    files: {
      'index.html': {
        content: page({
          title: 'Search results',
          components: ['bento-box'],
          body: `    <site-page>
      <h1>Search Library resources</h1>
      <div class="results">
        <bento-box limit="3" boxes="catalog,articles,libguides" query="climate change"></bento-box>
      </div>
      <p class="virgo-links">
        <a href="https://search.lib.virginia.edu/">Search Virgo</a> |
        <a href="https://search.lib.virginia.edu/search?mode=advanced">Advanced Virgo search</a>
      </p>
    </site-page>`,
          styles: true,
        }),
      },
      'styles.css': {
        content: RESULTS_CSS,
      },
    },
  },
  {
    id: 'pagefind-search',
    group: 'Search',
    title: 'Static-site search (Pagefind)',
    description:
      "Pagefind's own search UI with the library theme: pagefind.css in place of Pagefind's pagefind-ui.css, and <uvalib-pagefind-search>, which loads the site's Pagefind bundle (bundle-path) and adds a visible label, a polite result count, focus that stays put after Clear, Escape and Load more, a shareable ?q= and analytics. This one searches a tiny demo index of seven texts: try virginia, rivers or Blue Ridge, then a filter.",
    files: {
      'index.html': {
        content: page({
          title: 'Search the texts',
          components: ['uvalib-pagefind-search'],
          head: `\n    <link rel="stylesheet" href="${CDN_TOKEN}pagefind.css" />`,
          body: `    <site-page>
      <h1>Search the texts</h1>
      <!-- On a real site bundle-path is where Pagefind wrote its bundle, such as /pagefind/. -->
      <uvalib-pagefind-search
        bundle-path="${CDN_TOKEN}../pagefind-demo/"
        placeholder="Search all texts"
        page-size="3"
        show-sub-results
      ></uvalib-pagefind-search>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'results-toolbar',
    group: 'Search',
    title: 'Results toolbar & badges',
    description:
      "A results page from base.css's classes and two small elements: .uvalib-toolbar (a filter box, a category select and a decade chip group), <uvalib-results-count> (“Showing 3 of 6 shoots”, announced politely once it settles, never on load), count badges over images (.uvalib-media, .uvalib-badge--count), category and status badges (never colour alone), <uvalib-tag-list> with Show all, .uvalib-empty-state when nothing matches, and .uvalib-skeleton placeholders while loading (no shimmer with reduced motion). Type snow, pick a category or a decade, or Reload.",
    files: {
      'index.html': {
        content: page({
          title: 'Shoots',
          styles: true,
          components: ['uvalib-tag-list', 'uvalib-results-count'],
          body: `    <site-page>
      <h1>Shoots</h1>
      <div class="uvalib-toolbar">
        <div class="uvalib-toolbar__field uvalib-toolbar__field--grow">
          <label for="filter">Filter shoots</label>
          <input class="uvalib-input" id="filter" type="search" />
        </div>
        <div class="uvalib-toolbar__field">
          <label for="category">Category</label>
          <select class="uvalib-input" id="category">
            <option value="">All categories</option>
            <option>Architecture</option>
            <option>Student life</option>
          </select>
        </div>
        <div class="uvalib-toolbar__group" role="group" aria-label="Decade">
          <button class="uvalib-button uvalib-button--small" type="button" aria-pressed="false" data-decade="1910">1910s</button>
          <button class="uvalib-button uvalib-button--small" type="button" aria-pressed="false" data-decade="1920">1920s</button>
        </div>
        <uvalib-results-count class="uvalib-toolbar__summary" shown="6" total="6" noun="shoots" singular="shoot"></uvalib-results-count>
      </div>
      <div class="results" id="results">
        <ul class="shoots" id="shoots">
${SHOOTS}
        </ul>
        <div class="shoots" id="loading" aria-hidden="true" hidden>
${SKELETONS}
        </div>
        <p class="visually-hidden" role="status" id="loading-status"></p>
        <div class="uvalib-empty-state" id="empty" hidden>
          <svg class="uvalib-empty-state__icon" aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" /><path d="M16 16l5 5" stroke="currentColor" stroke-width="2" /></svg>
          <h2>No shoots match</h2>
          <p>Try another word, or clear the filters.</p>
          <button class="uvalib-button uvalib-button--secondary" type="button" id="clear">Clear filters</button>
        </div>
      </div>
      <p><button class="uvalib-button uvalib-button--subtle" type="button" id="reload">Reload</button></p>
      <h2>Subjects</h2>
      <uvalib-tag-list label="Subjects in these shoots" hide-label track-label limit="5" href-template="#subject={tag}">
        <span>Rotunda</span>
        <span>Lawn</span>
        <span>Snow</span>
        <span>Holsinger Studio</span>
        <span>Students</span>
        <span>Pavilions</span>
        <span>Games</span>
        <span>Architecture</span>
      </uvalib-tag-list>
      <h2>Badges</h2>
      <p class="badges">
        <span class="uvalib-badge">Plain</span>
        <span class="uvalib-badge uvalib-badge--category">Faculty &amp; Staff Portraits</span>
        <span class="uvalib-badge uvalib-badge--status uvalib-badge--success">Done</span>
        <span class="uvalib-badge uvalib-badge--status uvalib-badge--warning">Processing</span>
        <span class="uvalib-badge uvalib-badge--status uvalib-badge--danger">Failed</span>
        <span class="uvalib-badge uvalib-badge--status uvalib-badge--info">Largest</span>
        <span class="uvalib-badge uvalib-badge--new">New</span>
        <span class="uvalib-badge uvalib-badge--body">Body size</span>
      </p>
      <script type="module">
        const filter = document.querySelector('#filter');
        const category = document.querySelector('#category');
        const decades = [...document.querySelectorAll('button[data-decade]')];
        const count = document.querySelector('uvalib-results-count');
        const shoots = [...document.querySelectorAll('#shoots > li')];
        const empty = document.querySelector('#empty');
        function apply() {
          const q = filter.value.trim().toLowerCase();
          const on = decades.filter((b) => b.getAttribute('aria-pressed') === 'true');
          let shown = 0;
          for (const li of shoots) {
            const match =
              li.textContent.toLowerCase().includes(q) &&
              (!category.value || li.dataset.category === category.value) &&
              (!on.length || on.some((b) => b.dataset.decade === li.dataset.decade));
            li.hidden = !match;
            if (match) shown++;
          }
          count.shown = shown;
          count.total = shoots.length;
          empty.hidden = shown > 0;
        }
        filter.addEventListener('input', apply);
        category.addEventListener('change', apply);
        for (const b of decades)
          b.addEventListener('click', () => {
            b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
            apply();
          });
        document.querySelector('#clear').addEventListener('click', () => {
          filter.value = '';
          category.value = '';
          for (const b of decades) b.setAttribute('aria-pressed', 'false');
          apply();
          filter.focus();
        });
        document.querySelector('#reload').addEventListener('click', () => {
          const results = document.querySelector('#results');
          const list = document.querySelector('#shoots');
          const loading = document.querySelector('#loading');
          const status = document.querySelector('#loading-status');
          results.setAttribute('aria-busy', 'true');
          list.hidden = true;
          loading.hidden = false;
          status.textContent = 'Loading shoots';
          setTimeout(() => {
            loading.hidden = true;
            list.hidden = false;
            results.removeAttribute('aria-busy');
            status.textContent = '';
          }, 1500);
        });
      </script>
    </site-page>`,
        }),
      },
      'styles.css': {
        content: `.shoots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
  gap: 1rem;
  margin: 0 0 1rem;
  padding: 0;
  list-style: none;
}
.shoots [hidden] {
  display: none;
}
.shoots h2 {
  margin: 0.5rem 0 0.25rem;
  font-size: 1.15rem;
}
.shoot-badges,
.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}
`,
      },
    },
  },
  {
    id: 'results-list',
    group: 'Search',
    title: 'Results list',
    description:
      "120 made-up committee reports as base.css's lightweight result rows: .uvalib-result-list and .uvalib-result with a date badge, the title as the row's one link, a snippet and a PDF action with a unique hidden name, grouped by year. Type a word (lights, maps): rows that do not match are hidden, and the word is marked in each snippet in bold on --uva-color-highlight. Rows off screen skip rendering (content-visibility), so thousands stay fast. On a phone the PDF button wraps below the text. The note at the top is a .uvalib-message.",
    files: {
      'index.html': {
        content: page({
          title: 'Committee reports',
          components: ['uvalib-results-count'],
          body: `    <site-page>
      <h1>Committee reports</h1>
      <div class="uvalib-message uvalib-message--notice">
        <strong class="uvalib-message__label">Note:</strong> these reports are made up for this example.
      </div>
      <div class="uvalib-toolbar">
        <div class="uvalib-toolbar__field uvalib-toolbar__field--grow">
          <label for="filter">Search the reports</label>
          <input class="uvalib-input" id="filter" type="search" />
        </div>
        <uvalib-results-count class="uvalib-toolbar__summary" shown="120" total="120" noun="reports" singular="report"></uvalib-results-count>
      </div>
      <div id="reports">
${REPORT_YEARS}
      </div>
      <div class="uvalib-empty-state" id="empty" hidden>
        <h2>No reports match</h2>
        <p>Try another word.</p>
      </div>
      <script type="module">
        const filter = document.querySelector('#filter');
        const count = document.querySelector('uvalib-results-count');
        const rows = [...document.querySelectorAll('.uvalib-result')];
        const snippets = new Map(rows.map((r) => [r, r.querySelector('.uvalib-result__snippet')]));
        const original = new Map(rows.map((r) => [r, snippets.get(r).textContent]));
        /** The snippet's text with each match of q in a <mark>, built as nodes, never HTML. */
        function mark(p, text, q) {
          const parts = q ? text.split(new RegExp('(' + q.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&') + ')', 'i')) : [text];
          p.replaceChildren(
            ...parts.map((t, i) => {
              if (i % 2 === 0) return document.createTextNode(t);
              const m = document.createElement('mark');
              m.textContent = t;
              return m;
            }),
          );
        }
        filter.addEventListener('input', () => {
          const q = filter.value.trim();
          let shown = 0;
          for (const row of rows) {
            const match = !q || row.textContent.toLowerCase().includes(q.toLowerCase());
            row.hidden = !match;
            if (match) shown++;
            mark(snippets.get(row), original.get(row), match ? q : '');
          }
          for (const year of document.querySelectorAll('.year'))
            year.hidden = !year.querySelector('.uvalib-result:not([hidden])');
          document.querySelector('#empty').hidden = shown > 0;
          count.shown = shown;
          count.total = rows.length;
        });
      </script>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'date-histogram',
    group: 'Search',
    title: 'Date histogram',
    description:
      'Monthly photo counts for 2005–2017, as on an archive timeline. Each bar is a button; choosing one sets the date range, and moving the date range highlights the months it covers. The strip on the card is the same counts, one bar per year, and is not a control. On a narrow screen the months scroll inside the chart.',
    files: {
      'index.html': {
        content: page({
          title: 'Photos by date',
          components: ['uvalib-date-range', 'uvalib-date-histogram', 'uvalib-card'],
          body: `    <site-page>
      <h1>Photos by date</h1>
      <uvalib-date-range id="dates" min="2005-01-01" max="2017-12-31" label="Photo dates"></uvalib-date-range>
      <uvalib-date-histogram id="hist" range-for="dates" granularity="month" unit="photos" label="Photos by date"></uvalib-date-histogram>
      <uvalib-card>
        <span slot="heading">Campus scenes, 2005–2017</span>
        <uvalib-date-histogram id="strip" slot="meta" variant="strip" unit="photos" label="Photos by year"></uvalib-date-histogram>
      </uvalib-card>
    </site-page>
    <script type="module">
      const items = [
        { date: '2005-01', count: 1 },
        { date: '2005-02', count: 120 },
        { date: '2005-03', count: 175 },
        { date: '2005-04', count: 2451 },
        { date: '2005-05', count: 3580 },
        { date: '2005-06', count: 1443 },
        { date: '2005-07', count: 965 },
        { date: '2005-08', count: 720 },
        { date: '2005-09', count: 1422 },
        { date: '2005-10', count: 1170 },
        { date: '2005-11', count: 1063 },
        { date: '2005-12', count: 331 },
        { date: '2006-01', count: 1268 },
        { date: '2006-02', count: 716 },
        { date: '2006-03', count: 970 },
        { date: '2006-04', count: 1625 },
        { date: '2006-05', count: 2094 },
        { date: '2006-06', count: 586 },
        { date: '2006-07', count: 104 },
        { date: '2006-08', count: 1059 },
        { date: '2006-09', count: 2898 },
        { date: '2006-10', count: 1245 },
        { date: '2006-11', count: 1260 },
        { date: '2006-12', count: 1276 },
        { date: '2007-01', count: 1009 },
        { date: '2007-02', count: 1391 },
        { date: '2007-03', count: 3064 },
        { date: '2007-04', count: 1895 },
        { date: '2007-05', count: 2365 },
        { date: '2007-06', count: 1104 },
        { date: '2007-07', count: 858 },
        { date: '2007-08', count: 913 },
        { date: '2007-09', count: 1431 },
        { date: '2007-10', count: 720 },
        { date: '2007-11', count: 899 },
        { date: '2007-12', count: 340 },
        { date: '2008-01', count: 181 },
        { date: '2008-02', count: 547 },
        { date: '2008-03', count: 676 },
        { date: '2008-04', count: 453 },
        { date: '2008-05', count: 527 },
        { date: '2008-06', count: 212 },
        { date: '2008-07', count: 203 },
        { date: '2008-08', count: 336 },
        { date: '2008-09', count: 447 },
        { date: '2008-10', count: 597 },
        { date: '2008-11', count: 428 },
        { date: '2008-12', count: 190 },
        { date: '2009-01', count: 67 },
        { date: '2009-02', count: 334 },
        { date: '2009-03', count: 456 },
        { date: '2009-04', count: 839 },
        { date: '2009-05', count: 1157 },
        { date: '2009-06', count: 159 },
        { date: '2009-07', count: 222 },
        { date: '2009-08', count: 480 },
        { date: '2009-09', count: 472 },
        { date: '2009-10', count: 921 },
        { date: '2009-11', count: 513 },
        { date: '2009-12', count: 403 },
        { date: '2010-01', count: 347 },
        { date: '2010-02', count: 384 },
        { date: '2010-03', count: 878 },
        { date: '2010-04', count: 755 },
        { date: '2010-05', count: 613 },
        { date: '2010-06', count: 222 },
        { date: '2010-07', count: 215 },
        { date: '2010-08', count: 486 },
        { date: '2010-09', count: 270 },
        { date: '2010-10', count: 164 },
        { date: '2010-11', count: 112 },
        { date: '2010-12', count: 86 },
        { date: '2011-01', count: 315 },
        { date: '2011-02', count: 360 },
        { date: '2011-03', count: 502 },
        { date: '2011-04', count: 930 },
        { date: '2011-05', count: 665 },
        { date: '2011-06', count: 459 },
        { date: '2011-07', count: 129 },
        { date: '2011-08', count: 76 },
        { date: '2011-09', count: 549 },
        { date: '2011-10', count: 445 },
        { date: '2011-11', count: 390 },
        { date: '2011-12', count: 76 },
        { date: '2012-01', count: 316 },
        { date: '2012-02', count: 270 },
        { date: '2012-03', count: 231 },
        { date: '2012-04', count: 478 },
        { date: '2012-05', count: 1015 },
        { date: '2012-06', count: 148 },
        { date: '2012-07', count: 187 },
        { date: '2012-08', count: 441 },
        { date: '2012-09', count: 593 },
        { date: '2012-10', count: 646 },
        { date: '2012-11', count: 305 },
        { date: '2012-12', count: 218 },
        { date: '2013-01', count: 2515 },
        { date: '2013-02', count: 3392 },
        { date: '2013-03', count: 1550 },
        { date: '2013-04', count: 998 },
        { date: '2013-05', count: 932 },
        { date: '2013-06', count: 276 },
        { date: '2013-07', count: 226 },
        { date: '2013-08', count: 537 },
        { date: '2013-09', count: 333 },
        { date: '2013-10', count: 4199 },
        { date: '2013-11', count: 1923 },
        { date: '2013-12', count: 1590 },
        { date: '2014-01', count: 2049 },
        { date: '2014-02', count: 2015 },
        { date: '2014-03', count: 1502 },
        { date: '2014-04', count: 2974 },
        { date: '2014-05', count: 2903 },
        { date: '2014-06', count: 235 },
        { date: '2014-07', count: 150 },
        { date: '2014-08', count: 342 },
        { date: '2014-09', count: 284 },
        { date: '2014-10', count: 2155 },
        { date: '2014-11', count: 1318 },
        { date: '2014-12', count: 743 },
        { date: '2015-01', count: 1666 },
        { date: '2015-02', count: 434 },
        { date: '2015-03', count: 267 },
        { date: '2015-04', count: 358 },
        { date: '2015-05', count: 879 },
        { date: '2015-06', count: 425 },
        { date: '2015-07', count: 231 },
        { date: '2015-08', count: 722 },
        { date: '2015-09', count: 414 },
        { date: '2015-10', count: 5311 },
        { date: '2015-11', count: 1316 },
        { date: '2015-12', count: 327 },
        { date: '2016-01', count: 3262 },
        { date: '2016-02', count: 504 },
        { date: '2016-03', count: 472 },
        { date: '2016-04', count: 617 },
        { date: '2016-05', count: 982 },
        { date: '2016-06', count: 370 },
        { date: '2016-07', count: 85 },
        { date: '2016-08', count: 561 },
        { date: '2016-09', count: 497 },
        { date: '2016-10', count: 4602 },
        { date: '2016-11', count: 435 },
        { date: '2016-12', count: 327 },
        { date: '2017-01', count: 245 },
        { date: '2017-02', count: 401 },
        { date: '2017-03', count: 390 },
        { date: '2017-04', count: 776 },
        { date: '2017-05', count: 902 },
        { date: '2017-06', count: 519 },
        { date: '2017-07', count: 240 },
        { date: '2017-08', count: 354 },
        { date: '2017-09', count: 355 },
        { date: '2017-10', count: 768 },
        { date: '2017-11', count: 408 },
        { date: '2017-12', count: 164 },
      ];
      await customElements.whenDefined('uvalib-date-histogram');
      document.querySelector('#hist').items = items;
      document.querySelector('#strip').items = items;
    </script>`,
        }),
      },
    },
  },
  {
    id: 'date-histogram-decades',
    group: 'Search',
    title: 'Date histogram: decades over a long span',
    description:
      'Made-up meeting counts for 1817–2026, one bar per decade (granularity="decade"), five decades to a labelled row. Each bar is named like "1810s: 22 meetings"; choosing one selects the whole decade and sets the date range to its first and last day. A decade with no meetings is a gap. Clear sets the date range in script, and the chart follows it. granularity="auto" picks months, years or decades from the span.',
    files: {
      'index.html': {
        content: page({
          title: 'Meetings by decade',
          components: ['uvalib-date-range', 'uvalib-date-histogram'],
          body: `    <site-page>
      <h1>Meetings by decade</h1>
      <uvalib-date-range id="meeting-dates" min="1817-01-01" max="2026-12-31" label="Meeting dates"></uvalib-date-range>
      <p><button type="button" class="uvalib-button uvalib-button--secondary" id="clear-dates">Clear dates</button></p>
      <uvalib-date-histogram id="decades" range-for="meeting-dates" granularity="decade" unit="meetings" label="Meetings by decade"></uvalib-date-histogram>
    </site-page>
    <script type="module">
      // Made-up counts: a few meetings a year, none in the 1860s, more after 1900.
      const items = [];
      for (let year = 1817; year <= 2026; year++) {
        const count = year >= 1860 && year < 1870 ? 0 : (year > 1900 ? 6 : 3) + ((year * 7) % 5);
        items.push({ date: String(year), count });
      }
      await customElements.whenDefined('uvalib-date-histogram');
      document.querySelector('#decades').items = items;
      const range = document.querySelector('#meeting-dates');
      document.querySelector('#clear-dates').addEventListener('click', () => {
        range.value = [range.min, range.max];
      });
    </script>`,
        }),
      },
    },
  },
  {
    id: 'combobox',
    group: 'Search',
    title: 'Combobox: person and subject pickers',
    description:
      'uvalib-combobox is a text field that suggests values as you type (the WAI-ARIA editable combobox with list autocomplete). The person picker gets 300 made-up names from the items property; matching ignores case and accents, and the matched text is bold and underlined. The subject picker reads its <option> children. Down opens the list and moves, Enter chooses, Escape closes and then clears, and the clear button empties the field. Typed text is kept unless you choose. A polite status says how many suggestions there are. Both are form fields: Submit shows what the form would send (the chosen value, or the text). src="/api/people?q={q}" would fetch suggestions from a URL instead.',
    files: {
      'index.html': {
        content: page({
          title: 'Find photographs',
          components: ['uvalib-combobox'],
          body: `    <site-page>
      <h1>Find photographs</h1>
      <form id="find">
        <uvalib-combobox
          id="person"
          name="person"
          label="Person"
          description="Type part of a name, then choose with the arrow keys and Enter."
        ></uvalib-combobox>
        <uvalib-combobox id="subject" name="subject" label="Subject">
          <option value="architecture">Architecture</option>
          <option value="athletics" data-description="Sports, games and teams">Athletics</option>
          <option value="commencement">Commencement</option>
          <option value="gardens">Gardens and grounds</option>
          <option value="libraries">Libraries</option>
          <option value="music">Music and theatre</option>
          <option value="snow">Snow and weather</option>
          <option value="student-life">Student life</option>
        </uvalib-combobox>
        <p><button class="uvalib-button" type="submit">Search</button></p>
      </form>
      <p id="sent">Nothing searched yet.</p>
    </site-page>
    <script type="module">
      // Made-up names for the example: every first name with every family name.
      const first = ['Avery', 'Bea', 'Cal', 'Dana', 'Eli', 'Fern', 'Gus', 'Hollis', 'Iris', 'Jules',
        'Kit', 'Lena', 'Milo', 'Nell', 'Otto', 'Pia', 'Quinn', 'Rory', 'Sage', 'Theo'];
      const family = ['Ashby', 'Brandt', 'Corwin', 'Dorsey', 'Ellery', 'Fairbairn', 'Gable',
        'Hartwell', 'Ibarra', 'Jessup', 'Kilroy', 'Lindqvist', 'Moreau', 'Núñez', 'Okafor'];
      const roles = ['Photographer', 'Student', 'Faculty', 'Visitor'];
      document.querySelector('#person').items = family.flatMap((f, j) =>
        first.map((n, i) => ({
          value: 'person-' + (j * first.length + i + 1),
          label: n + ' ' + f,
          description: roles[(i + j) % roles.length],
        })),
      );
      document.querySelector('#find').addEventListener('submit', (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        document.querySelector('#sent').textContent =
          'The form would send person=' + (data.get('person') || '(empty)') +
          ' and subject=' + (data.get('subject') || '(empty)') + '.';
      });
    </script>`,
        }),
      },
    },
  },
  {
    id: 'filter-drawer',
    group: 'Search',
    title: 'Filter drawer: search and filters',
    description:
      'uvalib-filter-drawer around a search form and uvalib-filter: a plain sidebar on wide screens; at 48rem and below a “Search and filters” button (with the number of filters set) that opens them in a modal panel from the side. Close takes focus, Escape, Close and the backdrop close it, and focus returns to the button. The rest of the page, the library header included, is inert while it is open; the results count outside is named in live, so its announcements are repeated inside the panel. Typed text and checked filters stay when the panel closes or the window is resized. Narrow the preview to see the button.',
    files: {
      'index.html': {
        content: page({
          title: 'Search the minutes',
          styles: true,
          components: ['uvalib-filter-drawer', 'uvalib-filter', 'uvalib-results-count'],
          body: `    <site-page>
      <h1>Search the minutes</h1>
      <div class="search-layout">
        <uvalib-filter-drawer id="drawer" label="Search and filters" live="count">
          <form class="uvalib-search-form" role="search" id="search">
            <label for="q">Search the minutes</label>
            <input class="uvalib-input" id="q" name="q" type="search" />
            <button class="uvalib-button" type="submit">Search</button>
          </form>
          <uvalib-filter id="decade"></uvalib-filter>
        </uvalib-filter-drawer>
        <section aria-labelledby="results-heading">
          <h2 id="results-heading">Results</h2>
          <uvalib-results-count id="count" total="1204" noun="meetings" singular="meeting"></uvalib-results-count>
          <p id="sent">Choose a decade or search to narrow the meetings.</p>
        </section>
      </div>
    </site-page>
    <script type="module">
      const counts = { '1820s': 61, '1830s': 74, '1840s': 69, '1850s': 80, '1860s': 52 };
      const drawer = document.querySelector('#drawer');
      const decade = document.querySelector('#decade');
      const count = document.querySelector('#count');
      await customElements.whenDefined('uvalib-filter');
      decade.filter = {
        name: 'decade',
        title: 'Decade',
        position: 0,
        buckets: Object.entries(counts).map(([key, doc_count]) => ({ key, doc_count, selected: false })),
      };
      decade.addEventListener('filter-change', (e) => {
        const chosen = e.detail.value;
        drawer.count = chosen.length;
        count.total = chosen.length ? chosen.reduce((n, k) => n + counts[k], 0) : 1204;
      });
      document.querySelector('#search').addEventListener('submit', (e) => {
        e.preventDefault();
        const q = new FormData(e.target).get('q');
        document.querySelector('#sent').textContent = q
          ? 'The page would search for what you typed.'
          : 'Type something to search.';
        drawer.close();
      });
    </script>`,
        }),
      },
      'styles.css': {
        content: `/* Two columns above the drawer's breakpoint (48rem); one below, where the drawer is a button. */
.search-layout {
  display: grid;
  gap: 1.5rem;
  padding-block: 1rem;
}

@media (width > 48rem) {
  .search-layout {
    grid-template-columns: 18rem minmax(0, 1fr);
    align-items: start;
  }
}

uvalib-filter-drawer .uvalib-search-form,
uvalib-filter-drawer uvalib-filter {
  margin-block-end: 1.5rem;
}

.search-layout h2 {
  margin-block-start: 0;
}
`,
      },
    },
  },
  {
    id: 'dialog',
    group: 'Search',
    title: 'Dialog: search tips and a form',
    description:
      'uvalib-dialog, the library’s modal dialog: “Search tips” opens a content dialog from a data-uvalib-dialog button (the heading takes focus); “Email this citation” opens a small form dialog whose email field has autofocus, with required and help text in AAA contrast, an error summary (role="alert") on a failed send, and a success status. Close, Escape, the backdrop, Cancel and Send all close it, and focus returns to the button that opened it. The rest of the page, the library header included, is inert while one is open.',
    files: {
      'index.html': {
        content: page({
          title: 'Search the catalog',
          styles: true,
          components: ['uvalib-dialog'],
          body: `    <site-page>
      <h1>Search the catalog</h1>
      <form class="uvalib-search-form" role="search" id="search">
        <label for="q">Search the catalog</label>
        <input class="uvalib-input" id="q" name="q" type="search" />
        <button class="uvalib-button" type="submit">Search</button>
      </form>
      <p class="dialog-buttons">
        <button type="button" class="uvalib-button uvalib-button--secondary" data-uvalib-dialog="search-tips">Search tips</button>
        <button type="button" class="uvalib-button uvalib-button--secondary" data-uvalib-dialog="email-cite">Email this citation</button>
      </p>
      <p id="sent" role="status"></p>

      <uvalib-dialog id="search-tips" label="Search tips">
        <ul>
          <li>Put a phrase in quotes to find the words together: <code>"board of visitors"</code>.</li>
          <li>Use <code>OR</code> to find either word: <code>Jefferson OR Madison</code>.</li>
          <li>Put <code>-</code> before a word to leave it out: <code>rotunda -fire</code>.</li>
          <li>Use <code>*</code> for any ending: <code>architect*</code> finds architect, architects and architecture.</li>
        </ul>
        <p>
          <a href="https://guides.lib.virginia.edu/" target="_blank" rel="noopener">Research guides (opens in a new tab)</a>
        </p>
      </uvalib-dialog>

      <uvalib-dialog id="email-cite" label="Email this citation" size="small">
        <form method="dialog" id="cite-form" novalidate>
          <div class="uvalib-message uvalib-message--error" role="alert" id="cite-errors"></div>
          <div class="field">
            <label for="cite-email">Email <span class="uvalib-required">(required)</span></label>
            <input class="uvalib-input" id="cite-email" name="email" type="email" required autofocus aria-describedby="cite-email-help" />
            <span class="uvalib-help" id="cite-email-help">We send the citation to this address only.</span>
          </div>
          <div class="actions">
            <button class="uvalib-button" value="send">Send</button>
            <button class="uvalib-button uvalib-button--secondary" value="cancel" formnovalidate>Cancel</button>
          </div>
        </form>
      </uvalib-dialog>
    </site-page>
    <script type="module">
      const form = document.querySelector('#cite-form');
      const email = document.querySelector('#cite-email');
      const errors = document.querySelector('#cite-errors');
      const help = 'cite-email-help';
      // The form checks itself, so the error is in words, announced and linked to the field.
      form.addEventListener('submit', (e) => {
        if (e.submitter?.value !== 'send' || email.checkValidity()) {
          errors.replaceChildren();
          email.removeAttribute('aria-invalid');
          email.setAttribute('aria-describedby', help);
          return;
        }
        e.preventDefault(); // stay open
        const message = email.value ? 'Enter an email address such as name@virginia.edu.' : 'Enter your email address.';
        errors.innerHTML = '<strong class="uvalib-message__label">Error:</strong> <a href="#cite-email"></a>';
        errors.querySelector('a').textContent = message;
        email.setAttribute('aria-invalid', 'true');
        email.setAttribute('aria-describedby', 'cite-errors ' + help);
        email.focus();
      });
      errors.addEventListener('click', (e) => {
        if (e.target.closest('a')) {
          e.preventDefault();
          email.focus();
        }
      });
      document.querySelector('#email-cite').addEventListener('uvalib-dialog-close', (e) => {
        if (e.detail.returnValue === 'send') {
          document.querySelector('#sent').textContent = 'The citation would be sent to the address you gave.';
          form.reset();
        }
      });
      document.querySelector('#search').addEventListener('submit', (e) => e.preventDefault());
    </script>`,
        }),
      },
      'styles.css': {
        content: `.dialog-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

#cite-form .field {
  display: grid;
  gap: 0.25rem;
  margin-block-end: 1.25rem;
}

#cite-form .actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

#cite-errors:empty {
  display: none;
}

#cite-errors {
  margin-block-start: 0;
}
`,
      },
    },
  },
  {
    id: 'list-filter',
    group: 'Search',
    title: 'List filter: a collection’s texts',
    description:
      'uvalib-list-filter over a collection page’s list of 24 texts, as the Electronic Text Collections show theirs: type to narrow it. Every word must match, in any order, ignoring case and accents (try “eneide” or “poe raven”), against each item’s data-filter-text. The count under the field follows at once and is announced once the typing settles; when nothing matches, a message says so. Clear or Escape empties the field and keeps focus in it. query-param keeps the filter in the URL (?filter=). Below, a list in headed groups (data-filter-group): a decade whose letters are all filtered out disappears, heading and all. With base.css the field’s space is held and the whole list shows before the script runs.',
    files: {
      'index.html': {
        content: page({
          title: 'Early American and world literature',
          styles: true,
          components: ['uvalib-list-filter'],
          body: `    <site-page>
      <h1>Early American and world literature</h1>
      <uvalib-list-filter
        for="doc-list"
        noun="texts"
        singular="text"
        placeholder="Title or author"
        query-param
      ></uvalib-list-filter>
      <ol class="doc-list" id="doc-list">
        <li data-filter-text="amanda c. armentrout to william f. brand, august 17, 1866 armentrout, amanda c 1866">
          <a href="#text">Amanda C. Armentrout to William F. Brand, August 17, 1866</a> <span class="meta">Armentrout, Amanda C · 1866</span>
        </li>
        <li data-filter-text="angus to kate armentrout, march 3, 1860 angus 1860">
          <a href="#text">Angus to Kate Armentrout, March 3, 1860</a> <span class="meta">Angus · 1860</span>
        </li>
        <li data-filter-text="annie armentrout to kate armentrout, february 20, 1862 trout, annie 1862">
          <a href="#text">Annie Armentrout to Kate Armentrout, February 20, 1862</a> <span class="meta">Trout, Annie · 1862</span>
        </li>
        <li data-filter-text="blair family records booker, james 1923">
          <a href="#text">Blair family records</a> <span class="meta">Booker, James · 1923</span>
        </li>
        <li data-filter-text="brand civil war collection: letter from jane brand to william francis brand brand, jane 1866">
          <a href="#text">Brand Civil War collection: letter from Jane Brand to William Francis Brand</a> <span class="meta">Brand, Jane · 1866</span>
        </li>
        <li data-filter-text="the aeneid virgil 1697">
          <a href="#text">The Aeneid</a> <span class="meta">Virgil · 1697</span>
        </li>
        <li data-filter-text="l’énéide de virgile virgile 1804">
          <a href="#text">L’Énéide de Virgile</a> <span class="meta">Virgile · 1804</span>
        </li>
        <li data-filter-text="notes on the state of virginia jefferson, thomas 1785">
          <a href="#text">Notes on the State of Virginia</a> <span class="meta">Jefferson, Thomas · 1785</span>
        </li>
        <li data-filter-text="letters from an american farmer crèvecœur, j. hector st. john de 1782">
          <a href="#text">Letters from an American Farmer</a> <span class="meta">Crèvecœur, J. Hector St. John de · 1782</span>
        </li>
        <li data-filter-text="the federalist hamilton, alexander 1788">
          <a href="#text">The Federalist</a> <span class="meta">Hamilton, Alexander · 1788</span>
        </li>
        <li data-filter-text="narrative of the life of frederick douglass douglass, frederick 1845">
          <a href="#text">Narrative of the Life of Frederick Douglass</a> <span class="meta">Douglass, Frederick · 1845</span>
        </li>
        <li data-filter-text="incidents in the life of a slave girl jacobs, harriet a. 1861">
          <a href="#text">Incidents in the Life of a Slave Girl</a> <span class="meta">Jacobs, Harriet A. · 1861</span>
        </li>
        <li data-filter-text="the souls of black folk du bois, w. e. b. 1903">
          <a href="#text">The Souls of Black Folk</a> <span class="meta">Du Bois, W. E. B. · 1903</span>
        </li>
        <li data-filter-text="walden thoreau, henry david 1854">
          <a href="#text">Walden</a> <span class="meta">Thoreau, Henry David · 1854</span>
        </li>
        <li data-filter-text="leaves of grass whitman, walt 1855">
          <a href="#text">Leaves of Grass</a> <span class="meta">Whitman, Walt · 1855</span>
        </li>
        <li data-filter-text="the raven poe, edgar allan 1845">
          <a href="#text">The Raven</a> <span class="meta">Poe, Edgar Allan · 1845</span>
        </li>
        <li data-filter-text="tamerlane and other poems poe, edgar allan 1827">
          <a href="#text">Tamerlane and Other Poems</a> <span class="meta">Poe, Edgar Allan · 1827</span>
        </li>
        <li data-filter-text="swallow barn kennedy, john pendleton 1832">
          <a href="#text">Swallow Barn</a> <span class="meta">Kennedy, John Pendleton · 1832</span>
        </li>
        <li data-filter-text="les misérables hugo, victor 1862">
          <a href="#text">Les Misérables</a> <span class="meta">Hugo, Victor · 1862</span>
        </li>
        <li data-filter-text="don quijote de la mancha cervantes saavedra, miguel de 1605">
          <a href="#text">Don Quijote de la Mancha</a> <span class="meta">Cervantes Saavedra, Miguel de · 1605</span>
        </li>
        <li data-filter-text="faust goethe, johann wolfgang von 1808">
          <a href="#text">Faust</a> <span class="meta">Goethe, Johann Wolfgang von · 1808</span>
        </li>
        <li data-filter-text="œuvres complètes de molière molière 1734">
          <a href="#text">Œuvres complètes de Molière</a> <span class="meta">Molière · 1734</span>
        </li>
        <li data-filter-text="pride and prejudice austen, jane 1813">
          <a href="#text">Pride and Prejudice</a> <span class="meta">Austen, Jane · 1813</span>
        </li>
        <li data-filter-text="uncle tom’s cabin stowe, harriet beecher 1852">
          <a href="#text">Uncle Tom’s Cabin</a> <span class="meta">Stowe, Harriet Beecher · 1852</span>
        </li>
      </ol>
      <h2>Letters by decade</h2>
      <uvalib-list-filter
        selector="#by-decade li"
        label="Filter the letters"
        noun="letters"
        singular="letter"
      ></uvalib-list-filter>
      <div id="by-decade">
        <section data-filter-group>
          <h3>1850s</h3>
          <ul>
            <li>Angus to Kate Armentrout, March 4, 1859</li>
          </ul>
        </section>
        <section data-filter-group>
          <h3>1860s</h3>
          <ul>
            <li>Angus to Kate Armentrout, March 3, 1860</li>
            <li>Annie Armentrout to Kate Armentrout, February 8, 1862</li>
            <li>Amanda C. Armentrout to William F. Brand, June 3, 1866</li>
          </ul>
        </section>
        <section data-filter-group>
          <h3>1870s</h3>
          <ul>
            <li>William F. Brand to Amanda C. Brand, May 1, 1871</li>
          </ul>
        </section>
      </div>
    </site-page>`,
        }),
      },
      'styles.css': {
        content: `.doc-list {
  padding-inline-start: 1.5rem;
}
.doc-list li {
  margin-block: 0.25rem;
}
.doc-list .meta {
  color: var(--uva-color-text-muted, #4f4f4f);
}
uvalib-list-filter {
  margin-block: 1rem;
}
`,
      },
    },
  },
  {
    id: 'todays-hours',
    group: 'Hours',
    title: "Today's hours",
    description:
      "site-hours-section shows today's hours for each library, as on the library home page (limited keeps the libraries the home page lists; heading-level=2 because it sits right under the page's h1, and --site-hours-list-min-height keeps the list's height while the hours load so nothing below jumps). Hours come live from LibCal; outside library.virginia.edu the library list must be repointed, so this page sets window.uvalibHoursEndpoints to a snapshot published with this site.",
    files: {
      'index.html': {
        content: page({
          title: "Today's hours",
          components: ['site-hours-section'],
          body: `    <script>
      // On library.virginia.edu nothing is needed. Elsewhere the library list (Drupal's
      // JSON:API, same-origin only) must come from a copy; set this before the components load.
      window.uvalibHoursEndpoints = { libraries: '${CDN_TOKEN}../data/hours-libraries.json' };
    </script>
    <site-page>
      <h1>Library hours</h1>
      <div class="todays-hours">
        <site-hours-section limited heading-level="2"></site-hours-section>
      </div>
    </site-page>`,
          styles: true,
        }),
      },
      'styles.css': {
        content: `.todays-hours {
  max-width: 20rem;
  /* The hours arrive after the page renders: keep the loaded list's height (seven
     libraries) while they load, so the link and footer below do not jump. */
  --site-hours-list-min-height: 12.75rem;
}
`,
      },
    },
  },
  {
    id: 'weekly-hours',
    group: 'Hours',
    title: 'Weekly hours',
    description:
      "library-weekly-hours shows one library's week, with Previous and Next week buttons, as on the /hours page. library-slug picks the library. Hours come live from LibCal; the library list comes from the same snapshot as Today's hours.",
    files: {
      'index.html': {
        content: page({
          title: 'Weekly hours',
          components: ['library-weekly-hours'],
          body: `    <script>
      // On library.virginia.edu nothing is needed. Elsewhere the library list (Drupal's
      // JSON:API, same-origin only) must come from a copy; set this before the components load.
      window.uvalibHoursEndpoints = { libraries: '${CDN_TOKEN}../data/hours-libraries.json' };
    </script>
    <site-page>
      <h1>Clemons Library hours</h1>
      <library-weekly-hours library-slug="clemons"></library-weekly-hours>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'events',
    group: 'Events',
    title: 'Library events',
    description:
      'events-section shows upcoming library events from LibCal as cards (title, date and time, in America/New_York), as on the library home page. limit sets how many; category and query filter them; card headings follow the page’s own headings (h2 here, under the h1; h3 under the home page’s h2), so no heading-level is needed. Events come live from LibCal, which allows any origin. While they load, invisible placeholder cards hold the final height, and styles.css reserves it before the script runs, so nothing below jumps.',
    files: {
      'index.html': {
        content: page({
          title: 'Library events',
          components: ['events-section'],
          body: `    <site-page>
      <h1>Library events</h1>
      <div class="events">
        <events-section limit="8"></events-section>
      </div>
      <p class="events-see-all"><a href="https://cal.lib.virginia.edu/calendar/events">See all Library events</a></p>
    </site-page>`,
          styles: true,
        }),
      },
      'styles.css': {
        content: `/* Before its script runs, reserve the height the eight cards will take, so the link
   and footer below do not jump. The cards are 9rem tall and 2rem apart, in one column,
   two from 40rem wide and four from 75rem: the same container widths the element itself
   uses, measured on this wrapper (which is exactly as wide as the element). */
.events {
  container-type: inline-size;
}
events-section:not(:defined) {
  display: block;
  min-height: 86rem; /* 8 rows */
}
@container (width >= 40rem) {
  events-section:not(:defined) {
    min-height: 42rem; /* 4 rows */
  }
}
@container (width >= 75rem) {
  events-section:not(:defined) {
    min-height: 20rem; /* 2 rows */
  }
}
`,
      },
    },
  },
  {
    id: 'analytics',
    group: 'Analytics',
    title: 'Analytics events',
    description:
      'What the library’s components report to Matomo, shown live: open a main-navigation menu or the phone Menu, pick a theme in the header, follow a header, main-navigation, breadcrumb or footer link, or search, open a result or "See all" (Ctrl- or Cmd-click links to stay here). bento-box reports one site search per section with its total; alerts report an impression per alert shown. This page has no <site-analytics>, so nothing is loaded or sent; on a real site, <site-page matomo-id="N"> or a <site-analytics> element forwards these events to Matomo, and also sends data-uvalib-track="category,action,name" clicks from the page’s own content. They never carry titles, URLs or anything typed but the search, and nothing is sent under Do Not Track, Global Privacy Control, <html data-uvalib-analytics="off"> or inside a no-analytics element.',
    files: {
      'index.html': {
        content: page({
          title: 'Analytics events',
          components: ['bento-box', 'uvalib-breadcrumbs'],
          styles: true,
          head: `
    <link rel="stylesheet" href="${CDN_TOKEN}tokens.css" />
    <script>${COLOR_SCHEME_SNIPPET}</script>`,
          body: `    <site-page color-scheme-switch>
      <uvalib-breadcrumbs slot="breadcrumbs">
        <a href="https://www.library.virginia.edu/">Home</a>
        <span>Analytics events</span>
      </uvalib-breadcrumbs>
      <h1>Analytics events</h1>
      <p>Use the main navigation, the Theme control, a link (Ctrl- or Cmd-click to stay here) or the search below: each event appears here.</p>
      <section class="event-log" aria-labelledby="event-log-title">
        <h2 id="event-log-title">Event log</h2>
        <ol id="event-log" tabindex="0" aria-labelledby="event-log-title"></ol>
      </section>
      <div class="results">
        <bento-box limit="3" boxes="catalog,articles,libguides" query="climate change"></bento-box>
      </div>
    </site-page>
${ANALYTICS_LOG}`,
        }),
      },
      'styles.css': {
        content: ANALYTICS_CSS,
      },
    },
  },
];

/** One example per header variant and rendering mode. */
const headerExamples: Preset[] = (['full', 'vendor'] as const).flatMap((variant) =>
  [false, true].map((light) => {
    const mode = light ? 'no-shadow-dom' : 'shadow DOM';
    const name = variant === 'full' ? 'Full header' : 'Vendor header';
    const attrs = `header-variant="${variant}"${light ? ' no-shadow-dom' : ''}`;
    return {
      id: `header-${variant}-${light ? 'light' : 'shadow'}`,
      group: 'Header',
      title: `${name}, ${mode}`,
      description: `${variant === 'full' ? 'Library sites' : 'Third-party and vendor sites'}, ${
        light
          ? 'rendered into light DOM so the host stylesheet can style the chrome.'
          : 'encapsulated in shadow DOM and styled by the library (the default).'
      }`,
      files: {
        'index.html': {
          content: page({
            title: `${name}, ${mode}`,
            body: `    <site-page ${attrs}>
      <h1>${name}, ${mode}</h1>
      <p>&lt;site-page ${attrs}&gt;</p>
    </site-page>`,
          }),
        },
      },
    };
  }),
);

/** Examples for the search components, in shadow and no-shadow-dom modes. */
const searchExamples: Preset[] = [
  {
    id: 'uvalib-filter',
    title: 'uvalib-filter',
    components: ['uvalib-filter'],
    body: (attrs: string) => `      <uvalib-filter id="el" ${attrs} limit="3"></uvalib-filter>
    </site-page>
    <script type="module">
      await customElements.whenDefined('uvalib-filter');
      document.querySelector('#el').filter = {
        name: 'locations',
        title: 'Locations',
        position: 0,
        buckets: ['Charlottesville', 'Richmond', 'Washington', 'Norfolk', 'Roanoke'].map(
          (key, i) => ({ key, doc_count: 30 - i * 5, selected: false }),
        ),
      };
    </script>`,
    description:
      'A checkbox facet; "See more" appears when limit is smaller than the bucket count.',
  },
  {
    id: 'uvalib-date-range',
    title: 'uvalib-date-range',
    components: ['uvalib-date-range'],
    body: (attrs: string) =>
      `      <uvalib-date-range ${attrs} min="1819-01-01" max="2026-12-31"></uvalib-date-range>
    </site-page>`,
    description: 'A year slider plus date inputs; min and max are required.',
  },
  {
    id: 'uvalib-date-histogram',
    title: 'uvalib-date-histogram',
    components: ['uvalib-date-histogram'],
    body: (attrs: string) =>
      `      <uvalib-date-histogram ${attrs} unit="photos" label="Photos by date">
        <table>
          <caption>Photos by month</caption>
          <tr><th>Month</th><th>Photos</th></tr>
          <tr><td>2015-09</td><td>1,204</td></tr>
          <tr><td>2015-10</td><td>5,311</td></tr>
          <tr><td>2015-11</td><td>842</td></tr>
        </table>
      </uvalib-date-histogram>
    </site-page>`,
    description:
      'Monthly bars from a child table (the no-JS fallback). A month with no count is still a gap. Show as table opens the same counts.',
  },
].flatMap(({ id, title, components, body, description }) =>
  [false, true].map((light) => ({
    id: `${id}-${light ? 'light' : 'shadow'}`,
    group: 'Search',
    title: `${title}, ${light ? 'no-shadow-dom' : 'shadow DOM'}`,
    description: `${description} ${
      light
        ? 'Rendered into light DOM so the host stylesheet can style it.'
        : 'Encapsulated in shadow DOM (the default).'
    }`,
    files: {
      'index.html': {
        content: page({
          title: `${title}, ${light ? 'no-shadow-dom' : 'shadow DOM'}`,
          components,
          body: `    <site-page>\n      <h1>${title}</h1>\n${body(light ? 'no-shadow-dom' : '')}`,
        }),
      },
    },
  })),
);

/** Every example in menu order: grouped by GROUPS, in source order within a group. */
export const examples: Preset[] = GROUPS.flatMap((group) =>
  [...presets, ...headerExamples, ...searchExamples].filter((p) => p.group === group),
);

/** A copy of `preset` with every `{{CDN}}` token replaced by `cdnBase`. */
export function withCdnBase(preset: Preset, cdnBase: string): Preset {
  return {
    ...preset,
    files: Object.fromEntries(
      Object.entries(preset.files).map(([name, file]) => [
        name,
        { ...file, content: file.content.split(CDN_TOKEN).join(cdnBase) },
      ]),
    ),
  };
}

/**
 * The site's own copy of the CDN build, as an absolute URL: previews run on the sandbox
 * origin, so a relative URL would resolve there instead.
 */
export function cdnBase(): string {
  return new URL('cdn/', location.href).href;
}
