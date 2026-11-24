import { expect, fixture, nextFrame, waitUntil } from '@open-wc/testing';
import { emulateMedia, sendKeys, sendMouse, setViewport } from '@web/test-runner-commands';
import '../src/components/uvalib-dialog/uvalib-dialog.js';
import '../src/components/site-page/site-page.js';
import type {
  DialogCloseDetail,
  DialogOpenDetail,
  UvalibDialog,
} from '../src/components/uvalib-dialog/UvalibDialog.js';
import { expectNoAxeViolations } from './helpers/axe.js';
import { recordAnalytics } from './helpers/analytics.js';
import { inDarkMode } from './helpers/dark.js';

const root = (el: Element): ParentNode => el.shadowRoot ?? el;
const dialog = (el: Element) => root(el).querySelector<HTMLDialogElement>('dialog.dlg')!;
const closeBtn = (el: Element) => root(el).querySelector<HTMLButtonElement>('button.dlg-close')!;
const heading = (el: Element) => root(el).querySelector<HTMLElement>('.dlg-heading')!;
const body = (el: Element) => root(el).querySelector<HTMLElement>('.dlg-body')!;
const desc = (el: Element) => root(el).querySelector<HTMLElement>('.dlg-desc')!;
/** The focused element, through shadow roots. */
const active = () => {
  let a = document.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a;
};
const isFocused = (node: Element) => active() === node;
/** Inside the dialog: its shadow parts, or its (slotted or moved) content. */
const inDialog = (el: UvalibDialog, node: Element | null) =>
  !!node && (dialog(el).contains(node) || el.contains(node));
