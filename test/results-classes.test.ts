// base.css's badges, results toolbar, empty state and loading placeholders for host content,
// checked in an iframe that links only the built stylesheets (dist-cdn), as a host page would.
import { expect } from '@open-wc/testing';
import { emulateMedia } from '@web/test-runner-commands';
import { expectNoAxeViolations } from './helpers/axe.js';

const SAMPLE = `
  <main>
    <h1>Shoots</h1>
    <div class="uvalib-toolbar" id="toolbar">
      <div class="uvalib-toolbar__field uvalib-toolbar__field--grow">
        <label for="q">Filter shoots</label>
        <input class="uvalib-input" id="q" type="search" />
      </div>
      <div class="uvalib-toolbar__field">
        <label for="cat">Category</label>
        <select class="uvalib-input" id="cat">
          <option>All categories</option>
          <option>Faculty &amp; Staff Portraits</option>
        </select>
      </div>
      <div class="uvalib-toolbar__group" role="group" aria-label="Decade">
        <button class="uvalib-button uvalib-button--small" type="button" aria-pressed="false">2000s</button>
        <button class="uvalib-button uvalib-button--small" type="button" aria-pressed="true">2010s</button>
      </div>
      <p class="uvalib-toolbar__summary" id="summary">Showing 48 of 3,694 shoots</p>
    </div>
    <p>
      <span class="uvalib-badge" id="plain">Plain</span>
      <span class="uvalib-badge uvalib-badge--category" id="category">Faculty &amp; Staff Portraits</span>
      <span class="uvalib-badge uvalib-badge--status uvalib-badge--success" id="success"><svg aria-hidden="true" viewBox="0 0 16 16"><path d="M2 8l4 4 8-8" fill="none" stroke="currentColor" stroke-width="2"/></svg>Done</span>
      <span class="uvalib-badge uvalib-badge--status uvalib-badge--warning" id="warning">Processing</span>
      <span class="uvalib-badge uvalib-badge--status uvalib-badge--danger" id="danger">Failed</span>
      <span class="uvalib-badge uvalib-badge--status uvalib-badge--info" id="info">Largest</span>
      <span class="uvalib-badge uvalib-badge--new" id="new">New</span>
      <span class="uvalib-badge uvalib-badge--body" id="body">Body size</span>
    </p>
    <div class="uvalib-media" id="media" style="width: 300px">
      <img alt="The Rotunda" width="300" height="200" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect width='300' height='200' fill='%23fff'/%3E%3C/svg%3E" />
      <span class="uvalib-badge uvalib-badge--count" id="count">13 photos</span>
    </div>
    <div class="uvalib-empty-state" id="empty">
      <svg class="uvalib-empty-state__icon" aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/></svg>
      <h2>No photos match</h2>
      <p>Try another word, or clear the filters.</p>
      <button class="uvalib-button uvalib-button--secondary" type="button">Clear filters</button>
    </div>
    <div aria-hidden="true" id="loading">
      <div class="uvalib-skeleton uvalib-skeleton--media" id="sk-media" style="width: 300px"></div>
      <p><span class="uvalib-skeleton-text" id="sk-1"></span><span class="uvalib-skeleton-text" id="sk-2"></span></p>
    </div>
    <p id="line">One line of text</p>
  </main>`;

async function frame(
  { dark = false, width = 800 }: { dark?: boolean; width?: number } = {},
  body = SAMPLE,
): Promise<HTMLIFrameElement> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `width: ${width}px; height: 900px; border: 0`;
  const cdn = `${location.origin}/dist-cdn/`;
  iframe.srcdoc = `<!doctype html><html lang="en" ${dark ? 'data-uva-color-scheme="dark"' : ''}>
    <head><title>Results</title>
    <link rel="stylesheet" href="${cdn}tokens.css" />
    <link rel="stylesheet" href="${cdn}base.css" /></head>
    <body>${body}</body></html>`;
  document.body.append(iframe);
  await new Promise((r) => iframe.addEventListener('load', r, { once: true }));
  for (const type of ['click', 'submit'])
    iframe.contentDocument!.addEventListener(type, (e) => e.preventDefault(), true);
  return iframe;
}

const channels = (c: string) => c.match(/[\d.]+/g)!.map(Number);
const lum = (c: string) => {
  const [r, g, b] = channels(c)
    .slice(0, 3)
    .map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};
/** A translucent `rgba()` over an opaque backdrop. */
const over = (c: string, backdrop: string) => {
  const [r, g, b, a = 1] = channels(c);
  const [R, G, B] = channels(backdrop);
  const mix = (f: number, k: number) => Math.round(f * a + k * (1 - a));
  return `rgb(${mix(r!, R!)}, ${mix(g!, G!)}, ${mix(b!, B!)})`;
};

const BADGES = ['plain', 'category', 'success', 'warning', 'danger', 'info', 'new'];

