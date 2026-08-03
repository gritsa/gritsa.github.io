import { supabase, supabaseUrl, supabaseAnonKey } from '../config/supabase';

type NotificationType =
  | 'leave_submitted'
  | 'leave_reviewed'
  | 'expense_submitted'
  | 'expense_reviewed'
  | 'payslip_generated'
  | 'document_uploaded'
  | 'offboarding_started'
  | 'exit_documents_ready'
  | 'policy_set_assigned'
  | 'policy_set_completed';

interface NotificationPayload {
  type: NotificationType;
  to_email: string;
  to_name?: string;
  /** The recipient's user id — required for push delivery (push_subscriptions is keyed by
   *  user_id, not email). Every existing call site already has this value in scope. */
  to_user_id: string;
  data: Record<string, string | number>;
}

/** Builds a human-readable title/body/click-through URL for the push channel from the same
 *  `data` already being passed to the email channel — the email Edge Function ignores `data`
 *  entirely (see docs/known-issues.md), so this is push-only and doesn't change email content. */
function buildPushContent(payload: NotificationPayload): { title: string; body: string; url: string } {
  const d = payload.data;
  switch (payload.type) {
    case 'leave_submitted':
      return {
        title: 'New leave request',
        body: `${d.employee_name} requested ${d.leave_type} leave (${d.from_date} – ${d.to_date})`,
        url: '/manager',
      };
    case 'leave_reviewed':
      return {
        title: `Leave ${d.status}`,
        body: `Your ${d.leave_type} leave (${d.from_date} – ${d.to_date}) was ${String(d.status).toLowerCase()}`,
        url: '/leaves',
      };
    case 'expense_submitted':
      return {
        title: 'New expense submitted',
        body: `${d.employee_name} submitted "${d.title}" (₹${d.amount})`,
        url: '/manager',
      };
    case 'expense_reviewed':
      return {
        title: `Expense ${d.status}`,
        body: `Your expense "${d.title}" was ${String(d.status).toLowerCase()}`,
        url: '/expenses',
      };
    case 'payslip_generated':
      return {
        title: 'Payslip generated',
        body: `Your payslip for ${d.month} ${d.year} is ready`,
        url: '/my-space',
      };
    case 'document_uploaded':
      return {
        title: 'New document uploaded',
        body: `${d.uploaded_by_name} uploaded "${d.document_name}"`,
        url: '/my-space',
      };
    case 'offboarding_started':
      return {
        title: 'Offboarding process started',
        body: `Last working date: ${d.last_working_date}`,
        url: '/',
      };
    case 'exit_documents_ready':
      return {
        title: 'Exit documents ready',
        body: 'Your final exit documents have been sent to your personal email',
        url: '/',
      };
    case 'policy_set_assigned':
      return {
        title: 'New policy assigned',
        body: `"${d.policy_set_name}" — due ${d.due_date}`,
        url: '/policies',
      };
    case 'policy_set_completed':
      return {
        title: 'Policy set completed',
        body: `${d.employee_name} completed "${d.policy_set_name}"`,
        url: '/policies/manage',
      };
    default:
      return { title: 'Gritsa Portal', body: 'You have a new notification', url: '/' };
  }
}

/**
 * Sends a notification via both channels — email (send-notification Edge Function) and web push
 * (send-push Edge Function) — so push is additive to the existing email flow, not a replacement.
 * Both channels are independently fire-and-forget: a failure in one never blocks the other or the
 * calling UI action.
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
    apikey: supabaseAnonKey,
  };

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn('Notification send failed:', res.status, body);
    }
  } catch (err) {
    console.warn('Notification error (non-blocking):', err);
  }

  try {
    const { title, body, url } = buildPushContent(payload);
    const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ user_id: payload.to_user_id, title, body, url }),
    });

    if (!res.ok) {
      const body2 = await res.text();
      console.warn('Push notification send failed:', res.status, body2);
    }
  } catch (err) {
    console.warn('Push notification error (non-blocking):', err);
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
