import { expect, fixture, nextFrame } from '@open-wc/testing';
import { emulateMedia, sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-tag-list/uvalib-tag-list.js';
import type { UvalibTagList } from '../src/components/uvalib-tag-list/UvalibTagList.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { recordAnalytics } from './helpers/analytics.js';
import { inDarkMode } from './helpers/dark.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const list = (el: Element) => root(el).querySelector<HTMLUListElement>('ul')!;
const tagsOf = (el: Element) => [...list(el).querySelectorAll<HTMLElement>(':scope > li > .tag')];
/** Each visible tag as [tag name, text, href]. */
const shown = (el: Element) =>
  tagsOf(el)
    .filter((t) => !t.closest('li')!.hidden)
    .map((t) => [t.localName, t.textContent, t.getAttribute('href')]);
const toggle = (el: Element) => root(el).querySelector<HTMLButtonElement>('button.toggle');

async function settle(el: UvalibTagList): Promise<void> {
  await nextFrame();
  await el.updateComplete;
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

const TAGS = `<a href="/search?q=Rotunda">Rotunda</a><span>Lawn</span><a href="/search?q=Snow">Snow</a><span>Students</span><span>Architecture</span>`;

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-tag-list (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = (children = TAGS, attrs = 'label="Subjects"') =>
      fixture<UvalibTagList>(`<uvalib-tag-list ${attr} ${attrs}>${children}</uvalib-tag-list>`);

    afterEach(async () => {
      await emulateMedia({ forcedColors: 'none' });
    });

    it('renders a list named by its visible label, links and plain tags', async () => {
      const el = await make();
      const ul = list(el);
      expect(ul.getAttribute('role')).to.equal('list');
      const label = root(el).querySelector<HTMLElement>(`#${ul.getAttribute('aria-labelledby')}`)!;
      expect(label.textContent).to.equal('Subjects');
      expect(label.classList.contains('visually-hidden')).to.equal(false);
      expect(shown(el)).to.deep.equal([
        ['a', 'Rotunda', '/search?q=Rotunda'],
        ['span', 'Lawn', null],
        ['a', 'Snow', '/search?q=Snow'],
        ['span', 'Students', null],
        ['span', 'Architecture', null],
      ]);
      // Links are outlined, plain tags filled: shape, not colour alone, tells them apart.
      const [link, plain] = tagsOf(el);
      expect(getComputedStyle(link!).borderTopColor).to.not.equal('rgba(0, 0, 0, 0)');
      expect(getComputedStyle(plain!).backgroundColor).to.equal('rgb(191, 231, 247)');
    });

    it('hide-label keeps the name but hides it visually', async () => {
      const el = await make(TAGS, 'label="AI tags" hide-label');
      const label = root(el).querySelector<HTMLElement>('.label')!;
      expect(label.classList.contains('visually-hidden')).to.equal(true);
      expect(getComputedStyle(label).position).to.equal('absolute');
      expect(list(el).getAttribute('aria-labelledby')).to.equal(label.id);
    });

    it('warns once without a label', async () => {
      const warns = await warnings(async () => {
        await make(TAGS, '');
      });
      expect(warns.filter((w) => w.includes('label')).length).to.equal(1);
    });

    it('href-template makes tags without an href search links, URL-encoded', async () => {
      const el = await make(
        '<span>Faculty &amp; Staff</span><a href="/x">Own</a>',
        'label="Subjects" href-template="/search?q={tag}"',
      );
      expect(shown(el)).to.deep.equal([
        ['a', 'Faculty & Staff', '/search?q=Faculty%20%26%20Staff'],
        ['a', 'Own', '/x'],
      ]);
    });

    it('items wins over the children; unsafe hrefs become text with one warning', async () => {
      const el = await make();
      let warns: string[] = [];
      warns = await warnings(async () => {
        el.items = [
          { label: 'One', href: '#one' },
          { label: 'Bad', href: 'javascript:alert(1)' },
          { label: '  ' },
          { label: 'Two' },
        ];
        await settle(el);
      });
      expect(shown(el)).to.deep.equal([
        ['a', 'One', '#one'],
        ['span', 'Bad', null],
        ['span', 'Two', null],
      ]);
      expect(warns.length).to.equal(2);
      el.items = undefined;
      await settle(el);
      expect(shown(el).length).to.equal(5);
    });

    it('follows child changes and does not show the source children', async () => {
      const el = await make('<span>One</span>');
      const extra = document.createElement('a');
      extra.href = '#two';
      extra.textContent = 'Two';
      el.append(extra);
      await settle(el);
      expect(shown(el).map((s) => s[1])).to.deep.equal(['One', 'Two']);
      const sources = [...el.querySelectorAll('a, span:not(.label)')].filter(
        (n) => !list(el).contains(n),
      );
      for (const s of sources) expect((s as HTMLElement).offsetParent).to.equal(null);
    });

    it('with no tags, renders nothing visible and sets data-empty', async () => {
      const el = await make('', 'label="Subjects"');
      expect(el.hasAttribute('data-empty')).to.equal(true);
      expect(el.getBoundingClientRect().height).to.equal(0);
    });

    it('limit shows that many and a Show all N toggle that keeps focus', async () => {
      const rec = recordAnalytics();
      try {
        const el = await make(TAGS, 'label="Subjects" limit="2"');
        expect(shown(el).map((s) => s[1])).to.deep.equal(['Rotunda', 'Lawn']);
        const btn = toggle(el)!;
        expect(btn.getAttribute('aria-expanded')).to.equal('false');
        expect(btn.getAttribute('aria-controls')).to.equal(list(el).id);
        expect(btn.textContent!.replace(/\s+/g, ' ').trim()).to.equal('Show all 5 Subjects');
        expect(btn.querySelector('.visually-hidden')!.textContent).to.equal(' Subjects');
        // Keyboard: Tab reaches the toggle after the visible links; Enter opens it.
        (document.activeElement as HTMLElement | null)?.blur();
        btn.focus();
        await sendKeys({ press: 'Enter' });
        await settle(el);
        expect(shown(el).length).to.equal(5);
        expect(btn.getAttribute('aria-expanded')).to.equal('true');
        expect(btn.textContent!.replace(/\s+/g, ' ').trim()).to.equal('Show fewer Subjects');
        const active = el.shadowRoot ? el.shadowRoot.activeElement : document.activeElement;
        expect(active === btn).to.equal(true);
        await sendKeys({ press: ' ' });
        await settle(el);
        expect(shown(el).length).to.equal(2);
        expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
          ['uvalib-tag-list', 'show-all', 'Subjects'],
          ['uvalib-tag-list', 'show-fewer', 'Subjects'],
        ]);
      } finally {
        rec.restore();
      }
    });

    it('no toggle when the tags fit the limit, or the limit is not positive', async () => {
      expect(toggle(await make(TAGS, 'label="S" limit="5"'))).to.equal(null);
      expect(toggle(await make(TAGS, 'label="S" limit="0"'))).to.equal(null);
      expect(toggle(await make(TAGS, 'label="S" limit="x"'))).to.equal(null);
    });

    it('a tag click reports the list label and position, never the tag; navigate is cancelable', async () => {
      const rec = recordAnalytics();
      const navs: unknown[] = [];
      const route = (e: Event) => {
        navs.push((e as CustomEvent).detail);
        e.preventDefault();
      };
      document.addEventListener('uvalib-tag-list-navigate', route);
      try {
        const el = await make();
        expect(rec.events).to.deep.equal([]);
        const snow = tagsOf(el)[2] as HTMLAnchorElement;
        const click = new MouseEvent('click', {
          bubbles: true,
          composed: true,
          cancelable: true,
          button: 0,
        });
        snow.dispatchEvent(click);
        expect(click.defaultPrevented).to.equal(true);
        expect(navs).to.deep.equal([{ href: '/search?q=Snow', tag: 'Snow', index: 2 }]);
        // A modified click is tracked but not routed; cancel it (after the element saw it)
        // so the page stays.
        const stop = (e: Event) => e.preventDefault();
        document.addEventListener('click', stop);
        snow.dispatchEvent(
          new MouseEvent('click', {
            bubbles: true,
            composed: true,
            cancelable: true,
            ctrlKey: true,
          }),
        );
        document.removeEventListener('click', stop);
        expect(navs.length).to.equal(1);
        const events = rec.of('uvalib-analytics-event').map((d) => d.event);
        expect(events).to.deep.equal([
          ['uvalib-tag-list', 'tag-click', 'Subjects', 3],
          ['uvalib-tag-list', 'tag-click', 'Subjects', 3],
        ]);
        expect(JSON.stringify(rec.events)).to.not.include('Snow');
        // Plain tags are not clicks.
        (tagsOf(el)[1] as HTMLElement).click();
        expect(rec.of('uvalib-analytics-event').length).to.equal(2);
      } finally {
        document.removeEventListener('uvalib-tag-list-navigate', route);
        rec.restore();
      }
    });

    it('reports "tags" when unlabelled, and nothing with no-analytics', async () => {
      const rec = recordAnalytics();
      const route = (e: Event) => e.preventDefault();
      document.addEventListener('uvalib-tag-list-navigate', route);
      try {
        await warnings(async () => {
          const el = await make(TAGS, '');
          (tagsOf(el)[0] as HTMLAnchorElement).click();
          const quiet = await make(TAGS, 'label="S" no-analytics');
          (tagsOf(quiet)[0] as HTMLAnchorElement).click();
        });
        expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
          ['uvalib-tag-list', 'tag-click', 'tags', 1],
        ]);
      } finally {
        document.removeEventListener('uvalib-tag-list-navigate', route);
        rec.restore();
      }
    });

    it('links have a 24px target, the focus ring, and pass axe', async () => {
      const el = await make(TAGS, 'label="Subjects" limit="3"');
      for (const t of [...tagsOf(el), toggle(el)!].filter((t) => !t.closest('[hidden]')))
        expect(t.getBoundingClientRect().height, t.textContent!).to.be.at.least(24);
      (document.activeElement as HTMLElement | null)?.blur();
      const first = tagsOf(el)[0]!;
      first.focus();
      await sendKeys({ press: 'Shift+Tab' });
      await sendKeys({ press: 'Tab' });
      expect(first.matches(':focus-visible')).to.equal(true);
      expect(getComputedStyle(first).outlineWidth).to.equal('3px');
      first.blur();
      await expectNoAxeViolations(el);
    });

    it('passes axe in dark mode, with readable tags', async () => {
      await inDarkMode(async () => {
        const el = await make(TAGS, 'label="Subjects" limit="3"');
        const link = tagsOf(el)[0]!;
        expect(getComputedStyle(link).color).to.equal('rgb(135, 185, 217)');
        await expectNoAxeViolations(el);
      });
    });

    it('wraps at 320px with no horizontal scroll', async () => {
      await setViewport({ width: 320, height: 640 });
      try {
        const el = await make(
          `${TAGS}<span>A very long subject heading that has to wrap onto more than one line somewhere</span>`,
        );
        for (const t of tagsOf(el)) expect(t.getBoundingClientRect().right).to.be.at.most(320);
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
    });

    it('forced colors: plain tags and links keep their outlines', async () => {
      await emulateMedia({ forcedColors: 'active' });
      const el = await make();
      for (const t of tagsOf(el)) {
        const s = getComputedStyle(t);
        expect(s.borderTopStyle).to.equal('solid');
        expect(s.borderTopColor).to.not.equal('rgba(0, 0, 0, 0)');
      }
    });

    it('keeps the row layout and the hidden label with no-style', async () => {
      const el = await make(TAGS, 'label="S" hide-label no-style');
      expect(getComputedStyle(list(el)).display).to.equal('flex');
      expect(getComputedStyle(list(el)).listStyleType).to.equal('none');
      expect(getComputedStyle(root(el).querySelector('.label')!).position).to.equal('absolute');
    });
  });
}
