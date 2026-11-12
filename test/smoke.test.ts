import { expect } from '@open-wc/testing';
import '../src/index.js';

describe('smoke', () => {
  it('runs in a browser', () => {
    expect(typeof customElements.define).to.equal('function');
  });
});
