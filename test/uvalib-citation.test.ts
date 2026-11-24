import { expect, fixture, nextFrame } from '@open-wc/testing';
import { emulateMedia, sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-citation/uvalib-citation.js';
import {
  citationTiming,
  STORAGE_KEY,
  type UvalibCitation,
} from '../src/components/uvalib-citation/UvalibCitation.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { recordAnalytics } from './helpers/analytics.js';
import { inDarkMode } from './helpers/dark.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const radios = (el: Element) => [
  ...root(el).querySelectorAll<HTMLInputElement>('input[type=radio]'),
];
const names = (el: Element) => radios(el).map((r) => r.closest('label')!.textContent!.trim());
const checked = (el: Element) =>
  radios(el)
    .find((r) => r.checked)
    ?.closest('label')!
    .textContent!.trim();
const region = (el: Element) => root(el).querySelector<HTMLElement>('.citation')!;
const copyButton = (el: Element) =>
  [...root(el).querySelectorAll<HTMLButtonElement>('button')].find(
    (b) => b.textContent!.trim() === 'Copy citation',
  )!;
const status = (el: Element) => root(el).querySelector<HTMLElement>('[role="status"]')!;
const settle = async (el: UvalibCitation) => {
  await el.updateComplete;
  await nextFrame();
};
const isFocused = (node: Element) => {
  let a = document.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a === node;
};

