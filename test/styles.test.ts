import { expect } from '@open-wc/testing';
import { tokens } from '../src/styles/tokens.js';
import { base } from '../src/styles/base.js';
import { accessible } from '../src/styles/accessible.js';

describe('shared styles', () => {
  it('tokens carry theme colors and font family', () => {
    expect(tokens.cssText).to.contain('--uva-brand-blue: #232D4B');
    expect(tokens.cssText).to.contain('--uva-font-family');
  });
  it('base has no !important or universal font-family rule', () => {
    expect(base.cssText).to.not.match(/!important/);
    expect(base.cssText).to.not.match(/^\s*\*\s*\{[^}]*font-family/m);
  });
  it('accessible defines the skip link', () => {
    expect(accessible.cssText).to.contain('.skip-link');
  });
});
