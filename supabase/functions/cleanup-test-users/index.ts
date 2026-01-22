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

    // 获取需要保留的管理员用户ID
    const { data: adminRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')

    const adminUserIds = adminRoles?.map(r => r.user_id) || []
    console.log('Admin user IDs to keep:', adminUserIds)

    // 获取所有用户
    const { data: allUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      throw listError
    }

    const results = []
    let deletedCount = 0

    for (const user of allUsers.users) {
      // 跳过管理员用户
      if (adminUserIds.includes(user.id)) {
        results.push({ 
          email: user.email, 
          status: 'kept', 
          message: '管理员账号已保留' 
        })
        continue
      }

      // 删除非管理员用户
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
      
      if (deleteError) {
        results.push({ 
          email: user.email, 
          status: 'error', 
          message: deleteError.message 
        })
      } else {
        deletedCount++
        results.push({ 
          email: user.email, 
          status: 'deleted', 
          message: '账号已删除' 
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedCount,
        keptCount: adminUserIds.length,
        results 
      }),
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
