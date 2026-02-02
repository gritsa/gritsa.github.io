import { supabase, supabaseUrl } from '../config/supabase';

/**
 * Generate a secure document URL using the document-proxy edge function
 * This ensures proper authentication and authorization checks
 *
 * @param filePath - The path to the file in storage (e.g., "userId/filename.pdf")
 * @param bucket - The storage bucket name (default: "documents")
 * @returns The proxied document URL with authentication token
 */
export const getSecureDocumentUrl = async (
  filePath: string,
  bucket: string = 'documents'
): Promise<string> => {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    throw new Error('Authentication required to access documents');
  }

  // Construct the edge function URL with query parameters
  const url = `${supabaseUrl}/functions/v1/document-proxy?bucket=${bucket}&path=${encodeURIComponent(filePath)}&token=${token}`;

  return url;
};

/**
 * Synchronous version that generates the URL structure
 * Note: This requires a valid access token to be passed in
 *
 * @param filePath - The path to the file in storage
 * @param token - The user's access token
 * @param bucket - The storage bucket name (default: "documents")
 * @returns The proxied document URL
 */
export const buildSecureDocumentUrl = (
  filePath: string,
  token: string,
  bucket: string = 'documents'
): string => {
  return `${supabaseUrl}/functions/v1/document-proxy?bucket=${bucket}&path=${encodeURIComponent(filePath)}&token=${token}`;
};
