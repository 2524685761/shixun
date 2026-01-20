import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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

    const testAccounts = [
      { email: 'admin@test.com', password: 'admin123', full_name: '测试管理员', role: 'admin', employee_id: 'ADMIN001' },
      { email: 'teacher@test.com', password: 'teacher123', full_name: '测试教师', role: 'teacher', employee_id: 'TEACHER001' },
    ]

    const results = []

    for (const account of testAccounts) {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = existingUsers?.users?.find(u => u.email === account.email)
      
      if (existingUser) {
        // Update password for existing user
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          { password: account.password }
        )
        
        if (updateError) {
          results.push({ email: account.email, status: 'error', message: updateError.message })
        } else {
          results.push({ email: account.email, status: 'updated', message: '密码已更新' })
        }
        continue
      }

      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          full_name: account.full_name,
          role: account.role,
        },
      })

      if (createError) {
        results.push({ email: account.email, status: 'error', message: createError.message })
        continue
      }

      if (!newUser.user) {
        results.push({ email: account.email, status: 'error', message: 'Failed to create user' })
        continue
      }

      // Create user role
      await supabaseAdmin.from('user_roles').insert({
        user_id: newUser.user.id,
        role: account.role,
      })

      // Create user profile
      await supabaseAdmin.from('profiles').insert({
        user_id: newUser.user.id,
        full_name: account.full_name,
        employee_id: account.employee_id,
      })

      // Assign to all courses if teacher
      if (account.role === 'teacher') {
        const { data: courses } = await supabaseAdmin.from('courses').select('id')
        if (courses && courses.length > 0) {
          await supabaseAdmin.from('teacher_courses').insert(
            courses.map(course => ({
              user_id: newUser.user!.id,
              course_id: course.id,
            }))
          )
        }
      }

      results.push({ email: account.email, status: 'created', message: '账号创建成功' })
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
