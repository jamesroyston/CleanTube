"use client";

import Pagination from "@mui/material/Pagination";
import PaginationItem from "@mui/material/PaginationItem";
import Link from "next/link";

type ChannelPaginationProps = {
  channelId: string;
  currentPage: number;
  hasNextPage: boolean;
  totalPages?: number;
  disabled?: boolean;
};

function channelHref(id: string, page?: number): string {
  if (!page || page <= 1) {
    return `/channel/${encodeURIComponent(id)}`;
  }
  return `/channel/${encodeURIComponent(id)}?page=${page}`;
}

export function ChannelPagination({
  channelId,
  currentPage,
  hasNextPage,
  totalPages,
  disabled = false,
}: ChannelPaginationProps) {
  const count = totalPages ?? (hasNextPage ? currentPage + 1 : currentPage);
  if (count <= 1) return null;

  return (
    <Pagination
      boundaryCount={1}
      color="primary"
      count={count}
      page={currentPage}
      renderItem={(item) => (
        <PaginationItem
          component={disabled ? "div" : Link}
          href={disabled ? undefined : channelHref(channelId, item.page ?? 1)}
          tabIndex={disabled ? -1 : undefined}
          aria-disabled={disabled || undefined}
          sx={disabled ? { pointerEvents: "none", opacity: 0.5 } : undefined}
          {...item}
        />
      )}
      shape="rounded"
      siblingCount={1}
    />
  );
}
