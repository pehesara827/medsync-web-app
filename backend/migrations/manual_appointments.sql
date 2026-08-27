-- ─────────────────────────────────────────────────────────────────────────────
-- manual_appointments
--
-- A standalone table for walk-in / manually added appointments that admins
-- record from the Admin dashboard. This deliberately lives OUTSIDE the main
-- `appointments` flow (no FK to `patient_profiles`, no payment/QR records) so
-- manual additions never interfere with the self-service booking pipeline.
--
-- Patient details are stored directly on the row. Only the doctor is linked
-- to the real doctor_profiles table (and snapshot-copied into doctor_name at
-- booking time so the label survives name edits / deletion).
-- ─────────────────────────────────────────────────────────────────────────────

create table public.manual_appointments (
  id uuid not null default gen_random_uuid (),

  -- Patient details (typed by admin; deliberately NOT a patient_profiles FK)
  patient_first_name text not null,
  patient_last_name text not null,
  patient_phone text null,
  patient_gender text null,
  patient_date_of_birth date null,

  -- Doctor + scheduling
  doctor_id uuid not null,
  doctor_name text null,
  appointment_date date not null,
  start_time time null,
  remarks text null,

  status character varying(20) not null default 'PENDING'::character varying,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint manual_appointments_pkey primary key (id),
  constraint manual_appointments_doctor_id_fkey
    foreign key (doctor_id) references doctor_profiles (id) on delete set null,
  constraint manual_appointments_status_check check (
    (status)::text = any (
      (array[
        'PENDING'::character varying,
        'CONFIRMED'::character varying,
        'COMPLETED'::character varying,
        'CANCELLED'::character varying
      ])::text[]
    )
  )
) tablespace pg_default;

create index if not exists idx_manual_appointments_doctor_date
  on public.manual_appointments using btree (doctor_id, appointment_date)
  tablespace pg_default;

create trigger trg_manual_appointments_updated_at
  before update on manual_appointments
  for each row
  execute function set_updated_at ();