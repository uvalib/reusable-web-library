import { expect } from '@open-wc/testing';
import { decode, encode } from '../site/src/share.js';

describe('share link encoding', () => {
  const cases: Record<string, Record<string, { content: string }>> = {
    ascii: {
      'index.html': { content: '<!doctype html><site-page><h1>Hi</h1></site-page>' },
      'styles.css': { content: 'site-page::part(main) { padding: 1rem; }' },
    },
    'non-ASCII': { 'index.html': { content: 'Café — ü' } },
    '50 KB file': {
      'index.html': {
        content: Array.from({ length: 50 * 1024 }, (_, i) => 'ab<>&é\n'[i % 7]).join(''),
      },
    },
  };

  for (const [name, files] of Object.entries(cases)) {
    it(`round-trips ${name} content`, async () => {
      const hash = await encode(files);
      expect(hash).to.match(/^[A-Za-z0-9_-]+$/);
      expect(await decode(hash)).to.deep.equal(files);
    });
  }

  it('rejects a hash that is not an encoded project', async () => {
    let error: unknown;
    try {
      await decode('not-a-project');
    } catch (e) {
      error = e;
    }
    expect(error).to.be.instanceOf(Error);
  });
});
