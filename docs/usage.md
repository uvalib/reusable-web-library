# Using @uvalib/web-components

Five custom elements for UVA Library pages: `<site-page>`, `<site-header>`, `<site-footer>`, `<site-analytics>` and `<site-style>`. Full attribute, slot, part, event and custom-property tables are in [the component reference](../skills/uvalib-web-components/reference/components.md) (generated from `custom-elements.json`).

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
- `site-page.js` also loads the header and footer. Add `site-analytics.js` only when you need Matomo.

### npm (bundled apps)

```sh
npm i @uvalib/web-components
```

```js
import '@uvalib/web-components/site-page.js'; // registers the element
```

The define entries are `site-page.js`, `site-header.js`, `site-footer.js`, `site-analytics.js` and `site-style.js`. `import '@uvalib/web-components'` exports the classes only and registers nothing; if you use `SitePage` directly, import the header and footer define entries too. CSS: `@uvalib/web-components/tokens.css` and `base.css`.

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

## Shadow DOM and light DOM

- Default: shadow DOM, styled by the library.
- `no-shadow-dom`: light DOM. Component styles are in `@layer uvalib` and scoped to the tag, so any host CSS wins. Content added later is moved into `<main>`. The mode is read once, at first connect.
- `no-shadow-dom no-style`: light DOM with no component styles; the host site styles everything.

`<site-style no-shadow-dom>` is legacy compatibility markup that installs the tokens and base page styles.

## Tokens and parts

Theme through inherited `--uva-*` custom properties (see `tokens.css`) set on `:root` or an ancestor, and through `::part(header)`, `::part(footer)` and `::part(main)` in shadow mode. Components read tokens with fallbacks and never set them.

## Analytics

`<site-analytics matomoid="12" spa>` loads Matomo. It listens on `document` for `site-analytics-pageview`, `site-analytics-search` and `site-analytics-event`; dispatch those events to record data.

## Agent skill

An agent skill that teaches coding agents (Claude Code and others) to use these components correctly ships with the package.

```sh
npx @uvalib/web-components install-skill            # copies to .claude/skills/uvalib-web-components
npx @uvalib/web-components install-skill --dir .agents/skills --force
```

Or copy or symlink `node_modules/@uvalib/web-components/skills/uvalib-web-components` into `.claude/skills/`. Sites that only use script tags can fetch it from `https://unpkg.internal.lib.virginia.edu/web-components/v1/skills/uvalib-web-components/SKILL.md`.
