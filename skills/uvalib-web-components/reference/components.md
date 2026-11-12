# Component reference

<!-- Generated from dist/custom-elements.json by scripts/gen-skill-reference.mjs. Do not edit by hand. -->

## `<site-analytics>`

Matomo analytics loader with no visual output. Listens on `document` for the events below.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `matomourl` | `string` | `'https://analytics.lib.virginia.edu/'` |  |
| `matomoid` | `number \| undefined` |  |  |
| `spa` | `boolean` | `false` |  |
| `variables` | `any` | `null` |  |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Listens for (on document)

| Event | Description |
|---|---|
| `site-analytics-pageview` | Listened for on `document` (not fired): `detail` is `{ customTitle?, referrer? }`. |
| `site-analytics-search` | Listened for on `document` (not fired): `detail` is `{ searchQuery, searchCategory?, resultCount }`. |
| `site-analytics-event` | Listened for on `document` (not fired): `detail` is `{ event: any[] }`, passed to Matomo `trackEvent`. |

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

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-brand-blue` | `#232d4b` | Main footer background. |
| `--uva-blue-alt-300` | `#bfe7f7` | Pre-footer band background. |
| `--uva-blue-alt-darkest` | `#141e3c` | Copyright bar background. |
| `--uva-brand-orange` | `#e57200` | Social icon hover colour and focus ring. |

## `<site-header>`

UVA Library site header: logo, utility navigation, and a popover menu on narrow screens.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `root-link-domain` | `string` | `'https://www.library.virginia.edu'` |  |
| `variant` | `'full' \| 'vendor'` | `'full'` |  |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### CSS parts

| Part | Description |
|---|---|
| `header` | The `<header>` element. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-brand-blue` | `#232d4b` | Link and menu button colour. |
| `--uva-brand-orange` | `#e57200` | Focus ring colour. |

## `<site-page>`

Page wrapper: skip link, header, a single `<main>`, footer, and global page styles. Side-effect free: `site-page.ts` registers `<site-header>` and `<site-footer>`.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `root-link-domain` | `string` | `'https://www.library.virginia.edu'` |  |
| `header-variant` | `'full' \| 'vendor'` | `'full'` |  |
| `no-global-styles` | `boolean` | `false` |  |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Slots

| Slot | Description |
|---|---|
| (default) | Main page content, rendered inside the single `<main>`. |
| `pre-footer` | Optional content shown in a band above the footer. |

### CSS parts

| Part | Description |
|---|---|
| `main` | The `<main>` landmark. |
| `header` | The `<header>` element inside `<site-header>` (shadow mode; exported through `exportparts`). |
| `footer` | The `<footer>` element inside `<site-footer>` (shadow mode; exported through `exportparts`). |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-brand-blue` | `#232d4b` | Skip link background (and header and footer link colours). |
| `--uva-brand-orange` | `#e57200` | Focus ring colour. |
| `--uva-font-family` | `franklin-gothic-urw, Arial, Helvetica, sans-serif` | Page font family (global styles). |
| `--uva-font-size-base` | `17px` | Page base font size (global styles). |
| `--uva-grey-darkest` | `#2b2b2b` | Page text colour (global styles). |

## `<site-style>`

Compatibility element: shadow mode styles its slotted content; light mode (`no-shadow-dom`) installs the tokens and base page styles on the document.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `imports` | `{ [key: string]: string }` | `{}` | Map of tag name to a module URL whose default export is a stylesheet; ported as is. |
| `importedstyles` | `string` | `''` | Accumulated text of the stylesheets loaded through `imports`. |
| `no-shadow-dom` | `boolean` | `false` |  |
| `no-style` | `boolean` | `false` |  |

### Slots

| Slot | Description |
|---|---|
| (default) | Content styled with the UVA Library tokens and base styles. |

### CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--uva-font-family` | `franklin-gothic-urw, Arial, Helvetica, sans-serif` | Font family. |
| `--uva-font-size-base` | `17px` | Base font size. |
| `--uva-grey-darkest` | `#2b2b2b` | Text colour. |
