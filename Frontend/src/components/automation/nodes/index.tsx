import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Zap, MessageSquare, Clock, GitBranch, Settings, Webhook, Shuffle, XCircle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BaseNodeProps extends NodeProps {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    color: string;
    hasInput?: boolean;
    hasOutput?: boolean;
    outputCount?: number;
    outputLabels?: string[];
    children?: React.ReactNode;
}

const BaseNode = memo(({
    icon,
    title,
    subtitle,
    color,
    hasInput = true,
    hasOutput = true,
    outputCount = 1,
    outputLabels,
    children,
    selected
}: BaseNodeProps) => {
    return (
        <div
            className={cn(
                "min-w-[200px] rounded-lg border-2 bg-card shadow-lg transition-all",
                selected ? "border-primary ring-2 ring-primary/20" : "border-border",
                "hover:shadow-xl"
            )}
        >
            {/* Input Handle */}
            {hasInput && (
                <Handle
                    type="target"
                    position={Position.Top}
                    className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
                />
            )}

            {/* Header */}
            <div className={cn("flex items-center gap-2 p-3 rounded-t-lg", color)}>
                <div className="p-1.5 bg-white/20 rounded-md">
                    {icon}
                </div>
                <div>
                    <div className="font-semibold text-white text-sm">{title}</div>
                    {subtitle && <div className="text-xs text-white/70">{subtitle}</div>}
                </div>
            </div>

            {/* Content */}
            {children && (
                <div className="p-3 text-sm text-muted-foreground">
                    {children}
                </div>
            )}

            {/* Output Handles */}
            {hasOutput && (
                <>
                    {outputCount === 1 ? (
                        <Handle
                            type="source"
                            position={Position.Bottom}
                            className="!w-3 !h-3 !bg-primary !border-2 !border-background"
                        />
                    ) : (
                        outputLabels?.map((label, index) => (
                            <Handle
                                key={label}
                                type="source"
                                position={Position.Bottom}
                                id={label}
                                className="!w-3 !h-3 !bg-primary !border-2 !border-background"
                                style={{
                                    left: `${((index + 1) / (outputCount + 1)) * 100}%`,
                                }}
                            />
                        ))
                    )}
                </>
            )}
        </div>
    );
});

BaseNode.displayName = 'BaseNode';

// ============================================
// TRIGGER NODE
// ============================================

export const TriggerNode = memo(({ data, selected }: NodeProps) => {
    const triggerType = data.triggerType || 'keyword_exact';
    const keywords = data.keywords?.join(', ') || 'Digite palavras-chave...';

    const typeLabels: Record<string, string> = {
        'keyword_exact': 'Palavra-chave exata',
        'keyword_contains': 'Contém palavra',
        'first_message': 'Primeira mensagem',
        'regex': 'Expressão regular'
    };

    return (
        <BaseNode
            icon={<Zap className="w-4 h-4 text-white" />}
            title="Gatilho"
            subtitle={typeLabels[triggerType]}
            color="bg-green-600"
            hasInput={false}
            selected={selected}
            data={data}
            id=""
            type=""
        >
            <div className="text-xs bg-muted p-2 rounded font-mono">
                {triggerType === 'first_message' ? 'Qualquer primeira mensagem' : keywords}
            </div>
        </BaseNode>
    );
});

TriggerNode.displayName = 'TriggerNode';

// ============================================
// MESSAGE NODE
// ============================================

export const MessageNode = memo(({ data, selected }: NodeProps) => {
    const content = data.content || 'Digite sua mensagem...';
    const hasMedia = !!data.mediaUrl;

    return (
        <BaseNode
            icon={<MessageSquare className="w-4 h-4 text-white" />}
            title="Enviar Mensagem"
            subtitle={hasMedia ? 'Com mídia' : 'Texto'}
            color="bg-blue-600"
            selected={selected}
            data={data}
            id=""
            type=""
        >
            <div className="text-xs bg-muted p-2 rounded line-clamp-3">
                {content}
            </div>
            {data.delay > 0 && (
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Delay: {data.delay}s
                </div>
            )}
        </BaseNode>
    );
});

MessageNode.displayName = 'MessageNode';

// ============================================
// WAIT RESPONSE NODE
// ============================================

export const WaitResponseNode = memo(({ data, selected }: NodeProps) => {
    const variableName = data.variableName || 'resposta';
    const timeout = data.timeoutMinutes || 60;

    return (
        <BaseNode
            icon={<Clock className="w-4 h-4 text-white" />}
            title="Aguardar Resposta"
            subtitle={`Salvar em: {{${variableName}}}`}
            color="bg-amber-600"
            selected={selected}
            data={data}
            id=""
            type=""
        >
            <div className="text-xs text-muted-foreground">
                Timeout: {timeout} minutos
            </div>
            {data.validation && (
                <div className="text-xs text-muted-foreground mt-1">
                    Validação: {data.validation.type}
                </div>
            )}
        </BaseNode>
    );
});

WaitResponseNode.displayName = 'WaitResponseNode';

// ============================================
// CONDITION NODE
// ============================================

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
    const conditions = data.conditions || [];
    const variable = data.variable || 'resposta';
    const outputs = conditions.map((c: any) => c.output || c.id).concat(['default']);

    return (
        <BaseNode
            icon={<GitBranch className="w-4 h-4 text-white" />}
            title="Condição"
            subtitle={`Avaliar: {{${variable}}}`}
            color="bg-purple-600"
            selected={selected}
            outputCount={outputs.length}
            outputLabels={outputs}
            data={data}
            id=""
            type=""
        >
            <div className="space-y-1">
                {conditions.slice(0, 3).map((cond: any, idx: number) => (
                    <div key={idx} className="text-xs bg-muted p-1.5 rounded flex justify-between">
                        <span>{cond.operator}: {cond.value}</span>
                        <span className="text-primary">→ {cond.output}</span>
                    </div>
                ))}
                {conditions.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                        +{conditions.length - 3} mais condições
                    </div>
                )}
                <div className="text-xs bg-muted/50 p-1.5 rounded text-muted-foreground">
                    Padrão → default
                </div>
            </div>
        </BaseNode>
    );
});