const settle = async (el: UvalibDialog) => {
  await el.updateComplete;
  for (const a of dialog(el).getAnimations()) a.finish();
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const LONG = Array.from(
  { length: 30 },
  (_, i) => `<p>Tip ${i + 1}: put a phrase in quotes to find those words together.</p>`,
).join('');

for (const mode of ['shadow', 'no-shadow-dom'] as const) {
  describe(`uvalib-dialog (${mode})`, () => {
    const attr = mode === 'no-shadow-dom' ? 'no-shadow-dom' : '';
    afterEach(async () => {
      await setViewport({ width: 800, height: 600 });
    });

    async function make(attrs = '', content = '') {
      const wrap = await fixture<HTMLDivElement>(`<div>
        <style>#tip-1 { text-indent: 3px; }</style>
        <button id="opener" type="button" data-uvalib-dialog="tips">Search tips</button>
        <button id="other" type="button">Other</button>
        <uvalib-dialog ${attr} id="tips" label="Search tips" ${attrs}>
          <p id="tip-1">Put a phrase in quotes.</p>
          <a href="#more" id="more">More search help</a>
          ${content}
        </uvalib-dialog>
      </div>`);
      const el = wrap.querySelector<UvalibDialog>('uvalib-dialog')!;
      await el.updateComplete;
      const opener = wrap.querySelector<HTMLButtonElement>('#opener')!;
      return { wrap, el, opener };
    }

    async function openWith(el: UvalibDialog, opener: HTMLButtonElement) {
      opener.focus();
      opener.click();
      await settle(el);
      expect(dialog(el).open, 'opened').to.equal(true);
    }

    function closes(el: UvalibDialog) {
      const seen: DialogCloseDetail[] = [];
      el.addEventListener('uvalib-dialog-close', (e) =>
        seen.push((e as CustomEvent<DialogCloseDetail>).detail),
      );
      return seen;
    }

    it('closed and before opening: renders nothing, no dialog role in the page', async () => {
      const { el } = await make();
      expect(el.open).to.equal(false);
      expect(el.hasAttribute('open')).to.equal(false);
      expect(getComputedStyle(dialog(el)).display).to.equal('none');
      expect(document.getElementById('tip-1')!.getClientRects().length).to.equal(0);
      await expectNoAxeViolations(el.parentElement!);
    });

    it('a data-uvalib-dialog button opens it as a modal named by its visible heading, focused', async () => {
      const { el, opener } = await make();
      const opens: DialogOpenDetail[] = [];
      el.addEventListener('uvalib-dialog-open', (e) =>
        opens.push((e as CustomEvent<DialogOpenDetail>).detail),
      );
      await openWith(el, opener);
      const d = dialog(el);
      expect(d.matches(':modal')).to.equal(true);
      expect(el.open).to.equal(true);
      expect(el.hasAttribute('open')).to.equal(true);
      expect(opens).to.deep.equal([{ reason: 'button' }]);
      const h = heading(el);
      expect(h.localName).to.equal('h2');
      expect(h.textContent!.trim()).to.equal('Search tips');
      expect(d.getAttribute('aria-labelledby')).to.equal(h.id);
      expect(d.hasAttribute('aria-describedby')).to.equal(false);
      // A content dialog: the heading takes focus, so it is read from the top.
      expect(isFocused(h)).to.equal(true);
      expect(h.getAttribute('tabindex')).to.equal('-1');
      const close = closeBtn(el).getBoundingClientRect();
      expect(close.height).to.be.at.least(44);
      expect(close.width).to.be.at.least(44);
      expect(closeBtn(el).textContent!.trim()).to.equal('Close');
      expect(document.getElementById('tip-1')!.getClientRects().length).to.be.greaterThan(0);
    });

    it('opens from buttons rendered later, also inside another shadow root', async () => {
      const { el, wrap } = await make();
      const late = document.createElement('button');
      late.type = 'button';
      late.textContent = 'Help me search';
      late.setAttribute('data-uvalib-dialog', 'tips');
      wrap.append(late);
      late.focus();
      late.click();
      await settle(el);
      expect(el.open).to.equal(true);
      closeBtn(el).click();
      expect(isFocused(late)).to.equal(true);
      // A button in a component's shadow root that names a dialog in the page.
      const host = document.createElement('div');
      wrap.append(host);
      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<button type="button" data-uvalib-dialog="tips">Tips</button>';
      const inner = shadow.querySelector('button')!;
      inner.focus();
      inner.click();
      await settle(el);
      expect(el.open).to.equal(true);
      closeBtn(el).click();
      expect(isFocused(inner)).to.equal(true);
    });

    it('heading-level sets the heading; label is trimmed; description is wired to aria-describedby', async () => {
      const { el, opener } = await make('heading-level="3" description="Ways to narrow a search."');
      await openWith(el, opener);
      expect(heading(el).localName).to.equal('h3');
      const d = dialog(el);
      expect(d.getAttribute('aria-describedby')).to.equal(desc(el).id);
      expect(desc(el).textContent!.trim()).to.equal('Ways to narrow a search.');
      expect(desc(el).hidden).to.equal(false);
    });

    it('a slot="description" child is the description', async () => {
      const { el, opener } = await make(
        '',
        '<span slot="description" id="d1">Tips for the catalog.</span>',
      );
      await openWith(el, opener);
      const d = dialog(el);
      expect(d.getAttribute('aria-describedby')).to.equal(desc(el).id);
      const span = document.getElementById('d1')!;
      if (mode === 'shadow') expect(span.assignedSlot?.name).to.equal('description');
      else expect(desc(el).contains(span)).to.equal(true);
      expect(span.getClientRects().length).to.be.greaterThan(0);
    });

    it('a form dialog: the [autofocus] field takes focus', async () => {
      const { el, opener } = await make(
        '',
        '<form method="dialog"><label for="email">Email</label><input id="email" autofocus /></form>',
      );
      await openWith(el, opener);
      expect(isFocused(document.getElementById('email')!)).to.equal(true);
    });

    it('focus returns to the opener on every close: Close, Escape, backdrop, Cancel, form, close()', async () => {
      const { el, opener } = await make(
        '',
        `<form method="dialog" id="f">
          <label for="name">Name</label><input id="name" required />
          <button value="cancel" formnovalidate id="cancel">Cancel</button>
          <button value="send" id="send">Send</button>
        </form>
        <button type="button" data-uvalib-dialog-close id="done">Done</button>`,
      );
      const seen = closes(el);
      // Close
      await openWith(el, opener);
      closeBtn(el).click();
      expect(isFocused(opener)).to.equal(true);
      // Escape
      await openWith(el, opener);
      await sendKeys({ press: 'Escape' });
      await waitUntil(() => !el.open, 'Escape did not close');
      expect(isFocused(opener)).to.equal(true);
      // The backdrop: a real click at the corner of the viewport.
      await openWith(el, opener);
      await sendMouse({ type: 'click', position: [5, 5] });
      await waitUntil(() => !el.open, 'backdrop click did not close');
      expect(isFocused(opener)).to.equal(true);
      // Cancel in a dialog form
      await openWith(el, opener);
      document.getElementById('cancel')!.click();
      await waitUntil(() => !el.open, 'Cancel did not close');
      expect(isFocused(opener)).to.equal(true);
      // Send: the form validates first, then closes with the submitter's value.
      await openWith(el, opener);
      document.getElementById('send')!.click();
      await nextFrame();
      expect(el.open, 'an invalid form stays open').to.equal(true);
      (document.getElementById('name') as HTMLInputElement).value = 'Ada';
      document.getElementById('send')!.click();
      await waitUntil(() => !el.open, 'Send did not close');
      expect(el.returnValue).to.equal('send');
      expect(isFocused(opener)).to.equal(true);
      // A data-uvalib-dialog-close button
      await openWith(el, opener);
      document.getElementById('done')!.click();
      expect(isFocused(opener)).to.equal(true);
      // close() from script
      await openWith(el, opener);
      el.close('later');
      expect(isFocused(opener)).to.equal(true);
      await wait(20);
      expect(seen.map((s) => s.reason)).to.deep.equal([
        'close-button',
        'escape',
        'backdrop',
        'form',
        'form',
        'button',
        'api',
      ]);
      expect(seen.map((s) => s.returnValue)).to.deep.equal([
        '',
        '',
        '',
        'cancel',
        'send',
        '',
        'later',
      ]);
    });

    it('when the opener is gone, focus goes to return-focus (a selector or an element)', async () => {
      const { el, opener, wrap } = await make('return-focus="#other"');
      await openWith(el, opener);
      opener.remove();
      await sendKeys({ press: 'Escape' });
      await waitUntil(() => !el.open);
      expect(isFocused(wrap.querySelector('#other')!)).to.equal(true);
      const target = document.createElement('button');
      target.textContent = 'Target';
      wrap.append(target);
      el.returnFocus = target;
      const temp = document.createElement('button');
      temp.textContent = 'Temp';
      wrap.append(temp);
      temp.focus();
      el.show();
      await settle(el);
      temp.remove();
      closeBtn(el).click();
      expect(isFocused(target)).to.equal(true);
    });

    it('the rest of the page is inert while it is open, and Tab stays inside', async () => {
      const { el, opener, wrap } = await make();
      await openWith(el, opener);
      const other = wrap.querySelector<HTMLButtonElement>('#other')!;
      other.focus();
      expect(isFocused(other)).to.equal(false);
      const visited = new Set<Element>();
      for (let i = 0; i < 8; i++) {
        await sendKeys({ press: 'Tab' });
        const a = active();
        if (a && a !== document.body) {
          expect(inDialog(el, a), `Tab left the dialog for ${a.localName}#${a.id}`).to.equal(true);
          visited.add(a);
        }
      }
      expect(visited.has(closeBtn(el))).to.equal(true);
      expect(visited.has(document.getElementById('more')!)).to.equal(true);
      for (let i = 0; i < 4; i++) {
        await sendKeys({ press: 'Shift+Tab' });
        const a = active();
        if (a && a !== document.body) expect(inDialog(el, a)).to.equal(true);
      }
      closeBtn(el).click();
      other.focus();
      expect(isFocused(other)).to.equal(true);
    });

    it("inside <site-page>, its shadow chrome (the main landmark, the header's links) is inert", async () => {
      const page = await fixture<HTMLElement & { updateComplete: Promise<unknown> }>(
        `<site-page no-alerts no-main-nav><h1>Search</h1>
          <button id="p-open" type="button" data-uvalib-dialog="p-tips">Search tips</button>
          <uvalib-dialog ${attr} id="p-tips" label="Search tips"><a href="#x" id="p-link">Help</a></uvalib-dialog>
        </site-page>`,
      );
      await page.updateComplete;
      const el = page.querySelector<UvalibDialog>('uvalib-dialog')!;
      await el.updateComplete;
      const main = (page.shadowRoot ?? page).querySelector<HTMLElement>('main')!;
      const header = (page.shadowRoot ?? page).querySelector('site-header')!;
      const link = (header.shadowRoot ?? header).querySelector<HTMLAnchorElement>('a[href]')!;
      const opener = page.querySelector<HTMLButtonElement>('#p-open')!;
      await openWith(el, opener);
      main.focus();
      expect(isFocused(main)).to.equal(false);
      link.focus();
      expect(isFocused(link)).to.equal(false);
      const inside = page.querySelector<HTMLAnchorElement>('#p-link')!;
      inside.focus();
      expect(isFocused(inside)).to.equal(true);
      closeBtn(el).click();
      expect(isFocused(opener)).to.equal(true);
    });

    it('a press inside that ends on the backdrop (a drag or text selection) does not close it', async () => {
      const { el, opener } = await make();
      await openWith(el, opener);
      const r = document.getElementById('tip-1')!.getBoundingClientRect();
      await sendMouse({ type: 'move', position: [Math.round(r.left + 5), Math.round(r.top + 5)] });
      await sendMouse({ type: 'down' });
      await sendMouse({ type: 'move', position: [40, 10] });
      await sendMouse({ type: 'move', position: [5, 5] });
      await sendMouse({ type: 'up' });
      await wait(50);
      expect(el.open).to.equal(true);
      // A click inside does not close it either.
      await sendMouse({ type: 'click', position: [Math.round(r.left + 5), Math.round(r.top + 5)] });
      await wait(20);
      expect(el.open).to.equal(true);
      closeBtn(el).click();
    });

    it('without native closedby, the script fallback closes on a backdrop click, not a drag', async () => {
      const proto = HTMLDialogElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, 'closedBy');
      if (desc) delete (proto as unknown as Record<string, unknown>).closedBy;
      try {
        const { el, opener } = await make();
        await openWith(el, opener);
        const d = dialog(el);
        const out = { bubbles: true, composed: true, clientX: 3, clientY: 3 };
        const inner = document.getElementById('tip-1')!;
        // Pressed inside, released on the backdrop: the click lands on the dialog.
        inner.dispatchEvent(
          new PointerEvent('pointerdown', { ...out, clientX: 200, clientY: 200 }),
        );
        d.dispatchEvent(new MouseEvent('click', out));
        expect(el.open).to.equal(true);
        d.dispatchEvent(new PointerEvent('pointerdown', out));
        d.dispatchEvent(new MouseEvent('click', out));
        expect(el.open).to.equal(false);
        expect(isFocused(opener)).to.equal(true);
      } finally {
        if (desc) Object.defineProperty(proto, 'closedBy', desc);
      }
    });

    it('persistent: the backdrop does not close it; Escape and Close still do', async () => {
      const { el, opener } = await make('persistent');
      await openWith(el, opener);
      expect(dialog(el).getAttribute('closedby')).to.equal('closerequest');
      await sendMouse({ type: 'click', position: [5, 5] });
      await wait(50);
      expect(el.open).to.equal(true);
      await sendKeys({ press: 'Escape' });
      await waitUntil(() => !el.open, 'Escape did not close');
      expect(isFocused(opener)).to.equal(true);
    });

    it('slotted content keeps its ids, page CSS and listeners', async () => {
      let clicks = 0;
      const { el, opener } = await make('', '<button type="button" id="copy">Copy</button>');
      const tip = document.getElementById('tip-1')!;
      const copy = document.getElementById('copy')!;
      copy.addEventListener('click', () => clicks++);
      if (mode === 'shadow') expect(tip.parentElement === el).to.equal(true);
      else expect(el.contains(tip)).to.equal(true);
      await openWith(el, opener);
      expect(document.getElementById('tip-1') === tip).to.equal(true);
      expect(getComputedStyle(tip).textIndent).to.equal('3px');
      copy.click();
      expect(clicks).to.equal(1);
      expect(el.open, 'a plain button does not close it').to.equal(true);
      // Content added while open is shown inside.
      const late = document.createElement('p');
      late.id = 'late';
      late.textContent = 'Added later';
      el.append(late);
      await nextFrame();
      expect(late.getClientRects().length).to.be.greaterThan(0);
      expect(inDialog(el, late)).to.equal(true);
      closeBtn(el).click();
    });

    it('show(), close(returnValue), the open attribute and :state(open)', async () => {
      const { el, opener } = await make();
      const opens: DialogOpenDetail[] = [];
      el.addEventListener('uvalib-dialog-open', (e) =>
        opens.push((e as CustomEvent<DialogOpenDetail>).detail),
      );
      const seen = closes(el);
      opener.focus();
      el.show();
      await settle(el);
      expect(dialog(el).open).to.equal(true);
      expect(el.matches(':state(open)')).to.equal(true);
      el.close('done');
      expect(el.returnValue).to.equal('done');
      expect(el.matches(':state(open)')).to.equal(false);
      expect(isFocused(opener)).to.equal(true);
      el.setAttribute('open', '');
      await settle(el);
      expect(dialog(el).open).to.equal(true);
      expect(el.returnValue, 'cleared on open').to.equal('');
      el.removeAttribute('open');
      await el.updateComplete;
      expect(dialog(el).open).to.equal(false);
      expect(opens).to.deep.equal([{ reason: 'api' }, { reason: 'api' }]);
      expect(seen).to.deep.equal([
        { reason: 'api', returnValue: 'done' },
        { reason: 'api', returnValue: '' },
      ]);
    });

    it('open in the markup opens it on connect', async () => {
      const el = await fixture<UvalibDialog>(
        `<uvalib-dialog ${attr} open label="Sign in"><p>Sign in to request items.</p></uvalib-dialog>`,
      );
      await settle(el);
      expect(dialog(el).open).to.equal(true);
      expect(dialog(el).matches(':modal')).to.equal(true);
      closeBtn(el).click();
      await el.updateComplete;
      expect(el.hasAttribute('open')).to.equal(false);
    });

    it('removed while open: closes with reason removed and focus returns to the opener', async () => {
      const { el, opener } = await make();
      const seen = closes(el);
      await openWith(el, opener);
      el.remove();
      expect(seen.map((s) => s.reason)).to.deep.equal(['removed']);
      expect(isFocused(opener)).to.equal(true);
    });

    it('invoker buttons: command="--show-modal" opens it and "--close" closes it', async () => {
      const { el, wrap } = await make(
        '',
        '<button type="button" commandfor="tips" command="--close" id="inv-close">Done</button>',
      );
      const inv = document.createElement('button');
      inv.type = 'button';
      inv.textContent = 'Tips';
      inv.setAttribute('commandfor', 'tips');
      inv.setAttribute('command', '--show-modal');
      wrap.append(inv);
      if (!('commandForElement' in HTMLButtonElement.prototype)) return; // no invokers here
      const seen = closes(el);
      inv.focus();
      inv.click();
      await settle(el);
      expect(el.open).to.equal(true);
      document.getElementById('inv-close')!.click();
      expect(el.open).to.equal(false);
      expect(isFocused(inv)).to.equal(true);
      expect(seen.map((s) => s.reason)).to.deep.equal(['button']);
    });

    it('reports visitor opens and closes with the label only, not script ones; honours no-analytics', async () => {
      const rec = recordAnalytics();
      try {
        const { el, opener } = await make(
          '',
          '<form method="dialog"><input aria-label="Email" value="ada@example.com" /><button value="ok">OK</button></form>',
        );
        await nextFrame();
        expect(rec.events, 'reported on render').to.deep.equal([]);
        await openWith(el, opener);
        closeBtn(el).click();
        await openWith(el, opener);
        await sendKeys({ press: 'Escape' });
        await waitUntil(() => !el.open);
        await openWith(el, opener);
        document.querySelector<HTMLButtonElement>('uvalib-dialog form button')!.click();
        await waitUntil(() => !el.open);
        el.show();
        await settle(el);
        el.close();
        el.setAttribute('no-analytics', '');
        await openWith(el, opener);
        closeBtn(el).click();
        const events = rec.of('uvalib-analytics-event').map((d) => d.event);
        expect(events).to.deep.equal([
          ['uvalib-dialog', 'open', 'Search tips'],
          ['uvalib-dialog', 'close', 'Search tips'],
          ['uvalib-dialog', 'open', 'Search tips'],
          ['uvalib-dialog', 'close', 'Search tips'],
          ['uvalib-dialog', 'open', 'Search tips'],
          ['uvalib-dialog', 'close', 'Search tips'],
        ]);
        const sent = JSON.stringify(rec.events);
        for (const text of ['ada@', 'quotes', 'ok']) expect(sent).to.not.include(text);
      } finally {
        rec.restore();
      }
    });

    it('passes axe open, in light and dark mode', async () => {
      const { el, opener } = await make(
        'description="Ways to narrow a search."',
        `<form method="dialog">
          <label for="ax-email">Email <span class="uvalib-required">(required)</span></label>
          <input id="ax-email" required aria-describedby="ax-help" />
          <span class="uvalib-help" id="ax-help">We send the citation here.</span>
          <button value="send">Send</button>
        </form>`,
      );
      await openWith(el, opener);
      await expectNoAxeViolations(el.parentElement!);
      closeBtn(el).click();
      await inDarkMode(async () => {
        await openWith(el, opener);
        const bg = getComputedStyle(dialog(el)).backgroundColor;
        expect(bg).to.not.equal('rgb(255, 255, 255)');
        await expectNoAxeViolations(el.parentElement!);
        closeBtn(el).click();
      });
    });

    it('sizes: small, medium and large widths on a wide screen', async () => {
      await setViewport({ width: 1280, height: 800 });
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const { el, opener } = await make();
      for (const [size, width] of [
        ['small', 30],
        ['medium', 40],
        ['large', 60],
      ] as const) {
        el.size = size;
        await openWith(el, opener);
        expect(Math.round(dialog(el).getBoundingClientRect().width), size).to.equal(width * rem);
        closeBtn(el).click();
      }
    });

    it('reflows at 320px: 16px gutters, long content scrolls inside under a visible header', async () => {
      await setViewport({ width: 320, height: 640 });
      const { el, opener } = await make('size="large"', LONG);
      await openWith(el, opener);
      const r = dialog(el).getBoundingClientRect();
      expect(Math.round(r.left)).to.equal(16);
      expect(Math.round(r.right)).to.equal(320 - 16);
      expect(Math.round(r.top)).to.be.at.least(16);
      expect(Math.round(r.bottom)).to.be.at.most(640 - 16);
      expect(document.documentElement.scrollWidth).to.be.at.most(320);
      const b = body(el);
      expect(b.scrollHeight).to.be.greaterThan(b.clientHeight);
      expect(b.scrollWidth).to.be.at.most(b.clientWidth);
      b.scrollTop = b.scrollHeight;
      await nextFrame();
      expect(b.scrollTop).to.be.greaterThan(0);
      const h = heading(el).getBoundingClientRect();
      const close = closeBtn(el).getBoundingClientRect();
      expect(h.top).to.be.at.least(r.top);
      expect(close.top).to.be.at.least(r.top);
      expect(close.right).to.be.at.most(r.right);
      closeBtn(el).click();
    });

    it('fades in, unless the visitor prefers reduced motion', async () => {
      const { el, opener } = await make();
      await openWith(el, opener);
      expect(getComputedStyle(dialog(el)).animationName).to.equal('uvalib-dialog-in');
      closeBtn(el).click();
      await emulateMedia({ reducedMotion: 'reduce' });
      try {
        await openWith(el, opener);
        expect(getComputedStyle(dialog(el)).animationName).to.equal('none');
        closeBtn(el).click();
      } finally {
        await emulateMedia({ reducedMotion: 'no-preference' });
      }
    });

    it('forced colors: the dialog and Close keep visible edges', async () => {
      await emulateMedia({ forcedColors: 'active' });
      try {
        const { el, opener } = await make();
        await openWith(el, opener);
        expect(getComputedStyle(dialog(el)).borderTopStyle).to.equal('solid');
        expect(getComputedStyle(dialog(el)).borderTopWidth).to.equal('2px');
        expect(getComputedStyle(closeBtn(el)).borderTopStyle).to.equal('solid');
        closeBtn(el).click();
      } finally {
        await emulateMedia({ forcedColors: 'none' });
      }
    });
  });
}
