// backend/config/supabaseClient.js
//
// Canonical Supabase admin client for the backend.
//
// The client is initialized with the SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY environment variables. To keep the resilient-fetch
// configuration (timeouts + retries) single-sourced, this module re-exports the
// already-initialized client from ../supabase.js. New controllers import the
// client from here so the connection is defined in exactly one place.
//
// If you need a standalone initialization instead, replace the re-export below
// with:
//
//   import { createClient } from '@supabase/supabase-js';
//   import dotenv from 'dotenv';
//   dotenv.config();
//   export const supabase = createClient(
//     process.env.SUPABASE_URL,
//     process.env.SUPABASE_SERVICE_ROLE_KEY
//   );

export { supabase } from '../supabase.js';
