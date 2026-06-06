import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ChannelPageClient, ChannelPageSkeleton } from "./ChannelPageClient";
import { decodeRouteToken } from "@/lib/decodeRouteToken";
import { getChannelDetailsCached } from "@/lib/youtubeChannelResolveCache";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; page?: string; grid?: string }>;
};

function canonicalChannelPath(
  rawId: string,
  pageRaw?: string,
): string {
  const qs = new URLSearchParams();
  if (pageRaw && pageRaw !== "1") qs.set("page", pageRaw);
  const query = qs.toString();
  return `/channel/${rawId}${query ? `?${query}` : ""}`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = decodeRouteToken(rawId);
  const channel = await getChannelDetailsCached(id);

  return {
    title: channel?.title
      ? `${channel.title} — CleanTube`
      : "Channel — CleanTube",
    description: channel?.description?.slice(0, 160),
  };
}

async function ChannelPageContent({ params, searchParams }: PageProps) {
  const { id: rawId } = await params;
  const { sort: sortRaw, page: pageRaw, grid: gridRaw } = await searchParams;
  const id = decodeRouteToken(rawId);

  if (sortRaw === "popular" || gridRaw?.trim()) {
    redirect(canonicalChannelPath(rawId, pageRaw));
  }

  return <ChannelPageClient channelId={id} pageRaw={pageRaw} />;
}

/**
 * Shell renders immediately; grid loads client-side via SWR + `/api/channel` (For You pattern).
 */
export default function ChannelPage(props: PageProps) {
  return (
    <Suspense fallback={<ChannelPageSkeleton />}>
      <ChannelPageContent {...props} />
    </Suspense>
  );
}
