"use client";

import { useEffect, useRef } from "react";

import { useSavedChannels } from "@/context/SavedChannelsContext";
import { fetchChannelResolveBatch } from "@/lib/channelResolveClient";
import { extractHighConfidenceChannelLookup } from "@/lib/youtubeUrl";
import type { ChannelDetails } from "@/lib/youtubeTypes";
import { effectiveSavedChannelKind } from "@/types/savedChannel";
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
      if (effectiveSavedChannelKind(channel) !== "saved_channel") {
        return false;
      }
      if (channel.channelId || attemptedIdsRef.current.has(channel.id)) {
        return false;
      }
      return Boolean(candidateLookup(channel));
    });

    if (candidates.length === 0) return;

    let cancelled = false;

    const withLookup = candidates
      .map((channel) => ({
        channel,
        lookup: candidateLookup(channel),
      }))
      .filter(
        (x): x is { channel: SavedChannel; lookup: string } =>
          Boolean(x.lookup),
      );

    for (const { channel } of withLookup) {
      attemptedIdsRef.current.add(channel.id);
    }

    const lookups = [...new Set(withLookup.map((x) => x.lookup))];

    void (async () => {
      try {
        const rows = await fetchChannelResolveBatch(lookups);
        if (cancelled) return;
        const byLookup = new Map<string, ChannelDetails>(
          rows
            .filter((r) => r.channel)
            .map((r) => [r.lookup, r.channel!]),
        );
        for (const { channel, lookup } of withLookup) {
          if (cancelled) return;
          const payload = byLookup.get(lookup);
          if (!payload) continue;
          updateChannel(channel.id, {
            name: payload.title,
            channelId: payload.id,
            channelUrl: payload.channelUrl,
          });
        }
      } catch {
        /* Leave saved searches untouched if resolution fails. */
      }
    })();

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
