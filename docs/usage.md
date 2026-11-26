# Using @uvalib/web-components

Custom elements for UVA Library pages: `<site-page>`, `<site-header>`, `<site-footer>`, `<site-analytics>` (also `<uvalib-analytics>`) and `<site-style>`, the breadcrumb trail `<uvalib-breadcrumbs>`, cards and paging `<uvalib-card>`, `<uvalib-card-grid>` and `<uvalib-pager>`, tabs `<uvalib-tabs>`, sub-navigation `<uvalib-contents>`, record details `<uvalib-metadata>`, citations in several formats `<uvalib-citation>`, the image viewer `<uvalib-lightbox>`, the photo grid `<uvalib-photo-grid>` and image regions `<uvalib-image-regions>`, plus the search components `<uvalib-filter>`, `<uvalib-date-range>` and `<uvalib-date-histogram>`, the suggesting text field `<uvalib-combobox>`, the list filter `<uvalib-list-filter>` (filter a long list on the page as you type), the search page's filter drawer `<uvalib-filter-drawer>`, the map of places `<uvalib-map>` (over the page's own Leaflet), the back-to-top button `<uvalib-back-to-top>`, and the modal dialog `<uvalib-dialog>` (search tips, Cite, short forms). Full attribute, slot, part, event and custom-property tables are in [the component reference](../skills/uvalib-web-components/reference/components.md) (generated from `custom-elements.json`).

## Two ways to load

### CDN script tag (plain HTML, 11ty, Drupal templates)

```html
<script type="module" src="https://unpkg.internal.lib.virginia.edu/web-components/v1/site-page.js"></script>

<site-page>
  <h1>My page</h1>
  <p>Content.</p>
</site-page>
```

- `/web-components/v1/<tag>.js` is the major alias (updates within major 1, cached about 5 minutes).
- `/web-components/vX.Y.Z/<tag>.js` is an exact, immutable version. Use it to pin.
- `tokens.css` and `base.css` are at the same prefix.
- Do not use the legacy `/web-components/latest/...` or `/web-components/cdn-vX.Y.Z/...` paths. See [migration](migration.md).
- `site-page.js` also loads the header and footer. For Matomo, set `matomo-id` on `<site-page>`, or add `site-analytics.js` and a `<site-analytics>`.

### npm (bundled apps)

```sh
npm i @uvalib/web-components
```

```js
import '@uvalib/web-components/site-page.js'; // registers the element
```

The define entries are `site-page.js`, `site-header.js`, `site-footer.js`, `site-analytics.js`, `uvalib-analytics.js`, `site-style.js`, `uvalib-breadcrumbs.js`, `uvalib-card.js`, `uvalib-card-grid.js`, `uvalib-pager.js`, `uvalib-contents.js`, `uvalib-metadata.js`, `uvalib-lightbox.js`, `uvalib-photo-grid.js`, `uvalib-tabs.js`, `uvalib-chip-group.js`, `uvalib-tag-list.js`, `uvalib-results-count.js`, `uvalib-filter.js`, `uvalib-date-range.js`, `uvalib-date-histogram.js`, `uvalib-combobox.js`, `uvalib-image-regions.js`, `uvalib-map.js`, `uvalib-filter-drawer.js`, `uvalib-back-to-top.js`, `uvalib-dialog.js`, `uvalib-citation.js` and `uvalib-list-filter.js`. `import '@uvalib/web-components'` exports the classes only and registers nothing; if you use `SitePage` directly, import the header and footer define entries too. CSS: `@uvalib/web-components/tokens.css` and `base.css`; `pagefind.css` (the Pagefind search theme) and `edition.css` (reading styles for converted TEI texts) are separate.

## Page structure

Use one `<site-page>` per page. It renders the skip link, the header, a single `<main id="main-content">` and the footer around your content, so do not add your own `<main>`, skip link, header or footer. Put content for a band above the footer in an element with `slot="pre-footer"`.

| Attribute on `<site-page>` | Effect |
|---|---|
| `root-link-domain` | Base for header and footer links (default `https://www.library.virginia.edu`) |
| `header-variant="vendor"` | Logo plus Ask a Librarian only, for third-party sites (default `full`) |
| `no-global-styles` | Do not install `base.css` page styles |
| `no-shadow-dom` | Render in light DOM so host CSS owns the styling |
| `no-style` | No component styles (use with `no-shadow-dom` when the host styles everything) |

Caveat: in light-DOM mode, replacing `<site-page>`'s children wholesale (`innerHTML`, `textContent`) destroys the chrome. Append content, or update a container inside it.

### Sidebar pages

