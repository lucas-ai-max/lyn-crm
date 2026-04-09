import { DragEvent } from 'react';
import { Zap, MessageSquare, Clock, GitBranch, Settings, Webhook, Shuffle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NodeType {
    type: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
}

const nodeCategories = [
    {
        name: 'Gatilhos',
        nodes: [
            {
                type: 'trigger',
                label: 'Gatilho',
                description: 'Ponto de entrada do fluxo',
                icon: <Zap className="w-4 h-4" />,
                color: 'bg-green-600'
            }
        ]
    },
    {
        name: 'Mensagens',
        nodes: [
            {
                type: 'message',
                label: 'Enviar Mensagem',
                description: 'Envia texto ou mídia',
                icon: <MessageSquare className="w-4 h-4" />,
                color: 'bg-blue-600'
            },
            {
                type: 'waitResponse',
                label: 'Aguardar Resposta',
                description: 'Espera resposta do usuário',
                icon: <Clock className="w-4 h-4" />,
                color: 'bg-amber-600'
            }
        ]
    },
    {
        name: 'Lógica',
        nodes: [
            {
                type: 'condition',
                label: 'Condição',
                description: 'Ramificação por condição',
                icon: <GitBranch className="w-4 h-4" />,
                color: 'bg-purple-600'
            },
            {
                type: 'randomPath',
                label: 'Caminho Aleatório',
                description: 'A/B Test',
                icon: <Shuffle className="w-4 h-4" />,
                color: 'bg-indigo-600'
            },
            {
                type: 'delay',
                label: 'Esperar',
                description: 'Aguarda tempo definido',
                icon: <Clock className="w-4 h-4" />,
                color: 'bg-slate-600'
            }
        ]
    },
    {
        name: 'Ações',
        nodes: [
            {
                type: 'action',
                label: 'Ação CRM',
                description: 'Tags, leads, notificações',
                icon: <Settings className="w-4 h-4" />,
                color: 'bg-rose-600'
            },
            {
                type: 'webhook',
                label: 'Webhook',
                description: 'Chamada HTTP externa',
                icon: <Webhook className="w-4 h-4" />,
                color: 'bg-cyan-600'
            }
        ]
    },
    {
        name: 'Fluxo',
        nodes: [
            {
                type: 'end',
                label: 'Finalizar',
                description: 'Encerra o fluxo',
                icon: <XCircle className="w-4 h-4" />,
                color: 'bg-gray-600'
            }
        ]
    }
];

interface NodePaletteProps {
    className?: string;
}

export function NodePalette({ className }: NodePaletteProps) {
    const onDragStart = (event: DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className={cn("w-64 border-r bg-muted/30 p-4 overflow-y-auto", className)}>
            <h3 className="text-sm font-semibold text-foreground mb-4">Blocos</h3>

            <div className="space-y-6">
                {nodeCategories.map((category) => (
                    <div key={category.name}>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                            {category.name}
                        </h4>

                        <div className="space-y-2">
                            {category.nodes.map((node) => (
                                <div
                                    key={node.type}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, node.type)}
                                    className={cn(
                                        "flex items-center gap-3 p-2.5 rounded-lg cursor-grab",
                                        "bg-card border border-border shadow-sm",
                                        "hover:shadow-md hover:border-primary/50 transition-all",
                                        "active:cursor-grabbing active:scale-95"
                                    )}
                                >
                                    <div className={cn("p-2 rounded-md text-white", node.color)}>
                                        {node.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-foreground truncate">
                                            {node.label}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            {node.description}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">
                    <strong>Dica:</strong> Arraste os blocos para o canvas e conecte-os para criar seu fluxo!
                </p>
            </div>
        </div>
    );
}
