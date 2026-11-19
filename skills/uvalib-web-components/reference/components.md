# Component reference

<!-- Generated from dist/custom-elements.json by scripts/gen-reference.mjs. Do not edit by hand. -->

## `<articles-section>`

Virgo's first article results for `query`. Articles Virgo hides from guests keep their link, under a neutral title ("Article details available after signing in to Virgo").

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | `''` | The search text. Empty: nothing is fetched and the section is `empty`. |
| `limit` | `number` | `5` | How many results to show (at most). |
| `no-result-describe` | `string` | `'No results found.'` | The message shown when nothing is found. |
| `heading-level` | `number \| undefined` |  | The level of the section's heading, 1 to 6. Unset (the default), it is one below the nearest heading before the element in the page, or 3 when there is none. `<bento-box>` sets it one below its own heading. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Events

| Event | Description |
|---|---|
| `bento-state` | Whenever `state` changes (bubbles, composed); `<bento-box>` listens to announce "Results updated" once every section has settled. |
| `uvalib-analytics-search` | For `<site-analytics>`: once per settled search (results or none, not an error): the query, the section's `analyticsName` as category and its total when known. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['bento-box', 'result-click', <section>, <1-based position>]` or `['bento-box', 'see-all-click', <section>]`; `['bento-box', 'retry', <section>]` for its Retry button; `['bento-box', 'error', 'section-load: <section>']` once when its results cannot be loaded; never titles or URLs. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-text` |  | Dark-mode role token: text (else #2b2b2b). |
| `--uva-color-link` |  | Dark-mode role token: titles, links and buttons (else `--uva-brand-blue`). |
| `--uva-color-border` |  | Dark-mode role token: the block's border and entry rules (else #dadada). |
| `--uva-color-surface-raised` |  | Dark-mode role token: background (else #fff). |
| `--uva-color-surface-hover` |  | Dark-mode role token: the header band (else #dadada). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

## `<bento-box>`

The library's search results page (library.virginia.edu/search): a search bar and, for the query, a grid of result sections from Virgo's catalog and articles, the subject guides and the library website. The query comes from the page URL (`?q=`, or the old `?query=`), else the `query` attribute; searching pushes `?q=` to the history, and Back and Forward restore the query. With no query only the search bar shows and nothing is fetched. Light DOM output keeps the classes the Drupal theme styles under `.uvalib-bento-search`. Registers `catalog-section`, `articles-section`, `libguides-section` and `website-section`.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | `''` | The search text when the page URL has none (`?q=` or `?query=` win). |
| `limit` | `number` | `5` | How many results each section shows (at most). |
| `search-describe` | `string` | `'This page searches Virgo, Virgo articles, subject guides, and the Library website.'` | The line under the search bar. |
| `no-result-describe` | `string` | `'No results found.'` | What a section says when it finds nothing. |
| `placeholder` | `string` | `'Search anything...'` | The search input's placeholder. |
| `boxes` | `BentoBoxName[]` | `['catalog', 'articles', 'libguides', 'website']` | The sections, in order: `catalog`, `articles`, `libguides`, `website`, as a comma list (`boxes="catalog,articles"`) or a JSON array. Default: all four. |
| `heading-level` | `number \| undefined` |  | The level of the "You searched for" heading, 1 to 6; the sections' headings are one below. Unset (the default), it is one below the nearest heading before the element in the page (the page's `<h1>` gives `<h2>`, then `<h3>` sections), or 2 when there is none. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-text` |  | Dark-mode role token: text (else #2b2b2b). |
| `--uva-color-control-border` |  | Dark-mode role token: the search input's border (else #808080). |
| `--uva-color-input-text` |  | Dark-mode role token: the search input's text (else #1f2937). |
| `--uva-color-surface-raised` |  | Dark-mode role token: the search input's background (else #fff). |
| `--uva-color-accent-bg` |  | Dark-mode role token: the search button (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Dark-mode role token: the search button's icon (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

## `<catalog-section>`

The Virgo catalog's first results for `query` (books, journals, archives, maps, music, theses, videos…). A work with several editions shows once, noting how many.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | `''` | The search text. Empty: nothing is fetched and the section is `empty`. |
| `limit` | `number` | `5` | How many results to show (at most). |
| `no-result-describe` | `string` | `'No results found.'` | The message shown when nothing is found. |
| `heading-level` | `number \| undefined` |  | The level of the section's heading, 1 to 6. Unset (the default), it is one below the nearest heading before the element in the page, or 3 when there is none. `<bento-box>` sets it one below its own heading. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Events

| Event | Description |
|---|---|
| `bento-state` | Whenever `state` changes (bubbles, composed); `<bento-box>` listens to announce "Results updated" once every section has settled. |
| `uvalib-analytics-search` | For `<site-analytics>`: once per settled search (results or none, not an error): the query, the section's `analyticsName` as category and its total when known. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['bento-box', 'result-click', <section>, <1-based position>]` or `['bento-box', 'see-all-click', <section>]`; `['bento-box', 'retry', <section>]` for its Retry button; `['bento-box', 'error', 'section-load: <section>']` once when its results cannot be loaded; never titles or URLs. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-text` |  | Dark-mode role token: text (else #2b2b2b). |
| `--uva-color-link` |  | Dark-mode role token: titles, links and buttons (else `--uva-brand-blue`). |
| `--uva-color-border` |  | Dark-mode role token: the block's border and entry rules (else #dadada). |
| `--uva-color-surface-raised` |  | Dark-mode role token: background (else #fff). |
| `--uva-color-surface-hover` |  | Dark-mode role token: the header band (else #dadada). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

## `<events-section>`

Upcoming UVA Library events from LibCal, as on the library.virginia.edu home page: a grid of cards, each one link with the event's title, a date column (month, day, weekday) and its time, in America/New_York. Events that have ended are left out. Light DOM output keeps the classes the Drupal theme styles (`event-container`, `event`, `event-url`, `event-title`, `event-date`, `event--month`, `event--day`, `event--wkday`, `event-time`).

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `limit` | `number` | `8` | How many events to show (at most; fewer when fewer are coming up). |
| `category` | `string \| undefined` |  | Only events in this LibCal category (its id, for example `38740`; several comma-separated). |
| `query` | `string \| undefined` |  | Only events matching this search text (LibCal's event search). |
| `max-title-length` | `number \| undefined` |  | Cut titles longer than this many characters, with "…", for sighted users; assistive technology still gets the whole title. Titles are clamped to three lines anyway, so this is only kept for old pages. |
| `heading-level` | `number \| undefined` |  | The level of each event's title heading, 1 to 6. Unset (the default), it is one below the nearest heading before the element in the page (an `<h2>` above gives `<h3>` titles), or 3 when there is none. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: a click on an event, `['events-section', 'event-click', <category id, or all>, <position, from 1>]` (never its title or URL), and `['events-section', 'error', 'events-load']` once when the events cannot be loaded. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--events-section-min-height` | `0` | Height the element keeps during its first load (while it has the `loading` attribute). Its placeholder cards already hold the final height; this only matters for a page that wants more. Applies with `no-style` too. Pages can reserve height before the element upgrades with `events-section:not(:defined) { display: block; min-height: … }`. |
| `--uva-brand-orange-dark` | `#b35900` | Background of the date column (white text on it is 4.8:1). |
| `--uva-brand-blue` | `#232d4b` | Event title colour. |
| `--uva-color-link` |  | Dark-mode role token: event title colour (else `--uva-brand-blue`). |
| `--uva-color-text` |  | Dark-mode role token: time and status text (else #2b2b2b). |
| `--uva-color-border` |  | Dark-mode role token: card border (else #dadada). |
| `--uva-color-surface-raised` |  | Dark-mode role token: card and button background (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

## `<libguides-section>`

The first subject guide pages (LibGuides) matching `query`: the page and its guide, then its author and subjects and the matching text. Only text and links are taken from Springshare's HTML.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | `''` | The search text. Empty: nothing is fetched and the section is `empty`. |
| `limit` | `number` | `5` | How many results to show (at most). |
| `no-result-describe` | `string` | `'No results found.'` | The message shown when nothing is found. |
| `heading-level` | `number \| undefined` |  | The level of the section's heading, 1 to 6. Unset (the default), it is one below the nearest heading before the element in the page, or 3 when there is none. `<bento-box>` sets it one below its own heading. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Events

| Event | Description |
|---|---|
| `bento-state` | Whenever `state` changes (bubbles, composed); `<bento-box>` listens to announce "Results updated" once every section has settled. |
| `uvalib-analytics-search` | For `<site-analytics>`: once per settled search (results or none, not an error): the query, the section's `analyticsName` as category and its total when known. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['bento-box', 'result-click', <section>, <1-based position>]` or `['bento-box', 'see-all-click', <section>]`; `['bento-box', 'retry', <section>]` for its Retry button; `['bento-box', 'error', 'section-load: <section>']` once when its results cannot be loaded; never titles or URLs. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-text` |  | Dark-mode role token: text (else #2b2b2b). |
| `--uva-color-link` |  | Dark-mode role token: titles, links and buttons (else `--uva-brand-blue`). |
| `--uva-color-border` |  | Dark-mode role token: the block's border and entry rules (else #dadada). |
| `--uva-color-surface-raised` |  | Dark-mode role token: background (else #fff). |
| `--uva-color-surface-hover` |  | Dark-mode role token: the header band (else #dadada). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

## `<library-hours-setup>`

Upgrades Drupal's hours placeholders. On library.virginia.edu/hours Drupal renders `<div type="library-weekly-hours" library-slug="…" no-shadow-dom no-style>` for each library; this element replaces each one, in its own root node (the document or a shadow root), with a `<library-weekly-hours>` that has the same attributes (except `type`) and children. `library-slug="harrison"` also gets `hide-building-hours`. Placeholders added later are upgraded too, while this element is connected. It renders nothing.

## `<library-weekly-hours>`

One library's opening hours for a week (Sunday to Saturday, in America/New_York): a header with "Previous week" / "Next week" buttons and the date range, then a table with a "Building hours" row and a row per space in the library. Data comes from the library website's JSON:API (same origin) and LibCal, shared between all hours elements on a page. Used on library.virginia.edu/hours through `<library-hours-setup>`.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `library-slug` | `string \| undefined` |  | The library's `field_slug` in Drupal (for example `clemons`). |
| `week-count` | `number` | `0` | Which week to show: 0 is this week, 1 next week, -1 last week. Changed by the buttons. |
| `refresh-every` | `number` | `600000` | How often (ms) the current week's hours are fetched again. 0 turns it off. |
| `hide-building-hours` | `boolean` | `false` | Hide the "Building hours" row (for a library whose building calendar is one of its spaces). |
| `heading-level` | `number \| undefined` |  | `aria-level` (1–6) of the week heading, also its `heading-h<n>` class. Unset (the default), the level is one below the nearest heading before the element in the page (`aria-level` 3 under a library's `<h2>` on /hours), or 2 when there is none, and the class stays `heading-h2`, the one the library website's CSS styles. |
| `headinglevelstart` | `number \| undefined` |  | Old name of `heading-level`, still accepted; `heading-level` wins. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### CSS parts

| Part | Description |
|---|---|
| `building-hours` | The "Building hours" table row (shadow mode). |

### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: `['library-weekly-hours', 'week-change', 'next' \| 'previous']` for the week buttons, and `['library-weekly-hours', 'error', 'hours-load']` once when the hours cannot be loaded. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--library-weekly-hours-min-height` | `0` | Height the element keeps during its first load (while it has the `loading` attribute, before any rows show), so content below does not jump when the hours arrive. Applies with `no-style` too. Pages can reserve the same height before the element upgrades with `library-weekly-hours:not(:defined) { display: block; min-height: … }`. |
| `--uva-brand-orange` | `#e57200` | Border of today's column; focus ring colour. |
| `--uva-brand-blue` | `#232d4b` | Header and button colour. |
| `--uva-color-border` |  | Dark-mode role token: table cell borders (else #dadada). |
| `--uva-color-current` |  | Dark-mode role token: today's column border (else `--uva-brand-orange`). |
| `--uva-color-link` |  | Dark-mode role token: heading, button text and border (else `--uva-brand-blue`). |
| `--uva-color-surface-raised` |  | Dark-mode role token: button background (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

## `<site-alerts>`

Live UVA Library alerts, drawn as library.virginia.edu draws them. The alerts project (github.com/uvalib/uvalib-alerts) keeps the data: a headless `<uvalib-alerts>` loaded at runtime from the alerts CDN (`alerts-env`, or `alerts-src`), one per document, shared by every `<site-alerts>` and created hidden at the end of `<body>`. It keeps the live connection, the dismissals (per site, synced across tabs) and the regional matching (the page URL, followed through single-page-app navigation). If its script fails to load, one console warning is logged and nothing is shown. `show` picks the alerts: `header` (the banner: a polite `role="status"` row on teal), `list` (critical, warning and information alerts, most severe first; only critical ones are an assertive `role="alert"`), `regional` (alerts targeted at this page), `sitewide` (header and list) or `all` (the default). Each list alert has a decorative icon and a visually hidden "Critical:", "Warning:" or "Information:" before its title, a heading (`heading-level`, default 2, as on library.virginia.edu). Warning and information alerts have a dismiss button; after a dismissal focus moves to the next alert's button (or the alert), else to the page's `<main>`, never to `<body>`. Alert bodies are server-sanitized HTML, re-sanitized with the browser's `setHTML()` where it exists. `<site-page>` places three of these itself (banner, list band, regional); use this element directly only on pages without `<site-page>`.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `show` | `SiteAlertsShow` | `'all'` | Which alerts to show: `header`, `list`, `regional`, `sitewide` (header and list) or `all`. |
| `alerts-env` | `string` | `'production'` | Alerts environment: `production` (default) or `staging`. Any other value logs one console warning and uses production. Ignored when `alerts-src` is set. |
| `alerts-src` | `string \| undefined` |  | Alerts base URL (holding `config.json`, `alerts.json` and `v1/uvalib-alerts.js`); overrides `alerts-env`. For a custom domain, local development and tests. |
| `heading-level` |  | `DEFAULT_LEVEL` | The level of each list alert's title heading, 1 to 6 (default 2). |
| `storage-key` | `string \| undefined` |  | The localStorage key for dismissed alerts, passed to the headless element (default: the alerts project's, `uvalib-alerts-seen`). Elements with different keys use different headless elements. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Events

| Event | Description |
|---|---|
| `site-alerts-change` | The number of alerts this element shows changed: `detail` is `{ count }`. Bubbles and is composed. The host also has `data-empty` while it shows none. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-teal` | `#25cad3` | Header banner background. |
| `--uva-red-100` | `#fbcfda` | Critical alert background (`--uva-red-B` #b30000 border). |
| `--uva-yellow-100` | `#fef6c8` | Warning alert and regional alert background (`--uva-yellow` #ecc602 border). |
| `--uva-blue-alt-300` | `#bfe7f7` | Information alert background (`--uva-blue-alt` #007bac border). |
| `--uva-teal-200` | `#c8f2f4` | Information regional alert background (`--uva-teal` border). |
| `--uva-grey-darkest` | `#2b2b2b` | Alert text. |
| `--uva-blue-alt-B` | `#141e3c` | Links in alert text. |
| `--uva-color-alert-text` |  | Dark-mode role token: alert text, icons and focus ring (else `--uva-grey-darkest`; the banner's is `--uva-color-alert-header-text`, else #000). |
| `--uva-color-alert-link` |  | Dark-mode role token: links in alert text (else `--uva-blue-alt-B`). |
| `--uva-color-alert-header-bg` |  | Dark-mode role token: banner background (else `--uva-teal`). |
| `--uva-color-alert-critical-bg` |  | Dark-mode role token: critical alert background; `-border` for its border. Also `--uva-color-alert-warning-*`, `--uva-color-alert-info-*`, `--uva-color-alert-regional-*` and `--uva-color-alert-regional-info-*`. |

## `<site-analytics>`

Matomo analytics, with no visual output. Loads matomo.js for the site and records the page view, then forwards the events below, fired anywhere in the page, to Matomo. Every call goes through Matomo's `_paq` queue, so events fired before matomo.js loads are kept. One tracker per page: however many `<site-analytics>` and `<uvalib-analytics>` elements there are (from any copy of this library), matomo.js is loaded and the page view recorded once, and only one element forwards each event; if it is removed, the next takes over. A Matomo snippet already on the page is used as it is (nothing is loaded or recorded again). When the browser sends Do Not Track or Global Privacy Control, or the page has `<html data-uvalib-analytics="off">`, it loads nothing and records nothing. A click on an element with `data-uvalib-track="category,action[,name[,value]]"` (or inside one, in light or shadow DOM) sends that event, unless `<html data-uvalib-analytics="off">` or a `no-analytics` ancestor opts it out. The same element is registered as `<uvalib-analytics>` by `uvalib-analytics.js`.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `matomourl` | `string` | `'https://analytics.lib.virginia.edu/'` | The Matomo server, ending in `/` (attribute `matomourl`). |
| `matomoid` | `number \| undefined` |  | The Matomo site id (attribute `matomoid`). Default: the site whose URL the page is under. |
| `spa` | `boolean \| 'auto'` | `false` | A single-page app. `spa` (no value): it records its own page views (`uvalib-analytics-pageview`), none on load. `spa="auto"`: a page view on load and one per same-document route change (hash change, Back and Forward, `history.pushState`), once the title has settled, never twice in a row for the same URL, with the previous URL as the referrer. Either way Matomo's link tracking is off. |
| `variables` | `Record<string, unknown> \| null` | `null` | Custom dimensions, a JSON object of `{ id: value }`, set before the page view. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Listens for (on document)

| Event | Description |
|---|---|
| `uvalib-analytics-pageview` | Listened for on `document` (not fired): records a page view; `detail` is `{ customTitle?, referrer? }` (default: the document's title and referrer; a referrer without `http` is taken as a path on this origin). |
| `uvalib-analytics-search` | Listened for on `document` (not fired): a Matomo site search; `detail` is `{ searchQuery, searchCategory?, resultCount? }`. |
| `uvalib-analytics-event` | Listened for on `document` (not fired): a Matomo event; `detail` is `{ event: [category, action, name?, value?] }` (`track` is the old name of `event`). |
| `uvalib-analytics-content` | Listened for on `document` (not fired): a Matomo content impression; `detail` is `{ name, piece, target?, interaction? }` (with `interaction`, a content interaction instead). |
| `site-analytics-pageview` | Listened for on `document` too: the same as `uvalib-analytics-pageview`. |
| `site-analytics-search` | Listened for on `document` too: the same as `uvalib-analytics-search`. |
| `site-analytics-event` | Listened for on `document` too: the same as `uvalib-analytics-event`. |
| `site-analytics-content` | Listened for on `document` too: the same as `uvalib-analytics-content`. |

## `<site-footer>`

UVA Library site footer: link columns, contact details and copyright.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `root-link-domain` | `string` | `'https://www.library.virginia.edu'` |  |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Slots

| Slot | Description |
|---|---|
| `pre-footer` | Optional content shown in a band above the footer links. |

### CSS parts

| Part | Description |
|---|---|
| `footer` | The `<footer>` element. |

### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: a click on one of the footer's own links (not the pre-footer's), `['site-footer', 'link-click', '<Column>: <Link>']`, for example `Using the Library: Get help`; the phone and email links are `Contact us: Phone` and `Contact us: Email`, the social links `Social: Facebook` and `Social: Instagram`. Never a URL. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-brand-blue` | `#232d4b` | Main footer background (also the skip-link background in the shared accessibility sheet, which the footer does not render). |
| `--uva-blue-alt-300` | `#bfe7f7` | Pre-footer band background. |
| `--uva-blue-alt-darkest` | `#141e3c` | Copyright bar background. |
| `--uva-brand-orange` | `#e57200` | Social icon hover colour and focus-visible outline. Footer link and text colours are fixed white. |
| `--uva-color-pre-footer-bg` |  | Dark-mode role token: pre-footer band background (else `--uva-blue-alt-300`). |
| `--uva-color-pre-footer-text` |  | Dark-mode role token: pre-footer band text (else inherited). The footer itself is the same in both schemes. |

## `<site-header>`

UVA Library site header: logo, utility navigation, and a popover menu on narrow screens. A site can replace the library utility links (My account, Ask a Librarian, Hours, Give, Alerts, Search) with its own: give the header `<a slot="site-links" href="…">` children. They are shown, in order, in the inline nav and the Menu popover, with `href` as written (not joined to `root-link-domain`) and their `aria-current`, `target`, `rel` and `hreflang`. The source anchors themselves stay hidden. Children that are not `<a href>` with text (empty or whitespace-only text counts as none) are ignored with one console warning. The `vendor` variant ignores site links and keeps its own reduced link set. The full header also shows the UVA Library main navigation (`<site-main-nav>`): a row under the logo row on wide screens, and an accordion at the top of the Menu popover on narrow ones (992px and below), above the utility or site links. `no-main-nav` turns it off, leaving the header exactly as it was without it; the `vendor` variant never shows it. A `<nav slot="main-nav">` child replaces its links (see `<site-main-nav>`), and `main-nav-src` loads them from JSON; `main-nav-current` sets the URL marked current. `color-scheme-switch` opts in to dark mode (off by default; see the README's "Dark mode"): a Light / Dark / System radio group ("Theme") at the end of the utility-links row on wide screens and at the bottom of the Menu popover on narrow ones. The `vendor` variant, which has no Menu, shows it after its inline link, on a row of its own under the logo row on narrow screens. In dark mode the logo is the reversed (white) one.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `root-link-domain` | `string` | `'https://www.library.virginia.edu'` |  |
| `variant` | `'full' \| 'vendor'` | `'full'` |  |
| `site-links-label` | `string \| undefined` |  | Accessible name of the nav when site links replace the utility links (default "Site"; the popover nav's name adds " menu"). |
| `no-main-nav` | `boolean` | `false` | Hide the UVA Library main navigation (the row under the logo and the popover accordion). |
| `main-nav-label` | `string \| undefined` |  | Accessible name of the main navigation (default "Main"). |
| `main-nav-src` | `string \| undefined` |  | URL of JSON main navigation items (`MainNavItem[]`, needs CORS), passed to `<site-main-nav items-src>`. |
| `main-nav-current` | `string \| undefined` |  | The URL whose main-navigation link is marked current, passed to `<site-main-nav current>`. Default: the page location, followed through same-document navigations. |
| `color-scheme-switch` | `boolean` | `false` | Opt in to dark mode: the page follows the OS light or dark preference ("System"), and a Light / Dark / System control (at the end of the utility-links row on wide screens, at the bottom of the Menu popover on narrow ones) lets the visitor override it, remembered per site in localStorage (`uvalib-color-scheme`). Sets `data-uva-color-scheme` on the root element, and swaps in the reversed logo while dark. Ignored (the page stays light and no control is shown) in browsers without CSS `light-dark()`. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Slots

| Slot | Description |
|---|---|
| `skip-link` | Shadow mode only: optional skip link, rendered first inside `<header>` (`<site-page>` uses it). |
| `alerts` | Optional alert banner (`<site-page>` passes its `<site-alerts show="header">`), shown as a full-bleed row at the very top of `<header>` (flush with its top and both edges, outside its padding), after the skip link and before the logo row. In light mode the children are moved to the start of `<header>`. The header never loads alerts itself. |
| `main-nav` | Optional `<nav>` whose `<ul>` replaces the main navigation's links in both layouts: `<li><a href>` for a direct link, `<li><span>Group</span><ul><li><a href>…</a></li></ul></li>` for a group. Invalid entries are skipped with one console warning. Never shown itself; in light mode it is moved into a hidden holder. Ignored with `no-main-nav` and by the `vendor` variant. |
| `site-links` | Optional `<a href>` elements with text that replace the library utility links in the inline nav and the Menu popover (ignored by the `vendor` variant). In light mode they are moved into a hidden holder. |

### CSS parts

| Part | Description |
|---|---|
| `header` | The `<header>` element. |

### Events

| Event | Description |
|---|---|
| `site-main-nav-error` | `main-nav-src` could not be loaded; the bundled main navigation is shown. `detail` is `{ src, message }`. Fired once, from the bar's `<site-main-nav>`; bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: the visitor picked a colour scheme, `['site-header', 'color-scheme', 'light' \| 'dark' \| 'system']` (not the initial value); `['site-header', 'link-click', <label>]` for a utility or site link, `['site-header', 'logo-click']`, `['site-header', 'skip-link']` (a slotted skip link) and `['site-header', 'menu-open']` when the Menu popover opens; and the main navigation's menu opens and link clicks (see `<site-main-nav>`). Never a URL. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-blue-alt-dark` | `#005679` | Utility link colour. |
| `--uva-grey-darkest` | `#2b2b2b` | Menu button colour. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour (focus-visible outline), and the underline colour of an `aria-current` link (also bold, with a 3px underline). |
| `--uva-brand-blue` | `#232d4b` | Skip-link background for a skip link slotted into `skip-link` (shadow mode, shared accessibility sheet). |
| `--uva-color-surface-raised` |  | Dark-mode role token: header, Menu popover and theme control background (else #ffffff). |
| `--uva-color-utility-link` |  | Dark-mode role token: utility and site link colour (else `--uva-blue-alt-dark`). |
| `--uva-color-text` |  | Dark-mode role token: Menu button and theme control text (else `--uva-grey-darkest`). |
| `--uva-color-border` |  | Dark-mode role token: popover border and rules (else #ccc). |
| `--uva-color-control-border` |  | Dark-mode role token: theme control border (else `--uva-grey`, #808080). |
| `--uva-color-accent-bg` |  | Dark-mode role token: selected theme option and skip-link background (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Dark-mode role token: selected theme option and skip-link text (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-current` |  | Dark-mode role token: current-page underline (else `--uva-brand-orange`). |

## `<site-hours-section>`

Today's hours for the UVA libraries, as on the library.virginia.edu home page: the date (in America/New_York), a "Today's hours" heading, a list of library and hours pairs and a link to /hours. Data comes from the library website's JSON:API (same origin) and LibCal, shared between all hours elements on a page. The date and hours update when the date changes in New York.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `limited` | `boolean` | `false` | Only libraries with a priority placement (the home page's short list). |
| `heading-level` | `number` | `3` | The level of the "Today's hours" heading, 2 to 6. The default, 3, fits the home page, where the section sits under an h2; use 2 when it sits directly under the page's h1. |
| `place-type` | `string \| null` | `null` | Only libraries of this type (`Library`, `space` or `other-professional`). |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Events

| Event | Description |
|---|---|
| `got-library-hours` | The hours were loaded. `detail` is `{ message }`. Bubbles and is composed. |
| `got-libraries` | The libraries were loaded (fired after `got-library-hours`). `detail` is `{ message }`. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['site-hours-section', 'link-click', 'See all hours']` for a "See all hours" link, and `['site-hours-section', 'error', 'hours-load']` once when the libraries or their hours cannot be loaded. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-brand-blue` | `#232d4b` | Heading and link colour. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour. |
| `--site-hours-list-min-height` | `0` | Height the list keeps while the hours load, so the link and content below do not jump when they arrive (seven `limited` libraries take about 12.75rem). |
| `--uva-color-link` |  | Dark-mode role token: heading and link colour (else `--uva-brand-blue`). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

## `<site-main-nav>`

The UVA Library main navigation (About, Using the Library, Research & teaching support, Get help), as on library.virginia.edu, following the WAI-ARIA disclosure navigation pattern: one `<nav>` landmark; each group is a `<button aria-expanded aria-controls>` followed by its list of links, and an entry with no group is a plain link. Click, Enter or Space toggles a group and only one is open at a time; Escape closes it and returns focus to its button; arrow keys, Home and End move between the buttons and between a panel's links, and ArrowDown on an open button moves into its panel. In the `bar` layout a panel also closes when focus leaves the nav or on a pointer press outside it. There is no hover-to-open. The items come from, in order of precedence: a `<nav slot="main-nav">` child holding `<ul><li><a href>…</a></li></ul>` (a direct link) or `<li><span>Group</span><ul><li><a href>…` (a group), kept hidden and watched for changes; the `items` property; JSON at `items-src`; and the snapshot of the live menu bundled with the component (see `pnpm sync:main-nav`). Invalid entries are skipped and levels deeper than two are flattened, each with one console warning. Relative hrefs are joined to `root-link-domain`; absolute ones are kept, and fragment-only ones (`#…`, a hash route) stay on this page. A plain click on a link closes the open group. The link for the current page (`current`, default the page location, followed through same-document navigations; host and path, ignoring the query, the hash, a trailing slash and a leading `www.`) gets `aria-current="page"`, and its group button `aria-current="true"`, shown bold with a thick underline. Of links that differ only by hash, the one with the page's hash is marked, else the one without a hash; if every one has a hash, the first is marked while the page has none, and none for a hash none has. `<site-header>` renders it: as a row under the logo on wide screens and as an accordion in the Menu popover on narrow ones.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `'Main'` | Accessible name of the navigation landmark. |
| `root-link-domain` | `string` | `'https://www.library.virginia.edu'` |  |
| `items-src` | `string \| undefined` |  | URL of JSON in the `MainNavItem[]` shape (needs CORS); the snapshot is shown until it loads, and if it fails. |
| `layout` | `'bar' \| 'accordion'` | `'bar'` | `bar` (a row of buttons with floating panels) or `accordion` (stacked, panels in flow). |
| `current` | `string \| undefined` |  | The URL whose link is marked current. Default: the page location, followed through same-document navigations (`popstate`, `hashchange`, and the Navigation API's `currententrychange` where supported). |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Slots

| Slot | Description |
|---|---|
| `main-nav` | Optional `<nav>` (or `<ul>`) whose list replaces the menu: `<li><a href>` for a direct link, `<li><span>Group</span><ul><li><a href>…</a></li></ul></li>` for a group. It is never shown itself; in light mode it is moved into a hidden holder. |

### Events

| Event | Description |
|---|---|
| `site-main-nav-error` | `items-src` could not be loaded: both attempts failed (network error, a 10 s timeout per attempt, or no valid entries), after about 21 s at worst; the nav shows the bundled snapshot. `detail` is `{ src, message }`. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: a group was opened, `['site-main-nav', 'menu-open', <the group's label>]` (not on close), and a link was clicked, `['site-main-nav', 'link-click', '<Group> > <Link>']` (a top-level link: its label alone; never the URL). Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-grey-darkest` | `#2b2b2b` | Top-level button colour. |
| `--uva-brand-blue` | `#232d4b` | Bar bottom border, chevrons, panel links, and the hover and expanded button text. |
| `--uva-grey-100` | `#dadada` | Hover and expanded button background, and panel link hover background. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour, and the underline of the current page's link and group (also bold, with a 3px underline). |
| `--uva-font-family` | `franklin-gothic-urw, Arial, Helvetica, sans-serif` | Font family. |
| `--uva-color-text` |  | Dark-mode role token: top-level button text (else `--uva-grey-darkest`). |
| `--uva-color-link` |  | Dark-mode role token: chevrons, panel links, hover text and the focus ring over hover (else `--uva-brand-blue`). |
| `--uva-color-surface-hover` |  | Dark-mode role token: hover and open-group background (else `--uva-grey-100`). |
| `--uva-color-surface-raised` |  | Dark-mode role token: bar and panel background (else #ffffff). |
| `--uva-color-accent-bg` |  | Dark-mode role token: bar bottom rule (else `--uva-brand-blue`). |
| `--uva-color-shadow` |  | Dark-mode role token: panel shadow colour (else rgba(0, 0, 0, 0.2)). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-current` |  | Dark-mode role token: current-page underline (else `--uva-brand-orange`). |

## `<site-page>`

Page wrapper: skip link (inside the header landmark in shadow mode), header, a single `<main>`, footer (unless `no-footer`), and global page styles. Side-effect free: `site-page.ts` registers `<site-header>` (and its `<site-main-nav>`) and `<site-footer>`. The header shows the UVA Library main navigation by default (`no-main-nav` turns it off; `header-variant="vendor"` never shows it). Shows live UVA Library alerts by default with `<site-alerts>` (its code loads only then), placed as Virgo places them: a full-bleed `<site-alerts show="header">` banner at the top of the header landmark (after the skip link), a full-bleed band between the header and `<main>` holding `<site-alerts show="list">` (a `<section aria-label="Library alerts">` region, hidden while the list has nothing to show), and `<site-alerts show="regional">` as the first child of `<main>`, inside its padding. Their data comes from one headless `<uvalib-alerts>`, loaded once per document, with a module script, from the alerts CDN (`alerts-env`, or `alerts-src`); if it fails to load, one console warning is logged and the page works as before. `no-alerts` renders no alert elements and loads nothing. A `slot="breadcrumbs"` child (a `<uvalib-breadcrumbs>`) is placed where library.virginia.edu puts the trail: after the header and the alert list band, before `<main>` and outside it (so the skip link lands past it), with the same gutters as `<main>`.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `root-link-domain` | `string` | `'https://www.library.virginia.edu'` |  |
| `header-variant` | `'full' \| 'vendor'` | `'full'` |  |
| `no-global-styles` | `boolean` | `false` |  |
| `no-footer` | `boolean` | `false` | Hide the footer (and any pre-footer band), for tools and app-like pages where the site footer does not belong. The footer is kept hidden rather than removed, so toggling the attribute keeps pre-footer content. |
| `site-links-label` | `string \| undefined` |  | Accessible name of the header navigation when site links are given (default "Site"). |
| `no-main-nav` | `boolean` | `false` | Hide the UVA Library main navigation in the header. |
| `main-nav-label` | `string \| undefined` |  | Accessible name of the header's main navigation (default "Main"). |
| `main-nav-src` | `string \| undefined` |  | URL of JSON main navigation items, forwarded to `<site-header main-nav-src>`. |
| `main-nav-current` | `string \| undefined` |  | The URL whose main-navigation link is marked current, forwarded to `<site-header main-nav-current>`. Default: the page location, followed through same-document navigations; set it when a single-page app's route is not its URL. |
| `alerts-env` | `string` | `'production'` | Alerts environment: `production` (default) or `staging`. Any other value logs one console warning and uses production. Ignored when `alerts-src` is set. |
| `alerts-src` | `string \| undefined` |  | Alerts base URL (holding `config.json`, `alerts.json` and `v1/uvalib-alerts.js`); overrides `alerts-env`. For a custom domain, local development and tests. |
| `no-alerts` | `boolean` | `false` | Render no alert elements and load no alerts script. |
| `color-scheme-switch` | `boolean` | `false` | Opt in to dark mode, forwarded to `<site-header color-scheme-switch>`: the page follows the OS preference, and a Light / Dark / System control in the header lets the visitor override it (remembered per site). Off by default: the page is always light. The page's own content must support it (see the README's "Dark mode"). |
| `matomo-id` | `number \| undefined` |  | Opt in to Matomo analytics: the site's Matomo id. The page then adds one `<site-analytics>` for it (loading its code only then), which records the page view and what the library's components report (see the README's "Analytics"). Off by default. With an analytics element or a Matomo snippet already on the page nothing is counted twice. |
| `matomo-url` | `string \| undefined` |  | The Matomo server for `matomo-id`, ending in `/` (default: the library's). |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Slots

| Slot | Description |
|---|---|
| (default) | Main page content, rendered inside the single `<main>`. |
| `breadcrumbs` | Optional breadcrumb trail (a `<uvalib-breadcrumbs>`), shown between the header (and alert list band) and `<main>`. In light mode it is moved there, never into `<main>`. |
| `pre-footer` | Optional content shown in a band above the footer. |
| `site-links` | Optional `<a href>` elements, forwarded to `<site-header>`, that replace the library utility links in the header (inline nav and Menu popover). Ignored with `header-variant="vendor"`. |
| `main-nav` | Optional `<nav>` forwarded to `<site-header>`, whose list replaces the UVA Library main navigation's links (see `<site-main-nav>`). Ignored with `no-main-nav` and `header-variant="vendor"`. |

### CSS parts

| Part | Description |
|---|---|
| `main` | The `<main>` landmark. |
| `header` | The `<header>` element inside `<site-header>` (shadow mode; exported through `exportparts`). |
| `footer` | The `<footer>` element inside `<site-footer>` (shadow mode; exported through `exportparts`). |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-brand-blue` | `#232d4b` | Skip link background. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour (focus-visible outline). |
| `--uva-font-family` | `franklin-gothic-urw, Arial, Helvetica, sans-serif` | Page font family (global styles). |
| `--uva-font-size-base` | `17px` | Page base font size (global styles). |
| `--uva-grey-darkest` | `#2b2b2b` | Page text colour (global styles). |
| `--uva-color-surface` |  | Dark-mode role token: page background (global styles; else none). |
| `--uva-color-text` |  | Dark-mode role token: page text (global styles; else `--uva-grey-darkest`). |
| `--uva-color-accent-bg` |  | Dark-mode role token: skip-link background (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Dark-mode role token: skip-link text (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

## `<site-style>`

Compatibility element. Light mode (`no-shadow-dom`) installs the tokens and base page styles on the document. Shadow mode only styles inside its own shadow root, so the `:root` and `html, body` rules of those sheets match nothing there and the slotted content is not restyled; it inherits whatever inherited tokens and fonts the page already provides.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `imports` | `{ [key: string]: string }` | `{}` | Map of tag name to a module URL whose default export is a stylesheet; ported as is. |
| `importedstyles` | `string` | `''` | Accumulated text of the stylesheets loaded through `imports`. Carried over from the old component for compatibility; it is not rendered anywhere. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Slots

| Slot | Description |
|---|---|
| (default) | Content rendered in shadow mode; it is not restyled by this element. In light mode there is no shadow root and the children stay in place. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-font-family` | `franklin-gothic-urw, Arial, Helvetica, sans-serif` | Font family. |
| `--uva-font-size-base` | `17px` | Base font size. |
| `--uva-grey-darkest` | `#2b2b2b` | Text colour. |
| `--uva-color-text` |  | Dark-mode role token: text colour (else `--uva-grey-darkest`). |
| `--uva-color-surface` |  | Dark-mode role token: page background (else none). |

## `<uvalib-analytics>`

`<site-analytics>` under its original name, for markup such as Drupal's `<uvalib-analytics matomoid="10">`: the same element, attributes and events. A constructor can be registered only once, hence the subclass.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `matomourl` | `string` | `'https://analytics.lib.virginia.edu/'` | The Matomo server, ending in `/` (attribute `matomourl`). |
| `matomoid` | `number \| undefined` |  | The Matomo site id (attribute `matomoid`). Default: the site whose URL the page is under. |
| `spa` | `boolean \| 'auto'` | `false` | A single-page app. `spa` (no value): it records its own page views (`uvalib-analytics-pageview`), none on load. `spa="auto"`: a page view on load and one per same-document route change (hash change, Back and Forward, `history.pushState`), once the title has settled, never twice in a row for the same URL, with the previous URL as the referrer. Either way Matomo's link tracking is off. |
| `variables` | `Record<string, unknown> \| null` | `null` | Custom dimensions, a JSON object of `{ id: value }`, set before the page view. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Listens for (on document)

| Event | Description |
|---|---|
| `uvalib-analytics-pageview` | Listened for on `document` (not fired): records a page view; `detail` is `{ customTitle?, referrer? }` (default: the document's title and referrer; a referrer without `http` is taken as a path on this origin). |
| `uvalib-analytics-search` | Listened for on `document` (not fired): a Matomo site search; `detail` is `{ searchQuery, searchCategory?, resultCount? }`. |
| `uvalib-analytics-event` | Listened for on `document` (not fired): a Matomo event; `detail` is `{ event: [category, action, name?, value?] }` (`track` is the old name of `event`). |
| `uvalib-analytics-content` | Listened for on `document` (not fired): a Matomo content impression; `detail` is `{ name, piece, target?, interaction? }` (with `interaction`, a content interaction instead). |
| `site-analytics-pageview` | Listened for on `document` too: the same as `uvalib-analytics-pageview`. |
| `site-analytics-search` | Listened for on `document` too: the same as `uvalib-analytics-search`. |
| `site-analytics-event` | Listened for on `document` too: the same as `uvalib-analytics-event`. |
| `site-analytics-content` | Listened for on `document` too: the same as `uvalib-analytics-content`. |

## `<uvalib-breadcrumbs>`

A breadcrumb trail, as on library.virginia.edu: links separated by slashes, ending with the current page, at body size. A `<nav aria-label="Breadcrumb">` holding an `<ol>`; the separators are hidden from assistive technology and the last item has `aria-current="page"` (a `<span>`, or a link when it has an href). Give the trail as children: `<a href>` elements, ending with the current page as a text-only element (`<span>Hours</span>`) or a link (`<a href aria-current="page">`). The last child is always the current page. An earlier child without an href is shown as plain text. Children with no text are skipped with one console warning. Hrefs are used as written, and the trail follows changes to the children (attributes and text too). Apps that build the trail in JavaScript set the `items` property instead (it then wins over any children); assigning a new array re-renders. Inside `<site-page>`, give it `slot="breadcrumbs"`: it is placed between the header (and alerts band) and `<main>`, with the page's gutters. It works anywhere else too. Single-page apps: the trail is drawn from copies of the children, so a router's own click handlers on them do not run. Listen for `uvalib-breadcrumbs-navigate` and cancel it to route in place; hash links need nothing.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `'Breadcrumb'` | Accessible name of the navigation landmark. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: a click on a trail link, `['uvalib-breadcrumbs', 'link-click', 'level <N>', <N>]` (N from 1, the first step); never the label or URL. Bubbles and is composed. |
| `uvalib-breadcrumbs-navigate` | A plain click on a trail link: `detail` is `{ href, index }` (href as written). Cancel it (`preventDefault()`) to navigate in the app; the click's default is then prevented. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-blue-alt-dark` | `#005679` | Link colour. |
| `--uva-grey-darkest` | `#2b2b2b` | Current page colour. |
| `--uva-grey-dark` | `#4f4f4f` | Separator colour. |
| `--uva-color-utility-link` |  | Dark-mode role token: link colour, #005679 in light as on library.virginia.edu (else `--uva-blue-alt-dark`). |
| `--uva-color-text` |  | Dark-mode role token: current page colour (else `--uva-grey-darkest`). |
| `--uva-color-text-muted` |  | Dark-mode role token: separator colour (else `--uva-grey-dark`). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

## `<uvalib-card>`

One card: a collection (title and “N texts”), a photo (image, count, date, category, title, excerpt) or any other raised summary. With `href`, the heading is the link and a pseudo-element stretches that link over the card, so the whole card is one click. The arrow is only a visual aid. The card is never wrapped in an `<a>`. A clickable card must not contain another link, button or other control: the stretched link covers it. A static card (no `href`, or an empty or unsafe one) has no stretch, so its excerpt may contain links. With `href`, the heading needs an accessible name (text, or an image `alt` or `aria-label`); otherwise the link is hidden. Regions are light-DOM children. Give `slot="media"`, `slot="badge"`, `slot="heading"`, `slot="meta"` or `slot="chip"`; anything else (including text) is the excerpt. An image needs a real alt, or `alt=""` when the heading already names it. A date belongs in `<time>` in the meta slot. One element per chip. The heading level defaults like `<events-section>`: one below the nearest heading before the card, or 3 when there is none. `heading-level` (1–6) wins. An invalid value is ignored.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `href` | `string \| undefined` |  | Makes the card one link: the heading stretches over the card. Empty is not a link. |
| `heading-level` | `number \| undefined` |  | Heading level of the title, 1–6. Unset, it is one below the nearest heading before this card, or 3 when there is none. Any other value is ignored. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Slots

| Slot | Description |
|---|---|
| `media` | Image or other media. An `<img>` needs a real alt, or `alt=""` when the heading names it. |
| `badge` | Short label drawn over the media, such as “13 photos”. |
| `heading` | The card title. With `href`, this heading’s link is the card, so it needs an accessible name. |
| `meta` | Date (`<time>`) or byline, under the title. |
| `chip` | Category. One element per chip. |
| (default) | Excerpt. A static card may put links here; a clickable card must not contain other controls. |

### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: a primary-button click on the card link that was not already canceled, including a modified click, `['uvalib-card', 'card-click', 'single']` or, inside `<uvalib-card-grid>`, `['uvalib-card', 'card-click', '<n>', <n>]` (n from 1, the card’s place in that grid). Never the title or URL. Bubbles and is composed. |
| `uvalib-card-navigate` | A plain click on the card link: `detail` is `{ href, position }` (`position` is `'single'` or `'1'`, `'2'`, …). Cancel it (`preventDefault()`) to route in the app; the click’s default is then prevented. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-brand-blue` | `#232d4b` | Title link when `--uva-color-link` is unset, and the badge background when `--uva-color-accent-bg` is unset. |
| `--uva-blue-alt-300` | `#BFE7F7` | Chip background. With `--uva-blue-alt-dark` this pair is 6.13:1 (WCAG AA for normal text, short of AAA’s 7:1). |
| `--uva-blue-alt-dark` | `#005679` | Chip text. |
| `--uva-grey-100` | `#DADADA` | Hover shadow colour when `--uva-color-shadow` is unset. |
| `--uva-color-surface-raised` |  | Dark-mode role token: card background (else #fff). |
| `--uva-color-border` |  | Dark-mode role token: card border (else `--uva-grey-100`). |
| `--uva-color-text` |  | Dark-mode role token: body text (else `--uva-grey-darkest`). |
| `--uva-color-text-muted` |  | Dark-mode role token: meta line (else #4f4f4f). |
| `--uva-color-link` |  | Dark-mode role token: title link (else `--uva-brand-blue`). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring on the card (else `--uva-brand-orange`). |
| `--uva-color-accent-bg` |  | Dark-mode role token: badge background (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Text on the badge (else #fff). |
| `--uva-color-shadow` |  | Dark-mode role token: hover shadow colour (else `--uva-grey-100`). |

## `<uvalib-card-grid>`

A grid of `<uvalib-card>` elements. It is a list, so a screen reader announces how many cards there are. Safari drops that list when markers are removed, so the list role is set as well as the `<ul>`. Columns follow the theme’s breakpoints on the grid’s own width (a container query, so a sidebar collapses the grid too): four above 992px, two through 767px, then one. Cards in a row match the height of the tallest. Set `min-card-width` (a length: `16rem`, `240px`, …) to use `repeat(auto-fill, minmax(min(100%, <width>), 1fr))` instead. An invalid value is ignored, with one console warning, and the 4/2/1 columns stay. Only `<uvalib-card>` children are listed. Anything else is left in the tree (hidden in light DOM) and warned about once. The grid gives each card a `slot` while it is inside; that attribute is removed when the card leaves, so it is not hidden by another shadow root.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `min-card-width` | `string \| undefined` |  | When a length (`16rem`, `240px`, `20ch`, `40%`), the grid fills by that minimum instead of the fixed 4/2/1 columns. Any other value is ignored. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Slots

| Slot | Description |
|---|---|
| (default) | `<uvalib-card>` elements, one per cell. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uvalib-card-min` |  | Set from `min-card-width` when that value is a length. The grid uses it as the `auto-fill` minimum. |

## `<uvalib-contents>`

Sub-navigation or a table of contents, as library.virginia.edu's sub-navigation: a `<nav>` landmark (named by `label`, "Contents" by default) with the label as a visible headline, and a nested list of links with dividers between the top-level entries and a bar beside each nested level. Give the list as a child: an `<ol>` or `<ul>` of `<li>` elements, each with an `<a href>` (or plain text for a group label) and, for sub-entries, a nested `<ol>`/`<ul>`, to any depth. Other children (a heading) are ignored. The list follows changes to the children. Apps set the `items` property instead (`{ label, href?, children? }`, winning over the children while set). The current entry gets `aria-current`: `page` for the link to this page, `location` for the link to the section of it in the URL's hash. It is found from the page URL (path, and hash for in-page sections), followed through same-document navigations (`hashchange`, `popstate` and the Navigation API), or from the `current` attribute (a URL, resolved like the links). An entry whose href has a query string matches only that query (`?part=2`); one without matches the page whatever its query. Hash-only hrefs are places on that page. With `current` unset, a valid `aria-current` on a source link (`page`, `location` or `true`) is used instead, the first of each kind. `lang` and `dir` on the source links and items, and inline markup in their text (`em`, `cite`, `code`, `abbr`…, copied element by element, never as HTML), are kept. On narrow screens the list collapses into a disclosure: the headline becomes a button with `aria-expanded`, and the list starts closed (as the Electronic Text Collections' Contents does on phones, so the text comes first) until the reader opens it, or while the `open` attribute is set; opening it shows the current entry. Narrow means the viewport (`collapse-below`, 64rem by default), not the element's own width: a contents sidebar is always far narrower than 64rem, so a container query could not tell a phone from a desktop. `sticky` keeps it in view in a sidebar on wide screens; a list longer than the window then scrolls, and the current entry is scrolled into view inside it (never the page). Single-page apps: the list is drawn from copies of the children, so a router's own click handlers on them do not run. Listen for `uvalib-contents-navigate` and cancel it to route in place; hash links need nothing.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` |  | `DEFAULT_LABEL` | Accessible name of the navigation landmark, and its visible headline. |
| `heading-level` |  | `DEFAULT_LEVEL` | The headline's level (2 to 6), for the page's outline. |
| `current` | `string \| undefined` |  | The URL of the current entry (resolved like the links), for apps whose route is not the page URL. Unset: the page URL, followed through same-document navigations. |
| `collapse-below` |  | `DEFAULT_COLLAPSE` | The viewport width at and below which the list collapses into a disclosure: a CSS length (`64rem`, `800px`). `0` or `none` never collapses. |
| `open` | `boolean` | `false` | Whether the collapsed disclosure is open (no effect on wide screens). Toggled by its button. |
| `sticky` | `boolean` | `false` | Keep it in view while the page scrolls (a sidebar), on wide screens. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: a click on an entry, `['uvalib-contents', 'link-click', 'level <N>', <N>]` (N from 1, the top level), and opening or closing the disclosure, `['uvalib-contents', 'toggle', 'open' \| 'close']`; never the label or URL. Bubbles and is composed. |
| `uvalib-contents-navigate` | A plain click on an entry: `detail` is `{ href, level }` (href as written). Cancel it (`preventDefault()`) to navigate in the app; the click's default is then prevented. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uvalib-contents-sticky-top` | `1rem` | With `sticky`: the gap kept above it. |
| `--uvalib-contents-max-height` | `none` | The list's maximum height on wide screens (it scrolls beyond it); with `sticky`, the window's height less twice the sticky gap. |
| `--uva-blue-alt-dark` | `#005679` | Link colour. |
| `--uva-brand-blue` | `#232d4b` | The current entry's bar. |
| `--uva-brand-orange` | `#e57200` | The nested levels' bar. |
| `--uva-grey-darkest` | `#2b2b2b` | Text and current entry colour. |
| `--uva-color-utility-link` |  | Dark-mode role token: link colour (else `--uva-blue-alt-dark`). |
| `--uva-color-text` |  | Dark-mode role token: text and current entry (else `--uva-grey-darkest`). |
| `--uva-color-link` |  | Dark-mode role token: the current entry's bar and the button's text (else `--uva-brand-blue`). |
| `--uva-color-current` |  | Dark-mode role token: the nested levels' bar (else `--uva-brand-orange`). |
| `--uva-color-border` |  | Dark-mode role token: dividers (else #dadada). |
| `--uva-color-control-border` |  | Dark-mode role token: the button's border (else #808080). |
| `--uva-color-surface-raised` |  | Dark-mode role token: the button's background (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

## `<uvalib-date-range>`

A date-range picker: a two-thumb year slider plus "From" and "To" date inputs. `min` and `max` (ISO dates, `YYYY-MM-DD`) are required; without valid ones the element renders nothing and logs a console warning once. The start can never pass the end, and both stay within `min`..`max`.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `min` | `string` | `''` | Earliest selectable date, `YYYY-MM-DD`. Required. |
| `max` | `string` | `''` | Latest selectable date, `YYYY-MM-DD`. Required. |
| `value` | `string[]` | `[]` | Selected `[start, end]` ISO dates. Missing, invalid or out-of-range entries fall back to `min` / `max`. |
| `label` | `string` | `'Date range'` | Legend text; the two sliders are named from it ("<label>: start year"). |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Events

| Event | Description |
|---|---|
| `date-range-change` | The range changed from a slider or a date input. `detail` is `{ value: [start, end] }` (ISO dates). Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['uvalib-date-range', 'range-change', '<from year>–<to year>']`, 1 s after the visitor's last change (not when the range ends where it started). Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-brand-blue` | `#232d4b` | Selected slider range, thumbs, legend and focused date input border. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour (focus-visible outline). |
| `--uva-font-family` | `inherit` | Font family. |
| `--uva-color-link` |  | Dark-mode role token: legend and focused date input border (else `--uva-brand-blue`). |
| `--uva-color-track` |  | Dark-mode role token: slider track (else #e5e7eb). |
| `--uva-color-accent-bg` |  | Dark-mode role token: selected range and thumbs (else `--uva-brand-blue`). |
| `--uva-color-surface-raised` |  | Dark-mode role token: date input background and thumb ring (else #ffffff). |
| `--uva-color-input-text` |  | Dark-mode role token: date input text (else #1f2937). |
| `--uva-color-text-muted` |  | Dark-mode role token: From / To labels (else #4b5563). |
| `--uva-color-control-border` |  | Dark-mode role token: date input border (else `--uva-grey`, #808080). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

## `<uvalib-filter>`

A faceted-search filter: a fieldset of checkboxes (value plus result count), optional toggle chips ("scopes") above them, and "See more" / "See less" buttons when `limit` is set. It is controlled: set `filter`, `value` and `scopeValue` from your search state and listen for the change events.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `filter` | `FilterFacet` | `{ name: '', title: '', position: 0, buckets: [] }` | The facet to show: `{ name, title, position, buckets: [{ key, doc_count, selected }] }`. |
| `value` | `string[]` | `[]` | Selected bucket keys (matched case-insensitively). |
| `scopes` | `FilterScopeOption[]` | `[]` | Optional toggle chips shown under the legend (for example attendee types): `[{ value, label }]`. |
| `scopevalue` | `string[]` | `[]` | Pressed scope values (matched case-insensitively). |
| `scopes-label` | `string` | `''` | Accessible name of the scope chip group. Empty (the default) means `Filter <title> by type`. |
| `limit` | `number` | `0` | Maximum buckets to show at first; 0 shows all. "See more" doubles it, "See less" halves it back. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### CSS parts

| Part | Description |
|---|---|
| `see-more` | The "See more" button (shadow mode). |
| `see-less` | The "See less" button (shadow mode). |

### Events

| Event | Description |
|---|---|
| `filter-change` | A checkbox was toggled. `detail` is `{ name, value }`: the facet name and the new array of selected keys. Does not bubble. |
| `scope-change` | A scope chip was toggled. `detail` is `{ value }`: the new array of pressed scope values. Does not bubble. |
| `uvalib-analytics-event` | For `<site-analytics>`, on the visitor's changes only: `['uvalib-filter', 'facet-change', '<title>: <value>', 1 \| 0]` (checked or unchecked), `['uvalib-filter', 'scope-change', <scope label>, 1 \| 0]` (pressed or not), and `['uvalib-filter', 'see-more' \| 'see-less', <title>]`. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-brand-blue` | `#232d4b` | Scope chip text, hover border and pressed background. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour (focus-visible outline). |
| `--uva-color-border` |  | Dark-mode role token: divider under the scope chips (else #e5e7eb). |
| `--uva-color-control-border` |  | Dark-mode role token: scope chip border (else `--uva-grey`, #808080). |
| `--uva-color-surface-raised` |  | Dark-mode role token: scope chip background (else #fff). |
| `--uva-color-link` |  | Dark-mode role token: scope chip text and hover border (else `--uva-brand-blue`). |
| `--uva-color-accent-bg` |  | Dark-mode role token: pressed chip background and border (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Dark-mode role token: pressed chip text (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

## `<uvalib-metadata>`

A record's details as a description list, as on the library's digital collections: label and value side by side on wide screens (the element's own width, 36rem and up), stacked on narrow ones. Values may be text, links or lists (subjects). Give the rows as a `<dl>` child (so the page reads the same before the script loads): `<dt>` labels and `<dd>` values, optionally wrapped in a `<div>` per row; several `<dd>` after one `<dt>` are several values. The values are copied as written (links, lists, `download` attributes kept); a link with `data-size="184 KB"` is shown as a download, "EPUB · 184 KB". The list follows changes to the children. Apps set the `items` property instead (`{ label, value }`, winning over the children while set). Built-in rows for credit and rights (as Special Collections asks): `creator` and `organization` come first; `rights` (a rightsstatements.org or Creative Commons URL, shown as its short name linked to it, or plain text) and `citation` ("How to cite", with a Copy citation button that announces "Copied" politely) come last. `citation-title` builds the Special Collections citation, "<title>, Albert and Shirley Small Special Collections Library, University of Virginia".

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `creator` | `string \| undefined` |  | The creator (author, photographer…), shown first. |
| `organization` | `string \| undefined` |  | The organization holding or crediting the item, shown after the creator. |
| `rights` | `string \| undefined` |  | The rights statement: a rightsstatements.org or Creative Commons URL (shown as its short name, linked), another http(s) URL (shown as `rights-label`, or "Rights statement"), or plain text. |
| `rights-label` | `string \| undefined` |  | The link text for a `rights` URL, instead of its short name. |
| `rights-info` | `string \| undefined` |  | A "More about rights and permissions" link under the statement, such as `https://www.library.virginia.edu/policies/use-of-materials`. |
| `citation` | `string \| undefined` |  | "How to cite": the citation, as written. Wins over `citation-title`. |
| `citation-title` | `string \| undefined` |  | A title or collection name for the Special Collections citation: "<title>, Albert and Shirley Small Special Collections Library, University of Virginia". |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: the Copy citation button, `['uvalib-metadata', 'copy-citation']`. Downloads are left to Matomo's own download tracking. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-blue-alt-dark` | `#005679` | Link colour. |
| `--uva-grey-darkest` | `#2b2b2b` | Value colour. |
| `--uva-color-utility-link` |  | Dark-mode role token: link colour (else `--uva-blue-alt-dark`). |
| `--uva-color-text` |  | Dark-mode role token: value colour (else `--uva-grey-darkest`). |
| `--uva-color-text-muted` |  | Dark-mode role token: label and status colour (else #4b5563). |
| `--uva-color-border` |  | Dark-mode role token: row dividers (else #dadada). |
| `--uva-color-link` |  | Dark-mode role token: the button's text and border (else `--uva-brand-blue`). |
| `--uva-color-surface-raised` |  | Dark-mode role token: the button's background (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

## `<uvalib-pager>`

Previous/next section links, as on a reading page, or a numbered page list. Previous/next: set `prev-href` and `next-href` (either may be omitted). Each link shows a “Previous” or “Next” kicker and, when `prev-label` or `next-label` is set, that title. A visually hidden “: ” sits between them, so the accessible name is punctuated even when CSS is off. A long title truncates visually; the full text stays in the accessible name. The links use `rel="prev"` and `rel="next"`. With neither href, nothing is rendered. Numbered pages: set `pages` (a positive count). `page` is the current page, clamped to `1…pages`. Each link’s href comes from `href-template`, which must contain `{page}` (the default is `?page={page}`). The current page is text with `aria-current="page"`, not a link. Long ranges collapse to the first page, a window around the current page, the last page, and an ellipsis where numbers are skipped. `pages` wins when previous/next attributes are also set, with one console warning. The landmark’s accessible name is `label`, or “Sections” for previous/next and “Pagination” for numbered pages. An empty `label` uses that default. Two pagers on one page need different labels: a repeated landmark name fails the accessibility check.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `prev-href` | `string \| undefined` |  | Href of the previous section. Omitted, that side is not shown. |
| `prev-label` | `string \| undefined` |  | Title of the previous section, under the “Previous” kicker. |
| `next-href` | `string \| undefined` |  | Href of the next section. Omitted, that side is not shown. |
| `next-label` | `string \| undefined` |  | Title of the next section, under the “Next” kicker. |
| `page` | `number \| undefined` |  | Current page, from 1. Clamped to `pages`. Used when `pages` is set. |
| `pages` | `number \| undefined` |  | How many pages. A positive number selects numbered pages and ignores previous/next. Zero, negative or non-numeric does not. |
| `href-template` | `string \| undefined` |  | Href of each numbered page, with `{page}` where the number goes. Default `?page={page}` when omitted. Without `{page}`, numbered links are not made. |
| `label` | `string \| undefined` |  | Accessible name of the navigation landmark. Default “Pagination” for numbered pages and “Sections” for previous/next. Empty uses that default. A second pager on the page needs its own name. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: a primary-button click that was not already canceled, including a modified click, on a page link `['uvalib-pager', 'page-change', 'number', <n>]`, or on a section link `['uvalib-pager', 'page-change', 'next'\|'previous']` (no page number: that mode has none). Never the label or URL. Bubbles and is composed. |
| `uvalib-pager-navigate` | A plain click on a pager link: `detail` is `{ href, kind, page? }` (`kind` is `'next'`, `'previous'` or `'number'`; `page` is set for `'number'`). Cancel it (`preventDefault()`) to route in the app; the click’s default is then prevented. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-link` |  | Dark-mode role token: link colour (else `--uva-brand-blue`). |
| `--uva-color-text` |  | Dark-mode role token: current page (else `--uva-grey-darkest`). |
| `--uva-color-text-muted` |  | Dark-mode role token: the Previous/Next kicker (else #4f4f4f). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-accent-bg` |  | Dark-mode role token: current page background (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Text on the current page background (else #fff). |

## `<website-section>`

The library website's first pages (pages, people, libraries, news) matching `query`, from Drupal's search index, with its excerpt (the matched words marked). The index sends no CORS headers, so this section works on library.virginia.edu (or wherever `BentoBox.endpoints.website` points to a same-origin copy) only.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | `''` | The search text. Empty: nothing is fetched and the section is `empty`. |
| `limit` | `number` | `5` | How many results to show (at most). |
| `no-result-describe` | `string` | `'No results found.'` | The message shown when nothing is found. |
| `heading-level` | `number \| undefined` |  | The level of the section's heading, 1 to 6. Unset (the default), it is one below the nearest heading before the element in the page, or 3 when there is none. `<bento-box>` sets it one below its own heading. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Events

| Event | Description |
|---|---|
| `bento-state` | Whenever `state` changes (bubbles, composed); `<bento-box>` listens to announce "Results updated" once every section has settled. |
| `uvalib-analytics-search` | For `<site-analytics>`: once per settled search (results or none, not an error): the query, the section's `analyticsName` as category and its total when known. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['bento-box', 'result-click', <section>, <1-based position>]` or `['bento-box', 'see-all-click', <section>]`; `['bento-box', 'retry', <section>]` for its Retry button; `['bento-box', 'error', 'section-load: <section>']` once when its results cannot be loaded; never titles or URLs. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-text` |  | Dark-mode role token: text (else #2b2b2b). |
| `--uva-color-link` |  | Dark-mode role token: titles, links and buttons (else `--uva-brand-blue`). |
| `--uva-color-border` |  | Dark-mode role token: the block's border and entry rules (else #dadada). |
| `--uva-color-surface-raised` |  | Dark-mode role token: background (else #fff). |
| `--uva-color-surface-hover` |  | Dark-mode role token: the header band (else #dadada). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
