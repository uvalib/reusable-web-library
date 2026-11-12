import 'playground-elements/playground-ide.js';
import type { PlaygroundIde } from 'playground-elements/playground-ide.js';
import { cdnBase, galleryExamples, presets, withCdnBase, type Preset } from './presets.js';

// One compact, editable IDE per preset and per header variant and mode. Each IDE starts
// its own TypeScript worker, so an IDE is only created when its section nears the
// viewport; a same-size slot holds its place until then.
const container = document.querySelector('#examples')!;

function mountIde(slot: Element, example: Preset) {
  const ide = document.createElement('playground-ide') as PlaygroundIde;
  ide.resizable = true;
  ide.config = { files: withCdnBase(example, cdnBase()).files };
  slot.replaceWith(ide);
}

const examples = new Map<Element, Preset>();
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      mountIde(entry.target, examples.get(entry.target)!);
    }
  },
  { rootMargin: '400px 0px' },
);

for (const example of [...presets, ...galleryExamples]) {
  const section = document.createElement('section');
  const heading = document.createElement('h2');
  heading.id = `${example.id}-heading`;
  heading.textContent = example.title;
  const description = document.createElement('p');
  description.textContent = example.description;
  const slot = document.createElement('div');
  slot.className = 'ide-slot';
  section.setAttribute('aria-labelledby', heading.id);
  section.append(heading, description, slot);
  container.append(section);
  examples.set(slot, example);
  observer.observe(slot);
}
