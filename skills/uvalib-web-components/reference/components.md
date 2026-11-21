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

Matomo analytics, with no visual output. Loads matomo.js for the site and records the page view, then forwards the events below, fired anywhere in the page, to Matomo. Every call goes through Matomo's `_paq` queue, so events fired before matomo.js loads are kept. One tracker per page: however many `<site-analytics>` and `<uvalib-analytics>` elements there are (from any copy of this library), matomo.js is loaded and the page view recorded once, and only one element forwards each event; if it is removed, the next takes over. A Matomo snippet already on the page is used as it is (nothing is loaded or recorded again). When the browser sends Do Not Track or Global Privacy Control, or the page has `<html data-uvalib-analytics="off">`, it loads nothing and records nothing. A click on an element with `data-uvalib-track="category,action[,name[,value]]"` (or inside one, in light or shadow DOM) sends that event, unless `<html data-uvalib-analytics="off">` or a `no-analytics` ancestor opts it out. With `downloads="event"` downloads are counted as `['download', '<extension>']` events, without their URLs, instead of by Matomo's link tracking. The same element is registered as `<uvalib-analytics>` by `uvalib-analytics.js`.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `matomourl` | `string` | `'https://analytics.lib.virginia.edu/'` | The Matomo server, ending in `/` (attribute `matomourl`). |
| `matomoid` | `number \| undefined` |  | The Matomo site id (attribute `matomoid`). Default: the site whose URL the page is under. |
| `spa` | `boolean \| 'auto'` | `false` | A single-page app. `spa` (no value): it records its own page views (`uvalib-analytics-pageview`), none on load. `spa="auto"`: a page view on load and one per same-document route change (hash change, Back and Forward, `history.pushState`), once the title has settled, never twice in a row for the same URL, with the previous URL as the referrer. Either way Matomo's link tracking is off. |
| `variables` | `Record<string, unknown> \| null` | `null` | Custom dimensions, a JSON object of `{ id: value }`, set before the page view. |
| `downloads` | `string \| undefined` |  | `event`: count downloads without their URLs. Matomo's link tracking is left off; a left or middle click on a link to a file (the `download` attribute, or a download file type) sends the event `['download', '<extension>']` (no URL, no file name), and a click on a link to another site is still sent as an outlink (`trackLink`), as Matomo's link tracking would. Off by default. Read when Matomo is set up; no effect with a Matomo snippet already on the page. |
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

