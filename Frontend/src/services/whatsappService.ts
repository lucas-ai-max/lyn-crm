import { supabase } from "@/integrations/supabase/client";
import { normalizeJid, formatWhatsAppMessage } from "@/utils/whatsapp";

const BACKEND_URL = '/api';

const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
    };
};

export const whatsappService = {
    async listInstances() {
        const { data, error } = await supabase
            .from('lyn_whatsapp_instances')
            .select('*')
            .neq('status', 'deleted')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching instances:', error);
            throw error;
        }
        return data || [];
    },

    async createInstance(name: string) {
        const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
            body: { action: 'createInstance', payload: { name } }
        });

        if (error) {
            console.error('Create Instance Error:', error);
            throw new Error(error.message || 'Failed to create instance');
        }
        return data;
    },

    async connectInstance(evolutionId: string) {
        // evolutionId corresponds to the 'evolution_instance_id' column
        const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
            body: { action: 'connectInstance', payload: { instanceId: evolutionId } }
        });

        if (error) {
            console.error('Connect Instance Error:', error);
            throw new Error(error.message || 'Failed to connect instance');
        }
        return data;
    },

    async configureWebhook(evolutionId: string) {
        // Now invoking the real Edge Function action
        const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
            body: { action: 'configureWebhook', payload: { instanceId: evolutionId } }
        });

        if (error) {
            console.error('Configure Webhook Error:', error);
            throw new Error(error.message || 'Failed to configure webhook');
        }
        return data;
    },

    async deleteInstance(id: string, evolutionId: string) {
        const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
            body: { action: 'deleteInstance', payload: { dbId: id, instanceId: evolutionId } }
        });

        if (error) throw new Error(error.message || 'Failed to delete instance');
        return data;
    },

    async syncInstance(id: string, evolutionId: string) {
        const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
            body: { action: 'syncInstance', payload: { dbId: id, instanceId: evolutionId } }
        });

        if (error) {
            console.error('Sync Instance Error:', error);
            throw new Error(error.message || 'Failed to sync instance');
        }
        return data;
    },

    async sendMessage(instanceId: string, number: string, text: string) {
        const normalizedNumber = normalizeJid(number);
        const formattedText = formatWhatsAppMessage(text);

        const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
            body: {
                action: 'sendMessage',
                payload: { instanceId, number: normalizedNumber, text: formattedText }
            }
        });

        if (error) {
            console.error('Send Message Error:', error);
            throw new Error(error.message || 'Failed to send message');
        }
        return data;
    },

    async sendMediaMessage(
        instanceId: string,
        number: string,
        file: File,
        caption?: string
    ) {
        const normalizedNumber = normalizeJid(number);
        const formattedCaption = formatWhatsAppMessage(caption);

        // Determine media type from MIME type
        const getMediaType = (mimeType: string): string => {
            if (mimeType.startsWith('image/')) return 'image';
            if (mimeType.startsWith('video/')) return 'video';
            if (mimeType.startsWith('audio/')) return 'audio';
            return 'document';
        };

        const mediaType = getMediaType(file.type);

        // 1. Upload file to Supabase Storage
        const timestamp = Date.now();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${instanceId}/outbound_${timestamp}_${safeFileName}`;

        console.log(`[Media] Uploading ${file.name} to ${filePath}`);

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('whatsapp-media')
            .upload(filePath, file, {
                contentType: file.type,
                upsert: true
            });

        if (uploadError) {
            console.error('Media Upload Error:', uploadError);
            throw new Error(uploadError.message || 'Failed to upload media');
        }

        // 2. Get public URL
        const { data: publicUrlData } = supabase.storage
            .from('whatsapp-media')
            .getPublicUrl(filePath);

        const mediaUrl = publicUrlData?.publicUrl;

        if (!mediaUrl) {
            throw new Error('Failed to get public URL for media');
        }

        console.log(`[Media] Uploaded successfully. URL: ${mediaUrl}`);

        // 3. Call Edge Function to send media
        const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
            body: {
                action: 'sendMedia',
                payload: {
                    instanceId,
                    number: normalizedNumber,
                    mediaUrl,
                    mediaType,
                    mimeType: file.type,
                    fileName: file.name,
                    caption: formattedCaption
                }
            }
        });

        if (error) {
            console.error('Send Media Error:', error);
            throw new Error(error.message || 'Failed to send media');
        }
        return data;
    }
};
