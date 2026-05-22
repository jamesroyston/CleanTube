"use client";

import { RECENT_SEARCHES_MAX_ITEMS } from "@/lib/cloudRecentSearches/types";

export const RECENT_SEARCHES_STORAGE_KEY = "cleantube-recent-searches";

function readRaw(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function writeRaw(queries: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(queries));
  } catch {
    /* ignore */
  }
}

export function readLocalRecentSearches(): string[] {
  return readRaw();
}

export function writeLocalRecentSearches(queries: string[]) {
  writeRaw(queries.slice(0, RECENT_SEARCHES_MAX_ITEMS));
}

export function addLocalRecentSearch(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed || typeof window === "undefined") return readRaw();
  const prev = readRaw().filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...prev].slice(0, RECENT_SEARCHES_MAX_ITEMS);
  writeRaw(next);
  return next;
}

export function clearLocalRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function removeLocalRecentSearch(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed || typeof window === "undefined") return readRaw();
  const next = readRaw().filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
  writeRaw(next);
  return next;
}
