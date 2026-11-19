import { UvalibPagefindSearch } from './UvalibPagefindSearch.js';

// Not base/define.js: every other entry shares it inside the Lit base chunk, and this entry
// (which has no Lit) importing it alone would split it into a chunk of its own, adding a
// request and bytes to every other element.
if (!customElements.get('uvalib-pagefind-search'))
  customElements.define('uvalib-pagefind-search', UvalibPagefindSearch);
