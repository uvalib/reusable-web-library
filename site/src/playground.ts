import 'playground-elements/playground-ide.js';
import type { PlaygroundIde } from 'playground-elements/playground-ide.js';
import { cdnBase, presets, withCdnBase } from './presets.js';
import { decode, encode, type Files } from './share.js';

const HASH = '#files=';
const ide = document.querySelector<PlaygroundIde>('playground-ide')!;
const select = document.querySelector<HTMLSelectElement>('#preset')!;
const description = document.querySelector('#preset-description')!;
const status = document.querySelector('.copy [role="status"]')!;

for (const p of presets) select.add(new Option(p.title, p.id));

function showPreset() {
  const preset = presets.find((p) => p.id === select.value) ?? presets[0]!;
  description.textContent = preset.description;
  ide.config = { files: withCdnBase(preset, cdnBase()).files };
}

function clearHash() {
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
}

let statusTimer: ReturnType<typeof setTimeout> | undefined;
function announce(message: string) {
  clearTimeout(statusTimer);
  status.textContent = '';
  requestAnimationFrame(() => (status.textContent = message));
  statusTimer = setTimeout(() => (status.textContent = ''), 4000);
}

/** Load the files in a `#files=` link. Returns false when there is none or it is unreadable. */
async function showShared(): Promise<boolean> {
  if (!location.hash.startsWith(HASH)) return false;
  try {
    const files = await decode(location.hash.slice(HASH.length));
    description.textContent = 'Shared from a link. Choose a preset or Reset to start over.';
    ide.config = { files };
    return true;
  } catch {
    announce('That link could not be read, so a preset is shown instead.');
    clearHash();
    return false;
  }
}

async function copyLink() {
  const files: Files = {};
  for (const [name, f] of Object.entries(ide.config?.files ?? {})) {
    files[name] = { content: f.content ?? '' };
  }
  history.replaceState(
    null,
    '',
    location.pathname + location.search + HASH + (await encode(files)),
  );
  try {
    await navigator.clipboard.writeText(location.href);
    announce('Link copied');
  } catch {
    announce('Could not copy. The link is in the address bar.');
  }
}

select.addEventListener('change', () => {
  clearHash();
  showPreset();
});
document.querySelector('#reset')!.addEventListener('click', () => {
  clearHash();
  showPreset();
});
document.querySelector('#copy-link')!.addEventListener('click', copyLink);
addEventListener('hashchange', () => void showShared());

if (!(await showShared())) showPreset();
