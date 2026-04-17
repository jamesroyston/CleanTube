"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import { WatchProgressBar } from "@/components/WatchProgressBar";
import { YouTubeThumbnailImage } from "@/components/YouTubeThumbnailImage";
import { useCloudLibrary } from "@/context/CloudLibraryContext";
import { youtubeThumbnailFallbackUrls } from "@/lib/serializeVideo";

export function HistoryPageClient() {
  const { watchProgress, getResumeSeconds } = useCloudLibrary();

  return (
    <Box component="main" sx={{ pb: 6, minHeight: "100vh" }}>
      <Container maxWidth="lg" sx={{ pt: 2 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 700 }}>
          History
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Resume in-progress videos or revisit completed ones.
        </Typography>
        {watchProgress.length === 0 ? (
          <Typography color="text.secondary">
            Your watch history will appear here once progress tracking starts.
          </Typography>
        ) : (
          <Box sx={{ display: "grid", gap: 1.5 }}>
            {watchProgress.map((entry) => {
              const resume = getResumeSeconds(entry.videoId);
              const href =
                resume && resume > 0
                  ? `/watch/${entry.videoId}?t=${encodeURIComponent(String(resume))}`
                  : `/watch/${entry.videoId}`;

              return (
                <Card key={entry.videoId} variant="outlined">
                  <CardActionArea
                    component={Link}
                    href={href}
                    sx={{ display: "flex", alignItems: "stretch", justifyContent: "flex-start" }}
                  >
                    <Box sx={{ width: 220, minWidth: 220, bgcolor: "action.hover" }}>
                      <Box sx={{ position: "relative", width: "100%", aspectRatio: "16 / 9" }}>
                        <YouTubeThumbnailImage
                          src={entry.thumbnailUrl}
                          fallbacks={youtubeThumbnailFallbackUrls(
                            entry.videoId,
                            undefined,
                            entry.thumbnailUrl,
                          )}
                          alt=""
                          fill
                          sizes="220px"
                          style={{ objectFit: "cover" }}
                        />
                      </Box>
                    </Box>
                    <CardContent sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {entry.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {entry.channelName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Last watched {new Date(entry.lastWatchedAt).toLocaleString()}
                      </Typography>
                      <WatchProgressBar
                        positionSeconds={entry.lastPositionSeconds}
                        durationSeconds={entry.durationSeconds}
                      />
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>
        )}
      </Container>
    </Box>
  );
}
