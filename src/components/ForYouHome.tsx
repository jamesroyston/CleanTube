import { ForYouFeedView } from "@/components/ForYouFeedView";
import { forYouSignedIn } from "@/lib/forYou/loadLibrarySignals";

/**
 * Signed-in feed loads client-side via /api/for-you to avoid blocking home SSR
 * with heavy InnerTube work on every visit (Vercel Hobby CPU budget).
 */
export async function ForYouHome() {
  const signedIn = await forYouSignedIn();

  return <ForYouFeedView signedIn={signedIn} />;
}
