const OEMBED =
  "https://www.youtube.com/oembed?format=json&url=";

export type YouTubeOEmbedResponse = {
  title: string;
  author_name: string;
  author_url: string;
  thumbnail_url: string;
  thumbnail_width: number;
  thumbnail_height: number;
  html: string;
  version: string;
  type: string;
  provider_name: string;
  provider_url: string;
  height: number;
  width: number;
};

export async function fetchYouTubeOEmbed(
  videoId: string,
): Promise<YouTubeOEmbedResponse | null> {
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  try {
    const res = await fetch(`${OEMBED}${encodeURIComponent(watchUrl)}`, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as YouTubeOEmbedResponse;
  } catch {
    return null;
  }
}

export function parseChannelIdFromYoutubeUrl(url: string): string | undefined {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "channel" && parts[1]?.startsWith("UC")) {
      return parts[1];
    }
    return undefined;
  } catch {
    return undefined;
  }
}
