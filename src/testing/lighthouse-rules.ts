/**
 * The axe rules Lighthouse 12's accessibility audit turns on, on top of its `wcag2a` and
 * `wcag2aa` tags (`core/gather/gatherers/accessibility.js`); some of them (`target-size`,
 * `identical-links-same-purpose`, `table-fake-caption`, `td-has-header`) are off in a default
 * axe run. Turning them all on makes an axe run at least as strict as Lighthouse.
 * `test/testing.test.mjs` checks the list against the Lighthouse version `@lhci/cli` installs.
 */
export const LIGHTHOUSE_RULES: readonly string[] = Object.freeze([
  'accesskeys',
  'aria-allowed-role',
  'aria-conditional-attr',
  'aria-deprecated-role',
  'aria-dialog-name',
  'aria-prohibited-attr',
  'aria-text',
  'aria-treeitem-name',
  'empty-heading',
  'heading-order',
  'html-xml-lang-mismatch',
  'identical-links-same-purpose',
  'image-redundant-alt',
  'input-button-name',
  'label-content-name-mismatch',
  'landmark-one-main',
  'link-in-text-block',
  'meta-viewport',
  'select-name',
  'skip-link',
  'tabindex',
  'table-duplicate-name',
  'table-fake-caption',
  'target-size',
  'td-has-header',
]);

/** The axe tags a strict run checks: WCAG 2.0, 2.1 and 2.2 A and AA, and best practices. */
export const STRICT_AXE_TAGS: readonly string[] = Object.freeze([
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
]);
