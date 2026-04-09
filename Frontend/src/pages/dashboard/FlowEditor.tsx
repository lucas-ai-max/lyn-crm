import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Node, Edge } from '@xyflow/react';
import { ArrowLeft, Save, Play, Pause, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FlowCanvas } from '@/components/automation/FlowCanvas';
import { NodePalette } from '@/components/automation/NodePalette';
import { PropertiesPanel } from '@/components/automation/PropertiesPanel';
import { validateFlow } from '@/lib/validateFlow';

interface FlowConfig {
    allow_multiple_executions: boolean;
    max_executions: number;
    default_timeout_minutes: number;
    retry_on_error: boolean;
}

interface Flow {
    id: string;
    name: string;
    description: string | null;
    status: 'draft' | 'active' | 'inactive';
    priority: number;
    config: FlowConfig;
    nodes: Node[];
    edges: Edge[];
}

export default function FlowEditor() {
    const { flowId } = useParams<{ flowId: string }>();
    const navigate = useNavigate();
    const isNew = flowId === 'new';

    const [flow, setFlow] = useState<Flow>({
        id: '',
        name: 'Novo Fluxo',
        description: '',
        status: 'draft',
        priority: 0,
        config: {
            allow_multiple_executions: false,
            max_executions: 1,
            default_timeout_minutes: 60,
            retry_on_error: false,
        },
        nodes: [],
        edges: [],
    });

    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Warn before leaving with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasChanges]);

    // Handle back navigation with confirmation
    const handleBack = useCallback(() => {
        if (hasChanges && !confirm('Alterações não salvas serão perdidas. Sair mesmo assim?')) {
            return;
        }
        navigate('/dashboard/automation');
    }, [hasChanges, navigate]);

    // Load flow if editing
    useEffect(() => {
        if (!isNew && flowId) {
            loadFlow(flowId);
        }
    }, [flowId, isNew]);

    const loadFlow = async (id: string) => {
        const { data, error } = await supabase
            .from('lyn_automation_flows')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            toast.error('Erro ao carregar fluxo');
            navigate('/dashboard/automation');
            return;
        }

        setFlow({
            id: data.id,
            name: data.name,
            description: data.description,
            status: data.status,
            priority: data.priority,
            config: data.config as FlowConfig,
            nodes: (data.nodes as Node[]) || [],
            edges: (data.edges as Edge[]) || [],
        });
    };

    const handleNodesChange = useCallback((nodes: Node[]) => {
        setFlow((prev) => ({ ...prev, nodes }));
        setHasChanges(true);
    }, []);

    const handleEdgesChange = useCallback((edges: Edge[]) => {
        setFlow((prev) => ({ ...prev, edges }));
        setHasChanges(true);
    }, []);

    const handleUpdateNode = useCallback((nodeId: string, data: any) => {
        setFlow((prev) => ({
            ...prev,
            nodes: prev.nodes.map((node) =>
                node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
            ),
        }));
        setSelectedNode((prev) =>
            prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...data } } : prev
        );
        setHasChanges(true);
    }, []);

    const handleDeleteNode = useCallback((nodeId: string) => {
        setFlow((prev) => ({
            ...prev,
            nodes: prev.nodes.filter((n) => n.id !== nodeId),
            edges: prev.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        }));
        setSelectedNode(null);
        setHasChanges(true);
        toast.success('Bloco excluído');
    }, []);

    const saveFlow = async () => {
        setIsSaving(true);

        try {
            // Get user's company_id
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('lyn_profiles')
                .select('company_id')
                .eq('id', user.id)
                .single();

            if (!profile?.company_id) throw new Error('No company');

            // Validate flow using comprehensive validation
            const validationErrors = validateFlow(flow.nodes, flow.edges);
            const blockers = validationErrors.filter((e) => e.type === 'error');
            const warnings = validationErrors.filter((e) => e.type === 'warning');

            if (blockers.length > 0) {
                blockers.forEach((e) => toast.error(e.message));
                setIsSaving(false);
                return;
            }

            warnings.forEach((e) => toast.warning(e.message));

            const flowData = {
                company_id: profile.company_id,
                name: flow.name,
                description: flow.description,
                status: flow.status,
                priority: flow.priority,
                config: flow.config,
                nodes: flow.nodes,
                edges: flow.edges,
                created_by: user.id,
            };

            if (isNew) {
                const { data, error } = await supabase
                    .from('lyn_automation_flows')
                    .insert(flowData)
                    .select()
                    .single();

                if (error) throw error;

                // Create triggers based on trigger nodes
                const triggerNodes = flow.nodes.filter((n) => n.type === 'trigger');
                for (const node of triggerNodes) {
                    await supabase.from('lyn_automation_flow_triggers').insert({
                        flow_id: data.id,
                        type: node.data.triggerType || 'keyword_exact',
                        config: {
                            keywords: node.data.keywords || [],
                            pattern: node.data.pattern,
                            case_sensitive: node.data.case_sensitive || false,
                        },
                        is_active: true,
                        priority: 0,
                    });
                }

                toast.success('Fluxo criado com sucesso!');
                navigate(`/dashboard/automation/${data.id}`);
            } else {
                const { error } = await supabase
                    .from('lyn_automation_flows')
                    .update({
                        name: flow.name,
                        description: flow.description,
                        status: flow.status,
                        priority: flow.priority,
                        config: flow.config,
                        nodes: flow.nodes,
                        edges: flow.edges,
                    })
                    .eq('id', flow.id);

                if (error) throw error;

                // Update triggers
                await supabase.from('lyn_automation_flow_triggers').delete().eq('flow_id', flow.id);

                const triggerNodes = flow.nodes.filter((n) => n.type === 'trigger');
                for (const node of triggerNodes) {
                    await supabase.from('lyn_automation_flow_triggers').insert({
                        flow_id: flow.id,
                        type: node.data.triggerType || 'keyword_exact',
                        config: {
                            keywords: node.data.keywords || [],
                            pattern: node.data.pattern,
                            case_sensitive: node.data.case_sensitive || false,
                        },
                        is_active: flow.status === 'active',
                        priority: 0,
                    });
                }

                toast.success('Fluxo salvo com sucesso!');
            }

            setHasChanges(false);
        } catch (error: any) {
            console.error('Error saving flow:', error);
            toast.error(`Erro ao salvar: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleStatus = async () => {
        const newStatus = flow.status === 'active' ? 'inactive' : 'active';
        setFlow((prev) => ({ ...prev, status: newStatus }));
        setHasChanges(true);

        if (!isNew) {
            const { error } = await supabase
                .from('lyn_automation_flows')
                .update({ status: newStatus })
                .eq('id', flow.id);

            if (error) {
                toast.error('Erro ao atualizar status');
                return;
            }

            // Update trigger active status
            await supabase
                .from('lyn_automation_flow_triggers')
                .update({ is_active: newStatus === 'active' })
                .eq('flow_id', flow.id);

            toast.success(newStatus === 'active' ? 'Fluxo ativado!' : 'Fluxo desativado');
        }
    };

    const deleteFlow = async () => {
        if (!flow.id) return;

        if (!confirm('Tem certeza que deseja excluir este fluxo?')) return;

        const { error } = await supabase
            .from('lyn_automation_flows')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', flow.id);

        if (error) {
            toast.error('Erro ao excluir fluxo');
            return;
        }

        toast.success('Fluxo excluído');
        navigate('/dashboard/automation');
    };

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Toolbar */}
            <div className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={handleBack}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>

                    <div>
                        <Input
                            value={flow.name}
                            onChange={(e) => {
                                setFlow((prev) => ({ ...prev, name: e.target.value }));
                                setHasChanges(true);
                            }}
                            className="h-8 font-semibold text-lg border-none bg-transparent p-0 focus-visible:ring-0"
                            placeholder="Nome do fluxo"
                        />
                        <div className="text-xs text-muted-foreground">
                            {flow.status === 'active' && <span className="text-green-500">● Ativo</span>}
                            {flow.status === 'inactive' && <span className="text-gray-500">● Inativo</span>}
                            {flow.status === 'draft' && <span className="text-amber-500">● Rascunho</span>}
                            {hasChanges && <span className="ml-2">(não salvo)</span>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleStatus}
                    >
                        {flow.status === 'active' ? (
                            <>
                                <Pause className="w-4 h-4 mr-1" />
                                Desativar
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 mr-1" />
                                Ativar
                            </>
                        )}
                    </Button>

                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Settings className="w-4 h-4" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>Configurações do Fluxo</SheetTitle>
                            </SheetHeader>

                            <div className="mt-6 space-y-6">
                                <div className="space-y-2">
                                    <Label>Descrição</Label>
                                    <Textarea
                                        value={flow.description || ''}
                                        onChange={(e) => {
                                            setFlow((prev) => ({ ...prev, description: e.target.value }));
                                            setHasChanges(true);
                                        }}
                                        placeholder="Descreva o objetivo deste fluxo..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Prioridade (maior = executa primeiro)</Label>
                                    <Input
                                        type="number"
                                        value={flow.priority}
                                        onChange={(e) => {
                                            setFlow((prev) => ({ ...prev, priority: parseInt(e.target.value) || 0 }));
                                            setHasChanges(true);
                                        }}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Timeout padrão (minutos)</Label>
                                    <Input
                                        type="number"
                                        value={flow.config.default_timeout_minutes}
                                        onChange={(e) => {
                                            setFlow((prev) => ({
                                                ...prev,
                                                config: { ...prev.config, default_timeout_minutes: parseInt(e.target.value) || 60 }
                                            }));
                                            setHasChanges(true);
                                        }}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label>Permitir múltiplas execuções por contato</Label>
                                    <Switch
                                        checked={flow.config.allow_multiple_executions}
                                        onCheckedChange={(v) => {
                                            setFlow((prev) => ({
                                                ...prev,
                                                config: { ...prev.config, allow_multiple_executions: v }
                                            }));
                                            setHasChanges(true);
                                        }}
                                    />
                                </div>

                                {!isNew && (
                                    <div className="pt-4 border-t">
                                        <Button variant="destructive" className="w-full" onClick={deleteFlow}>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Excluir Fluxo
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>

                    <Button onClick={saveFlow} disabled={isSaving}>
                        <Save className="w-4 h-4 mr-1" />
                        {isSaving ? 'Salvando...' : 'Salvar'}
                    </Button>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Node Palette */}
                <NodePalette />

                {/* Canvas */}
                <FlowCanvas
                    initialNodes={flow.nodes}
                    initialEdges={flow.edges}
                    onNodesChange={handleNodesChange}
                    onEdgesChange={handleEdgesChange}
                    onNodeSelect={setSelectedNode}
                    className="flex-1"
                />

                {/* Properties Panel */}
                <PropertiesPanel
                    selectedNode={selectedNode}
                    onUpdateNode={handleUpdateNode}
                    onDeleteNode={handleDeleteNode}
                    onClose={() => setSelectedNode(null)}
                />
            </div>
        </div>
    );
}
