-- Enable Realtime for WhatsApp tables
-- This ensures that the frontend receives live updates for new messages and chat list changes.

ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_chats;
