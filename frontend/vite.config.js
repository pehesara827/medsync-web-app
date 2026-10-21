import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  if (mode === 'production') {
    const required = [
      'VITE_API_BASE_URL',
      'VITE_BACKEND_URL',
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
    ];
    const missing = required.filter((name) => !env[name]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required production environment variables: ${missing.join(', ')}`
      );
    }
  }

  return {
    plugins: [react(), tailwindcss()],
  };
});
