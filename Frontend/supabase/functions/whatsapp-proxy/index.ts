import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2.94.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
        const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        // Auth Client (verifies user token)
        const supabaseClient = createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) throw new Error('Unauthorized')

        // Admin Client (for DB writes)
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Get Company ID
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single()

        if (!profile?.company_id) throw new Error('User has no company')

        const { action, payload } = await req.json()
        const EVO_API_URL = Deno.env.get('EVOLUTION_API_URL')
        const EVO_API_KEY = Deno.env.get('EVOLUTION_API_KEY')
        // We use a specific function URL for webhooks, or the main domain
        const WEBHOOK_URL = Deno.env.get('WEBHOOK_URL')

        if (!EVO_API_URL || !EVO_API_KEY) throw new Error('Evolution Config Missing in Edge Function')

        const callEvolution = async (endpoint: string, method: string = 'GET', body: any = null) => {
            console.log(`[Evolution] ${method} ${endpoint}`)
            const res = await fetch(`${EVO_API_URL}${endpoint}`, {
                method,
                headers: {
                    'apikey': EVO_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: body ? JSON.stringify(body) : undefined
            })

            if (!res.ok) {
                const errText = await res.text()
                console.error('Evolution Error:', errText)
                // Return null or throw? Throwing helps debug.
                throw new Error(`Evolution API Error: ${res.status} ${errText}`)
            }
            return res.json()
        }

        let result

        if (action === 'createInstance') {
            const { name } = payload
            const instanceName = name.replace(/[^a-z0-9]/g, '') // Sanitize

            console.log(`Creating instance: ${instanceName}`)

            // 1. Create in Evolution
            const evoData = await callEvolution('/instance/create', 'POST', {
                instanceName,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS'
            })

            // 2. Set Webhook & Settings if URL provided
            if (WEBHOOK_URL) {
                try {
                    // If WEBHOOK_URL points to another edge function or the frontend, ensure it's correct
                    // Usually: https://<project-ref>.supabase.co/functions/v1/whatsapp-webhook
                    console.log(`Setting webhook to ${WEBHOOK_URL}`)
                    await callEvolution(`/webhook/set/${instanceName}`, 'POST', {
                        webhook: {
                            enabled: true,
                            url: WEBHOOK_URL,
                            webhookBase64: true,
                            webhook_base64: true,
                            events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE', 'QRCODE_UPDATED', 'CONTACTS_SET', 'CONTACTS_UPSERT', 'CONTACTS_UPDATE']
                        }
                    })

                    await callEvolution(`/settings/set/${instanceName}`, 'POST', {
                        rejectCall: false,
                        groupsIgnore: false,
                        alwaysOnline: false,
                        readMessages: false,
                        readStatus: false,
                        syncFullHistory: true
                    })
                } catch (e) {
                    console.error('Warning: Failed to set webhook/settings', e)
                    // Don't fail the whole creation
                }
            }

            // 3. Save to DB
            // Check if exists first to avoid duplicate key error if re-creating
            const { data: existing } = await supabaseAdmin
                .from('whatsapp_instances')
                .select('id')
                .eq('evolution_instance_id', evoData.instance.instanceName)
                .single()

            if (existing) {
                await supabaseAdmin.from('whatsapp_instances').delete().eq('id', existing.id)
            }

            const { data: dbData, error: dbError } = await supabaseAdmin
                .from('whatsapp_instances')
                .insert({
                    company_id: profile.company_id,
                    user_id: user.id,  // CRITICAL FIX: Link instance to the user who created it
                    name,
                    evolution_instance_id: evoData.instance.instanceName,
                    // Evolution might return 'hash' or 'token' depending on version
                    evolution_token: evoData.hash?.apikey || evoData.token || '',
                    status: 'created'
                })
                .select()
                .single()

            if (dbError) throw dbError
            result = dbData

        } else if (action === 'connectInstance') {
            const { instanceId } = payload
            console.log(`Connecting instance: ${instanceId}`)
            // instanceId here is the evolution_instance_id (e.g., "mycompany1")
            const data = await callEvolution(`/instance/connect/${instanceId}`, 'GET')
            result = data

        } else if (action === 'configureWebhook') {
            const { instanceId } = payload
            console.log(`Configuring webhook for: ${instanceId}`)

            if (!WEBHOOK_URL) {
                throw new Error('WEBHOOK_URL is not set in Edge Function Secrets')
            }

            console.log(`Setting webhook to ${WEBHOOK_URL}`)
            // 1. Set Webhook
            const webhookData = await callEvolution(`/webhook/set/${instanceId}`, 'POST', {
                webhook: {
                    enabled: true,
                    url: WEBHOOK_URL,
                    webhookBase64: true,
                    webhook_base64: true,
                    events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE', 'QRCODE_UPDATED', 'CONTACTS_SET', 'CONTACTS_UPSERT', 'CONTACTS_UPDATE']
                }
            })

            // 2. Set Settings
            const settingsData = await callEvolution(`/settings/set/${instanceId}`, 'POST', {
                rejectCall: false,
                groupsIgnore: false,
                alwaysOnline: false,
                readMessages: false,
                readStatus: false,
                syncFullHistory: true
            })

            result = { webhook: webhookData, settings: settingsData }

        } else if (action === 'deleteInstance') {
            const { instanceId, dbId } = payload
            console.log(`Deleting instance: ${instanceId}`)

            try {
                await callEvolution(`/instance/delete/${instanceId}`, 'DELETE')
            } catch (e) {
                console.error('Evolution delete failed (maybe already gone)', e)
            }

            const { error } = await supabaseAdmin
                .from('whatsapp_instances')
                .delete()
                .eq('id', dbId)

            if (error) throw error
            result = { success: true }

        } else if (action === 'sendMessage') {
            const { instanceId, number, text } = payload
            const normalizedNumber = number.replace(/\D/g, '')
            const remoteJid = normalizedNumber.includes('@') ? normalizedNumber : `${normalizedNumber}@s.whatsapp.net`
            console.log(`Sending message from ${instanceId} to ${remoteJid}`)

            // 1. Send via Evolution API
            const evoResponse = await callEvolution(`/message/sendText/${instanceId}`, 'POST', {
                number: normalizedNumber,
                text,
                delay: 1200
            })

            // 2. Find DB Instance
            const { data: dbInstance } = await supabaseAdmin
                .from('whatsapp_instances')
                .select('id, company_id')
                .eq('evolution_instance_id', instanceId)
                .single()

            if (!dbInstance) {
                console.error('Instance not found in DB for direct insert')
                result = evoResponse
            } else {
                // 3. Find or Create Contact
                let contactId
                const { data: existingContact } = await supabaseAdmin
                    .from('whatsapp_contacts')
                    .select('id')
                    .eq('company_id', dbInstance.company_id)
                    .eq('remote_jid', remoteJid)
                    .single()

                if (existingContact) {
                    contactId = existingContact.id
                } else {
                    const { data: newContact } = await supabaseAdmin
                        .from('whatsapp_contacts')
                        .insert({
                            company_id: dbInstance.company_id,
                            remote_jid: remoteJid,
                            name: normalizedNumber,
                            is_group: false
                        })
                        .select()
                        .single()
                    contactId = newContact?.id
                }

                // 4. Find or Create Chat
                let chatId
                const { data: existingChat } = await supabaseAdmin
                    .from('whatsapp_chats')
                    .select('id')
                    .eq('instance_id', dbInstance.id)
                    .eq('remote_jid', remoteJid)
                    .single()

                if (existingChat) {
                    chatId = existingChat.id
                    await supabaseAdmin
                        .from('whatsapp_chats')
                        .update({ last_message_at: new Date().toISOString() })
                        .eq('id', chatId)
                } else {
                    const { data: newChat } = await supabaseAdmin
                        .from('whatsapp_chats')
                        .insert({
                            instance_id: dbInstance.id,
                            contact_id: contactId,
                            remote_jid: remoteJid,
                            last_message_at: new Date().toISOString(),
                            unread_count: 0
                        })
                        .select()
                        .single()
                    chatId = newChat?.id
                }

                // 5. Insert Message (DEFINITIVE FIX: Don't wait for webhook echo)
                const evolutionMessageId = evoResponse?.key?.id || `proxy-${Date.now()}`
                const { error: insertError } = await supabaseAdmin
                    .from('whatsapp_messages')
                    .insert({
                        chat_id: chatId,
                        instance_id: dbInstance.id,
                        content: text,
                        direction: 'outbound',
                        status: 'sent',
                        evolution_message_id: evolutionMessageId,
                        sender_id: contactId
                    })

                if (insertError) {
                    console.error('Failed to insert outbound message:', insertError)
                } else {
                    console.log(`Message inserted directly: ${evolutionMessageId}`)
                }

                result = evoResponse
            }

        } else if (action === 'sendMedia') {
            const { instanceId, number, mediaUrl, mediaType, mimeType, fileName, caption } = payload
            const normalizedNumber = number.replace(/\D/g, '')
            const remoteJid = normalizedNumber.includes('@') ? normalizedNumber : `${normalizedNumber}@s.whatsapp.net`
            console.log(`Sending ${mediaType} from ${instanceId} to ${remoteJid}`)

            // 1. Send via Evolution API
            // Evolution API expects different endpoints or payloads based on media type
            const evoResponse = await callEvolution(`/message/sendMedia/${instanceId}`, 'POST', {
                number: normalizedNumber,
                mediatype: mediaType,
                mimetype: mimeType,
                media: mediaUrl,
                caption: caption || '',
                fileName: fileName || 'file'
            })

            // 2. Find DB Instance
            const { data: dbInstance } = await supabaseAdmin
                .from('whatsapp_instances')
                .select('id, company_id')
                .eq('evolution_instance_id', instanceId)
                .single()

            if (!dbInstance) {
                console.error('Instance not found in DB for media insert')
                result = evoResponse
            } else {
                // 3. Find or Create Contact
                let contactId
                const { data: existingContact } = await supabaseAdmin
                    .from('whatsapp_contacts')
                    .select('id')
                    .eq('company_id', dbInstance.company_id)
                    .eq('remote_jid', remoteJid)
                    .single()

                if (existingContact) {
                    contactId = existingContact.id
                } else {
                    const { data: newContact } = await supabaseAdmin
                        .from('whatsapp_contacts')
                        .insert({
                            company_id: dbInstance.company_id,
                            remote_jid: remoteJid,
                            name: normalizedNumber,
                            is_group: false
                        })
                        .select()
                        .single()
                    contactId = newContact?.id
                }

                // 4. Find or Create Chat
                let chatId
                const { data: existingChat } = await supabaseAdmin
                    .from('whatsapp_chats')
                    .select('id')
                    .eq('instance_id', dbInstance.id)
                    .eq('remote_jid', remoteJid)
                    .single()

                if (existingChat) {
                    chatId = existingChat.id
                    await supabaseAdmin
                        .from('whatsapp_chats')
                        .update({ last_message_at: new Date().toISOString() })
                        .eq('id', chatId)
                } else {
                    const { data: newChat } = await supabaseAdmin
                        .from('whatsapp_chats')
                        .insert({
                            instance_id: dbInstance.id,
                            contact_id: contactId,
                            remote_jid: remoteJid,
                            last_message_at: new Date().toISOString(),
                            unread_count: 0
                        })
                        .select()
                        .single()
                    chatId = newChat?.id
                }

                // 5. Insert Media Message
                const evolutionMessageId = evoResponse?.key?.id || `proxy-media-${Date.now()}`
                const { error: insertError } = await supabaseAdmin
                    .from('whatsapp_messages')
                    .insert({
                        chat_id: chatId,
                        instance_id: dbInstance.id,
                        content: caption || `[${mediaType}]`,
                        media_url: mediaUrl,
                        media_type: mediaType,
                        direction: 'outbound',
                        status: 'sent',
                        evolution_message_id: evolutionMessageId,
                        sender_id: contactId
                    })

                if (insertError) {
                    console.error('Failed to insert outbound media message:', insertError)
                } else {
                    console.log(`Media message inserted: ${evolutionMessageId}`)
                }

                result = evoResponse
            }

        } else if (action === 'syncInstance') {
            // NEW: Sync instance status from Evolution API to database
            const { instanceId, dbId } = payload
            console.log(`Syncing instance: ${instanceId}`)

            try {
                const data = await callEvolution(`/instance/connectionState/${instanceId}`, 'GET')
                const status = data.instance?.state || data.state || 'unknown'

                // Update DB with real status from Evolution
                await supabaseAdmin.from('whatsapp_instances')
                    .update({ status: status })
                    .eq('id', dbId)

                result = { synced: true, status: status }
            } catch (e: any) {
                // Check if it's a 404 (instance doesn't exist in Evolution)
                if (e.message?.includes('404') || e.message?.includes('does not exist')) {
                    // Instance doesn't exist in Evolution - mark as orphaned
                    await supabaseAdmin.from('whatsapp_instances')
                        .update({ status: 'orphaned' })
                        .eq('id', dbId)

                    result = {
                        synced: true,
                        status: 'orphaned',
                        note: 'Instance not found in Evolution API - marked as orphaned'
                    }
                } else {
                    throw e
                }
            }

        } else {
            throw new Error(`Invalid Action: ${action}`)
        }


        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (error: any) {
        console.error('Edge Function Error:', error)

        // LOG TO DB (Best Effort)
        try {
            const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
            const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            await admin.from('antigravity_debug_logs').insert({ content: `PROXY ERROR: ${error.message}` })
        } catch (e) {
            console.error('Failed to log error to DB', e)
        }

        return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
