import { expect, fixture } from '@open-wc/testing';
import { sendMouse } from '@web/test-runner-commands';
import '../src/components/uvalib-date-range/uvalib-date-range.js';
import type { UvalibDateRange } from '../src/components/uvalib-date-range/UvalibDateRange.js';
import { expectNoAxeViolations } from './helpers/axe.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const sliders = (el: Element) => [
  ...root(el).querySelectorAll<HTMLInputElement>('input[type=range]'),
];
const dates = (el: Element) => [...root(el).querySelectorAll<HTMLInputElement>('input[type=date]')];
const type = (input: HTMLInputElement, value: string, event: 'input' | 'change') => {
  input.value = value;
  input.dispatchEvent(new Event(event, { bubbles: true }));
};

/** Collect console.warn calls made while `fn` runs. */
async function warnings<T>(fn: () => Promise<T>): Promise<{ result: T; warns: string[] }> {
  const orig = console.warn;
  const warns: string[] = [];
  console.warn = (...a: unknown[]) => void warns.push(a.join(' '));
  try {
    return { result: await fn(), warns };
  } finally {
    console.warn = orig;
  }
}

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-date-range (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    const make = (attrs = 'min="1900-01-01" max="2000-12-31"') =>
      fixture<UvalibDateRange>(`<uvalib-date-range ${attr} ${attrs}></uvalib-date-range>`);

    it('renders two sliders and two date inputs spanning min..max by default', async () => {
      const el = await make();
      const [a, b] = sliders(el);
      expect([a!.min, a!.max, a!.value]).to.deep.equal(['1900', '2000', '1900']);
      expect([b!.min, b!.max, b!.value]).to.deep.equal(['1900', '2000', '2000']);
      const [from, to] = dates(el);
      expect([from!.value, to!.value]).to.deep.equal(['1900-01-01', '2000-12-31']);
      expect(root(el).querySelector('fieldset > legend')).to.not.equal(null);
    });

    it('shows the given value, clamped into min..max', async () => {
      const el = await make();
      el.value = ['1950-06-15', '2100-01-01'];
      await el.updateComplete;
      expect(dates(el).map((d) => d.value)).to.deep.equal(['1950-06-15', '2000-12-31']);
      expect(sliders(el).map((s) => s.value)).to.deep.equal(['1950', '2000']);
    });

    it('slider input fires date-range-change (bubbles, composed) keeping month/day', async () => {
      const el = await make();
      el.value = ['1950-06-15', '1990-03-02'];
      await el.updateComplete;
      let ev: CustomEvent | undefined;
      el.addEventListener('date-range-change', (e) => (ev = e as CustomEvent));
      type(sliders(el)[0]!, '1960', 'input');
      expect(ev!.detail).to.deep.equal({ value: ['1960-06-15', '1990-03-02'] });
      expect(ev!.bubbles).to.equal(true);
      expect(ev!.composed).to.equal(true);
      type(sliders(el)[1]!, '1995', 'input');
      expect(ev!.detail).to.deep.equal({ value: ['1960-06-15', '1995-03-02'] });
    });

    it('start cannot pass end (sliders)', async () => {
      const el = await make();
      el.value = ['1950-01-01', '1970-12-31'];
      await el.updateComplete;
      let detail: { value: string[] } | undefined;
      el.addEventListener('date-range-change', (e) => (detail = (e as CustomEvent).detail));
      const [s, e2] = sliders(el);
      type(s!, '1990', 'input');
      expect(s!.value).to.equal('1970');
      expect(detail!.value[0]!.slice(0, 4)).to.equal('1970');
      expect(detail!.value[0]! <= detail!.value[1]!).to.equal(true);
      el.value = ['1950-01-01', '1970-12-31'];
      await el.updateComplete;
      type(e2!, '1920', 'input');
      expect(e2!.value).to.equal('1950');
      expect(detail!.value[1]!.slice(0, 4)).to.equal('1950');
      expect(detail!.value[0]! <= detail!.value[1]!).to.equal(true);
    });

    it('slider values stay inside min..max dates', async () => {
      const el = await make('min="1900-03-05" max="2000-09-10"');
      let detail: { value: string[] } | undefined;
      el.addEventListener('date-range-change', (e) => (detail = (e as CustomEvent).detail));
      type(sliders(el)[0]!, '1900', 'input');
      expect(detail!.value[0]).to.equal('1900-03-05');
      type(sliders(el)[1]!, '2000', 'input');
      expect(detail!.value[1]).to.equal('2000-09-10');
    });

    it('date inputs fire date-range-change with values clamped to min/max and each other', async () => {
      const el = await make();
      el.value = ['1950-01-01', '1980-01-01'];
      await el.updateComplete;
      let detail: { value: string[] } | undefined;
      el.addEventListener('date-range-change', (e) => (detail = (e as CustomEvent).detail));
      const [from, to] = dates(el);
      type(from!, '1960-02-03', 'change');
      expect(detail!.value).to.deep.equal(['1960-02-03', '1980-01-01']);
      type(from!, '1800-01-01', 'change');
      expect(detail!.value[0]).to.equal('1900-01-01');
      type(from!, '1999-01-01', 'change');
      expect(detail!.value[0]).to.equal('1980-01-01');
      type(to!, '2500-01-01', 'change');
      expect(detail!.value[1]).to.equal('2000-12-31');
      type(to!, '1900-01-02', 'change');
      expect(detail!.value[1]).to.equal('1980-01-01');
    });

    it('ignores a cleared date input', async () => {
      const el = await make();
      let n = 0;
      el.addEventListener('date-range-change', () => n++);
      type(dates(el)[0]!, '', 'change');
      expect(n).to.equal(0);
    });

    for (const [name, attrs] of [
      ['both missing', ''],
      ['min missing', 'max="2000-01-01"'],
      ['max missing', 'min="1900-01-01"'],
      ['invalid', 'min="nope" max="2000-01-01"'],
      ['min after max', 'min="2001-01-01" max="2000-01-01"'],
    ] as const) {
      it(`renders nothing interactive and warns once when min/max are ${name}`, async () => {
        const { result: el, warns } = await warnings(async () => {
          const e = await make(attrs);
          e.value = ['1950-01-01', '1960-01-01']; // further updates must not warn again
          await e.updateComplete;
          return e;
        });
        expect(root(el).querySelectorAll('input').length).to.equal(0);
        expect(root(el).querySelectorAll('[role=alert],.error').length).to.equal(0);
        expect(warns.length).to.equal(1);
        expect(warns[0]).to.contain('uvalib-date-range');
        expect(warns[0]).to.match(/min.*max/);
      });
    }

    it('renders once min and max become valid, without a second warning', async () => {
      const { result: el, warns } = await warnings(async () => {
        const e = await make('');
        e.min = '1900-01-01';
        e.max = '2000-12-31';
        await e.updateComplete;
        return e;
      });
      expect(sliders(el).length).to.equal(2);
      expect(warns.length).to.equal(1);
    });

    describe('pointer dragging', () => {
      const WEBKIT_THUMB = 24; // matches ::-webkit-slider-thumb width in the component CSS
      const thumb = (input: HTMLInputElement) => {
        const r = input.getBoundingClientRect();
        const frac =
          (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min));
        return {
          x: Math.round(r.left + WEBKIT_THUMB / 2 + frac * (r.width - WEBKIT_THUMB)),
          y: Math.round(r.top + r.height / 2),
          width: r.width,
        };
      };
      const drag = async (from: { x: number; y: number }, dx: number) => {
        await sendMouse({ type: 'move', position: [from.x, from.y] });
        await sendMouse({ type: 'down' });
        for (let i = 1; i <= 8; i++)
          await sendMouse({ type: 'move', position: [Math.round(from.x + (dx * i) / 8), from.y] });
        await sendMouse({ type: 'up' });
      };

      it('dragging the start thumb right and the end thumb left changes the range', async () => {
        const el = await make('min="1900-01-01" max="2000-12-31"');
        el.style.width = '400px';
        await el.updateComplete;
        const events: string[][] = [];
        el.addEventListener('date-range-change', (e) =>
          events.push((e as CustomEvent).detail.value),
        );
        const [start, end] = sliders(el);
        const s0 = thumb(start!);
        await drag(s0, s0.width / 4);
        expect(events.length, 'start thumb drag fired').to.be.greaterThan(0);
        expect(Number(events.at(-1)![0]!.slice(0, 4))).to.be.greaterThan(1900 + 15);
        const e0 = thumb(end!);
        const before = events.length;
        await drag(e0, -e0.width / 4);
        expect(events.length, 'end thumb drag fired').to.be.greaterThan(before);
        expect(Number(events.at(-1)![1]!.slice(0, 4))).to.be.lessThan(2000 - 15);
      });

      it('thumbs stacked at the right edge can still be pulled apart by dragging left', async () => {
        const el = await make('min="1900-01-01" max="2000-12-31"');
        el.style.width = '400px';
        el.value = ['2000-12-31', '2000-12-31'];
        await el.updateComplete;
        const events: string[][] = [];
        el.addEventListener('date-range-change', (e) =>
          events.push((e as CustomEvent).detail.value),
        );
        const t = thumb(sliders(el)[0]!);
        await drag(t, -t.width / 4);
        expect(events.length).to.be.greaterThan(0);
        expect(Number(events.at(-1)![0]!.slice(0, 4))).to.be.lessThan(2000 - 15);
        expect(events.at(-1)![1]).to.equal('2000-12-31');
      });

      it('thumbs stacked at the left edge can still be pulled apart by dragging right', async () => {
        const el = await make('min="1900-01-01" max="2000-12-31"');
        el.style.width = '400px';
        el.value = ['1900-01-01', '1900-01-01'];
        await el.updateComplete;
        const events: string[][] = [];
        el.addEventListener('date-range-change', (e) =>
          events.push((e as CustomEvent).detail.value),
        );
        const t = thumb(sliders(el)[1]!);
        await drag(t, t.width / 4);
        expect(events.length).to.be.greaterThan(0);
        expect(events.at(-1)![0]).to.equal('1900-01-01');
        expect(Number(events.at(-1)![1]!.slice(0, 4))).to.be.greaterThan(1900);
      });
    });

    it('two instances have unique ids and every label points at an input', async () => {
      const wrap = await fixture<HTMLDivElement>(`<div>
        <uvalib-date-range ${attr} min="1900-01-01" max="2000-12-31"></uvalib-date-range>
        <uvalib-date-range ${attr} min="1900-01-01" max="2000-12-31"></uvalib-date-range></div>`);
      const els = [...wrap.querySelectorAll<UvalibDateRange>('uvalib-date-range')];
      await Promise.all(els.map((e) => e.updateComplete));
      const ids = els.flatMap((e) => [...root(e).querySelectorAll('[id]')].map((n) => n.id));
      expect(ids.length).to.equal(4);
      expect(new Set(ids).size).to.equal(ids.length);
      for (const e of els)
        for (const l of root(e).querySelectorAll('label'))
          expect(root(e).querySelector(`#${l.htmlFor}`)).to.not.equal(null);
    });

    it('names the sliders with the legend context', async () => {
      const el = await make('min="1900-01-01" max="2000-12-31" label="Meeting date"');
      expect(root(el).querySelector('legend')!.textContent).to.equal('Meeting date');
      expect(sliders(el).map((s) => s.getAttribute('aria-label'))).to.deep.equal([
        'Meeting date: start year',
        'Meeting date: end year',
      ]);
    });

    it('has no axe violations', async () => {
      const el = await make();
      await expectNoAxeViolations(el);
    });

    it('works as BOV search-main.js drives it', async () => {
      const host = await fixture<HTMLElement>('<div></div>');
      const dr = document.createElement('uvalib-date-range') as UvalibDateRange;
      if (mode === 'no-shadow-dom') dr.setAttribute('no-shadow-dom', '');
      let selectedDateRange: string[] | undefined;
      dr.addEventListener('date-range-change', (e) => {
        selectedDateRange = (e as CustomEvent).detail.value;
      });
      host.appendChild(dr);
      // attributes and value are set after connecting, as search-main.js does
      dr.setAttribute('min', '1819-01-01');
      dr.setAttribute('max', '2026-12-31');
      dr.value = selectedDateRange || ['1819-01-01', '2026-12-31'];
      await dr.updateComplete;
      expect(sliders(dr).map((s) => s.value)).to.deep.equal(['1819', '2026']);
      type(sliders(dr)[0]!, '1900', 'input');
      expect(selectedDateRange).to.deep.equal(['1900-01-01', '2026-12-31']);
    });
  });
}
