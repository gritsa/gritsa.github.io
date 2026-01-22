// Script to create admin user via Supabase Admin API
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ivdbejjgekbbetzaghkj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('You can find this in your Supabase project settings under API > service_role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  try {
    console.log('Creating admin user...');

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@gritsa.com',
      password: '123@gritsa',
      email_confirm: true,
      user_metadata: {}
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('Admin user already exists in auth system');
      } else {
        throw authError;
      }
    } else {
      console.log('Admin user created successfully:', authData.user.id);
    }

    // Update users table to set role to Administrator
    const { data: userData, error: userError } = await supabase
      .from('users')
      .update({ role: 'Administrator' })
      .eq('email', 'admin@gritsa.com')
      .select();

    if (userError) {
      throw userError;
    }

    console.log('Admin role set successfully');
    console.log('\nYou can now login with:');
    console.log('Email: admin@gritsa.com');
    console.log('Password: 123@gritsa');

  } catch (error) {
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  }
}

createAdminUser();
