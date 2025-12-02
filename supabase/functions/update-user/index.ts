import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Authorization check - verify caller has admin privileges using user_roles table
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Check caller's role from user_roles table
    const { data: callerRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .single()

    if (roleError || !callerRole) {
      return new Response(
        JSON.stringify({ error: 'Could not verify user role' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const allowedRoles = ['Admin', 'Manager', 'CEO']
    if (!allowedRoles.includes(callerRole.role)) {
      console.log(`Unauthorized access attempt by user ${caller.id} with role ${callerRole.role}`)
      return new Response(
        JSON.stringify({ error: 'Forbidden: Insufficient permissions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const { user_id, name, role_type, sales_role, team_id } = await req.json()

    // Validate required fields
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Update the profile (keep role_type for backwards compatibility/display)
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        name,
        role_type,
        sales_role,
        team_id
      })
      .eq('id', user_id)

    if (updateProfileError) {
      console.error('Profile error:', updateProfileError)
      return new Response(
        JSON.stringify({ error: updateProfileError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Update role in user_roles table (the secure source of truth)
    if (role_type) {
      // First delete existing role, then insert new one (upsert pattern)
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', user_id)

      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id,
          role: role_type
        })

      if (roleInsertError) {
        console.error('Role update error:', roleInsertError)
        return new Response(
          JSON.stringify({ error: roleInsertError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
    }

    console.log(`User ${user_id} updated by admin ${caller.id}`)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
