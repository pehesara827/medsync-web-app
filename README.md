# MedSync — Healthcare Appointment & Clinic Management System

MedSync is a full-stack healthcare appointment and clinic management platform designed to simplify patient bookings, improve clinic operations, and centralize healthcare workflows for patients, doctors, and administrators.

This repository is split into two independently deployable services:

- `backend/` — Express API and scheduled background jobs
- `frontend/` — React + Vite single-page application

🌐 Live Demo: [Add your deployed application URL]
---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [Security and Validation](#security-and-validation)
- [Future Improvements](#future-improvements)
- [Team Contributions](#team-contributions)
- [Disclaimer](#disclaimer)

---

## Project Overview

Managing healthcare appointments involves more than booking a time slot. Clinics also need to coordinate doctor schedules, patient queues, payments, appointment cancellations, waitlists, and follow-up tasks.

MedSync addresses these challenges through a role-based web application with three dedicated portals:

- Patient Portal: find doctors, book appointments, and manage visit-related activity.
- Doctor Portal: manage schedules, appointments, and consultation details.
- Admin Portal: manage clinic operations, doctor accounts, queues, schedules, and payments.

The platform combines role-based access control, database-driven workflows, QR-based check-ins, real-time notifications, and an AI-powered assistant for general clinic guidance.

---

## Key Features

### Patient Portal

- Patient registration, login, and profile management
- Search and filter doctors by specialty
- View doctor profiles, experience, ratings, and consultation fees
- Book appointments and manage existing bookings
- Support booking for self or a beneficiary
- View appointment status and history
- Generate and access QR appointment passes
- Join waitlists when schedules are full
- Receive waitlist offers and accept or decline them
- Save favorite doctors
- Submit reviews and ratings after consultations
- Receive notifications and appointment updates
- View payment and receipt details where applicable

### Doctor Portal

- Dashboard with appointment statistics and upcoming consultations
- Manage scheduled appointments
- Update doctor profiles and professional details
- Manage schedules and appointment capacity
- View associated patients and consultation history
- Track active consultation sessions
- Report session delays
- Receive operational notifications
- Manage account credentials and password resets

### Admin Portal

- Dashboard with appointment, payment, and scheduling analytics
- Manage doctor accounts and approval requests
- Add, update, approve, reject, or remove doctor records
- Search and view patient records
- Create and manage doctor schedules
- Monitor clinic queues and capacity
- Track appointment status and progress
- Scan appointment QR codes using a camera or uploaded image
- Verify payments before completing workflows
- Review uploaded bank transfer slips
- Manage payment statuses and reception payments
- Handle schedule delays and emergency cancellations

### Appointment and Queue Management

- Track appointment statuses such as pending, confirmed, completed, cancelled, and missed
- Manage doctor schedules and capacity
- Monitor appointment queues and active sessions
- Support QR-based patient check-in
- Handle missed appointments and relevant transitions
- Integrate appointment and payment workflows

### Smart Waitlist Management

- Let patients join waitlists for full schedules
- Manage waitlist offers and patient responses
- Automatically expire outdated offers
- Process eligible subsequent waitlist offers
- Apply capacity checks and FIFO ordering where supported

### Payment Management

- Support online payment, bank transfer, and pay-at-reception workflows
- Track payment status
- Allow administrators to review bank transfer slips
- Support approval and rejection workflows
- Record reception payments
- Integrate payment status checks with relevant appointment operations

Note: the online payment flow should be understood according to the current implementation. A simulated gateway is not the same as a live payment processor integration.

### Real-Time Notifications

- Appointment confirmation and cancellation alerts
- Waitlist offer and expiry notifications
- Missed appointment alerts
- Session delay notifications
- Payment-related notifications
- Review request notifications
- Mark notifications as read or delete them
- Receive supported real-time updates through Supabase Realtime

### AI-Powered Clinic Assistant

MedSync integrates the Google Gemini API to provide an AI-powered assistant for general clinic support.

Capabilities include:

- General clinic information
- Appointment booking guidance
- Doctor and specialty suggestions based on general symptoms
- Payment and arrival information
- Detection and escalation of potentially urgent situations
- Safety messaging for medical-related questions

The assistant is intended for general information and navigation, not as a replacement for qualified medical professionals or emergency services.

### Reviews and Ratings

- Allow patients to review completed consultations
- Track pending review requests
- Display doctor ratings based on patient feedback
- Trigger review request notifications through supported workflows

### Background Automation

The backend includes scheduled jobs for operational tasks such as:

- Expiring outdated waitlist offers
- Identifying and updating eligible missed appointments
- Generating review requests after completed consultations

These jobs help reduce the need for manual administrative work.

---

## Technology Stack

- Frontend: React 19, Vite, React Router
- Styling: Tailwind CSS
- Animation: Framer Motion
- Backend: Node.js, Express.js
- Database: PostgreSQL via Supabase
- Authentication: Supabase Auth and session validation
- Real-time updates: Supabase Realtime
- AI integration: Google Gemini API
- QR functionality: QR code generation and scanning libraries
- Document generation: PDF and receipt utilities
- API style: REST APIs
- Background jobs: scheduled backend tasks

---

## System Architecture

MedSync follows a client-server architecture.

```text
                 ┌─────────────────────┐
                 │     MedSync Users   │
                 │ Patients / Doctors  │
                 │       Admins        │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │   React + Vite UI   │
                 │  Role-Based Portals │
                 └──────────┬──────────┘
                            │
                       REST API
                            │
                            ▼
                 ┌─────────────────────┐
                 │   Node.js + Express │
                 │  API and Business   │
                 │        Logic        │
                 └──────┬───────┬──────┘
                        │       │
                        ▼       ▼
               ┌────────────┐ ┌──────────────┐
               │  Supabase  │ │ Gemini API   │
               │ PostgreSQL │ │ AI Assistant │
               │ Auth/DB    │ └──────────────┘
               └─────┬──────┘
                     │
                     ▼
              Supabase Realtime
              Notification Updates
```

Architecture summary:

1. React provides the interface for each role.
2. Express exposes API endpoints and handles application business logic.
3. Supabase provides database and authentication services.
4. Supabase Realtime delivers supported notification updates.
5. The Gemini API powers the AI assistant.
6. Scheduled backend jobs process selected automated workflows.

---

## Project Structure

The repository is split into two independently deployable services.

```text
medsync-web-app/
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── scripts/
│   ├── .env.example
│   ├── index.js
│   ├── package.json
│   └── ...
├── frontend/
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.js
│   └── ...
├── README.md
├── package.json
├── package-lock.json
├── .gitignore
├── .husky/
└── ...
```

This is a high-level project structure. Actual directories may vary slightly, but the application is organized around the separate backend and frontend services.

---

## Getting Started

Follow these steps to run MedSync locally.

### Prerequisites

Install the following:

- Node.js 22.12 or newer
- npm (included with Node.js)
- A Supabase project
- A Google Gemini API key if you want to use the AI assistant
- The required database schema and migration scripts for the project

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd medsync-web-app
```

### 2. Install Backend Dependencies

```bash
cd backend
npm ci
```

### 3. Configure Backend Environment Variables

Copy the example file and fill in the required values:

```bash
cp .env.example .env
```

Then configure the variables in `backend/.env`:

```env
PORT=5000

CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL=YOUR_SUPABASE_DATABASE_CONNECTION_STRING

GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.6-flash
GEMINI_FALLBACK_MODELS=gemini-3.5-flash,gemini-3.5-flash-lite
GEMINI_REQUEST_TIMEOUT_MS=25000
CHAT_HISTORY_TURNS=8
```

Do not commit real credentials to source control.

### 4. Start the Backend

```bash
cd backend
npm run dev
```

The backend listens on the `PORT` value defined in the environment. For local development, it typically runs on:

```text
http://localhost:5000
```

### 5. Install Frontend Dependencies

Open a second terminal and run:

```bash
cd frontend
npm ci
```

### 6. Configure Frontend Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

Then configure the values in `frontend/.env`:

```env
VITE_BACKEND_URL=http://localhost:5000
VITE_API_BASE_URL=http://localhost:5000/api

VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Never use a service-role or secret key inside a `VITE_` variable.

### 7. Start the Frontend

```bash
cd frontend
npm run dev
```

Open the local URL shown by Vite, usually:

```text
http://localhost:5173
```

Make sure the backend is running before using the app.

---

## Deployment

### Backend Deployment

Configure the hosting service with `backend/` as its application root.

Use Node.js 22.12 or newer.

1. Run `npm ci` in `backend/`
2. Set the start command to `npm start`
3. Add the backend environment variables from `backend/.env.example`
4. Set `CORS_ORIGINS` to the comma-separated frontend origins allowed to call the API
5. Verify the app responds at `https://<backend-host>/api/health`

Important notes:

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` belong on the backend only.
- `SUPABASE_DB_URL` is needed only for database setup scripts and migrations.
- The backend is a long-lived service because it also runs scheduled jobs.

### Frontend Deployment

Configure a separate static-site hosting service with `frontend/` as the app root.

Use Node.js 22.12 or newer for the build.

1. Set frontend environment variables from `frontend/.env.example`
2. Run `npm ci`
3. Run `npm run build`
4. Publish the generated `dist/` directory
5. Configure the static host to rewrite client routes to `/index.html`

This ensures React Router navigation works correctly on refresh.

---

## Environment Variables

### Backend

- `PORT`: port used by the Express backend
- `CORS_ORIGINS`: comma-separated allowed frontend origins
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: server-side Supabase admin key
- `SUPABASE_DB_URL`: database connection string for setup scripts only
- `GEMINI_API_KEY`: Google Gemini API key
- `GEMINI_MODEL`: preferred AI model
- `GEMINI_FALLBACK_MODELS`: fallback models in priority order
- `GEMINI_REQUEST_TIMEOUT_MS`: timeout per model attempt
- `CHAT_HISTORY_TURNS`: number of message turns passed to the model

### Frontend

- `VITE_BACKEND_URL`: backend origin such as `https://api.medsync.example.com`
- `VITE_API_BASE_URL`: backend origin with `/api` appended
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: public Supabase anon key

Security reminders:

- Never expose a Supabase service-role key in frontend code
- Never commit `.env` files or API secrets
- Keep privileged database operations on the backend
- Use Supabase Row Level Security policies
- Validate authorization and user roles on the backend, not only in the UI

---

## Security and Validation

MedSync includes security-related checks such as:

- Role-based route protection
- Authentication checks for protected API routes
- Supabase session validation
- Appointment status and capacity validation
- Payment workflow validation
- Duplicate registration checks
- Input validation for IDs and request payloads
- Notifications for supported appointment and payment events

The exact effectiveness of these controls depends on the deployed configuration, database policies, and implementation quality. Production deployments should be security-tested before handling real patient information.

---

## Future Improvements

Potential future improvements include:

- Verified live payment gateway integration
- Email and SMS reminders
- More detailed reporting and analytics
- Automated testing for critical appointment workflows
- Improved monitoring and error reporting
- Enhanced accessibility and mobile responsiveness
- Stronger automated checks for authorization and security

These are future enhancements and not claims about current functionality.

---

## Team Contributions

MedSync was developed collaboratively by a team of contributors.

**Team Members**

- **Uditha pehesara** 
- **Sanathmi Supunsara** 
- **Keshara Abawikrama** 
- **Chathuni Kavindi** 

The project reflects collaborative work in full-stack development, API integration, database design, workflow implementation, and practical software engineering.

---

## Disclaimer

This application is intended to support general healthcare appointment and clinic management workflows. It is not a substitute for professional medical advice, diagnosis, or emergency care. The AI assistant is designed for general guidance only and should not replace qualified healthcare professionals or emergency response systems.

---

## Screenshots

1. Public landing page
2. Patient dashboard and appointment booking flow
3. Doctor dashboard
4. Admin management panel
5. Payment and notification flows
