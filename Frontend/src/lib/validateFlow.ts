import { Node, Edge } from '@xyflow/react';

export interface ValidationError {
    nodeId?: string;
    type: 'error' | 'warning';
    message: string;
}

export function validateFlow(nodes: Node[], edges: Edge[]): ValidationError[] {
    const errors: ValidationError[] = [];

    // 1. Must have at least one trigger node
    const hasTrigger = nodes.some((n) => n.type === 'trigger');
    if (!hasTrigger) {
        errors.push({
            type: 'error',
            message: 'O fluxo precisa ter pelo menos um bloco Gatilho',
        });
    }

    // 2. Recommended to have at least one end node
    const hasEnd = nodes.some((n) => n.type === 'end');
    if (!hasEnd) {
        errors.push({
            type: 'warning',
            message: 'Recomendado: adicione um bloco Finalizar',
        });
    }

    // 3. Check for orphan nodes (not connected to anything except triggers)
    const connectedNodeIds = new Set<string>();
    edges.forEach((e) => {
        connectedNodeIds.add(e.source);
        connectedNodeIds.add(e.target);
    });

    nodes.forEach((n) => {
        // Triggers don't need incoming connections
        if (n.type === 'trigger') return;
        // End nodes don't need outgoing connections
        if (n.type === 'end') return;

        if (!connectedNodeIds.has(n.id)) {
            errors.push({
                nodeId: n.id,
                type: 'error',
                message: `Bloco "${n.type}" não está conectado ao fluxo`,
            });
        }
    });

    // 4. Message nodes must have content
    nodes
        .filter((n) => n.type === 'message')
        .forEach((n) => {
            if (!n.data?.content || n.data.content.trim() === '') {
                errors.push({
                    nodeId: n.id,
                    type: 'error',
                    message: 'Bloco Mensagem está sem conteúdo',
                });
            }
        });

    // 5. WaitResponse nodes must have a variable name
    nodes
        .filter((n) => n.type === 'waitResponse')
        .forEach((n) => {
            if (!n.data?.variableName || n.data.variableName.trim() === '') {
                errors.push({
                    nodeId: n.id,
                    type: 'warning',
                    message: 'Bloco Aguardar Resposta sem nome de variável',
                });
            }
        });

    // 6. Webhook nodes must have a URL
    nodes
        .filter((n) => n.type === 'webhook')
        .forEach((n) => {
            if (!n.data?.url || n.data.url.trim() === '') {
                errors.push({
                    nodeId: n.id,
                    type: 'error',
                    message: 'Bloco Webhook está sem URL',
                });
            }
        });

    // 7. Check if trigger nodes with keyword type have keywords
    nodes
        .filter((n) => n.type === 'trigger')
        .forEach((n) => {
            const triggerType = n.data?.triggerType || 'keyword_exact';
            if (triggerType === 'keyword_exact' || triggerType === 'keyword_contains') {
                const keywords = n.data?.keywords || [];
                if (keywords.length === 0) {
                    errors.push({
                        nodeId: n.id,
                        type: 'error',
                        message: 'Gatilho está sem palavras-chave configuradas',
                    });
                }
            }
        });

    return errors;
}
