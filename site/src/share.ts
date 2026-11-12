// Share links: project files -> JSON -> deflate-raw -> base64url, for the `#files=` hash.
// No dependencies: CompressionStream and DecompressionStream are built into browsers.

export type Files = Record<string, { content: string }>;

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** Encode project files (content only) as a URL-safe string. */
export async function encode(files: Files): Promise<string> {
  const plain = Object.fromEntries(
    Object.entries(files).map(([name, f]) => [name, { content: f.content }]),
  );
  const json = new TextEncoder().encode(JSON.stringify(plain));
  return toBase64Url(await pipe(json, new CompressionStream('deflate-raw')));
}

/** Decode a string from `encode`. Throws if it is not an encoded project. */
export async function decode(hash: string): Promise<Files> {
  const json = await pipe(fromBase64Url(hash), new DecompressionStream('deflate-raw'));
  const parsed: unknown = JSON.parse(new TextDecoder().decode(json));
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Object.values(parsed).every((f) => typeof f?.content === 'string')
  ) {
    throw new Error('Not a playground project');
  }
  return parsed as Files;
}