For a sidebar beside the content (a reading page's contents, sub-navigation, related links), use `base.css`'s `.uvalib-sidebar-layout` inside `<site-page>`, not your own grid:

```html
<div class="uvalib-sidebar-layout uvalib-sidebar-layout--sticky">
  <uvalib-contents class="uvalib-sidebar-layout__sidebar">…</uvalib-contents>
  <article class="uvalib-sidebar-layout__main">…</article>
</div>
```

It goes side by side at 913px of its own width (library.virginia.edu's 993px breakpoint less `<site-page>`'s 40px gutters) and stacks below that, in source order: put the contents first so they come first on phones, or the sidebar after the main content for a right-hand sidebar. `--sticky` keeps the sidebar in view only when side by side; `--print-hide-sidebar` leaves it out of print. The sidebar is a `<nav>` (or `<uvalib-contents>`) or an `<aside>`; do not wrap a `<nav>` in `role="navigation"`. Details in the README's "Sidebar layout" section. For a very long contents (hundreds of sections, each its own page), write only the entries near the current one and set `full-href` and `total` on `<uvalib-contents>`: it draws a "Full contents (243 sections)" link after the list and tells screen readers the list is partial (README, "Contents and record metadata").

## Shadow DOM and light DOM

- Default: shadow DOM, styled by the library.
- `no-shadow-dom`: light DOM. Component styles are in `@layer uvalib` and scoped to the tag, so any host CSS wins. Content added later is moved into `<main>`. The mode is read once, at first connect.
- `no-shadow-dom no-style`: light DOM with no component styles; the host site styles everything.

`<site-style no-shadow-dom>` is legacy compatibility markup that installs the tokens and base page styles.

## Tokens and parts

Theme through inherited `--uva-*` custom properties (see `tokens.css`) set on `:root` or an ancestor, and through parts in shadow mode: `site-page::part(header)`, `site-page::part(footer)` and `site-page::part(main)` on a page, or `site-header::part(header)` / `site-footer::part(footer)` for standalone elements. Light mode has no shadow parts; use ordinary selectors. Components read tokens with fallbacks and never set them.

## Reading texts (edition.css)

Link `edition.css` (npm `@uvalib/web-components/edition.css`) and put a TEI text converted to class-annotated HTML in an element with `class="uvalib-edition"`. The classes are the TEI element names: `div` (`div-*`), `head`, `p`, `ab`, `seg-*`, `lb`, `pb` (`pb-n`, `a.pb-image`), `lg`, `l` (`data-n` for line numbers), `sp`, `speaker`, `stage`, `opener`, `closer`, `dateline`, `salute`, `signed`, `postscript`, `epigraph`, `argument`, `trailer`, `byline`, `dedication`, `bibl`, `cit`, `q`, `titlepage`/`titlePage`, `figure`, `figDesc`, `add`, `del`, `sic`, `orig`, `reg`, `corr`, `unclear`, `gap`, `noteref`, `footnotes`, `note` (`note-n`, `note-body`), `note-inline`, `ornament`, `textbreak`, `list`, and `rend-*` (italic, bold, roman, smallcaps, underline, sup, sub, center, right, left, indent, indent2, indent3, no-indent, hang). Rules are zero-specificity (`:where()`), so the site's own CSS wins.

- Prose reflows (`br.lb` hidden; keep whitespace before each `<br class="lb">`, or use `<span class="lb"></span>`). A checkbox `.uvalib-edition__lines` inside or before the edition, or the class `uvalib-edition--lines`, shows the original line breaks; `.uvalib-edition__readings` / `uvalib-edition--readings` shows `title` readings inline. Verse lines always break.
- Additions and deletions are announced ("added: …", "deleted: …"); unclear text shows "[?]". Page-image links work with `<uvalib-lightbox selector=".uvalib-edition a.pb-image">`. See the README's "Reading texts (edition.css)".

## Analytics

`<site-analytics matomoid="12" spa>` loads Matomo. It listens on `document` for `site-analytics-pageview`, `site-analytics-search` and `site-analytics-event`; (and the original `uvalib-analytics-*` names); dispatch those events to record data, ideally from a user action. They are queued for Matomo, so events fired before it has loaded are kept. See the README's "Analytics".

## Agent skill

An agent skill that teaches coding agents (Claude Code, Codex, Gemini CLI, GitHub Copilot, Cursor, Grok and others) to use these components correctly ships with the package, as an [Agent Skills](https://agentskills.io) folder.

```sh
npx @uvalib/web-components install-skill                    # this project: .claude/skills and .agents/skills
npx @uvalib/web-components install-skill --global           # ~/.claude/skills and ~/.agents/skills
npx @uvalib/web-components install-skill --agent gemini     # one agent's own folder (.gemini/skills)
npx @uvalib/web-components install-skill --list --agent all # where each agent's copy would go
```

`.agents/skills` is the shared folder of the Agent Skills standard, read by Codex, Gemini CLI, GitHub Copilot, Cursor, Grok and others; Claude Code reads `.claude/skills`. `--agent` takes `agents`, `claude`, `codex`, `gemini`, `copilot`, `cursor`, `grok` or `all`; `--dir <folder>` installs to one folder of your choosing; `--force` replaces an existing copy. The README's [Installing the skill](../README.md#installing-the-skill) has the full table.

Or copy or symlink `node_modules/@uvalib/web-components/skills/uvalib-web-components` into a skills folder. Sites that only use script tags can fetch it from `https://unpkg.internal.lib.virginia.edu/web-components/v1/skills/uvalib-web-components/SKILL.md`.

Installed copies are stamped with their version (`installed.json`) and do not update themselves. `npx @uvalib/web-components@latest install-skill --check` (with the options you installed with, such as `--global`) reports when a newer release exists, and `install-skill --force` updates the copies; see [Keeping the skill current](../README.md#keeping-the-skill-current) for a SessionStart hook that runs the check. A symlink into `node_modules` follows the installed package version instead.
