import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';

const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error('Missing SUPABASE_DB_URL in .env');
  process.exit(1);
}

const sql = `
-- 1. Notifications table — in-app notification records
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('WAITLIST_OFFER', 'WAITLIST_JOIN', 'APPOINTMENT_REMINDER', 'SYSTEM')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    schedule_id UUID DEFAULT NULL,
    appointment_id UUID DEFAULT NULL,
    waitlist_id UUID DEFAULT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(recipient_user_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_schedule ON public.notifications(schedule_id);
CREATE INDEX IF NOT EXISTS idx_notifications_waitlist ON public.notifications(waitlist_id);

-- 2. Notification log table — records SMS/Email/Push delivery attempts (placeholder for future providers)
CREATE TABLE IF NOT EXISTS public.notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID DEFAULT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('IN_APP', 'EMAIL', 'SMS', 'PUSH')),
    recipient VARCHAR(255),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'SKIPPED')),
    provider_response JSONB,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT notification_log_notification_fkey FOREIGN KEY (notification_id)
        REFERENCES public.notifications(id) ON DELETE SET NULL
);

-- Indexes for notification log
CREATE INDEX IF NOT EXISTS idx_notification_log_notification ON public.notification_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_channel_status ON public.notification_log(channel, status);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON public.notification_log(created_at DESC);
`;

const verifySql = `
SELECT 
    table_name,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN ('notifications', 'notification_log')
ORDER BY table_name, ordinal_position;
`;

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to database successfully.');

    console.log('Executing notifications table creation SQL...');
    await client.query(sql);
    console.log('Notification tables created successfully!');

    console.log('\n--- Verifying notification tables ---');
    const verifyResult = await client.query(verifySql);

    if (verifyResult.rows.length === 0) {
      console.log('❌ Notification tables not found!');
    } else {
      for (const row of verifyResult.rows) {
        console.log(
          `✅ ${row.table_name}.${row.column_name}: type=${row.data_type}, default=${row.column_default || 'NULL'}, nullable=${row.is_nullable}`
        );
      }
    }

    // Verify indexes
    console.log('\n--- Verifying indexes ---');
    const indexResult = await client.query(`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public' 
        AND tablename IN ('notifications', 'notification_log')
      ORDER BY tablename, indexname;
    `);

    for (const row of indexResult.rows) {
      console.log(`✅ Index: ${row.tablename}.${row.indexname}`);
    }

    console.log('\nNotification migration verification complete.');
  } catch (error) {
    console.error('Failed to execute migration:');
    console.error(`Error: ${error.message}`);
    if (error.detail) console.error(`Detail: ${error.detail}`);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

main();
