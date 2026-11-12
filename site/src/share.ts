// Share links: project files -> JSON -> deflate-raw -> base64url, for the `#files=` hash.
// No dependencies: CompressionStream and DecompressionStream are built into browsers.
// A link is untrusted input, so decoding is bounded: a long hash or a high-ratio
// payload (a "decompression bomb") is rejected before it can exhaust the tab's memory.

export type Files = Record<string, { content: string }>;

/** Longest `#files=` value accepted, checked before any decoding. */
export const MAX_HASH_LENGTH = 256 * 1024;
/** Largest decompressed project accepted, in bytes. */
export const MAX_PROJECT_BYTES = 2 * 1024 * 1024;

const notALink = () => new Error('Not a playground link');

async function compress(bytes: Uint8Array): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** Inflate, stopping as soon as the output passes MAX_PROJECT_BYTES. */
async function decompress(bytes: Uint8Array): Promise<Uint8Array> {
  const reader = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
    .getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    let result: ReadableStreamReadResult<Uint8Array>;
    try {
      result = await reader.read();
    } catch {
      throw notALink(); // not deflate data
    }
    if (result.done) break;
    total += result.value.byteLength;
    if (total > MAX_PROJECT_BYTES) {
      await reader.cancel();
      throw new Error(`Playground link is too large (over ${MAX_PROJECT_BYTES} bytes)`);
    }
    chunks.push(result.value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw notALink();
  let binary: string;
  try {
    binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  } catch {
    throw notALink();
  }
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function isFiles(value: unknown): value is Files {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  const entries = Object.entries(value);
  return (
    entries.length > 0 &&
    Object.hasOwn(value, 'index.html') &&
    entries.every(
      ([, f]) =>
        typeof f === 'object' &&
        f !== null &&
        typeof (f as { content?: unknown }).content === 'string',
    )
  );
}

/** Encode project files (content only) as a URL-safe string. */
export async function encode(files: Files): Promise<string> {
  const plain = Object.fromEntries(
    Object.entries(files).map(([name, f]) => [name, { content: f.content }]),
  );
  return toBase64Url(await compress(new TextEncoder().encode(JSON.stringify(plain))));
}

/** Decode a string from `encode`. Throws if it is not a playground project or is too big. */
export async function decode(hash: string): Promise<Files> {
  if (hash.length > MAX_HASH_LENGTH) {
    throw new Error(`Playground link is too long (over ${MAX_HASH_LENGTH} characters)`);
  }
  const json = await decompress(fromBase64Url(hash));
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(json));
  } catch {
    throw new Error('Not a playground project');
  }
  if (!isFiles(parsed)) throw new Error('Not a playground project');
  return Object.fromEntries(
    Object.entries(parsed).map(([name, f]) => [name, { content: f.content }]),
  );
}
