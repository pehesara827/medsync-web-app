// Centralised upload limits — single source of truth for all user image/file uploads.
// Requirement: users may upload images up to 5 MB.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGE_LABEL = '5 MB';

// Profile pictures (patient + doctor + registration) share the same rules.
export const AVATAR_BUCKET = 'profile-pictures';
export const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
export const ALLOWED_AVATAR_LABEL = 'PNG, JPG or WEBP';

// Bank receipt / payment slip uploads.
export const MAX_SLIP_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_SLIP_LABEL = '5 MB';
export const ALLOWED_SLIP_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const ALLOWED_SLIP_LABEL = 'JPG, PNG, WEBP, or PDF';
