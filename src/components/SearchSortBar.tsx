"use client";

import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useRouter } from "next/navigation";

import { setLastResultSort } from "@/lib/lastSearchSession";
import type { ResultSortMode, SearchSortMode } from "@/lib/uploadedAtSort";
import {
  normalizeResultSortParam,
  normalizeSearchSortParam,
} from "@/lib/uploadedAtSort";

type SearchSortBarProps = {
  query: string;
  searchSort: SearchSortMode;
  resultSort: ResultSortMode;
};

export function SearchSortBar({
  query,
  searchSort,
  resultSort,
}: SearchSortBarProps) {
  const router = useRouter();
  const selectedSearchSort = normalizeSearchSortParam(searchSort);
  const selectedResultSort = normalizeResultSortParam(resultSort);

  function commit(next: ResultSortMode) {
    setLastResultSort(next);
    const qs = new URLSearchParams();
    qs.set("q", query);
    if (selectedSearchSort !== "relevance") {
      qs.set("searchSort", selectedSearchSort);
    }
    if (next !== "search") qs.set("resultSort", next);
    router.push(`/?${qs.toString()}`);
  }

  return (
    <Box sx={{ minWidth: 200 }}>
      <FormControl size="small" fullWidth>
        <InputLabel id="cleantube-results-sort-label">Results sort</InputLabel>
        <Select<ResultSortMode>
          labelId="cleantube-results-sort-label"
          label="Results sort"
          value={selectedResultSort}
          onChange={(e) =>
            commit(e.target.value as ResultSortMode)
          }
        >
          <MenuItem value="search">Search order</MenuItem>
          <MenuItem value="newest">Upload date (newest)</MenuItem>
          <MenuItem value="oldest">Upload date (oldest)</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}
