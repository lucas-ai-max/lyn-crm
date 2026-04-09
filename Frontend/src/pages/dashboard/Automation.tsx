import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, Pause, MoreHorizontal, Trash2, Copy, Settings, Workflow, TrendingUp, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PauseControlPanel } from '@/components/automation/PauseControlPanel';

interface Flow {
    id: string;
    name: string;
    description: string | null;
    status: 'draft' | 'active' | 'inactive' | 'archived';
    priority: number;
    execution_stats: {
        total: number;
        success: number;
        failed: number;
    };
    created_at: string;
    updated_at: string;
}

interface Execution {
    id: string;
    flow_id: string;
    status: string;
    current_node_id: string | null;
    started_at: string;
    last_activity_at: string;
    automation_flows: {
        name: string;
    };
    whatsapp_contacts: {
        name: string;
        remote_jid: string;
    };
}

export default function Automation() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('flows');

    // Fetch flows
    const { data: flows = [], isLoading: flowsLoading } = useQuery({
        queryKey: ['automation-flows'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('lyn_automation_flows')
                .select('*')
                .is('deleted_at', null)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return data as Flow[];
        },
    });

    // Fetch active executions
    const { data: executions = [], isLoading: executionsLoading } = useQuery({
        queryKey: ['automation-executions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('lyn_automation_flow_executions')
                .select(`
          *,
          automation_flows(name),
          whatsapp_contacts(name, remote_jid)
        `)
                .in('status', ['running', 'waiting_response', 'paused'])
                .order('last_activity_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data as Execution[];
        },
        refetchInterval: 10000, // Refresh every 10s
    });

    // Toggle flow status mutation
    const toggleStatus = useMutation({
        mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
            const { error } = await supabase
                .from('lyn_automation_flows')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            // Also update triggers
            await supabase
                .from('lyn_automation_flow_triggers')
                .update({ is_active: newStatus === 'active' })
                .eq('flow_id', id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
            toast.success('Status atualizado');
        },
        onError: () => {
            toast.error('Erro ao atualizar status');
        },
    });

    // Delete flow mutation
    const deleteFlow = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('lyn_automation_flows')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
            toast.success('Fluxo excluído');
        },
        onError: () => {
            toast.error('Erro ao excluir fluxo');
        },
    });

    // Duplicate flow mutation
    const duplicateFlow = useMutation({
        mutationFn: async (id: string) => {
            const { data: original, error: fetchError } = await supabase
                .from('lyn_automation_flows')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError || !original) throw fetchError;

            const { error: insertError } = await supabase
                .from('lyn_automation_flows')
                .insert({
                    ...original,
                    id: undefined,
                    name: `${original.name} (cópia)`,
                    status: 'draft',
                    created_at: undefined,
                    updated_at: undefined,
                });

            if (insertError) throw insertError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
            toast.success('Fluxo duplicado');
        },
        onError: () => {
            toast.error('Erro ao duplicar fluxo');
        },
    });

    // Cancel execution mutation
    const cancelExecution = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('lyn_automation_flow_executions')
                .update({ status: 'cancelled', completed_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automation-executions'] });
            toast.success('Execução cancelada');
        },
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">Ativo</Badge>;
            case 'inactive':
                return <Badge className="bg-gray-500/20 text-gray-500 hover:bg-gray-500/30">Inativo</Badge>;
            case 'draft':
                return <Badge className="bg-amber-500/20 text-amber-500 hover:bg-amber-500/30">Rascunho</Badge>;
            case 'running':
                return <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30">Executando</Badge>;
            case 'waiting_response':
                return <Badge className="bg-amber-500/20 text-amber-500 hover:bg-amber-500/30">Aguardando</Badge>;
            case 'paused':
                return <Badge className="bg-gray-500/20 text-gray-500 hover:bg-gray-500/30">Pausado</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const activeFlows = flows.filter(f => f.status === 'active').length;
    const totalExecutions = flows.reduce((sum, f) => sum + (f.execution_stats?.total || 0), 0);
    const successRate = totalExecutions > 0
        ? Math.round((flows.reduce((sum, f) => sum + (f.execution_stats?.success || 0), 0) / totalExecutions) * 100)
        : 0;

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Automação</h1>
                    <p className="text-muted-foreground">Crie fluxos de conversação automatizada para WhatsApp</p>
                </div>
                <Button onClick={() => navigate('/dashboard/automation/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Fluxo
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Fluxos Ativos</CardTitle>
                        <Workflow className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeFlows}</div>
                        <p className="text-xs text-muted-foreground">de {flows.length} total</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Execuções Ativas</CardTitle>
                        <Users className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{executions.length}</div>
                        <p className="text-xs text-muted-foreground">em andamento</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Total Execuções</CardTitle>
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalExecutions}</div>
                        <p className="text-xs text-muted-foreground">histórico completo</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
                        <Clock className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{successRate}%</div>
                        <p className="text-xs text-muted-foreground">conclusão de fluxos</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="flows">Fluxos</TabsTrigger>
                    <TabsTrigger value="executions">
                        Execuções Ativas
                        {executions.length > 0 && (
                            <Badge variant="secondary" className="ml-2">{executions.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="controls">Controles</TabsTrigger>
                </TabsList>

                {/* Flows Tab */}
                <TabsContent value="flows" className="space-y-4">
                    {flowsLoading ? (
                        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
                    ) : flows.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-10">
                                <Workflow className="w-12 h-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold">Nenhum fluxo criado</h3>
                                <p className="text-muted-foreground text-sm mb-4">Crie seu primeiro fluxo de automação</p>
                                <Button onClick={() => navigate('/dashboard/automation/new')}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Criar Fluxo
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {flows.map((flow) => (
                                <Card key={flow.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="flex items-center justify-between p-4">
                                        <div className="flex-1 cursor-pointer" onClick={() => navigate(`/dashboard/automation/${flow.id}`)}>
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-semibold">{flow.name}</h3>
                                                {getStatusBadge(flow.status)}
                                            </div>
                                            {flow.description && (
                                                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{flow.description}</p>
                                            )}
                                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                <span>{flow.execution_stats?.total || 0} execuções</span>
                                                <span>•</span>
                                                <span>Atualizado {format(new Date(flow.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleStatus.mutate({
                                                        id: flow.id,
                                                        newStatus: flow.status === 'active' ? 'inactive' : 'active',
                                                    });
                                                }}
                                            >
                                                {flow.status === 'active' ? (
                                                    <>
                                                        <Pause className="w-4 h-4 mr-1" />
                                                        Pausar
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play className="w-4 h-4 mr-1" />
                                                        Ativar
                                                    </>
                                                )}
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => navigate(`/dashboard/automation/${flow.id}`)}>
                                                        <Settings className="w-4 h-4 mr-2" />
                                                        Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => duplicateFlow.mutate(flow.id)}>
                                                        <Copy className="w-4 h-4 mr-2" />
                                                        Duplicar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => {
                                                            if (confirm('Excluir este fluxo?')) {
                                                                deleteFlow.mutate(flow.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Excluir
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Executions Tab */}
                <TabsContent value="executions" className="space-y-4">
                    {executionsLoading ? (
                        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
                    ) : executions.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-10">
                                <Clock className="w-12 h-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold">Nenhuma execução ativa</h3>
                                <p className="text-muted-foreground text-sm">As execuções aparecerão aqui quando um fluxo for iniciado</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {executions.map((exec) => (
                                <Card key={exec.id}>
                                    <CardContent className="flex items-center justify-between p-4">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-semibold">{exec.whatsapp_contacts?.name || 'Contato'}</h3>
                                                {getStatusBadge(exec.status)}
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Fluxo: {exec.automation_flows?.name}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                <span>Iniciado: {format(new Date(exec.started_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                                                <span>•</span>
                                                <span>Última atividade: {format(new Date(exec.last_activity_at), "HH:mm", { locale: ptBR })}</span>
                                            </div>
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => cancelExecution.mutate(exec.id)}
                                        >
                                            Cancelar
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Controls Tab */}
                <TabsContent value="controls" className="space-y-4">
                    <PauseControlPanel />
                </TabsContent>
            </Tabs>
        </div>
    );
}
