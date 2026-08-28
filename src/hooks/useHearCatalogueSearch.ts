import { useCallback, useEffect, useRef, useState } from "react";
import {
  searchHearCatalogue,
  type HearCatalogueSearchOptions,
} from "@/services/content/hear-catalogue-service";
import { EXTERNAL_VOICE_CONFIG } from "@/constants/external-voice";
import type { ContentItem, HearCataloguePage } from "@/types";

type PaginatedSearchOptions = Omit<
  HearCatalogueSearchOptions,
  "page" | "limit" | "signal"
> & {
  pageSize?: number;
};

type PaginatedSearchState = {
  key: string;
  items: ContentItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  remaining: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;
};

export function useHearCatalogueSearch(options: PaginatedSearchOptions) {
  const requestKey = JSON.stringify({
    query: options.query?.trim() ?? "",
    filter: options.filter ?? null,
    sort: options.sort ?? null,
    isLocal: options.isLocal ?? false,
    isRecommended: options.isRecommended ?? false,
    pageSize:
      options.pageSize ?? EXTERNAL_VOICE_CONFIG.cataloguePageSize,
  });
  const [reloadSequence, setReloadSequence] = useState(0);
  const [state, setState] = useState<PaginatedSearchState>(() =>
    initialState(requestKey),
  );
  const stateRef = useRef(state);
  const requestGeneration = useRef(0);
  const firstPageController = useRef<AbortController | null>(null);
  const nextPageController = useRef<AbortController | null>(null);

  const commit = useCallback(
    (
      update:
        | PaginatedSearchState
        | ((current: PaginatedSearchState) => PaginatedSearchState),
    ) => {
      setState((current) => {
        const next = typeof update === "function" ? update(current) : update;
        stateRef.current = next;
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    requestGeneration.current += 1;
    const generation = requestGeneration.current;
    firstPageController.current?.abort();
    nextPageController.current?.abort();
    const controller = new AbortController();
    firstPageController.current = controller;
    const requestOptions = JSON.parse(requestKey) as {
      query: string;
      filter: PaginatedSearchOptions["filter"] | null;
      sort: PaginatedSearchOptions["sort"] | null;
      isLocal: boolean;
      isRecommended: boolean;
      pageSize: number;
    };
    commit(initialState(requestKey));

    void searchHearCatalogue({
      query: requestOptions.query,
      ...(requestOptions.filter ? { filter: requestOptions.filter } : {}),
      ...(requestOptions.sort ? { sort: requestOptions.sort } : {}),
      isLocal: requestOptions.isLocal,
      isRecommended: requestOptions.isRecommended,
      page: 0,
      limit: requestOptions.pageSize,
      signal: controller.signal,
    })
      .then((page) => {
        if (controller.signal.aborted || generation !== requestGeneration.current)
          return;
        commit(stateFromPage(requestKey, page));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || generation !== requestGeneration.current)
          return;
        commit({
          ...initialState(requestKey),
          loading: false,
          error: errorMessage(error, "Hear! search is unavailable."),
        });
      });

    return () => controller.abort();
  }, [commit, reloadSequence, requestKey]);

  useEffect(
    () => () => {
      firstPageController.current?.abort();
      nextPageController.current?.abort();
    },
    [],
  );

  const loadNextPage = useCallback(async () => {
    const current = stateRef.current;
    if (
      current.key !== requestKey ||
      current.loading ||
      current.loadingMore ||
      !pageHasMore(current)
    ) {
      return;
    }

    const generation = requestGeneration.current;
    const controller = new AbortController();
    nextPageController.current?.abort();
    nextPageController.current = controller;
    const requestOptions = JSON.parse(requestKey) as {
      query: string;
      filter: PaginatedSearchOptions["filter"] | null;
      sort: PaginatedSearchOptions["sort"] | null;
      isLocal: boolean;
      isRecommended: boolean;
      pageSize: number;
    };
    commit({
      ...current,
      loadingMore: true,
      loadMoreError: null,
    });

    try {
      const page = await searchHearCatalogue({
        query: requestOptions.query,
        ...(requestOptions.filter ? { filter: requestOptions.filter } : {}),
        ...(requestOptions.sort ? { sort: requestOptions.sort } : {}),
        isLocal: requestOptions.isLocal,
        isRecommended: requestOptions.isRecommended,
        page: current.page + 1,
        limit: requestOptions.pageSize,
        signal: controller.signal,
      });
      if (controller.signal.aborted || generation !== requestGeneration.current)
        return;
      commit((latest) => ({
        ...stateFromPage(requestKey, page),
        items: uniqueContent([...latest.items, ...page.items]),
      }));
    } catch (error) {
      if (controller.signal.aborted || generation !== requestGeneration.current)
        return;
      commit((latest) => ({
        ...latest,
        loadingMore: false,
        loadMoreError: errorMessage(
          error,
          "More Hear! audio could not be loaded.",
        ),
      }));
    }
  }, [commit, requestKey]);

  const visibleState = state.key === requestKey ? state : initialState(requestKey);
  return {
    ...visibleState,
    hasMore: pageHasMore(visibleState),
    loadNextPage,
    retry: () => setReloadSequence((sequence) => sequence + 1),
  };
}

function initialState(key: string): PaginatedSearchState {
  return {
    key,
    items: [],
    page: -1,
    limit: EXTERNAL_VOICE_CONFIG.cataloguePageSize,
    total: 0,
    totalPages: 0,
    remaining: 0,
    loading: true,
    loadingMore: false,
    error: null,
    loadMoreError: null,
  };
}

function stateFromPage(
  key: string,
  page: HearCataloguePage,
): PaginatedSearchState {
  return {
    key,
    items: uniqueContent(page.items),
    page: page.page,
    limit: page.limit,
    total: page.total,
    totalPages: page.totalPages,
    remaining: page.remaining,
    loading: false,
    loadingMore: false,
    error: null,
    loadMoreError: null,
  };
}

function pageHasMore(
  page: Pick<PaginatedSearchState, "page" | "totalPages" | "remaining">,
): boolean {
  return page.remaining > 0 && page.page + 1 < page.totalPages;
}

function uniqueContent(items: ContentItem[]): ContentItem[] {
  const unique = new Map<string, ContentItem>();
  for (const item of items) unique.set(item.id, item);
  return [...unique.values()];
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
