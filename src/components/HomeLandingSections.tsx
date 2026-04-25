"use client";

import { HomeHeroEmpty } from "@/components/HomeHeroEmpty";
import { InProgressStrip } from "@/components/InProgressStrip";
import { useCloudLibrary } from "@/context/CloudLibraryContext";

export function HomeLandingSections() {
  const { inProgressEntries } = useCloudLibrary();

  if (inProgressEntries.length > 0) {
    return <InProgressStrip />;
  }

  return <HomeHeroEmpty />;
}
