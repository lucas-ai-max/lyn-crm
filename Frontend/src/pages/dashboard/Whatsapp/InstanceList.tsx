import { useEffect, useState } from "react";
import { whatsappService } from "@/services/whatsappService";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
    QrCode,
    Trash2,
    Plus,
    RefreshCw,
    Settings,
    Smartphone,
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    RotateCw
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function InstanceList() {
    const [instances, setInstances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newInstanceName, setNewInstanceName] = useState("");
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [viewingInstanceId, setViewingInstanceId] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const { toast } = useToast();

    const loadInstances = async () => {
        try {
            setLoading(true);
            const data = await whatsappService.listInstances();
            setInstances(data);
        } catch (error) {
            toast({ title: "Erro", description: "Não foi possível carregar as instâncias", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInstances();

        const channel = supabase
            .channel('instance-status-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'lyn_whatsapp_instances'
                },
                (payload) => {
                    setInstances(currentInstances =>
                        currentInstances.map(inst =>
                            inst.id === payload.new.id ? { ...inst, ...payload.new } : inst
                        )
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleCreate = async () => {
        const nameRegex = /^[a-z0-9]+$/;
        if (!newInstanceName.match(nameRegex)) {
            toast({
                title: "Nome inválido",
                description: "Use apenas letras minúsculas e números. Sem espaços ou acentos.",
                variant: "destructive"
            });
            return;
        }

        try {
            await whatsappService.createInstance(newInstanceName);
            toast({ title: "Sucesso", description: "Instância criada com sucesso" });
            setNewInstanceName("");
            setIsCreateOpen(false);
            loadInstances();
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || "Erro ao criar instância";
            toast({ title: "Erro", description: errorMsg, variant: "destructive" });
        }
    };

    const handleConnect = async (evolutionId: string) => {
        setViewingInstanceId(evolutionId);
        setQrCode(null);
        try {
            const data = await whatsappService.connectInstance(evolutionId);
            const code = data.qrcode?.base64 || data.base64 || data.qrcode || data;
            setQrCode(code);
        } catch (error) {
            toast({ title: "Erro", description: "Erro ao gerar QR Code", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string, evolutionId: string) => {
        try {
            await whatsappService.deleteInstance(id, evolutionId);
            toast({ title: "Sucesso", description: "Instância e todos os dados associados foram removidos" });
            loadInstances();
        } catch (error: any) {
            const errorMsg = error.message || "Erro ao remover instância";
            toast({ title: "Erro", description: errorMsg, variant: "destructive" });
        }
    };

    const handleSync = async (id: string, evolutionId: string) => {
        try {
            const result = await whatsappService.syncInstance(id, evolutionId);
            if (result.status === 'orphaned') {
                toast({
                    title: "Instância Órfã",
                    description: "Esta instância não existe mais na Evolution API. Você pode removê-la.",
                    variant: "destructive"
                });
            } else {
                toast({ title: "Sincronizado", description: `Status atualizado: ${result.status}` });
            }
            loadInstances();
        } catch (error: any) {
            toast({ title: "Erro", description: error.message || "Erro ao sincronizar", variant: "destructive" });
        }
    };

    const handleConfigureWebhook = async (evolutionId: string) => {
        try {
            await whatsappService.configureWebhook(evolutionId);
            toast({ title: "Sucesso", description: "Webhook configurado com sucesso!" });
        } catch (error) {
            toast({ title: "Erro", description: "Erro ao configurar webhook", variant: "destructive" });
        }
    };

    // --- UI Components ---

    const TutorialStep = ({ icon: Icon, number, title, description }: any) => (
        <div className="flex items-start gap-3 p-4 bg-card rounded-lg border shadow-sm flex-1">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                {number}
            </div>
            <div>
                <h3 className="font-semibold flex items-center gap-2">
                    {title}
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
        </div>
    );

    return (
        <div className="p-6 space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Conexão WhatsApp</h1>
                    <p className="text-muted-foreground mt-1">Gerencie suas instâncias e conecte seus números.</p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="shadow-md">
                            <Plus className="mr-2 h-5 w-5" /> Nova Instância
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Criar Nova Instância</DialogTitle>
                            <DialogDescription>
                                Dê um nome único para identificar este número (ex: suporte, vendas).
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome da Instância</label>
                                <Input
                                    placeholder="Ex: suporte"
                                    value={newInstanceName}
                                    onChange={(e) => setNewInstanceName(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                                    className="text-lg"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Apenas letras minúsculas e números (sem espaços).
                                </p>
                            </div>
                            <Button className="w-full" onClick={handleCreate} disabled={!newInstanceName}>
                                Criar Instância
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Tutorial Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TutorialStep
                    number="1"
                    title="Criar Instância"
                    description="Crie uma nova instância para cada número de WhatsApp que deseja conectar."
                    icon={Plus}
                />
                <TutorialStep
                    number="2"
                    title="Ler QR Code"
                    description="Clique em 'Conectar' e leia o QR Code com o seu celular."
                    icon={QrCode}
                />
                <TutorialStep
                    number="3"
                    title="Configurar"
                    description="Ajuste as configurações e Webhooks para garantir o funcionamento."
                    icon={Settings}
                />
            </div>

            <Separator />

            {/* Instance List */}
            {instances.length === 0 && !loading ? (
                <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-muted-foreground/20">
                    <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium">Nenhuma instância conectada</h3>
                    <p className="text-muted-foreground mb-6">Comece criando sua primeira instância para conectar o WhatsApp.</p>
                    <Button onClick={() => setIsCreateOpen(true)} variant="outline">
                        <Plus className="mr-2 h-4 w-4" /> Criar Agora
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {instances.map((inst) => {
                        const isConnected = inst.status === 'connected' || inst.status === 'open' || inst.status === '200';

                        return (
                            <Card key={inst.id} className="overflow-hidden transition-all hover:shadow-md border-t-4 border-t-transparent hover:border-t-primary">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <CardTitle className="text-xl capitalize">{inst.name}</CardTitle>
                                            <div className="flex items-center gap-2">
                                                {inst.status === 'orphaned' ? (
                                                    <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">
                                                        <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Órfã</span>
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant={isConnected ? "default" : "secondary"}
                                                        className={isConnected ? "bg-green-500 hover:bg-green-600" : ""}
                                                    >
                                                        {isConnected ? (
                                                            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Conectado</span>
                                                        ) : (
                                                            <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Desconectado</span>
                                                        )}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            {/* Sync Button */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleSync(inst.id, inst.evolution_instance_id)}
                                                className="text-muted-foreground hover:text-primary"
                                                title="Sincronizar status"
                                            >
                                                <RotateCw className="h-4 w-4" />
                                            </Button>
                                            {/* Delete with Confirmation */}
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Excluir Instância?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Isso removerá a instância "{inst.name}" e todos os dados associados (chats, mensagens, contatos). Esta ação não pode ser desfeita.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(inst.id, inst.evolution_instance_id)}
                                                            className="bg-red-500 hover:bg-red-600"
                                                        >
                                                            Excluir
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pb-3">
                                    {isConnected ? (
                                        <div className="text-sm text-muted-foreground">
                                            <p className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                Pronto para enviar e receber mensagens.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground">
                                            <p className="flex items-center gap-2">
                                                <Smartphone className="h-4 w-4" />
                                                Aguardando leitura do QR Code.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="bg-muted/30 p-3 flex gap-2">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button
                                                className="flex-1"
                                                variant={isConnected ? "outline" : "default"}
                                                onClick={() => handleConnect(inst.evolution_instance_id)}
                                            >
                                                <QrCode className="mr-2 h-4 w-4" />
                                                {isConnected ? "Reconectar" : "Conectar"}
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-md">
                                            <DialogHeader className="flex flex-row items-center justify-between">
                                                <DialogTitle>Scan QR Code</DialogTitle>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => viewingInstanceId && handleConnect(viewingInstanceId)}
                                                    title="Atualizar QR Code"
                                                >
                                                    <RefreshCw className="h-4 w-4" />
                                                </Button>
                                            </DialogHeader>
                                            <div className="flex flex-col items-center justify-center p-6 space-y-4">
                                                {qrCode ? (
                                                    isConnected ? // If status updates while dialog open
                                                        <div className="text-center space-y-2">
                                                            <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                                                <CheckCircle2 className="h-8 w-8" />
                                                            </div>
                                                            <h3 className="font-semibold text-lg text-green-600">Conectado com Sucesso!</h3>
                                                        </div> :
                                                        <div className="bg-white p-2 rounded-lg border shadow-sm">
                                                            <img src={qrCode} alt="QR Code" className="max-w-[250px]" />
                                                        </div>
                                                ) : (
                                                    <div className="flex flex-col items-center py-8 text-muted-foreground">
                                                        <RefreshCw className="h-8 w-8 animate-spin mb-2" />
                                                        <span>Gerando QR Code...</span>
                                                    </div>
                                                )}
                                                <p className="text-sm text-center text-muted-foreground px-4">
                                                    Abra o WhatsApp no seu celular {'>'} Configurações {'>'} Aparelhos conectados {'>'} Conectar aparelho
                                                </p>
                                            </div>
                                        </DialogContent>
                                    </Dialog>

                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleConfigureWebhook(inst.evolution_instance_id)}
                                        title="Configurações (Webhook)"
                                        className={!isConnected ? "opacity-50" : ""}
                                    >
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
