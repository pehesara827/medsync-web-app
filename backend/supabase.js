import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env relative to this file so starting node from the repo
// root (node backend/index.js) still picks up SUPABASE_URL / keys.
// dotenv never overrides real environment variables, so hosted envs are safe.
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Check backend/.env (or environment) and restart the backend from the repo root with `node backend/index.js` or from backend/ with `npm run dev`.'
  );
}

// Custom fetch with timeout + retries to handle transient network hiccups
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

const isRetryableFetchError = (err) => {
  if (!err) return false;
  if (err.name === 'AbortError' || err.name === 'TimeoutError') return true;
  const code = err.cause?.code;
  if (typeof code === 'string' && code.startsWith('UND_ERR')) return true;
  // Node 18+ wraps DNS/TLS/reset failures as `TypeError: fetch failed`
  // with no UND_ERR code — these are transient and must be retried.
  if (err instanceof TypeError && /fetch failed|network/i.test(err.message || '')) return true;
  if (/fetch failed|network|socket|hang up|timed out|timeout|econn|enotfound|eai_again/i.test(err.message || '')) return true;
  if (/fetch failed|network|socket|hang up|timed out/i.test(String(err.cause?.message || ''))) return true;
  return false;
};

async function resilientFetch(url, options = {}) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return response;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;

      // Only retry on network/timeout/abort errors, not HTTP status errors
      if (isRetryableFetchError(err)) {
        const causeInfo = err.cause?.code || err.cause?.message || '';
        console.warn(
          `[supabase] Network request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${err.message}${causeInfo ? ` (cause: ${causeInfo})` : ''}. Retrying...`
        );
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
      }
      throw err;
    }
  }

  throw lastError;
}

if (!supabaseUrl || !supabaseKey) {
  // Fail fast with a clear message instead of building a client that
  // throws `supabaseUrl is required` / `fetch failed` on every call.
  throw new Error(
    'Supabase is not configured: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing. Add them to backend/.env and restart the server.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: resilientFetch },
});