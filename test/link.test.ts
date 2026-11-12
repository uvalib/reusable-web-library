import { expect } from '@open-wc/testing';
import { siteLink } from '../src/components/link.js';

describe('siteLink', () => {
  it('joins with exactly one slash', () => {
    expect(siteLink('https://www.library.virginia.edu/', '/hours')).to.equal(
      'https://www.library.virginia.edu/hours',
    );
    expect(siteLink('https://www.library.virginia.edu', 'hours')).to.equal(
      'https://www.library.virginia.edu/hours',
    );
  });
  it('returns absolute paths unchanged', () => {
    expect(siteLink('x', 'https://search.lib.virginia.edu/account')).to.equal(
      'https://search.lib.virginia.edu/account',
    );
  });
});
