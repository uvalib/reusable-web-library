# Changelog

## v1.8.1 — 2026-11-22

### Fixes

- a metric-matched fallback for Franklin Gothic URW (issue #32)

### Other

- Merge branch 'fix/font-fallback': a metric-matched fallback for Franklin Gothic (issue #32)
- a longer debounce for the typing-fast step

## v1.8.0 — 2026-11-22

### Features

- text-wrap balance on short headings, pretty on longer text
- container queries for the toolbar, result list and photo grid; text-wrap in base.css
- custom states for the filter drawer, lightbox and tag list; CSS states in the reference
- the popup in the top layer, anchored to the field, where supported
- data-version, a link's starting version, issue #31

### Fixes

- a version's frame may start left of or above it (crops), issue #30

### Other

- Merge branch 'integrate/modern-web': combobox top layer, custom states, container queries, text-wrap, ES2024
- ES2024 lib; toSorted and Promise.withResolvers for the copy-sorts and the ready deferred
- Merge branch 'feat/container-queries-text-wrap' into integrate/modern-web
- Merge branch 'feat/combobox-top-layer-states' into integrate/modern-web
- Merge branch 'fix/version-frame-start': crop frames (#30), a link's starting version (#31)
- uvalib-lightbox.js budget to about 12% over its measured size

## v1.7.0 — 2026-11-22

### Features

- details stay in the page; open(), close() and open/close events (issues #27, #26)
- versions with a different framing: frame says where the original sits (issue #28)

### Other

- Merge branch 'integrate/lightbox-1.7': lightbox open()/close() and events (#26), details kept in the page (#27), version framing (#28), React docs (#29)
- Merge branch 'feat/version-framing' into integrate/lightbox-1.7
- Merge branch 'feat/lightbox-api-details' into integrate/lightbox-1.7

## v1.6.0 — 2026-11-22

### Features

- versions of an image compared over the photo: switch, reveal, fade (issue #25)

### Fixes

- changing the comparison mode never moves the photo
- version-param without parsing the URL (an iframe srcdoc), analytics catalogue entry (issue #25)

### Other

- Merge branch 'feat/lightbox-versions': image versions compared in the lightbox (issue #25)

## v1.5.0 — 2026-11-21

### Features

- a cancelable activate event when an outline is clicked (issue #24)

### Other

- Merge branch 'feat/regions-activate': image-regions activate event (issue #24)

## v1.4.0 — 2026-11-21

### Features

- group markers whose targets would overlap; zoom or ring to part them
- data-regions-list lends the page's own region list to the viewer (issue #22)

### Fixes

- group only markers that would overlap, not ones within 24px

### Other

- Merge branch 'integrate/addison-followups': lightbox page region lists (#22), map marker groups (#23)
- Merge branch 'feat/map-colocated' into integrate/addison-followups
- Merge branch 'feat/lightbox-regions-list' into integrate/addison-followups
- no this-alias in lendList (issue #22)

## v1.3.0 — 2026-11-21

### Features

- uvalib-back-to-top, shown once the top of the page scrolls away (issue #14)
- shorten long value lists with list-limit / data-limit (issue #16)
- uvalib-filter-drawer, a sidebar on wide screens and a modal panel on narrow ones (issue #12)
- headings-from builds the list from a document's headings (issue #15)
- a description under the chips, tied to the group (issue #11)
- data-return-from links a step back to the search the visitor came from (issue #17)
- print styles that leave out the chrome, issue #20
- results list rows and the highlight role tokens, issue #13
- .uvalib-message inline messages, issue #8
- ship the strict axe setup and a Matomo stub as @uvalib/web-components/testing
- granularity="decade" and "auto" for long spans
- downloads="event" counts downloads without their URLs
- createSearchTracker for settled site searches in a page's own search UI
- number badges above their outline, inside at the top edge
- add <uvalib-map>, a map of places over the page's Leaflet with a linked list
- a wrapping flex layout that base.css gives the children before upgrade
- regions on the open image (data-regions or a regions callback)
- add <uvalib-image-regions>, an image with region outlines and their list
- an optional colour swatch per chip, for a colour key (issue #6)
- load-more without a known total, and has-more (issue #4)
- add <uvalib-combobox>, an editable combobox with list autocomplete

### Fixes

- hold the filter drawer's button on phones before it upgrades
- hidden hides every component's host once upgraded, in every mode
- hidden hides every base.css class, issue #7
- follow a linked date range set in script; never write a rounded value back
- fit the places as closely as the markers allow, in half zoom steps
- document the label default and image-height
- a scrolling list passes axe's scrollable-region-focusable

### Other

- Merge branch 'integrate/bov-issues': BOV requests #7-#21, hidden on every component, Lighthouse harness
- raise the performance floor to 0.95
- serve text compressed, as the CDN and GitHub Pages do
- step through the examples in equal parts of at most 40
- size budgets after the BOV issues merge
- lockfile for the optional @axe-core/playwright peer dependency
- Merge branch 'feat/filter-drawer-back-to-top' into integrate/bov-issues
- Merge branch 'feat/breadcrumbs-contents' into integrate/bov-issues
- Merge branch 'feat/chip-desc-metadata-limit' into integrate/bov-issues
- Merge branch 'feat/analytics-testing' into integrate/bov-issues
- Merge branch 'feat/histogram-decades' into integrate/bov-issues
- Merge branch 'fix/styles-batch' into integrate/bov-issues
- prettier for the filter drawer and back-to-top sources and tests
- filter-drawer and back-to-top examples, analytics catalogue entries and size budgets (issues #12, #14)
- register uvalib-filter-drawer and uvalib-back-to-top (vite, manifest, exports, index)
- raise the uvalib-breadcrumbs.js and uvalib-contents.js budgets (issues #17, #15)
- size budgets for analytics.js and the larger site-analytics.js
- Merge branch 'integrate/issues': pager without a total (#4), chip swatches (#6), image regions (#2), map (#1)
- step through the examples in halves, each on a fresh page
- a 20s timeout, as mounting a document is slow in the full parallel run
- allow a 2px rounding difference in the search-results height check
- raise the site-page.js and site-style.js budgets for the merged base styles
- raise the uvalib-pager.js budget to about 12% over its size with has-more
- Merge branch 'feat/uvalib-map' into integrate/issues
- Merge branch 'feat/image-regions' into integrate/issues
- Merge branch 'feat/chip-swatches' into integrate/issues
- Merge branch 'feat/pager-unknown-total' into integrate/issues
- record uvalib-map.js at 18,009 B with the opening-view fit
- audit the real map: a local Leaflet copy and stub tiles
- load only leaflet.js in the Maps example; the element needs no Leaflet CSS
- add a Maps example, places on Grounds over Leaflet from unpkg
- size-budget notes with the final image-regions and lightbox sizes
- add an Image regions example (a Holsinger photograph, with the lightbox option)
- add uvalib-map to the analytics catalogue
- register uvalib-map, its size budget and base.css pre-upgrade rule
- leaflet as an optional peer dependency, and a dev dependency for tests and examples
- add uvalib-image-regions to the analytics catalogue
- raise the site-page.js budget for the image-regions pre-upgrade rules in base styles
- register uvalib-image-regions and its size budget
- the Chips example has a fifth group, the colour key
- a colour-keyed category set in the Chips example
- set the swatch colour in updated(), without styleMap
- add a Load more example with an unknown total and has-more
- Merge branch 'feat/combobox': <uvalib-combobox> (issue #5)
- add a Combobox example with person and subject pickers
- add uvalib-combobox to the analytics catalogue
- the combobox holds its label and field before it upgrades
- register uvalib-combobox, its size budget and base.css pre-upgrade rule

## v1.2.0 — 2026-11-20

### Features

- publish test results with the examples site, with README badges
- load-more mode
- thumbnail badges
- circle media and actions slot
- register the element in the package and CDN build
- add the bar chart for date counts
- add uvalib-tabs
- hold uvalib-chip-group's row before it upgrades
- Results toolbar & badges example
- a Chips example with a year rail, a sort toggle, filters and suggestions
- a results summary with a debounced polite announcement
- a labelled, wrapping list of keyword links or plain tags
- badges, a results toolbar, an empty state and loading skeletons
- segmented controls, filter chips and suggestion chips

### Fixes

- describe the person-card portraits in their alt
- keep selection stable and reserve the tab row
- read the badge after the caption
- focus the new load-more item
- center circle avatars in shadow
- correct focus, selection, sync, and parsing
- keep the table caption to its label
- review round — focus, disabled, history, links, overflow
- source children, lang/dir and inline copies, 2rem targets, positional analytics names
- re-announce a recurring count; No … for 0 shown; blank attributes unset
- hidden hides the results classes; phone toolbar wins; opaque count badge in forced colors
- keep the toggle's words on one line in its text
- edge fades for the scrolling row, a one-row segmented bar
- real Library images in the photo grid, page images and photo card examples

### Other

- poll for the two-second reveal instead of a fixed wait
- Merge branch 'feat/report-split'
- deploy as soon as the tests pass, then again with Lighthouse
- Merge branch 'feat/test-report'
- give the full-page axe suites 20s under a parallel run
- Merge branch 'integrate/addison2': chips, results bar, date histogram, tabs and card extras
- open a fresh page for the 390px menu test
- Merge branch 'feat/tabs-card-extras' into integrate/addison2
- Merge branch 'feat/date-histogram' into integrate/addison2
- Merge branch 'feat/badges-results' into integrate/addison2
- Merge branch 'feat/chip-group'
- register the chip group
- register uvalib-tag-list and uvalib-results-count
- Merge branch 'fix/example-images'

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
