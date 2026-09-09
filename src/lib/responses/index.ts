/**
 * Picks the storage backend from the environment.
 *
 * Supabase is the real one. The local-file driver exists only so the app can
 * run on a laptop without credentials, and it must be asked for explicitly —
 * an unconfigured deployment fails loudly rather than quietly writing
 * responses to a disk that a serverless host is about to throw away. Silent
 * data loss is the one failure mode a survey cannot recover from.
 */

import { createFileStore } from "./file-store";
import { createSupabaseStore } from "./supabase-store";
import type { ResponseStore } from "./types";

export type StorageStatus =
  | { ok: true; store: ResponseStore }
  | { ok: false; reason: string; missing: string[] };

let cached: ResponseStore | null = null;

/** Non-throwing probe, so the admin UI can explain what is missing. */
export function getStorageStatus(): StorageStatus {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    cached ??= createSupabaseStore(url, key);
    return { ok: true, store: cached };
  }

  if (process.env.ALLOW_FILE_STORE === "1") {
    cached ??= createFileStore();
    return { ok: true, store: cached };
  }

  const missing = [
    ...(url ? [] : ["SUPABASE_URL"]),
    ...(key ? [] : ["SUPABASE_SERVICE_ROLE_KEY"]),
  ];
  return {
    ok: false,
    reason: "Supabase is not configured, so there is nowhere to store responses.",
    missing,
  };
}

/** Throws when storage is unconfigured — callers that must have a store. */
export function getResponseStore(): ResponseStore {
  const status = getStorageStatus();
  if (!status.ok) throw new Error(`${status.reason} Missing: ${status.missing.join(", ")}.`);
  return status.store;
}

/** Test seam: forces the next call to re-read the environment. */
export function resetStoreCache(): void {
  cached = null;
}

export type { ListOptions, ListResult, NewResponse, ResponseStore, SurveyResponse } from "./types";
