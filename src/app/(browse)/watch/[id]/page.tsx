import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { WatchPageClient, WatchPageSkeleton } from "./WatchPageClient";
import {
  parseWatchCommentsVisibleCookie,
  WATCH_COMMENTS_VISIBLE_COOKIE,
} from "@/lib/watchCommentsVisibilityPersistence";
import { getWatchVideoDetails } from "@/lib/watchVideo";
import { isValidYoutubeVideoId } from "@/lib/youtubeUrl";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    t?: string;
    start?: string;
  }>;
};

export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isValidYoutubeVideoId(id)) {
    return { title: "Video — CleanTube" };
  }
  const video = await getWatchVideoDetails(id);
  return {
    title: video?.title ? `${video.title} — CleanTube` : "Watch — CleanTube",
    description: video?.description?.slice(0, 160),
  };
}

/**
 * Shell renders immediately; video metadata loads client-side via SWR + `/api/videos/[id]`.
 */
export default async function WatchPage({ params }: PageProps) {
  const { id } = await params;

  if (!isValidYoutubeVideoId(id)) {
    notFound();
  }

  const cookieStore = await cookies();
  const commentsEnabled = parseWatchCommentsVisibleCookie(
    cookieStore.get(WATCH_COMMENTS_VISIBLE_COOKIE)?.value,
  );

  return (
    <Suspense fallback={<WatchPageSkeleton videoId={id} />}>
      <WatchPageClient videoId={id} commentsEnabled={commentsEnabled} />
    </Suspense>
  );
}
