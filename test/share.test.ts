import { expect } from '@open-wc/testing';
import { decode, encode } from '../site/src/share.js';
import { bombHash, deflateToBase64Url, toBase64Url } from './helpers/share-payloads.js';

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

  describe('rejects links that are not playground projects', () => {
    async function rejection(hash: string): Promise<Error> {
      try {
        await decode(hash);
      } catch (e) {
        expect(e).to.be.instanceOf(Error);
        return e as Error;
      }
      throw new Error('decode resolved');
    }

    it('a hash longer than 256 KB, before decoding it', async () => {
      const e = await rejection('a'.repeat(256 * 1024 + 1));
      expect(e.message).to.match(/too long/i);
    });

    it('a high-ratio payload that inflates past 2 MB', async () => {
      const hash = await bombHash();
      expect(hash.length).to.be.below(256 * 1024);
      const e = await rejection(hash);
      expect(e.message).to.match(/too large/i);
    });

    it('valid base64url that is not deflate data', async () => {
      const e = await rejection(toBase64Url(new TextEncoder().encode('just some plain bytes')));
      expect(e.message).to.match(/not a playground link/i);
    });

    it('text that is not base64url', async () => {
      const e = await rejection('not a hash!');
      expect(e.message).to.match(/not a playground link/i);
    });

    for (const [name, json] of Object.entries({
      'an array': '[{"content":"<p>hi</p>"}]',
      'an empty object': '{}',
      'no index.html': '{"styles.css":{"content":"p {}"}}',
      'a non-string content': '{"index.html":{"content":1}}',
      'a null file': '{"index.html":null}',
      'not JSON': '{"index.html":',
    })) {
      it(`well-formed deflate of ${name}`, async () => {
        const e = await rejection(await deflateToBase64Url(new Blob([json])));
        expect(e.message).to.match(/not a playground (link|project)/i);
      });
    }
  });
});
