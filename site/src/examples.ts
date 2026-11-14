import 'playground-elements/playground-ide.js';
import type { PlaygroundIde } from 'playground-elements/playground-ide.js';
import { cdnBase, examples, GROUPS, withCdnBase, type Preset } from './presets.js';
import { decode, encode, type Files } from './share.js';

// One page, one IDE: a menu of every example (a <select> below 48rem) beside a single
// full-height playground-ide whose config is swapped on selection. The URL hash says what
// is shown: `#files=…` is a share link (share.ts), `#<id>` an example, anything else the
// first example. Example ids cannot contain "=", so they never read as a share link.

const SHARE = '#files=';
const SITE_TITLE = 'UVA Library web components';

const ide = document.querySelector<PlaygroundIde>('playground-ide')!;
const nav = document.querySelector<HTMLElement>('nav.example-menu')!;
const select = document.querySelector<HTMLSelectElement>('#example-select')!;
const title = document.querySelector('#example-title')!;
const description = document.querySelector('#example-description')!;
const status = document.querySelector('.copy [role="status"]')!;

// The menu: a heading and a list of links per group. The select mirrors it with optgroups.
const links = new Map<string, HTMLAnchorElement>();
for (const group of GROUPS) {
  const heading = document.createElement('h2');
  heading.id = `group-${group.toLowerCase()}`;
  heading.textContent = group;
  const list = document.createElement('ul');
  list.setAttribute('aria-labelledby', heading.id);
  const optgroup = document.createElement('optgroup');
  optgroup.label = group;
  for (const p of examples.filter((x) => x.group === group)) {
    const a = document.createElement('a');
    a.href = `#${p.id}`;
    a.textContent = p.title;
    links.set(p.id, a);
    const item = document.createElement('li');
    item.append(a);
    list.append(item);
    optgroup.append(new Option(p.title, p.id));
  }
  nav.append(heading, list);
  select.append(optgroup);
}

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

/** The example the menu last pointed at: what Reset returns to. */
let current: Preset = examples[0]!;

function markCurrent(id: string | undefined) {
  for (const [key, a] of links) {
    if (key === id) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  if (id) select.value = id;
  else select.selectedIndex = -1;
}

function showExample(p: Preset) {
  current = p;
  markCurrent(p.id);
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

/** Replace the hash (no history entry): `#<id>`, `#files=…`, or none at all. */
function replaceHash(hash = '') {
  history.replaceState(null, '', location.pathname + location.search + hash);
  routed = location.hash;
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
      markCurrent(undefined);
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
  if (location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
  void route();
}

// The menu's links keep their #<id> hrefs (open in a new tab, copy link address); a plain
// click opens the example in place.
nav.addEventListener('click', (event) => {
  const a = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
  const modified = event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey;
  if (!a || modified || event.altKey) return;
  event.preventDefault();
  go(a.hash.slice(1));
});
select.addEventListener('change', () => go(select.value));
// Back and forward fire popstate; editing the hash in the address bar fires hashchange too.
addEventListener('popstate', () => void route());
addEventListener('hashchange', () => void route());
document.querySelector('#reset')!.addEventListener('click', () => {
  if (location.hash !== `#${current.id}`) replaceHash(`#${current.id}`);
  showExample(current);
});
document.querySelector('#copy-link')!.addEventListener('click', copyLink);

await route();
