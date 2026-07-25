import { FunctionsHttpError } from '@supabase/supabase-js';

/**
 * The Supabase JS client throws a generic "Edge Function returned a non-2xx
 * status code" and hides the actual reason inside `error.context` (the raw
 * Response). This reads that body so the UI can show what really failed
 * (e.g. "401 Unauthorized", "409 No packs available").
 */
export const readEdgeError = async (error: unknown, fallback = 'Request failed'): Promise<string> => {
  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response | undefined;
    const status = res?.status;
    try {
      const body = await res?.clone().json();
      const reason = body?.error || body?.message || JSON.stringify(body);
      return status ? `${reason} (HTTP ${status})` : String(reason);
    } catch {
      try {
        const text = await res?.clone().text();
        if (text) return status ? `${text} (HTTP ${status})` : text;
      } catch {
        /* ignore */
      }
      return status ? `${fallback} (HTTP ${status})` : fallback;
    }
  }
  if (error instanceof Error) return error.message;
  return fallback;
};
