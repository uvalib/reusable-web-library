import { expect, fixture, nextFrame, waitUntil } from '@open-wc/testing';
import { emulateMedia, sendKeys, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-combobox/uvalib-combobox.js';
import {
  comboboxTiming,
  type ComboboxItem,
  type UvalibCombobox,
} from '../src/components/uvalib-combobox/UvalibCombobox.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { recordAnalytics } from './helpers/analytics.js';
import { inDarkMode } from './helpers/dark.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const input = (el: Element) => root(el).querySelector<HTMLInputElement>('[role="combobox"]')!;
const listbox = (el: Element) => root(el).querySelector<HTMLElement>('[role="listbox"]')!;
const options = (el: Element) => [...root(el).querySelectorAll<HTMLElement>('[role="option"]')];
const labels = (el: Element) =>
  options(el).map((o) => o.querySelector('.option-label')!.textContent!.trim());
const clearButton = (el: Element) => root(el).querySelector<HTMLButtonElement>('button.clear')!;
const popup = (el: Element) => root(el).querySelector<HTMLElement>('.popup')!;
const status = (el: Element) => root(el).querySelector<HTMLElement>('[role="status"]')!;
const message = (el: Element) => root(el).querySelector<HTMLElement>('.message')!;
const activeId = (el: Element) => input(el).getAttribute('aria-activedescendant');
const activeLabel = (el: Element) => {
  const id = activeId(el);
  const o = id ? options(el).find((x) => x.id === id) : undefined;
  return o ? o.querySelector('.option-label')!.textContent!.trim() : null;
};
const focused = (el: Element) =>
  (el.shadowRoot ? el.shadowRoot.activeElement : document.activeElement) === input(el);

const PEOPLE: ComboboxItem[] = [
  { value: 'p1', label: 'Elena Marsh', description: 'Photographer' },
  { value: 'p2', label: 'Amelia Stone' },
  { value: 'p3', label: 'Ada Ellis' },
  { value: 'p4', label: 'Émile Durand' },
  { value: 'p5', label: 'Bruno Kelp', disabled: true },
  { value: 'p6', label: 'Noel Park' },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

/** Stub `fetch` for `src`: each call is recorded, and answered from `answer`. */
function stubFetch(answer: (url: string) => unknown | Promise<unknown>) {
  const orig = window.fetch;
  const calls: { url: string; signal: AbortSignal }[] = [];
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, signal: init!.signal! });
    const body = await answer(url);
    if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (body instanceof Response) return body;
    return new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
  return { calls, restore: () => (window.fetch = orig) };
}

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-combobox (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = async (attrs = 'label="Person"', children = '', items: unknown = PEOPLE) => {
      const el = await fixture<UvalibCombobox>(
        `<uvalib-combobox ${attr} ${attrs}>${children}</uvalib-combobox>`,
      );
      if (items) el.items = items as ComboboxItem[];
      await el.updateComplete;
      return el;
    };
    /** Focus the field and type, then let it render. */
    const type = async (el: UvalibCombobox, text: string) => {
      input(el).focus();
      await sendKeys({ type: text });
      await el.updateComplete;
    };
    const press = async (el: UvalibCombobox, key: string) => {
      await sendKeys({ press: key });
      await el.updateComplete;
    };
    const saved = { ...comboboxTiming };

    beforeEach(() => {
      comboboxTiming.debounce = 30;
      comboboxTiming.announce = 40;
    });
    afterEach(async () => {
      Object.assign(comboboxTiming, saved);
      (document.activeElement as HTMLElement | null)?.blur();
    });

    it('wires the field: combobox role, label, description, listbox and placeholder', async () => {
      const el = await make('label="Person" description="Type a name." placeholder="e.g. Elena"');
      const i = input(el);
      expect(i.tagName).to.equal('INPUT');
      expect(i.getAttribute('aria-autocomplete')).to.equal('list');
      expect(i.getAttribute('aria-expanded')).to.equal('false');
      expect(i.getAttribute('autocomplete')).to.equal('off');
      expect(i.placeholder).to.equal('e.g. Elena');
      expect(i.hasAttribute('aria-activedescendant')).to.equal(false);
      const lb = listbox(el);
      expect(i.getAttribute('aria-controls')).to.equal(lb.id);
      const label = root(el).querySelector<HTMLLabelElement>('label')!;
      expect(label.textContent!.trim()).to.equal('Person');
      expect(label.htmlFor).to.equal(i.id);
      expect(lb.getAttribute('aria-labelledby')).to.equal(label.id);
      const desc = root(el).querySelector(`#${i.getAttribute('aria-describedby')}`)!;
      expect(desc.textContent!.trim()).to.equal('Type a name.');
      expect(clearButton(el).hidden).to.equal(true);
      expect(popup(el).hidden).to.equal(true);
      expect(status(el).getAttribute('aria-live')).to.equal('polite');
      expect(status(el).textContent).to.equal('');
    });

    it('warns once without a label', async () => {
      const warns = await warnings(async () => {
        const el = await make('');
        el.requestUpdate();
        await el.updateComplete;
      });
      expect(warns.filter((w) => w.includes('label'))).to.have.length(1);
    });

    it('filters ignoring case and accents, prefix matches first, and marks the match', async () => {
      const el = await make();
      await type(el, 'el');
      expect(input(el).getAttribute('aria-expanded')).to.equal('true');
      // Prefix, then word start, then inside a word.
      expect(labels(el)).to.deep.equal([
        'Elena Marsh',
        'Ada Ellis',
        'Amelia Stone',
        'Bruno Kelp',
        'Noel Park',
      ]);
      const marks = options(el).map((o) =>
        [...o.querySelectorAll('mark')].map((m) => m.textContent),
      );
      expect(marks[0]).to.deep.equal(['El']);
      expect(marks[2]).to.deep.equal(['el']);
      expect(getComputedStyle(options(el)[0]!.querySelector('mark')!).fontWeight).to.equal('700');
      // No option is active while typing.
      expect(activeId(el)).to.equal(null);
      input(el).select();
      await type(el, 'EMILE');
      expect(labels(el)).to.deep.equal(['Émile Durand']);
      expect(options(el)[0]!.querySelector('mark')!.textContent).to.equal('Émile');
      // The description is a second line.
      input(el).select();
      await type(el, 'marsh');
      expect(options(el)[0]!.querySelector('.option-description')!.textContent).to.equal(
        'Photographer',
      );
    });

    it('Down opens on the first option and wraps; Up opens on the last; disabled are skipped', async () => {
      const el = await make();
      input(el).focus();
      await press(el, 'ArrowDown');
      expect(input(el).getAttribute('aria-expanded')).to.equal('true');
      expect(activeLabel(el)).to.equal('Elena Marsh');
      const active = options(el).find((o) => o.id === activeId(el))!;
      expect(active.getAttribute('aria-selected')).to.equal('true');
      expect(options(el).filter((o) => o.getAttribute('aria-selected') === 'true')).to.have.length(
        1,
      );
      for (let k = 0; k < 3; k++) await press(el, 'ArrowDown');
      expect(activeLabel(el)).to.equal('Émile Durand');
      await press(el, 'ArrowDown'); // Bruno Kelp is disabled
      expect(activeLabel(el)).to.equal('Noel Park');
      await press(el, 'ArrowDown');
      expect(activeLabel(el)).to.equal('Elena Marsh');
      await press(el, 'ArrowUp');
      expect(activeLabel(el)).to.equal('Noel Park');
      await press(el, 'Escape');
      expect(input(el).getAttribute('aria-expanded')).to.equal('false');
      expect(input(el).hasAttribute('aria-activedescendant')).to.equal(false);
      await press(el, 'ArrowUp');
      expect(activeLabel(el)).to.equal('Noel Park');
      await press(el, 'Escape');
      await press(el, 'Alt+ArrowDown');
      expect(input(el).getAttribute('aria-expanded')).to.equal('true');
      expect(activeId(el)).to.equal(null);
      await press(el, 'Alt+ArrowUp');
      expect(input(el).getAttribute('aria-expanded')).to.equal('false');
      expect(focused(el)).to.equal(true);
    });

    it('Enter chooses the active option: select, then change, and the field keeps focus', async () => {
      const el = await make();
      const seen: [string, unknown][] = [];
      for (const t of ['select', 'change'])
        el.addEventListener(t, (e) =>
          seen.push([t, e instanceof CustomEvent ? e.detail : 'native']),
        );
      await type(el, 'ada');
      await press(el, 'ArrowDown');
      await press(el, 'Enter');
      expect(el.value).to.equal('Ada Ellis');
      expect(input(el).value).to.equal('Ada Ellis');
      expect(el.selected?.value).to.equal('p3');
      expect(input(el).getAttribute('aria-expanded')).to.equal('false');
      expect(focused(el)).to.equal(true);
      expect(seen).to.deep.equal([
        ['select', { item: PEOPLE[2] }],
        ['change', { value: 'Ada Ellis', item: PEOPLE[2] }],
      ]);
      // Typing again keeps the text and drops the choice.
      await sendKeys({ press: 'Backspace' });
      await el.updateComplete;
      expect(el.value).to.equal('Ada Elli');
      expect(el.selected).to.equal(null);
    });

    it('a click on an option chooses it without blurring; a disabled one does nothing', async () => {
      const el = await make();
      await type(el, 'k');
      const bruno = options(el).find((o) => o.textContent!.includes('Bruno'))!;
      expect(bruno.getAttribute('aria-disabled')).to.equal('true');
      bruno.click();
      await el.updateComplete;
      expect(el.selected).to.equal(null);
      await type(el, '');
      input(el).select();
      await type(el, 'noel');
      options(el)[0]!.click();
      await el.updateComplete;
      expect(el.selected?.value).to.equal('p6');
      expect(focused(el)).to.equal(true);
    });

    it('Escape closes the list, then clears the field', async () => {
      const el = await make();
      const changes: unknown[] = [];
      el.addEventListener('change', (e) => changes.push((e as CustomEvent).detail));
      await type(el, 'ada');
      await press(el, 'Escape');
      expect(input(el).getAttribute('aria-expanded')).to.equal('false');
      expect(el.value).to.equal('ada');
      await press(el, 'Escape');
      expect(el.value).to.equal('');
      expect(input(el).value).to.equal('');
      expect(changes).to.deep.equal([]); // nothing was committed before, nothing now
      await type(el, 'x');
      (document.activeElement as HTMLElement).blur();
      await el.updateComplete;
      expect(changes).to.deep.equal([{ value: 'x', item: null }]);
    });

    it('Home, End and the side arrows move the caret and leave the option', async () => {
      const el = await make();
      await type(el, 'el');
      await press(el, 'ArrowDown');
      expect(activeId(el)).to.not.equal(null);
      await press(el, 'Home');
      expect(activeId(el)).to.equal(null);
      expect(input(el).selectionStart).to.equal(0);
      expect(input(el).getAttribute('aria-expanded')).to.equal('true');
      await press(el, 'ArrowDown');
      await press(el, 'End');
      expect(activeId(el)).to.equal(null);
      expect(input(el).selectionStart).to.equal(2);
    });

    it('Tab leaves without choosing and commits the typed text once', async () => {
      const el = await make();
      const after = document.createElement('button');
      after.textContent = 'after';
      el.after(after);
      const changes: unknown[] = [];
      el.addEventListener('change', (e) => changes.push((e as CustomEvent).detail));
      await type(el, 'ama');
      await press(el, 'ArrowDown');
      await press(el, 'Tab'); // to the clear button
      await press(el, 'Tab');
      expect(document.activeElement === after).to.equal(true);
      expect(el.value).to.equal('ama');
      expect(el.selected).to.equal(null);
      expect(input(el).getAttribute('aria-expanded')).to.equal('false');
      expect(changes).to.deep.equal([{ value: 'ama', item: null }]);
      after.remove();
    });

    it('leaving with text that is exactly one label chooses it', async () => {
      const el = await make();
      await type(el, 'noel park');
      input(el).blur();
      await el.updateComplete;
      expect(el.selected?.value).to.equal('p6');
      expect(el.value).to.equal('Noel Park');
    });

    it('the clear button: named, 44px, only with text, clears and returns focus', async () => {
      const el = await make();
      const changes: unknown[] = [];
      el.addEventListener('change', (e) => changes.push((e as CustomEvent).detail));
      await type(el, 'ada');
      await press(el, 'ArrowDown');
      await press(el, 'Enter');
      const b = clearButton(el);
      expect(b.hidden).to.equal(false);
      expect(b.type).to.equal('button');
      expect(b.getAttribute('aria-label')).to.equal('Clear Person');
      const box = b.getBoundingClientRect();
      expect(box.width).to.be.at.least(44);
      expect(box.height).to.be.at.least(44);
      b.focus();
      await press(el, 'Enter');
      expect(el.value).to.equal('');
      expect(el.selected).to.equal(null);
      expect(focused(el)).to.equal(true);
      expect(clearButton(el).hidden).to.equal(true);
      expect(changes).to.deep.equal([
        { value: 'Ada Ellis', item: PEOPLE[2] },
        { value: '', item: null },
      ]);
    });

    it('announces the count politely once it settles, never on the first render', async () => {
      const el = await make();
      await wait(80);
      expect(status(el).textContent).to.equal('');
      await type(el, 'e');
      await type(el, 'l');
      await waitUntil(() => status(el).textContent === '5 suggestions', 'no count');
      input(el).select();
      await type(el, 'zz');
      await waitUntil(() => status(el).textContent === 'No suggestions', 'no empty note');
      expect(message(el).textContent).to.equal('No suggestions');
      expect(message(el).hidden).to.equal(false);
      expect(input(el).getAttribute('aria-expanded')).to.equal('false');
      input(el).select();
      await type(el, 'ada');
      await waitUntil(() => status(el).textContent === '1 suggestion', 'no single count');
    });

    it('caps the list at max-results and says how many match', async () => {
      const many = Array.from({ length: 120 }, (_, i) => `Person ${i + 1}`);
      const el = await make('label="Person" max-results="10"', '', many);
      await type(el, 'person');
      expect(options(el)).to.have.length(10);
      expect(message(el).textContent).to.equal('Showing 10 of 120. Type more to narrow them.');
      await waitUntil(() => status(el).textContent === '10 of 120 suggestions', 'no capped count');
    });

    it('a long list scrolls inside the popup to keep the active option in view', async () => {
      const many = Array.from({ length: 40 }, (_, i) => `Name ${i + 1}`);
      const el = await make('label="Person"', '', many);
      input(el).focus();
      await press(el, 'ArrowUp'); // opens on the last
      const p = popup(el);
      expect(p.scrollHeight).to.be.greaterThan(p.clientHeight);
      const o = options(el).at(-1)!.getBoundingClientRect();
      const box = p.getBoundingClientRect();
      expect(o.bottom).to.be.at.most(box.bottom + 1);
      expect(o.top).to.be.at.least(box.top - 1);
      expect(p.scrollTop).to.be.greaterThan(0);
    });

    it('reads <option> children directly, in a <datalist>, and adopts a fallback input', async () => {
      const direct = await make(
        'label="Subject"',
        '<option value="s1">Architecture</option><option value="s2" data-description="Sports and games">Athletics</option><option disabled>Art</option>',
        null,
      );
      await type(direct, 'a');
      expect(labels(direct)).to.deep.equal(['Architecture', 'Athletics', 'Art']);
      expect(options(direct)[2]!.getAttribute('aria-disabled')).to.equal('true');
      expect(options(direct)[1]!.textContent).to.include('Sports and games');
      // The author's options are not shown.
      expect(direct.querySelector('option')!.getClientRects().length).to.equal(0);

      const form = document.createElement('form');
      form.innerHTML = `<uvalib-combobox ${attr} label="Place"><input name="place" list="places" value="Rot" placeholder="A place"><datalist id="places"><option>Rotunda</option><option>Lawn</option></datalist></uvalib-combobox>`;
      document.body.append(form);
      try {
        const el = form.querySelector<UvalibCombobox>('uvalib-combobox')!;
        await el.updateComplete;
        expect(el.name).to.equal('place');
        expect(el.value).to.equal('Rot');
        expect(input(el).placeholder).to.equal('A place');
        const fallback = el.querySelector<HTMLInputElement>('input[name="place"]')!;
        expect(fallback.disabled).to.equal(true);
        expect([...new FormData(form).getAll('place')]).to.deep.equal(['Rot']);
        await type(el, 'u');
        expect(labels(el)).to.deep.equal(['Rotunda']);
      } finally {
        form.remove();
      }
    });

    it('takes part in a form: submits the chosen value or the text, resets, validates', async () => {
      const form = document.createElement('form');
      form.innerHTML = `<uvalib-combobox ${attr} label="Person" name="person" value="Someone"></uvalib-combobox><button>Go</button>`;
      document.body.append(form);
      const submits: string[] = [];
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        submits.push(String(new FormData(form).get('person')));
      });
      try {
        const el = form.querySelector<UvalibCombobox>('uvalib-combobox')!;
        el.items = PEOPLE;
        await el.updateComplete;
        expect(el.form === form).to.equal(true);
        expect(new FormData(form).get('person')).to.equal('Someone');
        input(el).select();
        await type(el, 'ada');
        await press(el, 'ArrowDown');
        // Enter on an active option chooses it and does not submit.
        await press(el, 'Enter');
        expect(submits).to.deep.equal([]);
        expect(new FormData(form).get('person')).to.equal('p3');
        // Enter with the list closed submits, as in any field.
        await press(el, 'Enter');
        expect(submits).to.deep.equal(['p3']);
        // Free text is submitted as typed.
        await type(el, 'x');
        expect(new FormData(form).get('person')).to.equal('Ada Ellisx');
        form.reset();
        await el.updateComplete;
        expect(el.value).to.equal('Someone');
        expect(input(el).value).to.equal('Someone');
        expect(el.selected).to.equal(null);
        // required and must-choose.
        el.required = true;
        el.value = '';
        await el.updateComplete;
        expect(el.checkValidity()).to.equal(false);
        expect(el.validity.valueMissing).to.equal(true);
        el.mustChoose = true;
        el.value = 'Nobody';
        await el.updateComplete;
        expect(el.validity.customError).to.equal(true);
        expect(el.validationMessage).to.equal('Choose one of the suggestions.');
        el.selected = PEOPLE[0]!;
        await el.updateComplete;
        expect(el.value).to.equal('Elena Marsh');
        expect(el.checkValidity()).to.equal(true);
        // A disabled fieldset disables the field.
        const fs = document.createElement('fieldset');
        form.prepend(fs);
        fs.append(el);
        fs.disabled = true;
        await el.updateComplete;
        expect(input(el).disabled).to.equal(true);
        expect(clearButton(el).hidden).to.equal(true);
      } finally {
        form.remove();
      }
    });

    describe('src', () => {
      it('fetches once typing pauses, aborts a stale request, and transforms the response', async () => {
        const stub = stubFetch(async (url) => {
          const q = new URL(url).searchParams.get('q')!;
          await wait(q === 'ad' ? 120 : 5);
          return { results: PEOPLE.filter((p) => p.label!.toLowerCase().includes(q)) };
        });
        try {
          const el = await make('label="Person" src="/api/people?q={q}" min-length="2"', '', null);
          el.transform = (data) => (data as { results: ComboboxItem[] }).results;
          await type(el, 'a');
          await wait(60);
          expect(stub.calls).to.have.length(0); // under min-length
          await type(el, 'd');
          await waitUntil(() => stub.calls.length === 1, 'not fetched');
          expect(stub.calls[0]!.url).to.equal(`${location.origin}/api/people?q=ad`);
          await waitUntil(
            () => message(el).textContent === 'Loading suggestions…',
            'no loading note',
          );
          await type(el, 'a');
          await waitUntil(() => stub.calls.length === 2, 'not fetched again');
          expect(stub.calls[0]!.signal.aborted).to.equal(true);
          await waitUntil(() => options(el).length === 1, 'no results');
          expect(labels(el)).to.deep.equal(['Ada Ellis']);
          expect(options(el)[0]!.querySelector('mark')!.textContent).to.equal('Ada');
          // Typing fast: one request for the last text.
          await type(el, 'ms');
          await waitUntil(() => stub.calls.length === 3, 'no request after typing');
          await wait(80);
          expect(stub.calls).to.have.length(3);
          expect(stub.calls[2]!.url).to.include('q=adams');
          // Back to a cached text: no request.
          await sendKeys({ press: 'Backspace' });
          await sendKeys({ press: 'Backspace' });
          await el.updateComplete;
          await wait(80);
          expect(stub.calls).to.have.length(3);
          expect(labels(el)).to.deep.equal(['Ada Ellis']);
          await press(el, 'ArrowDown');
          await press(el, 'Enter');
          expect(el.selected?.value).to.equal('p3');
        } finally {
          stub.restore();
        }
      });

      it('a failed load says so, reports one error and never throws', async () => {
        const rec = recordAnalytics();
        const stub = stubFetch(() => new Response('nope', { status: 500 }));
        try {
          const warns = await warnings(async () => {
            const el = await make('label="Person" src="/api/people?q={q}"', '', null);
            await type(el, 'a');
            await waitUntil(
              () => message(el).textContent === "Couldn't load suggestions",
              'no error note',
            );
            await waitUntil(
              () => status(el).textContent === "Couldn't load suggestions",
              'error not announced',
            );
            await type(el, 'b');
            await waitUntil(() => stub.calls.length === 2, 'not retried');
            await wait(40);
          });
          expect(warns.filter((w) => w.includes("couldn't load"))).to.have.length(1);
          expect(rec.of('uvalib-analytics-event').map((d) => d.event)).to.deep.equal([
            ['uvalib-combobox', 'error', 'load'],
          ]);
        } finally {
          stub.restore();
          rec.restore();
        }
      });
    });

    it('reports select with its position and clear, never the text, and honours no-analytics', async () => {
      const rec = recordAnalytics();
      try {
        const el = await make();
        await nextFrame();
        expect(rec.events, 'reported on render').to.deep.equal([]);
        await type(el, 'el');
        await press(el, 'ArrowDown');
        await press(el, 'ArrowDown');
        await press(el, 'Enter');
        await press(el, 'Escape'); // closed already: clears
        const quiet = await make('label="Person" no-analytics');
        await type(quiet, 'ada');
        await press(quiet, 'ArrowDown');
        await press(quiet, 'Enter');
        clearButton(quiet).click();
        const events = rec.of('uvalib-analytics-event').map((d) => d.event);
        expect(events).to.deep.equal([
          ['uvalib-combobox', 'select', 'Person', 2],
          ['uvalib-combobox', 'clear', 'Person'],
        ]);
        expect(JSON.stringify(rec.events)).to.not.match(/Ellis|Ada|ada|el"/);
      } finally {
        rec.restore();
      }
    });

    it('16,000 local items filter quickly', async () => {
      const first = ['Ada', 'Bruno', 'Clara', 'Dmitri', 'Elena', 'Femi', 'Goran', 'Hana'];
      const last = ['Marsh', 'Stone', 'Ellis', 'Durand', 'Kelp', 'Park', 'Okafor', 'Lindqvist'];
      const many = Array.from({ length: 16000 }, (_, i) => ({
        value: `p${i}`,
        label: `${first[i % 8]} ${last[Math.floor(i / 8) % 8]} ${i}`,
      }));
      const el = await make('label="Person"', '', many);
      input(el).focus();
      const t0 = performance.now();
      input(el).value = 'ellis 12';
      input(el).dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      await el.updateComplete;
      const ms = performance.now() - t0;
      expect(options(el).length).to.be.greaterThan(0);
      expect(options(el).length).to.be.at.most(50);
      expect(labels(el).every((l) => l.toLowerCase().includes('ellis 12'))).to.equal(true);
      expect(ms, `took ${ms} ms`).to.be.below(150);
    });

    it('44px options, the active one shown by more than colour, and axe with the list open', async () => {
      const el = await make('label="Person" description="Type a name."');
      await type(el, 'el');
      await press(el, 'ArrowDown');
      for (const o of options(el)) expect(o.getBoundingClientRect().height).to.be.at.least(44);
      const on = getComputedStyle(options(el)[0]!);
      const off = getComputedStyle(options(el)[1]!);
      expect(on.backgroundColor).to.not.equal(off.backgroundColor);
      expect(on.borderInlineStartColor).to.not.equal(off.borderInlineStartColor);
      expect(on.outlineStyle).to.equal('solid');
      expect(getComputedStyle(input(el)).outlineWidth).to.equal('3px');
      await expectNoAxeViolations(el);
    });

    it('passes axe in dark mode, open and closed', async () => {
      await inDarkMode(async () => {
        const el = await make('label="Person" description="Type a name."');
        await expectNoAxeViolations(el);
        await type(el, 'el');
        await press(el, 'ArrowDown');
        const on = getComputedStyle(options(el)[0]!);
        expect(on.backgroundColor).to.not.equal(getComputedStyle(popup(el)).backgroundColor);
        await expectNoAxeViolations(el);
      });
    });

    it('forced colors: the active option is Highlight', async () => {
      await emulateMedia({ forcedColors: 'active' });
      try {
        const el = await make();
        await type(el, 'el');
        await press(el, 'ArrowDown');
        const on = getComputedStyle(options(el)[0]!);
        const off = getComputedStyle(options(el)[1]!);
        expect(on.backgroundColor).to.not.equal(off.backgroundColor);
        expect(on.outlineStyle).to.equal('solid');
        expect(getComputedStyle(popup(el)).borderTopStyle).to.equal('solid');
      } finally {
        await emulateMedia({ forcedColors: 'none' });
      }
    });

    it('reflows at 320px: the popup stays inside the viewport, no page scroll', async () => {
      await setViewport({ width: 320, height: 640 });
      try {
        const el = await make('label="Person"', '', [
          ...PEOPLE,
          {
            value: 'long',
            label: 'Maximiliana Wolfeschlegelsteinhausenbergerdorff the Third',
            description: 'A very long description that has to wrap inside the popup',
          },
        ]);
        await type(el, 'a');
        expect(popup(el).hidden).to.equal(false);
        const box = popup(el).getBoundingClientRect();
        expect(box.left).to.be.at.least(0);
        expect(box.right).to.be.at.most(320);
        expect(document.documentElement.scrollWidth).to.be.at.most(320);
      } finally {
        await setViewport({ width: 800, height: 600 });
      }
    });

    it('works inside a scrolling container: the popup sits under the field', async () => {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'height: 200px; overflow: auto;';
      wrap.innerHTML = `<div style="height: 300px"></div><uvalib-combobox ${attr} label="Person"></uvalib-combobox><div style="height: 300px"></div>`;
      document.body.append(wrap);
      try {
        const el = wrap.querySelector<UvalibCombobox>('uvalib-combobox')!;
        el.items = PEOPLE;
        await el.updateComplete;
        wrap.scrollTop = 250;
        await type(el, 'el');
        const field = input(el).getBoundingClientRect();
        const box = popup(el).getBoundingClientRect();
        expect(Math.round(box.top - field.bottom)).to.be.within(0, 4);
        expect(Math.round(box.left)).to.equal(Math.round(field.left));
      } finally {
        wrap.remove();
      }
    });

    it('the app may set value and selected without events', async () => {
      const el = await make();
      const seen: unknown[] = [];
      el.addEventListener('change', (e) => seen.push(e));
      el.addEventListener('select', (e) => seen.push(e));
      el.selected = PEOPLE[3]!;
      await el.updateComplete;
      expect(input(el).value).to.equal('Émile Durand');
      el.value = 'Other';
      await el.updateComplete;
      expect(el.selected).to.equal(null);
      expect(input(el).value).to.equal('Other');
      // Not committed: leaving the field fires nothing.
      input(el).focus();
      input(el).blur();
      await el.updateComplete;
      expect(seen).to.have.length(0);
    });
  });
}