UVA Library site header: logo, utility navigation, and a popover menu on narrow screens. A site can replace the library utility links (My account, Ask a Librarian, Hours, Give, Alerts, Search) with its own: give the header `<a slot="site-links" href="…">` children. They are shown, in order, in the inline nav and the Menu popover, with `href` as written (not joined to `root-link-domain`) and their `aria-current`, `target`, `rel` and `hreflang`. The source anchors themselves stay hidden. Children that are not `<a href>` with text (empty or whitespace-only text counts as none) are ignored with one console warning. The `vendor` variant ignores site links and keeps its own reduced link set. The full header also shows the UVA Library main navigation (`<site-main-nav>`): a row under the logo row on wide screens, and an accordion at the top of the Menu popover on narrow ones (992px and below), above the utility or site links. `no-main-nav` turns it off, leaving the header exactly as it was without it; the `vendor` variant never shows it. A `<nav slot="main-nav">` child replaces its links (see `<site-main-nav>`), and `main-nav-src` loads them from JSON; `main-nav-current` sets the URL marked current. `color-scheme-switch` opts in to dark mode (off by default; see the README's "Dark mode"): a Light / Dark / System radio group ("Theme") at the end of the utility-links row on wide screens and at the bottom of the Menu popover on narrow ones. The `vendor` variant, which has no Menu, shows it after its inline link, on a row of its own under the logo row on narrow screens. In dark mode the logo is the reversed (white) one. `site-name` shows a sub-site's name after the logo, past a thin divider, as a link to the site's home (`site-name-href`, default `/`); the logo still links to library.virginia.edu. The name is not a heading (the page keeps its own `<h1>`) and its link is named "<name> home". On wide screens it sits in the logo row, wrapping to at most two lines (keep it short), so the header is no taller, while the links (and theme control) fit beside it on one line; when they would not, and at 992px and below, it gets its own lines under the logo, so the links are laid out exactly as without it. The `vendor` variant shows it too.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `root-link-domain` | `string` | `'https://www.library.virginia.edu'` |  |
| `variant` | `'full' \| 'vendor'` | `'full'` |  |
| `site-links-label` | `string \| undefined` |  | Accessible name of the nav when site links replace the utility links (default "Site"; the popover nav's name adds " menu"). |
| `site-name` | `string \| undefined` |  | The sub-site's name, shown after the library logo as a link to the site's home (`site-name-href`). The logo still links to library.virginia.edu. Not a heading. |
| `site-name-href` | `string \| undefined` |  | Where the site name links (default `/`, the site's own home). |
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
| `uvalib-analytics-event` | For `<site-analytics>`: the visitor picked a colour scheme, `['site-header', 'color-scheme', 'light' \| 'dark' \| 'system']` (not the initial value); `['site-header', 'link-click', <label>]` for a utility or site link, `['site-header', 'logo-click']`, `['site-header', 'site-name-click']` (the `site-name` link), `['site-header', 'skip-link']` (a slotted skip link) and `['site-header', 'menu-open']` when the Menu popover opens; and the main navigation's menu opens and link clicks (see `<site-main-nav>`). Never a URL. Bubbles and is composed. |

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

Page wrapper: skip link (inside the header landmark in shadow mode), header, a single `<main>`, footer (unless `no-footer`), and global page styles. Side-effect free: `site-page.ts` registers `<site-header>` (and its `<site-main-nav>`) and `<site-footer>`. The header shows the UVA Library main navigation by default (`no-main-nav` turns it off; `header-variant="vendor"` never shows it). Shows live UVA Library alerts by default with `<site-alerts>` (its code loads only then), placed as Virgo places them: a full-bleed `<site-alerts show="header">` banner at the top of the header landmark (after the skip link), a full-bleed band between the header and `<main>` holding `<site-alerts show="list">` (a `<section aria-label="Library alerts">` region, hidden while the list has nothing to show), and `<site-alerts show="regional">` as the first child of `<main>`, inside its padding. Their data comes from one headless `<uvalib-alerts>`, loaded once per document, with a module script, from the alerts CDN (`alerts-env`, or `alerts-src`); if it fails to load, one console warning is logged and the page works as before. `no-alerts` renders no alert elements and loads nothing. A `slot="breadcrumbs"` child (a `<uvalib-breadcrumbs>`) is placed where library.virginia.edu puts the trail: after the header and the alert list band, before `<main>` and outside it (so the skip link lands past it), with the same gutters as `<main>`. Printing leaves out the chrome: the skip link, header (with the main navigation and the header alert), alert list band, regional alerts, breadcrumbs, pre-footer and footer are not printed, `<main>` loses its gutters, and the content prints black on white (a dark scheme prints light), its links underlined. A short line above the content says where the page came from ("UVA Library — <site name or page title>" and the page's URL). `print-chrome` prints the page as it is shown instead. With `no-style` none of this applies.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `root-link-domain` | `string` | `'https://www.library.virginia.edu'` |  |
| `header-variant` | `'full' \| 'vendor'` | `'full'` |  |
| `no-global-styles` | `boolean` | `false` |  |
| `no-footer` | `boolean` | `false` | Hide the footer (and any pre-footer band), for tools and app-like pages where the site footer does not belong. The footer is kept hidden rather than removed, so toggling the attribute keeps pre-footer content. |
| `print-chrome` | `boolean` | `false` | Print the header, alerts, breadcrumbs and footer too. By default printing leaves them out and prints only `<main>`, black on white. |
| `site-links-label` | `string \| undefined` |  | Accessible name of the header navigation when site links are given (default "Site"). |
| `site-name` | `string \| undefined` |  | The sub-site's name, forwarded to `<site-header site-name>`: shown after the logo as a link to the site's home. |
| `site-name-href` | `string \| undefined` |  | Where the site name links, forwarded to `<site-header site-name-href>` (default `/`). |
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
| `matomo-downloads` | `string \| undefined` |  | `event`: the `<site-analytics downloads="event">` option for `matomo-id`, counting downloads as `['download', '<extension>']` events without their URLs. |
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
| `downloads` | `string \| undefined` |  | `event`: count downloads without their URLs. Matomo's link tracking is left off; a left or middle click on a link to a file (the `download` attribute, or a download file type) sends the event `['download', '<extension>']` (no URL, no file name), and a click on a link to another site is still sent as an outlink (`trackLink`), as Matomo's link tracking would. Off by default. Read when Matomo is set up; no effect with a Matomo snippet already on the page. |
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

## `<uvalib-back-to-top>`

A “Back to top” button for long pages: minutes, finding aids, transcriptions, long result lists. It stays hidden (`visibility: hidden`, so it is neither a tab stop nor in the accessibility tree) until the top `offset` pixels of the page (default 400) have scrolled out of view, watched with an IntersectionObserver on a small sentinel at the top of the page, never a scroll listener. If it has focus as it hides, focus moves to the target. Activating it scrolls to the top (smoothly unless the visitor prefers reduced motion) and moves focus to the page's `<h1>` (the first in `<main>`, else the first anywhere, else `#top`), or to `target` (a selector), adding `tabindex="-1"` when it is not focusable, so keyboard and screen reader users land at the top too. The button is fixed in the bottom corner (end side), inside the safe-area insets. The element itself is an empty block 4.75rem tall: put it last in the page's main content and that is the space the button needs, so the last lines can always scroll clear of it. When that space comes into view the button sits in it instead of floating, so it never covers the footer either. It is hidden in print.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` |  | `DEFAULT_LABEL` | The button's text. |
| `offset` |  | `DEFAULT_OFFSET` | How many pixels at the top of the page must scroll out of view before the button shows. |
| `target` | `string` | `''` | A selector for where focus goes (default: the page's `<h1>`, else `#top`). |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### CSS parts

| Part | Description |
|---|---|
| `button` | The button. |

### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: `['uvalib-back-to-top', 'click']` when activated. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uvalib-back-to-top-space` | `4.75rem` | The height the element keeps for the button at the end of the content. |
| `--uva-color-surface-raised` |  | Dark-mode role token: button background (else #fff). |
| `--uva-color-button-bg` |  | Dark-mode role token: button border and text (else `--uva-blue-alt`, #007bac). |
| `--uva-color-button-hover-bg` |  | Dark-mode role token: hovered button (else `--uva-blue-alt-A`, #005679). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-shadow` |  | Dark-mode role token: the floating button's shadow. |

## `<uvalib-breadcrumbs>`

A breadcrumb trail, as on library.virginia.edu: links separated by slashes, ending with the current page, at body size. A `<nav aria-label="Breadcrumb">` holding an `<ol>`; the separators are hidden from assistive technology and the last item has `aria-current="page"` (a `<span>`, or a link when it has an href). Give the trail as children: `<a href>` elements, ending with the current page as a text-only element (`<span>Hours</span>`) or a link (`<a href aria-current="page">`). The last child is always the current page. An earlier child without an href is shown as plain text. Children with no text are skipped with one console warning. Hrefs are used as written, and the trail follows changes to the children (attributes and text too). Apps that build the trail in JavaScript set the `items` property instead (it then wins over any children); assigning a new array re-renders. A step back to a search: give its link `data-return-from` with the search page's path (or several, separated by spaces), as in `<a href="/" data-return-from="/">Search</a>`. When the visitor came from that page on this site with a query string (`document.referrer`; a trailing slash or `index.html` does not matter), the step links back to that search (path and query) instead; its text stays the same. Otherwise, as when the result was opened in a new tab or the site sends no referrer, it keeps its href. Nothing is stored or sent. In `items`, the same is `returnFrom`. Inside `<site-page>`, give it `slot="breadcrumbs"`: it is placed between the header (and alerts band) and `<main>`, with the page's gutters. It works anywhere else too. Single-page apps: the trail is drawn from copies of the children, so a router's own click handlers on them do not run. Listen for `uvalib-breadcrumbs-navigate` and cancel it to route in place; hash links need nothing.

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

One card: a collection (title and “N texts”), a photo (image, count, date, category, title, excerpt) or any other raised summary. With `href`, the heading is the link and a pseudo-element stretches that link over the card, so the whole card is one click. The arrow is only a visual aid. The card is never wrapped in an `<a>`. A clickable card must not contain another link, button or other control: the stretched link covers it. A static card (no `href`, or an empty or unsafe one) has no stretch, so its excerpt and `actions` slot may contain links. With `href`, the heading needs an accessible name (text, or an image `alt` or `aria-label`); otherwise the link is hidden. `media-shape="circle"` draws the media as a centered circle, for a person or avatar. The image keeps its alt, and the count badge still sits on it. Any other shape is ignored. Regions are light-DOM children. Give `slot="media"`, `slot="badge"`, `slot="heading"`, `slot="meta"`, `slot="chip"` or `slot="actions"`; anything else (including text) is the excerpt. An image needs a real alt, or `alt=""` when the heading already names it. A date belongs in `<time>` in the meta slot. One element per chip. `actions` is a row of links or buttons on a static card (“Read the story”, “Photos (132)”). The heading level defaults like `<events-section>`: one below the nearest heading before the card, or 3 when there is none. `heading-level` (1–6) wins. An invalid value is ignored.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `href` | `string \| undefined` |  | Makes the card one link: the heading stretches over the card. Empty is not a link. |
| `media-shape` | `string` | `''` | `circle` crops the media to a centered circle and keeps the image alt. Anything else is ignored, with one console warning. |
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
| `actions` | Links or buttons on a static card. A clickable card must not contain them; the card link covers them. |
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

## `<uvalib-chip-group>`

A row of chips: a segmented control or single-select filter (`mode="single"`), filter chips that toggle (`mode="multi"`), or suggestion chips that go somewhere (`mode="links"`), as in a year rail with counts (“2005 213”), a sort toggle (“Most photos \| Date \| Title A–Z”) or “Try: snow on the Lawn”. Give the chips as children, `<button value="2005" data-count="213">2005</button>` (the value is the `value` attribute, else `data-value`, else the text; `disabled` disables), or `<a href>` in `links` mode, or set the `items` property (`{ value, label, count?, href?, disabled?, swatch? }`), which wins over the children while set. The chips follow later changes to the children. `single`: native radios drawn as chips, in a `role="radiogroup"` named by `label`. Tab enters the group at the selected chip, the arrow keys move and select (as any radio group), and `value` is the selected chip's value. `multi`: toggle buttons with `aria-pressed`, and `value` is an array (as an attribute, comma-separated). `links`: links, or buttons that fire `select`, with no selected state; a chip whose href is unsafe (`javascript:`) is plain text, and an empty href is a button. `data-swatch` (or `swatch` in `items`) is a CSS colour drawn as a small bordered square before the label, so the chips double as a chart's or map's colour key. It is decorative (`aria-hidden`) and never the only cue: the name stays the label. An invalid colour is ignored with one warning. In forced colors the square keeps its colour. A count is shown in a smaller muted span after the label and read as part of the name: “2005, 213 items”, with `count-label` in place of “items”. A selected chip is filled, keeps its border and shows a tick. Chips wrap on a narrow screen; `scroll` keeps them on one row that scrolls sideways, with its scrollbar shown and a fade at an edge with more chips. Each chip is a target at least 44px square. `segmented` joins the chips into one bar that does not wrap (a long label wraps inside its segment), like the header's Light / Dark / System control. `description` is a hint shown under the chips and tied to the group with `aria-describedby`, so it is read when focus enters the group (“Keyword matches your words…”). It is plain text in the element's own root, so it works in a closed shadow root. `url-param` (for example `year`) keeps the value in the address (`?year=2005`, a multi value comma-separated, inside the hash on a hash route). It is read on connect; the markup's `value` stands for the address without the parameter, and any other value is written, an empty one as `?year=`. Each change is one `pushState`: in `multi` at once, in `single` once the visitor settles (a second after the last change, so arrowing through a year rail adds one entry, none if it ends where it started). Back and Forward are followed and fire `change` with `restored: true`.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `mode` | `ChipGroupMode` | `'single'` | `single` (radios: one value), `multi` (toggles: an array of values) or `links`. |
| `label` | `string` | `''` | The group's accessible name (required), also the first part of the analytics name. |
| `description` | `string` | `''` | A hint shown under the chips and read with the group when focus enters it (`aria-describedby` on the group). Plain text. |
| `value` | `string \| string[]` | `''` | The selection: a chip's value in `single`, an array of values in `multi` (as an attribute, comma-separated). Setting it does not fire `change`. Unused in `links`. |
| `count-label` | `string` | `'items'` | The word after a count in each chip's accessible name: “2005, 213 items”. |
| `scroll` | `boolean` | `false` | One row that scrolls sideways instead of wrapping. |
| `segmented` | `boolean` | `false` | Join the chips into one segmented bar. |
| `url-param` | `string` | `''` | Query parameter that keeps the value in the address, for example `year` → `?year=2005`. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### CSS parts

| Part | Description |
|---|---|
| `swatch` | The colour square before a chip's label (`data-swatch`, `swatch`). |

### Events

| Event | Description |
|---|---|
| `change` | The visitor changed the selection (`single`, `multi`), or Back or Forward changed it through `url-param`: `detail` is `{ value, restored? }` (a string in `single`, an array in `multi`; `restored` is true for Back and Forward). Not fired when the app sets `value`. Bubbles and is composed. |
| `select` | `links` mode: a chip was chosen. `detail` is `{ value, href? }`. For a link, a plain primary click fires it cancelable: cancel it (`preventDefault()`) to route in the app, and the click's default is prevented too. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`, on the visitor's actions only: `['uvalib-chip-group', 'change', '<label>: <chip label>', <count>?]` (in `single`, one second after the last change, for the chip then selected; in `multi`, for the chip toggled), and `['uvalib-chip-group', 'select', '<label>']` in `links` mode (never the chip or its URL). The count is sent when it is a number. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-surface-raised` |  | Dark-mode role token: chip background (else #fff). |
| `--uva-color-control-border` |  | Dark-mode role token: chip border (else `--uva-grey`, #808080). |
| `--uva-color-link` |  | Dark-mode role token: chip text and hover border (else `--uva-brand-blue`). |
| `--uva-color-text-muted` |  | Dark-mode role token: the count and the description (else #4f4f4f). |
| `--uva-color-accent-bg` |  | Dark-mode role token: selected chip background and border (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Dark-mode role token: selected chip text (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-surface` |  | Dark-mode role token: the page background the scrolling row fades into at an edge with more chips (else #fff). |

## `<uvalib-combobox>`

An editable text field that suggests values as you type, from a local list or a URL: a person, place or subject picker. It follows the WAI-ARIA APG “Editable Combobox With List Autocomplete”: a real `<input role="combobox">` and a `role="listbox"` popup under it. Suggestions come from the `items` property (`{ value, label?, description?, disabled? }` objects, or strings), from `<option>` children (directly or inside a `<datalist>`; the `label` attribute or text is the label, `data-description` the second line), or from `src`, a URL template with `{q}` (fetched 250 ms after the last keystroke once the text has `min-length` characters, default 1; a newer keystroke aborts the older request; the response is a JSON array of the same shape, or anything `transform(data, query)` turns into one). `items` wins over the children while set. Local suggestions match anywhere in the label, ignoring case and accents, those starting with the text first, then those with a word starting with it; at most `max-results` (default 50, 0 for all) are shown, which keeps a list of 16,000 people fast. The matched text is bold and underlined in a `<mark>`. Keys: Down opens the list on the first suggestion and moves (wrapping), Up opens on the last, Alt+Down opens without moving, Alt+Up closes, Enter chooses the active suggestion (and then does not submit the form; with none active, Enter submits as in any field), Escape closes the list and a second Escape clears the field, Home, End, Left and Right move the caret, and Tab leaves without choosing. A real clear button (“Clear <label>”, 44px, shown only with text) empties the field and returns focus to it. Free text is allowed: `value` is whatever is in the field, and `selected` the chosen suggestion (or null); typing after choosing clears it, and leaving the field with text that is exactly one suggestion's label chooses it. `must-choose` makes any other text invalid (“Choose one of the suggestions.”). The element is form-associated: with `name` it submits the chosen suggestion's value, or else the text, and a form reset restores the `value` attribute. `required` and `disabled` (also from a disabled fieldset) work as on an input. A polite status says “5 suggestions”, “50 of 1,234 suggestions”, “No suggestions”, “Loading suggestions” or “Couldn't load suggestions” half a second after the list settles (never on the first render); the popup shows the same notes visibly. A failed load never throws. Before it upgrades, `base.css` shows the label (from the attribute) and holds the field's height. A fallback `<input list>` child works as a plain field meanwhile; on upgrade its text, `name` and `placeholder` carry over, and it is disabled so it does not submit twice.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `''` | The field's visible label (required); also the analytics name. |
| `description` | `string` | `''` | A hint under the field, read with it (aria-describedby). |
| `placeholder` | `string` | `''` |  |
| `name` | `string` | `''` | The form field name. |
| `value` | `string` | `''` | The text in the field. The attribute is the starting text, and what a form reset restores. Setting it does not fire `change`. |
| `src` | `string` | `''` | A URL template with `{q}` (the trimmed text, URL-encoded) that returns suggestions as JSON. |
| `min-length` | `number` | `1` | Characters typed before suggestions appear (and `src` is fetched). |
| `max-results` | `number` | `50` | The most suggestions shown at once; 0 for all. |
| `must-choose` | `boolean` | `false` | Text that is not one of the suggestions is invalid. |
| `required` | `boolean` | `false` |  |
| `disabled` | `boolean` | `false` |  |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### CSS parts

| Part | Description |
|---|---|
| `label` | The visible label. |
| `input` | The text field. |
| `clear` | The clear button. |
| `popup` | The popup under the field. |
| `option` | Each suggestion. |
| `description` | The hint under the field. |

### Events

| Event | Description |
|---|---|
| `type` |  |
| `input` | The text changed by typing (the native event of the field, composed). Not fired when an option is chosen. |
| `select` | A suggestion was chosen (click or Enter). `detail` is `{ item }`, the object given. Bubbles and is composed. |
| `change` | The value was committed: a suggestion chosen, the field cleared, or the field left with changed text. `detail` is `{ value, item }` (`item` is the chosen suggestion or null). Not fired when the app sets `value` or `selected`. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['uvalib-combobox', 'select', '<label>', <position from 1>]` when a suggestion is chosen, `['uvalib-combobox', 'clear', '<label>']` when the clear button or Escape empties the field, and `['uvalib-combobox', 'error', 'load']` once when `src` fails. Never the typed text or a suggestion's text or value. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-surface-raised` |  | Dark-mode role token: field and popup background (else #fff). |
| `--uva-color-control-border` |  | Dark-mode role token: field and popup border (else `--uva-grey`, #808080). |
| `--uva-color-input-text` |  | Dark-mode role token: field and suggestion text (else #2b2b2b). |
| `--uva-color-text-muted` |  | Dark-mode role token: descriptions, notes and the clear icon (else #4f4f4f). |
| `--uva-color-surface-hover` |  | Dark-mode role token: active suggestion background (else #dadada). |
| `--uva-color-track` |  | Dark-mode role token: hovered suggestion background (else #f1f1f1). |
| `--uva-color-accent-bg` |  | Dark-mode role token: the active suggestion's bar and outline (else `--uva-brand-blue`). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-shadow` |  | Dark-mode role token: popup shadow. |

## `<uvalib-contents>`

Sub-navigation or a table of contents, as library.virginia.edu's sub-navigation: a `<nav>` landmark (named by `label`, "Contents" by default) with the label as a visible headline, and a nested list of links with dividers between the top-level entries and a bar beside each nested level. Give the list as a child: an `<ol>` or `<ul>` of `<li>` elements, each with an `<a href>` (or plain text for a group label) and, for sub-entries, a nested `<ol>`/`<ul>`, to any depth. Other children (a heading) are ignored. The list follows changes to the children. Apps set the `items` property instead (`{ label, href?, children? }`, winning over the children while set). The current entry gets `aria-current`: `page` for the link to this page, `location` for the link to the section of it in the URL's hash. It is found from the page URL (path, and hash for in-page sections), followed through same-document navigations (`hashchange`, `popstate` and the Navigation API), or from the `current` attribute (a URL, resolved like the links). An entry whose href has a query string matches only that query (`?part=2`); one without matches the page whatever its query. Hash-only hrefs are places on that page. With `current` unset, a valid `aria-current` on a source link (`page`, `location` or `true`) is used instead, the first of each kind. `lang` and `dir` on the source links and items, and inline markup in their text (`em`, `cite`, `code`, `abbr`…, copied element by element, never as HTML), are kept. On narrow screens the list collapses into a disclosure: the headline becomes a button with `aria-expanded`, and the list starts closed (as the Electronic Text Collections' Contents does on phones, so the text comes first) until the reader opens it, or while the `open` attribute is set; opening it shows the current entry. Narrow means the viewport (`collapse-below`, 64rem by default), not the element's own width: a contents sidebar is always far narrower than 64rem, so a container query could not tell a phone from a desktop. `sticky` keeps it in view in a sidebar on wide screens; a list longer than the window then scrolls, and the current entry is scrolled into view inside it (never the page). A table of contents for a long document: `headings-from="#article"` builds the list from the headings in that element (`levels`, `2-3` by default; nothing shown below `min` top-level entries, 2 by default). Headings without text or hidden with `aria-hidden` are skipped; one without an id gets one from its text (`budget-report`, then `budget-report-2`), and existing ids are kept, so links to sections keep working. It follows headings added, removed or retitled; `refresh()` reads them again after other changes. The children and `items` win while they give a list. Without JavaScript there is no list: a list rendered at build time, as children, works everywhere. Single-page apps: the list is drawn from copies of the children, so a router's own click handlers on them do not run. Listen for `uvalib-contents-navigate` and cancel it to route in place; hash links need nothing.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` |  | `DEFAULT_LABEL` | Accessible name of the navigation landmark, and its visible headline. |
| `heading-level` |  | `DEFAULT_LEVEL` | The headline's level (2 to 6), for the page's outline. |
| `current` | `string \| undefined` |  | The URL of the current entry (resolved like the links), for apps whose route is not the page URL. Unset: the page URL, followed through same-document navigations. |
| `collapse-below` |  | `DEFAULT_COLLAPSE` | The viewport width at and below which the list collapses into a disclosure: a CSS length (`64rem`, `800px`). `0` or `none` never collapses. |
| `open` | `boolean` | `false` | Whether the collapsed disclosure is open (no effect on wide screens). Toggled by its button. |
| `sticky` | `boolean` | `false` | Keep it in view while the page scrolls (a sidebar), on wide screens. |
| `headings-from` | `string \| undefined` |  | Build the list from the headings in the element this selector names (`#article`): each heading at `levels` gets an entry linking to it (an id is added when it has none), the lower levels nested under the heading before them. The children and `items` win while they give a list. |
| `levels` |  | `DEFAULT_LEVELS` | With `headings-from`: the heading levels to list, `2-3` (the default) or one level, `2`. |
| `min` |  | `DEFAULT_MIN` | With `headings-from`: the fewest top-level entries worth a list (default 2). With fewer, nothing is shown. |
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

## `<uvalib-date-histogram>`

Monthly, yearly or per-decade counts as bars: a date distribution for a search page, an archive timeline or a card. Give `items` (`{ date, count }`, `date` a `YYYY` or `YYYY-MM`) or a child `<table>` (the no-JS fallback). `granularity="month"` draws twelve bars for every year from the first date to the last, including months with a count of zero. A year-only count in a month chart, a day, or any other date is a chip beside the chart. `granularity="decade"` is for a long span (two centuries of minutes): one bar per decade ("1810s: 22 meetings"), an empty decade a gap, five decades to a row labelled with its first year (1800, 1850, …), the decades lined up in columns. Choosing a decade selects its first to last year (`selected="1810/1819"`, `select` `{ from: '1810-01-01', to: '1819-12-31' }`); up and down arrows move 50 years. `granularity="auto"` draws months when every count is a month within 3 years (at most 36 bars), years up to 30 years, and decades beyond. A year row that scrolls sideways is not offered: 200 years at the 24px minimum bar is over 5,000px, so a sidebar would show ten years at a time and lose the shape that decades show whole. Each bar is a button named like "October 2015: 5,311 photos". Arrow keys move between bars; Enter or Space selects. `selected` is one bucket (`2015-10`, `2015`) or a range (`2015-03/2016-01`, also `..` or an en dash). The selection is `aria-pressed`, an inset ring and a stripe, not colour alone. Choosing a bar fires `select` with `{ from, to }` as ISO dates (a month runs from its first day to its last). Choosing the selected bar again clears it (`from` and `to` are empty strings). `range-for` is the id of a `<uvalib-date-range>`. A bar click sets that element's `value`. Whenever the range's value changes, from its controls or set in script (a Clear button, Back/Forward, a restored URL), this element highlights the buckets that overlap it (it listens for `uvalib-date-range-value`). A value that is exactly the range's own `min` and `max` is no selection. On connect or reconnect, or when the range is added later, the range's value wins when it holds a selection or changed while this element was away; otherwise `selected` is written to it. A range value is never rounded to whole buckets and written back. Setting `selected` here updates the date range. `variant="strip"` is the small per-year row for a card: not interactive, `role="img"`, one bar per year, or per decade with `decade` (or `auto` over more than 30 years). The chart reserves its height before the counts arrive: one bar track, or one track per year (per half-century for decades) when those years are already known from the data, a linked date range or the table (`--uvalib-date-histogram-bar-size`, 8rem, plus the row gap). Filling the bars in does not move the page. On a narrow screen a month row scrolls inside the component; "Scroll sideways to see more." shows while it overflows. Years wrap; a decade row fits 320px.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `items` | `HistogramItem[]` | `[]` | Counts to draw. When non-empty, wins over the child table. Set a new array to update. |
| `granularity` | `'year' \| 'month' \| 'decade' \| 'auto'` | `'month'` | `month` (twelve bars per year), `year`, `decade` (one bar per decade, five to a row), or `auto`: months when every count is a month within 3 years, years up to 30 years, else decades. Anything else is month, with one console warning. |
| `scale` | `'linear' \| 'log'` | `'linear'` | `log` scales bar height by log(count + 1). Anything else is linear. |
| `selected` | `string` | `''` | One bucket (`2015-10` or `2015`) or a range (`2015-03/2016-01`). A linked date range writes a range here. Empty when nothing is selected. |
| `range-for` | `string` | `''` | Id of a `<uvalib-date-range>` to keep in step with, both ways. |
| `variant` | `string` | `''` | `strip`: a non-interactive per-year row (`role="img"`). Anything else is the bar chart. |
| `unit` | `string` | `'items'` | Word after the count in each bar's name. Plural; a count of one drops a trailing s. |
| `label` | `string` | `'Dates'` | Accessible name of the bar group, and the start of the strip's summary. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Slots

| Slot | Description |
|---|---|
| (default) | A `<table>` of dates and counts: two columns (date, count) or a year-by-month grid. Without JavaScript it is the fallback. With JavaScript it supplies the counts when `items` is empty. Show as table lists those counts, including odd dates; once `items` is set it lists `items` instead. |

### CSS parts

| Part | Description |
|---|---|
| `chart` | The bar chart (shadow mode). |
| `bar` | A bar button, or a strip segment (shadow mode). |
| `table` | The generated table in Show as table (shadow mode). |

### Events

| Event | Description |
|---|---|
| `select` | A bar or an odd-date chip was chosen, or the current one chosen again to clear it. `detail` is `{ from, to }` (ISO dates, or the odd token). Empty strings clear the selection. Not fired when `selected` is set in script or when a linked date range changes. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['uvalib-date-histogram', 'select', '<from>–<to>']` when both ends are ISO dates, or `'other'` for any other choice. Not fired when the selection is cleared, set in script, or restored from a date range. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uvalib-date-histogram-bar-size` | `8rem` | Height of each bar track. The chart reserves one track, or one per known year, before the counts arrive. |
| `--uvalib-date-histogram-strip-size` | `1.5rem` | Height of `variant="strip"`. |
| `--uva-brand-blue` | `#232d4b` | Bar fill. |
| `--uva-brand-orange` | `#e57200` | Focus ring when `--uva-color-focus` is unset. |
| `--uva-font-family` | `inherit` | Font family. |
| `--uva-color-accent-bg` |  | Dark-mode role token: bar fill (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Dark-mode role token: the selection stripe (else #fff). |
| `--uva-color-text` |  | Dark-mode role token: labels and the selection ring (else #2b2b2b). |
| `--uva-color-text-muted` |  | Dark-mode role token: the scroll hint (else #4b5563). |
| `--uva-color-track` |  | Dark-mode role token: the empty part of a bar (else #e5e7eb). |
| `--uva-color-surface` |  | Dark-mode role token: the sticky year label (else #fff). |
| `--uva-color-surface-raised` |  | Dark-mode role token: odd-date chips (else #fff). |
| `--uva-color-control-border` |  | Dark-mode role token: bar, chip and table borders (else #808080). |
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
| `uvalib-date-range-value` | The selected range changed for any reason: a slider, a date input, or `value`, `min` or `max` set in script (a Clear button, Back/Forward, a restored URL). `detail` is `{ value: [start, end] }`, the range as shown (ISO dates inside `min`..`max`). For keeping other components in step; it is not a visitor action, so it is never sent to analytics. Not fired for the first render or when the shown range is unchanged. Bubbles and is composed. |
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

## `<uvalib-filter-drawer>`

A search page's form and filters: a plain sidebar on wide screens, and on narrow ones a “Search and filters” button that opens them in a modal panel from the side. Put the page's search form, `<uvalib-filter>`s and other facets inside. Above `breakpoint` (default `48rem`) they are shown as written: no button, no dialog role. At and below it only the button is shown; it opens a native `<dialog>` (`showModal()`) with a visible heading (the `label`) and a 44px Close button, which takes focus. Escape, Close and a click on the backdrop close it, and focus returns to the button; widening the window past the breakpoint closes it and keeps focus where it was. While it is open the rest of the page, including `<site-page>`'s header, skip link and alerts, is inert (the browser's modal dialog), so focus cannot leave it except to the browser itself, and nothing else is announced. The children are the same nodes in both layouts (moved, never re-created): typed text, checked boxes, listeners and each filter's state are kept. Inert content is not announced, so results counts and status notices outside the panel would go silent while the visitor filters: name them in `live` (space-separated ids) and the drawer repeats what they announce in its own polite live region while it is open. `count` (the page's number of active filters) is shown on the button when above 0. The drawer never counts by itself: only the page knows which inputs are filters.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` |  | `DEFAULT_LABEL` | The button's text, the panel's heading and the dialog's name. |
| `breakpoint` |  | `DEFAULT_BREAKPOINT` | The widest viewport that gets the button and panel (`48rem`, `768px`); wider gets the sidebar. |
| `count` | `number` | `0` | Active filters, set by the page; shown on the button when above 0. |
| `live` | `string` | `''` | Space-separated ids of live regions outside the drawer (a results count, a status notice) to keep announcing while the panel is open. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Slots

| Slot | Description |
|---|---|
| (default) | The search form and filters. Shown as the sidebar on wide screens and inside the panel on narrow ones. |

### CSS parts

| Part | Description |
|---|---|
| `toggle` | The “Search and filters” button (narrow screens only). |
| `count` | The number of active filters on the button. |
| `sidebar` | The wrapper of the children on wide screens. |
| `dialog` | The `<dialog>` panel. |
| `header` | The panel's heading row. |
| `heading` | The panel's heading. |
| `close` | The Close button. |
| `body` | The wrapper of the children, in the sidebar or the panel. |

### Events

| Event | Description |
|---|---|
| `close` | The panel closed (Close, Escape, the backdrop, `close()`, or the window widening past the breakpoint). Does not bubble. |
| `open` | The panel opened. Does not bubble. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['uvalib-filter-drawer', 'open', '<label>']` when the visitor opens the panel, and `['uvalib-filter-drawer', 'close', '<label>']` when they close it (Close, Escape or the backdrop; not when the window widens or a script closes it). Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uvalib-filter-drawer-width` | `min(24rem, 100% - 3rem)` | The panel's width. |
| `--uva-color-surface` |  | Dark-mode role token: panel background (else #fff). |
| `--uva-color-text` |  | Dark-mode role token: panel text (else #2b2b2b). |
| `--uva-color-border` |  | Dark-mode role token: panel edge and heading rule (else #dadada). |
| `--uva-color-button-bg` |  | Dark-mode role token: button border and text, the count's background (else `--uva-blue-alt`, #007bac). |
| `--uva-color-button-hover-bg` |  | Dark-mode role token: hovered button (else `--uva-blue-alt-A`, #005679). |
| `--uva-color-button-text` |  | Dark-mode role token: the count's text (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

## `<uvalib-image-regions>`

An image with numbered region outlines (people, objects, inscriptions) and a list of the same regions beside it (under it on a narrow screen). The list is the way in: the outlines are a visual aid, hidden from assistive technology and not in the tab order, so no region is a second tab stop. Hovering or focusing a list entry (or anything in it) highlights its region with a thicker double outline and its label, and dims the others; hovering a region highlights its entry. Clicking a region moves focus to its entry. The image: an `<img>` (or `<picture>`) child, which keeps its `alt`, or `src` and `alt`. Give it `width` and `height` so its space is reserved before it loads. The regions: an `<ol>` child whose `<li>` items carry `data-xywh` (IIIF / Media Fragments: `percent:10,20,30,40`, or pixels `160,120,320,240` of the image's natural size). The list is shown as written, so it works before the component loads or without JavaScript, and any links and buttons in it stay the page's own (their events are the page's). Or set the `items` property, and the component draws the list. Region numbers are the list's numbers, from 1 (or the `<ol>`'s `start`).

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `src` | `string` | `''` | Image URL, when there is no `<img>` child. |
| `alt` | `string` | `''` | The image's alternative text (with `src`). |
| `width` | `number \| undefined` |  | The image's width (with `src`), reserving its space. |
| `height` | `number \| undefined` |  | The image's height (with `src`). |
| `image-width` | `number \| undefined` |  | The size pixel regions are measured in, when it is not the image's natural size (for example a IIIF derivative of a larger original: the original's width and height). |
| `image-height` | `number \| undefined` |  | The height pixel regions are measured in (with `image-width`). |
| `label` | `string` | `'Regions'` | The list's heading, and the analytics name. |
| `heading-level` | `number \| undefined` |  | The heading's level (2 to 6). Default: one below the heading before the element. |
| `numbering` | `'numbers' \| 'none'` | `'numbers'` | `numbers` (default) shows each region's number on its outline; `none` hides them. |
| `hide-outlines` | `boolean` | `false` | Hide the outlines (the list stays). |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Slots

| Slot | Description |
|---|---|
| (default) | The region list (`<ol>` with `<li data-xywh>`), shown as written. Not used with `items`. |
| `image` | The image. A first `<img>` or `<picture>` child is put here by itself. |

### CSS parts

| Part | Description |
|---|---|
| `layout` | The grid holding the image and the list. |
| `media` | The image and its overlay. |
| `overlay` | The outlines over the image (`aria-hidden`). |
| `region` | One outline. |
| `list` | The heading and the list. |

### Events

| Event | Description |
|---|---|
| `highlight` | The highlighted region changed by hover or focus: `detail` is `{ item, index }` (`item` null and `index` -1 when none is). Bubbles and is composed. |
| `select` | A region's outline was clicked (focus moved to its list entry): `detail` is `{ item, index }`. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['uvalib-image-regions', 'select', '<label>', <number>]` when an outline is clicked (the list's `label`, and the region's number from 1). Never a region's label (it may be a person's name). Nothing on hover or focus. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-text` |  | Dark-mode role token: text (else `--uva-grey-darkest`). |
| `--uva-color-surface-hover` |  | Dark-mode role token: the highlighted entry's tint (else #f1f1f1). |
| `--uva-color-link` |  | Dark-mode role token: entry links (else `--uva-brand-blue`). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-text-muted` |  | Dark-mode role token: descriptions (else #4b5563). |

## `<uvalib-lightbox>`

An accessible image viewer over a set of plain links. With JavaScript a primary click opens a modal dialog; without it (or with a modified click) the link opens the image as before. Wrap the links, or point at them with `selector` (for example `a.pb-image` on a reading page). There is no autoplay and no carousel. The dialog is labelled by the caption (`data-caption`, else the image alt, else the link text). Focus moves to Close on open and back to the trigger on close. Escape and a click on the backdrop close it. With more than one image, Previous and Next and the arrow keys move through the set (wrapping), and a polite “3 of 13” counter is shown. Full size opens the original image in a new tab. A IIIF Image API URL keeps its region; only the size becomes `!W,H` for the viewport. TIFF and JPEG2000 URLs are left as written. `url-param` (for example `photo`) keeps `?photo=<id>` in sync, including on a hash route (`#/text?photo=<id>`): opening pushes a history entry, stepping replaces it, and Back closes. Optional details: children with `slot="details"` (and `data-for` equal to the item's id or its position from 1; without `data-for` they show for every image), or `data-details-id` on a link pointing at an element elsewhere on the page. Either is shown inside the dialog and put back when the viewer moves on or closes. Optional regions (people, objects, inscriptions): `data-regions` on a link, a JSON array of `{ label, x, y, w, h, unit? }` or `xywh` values each followed by its label, separated by `;` (`percent:10,20,30,40 Person 1; percent:55,15,20,30 Sign`), or the `regions` callback. The open image then shows numbered outlines (`<uvalib-image-regions>`, loaded on first use) and a list of the regions beside it, with a "Show regions" toggle (`aria-pressed`) that hides the outlines. Pixel regions are measured in `data-image-width` × `data-image-height` when set (the viewer shows a resized IIIF image), else in the image's natural size. Or the page's own list, with its own buttons: `data-regions-list="<id>"` on a link (or the `regionsList` callback) names an `<ol>` or `<ul>` of `<li data-xywh>` anywhere in the page, usually `hidden`. While that image is open the list (the same nodes, so the page's listeners keep working) is the region list: in shadow mode it becomes a child of the lightbox slotted into the viewer, not moved into the shadow root, so the page's CSS still applies to it. When the image changes or the viewer closes it goes back where it was, `hidden` as before. It wins over `data-regions`.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `selector` | `string` | `''` | CSS selector for image links elsewhere in this root (the page, or the shadow root the component sits in). Combined with any links inside the component. Example: `a.pb-image`. |
| `url-param` | `string` | `''` | Query parameter kept in sync with the open image, for example `photo` → `?photo=<id>`. The id is the link's `data-id`, else its `id`, else the IIIF identifier, else its position from 1. On a hash route the parameter is written inside the hash. Empty: no deep link. |
| `regions-label` | `string` | `'Regions'` | The heading of the regions list (for example `People`). |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Slots

| Slot | Description |
|---|---|
| (default) | The image links. A plain click opens the viewer; without JavaScript they open the image. |
| `details` | Details for the open image. `data-for` selects one item by its id or position (from 1); without it the details show for every image. |

### CSS parts

| Part | Description |
|---|---|
| `dialog` | The modal dialog. |
| `panel` | The surface inside the dialog. |
| `caption` | The caption that names the dialog. |
| `image` | The image. |
| `controls` | Previous, Next, the counter and Full size. |
| `details` | The details panel. |
| `regions` | The `<uvalib-image-regions>` around an image with regions. |

### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: `['uvalib-lightbox', 'open'\|'next'\|'previous'\|'full-size', 'image N', N]` (N from 1, the image's place in the set). Never the URL or the caption. Not fired for a viewer restored from the URL or from Back and Forward. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-surface-raised` |  | Dark-mode role token: dialog surface (else `--uva-color-surface`, else #fff). |
| `--uva-color-surface` |  | Dark-mode role token: the figure behind the image (else #fff). |
| `--uva-color-text` |  | Dark-mode role token: text (else `--uva-grey-darkest`). |
| `--uva-color-shadow` |  | Dark-mode role token: the backdrop scrim (else rgba(16, 23, 43, 0.72)). |
| `--uva-color-border` |  | Dark-mode role token: dialog border (else `--uva-grey-100`). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-link` |  | Dark-mode role token: Full size text when it is not the filled control (else `--uva-brand-blue`). |
| `--uva-color-accent-bg` |  | Dark-mode role token: Close and Full size background (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Text on those controls (else #fff). |
| `--uva-brand-orange` | `#e57200` | Focus ring when `--uva-color-focus` is unset. |
| `--uva-brand-blue` | `#232d4b` | Control background when `--uva-color-accent-bg` is unset. |
| `--uva-grey-darkest` | `#2b2b2b` | Text when `--uva-color-text` is unset. |
| `--uva-grey-100` | `#dadada` | Border when `--uva-color-border` is unset. |

## `<uvalib-map>`

A map of places with a linked list of the same places: buildings, rooms or outdoor spaces, each a marker sized by a count, with a link to the place's page. It wraps [Leaflet](https://leafletjs.com) 1.9, which the page provides (the library never bundles it): set the `leaflet` property to the Leaflet module (`import * as L from 'leaflet'`), or load leaflet.js so that `window.L` exists. Without Leaflet only the list is shown, with one console warning. Leaflet's leaflet.css is optional: the element carries the layout rules it needs, in shadow DOM and light DOM alike. Places come from `items` (`{ id?, name, lat, lng, count?, href?, description? }`) or from a child `<ul>`/`<ol>` of `<li><a href data-lat data-lng data-count>Name</a></li>`, which is the list before the script runs (and without it). The list always stays, under the map: it is the text equivalent. Each marker is a real link (a button when the place has no `href`) named like "The Rotunda, 2,702 photos" (`count-label` is the noun), sized by the square root of its count (a 24 to 56px dot in a hit area of at least 44px). Tab or the arrow keys move between markers, Enter follows the link (or chooses the place), and Escape hides the tooltip. Hovering or focusing a marker shows a tooltip with its name and count and highlights its list entry; hovering or focusing a list entry highlights its marker (a ring and a larger dot, not colour alone) and brings it into view. Markers whose 44px targets would overlap at the current zoom are drawn as one group marker (regrouped after every zoom and resize): a button showing how many places it holds, sized by their summed count and named like "The Rotunda and 2 more places, 3,610 photos" (the largest place's name; `place-label` is the noun). Choosing it zooms in until its places part; when they cannot (one point, or the maximum zoom) it spreads them in a ring around it instead, with focus on the first; Escape or a zoom closes the ring and focus returns to the group. The arrow keys move between the markers shown (a group is one); a place in the list that is in a group highlights the group, whose tooltip names the place. The map is a region named by `label`, after a "Skip map, go to the list" link and a line of key instructions. It opens on the bounds of the places, or on `center` and `zoom`. The zoom buttons are 44px with a visible focus ring; the attribution stays. Tiles come from `tile-url` (OpenStreetMap by default: low-traffic use only) with `attribution`. In the page's dark mode the tiles are inverted with a CSS filter (`--uvalib-map-dark-filter`) unless `dark-tile-url` gives dark tiles; markers and controls are never filtered. With `prefers-reduced-motion` nothing animates.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `items` | `MapItem[]` | `[]` | The places. When non-empty, wins over the child list. Set a new array to update. |
| `label` | `string` | `''` | The map's name (required): the region's label, the list's label and the analytics name. |
| `count-label` | `string` | `'items'` | The noun after each count, plural ("photos"); a count of one drops a trailing s. |
| `place-label` | `string` | `'places'` | The noun for places in a group's name, plural: "The Rotunda and 2 more places" (one drops a trailing s: "and 1 more place"). For example "rooms". |
| `tile-url` |  | `OSM_TILE_URL` | The tile URL template (`{z}/{x}/{y}`, optionally `{s}` and `{r}`). |
| `dark-tile-url` | `string` | `''` | Tiles for the page's dark mode. Without it, dark mode filters the light tiles instead. |
| `attribution` |  | `OSM_ATTRIBUTION` | The tiles' attribution, as HTML. Required by most tile sources; always shown. |
| `center` | `string` | `''` | Where the map opens, `"lat,lng"`. Without it the map fits every place. |
| `zoom` | `number \| undefined` |  | The opening zoom level (with `center`, or centred on the places). |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Slots

| Slot | Description |
|---|---|
| (default) | A `<ul>` or `<ol>` of places: each `<li>` holds an `<a href>` (or the `<li>` itself) with `data-lat`, `data-lng` and optionally `data-count`, `data-id` and `data-description`. Used when `items` is empty; without JavaScript it is the list. |

### CSS parts

| Part | Description |
|---|---|
| `map` | The map region (the Leaflet container). |
| `instructions` | The line of key instructions above the map. |
| `list` | The list of places. |
| `place` | Each list entry. |

### Events

| Event | Description |
|---|---|
| `select` | A place's marker was chosen (click, Enter or Space); never a group's. `detail` is `{ item }`. Cancelable: for a place with `href`, `preventDefault()` keeps the page from following the link. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['uvalib-map', 'select', '<label>', <position from 1>]` when a place's marker is chosen, `['uvalib-map', 'expand', '<label>', <places in it>]` when a group is chosen (it zooms in or opens its ring), and `['uvalib-map', 'zoom', '<label>', <zoom level>]` 1 s after the last zoom-button press. Never a place's name, coordinates or URL. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uvalib-map-height` | `min(24rem, 75vw)` | Height of the map. |
| `--uvalib-map-dark-filter` | `invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9)` | The filter on the tiles in dark mode, when there is no `dark-tile-url`. |
| `--uva-brand-blue` | `#232d4b` | Marker fill. |
| `--uva-brand-orange` | `#e57200` | Focus ring when `--uva-color-focus` is unset. |
| `--uva-font-family` | `inherit` | Font family. |
| `--uva-color-accent-bg` |  | Dark-mode role token: marker fill (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Dark-mode role token: marker border (else #fff). |
| `--uva-color-text` |  | Dark-mode role token: text and the highlight ring (else #2b2b2b). |
| `--uva-color-text-muted` |  | Dark-mode role token: instructions and descriptions (else #4b5563). |
| `--uva-color-link` |  | Dark-mode role token: links (else `--uva-brand-blue`). |
| `--uva-color-surface` |  | Dark-mode role token: attribution background and the highlight ring's gap (else #fff). |
| `--uva-color-surface-raised` |  | Dark-mode role token: zoom buttons, tooltip and list entries (else #fff). |
| `--uva-color-surface-hover` |  | Dark-mode role token: hovered zoom button (else #dadada). |
| `--uva-color-track` |  | Dark-mode role token: the map before tiles load, and count badges (else #e5e7eb). |
| `--uva-color-control-border` |  | Dark-mode role token: borders (else #808080). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-shadow` |  | Dark-mode role token: control and tooltip shadow. |

## `<uvalib-metadata>`

A record's details as a description list, as on the library's digital collections: label and value side by side on wide screens (the element's own width, 36rem and up), stacked on narrow ones. Values may be text, links or lists (subjects). Give the rows as a `<dl>` child (so the page reads the same before the script loads): `<dt>` labels and `<dd>` values, optionally wrapped in a `<div>` per row; several `<dd>` after one `<dt>` are several values. The values are copied as written (links, lists, `download` attributes kept); a link with `data-size="184 KB"` is shown as a download, "EPUB · 184 KB". The list follows changes to the children. Apps set the `items` property instead (`{ label, value }`, winning over the children while set). Built-in rows for credit and rights (as Special Collections asks): `creator` and `organization` come first; `rights` (a rightsstatements.org or Creative Commons URL, shown as its short name linked to it, or plain text) and `citation` ("How to cite", with a Copy citation button that announces "Copied" politely) come last. `citation-title` builds the Special Collections citation, "<title>, Albert and Shirley Small Special Collections Library, University of Virginia". Long lists: `list-limit="8"` shortens every value that is a list (a `<ul>`/`<ol>` in the `<dd>`) of more than 8 items to its first 8 and a “Show all 34 participants” button (`aria-expanded`, `aria-controls`) that reveals the rest in place and moves focus to the first one; it then reads “Show fewer”. `data-limit` on a `<dd>` or its list sets that row's own limit (`0`: none); the noun is the label with a lowercase first letter, or `data-limit-label`. Every value stays in the markup (the hidden ones `hidden`).

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
| `list-limit` | `number \| undefined` |  | Shorten every list value of more than this many items to its first ones and a “Show all N” button. Zero or empty shows every item. A row's `data-limit` wins. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: the Copy citation button, `['uvalib-metadata', 'copy-citation']`, and a list's toggle, `['uvalib-metadata', 'show-all'\|'show-fewer', 'row N']` (N from 1, the row's place in the list; never its label or values). Downloads are left to Matomo's own download tracking. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-blue-alt-dark` | `#005679` | Link colour. |
| `--uva-grey-darkest` | `#2b2b2b` | Value colour. |
| `--uva-color-utility-link` |  | Dark-mode role token: link colour (else `--uva-blue-alt-dark`). |
| `--uva-color-text` |  | Dark-mode role token: value colour (else `--uva-grey-darkest`). |
| `--uva-color-text-muted` |  | Dark-mode role token: label and status colour (else #4b5563). |
| `--uva-color-border` |  | Dark-mode role token: row dividers (else #dadada). |
| `--uva-color-link` |  | Dark-mode role token: the buttons' text and the Copy citation button's border (else `--uva-brand-blue`). |
| `--uva-color-surface-raised` |  | Dark-mode role token: the button's background (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

## `<uvalib-pagefind-search>`

Pagefind's default search UI (`PagefindUI`, from the site's own Pagefind bundle) with the library's defaults and the accessibility fixes that need script. Use it with pagefind.css, in place of Pagefind's pagefind-ui.css. It renders in light DOM, so the page's styles reach Pagefind's markup. It loads `<bundle-path>pagefind-ui.js` unless `window.PagefindUI` already exists. What it adds to the stock UI: a visible `<label>` for the field (the stock field is named only by its title); a polite status region that announces the result count ("12 results for virginia") once results settle (the stock message is not a live region); focus kept in the field after Clear or Escape (the stock UI blurs it, dropping focus to the page) and moved to the first new result after "Load more results"; the loading placeholders' dots hidden from screen readers; `?q=` read at start (and on Back and Forward) and the settled query written back with `history.replaceState`, so a search can be shared; and reports to `<site-analytics>`. The `ui` property is the `PagefindUI` instance (for `triggerFilters`), and `ready` resolves with it. Attributes are read once, when the element is first connected.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `bundle-path` | `string` | `/pagefind/` | The Pagefind bundle's URL path, ending in `/`. |
| `merge-index` | `string` |  | JSON array of more indexes to search together: `[{"bundlePath": "/pagefind/s1/"}]`. |
| `page-size` | `number` | `10` | Results shown before "Load more results". |
| `excerpt-length` | `number` |  | Words per excerpt (Pagefind's default: 30, or 12 with sub-results). |
| `show-sub-results` | `boolean` |  | Also list the matching sections of each page. |
| `show-images` | `boolean` |  | Show each result's `image` metadata (off by default). |
| `placeholder` | `string` | `Search` | The field's placeholder. |
| `label` | `string` |  | The field's visible label. Empty (the default) uses the placeholder. |
| `label-hidden` | `boolean` |  | Keep the label for screen readers only. |
| `translations` | `string` |  | JSON of Pagefind UI strings to override (`{"zero_results": "…"}`). |
| `options` | `string` |  | JSON of any other `PagefindUI` options (`{"openFilters": ["author"]}`), applied last. |
| `query-param` | `string` | `q` | The URL parameter that holds the query; empty turns it off. |

### Events

| Event | Description |
|---|---|
| `search-results` | Results settled: `detail` is `{ query, count }`; `{ query: '', count: 0 }` when the field is emptied after a search. Does not bubble. |
| `uvalib-analytics-search` | For `<site-analytics>`: the settled query, category `Pagefind` and its result count, once per query and filter set. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: `['uvalib-pagefind-search', 'filter-change', '<filter>: <value>', 1 \| 0]` (checked or unchecked), and `['uvalib-pagefind-search', 'error', 'load']` if Pagefind cannot be loaded. Bubbles and is composed. |

## `<uvalib-pager>`

Previous/next section links, as on a reading page, or a numbered page list. Previous/next: set `prev-href` and `next-href` (either may be omitted). Each link shows a “Previous” or “Next” kicker and, when `prev-label` or `next-label` is set, that title. A visually hidden “: ” sits between them, so the accessible name is punctuated even when CSS is off. A long title truncates visually; the full text stays in the accessible name. The links use `rel="prev"` and `rel="next"`. With neither href, nothing is rendered. Numbered pages: set `pages` (a positive count). `page` is the current page, clamped to `1…pages`. Each link’s href comes from `href-template`, which must contain `{page}` (the default is `?page={page}`). The current page is text with `aria-current="page"`, not a link. Long ranges collapse to the first page, a window around the current page, the last page, and an ellipsis where numbers are skipped. `pages` wins when previous/next attributes are also set, with one console warning. Load more: `mode="load-more"` shows a “Load more” button and “Showing N of M” (`shown` of `total`), or “Showing N” when `total` is unset or 0 (ranked search often cannot know it). It wins over numbered pages and previous/next, with one warning when those are also set. The button is not a link and the control is a group, not a navigation landmark. Once `has-more` has been set (the attribute, or the `hasMore` property), it alone decides whether the button shows: present (or `hasMore = true`) shows it; removed, `has-more="false"` or `hasMore = false` hides it. Left unset, the button hides once `shown` has reached a positive `total`, and stays with no total. `page` is the last loaded page (default 1). A click fires `load-more` with `{ page }` set to the next page and reports `['uvalib-pager', 'load-more', '', page]`. Nothing is reported on render. Call `loaded(firstNewElement)`, or set `for` to a list id and call `loaded()`, and focus moves to that new item. The landmark’s accessible name is `label`, or “Sections” for previous/next and “Pagination” for numbered pages. Load more uses `label` or “More results”. An empty `label` uses that default. Two pagers on one page need different labels: a repeated landmark name fails the accessibility check.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `prev-href` | `string \| undefined` |  | Href of the previous section. Omitted, that side is not shown. |
| `prev-label` | `string \| undefined` |  | Title of the previous section, under the “Previous” kicker. |
| `next-href` | `string \| undefined` |  | Href of the next section. Omitted, that side is not shown. |
| `next-label` | `string \| undefined` |  | Title of the next section, under the “Next” kicker. |
| `mode` | `string \| undefined` |  | `load-more` shows a Load more button instead of previous/next or numbered pages. Any other value, including empty, leaves the pager in its other modes. |
| `shown` | `number \| undefined` |  | How many results are already shown. Used by `mode="load-more"` as N in “Showing N of M”. |
| `total` | `number \| undefined` |  | How many results there are. Used by `mode="load-more"` as M in “Showing N of M”. Unset or 0 (an unknown total), the count reads “Showing N”. |
| `has-more` | `boolean \| undefined` |  | Whether `mode="load-more"` has more to load, for when `total` is not known. Unset (the default), the button follows `total`. Set, it decides: the attribute present means true; removing it, `has-more="false"` or `hasMore = false` means false. `hasMore = undefined` returns to following `total`. |
| `for` | `string \| undefined` |  | Id of the list Load more appends to. `loaded()` focuses the first child added after the click. Ignored when `loaded` is passed an element. |
| `page` | `number \| undefined` |  | Current page, from 1. Clamped to `pages`. Used when `pages` is set. In load-more, the last loaded page (default 1); a click asks for the next one. |
| `pages` | `number \| undefined` |  | How many pages. A positive number selects numbered pages and ignores previous/next. Zero, negative or non-numeric does not. |
| `href-template` | `string \| undefined` |  | Href of each numbered page, with `{page}` where the number goes. Default `?page={page}` when omitted. Without `{page}`, numbered links are not made. |
| `label` | `string \| undefined` |  | Accessible name of the navigation landmark. Default “Pagination” for numbered pages and “Sections” for previous/next. Empty uses that default. A second pager on the page needs its own name. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Events

| Event | Description |
|---|---|
| `load-more` | A primary click on Load more: `detail` is `{ page }` (the next page). Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: a primary-button click that was not already canceled, including a modified click, on a page link `['uvalib-pager', 'page-change', 'number', <n>]`, on a section link `['uvalib-pager', 'page-change', 'next'\|'previous']`, or on Load more `['uvalib-pager', 'load-more', '', <next page>]`. Never the label or URL. Nothing on render. Bubbles and is composed. |
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
| `--uva-color-button-bg` |  | Load more background (else `--uva-blue-alt`). |
| `--uva-color-button-text` |  | Load more text (else #fff). Dark mode’s own text is dark on the light button. |
| `--uva-color-button-hover-bg` |  | Load more hover background (else `--uva-blue-alt-A`). |

## `<uvalib-photo-grid>`

Justified rows of thumbnails. Each direct child that is a link or a button is one photo; its image keeps its shape from the `width` and `height` attributes, or from the loaded image, so the row does not jump when the picture arrives. The row is about 220px tall and shorter on a phone; `row-height` sets that height. Every item stays a real link or button. An image with no visible text gets a visible caption from its alt (the caption is then the accessible name, and a repeated alt is cleared). The original alt is kept in `data-uvalib-alt` so a lightbox still describes the picture. An item with no name at all is captioned “Photo N” and warned about once; that caption is renumbered when the photos change order. An `aria-label` is left as the name: the grid does not add a caption that would disagree with it. Put the grid inside `<uvalib-lightbox>` and a plain click opens the viewer. A badge sits on the thumbnail: `<span slot="badge">` inside the link or button, or `data-badge` on that item (for example “seq” or “3 photos”). It is read after the caption (“The Lawn, 3 photos”). When the item already has an `aria-label`, the badge is appended to that label (the author’s words stay in `data-uvalib-label`) and an alt that repeats those words is cleared. A badge does not replace the alt caption.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `row-height` | `string` | `''` | Row height. A bare number is pixels (`220` is 220px); `px`, `rem`, `em`, `vh`, `vw`, `vmin`, `vmax`, `ch` and `%` are kept. Empty uses 220px, or 140px when the viewport is 767px or narrower. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Slots

| Slot | Description |
|---|---|
| (default) | The thumbnails: one `<a href>` or `<button>` per photo, each with an `<img>`. A `<span slot="badge">` inside an item is drawn over that thumbnail. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-text` |  | Dark-mode role token: caption colour (else `--uva-grey-darkest`). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |
| `--uva-color-surface` |  | Dark-mode role token: the box behind an image that has not loaded (else #fff). |
| `--uva-grey-darkest` | `#2b2b2b` | Caption colour when `--uva-color-text` is unset. |
| `--uva-brand-orange` | `#e57200` | Focus ring when `--uva-color-focus` is unset. |

## `<uvalib-results-count>`

The results summary of a search or listing page, such as “Showing 48 of 3,694 shoots”, and a polite live region that tells screen reader users when it changes. Set `total` (how many match), `shown` (how many are on the page) and `noun` (plural, default “results”; `singular` for a total of one). The visible text follows at once: “Showing 48 of 3,694 shoots”, “Showing all 12 shoots” (shown is the total, or unset), “Showing 1 shoot” or “No shoots” (a total of 0, or 0 shown); with only `shown`, “Showing 48 shoots”. Numbers use thousands separators. A missing or blank `shown` or `total` is unset, not 0. The announcement waits until the text has not changed for `announce-delay` milliseconds (default 1000, as `<bento-box>` and `<uvalib-pagefind-search>` settle), so typing in a filter box is announced once. The first render is never announced; when it has no count yet (the data still loading), the first count that arrives is. A count is announced again when it comes back after a different one (a new search with the same number of results), but not when nothing was shown in between. The announcement is cleared from the hidden region five seconds later, so reading the page finds the count once. `<bento-box>` and `<uvalib-pagefind-search>` announce their own counts: use this element for your own listings, not beside them.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `shown` | `number \| undefined` |  | How many results are shown on the page. |
| `total` | `number \| undefined` |  | How many results match in all. |
| `noun` | `string` | `'results'` | What is counted, plural: “results” by default. |
| `singular` | `string` | `''` | What is counted, singular, for a total of one. Default: “result” when `noun` is unset, else `noun`. |
| `announce-delay` | `number` | `1000` | Milliseconds the text must stay the same before it is announced. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### CSS parts

| Part | Description |
|---|---|
| `text` | The visible summary. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-text-muted` |  | Dark-mode role token: text colour (else `--uva-grey-A`, #4f4f4f). |

## `<uvalib-tabs>`

Tabs, as on library.virginia.edu: a row of buttons over one visible panel. Each panel is a child with `data-tab="Events"` (and an `id` when the tab should be linkable). Or put `<button slot="tab">` elements first and one panel element after each; the button text is the label and those buttons are hidden, because the component draws the real tabs. The selected panel stays visible across the upgrade. With `base.css`, later `data-tab` panels stay hidden before the element upgrades, and space is reserved for the tab row so the first panel does not jump. The tab row wraps on a narrow screen. Arrow keys, Home and End move between tabs. Selection follows the arrow unless `activation="manual"`, in which case Enter or Space selects the focused tab. `selected` is the panel id (a label or a 0-based index also selects). It reflects the panel id. `url-param` writes that id into the query string, or into the hash when the page is a hash route (`#/stories?tab=events`). `url-param="hash"` uses the hash itself (`#events`) and leaves a hash route (`#/…`) alone.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `selected` | `string` | `''` | The selected tab. A panel id, the tab label, or a 0-based index. Reflects the panel id once the tabs have been read. Empty selects the first tab. |
| `activation` | `string` | `''` | `manual`: arrow keys move focus and Enter or Space selects. Anything else, including empty, selects as the arrow moves. |
| `url-param` | `string` | `''` | Name of the query parameter that stores the selected panel id, so the tab is linkable and Back restores it. `hash` stores it in the hash (`#panel-id`) instead. Empty does not touch the URL. |
| `label` | `string` | `''` | Accessible name of the tab list. Empty uses “Tabs”. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Slots

| Slot | Description |
|---|---|
| (default) | The panels. Each element with `data-tab` is a panel, or each element that is not a `slot="tab"` button. |
| `tab` | A `<button>` whose text labels the panel that follows. Hidden once the tabs are drawn. |

### Events

| Event | Description |
|---|---|
| `change` | The selected tab changed after the first render, including a script setting `selected` and the Back button. `detail` is `{ id, label, index }` (`id` is the panel id, `index` from 0). Not fired on the first render. Bubbles and is composed. |
| `uvalib-analytics-event` | For `<site-analytics>`: a click or arrow-key selection, `['uvalib-tabs', 'change', '<tab label>']`. The label is cut to 100 characters. Not fired on the first render, when `selected` is set from script, or when Back or the hash restores a tab. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-color-button-bg` |  | Dark-mode role token: unselected tab background (else `--uva-blue-alt-base`). |
| `--uva-color-button-text` |  | Text on an unselected tab (else #fff). |
| `--uva-color-button-hover-bg` |  | Dark-mode role token: unselected tab hover (else `--uva-blue-alt-dark`). |
| `--uva-color-accent-bg` |  | Dark-mode role token: selected tab background (else `--uva-brand-blue`). |
| `--uva-color-on-accent` |  | Selected tab text and the selected underline (else #fff). |
| `--uva-color-focus` |  | Dark-mode role token: focus outline (else `--uva-brand-orange`). |
| `--uva-blue-alt-base` | `#007BAC` | Unselected tab when `--uva-color-button-bg` is unset. |
| `--uva-blue-alt-dark` | `#005679` | Unselected hover when `--uva-color-button-hover-bg` is unset. |
| `--uva-brand-blue` | `#232D4B` | Selected tab when `--uva-color-accent-bg` is unset. |
| `--uva-brand-orange` | `#E57200` | Focus outline when `--uva-color-focus` is unset. |

## `<uvalib-tag-list>`

A labelled list of keywords or subjects that wraps: each tag a link (for example a search for that term) or plain text. Link tags are outlined pills in the link colour; plain tags are filled chips (the card chip's colours), so a link never looks like a label. Every tag and the toggle are at least 2rem (34px) tall and wide, 0.5rem apart. Give the tags as children: `<a href>` for a link, any other element (`<span>`) for plain text. A child's `lang` and `dir` are kept, and so is inline markup inside it (`em`, `cite`, `abbr`, `bdi`, a `span lang`…), copied element by element (never parsed as HTML). Or set `href-template` (with `{tag}`, replaced by the URL-encoded text) to make every tag without its own href a link; a blank href counts as none. Apps can set the `items` property (`{ label, href?, lang?, dir? }`) instead; it wins over the children. Children with no text are skipped with one warning. `label` names the list (shown above it, or visually hidden with `hide-label`); without one a console warning is logged. `limit` shows that many tags and a “Show all N” button (`aria-expanded`, `aria-controls`), which reveals the rest in place and keeps focus. Analytics never sends a tag's text (record tags can be user-submitted or machine-made), and by default not the label either, which a template may fill from a record: the name is the list's place among the tag lists on the page, `list N`. Add `track-label` when the label is fixed text the page author wrote (“Subjects”), to send it instead.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `''` | The list's name: shown above the tags (and, with `track-label`, the analytics name). |
| `hide-label` | `boolean` | `false` | Hide the label visually; it still names the list. |
| `track-label` | `boolean` | `false` | Send the label as the analytics name. Only for fixed text the page author wrote, never a label filled from a record. Without it the name is `list N`. |
| `limit` | `number \| undefined` |  | Show this many tags and a “Show all N” button. Zero or empty shows every tag. |
| `href-template` | `string` | `''` | Href for tags without their own, with `{tag}` where the URL-encoded text goes, for example `/search?q={tag}`. Empty: such tags are plain text. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Events

| Event | Description |
|---|---|
| `uvalib-analytics-event` | For `<site-analytics>`: a primary-button click on a tag link, `['uvalib-tag-list', 'tag-click', '<name>', <n>]` (n from 1, the tag's place in the list), and the toggle, `['uvalib-tag-list', 'show-all'\|'show-fewer', '<name>']`. The name is `list N` (N from 1, the list's place among the tag lists in its document or shadow root), or with `track-label` the list's `label`; never the tag text or URL. Bubbles and is composed. |
| `uvalib-tag-list-navigate` | A plain click on a tag link: `detail` is `{ href, tag, index }` (index from 0). Cancel it (`preventDefault()`) to route in the app; the click's default is then prevented. Bubbles and is composed. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-blue-alt-300` | `#BFE7F7` | Plain tag background (the card chip's). |
| `--uva-blue-alt-dark` | `#005679` | Plain tag text. |
| `--uva-color-link` |  | Dark-mode role token: link tag text (else `--uva-brand-blue`). |
| `--uva-color-control-border` |  | Dark-mode role token: link tag outline (else `--uva-grey`). |
| `--uva-color-text` |  | Dark-mode role token: the label (else `--uva-grey-darkest`). |
| `--uva-color-focus` |  | Dark-mode role token: focus ring (else `--uva-brand-orange`). |

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
