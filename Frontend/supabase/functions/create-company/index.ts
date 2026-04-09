import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // Get the current user
        const {
            data: { user },
            error: userError,
        } = await supabaseClient.auth.getUser()

        if (userError || !user) {
            throw new Error('Unauthorized')
        }

        const { companyName, slug } = await req.json()

        if (!companyName) {
            throw new Error('Company name is required')
        }

        // Initialize admin client for elevated privileges (bypassing RLS)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log('Checking for existing company for user:', user.id);

        // 1. Check if user already has a company (Idempotency/Security)
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single()

        if (profileError) {
            console.error('Profile fetch error:', profileError);
            throw profileError;
        }

        if (profile?.company_id) {
            console.log('User already has company:', profile.company_id);
            return new Response(
                JSON.stringify({ message: 'User already has a company', companyId: profile.company_id }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // 2. Generate secure slug if not provided or ensure uniqueness
        const finalSlug = slug || companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);
        console.log('Creating company with slug:', finalSlug);

        // 3. Create Company
        const { data: company, error: companyError } = await supabaseAdmin
            .from('company')
            .insert({
                name: companyName,
                slug: finalSlug,
                owner_id: user.id,
            })
            .select('*')
            .single()

        if (companyError) {
            console.error('Company creation error:', companyError);
            throw companyError;
        }

        console.log('Company created object:', JSON.stringify(company));

        if (!company || !company.id) {
            console.error('CRITICAL: Company created but ID is missing', company);
            throw new Error('Company created but ID is missing.');
        }

        console.log('Company created:', company.id);

        // 4. Create Admin Role
        const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .insert({
                user_id: user.id,
                company_id: company.id,
                role: 'admin',
            })

        if (roleError) {
            console.error('Role creation error:', roleError);
            // Rollback company creation if role fails (clean up)
            await supabaseAdmin.from('company').delete().eq('id', company.id)
            throw roleError
        }

        console.log('Admin role assigned');

        // 5. Update Profile with Company ID
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ company_id: company.id, role: 'admin' })
            .eq('id', user.id)

        if (updateError) {
            console.error('Profile update error:', updateError);
            throw updateError;
        }

        console.log('Profile updated. Success.');

        return new Response(
            JSON.stringify({ company }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
