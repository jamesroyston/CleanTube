"use client";

import Pagination from "@mui/material/Pagination";
import PaginationItem from "@mui/material/PaginationItem";
import Link from "next/link";

type ChannelPaginationProps = {
  channelId: string;
  sort: "latest" | "popular";
  currentPage: number;
  hasNextPage: boolean;
  totalPages?: number;
};

function channelHref(
  id: string,
  options?: { sort?: "latest" | "popular"; page?: number },
): string {
  const qs = new URLSearchParams();
  if (options?.sort && options.sort !== "latest") {
    qs.set("sort", options.sort);
  }
  if (options?.page && options.page > 1) {
    qs.set("page", String(options.page));
  }
  const query = qs.toString();
  return `/channel/${encodeURIComponent(id)}${query ? `?${query}` : ""}`;
}

export function ChannelPagination({
  channelId,
  sort,
  currentPage,
  hasNextPage,
  totalPages,
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
          component={Link}
          href={channelHref(channelId, { sort, page: item.page ?? 1 })}
          {...item}
        />
      )}
      shape="rounded"
      siblingCount={1}
    />
  );
}
