"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchForYouDismissed,
  trimForYouDismissedToCap,
  upsertForYouDismissed,
} from "@/lib/forYouDismissed/cloudStore";
import {
  dismissForYouVideoLocal,
  mergeDismissedFromCloud,
  readDismissedVideoIds,
} from "@/lib/forYou/dismissedVideos";
import type { ForYouFeedResult, ForYouSection } from "@/lib/forYou/types";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";

function filterDismissedSections(
  sections: ForYouSection[],
  dismissed: Set<string>,
): ForYouSection[] {
  if (dismissed.size === 0) return sections;

  return sections
    .map((section) => ({
      ...section,
      videos: section.videos.filter((video) => !dismissed.has(video.id)),
    }))
    .filter((section) => section.videos.length > 0);
}

type UseForYouDismissedOptions = {
  cloudEnabled?: boolean;
};

export function useForYouDismissed(
  userId: string | null | undefined,
  { cloudEnabled = false }: UseForYouDismissedOptions = {},
) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!userId) {
      setDismissedIds(new Set());
      return;
    }

    setDismissedIds(readDismissedVideoIds(userId));

    if (!cloudEnabled || !supabase) return;

    let cancelled = false;
    void (async () => {
      try {
        const remote = await fetchForYouDismissed(supabase);
        if (cancelled) return;
        const merged = mergeDismissedFromCloud(userId, remote);
        setDismissedIds(new Set(merged.map((entry) => entry.videoId)));
      } catch {
        /* keep local cache on cloud error */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cloudEnabled, supabase, userId]);

  const dismissVideo = useCallback(
    (videoId: string) => {
      if (!userId) return;

      dismissForYouVideoLocal(userId, videoId);
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.add(videoId);
        return next;
      });

      if (cloudEnabled && supabase) {
        void upsertForYouDismissed(supabase, userId, videoId)
          .then(() => trimForYouDismissedToCap(supabase, userId))
          .catch(() => {
            /* optimistic local dismiss kept */
          });
      }
    },
    [cloudEnabled, supabase, userId],
  );

  const filterFeed = useCallback(
    (feed: ForYouFeedResult): ForYouFeedResult => {
      const sections = filterDismissedSections(feed.sections, dismissedIds);
      return {
        sections,
        empty: sections.length === 0,
      };
    },
    [dismissedIds],
  );

  return {
    dismissedIds,
    dismissVideo,
    filterFeed,
  };
}
