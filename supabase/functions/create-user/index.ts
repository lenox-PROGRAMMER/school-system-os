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
    // Create Supabase client with service role key for admin operations
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

    // Create regular client to verify the requesting user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Verify the user is authenticated and is an admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if user is admin using admin client to bypass RLS
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    console.log('Admin check details:', { 
      userId: user.id, 
      profile, 
      profileError, 
      profileExists: !!profile,
      profileRole: profile?.role 
    })

    if (profileError) {
      console.error('Profile query error:', profileError)
      return new Response(
        JSON.stringify({ error: 'Database error while checking user role.' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!profile) {
      console.error('No profile found for user:', user.id)
      return new Response(
        JSON.stringify({ error: 'User profile not found.' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (profile.role !== 'admin') {
      console.error('User role is not admin:', { role: profile.role, userId: user.id })
      return new Response(
        JSON.stringify({ error: 'Access denied. Admin privileges required.' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Admin check passed for user:', user.id)

    // Parse request body
    const { email, fullName, role } = await req.json()

    // Validate required fields
    if (!email || !fullName || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, fullName, role' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate role
    if (!['student', 'lecturer', 'admin'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be student, lecturer, or admin' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate secure password
    const generateSecurePassword = (): string => {
      const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const lowercase = "abcdefghijklmnopqrstuvwxyz";
      const numbers = "0123456789";
      const special = "!@#$%^&*";
      
      let password = "";
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
      password += numbers[Math.floor(Math.random() * numbers.length)];
      password += special[Math.floor(Math.random() * special.length)];
      
      const allChars = uppercase + lowercase + numbers + special;
      for (let i = 4; i < 8; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
      }
      
      return password.split('').sort(() => Math.random() - 0.5).join('');
    }

    const password = generateSecurePassword();

    // Create user with admin client
    const { data: authData, error: authError2 } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role
      }
    })

    if (authError2) {
      console.error('Auth error:', authError2)
      return new Response(
        JSON.stringify({ error: authError2.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create profile entry
    const { error: profileError2 } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id, // Use the auth user ID as the profile ID
        user_id: authData.user.id,
        full_name: fullName,
        email: email,
        role: role
      })

    if (profileError2) {
      console.error('Profile error:', profileError2)
      return new Response(
        JSON.stringify({ error: profileError2.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        message: `${role} created successfully!`,
        password: password,
        user: {
          id: authData.user.id,
          email: email,
          full_name: fullName,
          role: role
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})