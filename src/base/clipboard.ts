/**
 * Copy `text` to the clipboard. With `html`, it is copied as both `text/html` and
 * `text/plain` (a `ClipboardItem`), so emphasis such as an italic title survives a paste into
 * a word processor, falling back to plain text where that is not supported or refused.
 * Rejects when nothing could be copied (no clipboard, or permission denied).
 */
export async function copyText(text: string, html?: string): Promise<void> {
  const clipboard = navigator.clipboard;
  if (html && typeof ClipboardItem === 'function' && typeof clipboard?.write === 'function') {
    try {
      await clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ]);
      return;
    } catch {
      // Some browsers refuse HTML: plain text below.
    }
  }
  await clipboard.writeText(text);
}

/** Select everything in `node`, so that the visitor can copy it with the keyboard. */
export function selectContents(node: Node | null | undefined): void {
  if (node) node.ownerDocument?.getSelection()?.selectAllChildren(node);
}
