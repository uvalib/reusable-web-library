import { css } from 'lit';

// A sidebar beside the main content (.uvalib-sidebar-layout), in base.css only (composed into
// `controls`): no behaviour, so no element. Unlayered like the rest of base.css.
//
// The look is library.virginia.edu's sidebar pages (the Drupal theme's page.html.twig and
// scss/layouts/_general.scss): the first sidebar is a W3 quarter column with 3.5rem between it
// and the content, and below the desktop layout (993px of viewport, scss/base/_breakpoints)
// it stacks above the content. Electronic Text Collections' reading pages use the same shape:
// a sticky Contents sidebar beside the text.
//
//   <div class="uvalib-sidebar-layout">
//     <aside class="uvalib-sidebar-layout__sidebar">…</aside>
//     <div class="uvalib-sidebar-layout__main">…</div>
//   </div>
//
// Order: the source order is the order everywhere, side by side and stacked, so reading and
// focus order always match what is seen (no `order` or row-reverse). Sidebar first in the
// source is a left-hand sidebar that stacks above the content (a reading page's contents);
// sidebar after the main content is a right-hand one that stacks below it. No landmark role is
// forced: the sidebar is any element (an <aside>, a <div>, or a <uvalib-contents> itself).
//
// Side by side: the sidebar is about a quarter of the layout, clamp(14rem, 25%, 20rem)
// (`--uvalib-sidebar-width`), with 3.5rem between it and the content (`--uvalib-sidebar-gap`);
// the main content takes the rest and may shrink below its content's width (min-inline-size:
// 0, the flex form of minmax(0, 1fr)), so a long word wraps and a wide table scrolls inside
// its .uvalib-table-scroll instead of pushing the page sideways. Stacked, the two are 2rem
// apart (`--uvalib-sidebar-stack-gap`).
//
// When: a container query on the layout's own width, so it works inside <site-page>'s main, a
// drawer or any column, not only full width. The theme's desktop layout starts at a 993px
// viewport; <site-page>'s main has 40px gutters on each side, so its content box is then
// 993 - 80 = 913px: the layout goes side by side from 913px of its own width, so on a
// <site-page> it changes exactly where library.virginia.edu does (with an overlay scrollbar;
// a classic 15px scrollbar narrows the content box, so it changes about 15px of viewport
// later). In px, not rem: the theme's breakpoints are px, and a rem here would follow the
// page's root size (17px with base.css, 16px without). It is a flexbox that wraps, not a grid,
// because a container query cannot change its own container's grid columns: the children's
// flex bases change instead. Inline-size containment: the layout is a block-level box that
// fills its parent; inside a shrink-wrapped flex or grid item, give it a width.
//
// --sticky keeps the sidebar in view while the page scrolls, only when side by side (never
// stacked: a stuck sidebar above the content would cover it): it sticks
// `--uvalib-sidebar-sticky-top` (1rem) from the top, at most the window's height less twice
// that, and scrolls by itself beyond it. <site-page>'s header is not sticky, so nothing covers
// it; a site with a fixed header sets the top offset to the header's height. Use --sticky or
// <uvalib-contents sticky>, not both.
//
// Print: always stacked, never stuck or clipped; --print-hide-sidebar leaves the sidebar out
// (a reading page's contents are no use on paper).
export const layout = css`
  .uvalib-sidebar-layout {
    container: uvalib-sidebar-layout / inline-size;
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    gap: var(--uvalib-sidebar-stack-gap, 2rem) var(--uvalib-sidebar-gap, 3.5rem);
  }
  .uvalib-sidebar-layout > :is(.uvalib-sidebar-layout__sidebar, .uvalib-sidebar-layout__main) {
    flex: 1 1 100%;
    box-sizing: border-box;
    min-inline-size: 0;
    overflow-wrap: break-word;
  }
  @container uvalib-sidebar-layout (width >= 913px) {
    .uvalib-sidebar-layout > .uvalib-sidebar-layout__sidebar {
      flex: 0 0 var(--uvalib-sidebar-width, clamp(14rem, 25%, 20rem));
    }
    .uvalib-sidebar-layout > .uvalib-sidebar-layout__main {
      flex: 1 1 0;
    }
    .uvalib-sidebar-layout--sticky > .uvalib-sidebar-layout__sidebar {
      position: sticky;
      top: var(--uvalib-sidebar-sticky-top, 1rem);
      align-self: flex-start;
      max-block-size: calc(100dvh - 2 * var(--uvalib-sidebar-sticky-top, 1rem));
      overflow-y: auto;
      overscroll-behavior: contain;
    }
  }
  @media print {
    .uvalib-sidebar-layout > :is(.uvalib-sidebar-layout__sidebar, .uvalib-sidebar-layout__main) {
      flex: 1 1 100%;
      position: static;
      max-block-size: none;
      overflow: visible;
    }
    .uvalib-sidebar-layout--print-hide-sidebar > .uvalib-sidebar-layout__sidebar {
      display: none;
    }
  }
`;
