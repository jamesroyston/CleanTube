"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import { WatchProgressBar } from "@/components/WatchProgressBar";
import { YouTubeThumbnailImage } from "@/components/YouTubeThumbnailImage";
import { useCloudLibrary } from "@/context/CloudLibraryContext";
import { youtubeThumbnailFallbackUrls } from "@/lib/serializeVideo";

export function InProgressStrip() {
  const { inProgressEntries, getResumeSeconds } = useCloudLibrary();

  if (inProgressEntries.length === 0) return null;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>
        Currently in progress
      </Typography>
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
          },
        }}
      >
        {inProgressEntries.slice(0, 6).map((entry) => {
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
                <Box sx={{ position: "relative", width: 160, minWidth: 160, bgcolor: "action.hover" }}>
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
                      sizes="160px"
                      style={{ objectFit: "cover" }}
                    />
                  </Box>
                </Box>
                <CardContent sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                    {entry.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {entry.channelName}
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
    </Box>
  );
}
