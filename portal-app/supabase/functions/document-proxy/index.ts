import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)

    // Get token from query params or Authorization header
    const tokenFromQuery = url.searchParams.get('token')
    const authHeader = req.headers.get('Authorization')

    let token = tokenFromQuery
    if (!token && authHeader) {
      token = authHeader.replace('Bearer ', '')
    }

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing authentication token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create Supabase client with the token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
        auth: {
          persistSession: false,
        },
      }
    )

    // Get authenticated user using the token
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: authError?.message || 'No user found' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get bucket and file path
    const bucket = url.searchParams.get('bucket')
    const path = url.searchParams.get('path')

    if (!bucket || !path) {
      return new Response(JSON.stringify({ error: 'Missing bucket or path parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Extract user ID from path (format: userId/filename)
    const pathParts = path.split('/')
    const fileOwnerId = pathParts[0]

    // Get user's role and details
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('role, id')
      .eq('id', user.id)
      .single()

    if (userError) {
      return new Response(JSON.stringify({ error: 'User data fetch failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Permission check:
    // 1. User can access their own documents
    // 2. HR-Finance role can access any employee's documents
    // 3. Administrator can access any documents
    const isOwner = user.id === fileOwnerId
    const isHRFinance = userData.role === 'HR-Finance'
    const isAdmin = userData.role === 'Administrator'

    if (!isOwner && !isHRFinance && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden - You do not have permission to access this document' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from(bucket)
      .download(path)

    if (downloadError) {
      return new Response(JSON.stringify({ error: 'File not found', details: downloadError }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get file metadata to determine content type
    const fileName = pathParts[pathParts.length - 1]
    const fileExtension = fileName.split('.').pop()?.toLowerCase()

    // Comprehensive MIME type mapping
    let contentType = 'application/octet-stream'
    switch (fileExtension) {
      case 'pdf':
        contentType = 'application/pdf'
        break
      case 'png':
        contentType = 'image/png'
        break
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg'
        break
      case 'gif':
        contentType = 'image/gif'
        break
      case 'webp':
        contentType = 'image/webp'
        break
      case 'svg':
        contentType = 'image/svg+xml'
        break
      case 'docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        break
      case 'doc':
        contentType = 'application/msword'
        break
      case 'xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        break
      case 'xls':
        contentType = 'application/vnd.ms-excel'
        break
      case 'txt':
        contentType = 'text/plain'
        break
      default:
        contentType = 'application/octet-stream'
    }

    // Return the file with appropriate headers
    return new Response(fileData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('Error in document-proxy:', error)
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
