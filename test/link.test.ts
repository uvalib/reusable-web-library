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
  it('leaves other schemes and protocol-relative urls unchanged', () => {
    const root = 'https://a.edu';
    expect(siteLink(root, 'mailto:library@virginia.edu')).to.equal('mailto:library@virginia.edu');
    expect(siteLink(root, 'tel:+14349243021')).to.equal('tel:+14349243021');
    expect(siteLink(root, '//cdn.example/x')).to.equal('//cdn.example/x');
  });
  it('still joins relative paths that merely look like a scheme prefix', () => {
    expect(siteLink('https://a.edu', 'https-faq')).to.equal('https://a.edu/https-faq');
  });
});
