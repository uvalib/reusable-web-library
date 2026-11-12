// Share-link payloads built independently of site/src/share.ts, so tests can make
// hashes that encode() never would.

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function deflateToBase64Url(blob: Blob): Promise<string> {
  const out = blob.stream().pipeThrough(new CompressionStream('deflate-raw'));
  return toBase64Url(new Uint8Array(await new Response(out).arrayBuffer()));
}

/** About 50 MB of "a" inside otherwise valid project JSON: tiny once compressed. */
export function bombHash(): Promise<string> {
  const mb = new TextEncoder().encode('a'.repeat(1024 * 1024));
  const parts: BlobPart[] = ['{"index.html":{"content":"'];
  for (let i = 0; i < 50; i++) parts.push(mb);
  parts.push('"}}');
  return deflateToBase64Url(new Blob(parts));
}
