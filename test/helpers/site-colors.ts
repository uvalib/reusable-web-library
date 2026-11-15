// Computed colours of the examples site (site/index.html): its own content, the controls,
// a header link and the playground-elements IDE, as a flat `{ "<what> <property>": value }`
// map, so a test can compare the whole page against a palette (light parity, dark mode).

import { read, type Colors } from './scheme-colors.js';

/** The CodeMirror editor inside the page's playground-ide. */
export function editor(doc: Document): HTMLElement {
  const ide = doc.querySelector('playground-ide')!;
  const fileEditor = ide.shadowRoot!.querySelector('playground-file-editor')!;
  const codeEditor = fileEditor.shadowRoot!.querySelector('playground-code-editor')!;
  return codeEditor.shadowRoot!.querySelector<HTMLElement>('.cm-editor')!;
}

export function siteColors(doc: Document): Colors {
  const out: Colors = {};
  const header = doc.querySelector('site-page')!.shadowRoot!.querySelector('site-header')!;
  read(out, 'body', doc.body, ['color', 'background-color']);
  read(out, 'heading', doc.querySelector('h1')!, ['color']);
  read(out, 'description', doc.querySelector('#example-description')!, ['color']);
  read(out, 'status', doc.querySelector('.status')!, ['color']);
  read(out, 'button', doc.querySelector('#reset')!, [
    'color',
    'background-color',
    'border-top-color',
  ]);
  read(out, 'site link', header.shadowRoot!.querySelector('nav.inline a:not([aria-current])')!, [
    'color',
  ]);
  const ide = doc.querySelector('playground-ide')!;
  const ir = ide.shadowRoot!;
  read(out, 'ide', ide, ['border-top-color']);
  const tabBar = ir.querySelector('playground-tab-bar')!;
  read(out, 'tab bar', tabBar, ['background-color']);
  const tabs = [...tabBar.shadowRoot!.querySelectorAll('playground-internal-tab')];
  read(
    out,
    'tab',
    tabs.find((t) => !t.hasAttribute('active'))!,
    ['color'],
  );
  read(
    out,
    'active tab',
    tabs.find((t) => t.hasAttribute('active'))!,
    ['color', 'background-color'],
  );
  const cm = editor(doc);
  read(out, 'editor', cm, ['color', 'background-color']);
  read(out, 'gutter', cm.querySelector('.cm-gutters')!, ['background-color']);
  read(out, 'line number', cm.querySelector('.cm-gutterElement:not(:empty)')!, ['color']);
  const toolbar = ir.querySelector('playground-preview')!.shadowRoot!.querySelector('#toolbar')!;
  read(out, 'preview toolbar', toolbar, ['color', 'background-color']);
  return out;
}
