# Changelog

## v1.1.1 — 2026-11-19

### Features

- request components, features and fixes through GitHub issues

### Other

- Merge branch 'feat/skill-issue-requests'
- Merge branch 'docs/skill-prompts'

## v1.1.0 — 2026-11-19

### Features

- a Pagefind search example on a demo index
- pagefind.css, a library theme for Pagefind's search UI, and <uvalib-pagefind-search>
- Images examples for the photo grid and page images
- justified rows of real thumbnail links
- an accessible dialog image viewer over plain links
- add uvalib-contents and uvalib-metadata
- library buttons, toggles and search forms for host content
- site-name and site-name-href, also on site-page
- add uvalib-card, uvalib-card-grid and uvalib-pager
- events, hours, filter, date range and bento report actions and failures
- the page chrome reports its links, the Menu and the skip link
- privacy signals, data-uvalib-track, spa="auto", download types
- one opt-out helper for every track* helper, names capped, trackError
- Information alerts stay listed until closed, as on library.virginia.edu
- the alerts example describes <site-alerts>
- report impressions, dismissals, link clicks and load errors
- trackContent and content impressions in <site-analytics>
- show alerts with <site-alerts>; dark alert role tokens
- the library's alerts UI on a shared headless <uvalib-alerts>
- test at least as strictly as Lighthouse; accessibility-first skill
- Breadcrumbs examples, in site-page and from JavaScript
- a breadcrumbs slot between the header and <main>
- a breadcrumb trail at body size

### Fixes

- the Analytics example's log appends entries, so it never shifts the page
- review round — details restore, history, images, and names
- review fixes
- forced-colors outlines for tags and loading results; hold the field's height
- audit and serve the Pagefind example outside the built site
- keep searching where the URL cannot change
- real component tags, disabled, pressed and forced-colors states, dark tokens
- the site name moves under the logo when the links would not fit
- query-aware matching, valid author marks, lang, dir and inline markup
- unsafe links as text, one size, fresh copies, lang and dir
- never adopt an element's own later output
- match hash-only links against the page URL
- keep grid children, name card links, and honor color tokens
- review round — replaceState is never a page view; live privacy checks
- the page's off switch stops page views too
- a moved element keeps the shared headless source; no stale focus move
- review round — safe hrefs, SPA navigate event, list semantics
- library.virginia.edu's link colour; no flash before upgrade

### Performance

- the shared state in its own module; budgets for the reporting components

### Other

