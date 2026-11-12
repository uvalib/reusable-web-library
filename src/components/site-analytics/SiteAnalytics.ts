/* eslint-disable @typescript-eslint/no-explicit-any -- ported verbatim from the monorepo */
import { html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { findMatomoId } from '../../data/sites.js';

// Extend the global Window interface
declare global {
  interface Window {
    _paq: any[];
    Matomo: any;
  }
}

interface PageViewDetail {
  customTitle?: string;
  referrer?: string;
}

interface SearchDetail {
  searchQuery: string;
  searchCategory?: string;
  resultCount: number;
}

interface EventDetail {
  event: any[];
}

export class SiteAnalytics extends UvalibElement {
  static styles = css`
    :host {
      display: none;
    }
  `;

  @property({ type: String }) matomoURL: string = 'https://analytics.lib.virginia.edu/';
  @property({ type: Number }) matomoId?: number;
  @property({ type: Boolean }) spa: boolean = false;
  @property({ type: Object }) variables: any = null;

  private matomoTracker?: any;

  firstUpdated() {
    // If matomoId is not provided, find the correct one based on the current URL
    if (!this.matomoId) {
      this.matomoId = this.getMatomoIdFromCurrentUrl();
    }

    this.initMatomo();
  }

  private readonly onSearch = this.logSearch.bind(this) as EventListener;
  private readonly onEvent = this.logEvent.bind(this) as EventListener;
  private readonly onPageView = this.logPageView.bind(this) as EventListener;

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener('site-analytics-search', this.onSearch);
    document.addEventListener('site-analytics-event', this.onEvent);
    document.addEventListener('site-analytics-pageview', this.onPageView);
  }

  override disconnectedCallback() {
    document.removeEventListener('site-analytics-search', this.onSearch);
    document.removeEventListener('site-analytics-event', this.onEvent);
    document.removeEventListener('site-analytics-pageview', this.onPageView);
    super.disconnectedCallback();
  }

  private getMatomoIdFromCurrentUrl(): number | undefined {
    return findMatomoId(window.location.href);
  }

  private logPageView(e: CustomEvent<PageViewDetail>) {
    if (!this.matomoTracker) return;

    const customTitle = e.detail?.customTitle || document.querySelector('title')?.text || '';
    const referrer = e.detail?.referrer?.startsWith('http')
      ? e.detail.referrer
      : document.location.origin + (e.detail?.referrer || document.referrer);

    this.matomoTracker.setDocumentTitle(customTitle);
    this.matomoTracker.setReferrerUrl(referrer);
    this.matomoTracker.trackPageView(customTitle);
  }

  private logSearch(e: CustomEvent<SearchDetail>) {
    if (this.matomoTracker) {
      this.matomoTracker.trackSiteSearch(
        e.detail.searchQuery,
        e.detail.searchCategory,
        e.detail.resultCount.toString(),
      );
    }
  }

  private logEvent(e: CustomEvent<EventDetail>) {
    if (e.detail && Array.isArray(e.detail.event) && this.matomoTracker) {
      this.matomoTracker.trackEvent(...e.detail.event);
    }
  }

  private initMatomo() {
    if (!this.matomoId) return;

    const _paq: any[] = (window._paq = window._paq || []);
    if (!this.spa) {
      _paq.push(['trackPageView']);
      _paq.push(['enableLinkTracking']);
    }
    _paq.push(['setTrackerUrl', `${this.matomoURL}matomo.php`]);
    _paq.push(['setSiteId', this.matomoId.toString()]);

    if (this.variables) {
      for (const key in this.variables) {
        _paq.push(['setCustomDimension', key, this.variables[key]]);
      }
    }

    const scriptElement = document.createElement('script');
    scriptElement.src = `${this.matomoURL}matomo.js`;
    document.head.appendChild(scriptElement);

    this.getTracker(1000);
  }

  private getTracker(timeout: number) {
    if (window.Matomo) {
      this.matomoTracker = window.Matomo.getTracker(
        `${this.matomoURL}matomo.php`,
        this.matomoId!.toString(),
      );
    } else {
      setTimeout(() => this.getTracker(timeout + 1000), timeout);
    }
  }

  render() {
    return html``; // No visual representation, just the analytics logic
  }
}
