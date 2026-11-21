// The `hidden` attribute hides every component's host once it has upgraded, in shadow and
// light DOM, with and without `no-style` (hiding is behaviour, not look). A component's own
// `:host { display: … }` beats the browser's `[hidden]` rule, so UvalibElement installs
// `:is(<tag>, …)[hidden] { display: none !important }` in the root each element sits in.
// Every tag comes from the built custom-elements manifest, so a new component is covered.
import { expect } from '@open-wc/testing';

type Manifest = {
  modules: { path: string; declarations?: { tagName?: string; customElement?: boolean }[] }[];
};

const manifest = (await (
  await fetch(`${location.origin}/dist-cdn/custom-elements.json`)
).json()) as Manifest;
const TAGS = manifest.modules.flatMap((m) =>
  (m.declarations ?? []).filter((d) => d.tagName).map((d) => ({ tag: d.tagName!, path: m.path })),
);

/** Attributes a tag needs to connect without fetching from a real host. */
const EXTRA: Record<string, string> = {
  'uvalib-pagefind-search': 'bundle-path="/pagefind-demo/"',
  'uvalib-date-range': 'min="2000-01-01" max="2001-01-01"',
};

/** Elements that render nothing (display: none) whether hidden or not. */
const NOTHING = new Set(['site-analytics', 'uvalib-analytics']);

/** Modes each tag runs in; a plain custom element (no UvalibElement) has only its own. */
const MODES = ['', 'no-shadow-dom', 'no-style', 'no-shadow-dom no-style'];

let pagefindCss: HTMLLinkElement;
before(async () => {
  // <uvalib-pagefind-search> is styled (and hidden) by pagefind.css, as on a host page.
  pagefindCss = document.createElement('link');
  pagefindCss.rel = 'stylesheet';
  pagefindCss.href = '/dist-cdn/pagefind.css';
  const loaded = new Promise((r) => pagefindCss.addEventListener('load', r, { once: true }));
  document.head.append(pagefindCss);
  await loaded;
  // Each component folder's own entry (`<folder>/<folder>.ts`) defines its tags; the
  // manifest's module is the class file, which does not.
  const dirs = new Set(TAGS.map((t) => t.path.slice(0, t.path.lastIndexOf('/'))));
  for (const dir of dirs) await import(`/${dir}/${dir.slice(dir.lastIndexOf('/') + 1)}.ts`);
});
after(() => pagefindCss.remove());

describe('hidden hides every component host', function () {
  this.timeout(20000);

  it('the manifest lists the components', () => {
    expect(TAGS.length).to.be.greaterThan(30);
    expect(TAGS.map((t) => t.tag)).to.include.members(['uvalib-card', 'uvalib-filter-drawer']);
  });

  for (const { tag } of TAGS) {
    it(`<${tag} hidden> in shadow and light DOM, with and without no-style`, async () => {
      expect(customElements.get(tag), `${tag} is defined`).to.not.equal(undefined);
      const lit = 'updateComplete' in customElements.get(tag)!.prototype;
      for (const mode of lit ? MODES : ['']) {
        const wrap = document.createElement('div');
        wrap.innerHTML = `<${tag} hidden ${mode} ${EXTRA[tag] ?? ''}></${tag}>`;
        document.body.append(wrap);
        try {
          const el = wrap.firstElementChild as HTMLElement & { updateComplete?: Promise<unknown> };
          await el.updateComplete;
          await new Promise((r) => requestAnimationFrame(r));
          const where = `<${tag} hidden ${mode}>`;
          expect(getComputedStyle(el).display, where).to.equal('none');
          expect(el.getClientRects().length, where).to.equal(0);
          // Hidden after it rendered, too, and shown again without it.
          el.hidden = false;
          await new Promise((r) => requestAnimationFrame(r));
          if (!NOTHING.has(tag))
            expect(getComputedStyle(el).display, `${where} unhidden`).to.not.equal('none');
          el.hidden = true;
          expect(getComputedStyle(el).display, `${where} re-hidden`).to.equal('none');
        } finally {
          wrap.remove();
        }
      }
    });
  }
});
