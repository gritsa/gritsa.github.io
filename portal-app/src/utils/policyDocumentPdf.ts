import { supabase } from '../config/supabase';
import { getSecureDocumentUrl } from './documentUrl';
import { openPrintWindow } from './printDocument';
import type { PolicyAssignment } from '../types';

function formatDate(date?: string): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Builds a printable packet of every policy the employee has actually signed for this
 * assignment (unsigned policies in the same set are skipped — nothing to show for them) and
 * opens it in a print window. Returns 'no-signatures' if nothing has been signed yet, or
 * 'popup-blocked' if the browser blocked the window, so the caller can toast accordingly.
 */
export async function downloadSignedPolicyPacket(
  assignment: PolicyAssignment,
  policySetName: string,
  employeeName: string
): Promise<'success' | 'no-signatures' | 'popup-blocked'> {
  const [{ data: policies, error: policyError }, { data: signatures, error: sigError }] = await Promise.all([
    supabase.from('policies').select('*').eq('policy_set_id', assignment.policy_set_id).order('order_index'),
    supabase.from('policy_signatures').select('*').eq('assignment_id', assignment.id),
  ]);

  if (policyError) throw policyError;
  if (sigError) throw sigError;

  const signedPolicies = (policies || []).filter((p) => (signatures || []).some((s) => s.policy_id === p.id));
  if (signedPolicies.length === 0) return 'no-signatures';

  const sections = await Promise.all(
    signedPolicies.map(async (policy) => {
      const signature = signatures!.find((s) => s.policy_id === policy.id)!;
      const signatureUrl = await getSecureDocumentUrl(signature.signature_file_path);
      return `
        <h2>${policy.title}</h2>
        <div>${policy.content}</div>
        <p><strong>Signed on ${formatDate(signature.signed_at)}</strong></p>
        <img src="${signatureUrl}" alt="Signature" style="max-height: 90px; background: white; padding: 4px; border-radius: 4px;" />
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #ccc;" />
      `;
    })
  );

  const header = `
    <h1>${policySetName}</h1>
    <p><strong>Employee:</strong> ${employeeName}</p>
    <p><strong>Assigned:</strong> ${formatDate(assignment.assigned_at)}</p>
    <p><strong>Due:</strong> ${formatDate(assignment.due_date)}</p>
    <p><strong>Status:</strong> ${assignment.status}</p>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #ccc;" />
  `;

  const opened = openPrintWindow(`${policySetName} - ${employeeName}`, header + sections.join(''));
  return opened ? 'success' : 'popup-blocked';
}
