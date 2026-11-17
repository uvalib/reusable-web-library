/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type -- the old mixin's signatures */
import type { LitElement } from 'lit';

type Constructor<T = {}> = new (...args: any[]) => T;

export interface IUvalibAnalyticsMixin {
  _analyticsEvent(events: any[], eventTarget?: EventTarget | null): void;
  _analyticsSearch(
    query: string,
    category?: string | null,
    count?: number | null,
    eventTarget?: EventTarget | null,
  ): void;
}

/**
 * The old `@uvalib/uvalib-analytics` mixin: `_analyticsEvent` and `_analyticsSearch` fire
 * `uvalib-analytics-event` and `uvalib-analytics-search` (bubbling, composed) from the element
 * or `eventTarget`. `SiteAnalyticsMixin` is the same with the `site-analytics-*` names.
 */
export const UvalibAnalyticsMixin = <T extends Constructor<LitElement>>(superClass: T) => {
  class UvalibAnalyticsMixinClass
    extends (superClass as Constructor<HTMLElement & LitElement>)
    implements IUvalibAnalyticsMixin
  {
    _analyticsEvent(events: any[], eventTarget: EventTarget | null = null) {
      (eventTarget ?? this).dispatchEvent(
        new CustomEvent('uvalib-analytics-event', {
          detail: { event: events },
          bubbles: true,
          composed: true,
        }),
      );
    }

    _analyticsSearch(
      query: string,
      category: string | null = null,
      count: number | null = null,
      eventTarget: EventTarget | null = null,
    ) {
      (eventTarget ?? this).dispatchEvent(
        new CustomEvent('uvalib-analytics-search', {
          detail: { searchQuery: query, searchCategory: category, resultCount: count },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  return UvalibAnalyticsMixinClass as unknown as T &
    Constructor<IUvalibAnalyticsMixin & LitElement>;
};
