# MedSync

MedSync is split into two independently deployable services:

- `backend/` is the Express API.
- `frontend/` is the Vite/React single-page application.

## Deploy the backend

Configure the hosting service with `backend/` as its root directory. Use Node.js
22.12 or newer.

1. Install dependencies with `npm ci`.
2. Set the start command to `npm start`.
3. Add the backend environment variables from `backend/.env.example` in the
   hosting provider's environment settings. Set `CORS_ORIGINS` to the
   comma-separated frontend origins that should be allowed, for example
   `https://medsync.example.com`. Use only the origin (scheme and host), not a
   path.
4. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the backend only.
   `SUPABASE_DB_URL` is needed only when running the provided database setup
   scripts; it is not needed for normal API startup.
5. Deploy and verify `https://<backend-host>/api/health` returns a JSON status.

The service listens on the hosting provider's `PORT` value. Keep the backend
running as a long-lived Node service because it also runs scheduled jobs.

## Deploy the frontend

Configure a separate static-site hosting service with `frontend/` as its root
directory. Use Node.js 22.12 or newer for the build.

1. Set the frontend environment variables from `frontend/.env.example` in the
   hosting provider's build settings:
   - `VITE_BACKEND_URL` is the backend origin, such as
     `https://api.medsync.example.com`.
   - `VITE_API_BASE_URL` is that origin with `/api` appended, such as
     `https://api.medsync.example.com/api`.
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are the Supabase project
     URL and public publishable/anon key.
2. Install dependencies with `npm ci` and build with `npm run build`.
3. Publish the `dist/` directory.
4. Configure the static host to rewrite application routes to `/index.html` so
   React Router routes work on refresh.

The Vite production build fails with a clear error if any required frontend
environment variable is missing. These values are embedded in the browser
bundle; never use a Supabase service-role or secret key as a `VITE_` variable.

## Local development

Run each service in its own terminal:

```sh
cd backend
npm ci
npm run dev
```

```sh
cd frontend
npm ci
npm run dev
```

Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to
`frontend/.env`, then fill in local values. Keep real credentials out of source
control.
