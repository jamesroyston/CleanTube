"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchForYouMutedSearches,
  trimForYouMutedSearchesToCap,
  upsertForYouMutedSearch,
} from "@/lib/forYouMutedSearches/cloudStore";
import {
  mergeMutedSearchesFromCloud,
  muteForYouSearchLocal,
  readMutedSearchQueryKeys,
} from "@/lib/forYouMutedSearches/localStore";
import { normalizeForYouSearchQuery } from "@/lib/forYouMutedSearches/types";
import type { ForYouFeedResult, ForYouSection } from "@/lib/forYou/types";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";

export function searchQueryFromForYouSection(
  section: ForYouSection,
): string | undefined {
  if (section.seedSearchQuery?.trim()) return section.seedSearchQuery;
  const prefix = "From search: ";
  if (section.title.startsWith(prefix)) {
    const query = section.title.slice(prefix.length).trim();
    return query || undefined;
  }
  return undefined;
}

function filterMutedSearchSections(
  sections: ForYouSection[],
  muted: Set<string>,
): ForYouSection[] {
  if (muted.size === 0) return sections;
  return sections.filter((section) => {
    const query = searchQueryFromForYouSection(section);
    if (!query) return true;
    return !muted.has(normalizeForYouSearchQuery(query));
  });
}

type UseForYouMutedSearchesOptions = {
  cloudEnabled?: boolean;
};

export function useForYouMutedSearches(
  userId: string | null | undefined,
  { cloudEnabled = false }: UseForYouMutedSearchesOptions = {},
) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [mutedKeys, setMutedKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!userId) {
      setMutedKeys(new Set());
      return;
    }

    setMutedKeys(readMutedSearchQueryKeys(userId));

    if (!cloudEnabled || !supabase) return;

    let cancelled = false;
    void (async () => {
      try {
        const remote = await fetchForYouMutedSearches(supabase);
        if (cancelled) return;
        const merged = mergeMutedSearchesFromCloud(userId, remote);
        setMutedKeys(new Set(merged.map((entry) => entry.queryKey)));
      } catch {
        /* keep local cache on cloud error */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cloudEnabled, supabase, userId]);

  const muteSearch = useCallback(
    async (query: string) => {
      if (!userId) return;

      muteForYouSearchLocal(userId, query);
      const queryKey = normalizeForYouSearchQuery(query);
      setMutedKeys((prev) => {
        const next = new Set(prev);
        next.add(queryKey);
        return next;
      });

      if (cloudEnabled && supabase) {
        try {
          await upsertForYouMutedSearch(supabase, userId, query);
          await trimForYouMutedSearchesToCap(supabase, userId);
        } catch {
          /* optimistic local mute kept */
        }
      }
    },
    [cloudEnabled, supabase, userId],
  );

  const filterFeed = useCallback(
    (feed: ForYouFeedResult): ForYouFeedResult => {
      const sections = filterMutedSearchSections(feed.sections, mutedKeys);
      return {
        sections,
        empty: sections.length === 0,
        generatedDayKey: feed.generatedDayKey,
      };
    },
    [mutedKeys],
  );

  return {
    mutedKeys,
    muteSearch,
    filterFeed,
  };
}
