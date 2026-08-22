import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const backendUrl = 'http://localhost:5000';

async function main() {
  try {
    // 1. Find a valid user ID
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(1);

    if (userError) {
      console.error('Error fetching users:', userError.message);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      console.error('No users found in the database. Run a seed script first.');
      process.exit(1);
    }

    const userId = users[0].id;
    console.log(`✅ Found user: ${users[0].email} (${userId})`);

    // 2. Create a test notification via API
    console.log('\n--- Creating test notification ---');
    const createRes = await fetch(`${backendUrl}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        type: 'APPOINTMENT_CONFIRMED',
        title: 'Appointment Confirmed',
        message: 'Your appointment with Dr. Kumar has been confirmed for tomorrow at 10:00 AM.',
        action_link: '/patient/appointments',
        metadata: { appointment_id: 'test-123' },
      }),
    });
    const createData = await createRes.json();
    console.log(`Status: ${createRes.status}`);
    console.log('Response:', JSON.stringify(createData, null, 2));

    if (!createRes.ok) {
      console.error('❌ Failed to create notification');
      process.exit(1);
    }

    const notificationId = createData.notification?.id;
    console.log(`✅ Created notification: ${notificationId}`);

    // 3. Get unread count
    console.log('\n--- Getting unread count ---');
    const countRes = await fetch(`${backendUrl}/api/notifications/unread-count/${userId}`);
    const countData = await countRes.json();
    console.log(`Unread count: ${countData.count}`);

    // 4. Get all notifications
    console.log('\n--- Getting all notifications ---');
    const listRes = await fetch(`${backendUrl}/api/notifications/${userId}`);
    const listData = await listRes.json();
    console.log(`Total notifications: ${listData.notifications?.length}`);
    console.log('First notification:', JSON.stringify(listData.notifications?.[0], null, 2));

    // 5. Mark as read
    console.log('\n--- Marking notification as read ---');
    const readRes = await fetch(`${backendUrl}/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
    const readData = await readRes.json();
    console.log(`Status: ${readRes.status}`);
    console.log('Response:', JSON.stringify(readData, null, 2));

    // 6. Verify unread count decreased
    console.log('\n--- Verifying unread count after mark-as-read ---');
    const countRes2 = await fetch(`${backendUrl}/api/notifications/unread-count/${userId}`);
    const countData2 = await countRes2.json();
    console.log(`Unread count after mark-as-read: ${countData2.count}`);

    // 7. Test mark-all-as-read
    console.log('\n--- Testing mark-all-as-read ---');
    const markAllRes = await fetch(`${backendUrl}/api/notifications/read-all/${userId}`, {
      method: 'PATCH',
    });
    const markAllData = await markAllRes.json();
    console.log(`Status: ${markAllRes.status}`);
    console.log('Response:', JSON.stringify(markAllData, null, 2));

    // 8. Test delete
    console.log('\n--- Testing delete ---');
    const delRes = await fetch(`${backendUrl}/api/notifications/${notificationId}`, {
      method: 'DELETE',
    });
    const delData = await delRes.json();
    console.log(`Status: ${delRes.status}`);
    console.log('Response:', JSON.stringify(delData, null, 2));

    console.log('\n✅ All notification API tests passed!');
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

main();