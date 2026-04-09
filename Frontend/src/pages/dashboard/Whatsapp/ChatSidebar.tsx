import { useEffect, useState } from "react";
import { Lead } from "@/services/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Pencil,
    Phone,
    Building2,
    Mail,
    Target,
    DollarSign,
    Tag as TagIcon,
    StickyNote,
    FileText,
    TrendingUp,
    Sparkles
} from "lucide-react";
import { LeadModal } from "@/components/dashboard/LeadModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatSidebarProps {
    contactId?: string;
    contactName?: string;
    contactPhone?: string;
    lead?: Lead | null;
    companyId: string;
    onUpdate?: () => void;
}

const priorityConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    high: {
        label: "Alta",
        color: "text-rose-600 dark:text-rose-400",
        bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800",
        icon: "🔥"
    },
    medium: {
        label: "Média",
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
        icon: "⚡"
    },
    low: {
        label: "Baixa",
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
        icon: "🌿"
    },
};

function NoteItem({ note }: { note: any }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(note.content);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const maxLength = 150;
    const shouldTruncate = note.content.length > maxLength;
    const displayContent = isExpanded || !shouldTruncate ? note.content : `${note.content.substring(0, maxLength)}...`;

    const handleSave = async () => {
        if (editContent.trim() === note.content) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from("lyn_lead_notes")
                .update({ content: editContent.trim() })
                .eq("id", note.id);

            if (error) throw error;

            await queryClient.invalidateQueries({ queryKey: ["lead_notes"] });
            setIsEditing(false);
            toast({ title: "Nota atualizada com sucesso" });
        } catch (error) {
            console.error("Error updating note:", error);
            toast({
                title: "Erro ao atualizar nota",
                description: "Não foi possível salvar as alterações.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isEditing) {
        return (
            <div className="text-sm bg-background/50 p-2 rounded border border-amber-200/50 dark:border-amber-800/30">
                <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[100px] mb-2 text-xs"
                />
                <div className="flex justify-end gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditing(false)}
                        disabled={isSaving}
                        className="h-7 w-7 p-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-7 w-7 p-0"
                    >
                        <Check className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="text-sm bg-background/50 p-2 rounded border border-amber-200/50 dark:border-amber-800/30 group relative transition-all hover:bg-background/80">
            <div className="flex justify-between items-start mb-1 text-[10px] text-muted-foreground">
                <span>
                    {note.profiles?.first_name} {note.profiles?.last_name}
                </span>
                <span>{new Date(note.created_at).toLocaleDateString()}</span>
            </div>

            <p className="text-amber-900/90 dark:text-amber-100/90 whitespace-pre-wrap leading-relaxed break-words">
                {displayContent}
            </p>

            {shouldTruncate && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-[10px] text-primary hover:underline mt-1 flex items-center gap-1 font-medium"
                >
                    {isExpanded ? (
                        <>Ver menos <ChevronUp className="h-3 w-3" /></>
                    ) : (
                        <>Ver mais <ChevronDown className="h-3 w-3" /></>
                    )}
                </button>
            )}

            <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                    setEditContent(note.content);
                    setIsEditing(true);
                }}
            >
                <Pencil className="h-3 w-3 text-muted-foreground hover:text-primary" />
            </Button>
        </div>
    );
}

