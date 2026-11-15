import { examples, GROUPS } from './presets.js';

// The examples menu, as `<nav slot="main-nav">` markup for <site-page>: one group per entry
// in GROUPS, holding that group's examples as `#<id>` links, in the presets' order. The site
// build writes it into index.html (vite.site.config.ts), so <site-page> finds it in the
// page like hand-written markup, before it is defined.

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The markup, indented by `indent` spaces. */
export function examplesMainNav(indent = 0): string {
  const pad = (n: number) => ' '.repeat(indent + n);
  const groups = GROUPS.map((group) => {
    const links = examples
      .filter((p) => p.group === group)
      .map((p) => `${pad(8)}<li><a href="#${escape(p.id)}">${escape(p.title)}</a></li>`);
    return [
      `${pad(4)}<li>`,
      `${pad(6)}<span>${escape(group)}</span>`,
      `${pad(6)}<ul>`,
      ...links,
      `${pad(6)}</ul>`,
      `${pad(4)}</li>`,
    ].join('\n');
  });
  return [
    `<nav slot="main-nav">`,
    `${pad(2)}<ul>`,
    ...groups,
    `${pad(2)}</ul>`,
    `${pad(0)}</nav>`,
  ].join('\n');
}
