import { createClient } from '@supabase/supabase-js';

let cached = null;
let cachedUrl = null;
let cachedKey = null;

// Lazily creates (and memoizes) a Supabase client for the given project config.
// Returns null when either value is missing, so callers can render a clean
// "not configured yet" state instead of constructing a client with empty strings.
export function getSupabaseClient(url, anonKey) {
  if (!url || !anonKey) return null;
  if (cached && cachedUrl === url && cachedKey === anonKey) return cached;
  cached = createClient(url, anonKey);
  cachedUrl = url;
  cachedKey = anonKey;
  return cached;
}
