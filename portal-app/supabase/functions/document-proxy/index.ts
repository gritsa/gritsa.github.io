// Follow-up imports
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

console.log('Function loaded')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  console.log('Request received:', req.method, req.url)

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

    console.log('Token present:', !!token)

    if (!token) {
      console.log('No token provided')
      return new Response(JSON.stringify({ error: 'Missing authentication token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    console.log('Creating Supabase client...')

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('Verifying user...')

    // Verify the JWT token
    const { data, error: authError } = await supabaseAdmin.auth.getUser(token)

    console.log('getUser response:', { hasData: !!data, hasUser: !!data?.user, hasError: !!authError })

    if (authError) {
      console.error('Auth error:', authError.message)
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        details: authError.message
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!data?.user) {
      console.error('No user in response')
      return new Response(JSON.stringify({ error: 'No user found' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const user = data.user
    console.log('User verified:', user.id)

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

    // Get user's role
    const { data: userData, error: roleError } = await supabaseAdmin
      .from('users')
      .select('role, id')
      .eq('id', user.id)
      .single()

    if (roleError) {
      console.error('Role fetch error:', roleError.message)
      return new Response(JSON.stringify({ error: 'User data fetch failed', details: roleError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Permission check
    const isOwner = user.id === fileOwnerId
    const isHRFinance = userData.role === 'HR-Finance'
    const isAdmin = userData.role === 'Administrator'

    console.log('Permissions:', { isOwner, isHRFinance, isAdmin })

    if (!isOwner && !isHRFinance && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Download file
    console.log('Downloading file:', path)
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(bucket)
      .download(path)

    if (downloadError) {
      console.error('Download error:', downloadError.message)
      return new Response(JSON.stringify({ error: 'File not found', details: downloadError.message }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Determine content type
    const fileName = pathParts[pathParts.length - 1]
    const fileExtension = fileName.split('.').pop()?.toLowerCase()

    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
      txt: 'text/plain',
    }

    const contentType = mimeTypes[fileExtension || ''] || 'application/octet-stream'

    console.log('Returning file:', fileName, contentType)

    return new Response(fileData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('Uncaught error:', error)
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

console.log('Handler registered')
