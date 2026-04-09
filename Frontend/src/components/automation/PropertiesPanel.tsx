import { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { X, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VariablePicker } from './VariablePicker';

interface PropertiesPanelProps {
    selectedNode: Node | null;
    onUpdateNode: (nodeId: string, data: any) => void;
    onDeleteNode?: (nodeId: string) => void;
    onClose: () => void;
    className?: string;
}

export function PropertiesPanel({ selectedNode, onUpdateNode, onDeleteNode, onClose, className }: PropertiesPanelProps) {
    const [localData, setLocalData] = useState<any>({});

    useEffect(() => {
        if (selectedNode) {
            setLocalData(selectedNode.data || {});
        }
    }, [selectedNode]);

    if (!selectedNode) {
        return (
            <div className={cn("w-80 border-l bg-muted/30 p-4", className)}>
                <p className="text-sm text-muted-foreground text-center mt-10">
                    Selecione um bloco para editar suas propriedades
                </p>
            </div>
        );
    }

    const updateData = (key: string, value: any) => {
        const newData = { ...localData, [key]: value };
        setLocalData(newData);
        onUpdateNode(selectedNode.id, newData);
    };

    const renderTriggerProperties = () => (
        <>
            <div className="space-y-2">
                <Label>Tipo de Gatilho</Label>
                <Select value={localData.triggerType || 'keyword_exact'} onValueChange={(v) => updateData('triggerType', v)}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="keyword_exact">Palavra-chave exata</SelectItem>
                        <SelectItem value="keyword_contains">Contém palavra</SelectItem>
                        <SelectItem value="first_message">Primeira mensagem</SelectItem>
                        <SelectItem value="regex">Expressão regular</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {(localData.triggerType === 'keyword_exact' || localData.triggerType === 'keyword_contains' || !localData.triggerType) && (
                <div className="space-y-2">
                    <Label>Palavras-chave (separadas por vírgula)</Label>
                    <Input
                        value={(localData.keywords || []).join(', ')}
                        onChange={(e) => updateData('keywords', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="oi, olá, hello"
                    />
                </div>
            )}

            {localData.triggerType === 'regex' && (
                <div className="space-y-2">
                    <Label>Padrão Regex</Label>
                    <Input
                        value={localData.pattern || ''}
                        onChange={(e) => updateData('pattern', e.target.value)}
                        placeholder="^[0-9]+$"
                    />
                </div>
            )}

            <div className="flex items-center justify-between">
                <Label>Ignorar maiúsculas/minúsculas</Label>
                <Switch
                    checked={!localData.case_sensitive}
                    onCheckedChange={(v) => updateData('case_sensitive', !v)}
                />
            </div>
        </>
    );

    const renderMessageProperties = () => (
        <>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label>Mensagem</Label>
                    <VariablePicker
                        onSelect={(variable) => {
                            const newContent = (localData.content || '') + variable;
                            updateData('content', newContent);
                        }}
                    />
                </div>
                <Textarea
                    value={localData.content || ''}
                    onChange={(e) => updateData('content', e.target.value)}
                    placeholder="Olá {{contact.name}}! Como posso ajudar?"
                    rows={4}
                />
                <p className="text-xs text-muted-foreground">
                    Use o botão acima para inserir variáveis dinâmicas
                </p>
            </div>

            <div className="space-y-2">
                <Label>URL da Mídia (opcional)</Label>
                <Input
                    value={localData.mediaUrl || ''}
                    onChange={(e) => updateData('mediaUrl', e.target.value)}
                    placeholder="https://..."
                />
            </div>

            <div className="space-y-2">
                <Label>Delay antes de enviar (segundos)</Label>
                <Input
                    type="number"
                    value={localData.delay || 0}
                    onChange={(e) => updateData('delay', parseInt(e.target.value) || 0)}
                    min={0}
                    max={30}
                />
            </div>
        </>
    );

    const renderWaitResponseProperties = () => (
        <>
            <div className="space-y-2">
                <Label>Salvar resposta na variável</Label>
                <Input
                    value={localData.variableName || ''}
                    onChange={(e) => updateData('variableName', e.target.value)}
                    placeholder="nome_usuario"
                />
            </div>

            <div className="space-y-2">
                <Label>Timeout (minutos)</Label>
                <Input
                    type="number"
                    value={localData.timeoutMinutes || 60}
                    onChange={(e) => updateData('timeoutMinutes', parseInt(e.target.value) || 60)}
                    min={1}
                    max={1440}
                />
            </div>

            <div className="space-y-2">
                <Label>Tipo de validação</Label>
                <Select
                    value={localData.validation?.type || 'none'}
                    onValueChange={(v) => updateData('validation', v === 'none' ? null : { type: v })}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="number">Número</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Telefone</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </>
    );

    const renderConditionProperties = () => {
        const conditions = localData.conditions || [];

        return (
            <>
                <div className="space-y-2">
                    <Label>Variável a avaliar</Label>
                    <Input
                        value={localData.variable || ''}
                        onChange={(e) => updateData('variable', e.target.value)}
                        placeholder="user_response"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Condições</Label>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateData('conditions', [...conditions, { id: `c${Date.now()}`, operator: 'contains', value: '', output: `saida${conditions.length + 1}` }])}
                        >
                            <Plus className="w-3 h-3 mr-1" />
                            Adicionar
                        </Button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {conditions.map((cond: any, idx: number) => (
                            <div key={cond.id || idx} className="p-2 bg-muted rounded-lg space-y-2">
                                <div className="flex gap-2">
                                    <Select
                                        value={cond.operator}
                                        onValueChange={(v) => {
                                            const updated = [...conditions];
                                            updated[idx].operator = v;
                                            updateData('conditions', updated);
                                        }}
                                    >
                                        <SelectTrigger className="w-32">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="equals">Igual a</SelectItem>
                                            <SelectItem value="not_equals">Diferente de</SelectItem>
                                            <SelectItem value="contains">Contém</SelectItem>
                                            <SelectItem value="not_contains">Não contém</SelectItem>
                                            <SelectItem value="starts_with">Começa com</SelectItem>
                                            <SelectItem value="is_empty">Está vazio</SelectItem>
                                            <SelectItem value="is_not_empty">Não está vazio</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        value={cond.value}
                                        onChange={(e) => {
                                            const updated = [...conditions];
                                            updated[idx].value = e.target.value;
                                            updateData('conditions', updated);
                                        }}
                                        placeholder="valor"
                                        className="flex-1"
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="shrink-0"
                                        onClick={() => updateData('conditions', conditions.filter((_: any, i: number) => i !== idx))}
                                    >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </div>
                                <Input
                                    value={cond.output}
                                    onChange={(e) => {
                                        const updated = [...conditions];
                                        updated[idx].output = e.target.value;
                                        updateData('conditions', updated);
                                    }}
                                    placeholder="Nome da saída"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </>
        );
    };

    const renderActionProperties = () => (
        <>
            <div className="space-y-2">
                <Label>Tipo de Ação</Label>
                <Select value={localData.actionType || 'add_tag'} onValueChange={(v) => updateData('actionType', v)}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="add_tag">Adicionar Tag</SelectItem>
                        <SelectItem value="remove_tag">Remover Tag</SelectItem>
                        <SelectItem value="update_lead">Atualizar Lead</SelectItem>
                        <SelectItem value="notify_user">Notificar Usuário</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {(localData.actionType === 'add_tag' || localData.actionType === 'remove_tag') && (
                <div className="space-y-2">
                    <Label>Nome da Tag</Label>
                    <Input
                        value={localData.tagName || ''}
                        onChange={(e) => updateData('tagName', e.target.value)}
                        placeholder="interessado"
                    />
                </div>
            )}

            {localData.actionType === 'update_lead' && (
                <>
                    <div className="space-y-2">
                        <Label>Campo</Label>
                        <Select value={localData.field || 'status'} onValueChange={(v) => updateData('field', v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="status">Status</SelectItem>
                                <SelectItem value="nome">Nome</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="notas">Notas</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Valor</Label>
                        <Input
                            value={localData.value || ''}
                            onChange={(e) => updateData('value', e.target.value)}
                            placeholder="Valor ou {{variavel}}"
                        />
                    </div>
                </>
            )}
        </>
    );

    const renderWebhookProperties = () => (
        <>
            <div className="space-y-2">
                <Label>Método HTTP</Label>
                <Select value={localData.method || 'POST'} onValueChange={(v) => updateData('method', v)}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>URL</Label>
                <Input
                    value={localData.url || ''}
                    onChange={(e) => updateData('url', e.target.value)}
                    placeholder="https://api.example.com/webhook"
                />
            </div>

            <div className="space-y-2">
                <Label>Body (JSON)</Label>
                <Textarea
                    value={localData.body || ''}
                    onChange={(e) => updateData('body', e.target.value)}
                    placeholder='{"name": "{{contact.name}}"}'
                    rows={4}
                    className="font-mono text-xs"
                />
            </div>

            <div className="space-y-2">
                <Label>Salvar resposta em</Label>
                <Input
                    value={localData.saveResponseAs || ''}
                    onChange={(e) => updateData('saveResponseAs', e.target.value)}
                    placeholder="webhook_response"
                />
            </div>
        </>
    );

    const renderDelayProperties = () => (
        <>
            <div className="space-y-2">
                <Label>Minutos</Label>
                <Input
                    type="number"
                    value={localData.delayMinutes || 0}
                    onChange={(e) => updateData('delayMinutes', parseInt(e.target.value) || 0)}
                    min={0}
                    max={60}
                />
            </div>

            <div className="space-y-2">
                <Label>Segundos</Label>
                <Input
                    type="number"
                    value={localData.delaySeconds || 0}
                    onChange={(e) => updateData('delaySeconds', parseInt(e.target.value) || 0)}
                    min={0}
                    max={59}
                />
            </div>

            <p className="text-xs text-muted-foreground">
                ⚠️ Delays maiores que 30 segundos podem não funcionar corretamente.
            </p>
        </>
    );

    const renderEndProperties = () => (
        <>
            <div className="space-y-2">
                <Label>Status de Finalização</Label>
                <Select value={localData.finishStatus || 'completed'} onValueChange={(v) => updateData('finishStatus', v)}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="completed">Concluído com sucesso</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                        <SelectItem value="transfer_human">Transferir para humano</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </>
    );

    const renderProperties = () => {
        switch (selectedNode.type) {
            case 'trigger': return renderTriggerProperties();
            case 'message': return renderMessageProperties();
            case 'waitResponse': return renderWaitResponseProperties();
            case 'condition': return renderConditionProperties();
            case 'action': return renderActionProperties();
            case 'webhook': return renderWebhookProperties();
            case 'delay': return renderDelayProperties();
            case 'end': return renderEndProperties();
            default: return <p className="text-muted-foreground">Propriedades não disponíveis</p>;
        }
    };

    const nodeTypeLabels: Record<string, string> = {
        trigger: 'Gatilho',
        message: 'Mensagem',
        waitResponse: 'Aguardar Resposta',
        condition: 'Condição',
        action: 'Ação CRM',
        webhook: 'Webhook',
        delay: 'Esperar',
        randomPath: 'Caminho Aleatório',
        end: 'Finalizar'
    };

    return (
        <div className={cn("w-80 border-l bg-muted/30 overflow-y-auto", className)}>
            <div className="p-4 border-b bg-card flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">Propriedades</h3>
                    <p className="text-xs text-muted-foreground">{nodeTypeLabels[selectedNode.type || ''] || 'Bloco'}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={onClose}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            <div className="p-4 space-y-4">
                {renderProperties()}

                {/* Delete Button */}
                {onDeleteNode && (
                    <Button
                        variant="destructive"
                        className="w-full mt-4"
                        onClick={() => {
                            if (confirm('Excluir este bloco?')) {
                                onDeleteNode(selectedNode.id);
                            }
                        }}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir Bloco
                    </Button>
                )}
            </div>
        </div>
    );
}
