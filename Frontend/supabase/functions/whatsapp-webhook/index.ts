import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2.94.0'

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? '';
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? '';
const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL") ?? '';
const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY") ?? '';

// Helper to normalize JIDs
function normalizeJid(jid: string): string {
    if (!jid) return '';
    // Strip device agent / lid suffixes
    let cleanJid = jid.replace(/:\d+@/, '@').replace(/@.+/, '');

    // Re-append correct suffix
    if (jid.includes('@g.us')) {
        return `${cleanJid}@g.us`;
    }
    return `${cleanJid}@s.whatsapp.net`;
}

function normalizePhone(value: string): string {
    if (!value) return '';
    return value
        .replace(/@s\.whatsapp\.net$/i, '')
        .replace(/@g\.us$/i, '')
        .replace(/\D/g, '');
}

function buildPhoneCandidates(value: string): string[] {
    if (!value) return [];
    const raw = String(value).trim();
    const digits = normalizePhone(raw);
    const withJid = digits ? `${digits}@s.whatsapp.net` : '';
    return Array.from(new Set([raw, digits, withJid].filter(Boolean)));
}

// DEBUG LOGGING HELPER
async function logDebug(supabase: any, content: string) {
    try {
        await supabase.from('antigravity_debug_logs').insert({ content: content.substring(0, 500) });
    } catch (e) {
        console.error("Failed to log debug:", e);
    }
}

