# Page snippets

Complete pages, all loading from the CDN major alias `v1` (replace `v1` with `vX.Y.Z` to pin). Each is exercised by the repo's snippet test.

Host CSS owns the styling (`no-shadow-dom`):

```html snippet
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Host-styled page</title>
    <style>
      /* Unlayered host CSS wins over the components' @layer uvalib styles. */
      site-header a {
        color: #232d4b;
      }
    </style>
    <script
      type="module"
      src="https://unpkg.internal.lib.virginia.edu/web-components/v1/site-page.js"
    ></script>
  </head>
  <body>
    <site-page no-shadow-dom>
      <h1>Host-styled page</h1>
      <p>The site stylesheet styles the header, footer and content.</p>
    </site-page>
  </body>
</html>
```

Existing page with a sidebar nav and its own `<main>`: delete the page's `<main>`, header and footer, and keep the sidebar and article as plain children:

```html snippet
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Page with sidebar</title>
    <script
      type="module"
      src="https://unpkg.internal.lib.virginia.edu/web-components/v1/site-page.js"
    ></script>
  </head>
  <body>
    <site-page>
      <div class="layout">
        <nav aria-label="Section">
          <ul>
            <li><a href="/a">Section A</a></li>
            <li><a href="/b">Section B</a></li>
          </ul>
        </nav>
        <article>
          <h1>Page with sidebar</h1>
          <p>Article content.</p>
        </article>
      </div>
    </site-page>
  </body>
</html>
```

Vendor or third-party site:

```html snippet
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Vendor-hosted page</title>
    <script
      type="module"
      src="https://unpkg.internal.lib.virginia.edu/web-components/v1/site-page.js"
    ></script>
  </head>
  <body>
    <site-page header-variant="vendor">
      <h1>Vendor-hosted page</h1>
      <p>Logo and Ask a Librarian only in the header.</p>
    </site-page>
  </body>
</html>
```

Analytics. `<site-analytics>` listens for `site-analytics-event`, `site-analytics-search` and `site-analytics-pageview` on `document`. Dispatch them only after the element is defined (and normally from a user action such as a search submit). Events fired before the Matomo tracker has loaded may be dropped. The Matomo property id is found from the page URL for registered library sites; otherwise add `matomoid="N"`. This example has no `matomoid` so that the snippet test never loads real Matomo.

```html snippet
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Search with analytics</title>
    <script
      type="module"
      src="https://unpkg.internal.lib.virginia.edu/web-components/v1/site-page.js"
    ></script>
    <script
      type="module"
      src="https://unpkg.internal.lib.virginia.edu/web-components/v1/site-analytics.js"
    ></script>
  </head>
  <body>
    <site-page>
      <site-analytics></site-analytics>
      <h1>Search</h1>
      <form id="search">
        <input name="q" aria-label="Search" />
        <button>Search</button>
      </form>
      <script type="module">
        await customElements.whenDefined('site-analytics');
        document.querySelector('#search').addEventListener('submit', (e) => {
          e.preventDefault();
          const q = new FormData(e.target).get('q');
          document.dispatchEvent(
            new CustomEvent('site-analytics-search', {
              detail: { searchQuery: q, resultCount: 0 },
            }),
          );
        });
      </script>
    </site-page>
  </body>
</html>
```
