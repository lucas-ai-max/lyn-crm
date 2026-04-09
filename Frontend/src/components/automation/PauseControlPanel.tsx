import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pause, Play, Globe, Workflow, User, Tag, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PauseRule {
    id: string;
    company_id: string;
    scope: 'global' | 'flow' | 'contact' | 'tag';
    scope_id: string | null;
    scope_tag: string | null;
    reason: string | null;
    is_active: boolean;
    expires_at: string | null;
    created_at: string;
    automation_flows?: {
        name: string;
    };
    whatsapp_contacts?: {
        name: string;
        remote_jid: string;
    };
}

interface Flow {
    id: string;
    name: string;
}

export function PauseControlPanel() {
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newRule, setNewRule] = useState({
        scope: 'global' as const,
        scope_id: '',
        scope_tag: '',
        reason: '',
        is_temporary: false,
        expires_in_hours: 24,
    });

    // Fetch pause rules
    const { data: rules = [], isLoading, refetch } = useQuery({
        queryKey: ['pause-rules'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('lyn_automation_pause_rules')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as PauseRule[];
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
    });

    // Fetch flows for scope selection
    const { data: flows = [] } = useQuery({
        queryKey: ['automation-flows-simple'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('lyn_automation_flows')
                .select('id, name')
                .is('deleted_at', null)
                .order('name');

            if (error) throw error;
            return data as Flow[];
        },
    });

    // Toggle rule mutation
    const toggleRule = useMutation({
        mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
            const { error } = await supabase
                .from('lyn_automation_pause_rules')
                .update({ is_active })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pause-rules'] });
        },
    });

    // Delete rule mutation
    const deleteRule = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('lyn_automation_pause_rules')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pause-rules'] });
            toast.success('Regra de pausa removida');
        },
    });

    // Create rule mutation
    const createRule = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('lyn_profiles')
                .select('company_id')
                .eq('id', user.id)
                .single();

            if (!profile?.company_id) throw new Error('No company');

            const ruleData: any = {
                company_id: profile.company_id,
                scope: newRule.scope,
                reason: newRule.reason || null,
                is_active: true,
                is_temporary: newRule.is_temporary,
                created_by: user.id,
            };

            if (newRule.scope === 'flow' && newRule.scope_id) {
                ruleData.scope_id = newRule.scope_id;
            } else if (newRule.scope === 'tag' && newRule.scope_tag) {
                ruleData.scope_tag = newRule.scope_tag;
            }

            if (newRule.is_temporary && newRule.expires_in_hours > 0) {
                ruleData.expires_at = new Date(Date.now() + newRule.expires_in_hours * 60 * 60 * 1000).toISOString();
            }

            const { error } = await supabase
                .from('lyn_automation_pause_rules')
                .insert(ruleData);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pause-rules'] });
            setIsCreateOpen(false);
            setNewRule({
                scope: 'global',
                scope_id: '',
                scope_tag: '',
                reason: '',
                is_temporary: false,
                expires_in_hours: 24,
            });
            toast.success('Regra de pausa criada');
        },
        onError: (error: any) => {
            toast.error(`Erro: ${error.message}`);
        },
    });

    // Check for global pause
    const hasGlobalPause = rules.some(r => r.scope === 'global');
    const [isToggling, setIsToggling] = useState(false);

    // Toggle global pause
    const toggleGlobalPause = async () => {
        setIsToggling(true);
        try {
            if (hasGlobalPause) {
                // Remove global pause
                const globalRule = rules.find(r => r.scope === 'global');
                if (globalRule) {
                    await deleteRule.mutateAsync(globalRule.id);
                    await refetch();
                    toast.info('Automação global reativada');
                }
            } else {
                // Create global pause directly
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('Not authenticated');

                const { data: profile } = await supabase
                    .from('lyn_profiles')
                    .select('company_id')
                    .eq('id', user.id)
                    .single();

                if (!profile?.company_id) throw new Error('No company');

                const { error } = await supabase
                    .from('lyn_automation_pause_rules')
                    .insert({
                        company_id: profile.company_id,
                        scope: 'global',
                        reason: 'Pausa manual',
                        is_active: true,
                        created_by: user.id,
                    });

                if (error) throw error;

                await refetch();
                toast.info('Automação global pausada');
            }
        } catch (error: any) {
            toast.error(`Erro: ${error.message}`);
        } finally {
            setIsToggling(false);
        }
    };

    const getScopeIcon = (scope: string) => {
        switch (scope) {
            case 'global': return <Globe className="w-4 h-4" />;
            case 'flow': return <Workflow className="w-4 h-4" />;
            case 'contact': return <User className="w-4 h-4" />;
            case 'tag': return <Tag className="w-4 h-4" />;
            default: return null;
        }
    };

    const getScopeLabel = (rule: PauseRule) => {
        switch (rule.scope) {
            case 'global': return 'Todas as automações';
            case 'flow': return rule.automation_flows?.name || 'Fluxo específico';
            case 'contact': return rule.whatsapp_contacts?.name || 'Contato específico';
            case 'tag': return `Tag: ${rule.scope_tag}`;
            default: return rule.scope;
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Pause className="w-5 h-5" />
                            Controle de Pausas
                        </CardTitle>
                        <CardDescription>
                            Pause automações globalmente ou para fluxos/contatos específicos
                        </CardDescription>
                    </div>

                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="w-4 h-4 mr-1" />
                                Nova Regra
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Criar Regra de Pausa</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Escopo</Label>
                                    <Select
                                        value={newRule.scope}
                                        onValueChange={(v: any) => setNewRule({ ...newRule, scope: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="global">
                                                <div className="flex items-center gap-2">
                                                    <Globe className="w-4 h-4" />
                                                    Global (todas as automações)
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="flow">
                                                <div className="flex items-center gap-2">
                                                    <Workflow className="w-4 h-4" />
                                                    Fluxo específico
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="tag">
                                                <div className="flex items-center gap-2">
                                                    <Tag className="w-4 h-4" />
                                                    Contatos com tag
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {newRule.scope === 'flow' && (
                                    <div className="space-y-2">
                                        <Label>Fluxo</Label>
                                        <Select
                                            value={newRule.scope_id}
                                            onValueChange={(v) => setNewRule({ ...newRule, scope_id: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um fluxo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {flows.map((flow) => (
                                                    <SelectItem key={flow.id} value={flow.id}>
                                                        {flow.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {newRule.scope === 'tag' && (
                                    <div className="space-y-2">
                                        <Label>Nome da Tag</Label>
                                        <Input
                                            value={newRule.scope_tag}
                                            onChange={(e) => setNewRule({ ...newRule, scope_tag: e.target.value })}
                                            placeholder="vip, atendimento, etc."
                                        />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label>Motivo (opcional)</Label>
                                    <Input
                                        value={newRule.reason}
                                        onChange={(e) => setNewRule({ ...newRule, reason: e.target.value })}
                                        placeholder="Ex: Manutenção do sistema"
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label>Pausa temporária</Label>
                                    <Switch
                                        checked={newRule.is_temporary}
                                        onCheckedChange={(v) => setNewRule({ ...newRule, is_temporary: v })}
                                    />
                                </div>

                                {newRule.is_temporary && (
                                    <div className="space-y-2">
                                        <Label>Expirar em (horas)</Label>
                                        <Input
                                            type="number"
                                            value={newRule.expires_in_hours}
                                            onChange={(e) => setNewRule({ ...newRule, expires_in_hours: parseInt(e.target.value) || 1 })}
                                            min={1}
                                            max={168}
                                        />
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline">Cancelar</Button>
                                </DialogClose>
                                <Button onClick={() => createRule.mutate()} disabled={createRule.isPending}>
                                    {createRule.isPending ? 'Criando...' : 'Criar Pausa'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Global Toggle */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                        {hasGlobalPause ? (
                            <div className="p-2 bg-destructive/20 rounded-full">
                                <Pause className="w-5 h-5 text-destructive" />
                            </div>
                        ) : (
                            <div className="p-2 bg-green-500/20 rounded-full">
                                <Play className="w-5 h-5 text-green-500" />
                            </div>
                        )}
                        <div>
                            <div className="font-medium">Automação Global</div>
                            <div className="text-sm text-muted-foreground">
                                {hasGlobalPause ? 'Todas as automações estão pausadas' : 'Automações ativas'}
                            </div>
                        </div>
                    </div>
                    <Switch
                        checked={!hasGlobalPause}
                        onCheckedChange={toggleGlobalPause}
                        disabled={isToggling}
                    />
                </div>

                {/* Rules List */}
                {isLoading ? (
                    <div className="text-center py-4 text-muted-foreground">Carregando...</div>
                ) : rules.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        Nenhuma regra de pausa ativa
                    </div>
                ) : (
                    <div className="space-y-2">
                        {rules.filter(r => r.scope !== 'global').map((rule) => (
                            <div
                                key={rule.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-muted rounded">
                                        {getScopeIcon(rule.scope)}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm">{getScopeLabel(rule)}</div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            {rule.reason && <span>{rule.reason}</span>}
                                            {rule.expires_at && (
                                                <Badge variant="outline" className="text-xs">
                                                    Expira: {format(new Date(rule.expires_at), "dd/MM HH:mm", { locale: ptBR })}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteRule.mutate(rule.id)}
                                >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
