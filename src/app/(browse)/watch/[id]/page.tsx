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

async function WatchPageContent({ params }: PageProps) {
  const { id } = await params;

  if (!isValidYoutubeVideoId(id)) {
    notFound();
  }

  const cookieStore = await cookies();
  const commentsEnabled = parseWatchCommentsVisibleCookie(
    cookieStore.get(WATCH_COMMENTS_VISIBLE_COOKIE)?.value,
  );
  const initialVideo = await getWatchVideoDetails(id);

  return (
    <WatchPageClient
      videoId={id}
      commentsEnabled={commentsEnabled}
      initialVideo={initialVideo}
    />
  );
}

/**
 * Video metadata is fetched on the server (deduped with `generateMetadata`) so
 * refresh can mount the player immediately instead of waiting on a client fetch.
 */
export default function WatchPage(props: PageProps) {
  return (
    <Suspense fallback={<WatchPageSkeleton videoId="" />}>
      <WatchPageContent {...props} />
    </Suspense>
  );
}
