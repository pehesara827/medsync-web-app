import { supabase } from '../supabase.js';

/**
 * Create a user inside Supabase's built-in `auth.users` table.
 * Requires the SERVICE ROLE key (already used in supabase.js).
 *
 * @param {Object} params
 * @param {string} params.email - Login email (stored in auth.users.email)
 * @param {string} params.password - Plain password; Supabase hashes it internally
 * @param {Object} [params.userMetadata] - Extra data stored in auth.users.raw_user_meta_data
 * @param {boolean} [params.emailConfirm=true] - Mark the email as already confirmed
 * @returns {Object} The created auth user (contains `id` UUID)
 */
export const createAuthUser = async ({
  email,
  password,
  userMetadata = {},
  emailConfirm = true,
}) => {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: emailConfirm,
    user_metadata: userMetadata,
  });

  if (error) throw error;
  return data.user;
};

/**
 * Permanently delete a user from `auth.users`. Used for rollbacks.
 */
export const deleteAuthUser = async (id) => {
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) throw error;
  return true;
};

/**
 * Update a user's metadata / credentials inside `auth.users`.
 * Used when a doctor changes their username (kept in sync with public.users).
 */
export const updateAuthUser = async (id, { username } = {}) => {
  const updates = {};
  if (username !== undefined) {
    updates.user_metadata = { username };
  }
  if (Object.keys(updates).length === 0) return null;
  const { data, error } = await supabase.auth.admin.updateUserById(id, updates);
  if (error) throw error;
  return data.user;
};

/**
 * Fetch a single auth user by its UUID.
 */
export const findAuthUserById = async (id) => {
  const { data, error } = await supabase.auth.admin.getUserById(id);
  if (error) throw error;
  return data.user;
};
