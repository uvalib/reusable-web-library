import { css, html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { trackEvent } from '../../base/analytics.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { installLightDomStyles } from '../../base/light-dom-styles.js';
import { accessible } from '../../styles/accessible.js';

/**
 * Kept with `no-style`: a wrapping tab row, 44px targets, `[hidden]` panels, and a
 * visible focus outline. `host` is `:host` (shadow) or the tag (light DOM).
 */
const structuralRules = (host: string) => `
  ${host} { display: block; min-width: 0; max-width: 100%; }
  ${host} .tablist {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    max-width: 100%;
    gap: 0.25rem;
  }
  ${host} button.tab {
    flex: 0 1 auto;
    box-sizing: border-box;
    max-width: 100%;
    min-width: 44px;
    min-height: 44px;
    margin: 0;
    white-space: normal;
    overflow-wrap: anywhere;
  }
  ${host} button.tab:focus-visible {
    outline: 3px solid var(--uva-color-focus, var(--uva-brand-orange, #e57200));
    outline-offset: 2px;
  }
  ${host} > .mount { display: none !important; }
  ${host}[hidden], ${host} [hidden] { display: none !important; }
  @media (forced-colors: active) {
    ${host} button.tab { border: 1px solid ButtonText; }
    ${host} button.tab[aria-selected='true'] {
      outline: 2px solid Highlight;
      background: Highlight;
      color: HighlightText;
      forced-color-adjust: none;
    }
    ${host} button.tab:focus-visible { outline: 3px solid Highlight; }
  }
`;
const shadowStructure = unsafeCSS(structuralRules(':host'));

const look = css`
  .tablist {
    margin: 0 0 1rem;
  }
  button.tab {
    appearance: none;
    padding: 0.5rem 1rem;
    border: 0;
    border-bottom: 4px solid transparent;
    background: var(--uva-color-button-bg, var(--uva-blue-alt-base, #007bac));
    color: var(--uva-color-button-text, #fff);
    font: inherit;
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: 0.02em;
    text-align: center;
    text-transform: uppercase;
    cursor: pointer;
  }
  button.tab:hover {
    background: var(--uva-color-button-hover-bg, var(--uva-blue-alt-dark, #005679));
    color: var(--uva-color-button-text, #fff);
  }
  button.tab[aria-selected='true'],
  button.tab[aria-selected='true']:hover {
    background: var(--uva-color-accent-bg, var(--uva-brand-blue, #232d4b));
    color: var(--uva-color-on-accent, #fff);
    font-weight: 700;
    border-bottom-color: var(--uva-color-on-accent, #fff);
  }
  @media (forced-colors: active) {
    button.tab {
      border: 2px solid ButtonText;
      background: ButtonFace;
      color: ButtonText;
    }
    button.tab[aria-selected='true'],
    button.tab[aria-selected='true']:hover {
      background: Highlight;
      color: HighlightText;
      border-color: Highlight;
      font-weight: 700;
    }
    button.tab:focus-visible {
      outline: 3px solid Highlight;
    }
  }
`;

interface Item {
  label: string;
  panel: HTMLElement;
  key: string;
  panelId: string;
  tabId: string;
}

interface PageLocation {
  pathname: string;
  search: string;
  hash: string;
}

const normalize = (value: unknown): string =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

/** A hash used as a route (`#/…`, `#!/…`) or that already carries a query string. */
const usesHashParam = (hash: string): boolean =>
  hash.startsWith('#/') || hash.startsWith('#!/') || hash.includes('?');

/**
 * The deep-link value in `loc`. Copied from the lightbox helpers so this bundle does not
 * import the IIIF parser. Hash routes keep the param in the hash; other URLs use search.
 */
const paramFromLocation = (loc: PageLocation, name: string): string | null => {
  if (!name) return null;
  if (usesHashParam(loc.hash)) {
    const q = loc.hash.indexOf('?');
    const params = new URLSearchParams(q >= 0 ? loc.hash.slice(q + 1) : '');
    return params.get(name);
  }
  return new URLSearchParams(loc.search).get(name);
};

/** `loc` with `name` set to `id`. Hash routes keep the param in the hash. */
const hrefWithParam = (loc: PageLocation, name: string, id: string): string => {
  if (usesHashParam(loc.hash)) {
    const q = loc.hash.indexOf('?');
    const path = q >= 0 ? loc.hash.slice(0, q) : loc.hash;
    const params = new URLSearchParams(q >= 0 ? loc.hash.slice(q + 1) : '');
    params.set(name, id);
    const qs = params.toString();
    return loc.pathname + loc.search + (qs ? `${path}?${qs}` : path);
  }
  const params = new URLSearchParams(loc.search);
  params.set(name, id);
  const qs = params.toString();
  return loc.pathname + (qs ? `?${qs}` : '') + loc.hash;
};

let seq = 0;

/**
 * Tabs, as on library.virginia.edu: a row of buttons over one visible panel.
 *
 * Each panel is a child with `data-tab="Events"` (and an `id` when the tab should be
 * linkable). Or put `<button slot="tab">` elements first and one panel element after
 * each; the button text is the label and those buttons are hidden, because the component
 * draws the real tabs. The selected panel stays visible across the upgrade. Give later
 * panels the `hidden` attribute in the markup so they stay hidden before the component
 * runs. The tab row wraps on a narrow screen.
 *
 * Arrow keys, Home and End move between tabs. Selection follows the arrow unless
 * `activation="manual"`, in which case Enter or Space selects the focused tab. `selected`
 * is the panel id (a label or a 0-based index also selects). It reflects the panel id.
 * `url-param` writes that id into the query string, or into the hash when the page is a
 * hash route (`#/stories?tab=events`). `url-param="hash"` uses the hash itself (`#events`)
 * and leaves a hash route (`#/…`) alone.
 *
 * @tagname uvalib-tabs
 * @slot - The panels. Each element with `data-tab` is a panel, or each element that is not a `slot="tab"` button.
 * @slot tab - A `<button>` whose text labels the panel that follows. Hidden once the tabs are drawn.
 * @fires change - The selected tab changed after the first render, including a script setting `selected` and the Back button. `detail` is `{ id, label, index }` (`id` is the panel id, `index` from 0). Not fired on the first render. Bubbles and is composed.
 * @fires uvalib-analytics-event - For `<site-analytics>`: a click or arrow-key selection, `['uvalib-tabs', 'change', '<tab label>']`. The label is cut to 100 characters. Not fired on the first render, when `selected` is set from script, or when Back or the hash restores a tab.
 * @cssprop --uva-color-button-bg - Dark-mode role token: unselected tab background (else `--uva-blue-alt-base`).
 * @cssprop --uva-color-button-text - Text on an unselected tab (else #fff).
 * @cssprop --uva-color-button-hover-bg - Dark-mode role token: unselected tab hover (else `--uva-blue-alt-dark`).
 * @cssprop --uva-color-accent-bg - Dark-mode role token: selected tab background (else `--uva-brand-blue`).
 * @cssprop --uva-color-on-accent - Selected tab text and the selected underline (else #fff).
 * @cssprop --uva-color-focus - Dark-mode role token: focus outline (else `--uva-brand-orange`).
 * @cssprop [--uva-blue-alt-base=#007BAC] - Unselected tab when `--uva-color-button-bg` is unset.
 * @cssprop [--uva-blue-alt-dark=#005679] - Unselected hover when `--uva-color-button-hover-bg` is unset.
 * @cssprop [--uva-brand-blue=#232D4B] - Selected tab when `--uva-color-accent-bg` is unset.
 * @cssprop [--uva-brand-orange=#E57200] - Focus outline when `--uva-color-focus` is unset.
 */
export class UvalibTabs extends UvalibElement {
  static styles = [accessible, shadowStructure, look];

  /**
   * The selected tab. A panel id, the tab label, or a 0-based index. Reflects the
   * panel id once the tabs have been read. Empty selects the first tab.
   */
  @property({ reflect: true }) selected = '';

  /**
   * `manual`: arrow keys move focus and Enter or Space selects. Anything else,
   * including empty, selects as the arrow moves.
   */
  @property() activation = '';

  /**
   * Name of the query parameter that stores the selected panel id, so the tab is
   * linkable and Back restores it. `hash` stores it in the hash (`#panel-id`)
   * instead. Empty does not touch the URL.
   */
  @property({ attribute: 'url-param' }) urlParam = '';

  /** Accessible name of the tab list. Empty uses “Tabs”. */
  @property() label = '';

  private readonly uid = `uvalib-tabs-${++seq}`;
  private mount?: HTMLElement;
  private earlySlot?: HTMLSlotElement;
  private readonly buttons = new Map<string, HTMLButtonElement>();
  /** Shadow-only tabpanels. Ids cannot point out of a shadow root, so the panel lives beside the tab. */
  private readonly panelHosts = new Map<string, HTMLElement>();
  private readonly boundLists = new WeakSet<HTMLElement>();
  private observer?: MutationObserver;
  private listening = false;
  private painting = false;
  private dirty = false;
  private booted = false;
  private userAct = false;
  private fromHistory = false;
  private pendingFocus = false;
  private cursor = 0;
  private lastKey = '';
  private warnedValue = false;
  private warnedShape = false;

  private get isLight(): boolean {
    return this.noShadowDom || this.hasAttribute('no-shadow-dom');
  }

  private get manual(): boolean {
    return this.activation.trim().toLowerCase() === 'manual';
  }

  private get listLabel(): string {
    return this.label.trim() || 'Tabs';
  }

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    if (!this.isLight) {
      const root = super.createRenderRoot();
      if (root instanceof ShadowRoot) {
        if (this.noStyle) {
          const sheet = shadowStructure.styleSheet;
          if (sheet) root.adoptedStyleSheets = [sheet];
        }
        // Light children are invisible until a slot exists. Lit renders on a
        // microtask, so the slot has to be here before that, then removed once
        // the template's own slot is in place (updated, still before paint).
        if (!root.querySelector('slot')) {
          const slot = this.ownerDocument.createElement('slot');
          root.append(slot);
          this.earlySlot = slot;
        }
      }
      return root;
    }
    const mount = this.ownerDocument.createElement('div');
    mount.className = 'mount';
    mount.hidden = true;
    this.mount = mount;
    this.append(mount);
    return mount;
  }

  /**
   * A property set while updating schedules another pass. `fixture` and callers
   * awaiting `updateComplete` wait until `selected` has settled on the panel id.
   */
  override async getUpdateComplete(): Promise<boolean> {
    const result = await super.getUpdateComplete();
    if (this.isUpdatePending) return this.getUpdateComplete();
    return result;
  }

  override connectedCallback(): void {
    if (!this.booted) {
      const fromUrl = this.readUrl();
      if (fromUrl) this.selected = fromUrl;
    }
    const light = this.isLight;
    super.connectedCallback();
    this.suppressUnselected();
    this.install(light);
    this.observe();
    this.listen();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.observer?.disconnect();
    this.unlisten();
  }

  protected override render() {
    if (this.isLight) return html``;
    return html`
      <div
        class="tablist"
        role="tablist"
        aria-orientation="horizontal"
        aria-label=${this.listLabel}
        @click=${this.onClick}
        @keydown=${this.onKeydown}
      ></div>
      <div class="panels"></div>
    `;
  }

  protected override updated(): void {
    this.earlySlot?.remove();
    this.earlySlot = undefined;
    this.painting = true;
    try {
      const items = this.collect();
      const match = items.length ? this.indexFor(items, this.selected) : -1;
      const index = items.length ? (match < 0 ? 0 : match) : -1;
      const key = index >= 0 ? items[index]!.key : '';
      if (index >= 0 && (!this.manual || !this.booted || key !== this.lastKey)) this.cursor = index;
      if (this.cursor >= items.length) this.cursor = Math.max(0, items.length - 1);
      if (items.length && this.selected !== key) {
        if (match < 0 && this.selected.trim()) this.warnValue();
        this.sync(items, index);
        this.selected = key;
        return;
      }
      this.sync(items, index);
      if (!items.length) {
        this.booted = true;
        this.lastKey = '';
        this.userAct = false;
        this.fromHistory = false;
        return;
      }
      if (!this.booted) {
        this.booted = true;
        this.lastKey = key;
        this.userAct = false;
        this.fromHistory = false;
        return;
      }
      if (key !== this.lastKey) this.emit(items[index]!, index);
      else {
        this.userAct = false;
        this.fromHistory = false;
      }
      this.focusPending(items);
    } finally {
      queueMicrotask(() => {
        this.painting = false;
        if (this.dirty) {
          this.dirty = false;
          this.requestUpdate();
        }
      });
    }
  }

  private install(light: boolean): void {
    if (!light) return;
    const node = this.getRootNode();
    const root = node instanceof Document || node instanceof ShadowRoot ? node : undefined;
    if (this.noStyle) {
      installLightDomStyles(
        `${this.localName}::structure`,
        unsafeCSS(structuralRules(this.localName)),
        { root, scope: false },
      );
      return;
    }
    installLightDomStyles(
      this.localName,
      (this.constructor as typeof UvalibElement).elementStyles,
      {
        root,
      },
    );
  }

  /** Hide every panel except the selected one before the first paint. Never hides that one. */
  private suppressUnselected(): void {
    const items = this.collect();
    if (!items.length) return;
    const index = this.resolve(items);
    items.forEach((item, i) => {
      const hide = i !== index;
      if (item.panel.hidden !== hide) item.panel.hidden = hide;
    });
  }

  private observe(): void {
    this.observer ??= new MutationObserver(this.onMutations);
    this.observer.disconnect();
    this.observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-tab', 'slot', 'id'],
    });
  }

  private readonly onMutations = (records: MutationRecord[]): void => {
    if (records.every((record) => this.insideChrome(record.target))) return;
    if (this.painting) {
      this.dirty = true;
      return;
    }
    this.requestUpdate();
  };

  private insideChrome(node: Node): boolean {
    const el = node instanceof Element ? node : node.parentElement;
    if (!el || el === this) return false;
    return !!el.closest('.tablist, .mount');
  }

  private listen(): void {
    if (this.listening) return;
    this.listening = true;
    window.addEventListener('popstate', this.onHistory);
    window.addEventListener('hashchange', this.onHistory);
  }

  private unlisten(): void {
    if (!this.listening) return;
    this.listening = false;
    window.removeEventListener('popstate', this.onHistory);
    window.removeEventListener('hashchange', this.onHistory);
  }

  private readonly onHistory = (): void => {
    if (!this.urlParam.trim() || !this.booted) return;
    const items = this.collect();
    if (!items.length) return;
    const raw = this.readUrl();
    const match = raw == null ? 0 : this.indexFor(items, raw);
    const index = match < 0 ? 0 : match;
    const key = items[index]!.key;
    if (key === this.lastKey) return;
    this.fromHistory = true;
    this.selected = key;
  };

  private readonly onClick = (event: MouseEvent): void => {
    if (event.button !== 0 || event.defaultPrevented) return;
    const target = event.target instanceof Element ? event.target : null;
    const btn = target?.closest('button.tab');
    if (!(btn instanceof HTMLButtonElement) || !btn.parentElement?.classList.contains('tablist'))
      return;
    const index = [...btn.parentElement.children].indexOf(btn);
    const item = this.collect()[index];
    if (!item || (this.booted && item.key === this.lastKey)) return;
    this.cursor = index;
    this.userAct = true;
    this.selected = item.key;
  };

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
    if (
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    )
      return;
    const items = this.collect();
    if (!items.length) return;
    event.preventDefault();
    const rtl = getComputedStyle(this).direction === 'rtl';
    let next = this.cursor;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else {
      const forward = event.key === 'ArrowRight' ? !rtl : rtl;
      next = (this.cursor + (forward ? 1 : -1) + items.length) % items.length;
    }
    this.pendingFocus = true;
    if (this.manual) {
      this.cursor = next;
      this.requestUpdate();
      return;
    }
    const item = items[next];
    if (!item) return;
    if (this.booted && item.key === this.lastKey) {
      this.requestUpdate();
      return;
    }
    this.cursor = next;
    this.userAct = true;
    this.selected = item.key;
  };

  private childrenOf(): HTMLElement[] {
    return [...this.children].filter((node): node is HTMLElement => {
      if (!(node instanceof HTMLElement)) return false;
      if (node === this.mount) return false;
      if (node.classList.contains('tablist') || node.classList.contains('mount')) return false;
      return true;
    });
  }

  private collect(): Item[] {
    const kids = this.childrenOf();
    const sources = kids.filter(
      (node): node is HTMLButtonElement =>
        node.localName === 'button' && node.getAttribute('slot') === 'tab',
    );
    const panels = sources.length
      ? kids.filter((node) => !(node.localName === 'button' && node.getAttribute('slot') === 'tab'))
      : kids.filter((node) => node.hasAttribute('data-tab'));
    this.warnShape(kids, sources.length, panels.length);
    const used = new Set<string>();
    return panels.map((panel, i) => {
      let panelId = panel.id.trim();
      if (!panelId || used.has(panelId)) {
        panelId = `${this.uid}-panel-${i}`;
        let n = 2;
        while (used.has(panelId)) panelId = `${this.uid}-panel-${i}-${n++}`;
      }
      used.add(panelId);
      const source = sources[i] ?? null;
      const label =
        normalize(source?.textContent) ||
        normalize(panel.getAttribute('data-tab')) ||
        `Tab ${i + 1}`;
      return { label, panel, key: panelId, panelId, tabId: `${panelId}-tab` };
    });
  }

  private warnShape(kids: HTMLElement[], sources: number, panels: number): void {
    if (this.warnedShape || !kids.length) return;
    const stray =
      (sources > 0 && sources !== panels) ||
      (sources === 0 && kids.some((node) => !node.hasAttribute('data-tab')));
    if (!stray) return;
    this.warnedShape = true;
    console.warn(
      `${this.localName}: each panel needs data-tab, or one button slot="tab" per panel. A child was skipped.`,
    );
  }

  private warnValue(): void {
    if (this.warnedValue) return;
    this.warnedValue = true;
    console.warn(`${this.localName}: selected does not match a tab; showing the first tab.`);
  }

  /** Panel id, then label, then a 0-based index. `-1` when nothing matches. */
  private indexFor(items: Item[], value: string): number {
    const raw = value.trim();
    if (!raw) return 0;
    const byId = items.findIndex((item) => item.key === raw || item.panelId === raw);
    if (byId >= 0) return byId;
    const byLabel = items.findIndex((item) => item.label === raw);
    if (byLabel >= 0) return byLabel;
    if (/^\d+$/.test(raw)) {
      const n = Number(raw);
      if (n >= 0 && n < items.length) return n;
    }
    return -1;
  }

  private resolve(items: Item[]): number {
    const match = this.indexFor(items, this.selected);
    return match < 0 ? 0 : match;
  }

  private sync(items: Item[], selectedIndex: number): void {
    for (const node of this.children) {
      if (node instanceof HTMLButtonElement && node.getAttribute('slot') === 'tab') {
        if (!node.hidden) node.hidden = true;
        if (node.tabIndex !== -1) node.tabIndex = -1;
      }
    }
    const list = this.ensureList();
    if (list) this.syncButtons(list, items, selectedIndex);
    this.syncPanels(items, selectedIndex);
  }

  private ensureList(): HTMLElement | null {
    if (!this.isLight) {
      const found = this.renderRoot.querySelector('.tablist');
      return found instanceof HTMLElement ? found : null;
    }
    const found = [...this.children].find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.classList.contains('tablist'),
    );
    const list = found ?? this.ownerDocument.createElement('div');
    if (!found) {
      list.className = 'tablist';
      this.prepend(list);
    } else if (this.firstElementChild !== list) {
      this.prepend(list);
    }
    this.setAttr(list, 'role', 'tablist');
    this.setAttr(list, 'aria-orientation', 'horizontal');
    this.setAttr(list, 'aria-label', this.listLabel);
    if (!this.boundLists.has(list)) {
      this.boundLists.add(list);
      list.addEventListener('click', this.onClick);
      list.addEventListener('keydown', this.onKeydown);
    }
    return list;
  }

  private syncButtons(list: HTMLElement, items: Item[], selectedIndex: number): void {
    this.setAttr(list, 'aria-label', this.listLabel);
    const live = new Set(items.map((item) => item.key));
    for (const [key, btn] of this.buttons) {
      if (!live.has(key)) {
        btn.remove();
        this.buttons.delete(key);
      }
    }
    items.forEach((item, i) => {
      let btn = this.buttons.get(item.key);
      if (!btn) {
        btn = this.ownerDocument.createElement('button');
        btn.type = 'button';
        btn.className = 'tab';
        btn.setAttribute('role', 'tab');
        this.buttons.set(item.key, btn);
      }
      if (btn.id !== item.tabId) btn.id = item.tabId;
      this.setAttr(btn, 'aria-controls', this.controlledId(item));
      this.setAttr(btn, 'aria-selected', i === selectedIndex ? 'true' : 'false');
      const tabbable = this.manual ? i === this.cursor : i === selectedIndex;
      if (btn.tabIndex !== (tabbable ? 0 : -1)) btn.tabIndex = tabbable ? 0 : -1;
      if (btn.textContent !== item.label) btn.textContent = item.label;
      if (list.children[i] !== btn) list.insertBefore(btn, list.children[i] ?? null);
    });
    while (list.children.length > items.length) list.lastElementChild?.remove();
  }

  /** The id of the element that is `role="tabpanel"`. In shadow that element is not the light child. */
  private controlledId(item: Item): string {
    return this.isLight ? item.panelId : `${item.panelId}-tabpanel`;
  }

  private syncPanels(items: Item[], selectedIndex: number): void {
    if (!this.isLight) {
      this.syncShadowPanels(items, selectedIndex);
      return;
    }
    items.forEach((item, i) => this.markPanel(item.panel, item, i !== selectedIndex));
  }

  /**
   * A shadow button cannot reference a light-DOM id. The tabpanel is a shadow
   * element; the author's panel is slotted into it and hidden with it.
   */
  private syncShadowPanels(items: Item[], selectedIndex: number): void {
    const box = this.renderRoot.querySelector('.panels');
    if (!(box instanceof HTMLElement)) return;
    const live = new Set(items.map((item) => item.key));
    for (const [key, host] of this.panelHosts) {
      if (!live.has(key)) {
        host.remove();
        this.panelHosts.delete(key);
      }
    }
    items.forEach((item, i) => {
      let host = this.panelHosts.get(item.key);
      if (!host) {
        host = this.ownerDocument.createElement('div');
        host.className = 'panel';
        this.panelHosts.set(item.key, host);
      }
      const hostId = this.controlledId(item);
      if (host.id !== hostId) host.id = hostId;
      this.setAttr(host, 'role', 'tabpanel');
      this.setAttr(host, 'aria-labelledby', item.tabId);
      let slot = host.querySelector('slot');
      if (!(slot instanceof HTMLSlotElement)) {
        slot = this.ownerDocument.createElement('slot');
        host.append(slot);
      }
      const slotName = `${this.uid}-${i}`;
      if (slot.name !== slotName) slot.name = slotName;
      if (box.children[i] !== host) box.insertBefore(host, box.children[i] ?? null);
      if (item.panel.getAttribute('slot') !== slotName) item.panel.setAttribute('slot', slotName);
      if (item.panel.getAttribute('role') === 'tabpanel') item.panel.removeAttribute('role');
      if (item.panel.getAttribute('aria-labelledby') === item.tabId)
        item.panel.removeAttribute('aria-labelledby');
      const hide = i !== selectedIndex;
      if (host.hidden !== hide) host.hidden = hide;
      if (item.panel.hidden !== hide) item.panel.hidden = hide;
      if (item.panel.id !== item.panelId) item.panel.id = item.panelId;
    });
    while (box.children.length > items.length) box.lastElementChild?.remove();
  }

  private markPanel(panel: HTMLElement, item: Item, hide: boolean): void {
    if (panel.id !== item.panelId) panel.id = item.panelId;
    this.setAttr(panel, 'role', 'tabpanel');
    this.setAttr(panel, 'aria-labelledby', item.tabId);
    if (panel.hidden !== hide) panel.hidden = hide;
  }

  private setAttr(el: Element, name: string, value: string): void {
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  }

  private focusPending(items: Item[]): void {
    if (!this.pendingFocus) return;
    this.pendingFocus = false;
    const btn = this.buttons.get(items[this.cursor]?.key ?? '');
    if (!btn) return;
    btn.focus();
    try {
      btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } catch {
      /* not every document can scroll */
    }
  }

  private emit(item: Item, index: number): void {
    const user = this.userAct;
    const fromHistory = this.fromHistory;
    this.userAct = false;
    this.fromHistory = false;
    this.lastKey = item.key;
    if (user) trackEvent(this, ['uvalib-tabs', 'change', item.label]);
    if (!fromHistory) this.writeUrl(user ? 'push' : 'replace', item.key);
    this.dispatchEvent(
      new CustomEvent('change', {
        bubbles: true,
        composed: true,
        detail: { id: item.panelId, label: item.label, index },
      }),
    );
  }

  private page(): PageLocation {
    return { pathname: location.pathname, search: location.search, hash: location.hash };
  }

  /** The id in the URL, or null when this component should not read one. */
  private readUrl(): string | null {
    const name = this.urlParam.trim();
    if (!name) return null;
    const loc = this.page();
    if (name === 'hash') {
      const raw = loc.hash.startsWith('#') ? loc.hash.slice(1) : '';
      if (!raw || raw.startsWith('/') || raw.startsWith('!') || raw.includes('?')) return null;
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
    return paramFromLocation(loc, name);
  }

  private writeUrl(mode: 'push' | 'replace', key: string): void {
    const name = this.urlParam.trim();
    if (!name || !key) return;
    const loc = this.page();
    let next: string;
    if (name === 'hash') {
      if (usesHashParam(loc.hash)) return;
      next = loc.pathname + loc.search + `#${encodeURIComponent(key)}`;
    } else {
      next = hrefWithParam(loc, name, key);
    }
    if (next === loc.pathname + loc.search + loc.hash) return;
    const current = history.state;
    const state =
      current && typeof current === 'object'
        ? { ...current, uvalibTabs: this.uid }
        : { uvalibTabs: this.uid };
    try {
      if (mode === 'push') history.pushState(state, '', next);
      else history.replaceState(state, '', next);
    } catch {
      /* a sandboxed document can refuse history */
    }
  }
}
