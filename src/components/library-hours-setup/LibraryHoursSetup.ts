const PLACEHOLDER = 'div[type="library-weekly-hours"]';
const TAG = 'library-weekly-hours';

/**
 * Libraries whose building row is hidden. Special case: Harrison's building calendar
 * (LibCal 4114) is also the calendar of its own "Harrison/Small Building & Exhibitions"
 * space, so the building row would repeat that space's row.
 */
export const HIDE_BUILDING_HOURS_FOR: ReadonlySet<string> = new Set(['harrison']);

/**
 * Upgrades Drupal's hours placeholders. On library.virginia.edu/hours Drupal renders
 * `<div type="library-weekly-hours" library-slug="…" no-shadow-dom no-style>` for each
 * library; this element replaces each one, in its own root node (the document or a shadow
 * root), with a `<library-weekly-hours>` that has the same attributes (except `type`) and
 * children. `library-slug="harrison"` also gets `hide-building-hours`. Placeholders added
 * later are upgraded too, while this element is connected. It renders nothing.
 *
 * @tagname library-hours-setup
 */
export class LibraryHoursSetup extends HTMLElement {
  private observer?: MutationObserver;

  connectedCallback(): void {
    const root = this.getRootNode();
    if (!(root instanceof Document || root instanceof ShadowRoot)) return;
    root.querySelectorAll(PLACEHOLDER).forEach(upgrade);
    this.observer?.disconnect();
    this.observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches(PLACEHOLDER)) upgrade(node);
          else node.querySelectorAll(PLACEHOLDER).forEach(upgrade);
        }
      }
    });
    this.observer.observe(root, { childList: true, subtree: true });
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    this.observer = undefined;
  }
}

/** Replace one placeholder. A placeholder no longer in the tree (already upgraded) is skipped. */
function upgrade(div: Element): void {
  const parent = div.parentNode;
  if (!parent || !div.isConnected) return;
  const el = div.ownerDocument.createElement(TAG);
  for (const attr of div.attributes)
    if (attr.name !== 'type') el.setAttribute(attr.name, attr.value);
  if (HIDE_BUILDING_HOURS_FOR.has(el.getAttribute('library-slug') ?? ''))
    el.setAttribute('hide-building-hours', '');
  el.append(...div.childNodes);
  parent.replaceChild(el, div);
}
