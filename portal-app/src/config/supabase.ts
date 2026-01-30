import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://ivdbejjgekbbetzaghkj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2ZGJlampnZWtiYmV0emFnaGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyOTI0NDIsImV4cCI6MjA4Mzg2ODQ0Mn0.P0D_wbEJeq1U-XhKpKLfOzRJyy1yS8tQN0ZKWNCXR8Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    // Use custom storage key for isolation
    storageKey: 'gritsa-portal-auth',
    // PKCE flow is more secure and handles token refresh better
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-application-name': 'gritsa-portal',
    },
  },
});