// MEDIA EXTRACTION AND STORAGE HELPER
// Uses Evolution API's getBase64FromMediaMessage endpoint to properly download media
async function extractAndStoreMedia(
    supabase: any,
    messageData: any,
    instanceId: string,
    instanceName: string,
    messageKey: { id: string; remoteJid: string; fromMe: boolean },
    logDebugFn: (supabase: any, content: string) => Promise<void>
): Promise<{ mediaUrl: string | null; mediaType: string | null; caption: string }> {
    let mediaUrl: string | null = null;
    let mediaType: string | null = null;
    let caption = '';

    // Check for View Once messages first
    const viewOnceContent = messageData.viewOnceMessage?.message || messageData.viewOnceMessageV2?.message;
    if (viewOnceContent) {
        return { mediaUrl: null, mediaType: 'viewOnce', caption: '' };
    }

    // Media type mappings with extensions
    const mediaTypes: { [key: string]: { type: string; ext: string } } = {
        imageMessage: { type: 'image', ext: 'jpg' },
        videoMessage: { type: 'video', ext: 'mp4' },
        audioMessage: { type: 'audio', ext: 'mp3' },
        pttMessage: { type: 'audio', ext: 'ogg' },
        documentMessage: { type: 'document', ext: 'pdf' },
        stickerMessage: { type: 'sticker', ext: 'webp' }
    };

    // Find media in message
    for (const [msgType, config] of Object.entries(mediaTypes)) {
        if (messageData[msgType]) {
            const mediaContent = messageData[msgType];
            mediaType = config.type;
            caption = mediaContent.caption || mediaContent.fileName || '';
            const mimetype = mediaContent.mimetype || 'application/octet-stream';

            // Determine file extension from mimetype or use default
            let extension = config.ext;
            if (mimetype.includes('png')) extension = 'png';
            else if (mimetype.includes('gif')) extension = 'gif';
            else if (mimetype.includes('webp')) extension = 'webp';
            else if (mimetype.includes('ogg')) extension = 'ogg';
            else if (mimetype.includes('mp4')) extension = 'mp4';
            else if (mimetype.includes('pdf')) extension = 'pdf';

            try {
                let fileBuffer: ArrayBuffer | null = null;
                let base64Data = mediaContent.base64 || null;

                // Priority 1: Base64 already provided in webhook payload
                if (base64Data) {
                    console.log(`[Media] Using base64 from webhook payload`);
                    const binaryString = atob(base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    fileBuffer = bytes.buffer;
                }
                // Priority 2: Call Evolution API getBase64FromMediaMessage endpoint
                else if (evolutionApiUrl && evolutionApiKey) {
                    console.log(`[Media] Fetching base64 from Evolution API for message ${messageKey.id}`);
                    await logDebugFn(supabase, `[Media] Calling getBase64 for ${messageKey.id} on instance ${instanceName}`);

                    try {
                        const evoResponse = await fetch(`${evolutionApiUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': evolutionApiKey
                            },
                            body: JSON.stringify({
                                message: {
                                    key: {
                                        remoteJid: messageKey.remoteJid,
                                        id: messageKey.id,
                                        fromMe: messageKey.fromMe
                                    }
                                },
                                convertToMp4: false
                            })
                        });

                        if (evoResponse.ok) {
                            const evoData = await evoResponse.json();
                            await logDebugFn(supabase, `[Media] Evolution API response: ${JSON.stringify(evoData).substring(0, 200)}`);

                            // The response should contain base64 data
                            const fetchedBase64 = evoData.base64 || evoData.data?.base64 || evoData.message?.base64;

                            if (fetchedBase64) {
                                console.log(`[Media] Got base64 from Evolution API (${fetchedBase64.length} chars)`);
                                // Remove data URI prefix if present
                                const cleanBase64 = fetchedBase64.replace(/^data:[^;]+;base64,/, '');
                                const binaryString = atob(cleanBase64);
                                const bytes = new Uint8Array(binaryString.length);
                                for (let i = 0; i < binaryString.length; i++) {
                                    bytes[i] = binaryString.charCodeAt(i);
                                }
                                fileBuffer = bytes.buffer;
                            } else {
                                console.error('[Media] No base64 in Evolution API response');
                                await logDebugFn(supabase, `[Media] No base64 in response keys: ${Object.keys(evoData).join(', ')}`);
                            }
                        } else {
                            const errorText = await evoResponse.text();
                            console.error(`[Media] Evolution API error: ${evoResponse.status} - ${errorText}`);
                            await logDebugFn(supabase, `[Media] Evolution API error: ${evoResponse.status} - ${errorText.substring(0, 100)}`);
                        }
                    } catch (evoError) {
                        console.error('[Media] Evolution API call failed:', evoError);
                        await logDebugFn(supabase, `[Media] Evolution API call failed: ${String(evoError).substring(0, 100)}`);
                    }
                }

                if (fileBuffer && fileBuffer.byteLength > 0) {
                    // Upload to Supabase Storage
                    const fileName = `${instanceId}/${Date.now()}_${messageKey.id.substring(0, 8)}.${extension}`;

                    // Sanitize mimetype - remove parameters like "; codecs=opus"
                    // Supabase Storage doesn't support mimetypes with parameters
                    const sanitizedMimetype = mimetype.split(';')[0].trim();

                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('whatsapp-media')
                        .upload(fileName, fileBuffer, {
                            contentType: sanitizedMimetype,
                            upsert: true
                        });

                    if (uploadError) {
                        console.error('[Media] Upload error:', uploadError);
                        await logDebugFn(supabase, `[Media] Storage upload error: ${uploadError.message}`);
                    } else {
                        // Get public URL
                        const { data: publicUrlData } = supabase.storage
                            .from('whatsapp-media')
                            .getPublicUrl(fileName);

                        mediaUrl = publicUrlData?.publicUrl || null;
                        console.log(`[Media] Uploaded: ${fileName}`);
                        await logDebugFn(supabase, `[Media] Upload success: ${fileName}`);
                    }
                } else {
                    console.log('[Media] No media buffer obtained, leaving mediaUrl null');
                    await logDebugFn(supabase, `[Media] No buffer obtained for ${messageKey.id}`);
                }
            } catch (error) {
                console.error('[Media] Processing error:', error);
                await logDebugFn(supabase, `[Media] Processing error: ${String(error).substring(0, 100)}`);
            }

            break;
        }
    }

    return { mediaUrl, mediaType, caption };
}


serve(async (req) => {
    try {
        if (req.method !== "POST") {
            return new Response("Method not allowed", { status: 405 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const body = await req.json();
        const { event, instance, data } = body;
        const rawEvent = typeof event === 'string' ? event : '';
        const normalizedEvent = rawEvent.toLowerCase().replace(/_/g, '.');
        const eventKey = normalizedEvent || rawEvent;

        console.log(`Received webhook: ${rawEvent || eventKey} for ${instance}`);

        // Log Entry
        if (eventKey === 'messages.upsert') {
            await logDebug(supabase, `WEBHOOK ENTRY: ${eventKey} | ID: ${data.key?.id} | RemoteJid: ${data.key?.remoteJid}`);
        }
        // LOG FULL PAYLOAD for debugging
        if (eventKey === 'messages.upsert') {
            console.log('Full Webhook Body:', JSON.stringify(body));
        }


        // 1. Find Instance in DB
        const { data: dbInstance, error: instanceError } = await supabase
            .from("whatsapp_instances")
            .select("*")
            .eq("evolution_instance_id", instance)
            .single();

        if (instanceError || !dbInstance) {
            console.error(`Instance ${instance} not found in DB`);
            console.log('Available instances:', instance);
            // We return 200 to prevent Evolution from retrying infinitely
            return new Response("OK (Instance not found)", { status: 200 });
        }

        console.log(`Processing event: ${eventKey} for company: ${dbInstance.company_id}`);


        switch (eventKey) {
            case "messages.upsert":
                await handleMessage(supabase, dbInstance, data);
                break;
            case "connection.update":
                await handleConnectionUpdate(supabase, dbInstance, data);
                break;
            case "qrcode.updated":
                await handleQrCodeUpdate(supabase, dbInstance, data);
                break;
            case "contacts.set":
            case "contacts.upsert":
            case "contacts.update":
                await handleContactsEvent(supabase, dbInstance, rawEvent || eventKey, data);
                break;
            default:
            // Log unhandled but valid events
        }

        return new Response("OK", { status: 200 });

    } catch (error: any) {
        console.error("Webhook Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});

async function handleConnectionUpdate(supabase: any, instance: any, data: any) {
    const status = data.statusReason || data.state;
    console.log(`Connection Update: ${status}`);
    await supabase
        .from("whatsapp_instances")
        .update({ status: status })
        .eq("id", instance.id);
}

async function handleQrCodeUpdate(supabase: any, instance: any, data: any) {
    console.log("QR Code Updated");
    await supabase
        .from("whatsapp_instances")
        .update({ qr_code: data.qrcode })
        .eq("id", instance.id);
}

// Handler for contact events (CONTACTS_SET, CONTACTS_UPSERT, CONTACTS_UPDATE)
// Captures the "name" field which is the contact name saved in user's phonebook
async function handleContactsEvent(supabase: any, instance: any, event: string, data: any) {
    // data can be an array (contacts.set/upsert) or single object (contacts.update)
    const contacts = Array.isArray(data) ? data : [data];
    let processedCount = 0;
    const autoCreateLeads = Boolean(
        instance?.config?.auto_create_leads ??
        instance?.config?.autoCreateLeads ??
        instance?.config?.auto_create_lead
    );
    let defaultStatus: string | null = null;

    if (autoCreateLeads) {
        const { data: company } = await supabase
            .from("company")
            .select("status_type")
            .eq("id", instance.company_id)
            .single();
        defaultStatus = company?.status_type?.[0] || "Novos";
    }

    for (const contact of contacts) {
        // Evolution V2 uses 'remoteJid', V1 used 'id'
        const id = contact.id || contact.remoteJid;

        if (!contact || !id) {
            await logDebug(supabase, `[Contacts] Invalid contact object: ${JSON.stringify(contact)}`);
            continue;
        }

        // Log inspection
        if (processedCount < 3) {
            await logDebug(supabase, `[Contacts] Inspecting: ${JSON.stringify(contact)}`);
        }

        const remoteJid = normalizeJid(id);
        if (!remoteJid || remoteJid.includes('@g.us')) continue; // Skip groups

        const savedName = contact.name || contact.savedName || null; // Name saved in user's phonebook
        const pushName = contact.notify || contact.pushName || null; // Contact's own pushName

        if (!savedName && !pushName) continue; // Nothing to update

        try {
            // Upsert contact with saved_name
            const updateData: any = {
                company_id: instance.company_id,
                remote_jid: remoteJid,
                is_group: false
            };

            if (savedName) {
                updateData.saved_name = savedName;
                updateData.name = savedName; // Also set as display name
            }
            if (pushName && !savedName) {
                updateData.name = pushName; // Fallback to pushName if no saved name
            }

            await supabase
                .from("whatsapp_contacts")
                .upsert(updateData, {
                    onConflict: 'company_id, remote_jid',
                    ignoreDuplicates: false
                });

            const phoneDigits = normalizePhone(remoteJid);
            const leadLookup = buildPhoneCandidates(remoteJid);

            let existingLead: any = null;
            if (leadLookup.length > 0) {
                const { data: leadMatches } = await supabase
                    .from("leads")
                    .select("id, nome, telefone")
                    .eq("company_id", instance.company_id)
                    .in("telefone", leadLookup)
                    .limit(1);
                existingLead = leadMatches?.[0] || null;
            }

            if (existingLead) {
                const leadUpdates: any = {};
                const existingName = (existingLead.nome || "").trim();
                const phoneFallback = phoneDigits || remoteJid.replace('@s.whatsapp.net', '');

                const shouldUpdateName = Boolean(
                    savedName &&
                    (!existingName || existingName === existingLead.telefone || existingName === phoneFallback)
                );

                if (shouldUpdateName) {
                    leadUpdates.nome = savedName;
                }

                if (Object.keys(leadUpdates).length > 0) {
                    await supabase
                        .from("leads")
                        .update(leadUpdates)
                        .eq("id", existingLead.id);
                }
            } else if (autoCreateLeads && phoneDigits) {
                await supabase
                    .from("leads")
                    .upsert({
                        company_id: instance.company_id,
                        responsavel_id: instance.user_id || null,  // FIX: Assign to instance owner
                        telefone: phoneDigits,
                        nome: savedName || pushName || phoneDigits,
                        status: defaultStatus || "Novos",
                        source: "whatsapp"
                    }, {
                        onConflict: "telefone, company_id",
                        ignoreDuplicates: false
                    });
            }

            processedCount++;
        } catch (err) {
            console.error(`[Contacts] Error processing ${remoteJid}:`, err);
        }
    }

    console.log(`[Contacts] Processed ${processedCount}/${contacts.length} contacts from ${event}`);
}

// Helper to fetch group subject
async function fetchGroupSubject(instanceName: string, groupJid: string, supabase: any) {
    // List of potential endpoints to try (Evolution API versions vary)
    const endpoints = [
        // Candidate 1: Chat find (often works for groups too)
        `${evolutionApiUrl}/chat/find/${instanceName}/${groupJid}`,
        // Candidate 2: Group find with query param
        `${evolutionApiUrl}/group/find/${instanceName}?groupJid=${groupJid}`,
        // Candidate 3: Original attempt (legacy)
        `${evolutionApiUrl}/group/find/${instanceName}/${groupJid}`
    ];

    for (const url of endpoints) {
        try {
            await logDebug(supabase, `FETCH GROUP TRY: ${url}`);

            const resp = await fetch(url, {
                method: 'GET',
                headers: { 'apikey': evolutionApiKey }
            });

            if (resp.ok) {
                const data = await resp.json();
                // Different endpoints might return data differently
                const subject = data.subject || data.name || data.pushName || (data.contact ? data.contact.name : null) || null;

                if (subject) {
                    await logDebug(supabase, `FETCH GROUP SUCCESS: ${subject} FROM ${url}`);
                    return subject;
                }
            } else {
                await logDebug(supabase, `FETCH GROUP FAIL: ${resp.status} FROM ${url}`);
            }
        } catch (e: any) {
            await logDebug(supabase, `FETCH GROUP EXCEPTION: ${e.message} FROM ${url}`);
        }
    }

    await logDebug(supabase, `FETCH GROUP FAILURE: All endpoints failed for ${groupJid}`);
    return null;
}

async function handleMessage(supabase: any, instance: any, data: any) {
    const messageData = data.message || data;
    const key = data.key;
    if (!key) {
        await logDebug(supabase, `ERROR: No Key in message data`);
        return;
    }

    let rawRemoteJid = key.remoteJid;

    // FIX: Evolution V2 often sends LID as remoteJid. Prefer phone number (remoteJidAlt) if available.
    if (rawRemoteJid && rawRemoteJid.includes("@lid")) {
        if (key.remoteJidAlt && key.remoteJidAlt.includes("@s.whatsapp.net")) {
            console.log(`[Webhook] Swapping LID ${rawRemoteJid} for Phone JID ${key.remoteJidAlt}`);
            await logDebug(supabase, `SWAP: LID ${rawRemoteJid} -> ${key.remoteJidAlt}`);
            rawRemoteJid = key.remoteJidAlt;
        } else {
            // LID without alternative - cannot identify real phone number
            // Log and skip processing to avoid creating phantom contacts
            console.log(`[Webhook] Skipping LID message without remoteJidAlt: ${rawRemoteJid}`);
            await logDebug(supabase, `SKIP: LID without alt: ${rawRemoteJid} | Instance: ${instance.evolution_instance_id}`);
            return;
        }
    }

    const remoteJid = normalizeJid(rawRemoteJid);
    await logDebug(supabase, `PROCESSING: JID=${remoteJid}, FromMe=${key.fromMe}`);

    const fromMe = key.fromMe;
    const participant = normalizeJid(key.participant || remoteJid);
    const isGroup = remoteJid.endsWith('@g.us');

    // CHECK CONFIG: Ignore Groups if enabled
    if (isGroup && instance.config && instance.config.ignore_groups) {
        console.log(`[Webhook] Ignoring group message (Config-enabled)`);
        return;
    }

    // --- 1. Identify/Create CHAT Contact ---
    // --- 1. Identify/Create CHAT Contact ---
    // --- 1. Identify/Create CHAT Contact ---
    let chatContactId;
    // Determine Name: 
    // If incoming (!fromMe), use pushName or "Unknown" (or "Novo Grupo" if group).
    // If outgoing (fromMe), we DO NOT want to use data.pushName because that is US.
    // We should use the existing contact name, or formatted number if new.
    let initialName = isGroup ? "Novo Grupo" : (fromMe ? "Novo Contato" : (data.pushName || "Unknown"));

    let profilePicUrl = null;

    // Try to find existing contact
    const { data: existingChatContact } = await supabase
        .from("whatsapp_contacts")
        .select("id, name, is_group")
        .eq("company_id", instance.company_id)
        .eq("remote_jid", remoteJid)
        .single();

    if (existingChatContact) {
        chatContactId = existingChatContact.id;

        // Update Name ONLY if:
        // 1. It is NOT a group (groups managed differently)
        // 2. It is INCOMING (!fromMe) - giving us the latest contact name
        // 3. The current name is generic ("Novo Contato", "Unknown") OR we want to update it.
        // For now, let's only update if we have a valid pushName and it's incoming.
        if (!isGroup && !fromMe && data.pushName && existingChatContact.name !== data.pushName) {
            await supabase.from("whatsapp_contacts")
                .update({ name: data.pushName })
                .eq("id", chatContactId);
        }

        // Basic self-healing for groups named "Novo Grupo"
        if (isGroup && existingChatContact.name === 'Novo Grupo') {
            await logDebug(supabase, `HEALING: Found 'Novo Grupo' for ${remoteJid}`);
            const realName = await fetchGroupSubject(instance.evolution_instance_id, remoteJid, supabase);
            if (realName) {
                await logDebug(supabase, `HEALING: Updating to '${realName}'`);
                console.log(`Updating group name to: ${realName}`);
                await supabase.from("whatsapp_contacts")
                    .update({ name: realName })
                    .eq("id", chatContactId);
            }
        }
    } else {
        // Upsert New Contact
        // If fromMe=true, we are sending to a NEW number. 
        // We don't know the name yet. Set as "Novo Contato" or the Number itself.
        if (fromMe && !isGroup) {
            initialName = remoteJid.replace('@s.whatsapp.net', '');
        }

        // If it's a new group, try to fetch the real name immediately
        if (isGroup) {
            await logDebug(supabase, `NEW GROUP: Fetching name for ${remoteJid}`);
            const realName = await fetchGroupSubject(instance.evolution_instance_id, remoteJid, supabase);
            if (realName) {
                console.log(`New Group found. Real name: ${realName}`);
                initialName = realName;
            }
        }


        const { data: newChatContact, error } = await supabase
            .from("whatsapp_contacts")
            .upsert({
                company_id: instance.company_id,
                remote_jid: remoteJid,
                name: initialName,
                is_group: isGroup
            }, { onConflict: 'company_id, remote_jid' })
            .select()
            .single();

        if (!error && newChatContact) {
            chatContactId = newChatContact.id;
        } else {
            // Fallback if upsert failed (race condition)
            const { data: retry } = await supabase
                .from("whatsapp_contacts")
                .select("id")
                .eq("company_id", instance.company_id)
                .eq("remote_jid", remoteJid)
                .single();
            chatContactId = retry?.id;
        }
    }

    if (!chatContactId) {
        console.error("Could not resolve ChatContactId");
        return;
    }

    // --- 2. Sender ID ---
    let senderId = chatContactId; // Default for private chats

    if (isGroup && participant) {
        // Ensure participant exists
        const { data: partContact } = await supabase
            .from("whatsapp_contacts")
            .select("id")
            .eq("company_id", instance.company_id)
            .eq("remote_jid", participant)
            .single();

        if (partContact) {
            senderId = partContact.id;
        } else {
            // Create participant
            const { data: newPart } = await supabase
                .from("whatsapp_contacts")
                .insert({
                    company_id: instance.company_id,
                    remote_jid: participant,
                    name: data.pushName || "Member",
                    is_group: false
                })
                .select()
                .single();
            if (newPart) senderId = newPart.id;
        }
    }

    // --- 3. Chat Session ---
    let chatId;
    const { data: chat } = await supabase
        .from("whatsapp_chats")
        .select("id, unread_count")
        .eq("instance_id", instance.id)
        .eq("remote_jid", remoteJid)
        .single();

    if (chat) {
        chatId = chat.id;
        await supabase
            .from("whatsapp_chats")
            .update({
                last_message_at: new Date().toISOString(),
                unread_count: fromMe ? chat.unread_count : chat.unread_count + 1,
            })
            .eq("id", chatId);
    } else {
        const { data: newChat } = await supabase
            .from("whatsapp_chats")
            .insert({
                instance_id: instance.id,
                contact_id: chatContactId,
                remote_jid: remoteJid,
                last_message_at: new Date().toISOString(),
                unread_count: fromMe ? 0 : 1,
            })
            .select()
            .single();
        chatId = newChat?.id;
    }

    // --- 4. Insert Message ---

    const messageType = data.messageType || "conversation";

    // Extract media data and upload to storage
    const { mediaUrl, mediaType, caption } = await extractAndStoreMedia(
        supabase,
        messageData,
        instance.id,
        instance.evolution_instance_id, // Instance name for Evolution API
        { id: key.id, remoteJid: rawRemoteJid, fromMe: fromMe }, // Message key for Evolution API
        logDebug // Pass logDebug function
    );

    // Get text content
    const getText = (msg: any) => {
        if (!msg) return '';
        if (msg.conversation) return msg.conversation;
        if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
        return '';
    };

    // Use caption from media if available, otherwise get text
    let content = caption || getText(messageData);

    // If still no content, use a placeholder based on type
    if (!content) {
        if (mediaType === 'viewOnce') {
            content = '🔒 Mensagem de visualização única';
        } else if (mediaType) {
            content = `[${mediaType}]`;
        } else {
            content = `[${messageType}]`;
        }
    }

    const result = await supabase.from("whatsapp_messages").insert({
        chat_id: chatId,
        instance_id: instance.id,
        content: content,
        media_url: mediaUrl,
        media_type: mediaType,
        direction: fromMe ? "outbound" : "inbound",
        status: "delivered",
        evolution_message_id: key.id,
        sender_id: senderId
    });

    if (result.error) {
        await logDebug(supabase, `INSERT ERROR: ${result.error.message}`);
    } else {
        await logDebug(supabase, `INSERT SUCCESS: MsgID=${key.id} ChatID=${chatId} MediaType=${mediaType || 'none'}`);
    }

    // --- 5. Lead Automation (Simplified) ---
    if (!fromMe && !isGroup) {
        // Check if we have a saved_name for this contact (from user's phonebook)
        const { data: contactWithSavedName } = await supabase
            .from("whatsapp_contacts")
            .select("saved_name")
            .eq("company_id", instance.company_id)
            .eq("remote_jid", remoteJid)
            .single();
        const displayName = contactWithSavedName?.saved_name || data.pushName;
        await handleLeadUpsert(supabase, instance, remoteJid, displayName, content);
    }

    // --- 6. FLOW AUTOMATION ENGINE ---
    if (!fromMe && !isGroup) {
        await handleFlowAutomation(supabase, instance, chatContactId, chatId, content, existingChatContact === null);
    }

    async function handleLeadUpsert(supabase: any, instance: any, remoteJid: string, pushName: string, lastMessage: string) {
        const phoneDigits = normalizePhone(remoteJid);
        const leadLookup = buildPhoneCandidates(remoteJid);
        const shortMessage = lastMessage ? lastMessage.substring(0, 100) : "Mídia/Outros";

        let existingLead: any = null;
        if (leadLookup.length > 0) {
            const { data: leadMatches } = await supabase
                .from("leads")
                .select("id, telefone, nome")
                .eq("company_id", instance.company_id)
                .in("telefone", leadLookup)
                .limit(1);
            existingLead = leadMatches?.[0] || null;
        }

        if (existingLead) {
            const leadUpdates: any = {
                last_message_at: new Date().toISOString(),
                last_message: shortMessage
            };

            await supabase
                .from("leads")
                .update(leadUpdates)
                .eq("id", existingLead.id);
        } else if (phoneDigits) {
            // Fetch company's default status from status_type array
            const { data: company } = await supabase
                .from("company")
                .select("status_type")
                .eq("id", instance.company_id)
                .single();

            // Use first status from company settings, fallback to "Novos"
            const defaultStatus = company?.status_type?.[0] || 'Novos';

            await supabase
                .from("leads")
                .insert({
                    company_id: instance.company_id,
                    responsavel_id: instance.user_id || null,  // CRITICAL FIX: Assign to instance owner
                    telefone: phoneDigits,
                    nome: pushName || phoneDigits,
                    status: defaultStatus,
                    source: 'whatsapp',
                    last_message_at: new Date().toISOString(),
                    last_message: shortMessage
                });
        }
    }

    async function handleFlowAutomation(
        supabase: any,
        instance: any,
        contactId: string,
        chatId: string,
        messageContent: string,
        isNewContact: boolean
    ) {
        try {
            // Import flow engine functions dynamically
            const {
                checkPauseRules,
                findWaitingExecution,
                checkTriggers,
                startFlow,
                continueExecution
            } = await import('./flowEngine.ts');

            // Check if automation is paused
            const pauseResult = await checkPauseRules(supabase, instance.company_id, contactId);
            if (pauseResult.isPaused) {
                await logDebug(supabase, `[Flow] Automation paused: ${pauseResult.reason}`);
                return;
            }

            // Get contact data for context
            const { data: contactData } = await supabase
                .from('whatsapp_contacts')
                .select('*')
                .eq('id', contactId)
                .single();

            // Check for execution waiting for response
            const waitingExecution = await findWaitingExecution(supabase, contactId);

            if (waitingExecution) {
                await logDebug(supabase, `[Flow] Found waiting execution: ${waitingExecution.id}`);

                // Get the full flow
                const { data: flow } = await supabase
                    .from('automation_flows')
                    .select('*')
                    .eq('id', waitingExecution.flow_id)
                    .single();

                if (flow) {
                    await continueExecution(
                        supabase,
                        waitingExecution,
                        flow,
                        messageContent,
                        instance,
                        evolutionApiUrl,
                        evolutionApiKey
                    );
                }
            } else {
                // Check triggers for new flow
                const triggerMatch = await checkTriggers(
                    supabase,
                    instance.company_id,
                    contactId,
                    messageContent,
                    isNewContact
                );

                if (triggerMatch) {
                    await logDebug(supabase, `[Flow] Trigger matched: ${triggerMatch.trigger.type} -> Flow: ${triggerMatch.flow.name}`);

                    await startFlow(
                        supabase,
                        triggerMatch.flow,
                        triggerMatch.trigger,
                        contactId,
                        chatId,
                        instance.id,
                        instance,
                        contactData,
                        evolutionApiUrl,
                        evolutionApiKey
                    );
                }
            }
        } catch (flowError: any) {
            await logDebug(supabase, `[Flow] Error: ${flowError.message}`);
            console.error('[Flow] Automation error:', flowError);
        }
    }
}