ConditionNode.displayName = 'ConditionNode';

// ============================================
// ACTION NODE
// ============================================

export const ActionNode = memo(({ data, selected }: NodeProps) => {
    const actionType = data.actionType || 'add_tag';

    const actionLabels: Record<string, string> = {
        'add_tag': 'Adicionar Tag',
        'remove_tag': 'Remover Tag',
        'update_lead': 'Atualizar Lead',
        'notify_user': 'Notificar Usuário',
        'create_deal': 'Criar Negócio'
    };

    return (
        <BaseNode
            icon={<Settings className="w-4 h-4 text-white" />}
            title="Ação CRM"
            subtitle={actionLabels[actionType]}
            color="bg-rose-600"
            selected={selected}
            data={data}
            id=""
            type=""
        >
            <div className="text-xs bg-muted p-2 rounded">
                {actionType === 'add_tag' && `Tag: ${data.tagName || '...'}`}
                {actionType === 'update_lead' && `Campo: ${data.field || '...'}`}
                {actionType === 'notify_user' && `Usuário: ${data.userId || 'Responsável'}`}
            </div>
        </BaseNode>
    );
});

ActionNode.displayName = 'ActionNode';

// ============================================
// WEBHOOK NODE
// ============================================

export const WebhookNode = memo(({ data, selected }: NodeProps) => {
    const method = data.method || 'POST';
    const url = data.url || 'https://...';

    return (
        <BaseNode
            icon={<Webhook className="w-4 h-4 text-white" />}
            title="Webhook"
            subtitle={method}
            color="bg-cyan-600"
            selected={selected}
            data={data}
            id=""
            type=""
        >
            <div className="text-xs bg-muted p-2 rounded font-mono truncate">
                {url}
            </div>
            {data.saveResponseAs && (
                <div className="text-xs text-muted-foreground mt-1">
                    Salvar em: {`{{${data.saveResponseAs}}}`}
                </div>
            )}
        </BaseNode>
    );
});

WebhookNode.displayName = 'WebhookNode';

// ============================================
// DELAY NODE
// ============================================

export const DelayNode = memo(({ data, selected }: NodeProps) => {
    const seconds = data.delaySeconds || 0;
    const minutes = data.delayMinutes || 0;

    let displayTime = '';
    if (minutes > 0) displayTime += `${minutes}min `;
    if (seconds > 0) displayTime += `${seconds}s`;
    if (!displayTime) displayTime = 'Configurar...';

    return (
        <BaseNode
            icon={<Clock className="w-4 h-4 text-white" />}
            title="Esperar"
            subtitle={displayTime.trim()}
            color="bg-slate-600"
            selected={selected}
            data={data}
            id=""
            type=""
        />
    );
});

DelayNode.displayName = 'DelayNode';

// ============================================
// RANDOM PATH NODE
// ============================================

export const RandomPathNode = memo(({ data, selected }: NodeProps) => {
    const paths = data.paths || [{ id: 'a', weight: 1 }, { id: 'b', weight: 1 }];
    const outputs = paths.map((p: any) => p.id);

    return (
        <BaseNode
            icon={<Shuffle className="w-4 h-4 text-white" />}
            title="Caminho Aleatório"
            subtitle="A/B Test"
            color="bg-indigo-600"
            selected={selected}
            outputCount={outputs.length}
            outputLabels={outputs}
            data={data}
            id=""
            type=""
        >
            <div className="space-y-1">
                {paths.map((path: any) => (
                    <div key={path.id} className="text-xs bg-muted p-1.5 rounded flex justify-between">
                        <span>Caminho {path.id.toUpperCase()}</span>
                        <span className="text-muted-foreground">{path.weight || 1}x</span>
                    </div>
                ))}
            </div>
        </BaseNode>
    );
});

RandomPathNode.displayName = 'RandomPathNode';

// ============================================
// END NODE
// ============================================

export const EndNode = memo(({ data, selected }: NodeProps) => {
    const finishStatus = data.finishStatus || 'completed';

    const statusLabels: Record<string, string> = {
        'completed': 'Concluído com sucesso',
        'cancelled': 'Cancelado',
        'transfer_human': 'Transferir para humano'
    };

    const statusColors: Record<string, string> = {
        'completed': 'bg-green-600',
        'cancelled': 'bg-gray-600',
        'transfer_human': 'bg-orange-600'
    };

    return (
        <BaseNode
            icon={<XCircle className="w-4 h-4 text-white" />}
            title="Finalizar"
            subtitle={statusLabels[finishStatus]}
            color={statusColors[finishStatus] || 'bg-gray-600'}
            hasOutput={false}
            selected={selected}
            data={data}
            id=""
            type=""
        />
    );
});

EndNode.displayName = 'EndNode';

// ============================================
// NODE TYPES EXPORT
// ============================================

export const nodeTypes = {
    trigger: TriggerNode,
    message: MessageNode,
    waitResponse: WaitResponseNode,
    condition: ConditionNode,
    action: ActionNode,
    webhook: WebhookNode,
    delay: DelayNode,
    randomPath: RandomPathNode,
    end: EndNode,
};
