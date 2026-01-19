import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create client with the user's token to verify they're an admin
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get the current user
    const { data: { user: currentUser }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !currentUser) {
      throw new Error('Unauthorized')
    }

    // Verify the current user is an admin
    const { data: roleData, error: roleError } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .single()

    if (roleError || roleData?.role !== 'admin') {
      throw new Error('Only admins can create users')
    }

    // Parse the request body
    const { email, password, full_name, role, student_id, employee_id, phone } = await req.json()

    if (!email || !password || !full_name || !role) {
      throw new Error('Missing required fields')
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Create the user using admin API (does not affect current session)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        role,
      },
    })

    if (createError) {
      throw new Error(createError.message)
    }

    if (!newUser.user) {
      throw new Error('Failed to create user')
    }

    // Create user role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role,
      })

    if (roleInsertError) {
      console.error('Error creating user role:', roleInsertError)
    }

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: newUser.user.id,
        full_name,
        student_id: role === 'student' ? student_id || null : null,
        employee_id: role !== 'student' ? employee_id || null : null,
        phone: phone || null,
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in admin-create-user:', errorMessage)
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
