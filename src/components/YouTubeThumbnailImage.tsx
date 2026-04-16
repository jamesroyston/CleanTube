"use client";

import Image, { type ImageProps } from "next/image";
import { useCallback, useEffect, useState } from "react";

type YouTubeThumbnailImageProps = Omit<ImageProps, "src" | "onError"> & {
  src: string;
  /** Tried in order after `src` when the image fails to load (HTTP error / broken). */
  fallbacks?: string[];
};

export function YouTubeThumbnailImage({
  src,
  fallbacks = [],
  alt,
  ...rest
}: YouTubeThumbnailImageProps) {
  const chain = [src, ...fallbacks];
  const [index, setIndex] = useState(0);
  const current = chain[Math.min(index, chain.length - 1)] ?? src;

  useEffect(() => {
    setIndex(0);
  }, [src]);

  const onError = useCallback(() => {
    setIndex((i) => (i + 1 < chain.length ? i + 1 : i));
  }, [chain.length]);

  return (
    <Image
      key={current}
      {...rest}
      src={current}
      alt={alt ?? ""}
      onError={onError}
    />
  );
}
