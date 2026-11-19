import type { ReactiveController, ReactiveElement } from 'lit';

/** What is watched in the author's children: elements, their attributes and text. */
const CONTENT: MutationObserverInit = {
  attributes: true,
  characterData: true,
  childList: true,
  subtree: true,
};

/**
 * The author's children of an element that draws its own copy of them (a list of links, a
 * description list), in shadow or light DOM, and their later changes.
 *
 * Shadow mode: the children stay where they are (with no slot they are not shown) and are
 * watched. Light mode has no slots: the children are moved into a hidden holder `<div>`
 * that this element owns, and nodes the element renders itself are never adopted.
 *
 * `read` gets the source nodes on connect, after the first render and on every change; the
 * element compares them with what it has and only asks for an update on a real change.
 */
export class SourceChildren implements ReactiveController {
  private observer?: MutationObserver;
  private holder?: HTMLDivElement;
  /** Light mode: nodes the element rendered itself (incl. Lit markers), never adopted. */
  private own = new WeakSet<Node>();
  private marked = false;

  constructor(
    private host: ReactiveElement,
    private light: () => boolean,
    private read: (nodes: Node[]) => void,
  ) {
    host.addController(this);
  }

  hostConnected(): void {
    // Read before the first render, so it costs no second update.
    this.sync();
    if (this.host.hasUpdated) this.watch();
  }

  hostDisconnected(): void {
    this.observer?.disconnect();
  }

  hostUpdated(): void {
    if (this.marked) return;
    this.marked = true;
    if (this.light()) for (const n of this.host.childNodes) if (n !== this.holder) this.own.add(n);
    this.sync();
    this.watch();
  }

  /** The source nodes now (in light mode, adopting any new children first). */
  nodes(): Node[] {
    return this.light() ? this.adopt() : [...this.host.childNodes];
  }

  private sync(): void {
    this.read(this.nodes());
  }

  private adopt(): Node[] {
    const host = this.host;
    const incoming = [...host.childNodes].filter((n) => n !== this.holder && !this.own.has(n));
    if (incoming.length && !this.holder) {
      this.holder = host.ownerDocument.createElement('div');
      this.holder.hidden = true;
      this.holder.className = `${host.localName}-source`;
      // Created after watch() ran (children added later): watch it too.
      if (this.observer && this.marked) this.observer.observe(this.holder, CONTENT);
    }
    if (this.holder) {
      this.holder.append(...incoming);
      if (this.holder.parentNode !== host) host.prepend(this.holder);
    }
    return this.holder ? [...this.holder.childNodes] : [];
  }

  /** Shadow mode: the children, subtree included. Light mode: the host's new children and the holder. */
  private watch(): void {
    this.observer ??= new MutationObserver(() => this.sync());
    this.observer.disconnect();
    if (this.light()) {
      this.observer.observe(this.host, { childList: true });
      if (this.holder) this.observer.observe(this.holder, CONTENT);
    } else {
      this.observer.observe(this.host, CONTENT);
    }
  }
}

/** Schemes a component may link to; anything else (javascript:, data:, …) is shown as text. */
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/** Whether `href` may be a link: relative, hash, http(s), mailto and tel. */
export function safeHref(href: string, base: string): boolean {
  try {
    return SAFE_SCHEMES.has(new URL(href, base).protocol);
  } catch {
    return false;
  }
}

/** Collapse whitespace and trim. */
export const normalize = (s: unknown): string =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();
