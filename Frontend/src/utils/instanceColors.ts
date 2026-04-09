/**
 * Utilitário para gerar cores consistentes por instância do WhatsApp
 * Cada instância terá sempre a mesma cor baseada em seu ID
 */

// Paleta de cores vibrantes mas profissionais
const INSTANCE_COLORS = [
    { bg: '#8B5CF6', text: '#FFFFFF' }, // Violet
    { bg: '#06B6D4', text: '#FFFFFF' }, // Cyan
    { bg: '#F59E0B', text: '#000000' }, // Amber
    { bg: '#10B981', text: '#FFFFFF' }, // Emerald
    { bg: '#EC4899', text: '#FFFFFF' }, // Pink
    { bg: '#3B82F6', text: '#FFFFFF' }, // Blue
    { bg: '#EF4444', text: '#FFFFFF' }, // Red
    { bg: '#84CC16', text: '#000000' }, // Lime
];

/**
 * Gera uma cor consistente baseada no ID da instância
 * @param instanceId - UUID ou string identificador da instância
 * @returns Objeto com cores de background e texto
 */
export function getInstanceColor(instanceId: string): { bg: string; text: string } {
    if (!instanceId) return INSTANCE_COLORS[0];

    // Gera hash simples do ID para índice consistente
    const hash = instanceId.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    const index = Math.abs(hash) % INSTANCE_COLORS.length;
    return INSTANCE_COLORS[index];
}

/**
 * Retorna todas as cores disponíveis (útil para legenda ou configuração)
 */
export function getAllInstanceColors() {
    return INSTANCE_COLORS;
}
