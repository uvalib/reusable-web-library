// Header markup captured from main @ 994f1a9 (in a git worktree of that commit), before site links existed: whitespace
// collapsed, Lit comment markers removed and light-mode popover ids numbered as N.
// A site with no site-links children must keep rendering exactly this. Two deliberate
// changes since: the logo <img> gained width="304" height="69" (no layout shift), and
// shadow mode gained <slot name="alerts"> after the skip-link slot.
export const HEADER_SNAPSHOT = {
  shadow:
    '<header part="header" class=""><slot name="skip-link"></slot><slot name="alerts"></slot><a class="logo" href="https://www.library.virginia.edu/"><img alt="UVA Library home" width="304" height="69" src="https://www.library.virginia.edu/sites/default/files/2022-09/library_rgb.png"></a><nav class="inline" aria-label="Utility"><ul><li><a href="https://search.lib.virginia.edu/account">My account</a></li><li><a href="https://www.library.virginia.edu/askalibrarian">Ask a Librarian</a></li><li><a href="https://www.library.virginia.edu/hours">Hours</a></li><li><a href="https://www.library.virginia.edu/support-library">Give</a></li><li><a href="https://www.library.virginia.edu/status#alerts">Alerts</a></li><li><a href="https://www.library.virginia.edu/search">Search</a></li></ul></nav><button class="menu-toggle" popovertarget="utility-menu" aria-controls="utility-menu" style="anchor-name: --utility-menu"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" stroke-linejoin="bevel"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>Menu</button><nav class="menu" aria-label="Utility menu"><ul popover="" id="utility-menu" style="--menu-anchor: --utility-menu"><li><a href="https://search.lib.virginia.edu/account">My account</a></li><li><a href="https://www.library.virginia.edu/askalibrarian">Ask a Librarian</a></li><li><a href="https://www.library.virginia.edu/hours">Hours</a></li><li><a href="https://www.library.virginia.edu/support-library">Give</a></li><li><a href="https://www.library.virginia.edu/status#alerts">Alerts</a></li><li><a href="https://www.library.virginia.edu/search">Search</a></li></ul></nav></header>',
  light:
    '<header part="header" class=""><a class="logo" href="https://www.library.virginia.edu/"><img alt="UVA Library home" width="304" height="69" src="https://www.library.virginia.edu/sites/default/files/2022-09/library_rgb.png"></a><nav class="inline" aria-label="Utility"><ul><li><a href="https://search.lib.virginia.edu/account">My account</a></li><li><a href="https://www.library.virginia.edu/askalibrarian">Ask a Librarian</a></li><li><a href="https://www.library.virginia.edu/hours">Hours</a></li><li><a href="https://www.library.virginia.edu/support-library">Give</a></li><li><a href="https://www.library.virginia.edu/status#alerts">Alerts</a></li><li><a href="https://www.library.virginia.edu/search">Search</a></li></ul></nav><button class="menu-toggle" popovertarget="utility-menu-N" aria-controls="utility-menu-N" style="anchor-name: --utility-menu-N"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" stroke-linejoin="bevel"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>Menu</button><nav class="menu" aria-label="Utility menu"><ul popover="" id="utility-menu-N" style="--menu-anchor: --utility-menu-N"><li><a href="https://search.lib.virginia.edu/account">My account</a></li><li><a href="https://www.library.virginia.edu/askalibrarian">Ask a Librarian</a></li><li><a href="https://www.library.virginia.edu/hours">Hours</a></li><li><a href="https://www.library.virginia.edu/support-library">Give</a></li><li><a href="https://www.library.virginia.edu/status#alerts">Alerts</a></li><li><a href="https://www.library.virginia.edu/search">Search</a></li></ul></nav></header>',
  vendorShadow:
    '<header part="header" class="vendor"><slot name="skip-link"></slot><slot name="alerts"></slot><a class="logo" href="https://www.library.virginia.edu/"><img alt="UVA Library home" width="304" height="69" src="https://www.library.virginia.edu/sites/default/files/2022-09/library_rgb.png"></a><nav class="inline" aria-label="Utility"><ul><li><a href="https://www.library.virginia.edu/askalibrarian">Ask a Librarian</a></li></ul></nav></header>',
  vendorLight:
    '<header part="header" class="vendor"><a class="logo" href="https://www.library.virginia.edu/"><img alt="UVA Library home" width="304" height="69" src="https://www.library.virginia.edu/sites/default/files/2022-09/library_rgb.png"></a><nav class="inline" aria-label="Utility"><ul><li><a href="https://www.library.virginia.edu/askalibrarian">Ask a Librarian</a></li></ul></nav></header>',
};

// <site-page>'s header alert is page content handed to the header's `alerts` slot: in shadow
// mode it is slotted and so absent from the header's own markup; in light mode it is moved
// into <header>. Exactly one empty one, directly after the opening <header> tag, is dropped so
// both modes compare the header's own markup; a duplicated or misplaced one still fails.
export function normalizeMarkup(html: string): string {
  return html
    .replace(/<!--[^>]*-->/g, '')
    .replace(/utility-menu-\d+/g, 'utility-menu-N')
    .replace(/\s+/g, ' ')
    .replace(/>\s+/g, '>')
    .replace(/\s+</g, '<')
    .replace(/^(<header\b[^>]*>)<uvalib-alerts\b[^>]*\bslot="alerts"[^>]*><\/uvalib-alerts>/, '$1');
}
