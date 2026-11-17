// The site's examples, grouped by component for its menu. Pages follow the snippets in
// skills/uvalib-web-components (SKILL.md and reference/snippets.md), so the playground
// teaches the same patterns as the agent skill. `{{CDN}}` is replaced at runtime with the
// absolute URL of the site's own copy of the CDN build (see withCdnBase).

/** The menu's groups, in order: one per component. */
export const GROUPS = ['Page', 'Header', 'Alerts', 'Search', 'Hours', 'Events'] as const;
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
      'site-page shows live UVA Library alerts by default: a banner in the header and the alert list and regional alerts at the top of main. Staging deployments use alerts-env="staging"; an app that renders alerts itself sets no-alerts.',
    files: {
      'index.html': {
        content: page({
          title: 'Library alerts',
          body: `    <!-- Production alerts are the default. Staging sites use alerts-env="staging";
         an app that shows alerts itself uses <site-page no-alerts>. -->
    <site-page alerts-env="staging">
      <h1>Library alerts</h1>
      <p>Current staging alerts appear in the header and above this heading. Without alerts nothing is shown.</p>
    </site-page>`,
        }),
      },
    },
  },
  {
    id: 'search-facets',
    group: 'Search',
    title: 'Search facets',
    description:
      'uvalib-filter (checkbox facet with scope chips and a limit) and uvalib-date-range (year slider plus date inputs). Both are controlled: set their properties from your search state and listen for filter-change, scope-change and date-range-change.',
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
