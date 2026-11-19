import { expect, fixture, nextFrame } from '@open-wc/testing';
import { html, nothing } from 'lit';
import { UvalibElement } from '../src/base/UvalibElement.js';
import { SourceChildren } from '../src/base/source-children.js';

/** Renders nothing at first and a top-level element later, in light DOM. */
class LateRender extends UvalibElement {
  static override properties = { show: { type: Boolean } };
  show = false;
  reads: string[][] = [];
  constructor() {
    super();
    new SourceChildren(
      this,
      () => this.lightDom,
      (nodes) =>
        this.reads.push(
          nodes.filter((n): n is Element => n instanceof Element).map((n) => n.className),
        ),
    );
  }
  protected override render() {
    return this.show ? html`<p class="late">Rendered</p>` : nothing;
  }
}
customElements.define('test-late-render', LateRender);

describe('SourceChildren', () => {
  it('never adopts output rendered after the first update (light DOM)', async () => {
    const el = await fixture<LateRender>(
      '<test-late-render no-shadow-dom><span class="src">Source</span></test-late-render>',
    );
    el.show = true;
    await el.updateComplete;
    await nextFrame();
    await nextFrame();
    const late = el.querySelector('.late')!;
    expect(late.parentNode).to.equal(el);
    expect(late.closest('.test-late-render-source')).to.equal(null);
    // The source stays in the holder, and every read saw only it.
    expect(el.querySelector('.test-late-render-source > .src')).to.not.equal(null);
    for (const r of el.reads) expect(r).to.deep.equal(['src']);
    // Author children added later are still adopted.
    const extra = document.createElement('span');
    extra.className = 'later';
    el.append(extra);
    await nextFrame();
    await el.updateComplete;
    expect(extra.parentElement!.className).to.equal('test-late-render-source');
    expect(el.reads.at(-1)).to.deep.equal(['src', 'later']);
    expect(el.querySelector('.late')!.parentNode).to.equal(el);
  });
});
