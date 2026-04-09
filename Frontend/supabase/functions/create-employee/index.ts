import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("Edge Function loaded (Optimized v6)");

serve(async (req: Request) => {
    console.log(`Received request: ${req.method} ${req.url}`);

    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // Service role client for admin actions
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Authenticate and Get User
        const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser()

        if (authError || !caller) {
            console.error("Auth error:", authError);
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 2. Verify Admin Status
        const { data: membership, error: membershipError } = await supabaseAdmin
            .from('user_roles')
            .select('role, company_id')
            .eq('user_id', caller.id)
            .eq('status', 'active')
            .in('role', ['admin', 'superadmin'])
            .single()

        if (membershipError || !membership) {
            console.error("Membership error:", membershipError);
            return new Response(JSON.stringify({ error: 'Forbidden: Admin access required for an active company' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        console.log("Parsing payload...");
        const { email, password, firstName, lastName, role } = await req.json()

        // 4. Validations
        if (!email || !password || password.length < 6) {
            return new Response(JSON.stringify({
                error: 'Invalid input. Password must be at least 6 characters.'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const fullName = `${firstName} ${lastName}`.trim();
        const assignedRole = role || 'user';

        // 5. Create User in Supabase Auth
        // CRITICAL: We pass all necessary data in user_metadata.
        // The 'handle_new_user' trigger will pick this up and create the Profile with the correct company_id and role.
        // The 'sync_profile_role_to_user_roles' trigger will then watch the Profile creation and create the User Role.
        console.log("Creating auth user with optimized flow (v6)...");

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                first_name: firstName,
                last_name: lastName,
                full_name: fullName,
                created_by: caller.id,
                company_id: membership.company_id,
                role: assignedRole
            }
        })

        if (createError) {
            console.error('Error creating auth user:', createError);
            return new Response(JSON.stringify({ error: createError.message }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        console.log('Auth user created successfully:', newUser.user.id);

        // 6. Log Audit hiding
        await supabaseAdmin.from('audit_logs').insert({
            action: 'employee_created',
            actor_id: caller.id,
            target_id: newUser.user.id,
            company_id: membership.company_id,
            metadata: { email, full_name: fullName, created_by_admin: true, role: assignedRole }
        })

        return new Response(JSON.stringify({
            success: true,
            employee: {
                id: newUser.user.id,
                email: newUser.user.email,
                full_name: fullName,
                temporary_password: password
            }
        }), {
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        console.error('Unexpected error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
