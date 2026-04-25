"use client";

import { useEffect, useRef } from "react";

import { useSavedChannels } from "@/context/SavedChannelsContext";
import { extractHighConfidenceChannelLookup } from "@/lib/youtubeUrl";
import type { ChannelDetails } from "@/lib/youtubeTypes";
import type { SavedChannel } from "@/types/savedChannel";

/**
 * EXPERIMENTAL SAVED CHANNEL MIGRATION.
 *
 * This is intentionally isolated and mounted once from AppShell so it is easy
 * to rip out if automatic enrichment behaves badly. Remove this file and the
 * <SavedChannelMigration /> mount to disable the migration.
 *
 * Scope is high-confidence only: canonical UC ids, @handles, and YouTube
 * channel URLs. Plain strings like "Computerphile" are left as search shortcuts.
 */
export function SavedChannelMigration() {
  const { channels, updateChannel } = useSavedChannels();
  const attemptedIdsRef = useRef(new Set<string>());

  useEffect(() => {
    const candidates = channels.filter((channel) => {
      if (channel.channelId || attemptedIdsRef.current.has(channel.id)) {
        return false;
      }
      return Boolean(candidateLookup(channel));
    });

    if (candidates.length === 0) return;

    let cancelled = false;

    async function migrate(channel: SavedChannel) {
      attemptedIdsRef.current.add(channel.id);
      const lookup = candidateLookup(channel);
      if (!lookup) return;

      try {
        const response = await fetch("/api/channels/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: lookup }),
        });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as {
          channel?: ChannelDetails;
        };
        if (!payload.channel || cancelled) return;

        updateChannel(channel.id, {
          name: payload.channel.title,
          channelId: payload.channel.id,
          channelUrl: payload.channel.channelUrl,
        });
      } catch {
        /* Leave the saved search untouched if resolution fails. */
      }
    }

    void Promise.all(candidates.map(migrate));

    return () => {
      cancelled = true;
    };
  }, [channels, updateChannel]);

  return null;
}

function candidateLookup(channel: SavedChannel): string | null {
  return (
    (channel.channelUrl
      ? extractHighConfidenceChannelLookup(channel.channelUrl)
      : null) ||
    extractHighConfidenceChannelLookup(channel.searchQuery) ||
    extractHighConfidenceChannelLookup(channel.name)
  );
}
