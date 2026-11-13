import { expect, fixture } from '@open-wc/testing';
import '../src/components/uvalib-filter/uvalib-filter.js';
import type { UvalibFilter } from '../src/components/uvalib-filter/UvalibFilter.js';
import { expectNoAxeViolations } from './helpers/axe.js';

const buckets = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    key: `Person ${i + 1}`,
    doc_count: i + 1,
    selected: false,
  }));
const filter = (n = 3, name = 'participants') => ({
  name,
  title: 'Participants',
  position: 0,
  buckets: buckets(n),
});
const scopes = [
  { value: 'Board member', label: 'Board' },
  { value: 'Staff', label: 'Staff' },
];

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const boxes = (el: Element) => [
  ...root(el).querySelectorAll<HTMLInputElement>('input[type=checkbox]'),
];
const button = (el: Element, part: string) =>
  root(el).querySelector<HTMLButtonElement>(`button[part="${part}"]`);

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-filter (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = async (props: Partial<UvalibFilter> = {}, attrs = ''): Promise<UvalibFilter> => {
      const el = await fixture<UvalibFilter>(`<uvalib-filter ${attr} ${attrs}></uvalib-filter>`);
      Object.assign(el, props);
      await el.updateComplete;
      return el;
    };

    it('renders a fieldset, legend and a checkbox with count per bucket', async () => {
      const el = await make({ filter: filter(3) });
      expect(root(el).querySelector('fieldset > legend')!.textContent).to.equal('Participants');
      const labels = boxes(el).map((b) =>
        root(el).querySelector(`label[for="${b.id}"]`)!.textContent!.trim(),
      );
      expect(labels).to.deep.equal(['Person 1 (1)', 'Person 2 (2)', 'Person 3 (3)']);
    });

    it('checks boxes from value, case-insensitively', async () => {
      const el = await make({ filter: filter(3), value: ['person 2'] });
      expect(boxes(el).map((b) => b.checked)).to.deep.equal([false, true, false]);
    });

    it('checking a box fires filter-change with {name, value}', async () => {
      const el = await make({ filter: filter(3), value: ['Person 1'] });
      let detail: unknown;
      el.addEventListener('filter-change', (e) => (detail = (e as CustomEvent).detail));
      boxes(el)[1]!.click();
      expect(detail).to.deep.equal({ name: 'participants', value: ['Person 1', 'Person 2'] });
      boxes(el)[0]!.click();
      expect(detail).to.deep.equal({ name: 'participants', value: ['Person 2'] });
    });

    it('scope buttons are aria-pressed toggles that fire scope-change with {value}', async () => {
      const el = await make({ filter: filter(2), scopes, scopeValue: ['staff'] });
      const btns = [...root(el).querySelectorAll<HTMLButtonElement>('button.scope')];
      expect(btns.map((b) => b.getAttribute('aria-pressed'))).to.deep.equal(['false', 'true']);
      expect(btns.every((b) => b.type === 'button')).to.equal(true);
      let detail: unknown;
      el.addEventListener('scope-change', (e) => (detail = (e as CustomEvent).detail));
      btns[0]!.click();
      expect(detail).to.deep.equal({ value: ['staff', 'Board member'] });
      await el.updateComplete;
      expect(btns[0]!.getAttribute('aria-pressed')).to.equal('true');
    });

    it('names the scope group from scopesLabel, with a neutral default', async () => {
      const el = await make({ filter: filter(2), scopes });
      expect(root(el).querySelector('[role=group]')!.getAttribute('aria-label')).to.equal(
        'Filter Participants by type',
      );
      el.scopesLabel = 'Show Participants by role';
      await el.updateComplete;
      expect(root(el).querySelector('[role=group]')!.getAttribute('aria-label')).to.equal(
        'Show Participants by role',
      );
    });

    it('shows no scope group without scopes', async () => {
      const el = await make({ filter: filter(2) });
      expect(root(el).querySelector('[role=group]')).to.equal(null);
    });

    it('limit shows N buckets; see more doubles, see less halves back', async () => {
      const el = await make({ filter: filter(12) }, 'limit="5"');
      expect(boxes(el).length).to.equal(5);
      expect(button(el, 'see-less')).to.equal(null);
      button(el, 'see-more')!.click();
      await el.updateComplete;
      expect(boxes(el).length).to.equal(10);
      button(el, 'see-more')!.click();
      await el.updateComplete;
      expect(boxes(el).length).to.equal(12);
      expect(button(el, 'see-more')).to.equal(null);
      button(el, 'see-less')!.click();
      await el.updateComplete;
      expect(boxes(el).length).to.equal(6);
      button(el, 'see-less')!.click();
      await el.updateComplete;
      expect(boxes(el).length).to.equal(5);
      expect(button(el, 'see-less')).to.equal(null);
    });

    it('without a limit shows everything and no see more/less', async () => {
      const el = await make({ filter: filter(12) });
      expect(boxes(el).length).to.equal(12);
      expect(button(el, 'see-more')).to.equal(null);
      expect(button(el, 'see-less')).to.equal(null);
    });

    it('see more/less are type=button, control the list and name what they expand', async () => {
      const el = await make({ filter: filter(12) }, 'limit="5"');
      const more = button(el, 'see-more')!;
      expect(more.type).to.equal('button');
      const list = root(el).querySelector(`#${more.getAttribute('aria-controls')}`);
      expect(list, 'aria-controls target').to.not.equal(null);
      expect(list!.querySelectorAll('input[type=checkbox]').length).to.equal(5);
      expect(more.textContent).to.contain('See more');
      expect(more.textContent).to.contain('Participants');
    });

    it('two instances on one page have no duplicate ids', async () => {
      const wrap = await fixture<HTMLDivElement>(`<div>
        <uvalib-filter ${attr} limit="2"></uvalib-filter>
        <uvalib-filter ${attr} limit="2"></uvalib-filter></div>`);
      const els = [...wrap.querySelectorAll<UvalibFilter>('uvalib-filter')];
      for (const e of els) e.filter = filter(4); // same filter.name on purpose
      await Promise.all(els.map((e) => e.updateComplete));
      const ids = els.flatMap((e) => [...root(e).querySelectorAll('[id]')].map((n) => n.id));
      expect(ids.length).to.be.greaterThan(4);
      expect(new Set(ids).size, ids.join()).to.equal(ids.length);
      if (mode === 'no-shadow-dom') {
        const all = [...document.querySelectorAll('[id]')].map((n) => n.id);
        expect(new Set(all).size).to.equal(all.length);
      }
    });

    it('has no axe violations', async () => {
      const el = await make(
        { filter: filter(8), scopes, scopeValue: ['Staff'], value: ['Person 2'] },
        'limit="5"',
      );
      await expectNoAxeViolations(el);
    });

    it('works as BOV search-main.js drives it', async () => {
      const host = await fixture<HTMLElement>('<div></div>');
      const el = document.createElement('uvalib-filter') as UvalibFilter;
      if (mode === 'no-shadow-dom') el.setAttribute('no-shadow-dom', '');
      el.dataset.facet = 'participants';
      el.setAttribute('limit', '5');
      el.scopes = [
        { value: 'Board member', label: 'Board' },
        { value: 'University officer', label: 'Officers' },
        { value: 'Staff', label: 'Staff' },
        { value: 'Other attendee', label: 'Other' },
      ];
      const selected: Record<string, string[]> = {};
      el.addEventListener(
        'scope-change',
        (e) => (selected.attendee_types = (e as CustomEvent).detail.value),
      );
      el.addEventListener('filter-change', (e) => {
        const d = (e as CustomEvent).detail;
        selected[d.name] = d.value;
      });
      host.appendChild(el);
      el.filter = { name: 'participants', title: 'Participants', position: 0, buckets: buckets(8) };
      el.value = selected.participants || [];
      el.scopeValue = selected.attendee_types || [];
      await el.updateComplete;
      expect(boxes(el).length).to.equal(5);
      boxes(el)[2]!.click();
      expect(selected.participants).to.deep.equal(['Person 3']);
      root(el).querySelector<HTMLButtonElement>('button.scope')!.click();
      expect(selected.attendee_types).to.deep.equal(['Board member']);
      // Re-setting a fresh filter object (as BOV does after each search) keeps working.
      el.filter = { name: 'participants', title: 'Participants', position: 0, buckets: buckets(8) };
      el.value = selected.participants;
      await el.updateComplete;
      expect(boxes(el).filter((b) => b.checked).length).to.equal(1);
    });
  });
}
