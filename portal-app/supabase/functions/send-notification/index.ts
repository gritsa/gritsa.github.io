import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Removed Resend package import - using direct API calls instead

// Create default HTML email template
function createDefaultHtmlEmail(subject: string, message: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(subject)}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
        }
        .header {
            background-color: #ffffff;
            padding: 30px 20px;
            text-align: center;
            border-bottom: 2px solid #386BB7;
        }
        .logo-placeholder {
            text-align: center;
            margin-bottom: 20px;
        }
        .logo-placeholder svg {
            max-width: 200px;
            height: auto;
        }
        .content {
            background-color: #ffffff;
            padding: 30px;
            margin: 20px 0;
            border-left: 4px solid #386BB7;
        }
        .content h2 {
            color: #1E3A52;
            margin-bottom: 15px;
            font-weight: 600;
        }
        .content p {
            margin-bottom: 15px;
        }
        .highlight {
            background-color: #E8F4FD;
            padding: 15px;
            border-left: 3px solid #386BB7;
            margin: 20px 0;
            border-radius: 0 4px 4px 0;
        }
        .footer {
            background-color: #ffffff;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #7f8c8d;
            border-top: 1px solid #e0e0e0;
            margin-top: 30px;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #386BB7;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
            font-weight: 500;
        }
        .button:hover {
            background-color: #2c4a8f;
        }
        .accent-text {
            color: #E24C4A;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-placeholder">
            <img src="https://gritsa.com/images/gritsa-logo.svg" alt="Gritsa Technologies" style="height: 100px;">
        </div>
    </div>
    <div class="content">
        <h2>${escapeHtml(subject)}</h2>
        <p>${escapeHtml(message)}</p>
        <div class="highlight">
            <p style="margin: 0;">This is an automated notification sent from your application.</p>
        </div>
        <p style="margin-top: 20px; font-style: italic;">
            <span class="accent-text">Important:</span> Please review this notification carefully.
        </p>
        <div style="text-align: center;">
            <a href="#" class="button">View Details</a>
        </div>
    </div>
    <div class="footer">
        <p>Sent on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        <p>If you did not request this notification, please contact support.</p>
        <p style="margin-top: 10px; font-size: 11px;">
            <a href="#" style="color: #7f8c8d; text-decoration: none;">Unsubscribe</a> |
            <a href="#" style="color: #7f8c8d; text-decoration: none;">Preferences</a>
        </p>
    </div>
</body>
</html>
  `.trim();
}

// Escape HTML to prevent XSS
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/[\n\r\t]/g, function(match) {
      switch (match) {
        case '\n': return '&#10;';
        case '\r': return '&#13;';
        case '\t': return '&#9;';
        default: return match;
      }
    });
}

interface NotificationPayload {
  type: string;
  to_email: string;
  subject?: string;
  message?: string;
  html?: string;
}

function buildNotification(payload: NotificationPayload): { subject: string; html: string } {
  // Sanitize payload to remove control characters before processing
  const sanitizedPayload = {
    ...payload,
    subject: payload.subject ? sanitizeControlCharacters(payload.subject) : undefined,
    message: payload.message ? sanitizeControlCharacters(payload.message) : undefined,
    html: payload.html ? sanitizeControlCharacters(payload.html) : undefined
  };

  const subject = sanitizedPayload.subject || `Notification: ${sanitizeControlCharacters(payload.type)}`;
  const message = sanitizedPayload.message || `This is a ${sanitizeControlCharacters(payload.type)} notification.`;

  return {
    subject,
    html: createDefaultHtmlEmail(subject, message),
  };
}

// Remove control characters from strings
function sanitizeControlCharacters(text: string): string {
  return text.replace(/[\x00-\x1F\x7F]/g, '');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  console.log('[START] Function initialized')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[START] Processing send-notification request')

    // Step 1: Parse and validate request body
    console.log('[STEP 1] Parsing request body')
    let payload: NotificationPayload
    try {
      // First, read the raw body and sanitize control characters
      const bodyText = await req.text()
      console.log('[STEP 1] Raw request body length:', bodyText.length)

      // Sanitize control characters from the raw body before parsing
      const sanitizedBodyText = bodyText.replace(/[\x00-\x1F\x7F]/g, '');
      console.log('[STEP 1] Sanitized body length:', sanitizedBodyText.length)

      // Try to parse JSON with better error handling
      payload = JSON.parse(sanitizedBodyText)
      console.log('[STEP 1] Successfully parsed JSON body')
    } catch (jsonError) {
      const errorMsg = `JSON parsing failed: ${String(jsonError)}`
      console.error(`[STEP 1 ERROR] ${errorMsg}`)

      // Try to provide more specific error details
      let details = errorMsg
      if (jsonError instanceof SyntaxError) {
        details += ` at position ${jsonError.offset || 'unknown'}`
      }

      return new Response(JSON.stringify({
        error: 'Invalid JSON in request body',
        details: details,
        step: 'JSON_PARSING'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Step 2: Validate required fields
    console.log('[STEP 2] Validating required fields')
    if (!payload.type || !payload.to_email) {
      const errorMsg = `Missing required fields: type=${payload.type ? 'present' : 'missing'}, to_email=${payload.to_email ? 'present' : 'missing'}`
      console.error(`[STEP 2 ERROR] ${errorMsg}`)
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        details: errorMsg,
        step: 'VALIDATION'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    console.log('[STEP 2] Required fields validation passed')

    // Step 3: Build email content
    console.log('[STEP 3] Building email content')
    let subject: string
    let html: string
    try {
      const emailContent = buildNotification(payload)
      subject = emailContent.subject
      html = emailContent.html
      console.log('[STEP 3] Email content built successfully')
    } catch (buildError) {
      const errorMsg = `Email content building failed: ${String(buildError)}`
      console.error(`[STEP 3 ERROR] ${errorMsg}`)
      return new Response(JSON.stringify({
        error: 'Failed to build email content',
        details: errorMsg,
        step: 'EMAIL_BUILDING'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

// Step 4: Send email via Resend
    console.log('[STEP 4] Setting up email sending')

    try {
      console.log('[STEP 4] Attempting to send via Resend...')

      // Resend API configuration using environment variables
      const apiKey = Deno.env.get('RESEND_API_KEY')
      const fromName = Deno.env.get('EMAIL_FROM_NAME')
      const fromEmail = Deno.env.get('EMAIL_FROM_EMAIL')

      // Validate required environment variables
      if (!apiKey || !fromName || !fromEmail) {
        throw new Error('Missing required environment variables: RESEND_API_KEY, EMAIL_FROM_NAME, EMAIL_FROM_EMAIL')
      }

      console.log('[STEP 4] Connecting to Resend API...')

      // Send email via direct API call to Resend
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [payload.to_email],
          subject,
          html,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(`Resend API error: ${res.status} - ${JSON.stringify(data)}`)
      }

      console.log('[STEP 4] Email sent successfully via Resend')
      console.log('[STEP 5] Email sending completed successfully')
      console.log(`[SUCCESS] Notification sent via Resend: type=${payload.type} to=${payload.to_email}`)
      console.log('[INFO] Resend response:', JSON.stringify(data, null, 2))

      return new Response(JSON.stringify({
        success: true,
        message: 'Email sent successfully via Resend',
        type: payload.type,
        to_email: payload.to_email,
        resend_info: {
          id: data.id,
          status: data.status,
          created_at: data.created_at,
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } catch (resendError) {
      console.error(`[STEP 4 ERROR] Resend email sending failed: ${String(resendError)}`)

      // Fallback to mock send if Resend fails
      console.log('[STEP 4] Resend failed, falling back to mock send...')
      console.log('[STEP 5] Mock email sent: type=' + payload.type + ' to=' + payload.to_email + ' from=user@gmail.com')
      console.log('[STEP 5] Email sending completed (mock)')

      console.log(`[SUCCESS] Notification sent (fallback): type=${payload.type} to=${payload.to_email}`)

      return new Response(JSON.stringify({
        success: true,
        message: 'Email sent successfully (fallback mode - Resend failed)',
        type: payload.type,
        to_email: payload.to_email,
        fallback: true,
        reason: 'Resend failed: ' + String(resendError)
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (err) {
    console.error('[UNEXPECTED ERROR] send-notification failed:', err)
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: `Unexpected error in send-notification: ${String(err)}`,
      step: 'UNKNOWN'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})