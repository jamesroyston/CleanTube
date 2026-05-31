import { ForYouFeedView } from "@/components/ForYouFeedView";
import { buildForYouFeed } from "@/lib/forYou/buildFeed";
import { loadForYouLibrarySignals } from "@/lib/forYou/loadLibrarySignals";

export async function ForYouHome() {
  const signals = await loadForYouLibrarySignals();

  if (!signals) {
    return (
      <ForYouFeedView
        initialSections={[]}
        initialEmpty
        signedIn={false}
      />
    );
  }

  try {
    const feed = await buildForYouFeed(signals);
    return (
      <ForYouFeedView
        initialSections={feed.sections}
        initialEmpty={feed.empty}
        signedIn
      />
    );
  } catch (err) {
    console.error("[ForYouHome]", err);
    const message =
      err instanceof Error ? err.message : "Failed to load your feed.";
    return (
      <ForYouFeedView
        initialSections={[]}
        initialEmpty
        signedIn
        initialError={message}
      />
    );
  }
}