describe('base.css badges, toolbar, empty state and skeletons', function () {
  this.timeout(8000);
  let iframe: HTMLIFrameElement;
  let doc: Document;
  let win: Window;
  const $ = (id: string) => doc.getElementById(id)!;
  const cs = (id: string) => win.getComputedStyle($(id));
  const open = async (opts?: { dark?: boolean; width?: number }) => {
    iframe = await frame(opts);
    doc = iframe.contentDocument!;
    win = iframe.contentWindow!;
  };

  afterEach(async () => {
    iframe?.remove();
    await emulateMedia({
      forcedColors: 'none',
      colorScheme: 'light',
      reducedMotion: 'no-preference',
    });
  });

  for (const dark of [false, true]) {
    describe(dark ? 'dark' : 'light', () => {
      beforeEach(() => open({ dark }));

      it('every badge has a text label at AA or better; status badges reach AAA', () => {
        for (const id of BADGES) {
          const s = cs(id);
          const ratio = contrast(s.color, s.backgroundColor);
          expect($(id).textContent!.trim(), id).to.not.equal('');
          expect(ratio, id).to.be.at.least(id === 'category' ? 4.5 : 7);
        }
      });

      it('a count badge on media is AAA over a white or a black image', () => {
        const s = cs('count');
        expect(s.position).to.equal('absolute');
        for (const backdrop of ['rgb(255, 255, 255)', 'rgb(0, 0, 0)'])
          expect(contrast(s.color, over(s.backgroundColor, backdrop))).to.be.at.least(7);
        const media = $('media').getBoundingClientRect();
        const badge = $('count').getBoundingClientRect();
        expect(badge.top - media.top).to.be.closeTo(8.5, 1.5);
        expect(badge.left - media.left).to.be.closeTo(8.5, 1.5);
      });

      it('has no axe violations', async () => {
        await expectNoAxeViolations(doc.documentElement);
      });
    });
  }

  it('the category badge is the uvalib-card chip: same colours, shape and size', async () => {
    await open();
    const s = cs('category');
    expect([s.backgroundColor, s.color, s.fontSize]).to.deep.equal([
      'rgb(191, 231, 247)',
      'rgb(0, 86, 121)',
      '14.875px',
    ]);
    expect(parseFloat(s.lineHeight)).to.be.closeTo(14.875 * 1.4, 0.01);
    expect([s.paddingTop, s.paddingLeft]).to.deep.equal(['1.7px', '10.2px']);
    expect(s.borderTopLeftRadius).to.equal('999px');
    expect(parseFloat(cs('body').fontSize)).to.equal(17);
  });

  it('status badges differ by more than colour: each has its own word, and a decorative icon', async () => {
    await open();
    const words = ['success', 'warning', 'danger', 'info'].map((id) => $(id).textContent!.trim());
    expect(new Set(words).size).to.equal(4);
    const icon = $('success').querySelector('svg')!;
    expect(icon.getAttribute('aria-hidden')).to.equal('true');
    expect(icon.getBoundingClientRect().width).to.be.closeTo(14.875, 0.5);
  });

  it('the toolbar puts the controls in one row and the summary at the end', async () => {
    await open();
    const q = $('q').getBoundingClientRect();
    const cat = $('cat').getBoundingClientRect();
    const summary = $('summary').getBoundingClientRect();
    const bar = $('toolbar').getBoundingClientRect();
    expect(Math.abs(q.bottom - cat.bottom)).to.be.below(2);
    expect(cat.left).to.be.greaterThan(q.right);
    expect(summary.right).to.be.closeTo(bar.right, 1);
    expect(q.height).to.be.at.least(44);
  });

  it('the toolbar stacks at 320px with no horizontal scroll', async () => {
    await open({ width: 320 });
    const bar = $('toolbar');
    let previous = -1;
    for (const el of bar.children) {
      const r = el.getBoundingClientRect();
      expect(r.right, el.className).to.be.at.most(320);
      expect(r.top, el.className).to.be.greaterThan(previous);
      previous = r.top;
    }
    expect($('category').getBoundingClientRect().right).to.be.at.most(320);
    expect(doc.documentElement.scrollWidth).to.be.at.most(320);
  });

  it('the empty state centres a heading, a sentence and an action', async () => {
    await open();
    const s = cs('empty');
    expect([s.display, s.flexDirection, s.textAlign]).to.deep.equal(['flex', 'column', 'center']);
    expect(s.borderTopStyle).to.equal('dashed');
    const p = win.getComputedStyle(doc.querySelector('#empty p')!);
    expect(contrast(p.color, 'rgb(255, 255, 255)')).to.be.at.least(7);
  });

  it('skeletons reserve their height: a 3:2 box, and a text line as tall as a line of text', async () => {
    await open();
    const media = $('sk-media').getBoundingClientRect();
    expect(media.height).to.be.closeTo(200, 1);
    const one = $('sk-1');
    const style = cs('sk-1');
    const margins = parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    const line = $('line').getBoundingClientRect().height;
    expect(one.getBoundingClientRect().height + margins).to.be.closeTo(line, 1);
    expect($('sk-2').getBoundingClientRect().width).to.be.below(one.getBoundingClientRect().width);
    expect(style.animationName).to.equal('uvalib-skeleton-shimmer');
    expect($('loading').getAttribute('aria-hidden')).to.equal('true');
  });

  it('reduced motion: no shimmer', async () => {
    await emulateMedia({ reducedMotion: 'reduce' });
    await open();
    for (const id of ['sk-media', 'sk-1']) {
      expect(cs(id).animationName, id).to.equal('none');
      expect(cs(id).backgroundImage, id).to.equal('none');
    }
  });

  it('forced colors: badges and skeletons keep a visible border', async () => {
    await emulateMedia({ forcedColors: 'active' });
    await open();
    for (const id of [...BADGES, 'count', 'sk-media', 'sk-1']) {
      const s = cs(id);
      expect(s.borderTopStyle, id).to.equal('solid');
      expect(s.borderTopColor, id).to.not.equal('rgba(0, 0, 0, 0)');
      expect(s.borderTopColor, id).to.not.equal(s.backgroundColor);
    }
    await expectNoAxeViolations(doc.documentElement);
  });
});
