"use client";

import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useRouter } from "next/navigation";

import { setLastSearchSort } from "@/lib/lastSearchSession";
import type { UploadDateSortMode } from "@/lib/uploadedAtSort";
import { normalizeSortParam } from "@/lib/uploadedAtSort";

type SearchSortBarProps = {
  query: string;
  sort: UploadDateSortMode;
};

export function SearchSortBar({ query, sort }: SearchSortBarProps) {
  const router = useRouter();
  const selectedSort = normalizeSortParam(sort);

  function commit(next: UploadDateSortMode) {
    setLastSearchSort(next);
    const qs = new URLSearchParams();
    qs.set("q", query);
    if (next !== "relevance") qs.set("sort", next);
    router.push(`/?${qs.toString()}`);
  }

  return (
    <Box sx={{ minWidth: 200 }}>
      <FormControl size="small" fullWidth>
        <InputLabel id="cleantube-sort-label">Sort by</InputLabel>
        <Select<UploadDateSortMode>
          labelId="cleantube-sort-label"
          label="Sort by"
          value={selectedSort}
          onChange={(e) =>
            commit(e.target.value as UploadDateSortMode)
          }
        >
          <MenuItem value="relevance">Relevance</MenuItem>
          <MenuItem value="newest">Upload date (newest)</MenuItem>
          <MenuItem value="oldest">Upload date (oldest)</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}
