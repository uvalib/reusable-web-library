import 'playground-elements/playground-ide.js';
import type { PlaygroundIde } from 'playground-elements/playground-ide.js';
import { cdnBase, examples, withCdnBase, type Preset } from './presets.js';
import { decode, encode, type Files } from './share.js';

// One page, one IDE: the examples menu is the header's main navigation (the build writes it
// into index.html, see main-nav.ts), above a single full-height playground-ide whose config
// is swapped on selection. The URL hash says what is shown: `#files=…` is a share link
// (share.ts), `#<id>` an example, anything else the first example. Example ids cannot
// contain "=", so they never read as a share link. The main nav marks the current example
// itself, from the URL: a share link matches none of its links, so it marks none.

const SHARE = '#files=';
const SITE_TITLE = 'UVA Library web components';

const ide = document.querySelector<PlaygroundIde>('playground-ide')!;
const title = document.querySelector<HTMLElement>('#example-title')!;
const description = document.querySelector('#example-description')!;
const status = document.querySelector('.copy [role="status"]')!;
const ids = new Set(examples.map((p) => p.id));

// The full-height IDE fills the viewport below its own top edge (see site.css). Its top
// moves when site-page's header renders or the example's description wraps, so it is
// measured whenever the page or the heading block resizes. The IDE's height does not
// move its top, so setting the property cannot loop.
const root = document.documentElement;
function measureIdeTop() {
  const top = `${Math.round(ide.getBoundingClientRect().top + scrollY)}px`;
  if (root.style.getPropertyValue('--ide-top') !== top) root.style.setProperty('--ide-top', top);
}
const resized = new ResizeObserver(measureIdeTop);
resized.observe(document.body);
resized.observe(document.querySelector('.example-head')!);

/** The example last shown: what Reset returns to. */
let current: Preset = examples[0]!;

function showExample(p: Preset) {
  current = p;
  title.textContent = p.title;
  description.textContent = p.description;
  document.title = `${p.title} · Examples · ${SITE_TITLE}`;
  ide.config = { files: withCdnBase(p, cdnBase()).files };
}

let statusTimer: ReturnType<typeof setTimeout> | undefined;
function announce(message: string) {
  clearTimeout(statusTimer);
  status.textContent = '';
  requestAnimationFrame(() => (status.textContent = message));
  statusTimer = setTimeout(() => (status.textContent = ''), 4000);
}

/** The hash route() last handled, so an event for the same URL does not reload the IDE. */
let routed: string | undefined;

/**
 * After pushState or replaceState: the main nav follows those through the Navigation API's
 * currententrychange; in a browser without it, a popstate tells it (route() ignores it,
 * since the hash is already routed or about to be).
 */
function urlChanged() {
  if (!('navigation' in window)) dispatchEvent(new PopStateEvent('popstate'));
}

/** Replace the hash (no history entry): `#<id>`, `#files=…`, or none at all. */
function replaceHash(hash = '') {
  history.replaceState(null, '', location.pathname + location.search + hash);
  routed = location.hash;
  urlChanged();
}

/** Show what the URL hash names. Share links win; unknown ids fall back to the first example. */
async function route() {
  const hash = location.hash;
  if (hash === routed) return;
  routed = hash;
  if (hash.startsWith(SHARE)) {
    try {
      const files = await decode(hash.slice(SHARE.length));
      if (location.hash !== hash) return; // the user moved on while it decoded
      title.textContent = 'Shared example';
      description.textContent =
        'Opened from a shared link. Choose an example, or Reset to start over.';
      document.title = `Shared example · Examples · ${SITE_TITLE}`;
      ide.config = { files };
    } catch {
      announce('That link could not be read, so the first example is shown instead.');
      replaceHash();
      showExample(examples[0]!);
    }
    return;
  }
  const id = decodeURIComponent(hash.slice(1));
  const example = examples.find((p) => p.id === id);
  if (!example && hash) replaceHash();
  showExample(example ?? examples[0]!);
}

async function copyLink() {
  const files: Files = {};
  for (const [name, f] of Object.entries(ide.config?.files ?? {})) {
    files[name] = { content: f.content ?? '' };
  }
  replaceHash(SHARE + (await encode(files)));
  try {
    await navigator.clipboard.writeText(location.href);
    announce('Link copied');
  } catch {
    announce('Could not copy. The link is in the address bar.');
  }
}

/**
 * Open example `id` as a new history entry. pushState, not a plain fragment navigation:
 * until the page has completely loaded (the IDE's sandbox frame delays that), browsers
 * turn fragment navigations into replacements, and back would skip the example.
 */
function go(id: string) {
  if (location.hash !== `#${id}`) {
    history.pushState(null, '', `#${id}`);
    urlChanged();
  }
  void route();
}

// The main nav's links keep their #<id> hrefs (open in a new tab, copy link address); a plain
// click opens the example in place. The links are in the header's shadow DOM, so the click
// is read from its composed path. By the time it reaches the document the main nav has
// closed its open group and the header its Menu popover (both close on a plain link click),
// so focus, which was on the now hidden link, moves to the example's heading.
document.addEventListener('click', (event) => {
  const modified = event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey;
  if (modified || event.altKey || event.defaultPrevented) return;
  const path = event.composedPath();
  if (!path.some((n) => n instanceof Element && n.localName === 'site-main-nav')) return;
  const a = path.find((n): n is HTMLAnchorElement => n instanceof HTMLAnchorElement);
  const id = a?.getAttribute('href')?.match(/^#(.+)$/)?.[1];
  if (!id || !ids.has(id)) return;
  event.preventDefault();
  go(id);
  title.focus();
});
// Back and forward fire popstate; editing the hash in the address bar fires hashchange too.
addEventListener('popstate', () => void route());
addEventListener('hashchange', () => void route());
document.querySelector('#reset')!.addEventListener('click', () => {
  if (location.hash !== `#${current.id}`) replaceHash(`#${current.id}`);
  showExample(current);
});
document.querySelector('#copy-link')!.addEventListener('click', copyLink);

await route();