/** sRGB relative luminance and WCAG contrast of two `rgb(…)` strings. */
const lum = (c: string) => {
  const [r, g, b] = c
    .match(/[\d.]+/g)!
    .slice(0, 3)
    .map((v) => {
      const s = Number(v) / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};

const MLA =
  'Jefferson, Thomas. <i>Notes on the State of Virginia</i>. Edited by William Peden, U of North Carolina P, 1955.';
const APA =
  'Jefferson, T. (1955). <i>Notes on the state of Virginia</i> (W. Peden, Ed.). University of North Carolina Press.';
const CHICAGO =
  'Jefferson, Thomas. <i>Notes on the State of Virginia</i>. Edited by William Peden. Chapel Hill: University of North Carolina Press, 1955.';
const BLUEBOOK =
  'Thomas Jefferson, <i>Notes on the State of Virginia</i> (William Peden ed., Univ. of N.C. Press 1955).';
const FORMATS = `<blockquote data-format="MLA">${MLA}</blockquote>
  <blockquote data-format="APA">${APA}</blockquote>
  <blockquote data-format="Chicago">${CHICAGO}</blockquote>
  <blockquote data-format="Bluebook">${BLUEBOOK}</blockquote>`;

interface Copied {
  text?: string;
  html?: string;
  via: 'write' | 'writeText';
}
/** Replace navigator.clipboard for one test (nothing really copied, no permission prompt). */
function stubClipboard(opts: { write?: boolean; fail?: boolean } = {}) {
  const copied: Copied[] = [];
  const clip: Record<string, unknown> = {
    writeText: async (text: string) => {
      if (opts.fail) throw new Error('denied');
      copied.push({ text, via: 'writeText' });
    },
  };
  if (opts.write !== false)
    clip.write = async (items: ClipboardItem[]) => {
      if (opts.fail) throw new Error('denied');
      const item = items[0]!;
      const read = async (type: string) =>
        item.types.includes(type) ? (await item.getType(type)).text() : undefined;
      copied.push({ text: await read('text/plain'), html: await read('text/html'), via: 'write' });
    };
  Object.defineProperty(navigator, 'clipboard', { value: clip, configurable: true });
  return { copied, restore: () => delete (navigator as { clipboard?: unknown }).clipboard };
}

async function warnings(fn: () => Promise<void>): Promise<string[]> {
  const orig = console.warn;
  const warns: string[] = [];
  console.warn = (...a: unknown[]) => void warns.push(a.join(' '));
  try {
    await fn();
  } finally {
    console.warn = orig;
  }
  return warns;
}

/** A link click would navigate the test page: cancel it once it reaches `document`. */
const cancel = (e: Event) => {
  if (e.composedPath().some((n) => n instanceof HTMLAnchorElement)) e.preventDefault();
};

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-citation (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = async (attrs = '', children = FORMATS) => {
      const el = await fixture<UvalibCitation>(
        `<uvalib-citation ${attr} ${attrs}>${children}</uvalib-citation>`,
      );
      await settle(el);
      return el;
    };

    before(() => document.addEventListener('click', cancel));
    after(() => document.removeEventListener('click', cancel));
    beforeEach(() => localStorage.removeItem(STORAGE_KEY));
    afterEach(() => {
      localStorage.removeItem(STORAGE_KEY);
      document.getSelection()?.removeAllRanges();
    });

    it('reads the formats from data-format children and shows the first, italics kept', async () => {
      const el = await make();
      expect(names(el)).to.deep.equal(['MLA', 'APA', 'Chicago', 'Bluebook']);
      expect(checked(el)).to.equal('MLA');
      expect(region(el).getAttribute('role')).to.equal('region');
      expect(region(el).getAttribute('aria-label')).to.equal('MLA citation');
      expect(region(el).querySelector('i')!.textContent).to.equal('Notes on the State of Virginia');
      expect(region(el).textContent).to.contain('Edited by William Peden');
      // The source children are not shown.
      const sources = [...el.querySelectorAll('blockquote')];
      expect(sources.every((b) => b.getClientRects().length === 0)).to.equal(true);
    });

    it('is a labelled group with a radiogroup named "Citation format"', async () => {
      const el = await make('label="How to cite"');
      const group = root(el).querySelector('[role="group"]')!;
      const label = root(el).querySelector(`#${group.getAttribute('aria-labelledby')}`);
      expect(label!.textContent!.trim()).to.equal('How to cite');
      expect(root(el).querySelector('[role="radiogroup"]')!.getAttribute('aria-label')).to.equal(
        'Citation format',
      );
      const again = await make('hide-label');
      const p = root(again).querySelector('.label')!;
      expect(p.textContent!.trim()).to.equal('Cite this item');
      expect(getComputedStyle(p).position).to.equal('absolute');
    });

    it('takes the citations property, sanitised, winning over children', async () => {
      const el = await make();
      el.citations = [
        {
          format: 'MLA',
          html: 'A <i>Title</i> <script>window.__x = 1</script><img src=x onerror="window.__x=2"><a href="javascript:alert(1)">link</a> <b onclick="x()">bold</b>',
        },
        { format: 'APA', text: 'Plain <i>not markup</i>' },
      ];
      await settle(el);
      expect(names(el)).to.deep.equal(['MLA', 'APA']);
      const r = region(el);
      expect(r.querySelector('i')!.textContent).to.equal('Title');
      expect(r.querySelector('script, img, a')).to.equal(null);
      expect(r.querySelector('b')!.hasAttribute('onclick')).to.equal(false);
      expect(r.textContent).to.contain('link');
      expect((window as { __x?: number }).__x).to.equal(undefined);
      radios(el)[1]!.click();
      await settle(el);
      expect(region(el).querySelector('i')).to.equal(null);
      expect(region(el).textContent).to.equal('Plain <i>not markup</i>');
      el.citations = undefined;
      await settle(el);
      expect(names(el)).to.have.length(4);
    });

    it('sanitises children too, and warns about duplicates once', async () => {
      let el!: UvalibCitation;
      const warns = await warnings(async () => {
        el = await make(
          '',
          '<div data-format="MLA">A <a href="https://example.edu" onclick="x()">link</a> <em>T</em><img alt="decoration"></div><div data-format="mla">Again</div>',
        );
      });
      expect(names(el)).to.deep.equal(['MLA']);
      expect(region(el).querySelector('a, img')).to.equal(null);
      expect(region(el).querySelector('em')!.textContent).to.equal('T');
      expect(warns.filter((w) => w.includes('second citation'))).to.have.length(1);
    });

    it('selects by click and by the arrow keys, one tab stop, firing an event', async () => {
      const el = await make();
      const fired: string[] = [];
      el.addEventListener('uvalib-citation-format', (e) =>
        fired.push((e as CustomEvent<{ format: string }>).detail.format),
      );
      radios(el)[2]!.click();
      await settle(el);
      expect(checked(el)).to.equal('Chicago');
      expect(el.getAttribute('format')).to.equal('Chicago');
      expect(region(el).getAttribute('aria-label')).to.equal('Chicago citation');
      // Keyboard: Tab enters at the checked radio, arrows move and select.
      (document.activeElement as HTMLElement | null)?.blur();
      const before = document.createElement('button');
      before.textContent = 'Before';
      el.before(before);
      before.focus();
      await sendKeys({ press: 'Tab' });
      expect(isFocused(radios(el)[2]!)).to.equal(true);
      expect(radios(el)[2]!.matches(':focus-visible')).to.equal(true);
      await sendKeys({ press: 'ArrowRight' });
      await settle(el);
      expect(checked(el)).to.equal('Bluebook');
      await sendKeys({ press: 'Tab' });
      expect(isFocused(copyButton(el))).to.equal(true);
      before.remove();
      expect(fired).to.deep.equal(['Chicago', 'Bluebook']);
    });

    it('format picks the selected one (case-insensitive), else the first', async () => {
      const el = await make('format="apa"');
      expect(checked(el)).to.equal('APA');
      el.format = 'Bluebook';
      await settle(el);
      expect(checked(el)).to.equal('Bluebook');
      el.format = 'Harvard';
      await settle(el);
      expect(checked(el)).to.equal('MLA');
    });

    it('remember: the last choice wins next time; off by default', async () => {
      const a = await make('remember');
      radios(a)[3]!.click();
      await settle(a);
      expect(localStorage.getItem(STORAGE_KEY)).to.equal('bluebook');
      const b = await make('remember format="APA"');
      expect(checked(b)).to.equal('Bluebook');
      const c = await make('format="APA"');
      expect(checked(c)).to.equal('APA');
      radios(c)[2]!.click();
      await settle(c);
      expect(localStorage.getItem(STORAGE_KEY)).to.equal('bluebook');
    });

    it('remember still works when storage throws', async () => {
      const proto = Storage.prototype;
      const { getItem, setItem } = proto;
      proto.getItem = () => {
        throw new Error('blocked');
      };
      proto.setItem = () => {
        throw new Error('blocked');
      };
      try {
        const el = await make('remember format="APA"');
        expect(checked(el)).to.equal('APA');
        radios(el)[1]!.click();
        radios(el)[2]!.click();
        await settle(el);
        expect(checked(el)).to.equal('Chicago');
      } finally {
        Object.assign(proto, { getItem, setItem });
      }
    });

    it('copies as text/plain and text/html, and announces "<format> citation copied"', async () => {
      const clip = stubClipboard();
      try {
        const el = await make('format="Bluebook"');
        expect(status(el).textContent!.trim()).to.equal('');
        copyButton(el).click();
        await new Promise((r) => setTimeout(r, 30));
        await settle(el);
        expect(clip.copied).to.have.length(1);
        const c = clip.copied[0]!;
        expect(c.via).to.equal('write');
        expect(c.text).to.equal(
          'Thomas Jefferson, Notes on the State of Virginia (William Peden ed., Univ. of N.C. Press 1955).',
        );
        expect(c.html).to.equal(BLUEBOOK);
        expect(status(el).textContent!.trim()).to.equal('Bluebook citation copied');
        expect(status(el).getAttribute('role')).to.equal('status');
      } finally {
        clip.restore();
      }
    });

    it('copies plain text with writeText when there is no write, or no markup', async () => {
      const clip = stubClipboard({ write: false });
      try {
        const el = await make();
        copyButton(el).click();
        await new Promise((r) => setTimeout(r, 30));
        expect(clip.copied.map((c) => c.via)).to.deep.equal(['writeText']);
        expect(clip.copied[0]!.text).to.match(/^Jefferson, Thomas\. Notes on the State/);
      } finally {
        clip.restore();
      }
      const plain = stubClipboard();
      try {
        const el = await make('', '<p data-format="MLA">No markup here.</p>');
        copyButton(el).click();
        await new Promise((r) => setTimeout(r, 30));
        expect(plain.copied).to.deep.equal([{ text: 'No markup here.', via: 'writeText' }]);
      } finally {
        plain.restore();
      }
    });

    it('when copying fails, selects the citation and says so', async () => {
      const clip = stubClipboard({ fail: true });
      try {
        const el = await make('format="APA"');
        copyButton(el).click();
        await new Promise((r) => setTimeout(r, 30));
        await settle(el);
        expect(status(el).textContent!.trim()).to.equal(
          'Could not copy: the APA citation is selected, copy it with your keyboard',
        );
        expect(document.getSelection()!.toString().replace(/\s+/g, ' ').trim()).to.equal(
          'Jefferson, T. (1955). Notes on the state of Virginia (W. Peden, Ed.). University of North Carolina Press.',
        );
      } finally {
        clip.restore();
      }
    });

    it('the status has AAA contrast in light and dark', async () => {
      const clip = stubClipboard();
      try {
        const check = async (bg: string) => {
          const el = await make();
          copyButton(el).click();
          await new Promise((r) => setTimeout(r, 30));
          await settle(el);
          const c = getComputedStyle(status(el)).color;
          expect(contrast(c, bg), `${c} on ${bg}`).to.be.at.least(7);
        };
        await check('rgb(255, 255, 255)');
        await inDarkMode(async () => {
          await check(getComputedStyle(document.body).backgroundColor);
        });
      } finally {
        clip.restore();
      }
    });

    it('ris-href adds a Download RIS link with download; actions slot after it', async () => {
      const el = await make(
        'ris-href="/record/u123.ris"',
        `${FORMATS}<a slot="actions" href="/record/u123.enw" download>EndNote</a>`,
      );
      const links = [...root(el).querySelectorAll<HTMLAnchorElement>('.actions a')];
      const ris = links.find((a) => a.textContent!.trim() === 'Download RIS')!;
      expect(ris.hasAttribute('download')).to.equal(true);
      expect(ris.getAttribute('href')).to.equal('/record/u123.ris');
      expect(ris.getBoundingClientRect().height).to.be.at.least(44);
      const endnote = el.querySelector<HTMLAnchorElement>('a[slot="actions"]')!;
      expect(endnote.getClientRects().length).to.be.greaterThan(0);
      expect(
        ris.compareDocumentPosition(
          mode === 'shadow' ? root(el).querySelector('slot[name="actions"]')! : endnote,
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).to.not.equal(0);
      const relabeled = await make('ris-href="/x.ris" ris-label="RIS (EndNote, Zotero)"');
      expect(root(relabeled).querySelector('.actions a')!.textContent!.trim()).to.equal(
        'RIS (EndNote, Zotero)',
      );
      const unsafe = await warnings(async () => {
        const bad = await make('ris-href="javascript:alert(1)"');
        expect(root(bad).querySelector('.actions a')).to.equal(null);
      });
      expect(unsafe.length).to.equal(1);
    });

    it('reports copy, format (settled) and download, never the citation', async () => {
      const clip = stubClipboard();
      const rec = recordAnalytics();
      const settleMs = citationTiming.settle;
      citationTiming.settle = 30;
      try {
        const el = await make('ris-href="/x.ris"');
        expect(rec.events, 'reported on render').to.deep.equal([]);
        radios(el)[1]!.click();
        radios(el)[2]!.click();
        await new Promise((r) => setTimeout(r, 80));
        // Back where it started within the settle time: nothing.
        radios(el)[1]!.click();
        radios(el)[2]!.click();
        await new Promise((r) => setTimeout(r, 80));
        copyButton(el).click();
        await new Promise((r) => setTimeout(r, 30));
        root(el).querySelector<HTMLAnchorElement>('.actions a')!.click();
        el.format = 'MLA';
        await settle(el);
        await new Promise((r) => setTimeout(r, 80));
        expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
          ['uvalib-citation', 'format', 'Chicago'],
          ['uvalib-citation', 'copy', 'Chicago'],
          ['uvalib-citation', 'download', 'ris'],
        ]);
        expect(JSON.stringify(rec.events)).to.not.include('Jefferson');
      } finally {
        citationTiming.settle = settleMs;
        rec.restore();
        clip.restore();
      }
    });

    it('honours the analytics opt-out', async () => {
      const clip = stubClipboard();
      const rec = recordAnalytics();
      try {
        const wrap = await fixture<HTMLDivElement>(
          `<div no-analytics><uvalib-citation ${attr} ris-href="/x.ris">${FORMATS}</uvalib-citation></div>`,
        );
        const el = wrap.querySelector<UvalibCitation>('uvalib-citation')!;
        await settle(el);
        copyButton(el).click();
        root(el).querySelector<HTMLAnchorElement>('.actions a')!.click();
        await new Promise((r) => setTimeout(r, 30));
        expect(rec.events).to.deep.equal([]);
      } finally {
        rec.restore();
        clip.restore();
      }
    });

    it('has 44px targets and a visible focus ring', async () => {
      const el = await make('ris-href="/x.ris"');
      for (const r of radios(el))
        expect(r.closest('label')!.getBoundingClientRect().height).to.be.at.least(44);
      expect(copyButton(el).getBoundingClientRect().height).to.be.at.least(44);
      copyButton(el).focus();
      (document.activeElement as HTMLElement | null)?.blur();
      radios(el)[0]!.focus();
      await sendKeys({ press: 'ArrowRight' });
      const face = radios(el)[1]!.nextElementSibling!;
      expect(getComputedStyle(face).outlineWidth).to.equal('3px');
    });

    it('marks the selected format with a tick, not colour alone, also in forced colors', async () => {
      const el = await make();
      const tick = (i: number) => radios(el)[i]!.closest('label')!.querySelector('svg.check')!;
      expect(getComputedStyle(tick(0)).display).to.not.equal('none');
      expect(getComputedStyle(tick(1)).display).to.equal('none');
      await emulateMedia({ forcedColors: 'active' });
      try {
        const on = getComputedStyle(radios(el)[0]!.nextElementSibling!);
        const off = getComputedStyle(radios(el)[1]!.nextElementSibling!);
        expect(on.backgroundColor).to.not.equal(off.backgroundColor);
        expect(off.borderTopStyle).to.equal('solid');
        expect(getComputedStyle(tick(0)).display).to.not.equal('none');
      } finally {
        await emulateMedia({ forcedColors: 'none' });
      }
    });

    it('passes axe', async () => {
      const el = await make('ris-href="/x.ris"');
      await expectNoAxeViolations(el);
    });

    it('passes axe in dark mode', async () => {
      await inDarkMode(async () => {
        const el = await make('ris-href="/x.ris"');
        await expectNoAxeViolations(el);
      });
    });

    it('reflows at 320px with no horizontal scroll', async () => {
      await setViewport({ width: 320, height: 640 });
      try {
        await make(
          'ris-href="/x.ris"',
          `${FORMATS}<p data-format="Long">https://search.lib.virginia.edu/sources/uva_library/items/u0000000000000000000000000001</p>`,
        );
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
    });

    it('no-style keeps the structure: 44px radios and the hidden label', async () => {
      const el = await make('no-style hide-label');
      for (const r of radios(el)) {
        expect(getComputedStyle(r).opacity).to.equal('0');
        expect(r.closest('label')!.getBoundingClientRect().height).to.be.at.least(44);
      }
      expect(getComputedStyle(root(el).querySelector('.label')!).position).to.equal('absolute');
    });

    it('renders nothing without formats', async () => {
      const el = await make('', '');
      expect(root(el).querySelector('[role="group"]')).to.equal(null);
      expect(el.hasAttribute('data-empty')).to.equal(true);
    });
  });
}