- Merge branch 'feat/lightbox' into integrate/etext
- Merge branch 'feat/pagefind-theme'
- Pagefind theme and element against a real index built at test start
- add pagefind 1.5.2 as a devDependency for the search theme's test index
- register the lightbox and the photo grid
- Merge branch 'feat/site-name-buttons'
- Merge branch 'feat/contents-metadata' into integrate/etext
- Merge branch 'feat/cards-pager'
- Merge branch 'feat/analytics-v2'
- alerts follow the opt-outs (no-analytics, the page's off switch)
- Merge branch 'feat/site-alerts'
- register site-alerts.js, budgets, reference
- cancel the modified-click check so CI's page never navigates
- Merge branch 'feat/a11y-testing'
- Merge branch 'feat/breadcrumbs'
- register uvalib-breadcrumbs.js, budget, reference

## v1.0.1 — 2026-11-17

### Fixes

- one-line titles sit right above their author

### Other

- Merge branch 'release/1.0.1'

## v1.0.0 — 2026-11-17

### Features

- Analytics example, a live log of the components' events
- matomo-id (and matomo-url) adds one <site-analytics>
- bento-box, main nav and header report to analytics
- one tracker per page through _paq, and <uvalib-analytics>
- Search results example (bento-box) in the Search group
- migrate <bento-box> and its four sections from bento-box
- search data module, fixtures and test intercept
- infer the week heading's level from the page
- infer the heading level from the page
- Events example in a new Events group
- migrate <events-section> from bento-box
- LibCal events data module, fixtures and test intercept
- dogfood dark mode on the examples page
- the examples menu is the header's main navigation
- Dark mode playground example, audited by Lighthouse CI as System and as Dark
- opt-in dark mode with a Light / Dark / System control
- dark-mode role tokens, with light mode unchanged
- forward no-main-nav, main-nav-label, main-nav-src and the main-nav slot
- show the library main navigation by default
- <site-main-nav> with a bundled snapshot of the library main menu
- version-stamp installs and add install-skill --check
- one examples page with a grouped menu beside a single editor
- group the examples by component and drop Preset.height
- put the alert list in a full-bleed band above <main>
- make the alerts row full-bleed at the top of <header>
- add a Library hours playground preset
- home-page today's hours on the shared data module
- upgrade Drupal's hours placeholders on connect
- weekly hours table on the shared data module
- shared hours data module with test fixtures and routing
- add a Library alerts playground preset
- show live UVA Library alerts by default
- add an alerts slot inside <header>
- add no-footer and leave the footer off the playground
- wrap the playground pages in site-page with site links
- let a site override the utility links with its own site links
- add uvalib-filter and uvalib-date-range search components
- playground site with playground-elements and GitHub Pages workflow
- agent skill for using the components, generated reference, install-skill bin
- port site-page and site-style with single main landmark and light-DOM content handling
- port site-footer with current address, live year, absolute links
- port site-header with accessible utility nav, popover menu, vendor variant
- port site-analytics and site registry
- add UvalibElement base with once-per-document light-DOM styles
- add design tokens synced from Drupal theme and shared styles

### Fixes

- keep early analytics events while site-analytics loads; defer to an existing element
- a reload for the same query is not a new site search
- no global Window._paq declaration in the types
- keep a subject guide's byline line when it has no author
- review round — reload after a mid-load move, escape braces, Label in Name
- events example uses heading-level=2 under its h1
- styled time line keeps two lines; align reservations
- refetch events after an hour; keep override URLs whole
- one card row on error; Retry keeps keyboard focus
- keep the Drupal card geometry with h3 titles
- no layout shift before <site-page> upgrades (link base.css in <head>)
- keep the status line one line tall
- hold the table's height while the hours load
- support hash-routed single-page apps
- keep components inert while dark mode is off
- readable pre-footer links, input text and palette grey in Light
- keep the Theme control on the utility row with long site links
- own the root scheme together, clean up a stray one, and keep the header markup byte-identical
- the site's own content keeps the page's colour scheme
- keep the Theme legend below the Menu popover's rule
- keep the list's height while the hours load
- add heading-level so the section fits under a page h1
- deterministic output and stricter parsing
- raw no-main-nav markup identical to main; main-nav-current
- focus contrast, forced colors, state after changes, SPA current page
- scroll the example menu to the current example
- show the weekly hours table in the gallery
- no midnight flash, per-library info nodes, quieter errors
- recoverable errors, no flash, quieter announcements
- fetch timeout, URL-keyed caches, pre-define endpoint override
- never re-request an alerts URL that already failed
- retry failed alert loads, normalise alerts-src, respect a page's own build
- lay the header out as a grid so the logo row never wraps
- size the playground IDE from its measured top
- give the logo img width and height to stop layout shift
- ignore site links with no text
- restore focus when a uvalib-filter control moves; unstick stacked date-range thumbs
- keep uvalib-filter expansion and focus across filter updates; review fixes
- keep tokens layered, document base-style trade-off, fix publish-cdn flake
- unlayered page-level base styles; skip link inside header landmark (shadow)
- alias sync no longer deletes; first release must be major
- centre footer columns, lint scripts, ignore baseline capture dirs
- restore old page padding, header link colour/offset, footer icon sizes and italic address
- bound share-link decoding, shared page probe, test robustness
- wire push-failure recovery hint into release via runCommands
- export header and footer parts from site-page, run analytics snippet safely, split skill snippets
- keep header define in the CDN site-page entry
- keep SitePage side-effect free and move header/footer imports to the define file
- adopt late pre-footer children in light mode and strip svg ids
- drop unused firstUpdated parameter
- gate anchor() behind @supports and flatten menu wrapper nav
- keep vendor link visible on mobile and anchor popover menu to toggle
- siteLink schemes and site-analytics listener cleanup
- drop unused eslint directives
- silence lint for ported analytics code
- scope and layer light-DOM styles, make installer realm-safe

### Other

- Merge branch 'feat/uvalib-analytics'
- register uvalib-analytics.js, budgets, reference
- Merge branch 'feat/bento-box'
- axe and contrast in a whole page, light and dark
- register bento-box.js and regenerate the reference
- one smaller fetchJson for JSON and text
- all-day and multi-day in Tokyo too; forced colors
- axe and contrast in a whole page, light and dark
- move fetchJson and the New York date helpers to src/data
- include the hidden .lighthouseci folder in the failure artifact
- keep the Lighthouse reports when the Lighthouse job fails
- let Lighthouse's Chrome keep its sandbox on Ubuntu 24.04 runners
- run Lighthouse on pushes to main and on demand
- Lighthouse CI over a standalone page per playground example
- gzip size budgets for every CDN entry
- audit uvalib-filter, uvalib-date-range and the header menu in use
- fail axe runs on every impact level and audit whole pages
- alerts stacking with the main nav; history checks via the Navigation API
- keep agent worktrees under .claude/ out of lint and git
- register site-main-nav as a CDN and npm entry, export SiteMainNav
- update the header snapshot for the default main navigation
- type the alert show values instead of an unused array
- give browser tests a 5s default timeout
- real hours in the 2027-03-07 fixture week
- register the three hours entries
- New York and Tokyo time-zone runs at day and DST edges
- block service workers in test browsers and stub alerts in baselines
- add the alerts slot to the shadow header snapshots
- route the alerts CDN to a local stub in every browser context
- make page-probe errors name their URL and skip third-party blips
- assert the vendor header matches main's markup with site links
- use the image's n in the release build (standard:7.0 already ships it)
- capture npm view stdout and stderr separately in release skip-check
- split npm release into verify and publish jobs and drop manual dispatch
- drop npm publishing and the SSM token from the CDN release build
- publish npm from GitHub Actions with trusted publishing
- check for repo tokens before any install-phase code runs
- fail closed on injected repo tokens and document the npm token exposure
- move releases to the Terraform CodePipeline and PR CI to GitHub Actions
- bump Pages workflow actions to Node 24 majors
- left-edge stacked thumbs drag
- drop stale BOV baseline axe/meta; controlled A/B replaces it
- add compare-baseline script (pixelmatch) and --node-fetch capture flag
- guard empty builds, release only tags on main, pin n, push-failure hint
- split CI/release projects, create-only resumable CDN publish, annotated release tag
- release script, CodeBuild buildspec, CloudFormation template
- CDN build with shared chunks and manifest.json
- npm package exports, css emit, custom-elements manifest
- scaffold project and capture BOV baseline
