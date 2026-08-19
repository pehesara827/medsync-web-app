import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Custom fetch with timeout + retries to handle transient network hiccups
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

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
      if (
        err.name === 'AbortError' ||
        err.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        (err.cause?.code && err.cause.code.startsWith('UND_ERR'))
      ) {
        console.warn(
          `[supabase] Network request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${err.message}. Retrying...`
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

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: resilientFetch },
});