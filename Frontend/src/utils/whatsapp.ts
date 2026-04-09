/**
 * Normalizes a WhatsApp JID to ensure consistent format.
 * - Removes @lid
 * - Converts @c.us to @s.whatsapp.net
 * - Appends @s.whatsapp.net to raw numbers
 * - Preserves @g.us for groups
 */
export const normalizeJid = (jid: string): string => {
    if (!jid) return '';

    // If it's a group, ensure it ends with @g.us and has no other suffix like @lid
    if (jid.includes('@g.us')) {
        // Groups usually look like 120363048566548@g.us
        // If it has complex suffix (unlikely for groups but possible in some contexts), strip and ensure @g.us
        const parts = jid.split('@');
        return `${parts[0]}@g.us`;
    }

    // Handle Individual Numbers
    // Remove specific @lid suffix if present anywhere
    let cleanJid = jid.replace(/@lid\.whatsapp\.net/g, '').replace(/@lid/g, '');

    // Replace old @c.us with standard @s.whatsapp.net
    if (cleanJid.includes('@c.us')) {
        cleanJid = cleanJid.replace('@c.us', '@s.whatsapp.net');
    }

    // If no domain at all, append @s.whatsapp.net
    if (!cleanJid.includes('@')) {
        // Remove non-numeric chars just in case, but keep it simple
        cleanJid = `${cleanJid}@s.whatsapp.net`;
    }

    // Ensure it ends with @s.whatsapp.net if it's not a group (and wasn't just fixed above)
    // This handles cases like "12345" which became "12345@s.whatsapp.net" above.
    // But if we had "12345@lid" -> "12345" -> "12345@s.whatsapp.net"

    // Final sanity check: if it still doesn't have @s.whatsapp.net (and isn't group), force it?
    // The previous logic covers it.

    return cleanJid;
};

/**
 * Sanitizes and formats text payload for WhatsApp/Evolution API.
 * Converts HTML line breaks to \n, removes redundant HTML tags,
 * standardizes \r\n to \n, and caps multiple blank lines.
 */
export function formatWhatsAppMessage(dirtyText: string | undefined | null): string {
    if (!dirtyText) return '';

    return dirtyText
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div)>/gi, '\n\n')
        .replace(/(<([^>]+)>)/gi, '')
        .replace(/\r\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