export function ChatSidebar({ contactId, contactName, contactPhone, lead, companyId, onUpdate }: ChatSidebarProps) {
    const [localLead, setLocalLead] = useState<Lead | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (lead) {
            setLocalLead(lead);
        } else if (contactName || contactPhone) {
            // Create a temporary lead object for display
            setLocalLead({
                id: 'temp',
                nome: contactName || contactPhone || 'Novo Contato',
                telefone: contactPhone || '',
                company_id: companyId,
                status: 'Novo',
                prioridade: 'medium',
                created_at: new Date().toISOString(),
                // Fill other required fields with empty/defaults
                email: '',
                empresa: '',
                segmento: '',
                notas: [],
                description: '',
                tags: [],
                funil: '',
                pipeline_id: null,
                stage_id: null,
                responsavel_id: '',
                valor_oportunidade: null
            } as unknown as Lead);
        } else {
            setLocalLead(null);
        }
    }, [lead, contactName, contactPhone, companyId]);

    // Fetch notes from the new table
    const { data: leadNotes = [] } = useQuery({
        queryKey: ["lead_notes", localLead?.id],
        queryFn: async () => {
            if (!localLead?.id || localLead.id === 'temp') return [];

            const { data, error } = await supabase
                .from("lyn_lead_notes")
                .select(`
                    id,
                    content,
                    created_at,
                    created_by,
                    profiles:created_by (first_name, last_name)
                `)
                .eq("lead_id", localLead.id)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching notes:", error);
                return [];
            }
            return data;
        },
        enabled: !!localLead?.id && localLead.id !== 'temp',
    });

    const handleEditClick = () => {
        setIsEditModalOpen(true);
    };

    const handleModalClose = () => {
        setIsEditModalOpen(false);
    };

    const handleSave = () => {
        queryClient.invalidateQueries({ queryKey: ["leads"] });
        queryClient.invalidateQueries({ queryKey: ["all-leads"] });
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["lead_notes"] });
        if (onUpdate) onUpdate();
        setIsEditModalOpen(false);
    };

    if (!localLead) {
        return (
            <div className="w-80 border-l bg-gradient-to-b from-muted/30 to-background flex flex-col items-center justify-center gap-4 p-6">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                    Selecione uma conversa para ver os detalhes do lead
                </p>
            </div>
        );
    }

    // Determine if we are creating a new lead or editing
    const isTempLead = localLead.id === 'temp';

    const notasDisplay = Array.isArray(localLead.notas)
        ? localLead.notas.join('\n')
        : (localLead.notas || localLead.description || "");

    const priority = (localLead as any).prioridade || "medium";
    const priorityStyle = priorityConfig[priority] || priorityConfig.medium;

    return (
        <>
            <div className="w-80 border-l bg-gradient-to-b from-muted/20 via-background to-background hidden xl:flex flex-col h-full overflow-hidden">
                {/* Header Card */}
                <div className="relative p-5 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border-b">
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                    <div className="relative flex items-start gap-3">
                        {/* Avatar */}
                        <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center shadow-sm">
                            <span className="text-lg font-bold text-primary">
                                {localLead.nome ? localLead.nome.charAt(0).toUpperCase() : '?'}
                            </span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base text-foreground truncate leading-tight" title={localLead.nome}>
                                {localLead.nome}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span className="text-xs truncate">{localLead.telefone || "Sem telefone"}</span>
                            </div>
                        </div>

                        <Button
                            variant={isTempLead ? "default" : "ghost"}
                            size="icon"
                            className={cn(
                                "shrink-0 h-9 w-9 rounded-lg transition-all duration-200",
                                isTempLead
                                    ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                                    : "hover:bg-primary/10 hover:text-primary"
                            )}
                            onClick={handleEditClick}
                            title={isTempLead ? "Criar Lead" : "Editar Lead"}
                        >
                            {isTempLead ? <Pencil className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                        </Button>
                    </div>

                    {/* Quick Contact Info */}
                    {(localLead.email || localLead.empresa) && (
                        <div className="relative mt-4 flex flex-wrap gap-2">
                            {localLead.email && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/80 border border-border/50 text-xs text-muted-foreground">
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate max-w-[120px]">{localLead.email}</span>
                                </div>
                            )}
                            {localLead.empresa && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/80 border border-border/50 text-xs text-muted-foreground">
                                    <Building2 className="h-3 w-3" />
                                    <span className="truncate max-w-[100px]">{localLead.empresa}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-4">
                        {/* Status Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Status Card */}
                            <div className="group p-3 rounded-xl bg-gradient-to-br from-sky-50 to-sky-50/50 dark:from-sky-950/20 dark:to-sky-950/10 border border-sky-100 dark:border-sky-900/30 transition-all duration-200 hover:shadow-sm hover:scale-[1.02]">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Target className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-600/70 dark:text-sky-400/70">Status</span>
                                </div>
                                <p className="text-sm font-medium text-sky-900 dark:text-sky-100 truncate">
                                    {localLead.status || "—"}
                                </p>
                            </div>

                            {/* Funnel Card */}
                            <div className="group p-3 rounded-xl bg-gradient-to-br from-violet-50 to-violet-50/50 dark:from-violet-950/20 dark:to-violet-950/10 border border-violet-100 dark:border-violet-900/30 transition-all duration-200 hover:shadow-sm hover:scale-[1.02]">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <TrendingUp className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600/70 dark:text-violet-400/70">Funil</span>
                                </div>
                                <p className="text-sm font-medium text-violet-900 dark:text-violet-100 truncate">
                                    {localLead.funil || "—"}
                                </p>
                            </div>
                        </div>

                        {/* Priority Badge */}
                        <div className={cn(
                            "p-3 rounded-xl border transition-all duration-200",
                            priorityStyle.bg
                        )}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{priorityStyle.icon}</span>
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Prioridade</p>
                                        <p className={cn("text-sm font-semibold", priorityStyle.color)}>
                                            {priorityStyle.label}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Value Card */}
                        {localLead.valor_oportunidade && (
                            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-50/50 dark:from-emerald-950/20 dark:to-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600/70 dark:text-emerald-400/70">Valor da Oportunidade</span>
                                </div>
                                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(localLead.valor_oportunidade)}
                                </p>
                            </div>
                        )}

                        {/* Tags Section */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                                <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tags</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {localLead.tags && localLead.tags.length > 0 ? (
                                    localLead.tags.map((tag, index) => (
                                        <Badge
                                            key={tag}
                                            variant="secondary"
                                            className={cn(
                                                "text-xs font-medium px-2.5 py-0.5 rounded-lg transition-all duration-200 hover:scale-105",
                                                index % 3 === 0 && "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 hover:bg-teal-200",
                                                index % 3 === 1 && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200",
                                                index % 3 === 2 && "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 hover:bg-pink-200"
                                            )}
                                        >
                                            {tag}
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-xs text-muted-foreground italic">Nenhuma tag</span>
                                )}
                            </div>
                        </div>

                        {/* Segmento */}
                        {localLead.segmento && (
                            <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Segmento</span>
                                </div>
                                <p className="text-sm font-medium">{localLead.segmento}</p>
                            </div>
                        )}

                        {/* Notes Section */}
                        {(leadNotes.length > 0 || notasDisplay) && (
                            <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/20 space-y-3">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <StickyNote className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600/70 dark:text-amber-400/70">Notas</span>
                                </div>

                                {/* New Notes */}
                                {leadNotes.length > 0 && (
                                    <div className="space-y-3">
                                        {leadNotes.map((note: any) => (
                                            <NoteItem key={note.id} note={note} />
                                        ))}
                                    </div>
                                )}

                                {/* Legacy Notes */}
                                {notasDisplay && (
                                    <div className="text-sm bg-background/50 p-2 rounded border border-amber-200/50 dark:border-amber-800/30">
                                        <p className="text-[10px] text-muted-foreground mb-1 uppercase">Notas Antigas</p>
                                        <p className="text-amber-900/80 dark:text-amber-100/80 whitespace-pre-wrap leading-relaxed">
                                            {notasDisplay}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Description Section */}
                        {localLead.description && (
                            <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-950/10 border border-slate-100 dark:border-slate-900/20">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <FileText className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600/70 dark:text-slate-400/70">Descrição</span>
                                </div>
                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                    {localLead.description}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gradient-to-t from-muted/20 to-transparent">
                    <Button
                        className="w-full h-11 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-300"
                        onClick={handleEditClick}
                    >
                        <Pencil className="h-4 w-4 mr-2" />
                        {isTempLead ? "Cadastrar Lead" : "Editar Lead Completo"}
                    </Button>
                </div>
            </div>

            {/* Edit Modal */}
            <LeadModal
                open={isEditModalOpen}
                onClose={handleModalClose}
                onSave={handleSave}
                mode={localLead?.id === 'temp' ? "create" : "edit"}
                initialData={localLead ? {
                    id: localLead.id === 'temp' ? '' : localLead.id,
                    nome: localLead.nome,
                    email: localLead.email || "",
                    telefone: localLead.telefone || "",
                    empresa: localLead.empresa || "",
                    segmento: localLead.segmento || "",
                    prioridade: (localLead as any).prioridade || "medium",
                    notas: Array.isArray(localLead.notas) ? localLead.notas.join("\n") : (localLead.notas || ""),
                    description: localLead.description || "",
                    tags: localLead.tags || [],
                    funil: localLead.funil || "",
                    pipeline_id: localLead.pipeline_id || null,
                    stage_id: localLead.stage_id || null,
                    status: localLead.status || "",
                    responsavel_id: localLead.responsavel_id || "",
                    valor_oportunidade: localLead.valor_oportunidade || null,
                } : undefined}
            />
        </>
    );
}
