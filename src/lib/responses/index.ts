/**
 * Picks the storage backend from the environment.
 *
 * Supabase the moment its two variables are present; the local file otherwise.
 * Nothing else in the app knows which one it got, so connecting Supabase is a
 * deploy-time change with no code edit: set the variables and redeploy.
 */

import { createFileStore } from "./file-store";
import { createSupabaseStore } from "./supabase-store";
import type { ResponseStore } from "./types";

let cached: ResponseStore | null = null;

export function getResponseStore(): ResponseStore {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  cached = url && key ? createSupabaseStore(url, key) : createFileStore();
  return cached;
}

export type { ListOptions, ListResult, NewResponse, ResponseStore, SurveyResponse } from "./types";
