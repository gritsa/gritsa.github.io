import { supabase, supabaseUrl, supabaseAnonKey } from '../config/supabase';

type NotificationType =
  | 'leave_submitted'
  | 'leave_reviewed'
  | 'expense_submitted'
  | 'expense_reviewed'
  | 'payslip_generated'
  | 'document_uploaded';

interface NotificationPayload {
  type: NotificationType;
  to_email: string;
  to_name?: string;
  data: Record<string, string | number>;
}

/**
 * Sends an email notification via the send-notification edge function.
 * Silently swallows errors so a failed notification never blocks the user flow.
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const fnUrl = `${supabaseUrl}/functions/v1/send-notification`;
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn('Notification send failed:', res.status, body);
    }
  } catch (err) {
    console.warn('Notification error (non-blocking):', err);
  }
}

/** Fetch a user's email and display name by their UUID. Returns null on failure. */
export async function getUserInfo(userId: string): Promise<{ email: string; name: string } | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email, display_name')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return { email: data.email, name: data.display_name || data.email };
  } catch {
    return null;
  }
}
