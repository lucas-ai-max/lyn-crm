import { useState } from "react";
import { useQuickReplies, QuickReplyTemplate, CreateTemplateInput } from "@/hooks/useQuickReplies";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, MessageSquare, Loader2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function QuickRepliesSettings() {
    const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, isCreating, isUpdating } = useQuickReplies();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<QuickReplyTemplate | null>(null);
    const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

    // Form state
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [shortcut, setShortcut] = useState("");
    const [category, setCategory] = useState("");

    const resetForm = () => {
        setTitle("");
        setContent("");
        setShortcut("");
        setCategory("");
        setEditingTemplate(null);
    };

    const openCreateDialog = () => {
        resetForm();
        setIsDialogOpen(true);
    };

    const openEditDialog = (template: QuickReplyTemplate) => {
        setEditingTemplate(template);
        setTitle(template.title);
        setContent(template.content);
        setShortcut(template.shortcut || "");
        setCategory(template.category || "");
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim()) return;

        const input: CreateTemplateInput = {
            title: title.trim(),
            content: content.trim(),
            shortcut: shortcut.trim() || undefined,
            category: category.trim() || undefined,
        };

        try {
            if (editingTemplate) {
                await updateTemplate({ ...input, id: editingTemplate.id });
            } else {
                await createTemplate(input);
            }
            setIsDialogOpen(false);
            resetForm();
        } catch (error) {
            // Error handled by hook
        }
    };

    const handleDelete = async () => {
        if (!templateToDelete) return;
        try {
            await deleteTemplate(templateToDelete);
            setIsDeleteDialogOpen(false);
            setTemplateToDelete(null);
        } catch (error) {
            // Error handled by hook
        }
    };

    const confirmDelete = (id: string) => {
        setTemplateToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const insertVariable = (variable: string) => {
        setContent(prev => prev + variable);
    };

    if (isLoading) {
        return (
            <Card className="shadow-lyn">
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="shadow-lyn">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                Respostas Rápidas
                            </CardTitle>
                            <CardDescription>
                                Configure mensagens prontas para agilizar suas conversas
                            </CardDescription>
                        </div>
                        <Button onClick={openCreateDialog}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nova Resposta
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {templates.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">Nenhuma resposta rápida ainda</p>
                            <p className="text-sm">Crie templates para agilizar suas conversas no WhatsApp</p>
                            <Button onClick={openCreateDialog} variant="outline" className="mt-4">
                                <Plus className="h-4 w-4 mr-2" />
                                Criar primeira resposta
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {templates.map((template) => (
                                <div
                                    key={template.id}
                                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium">{template.title}</span>
                                            {template.shortcut && (
                                                <Badge variant="secondary" className="font-mono text-xs">
                                                    /{template.shortcut}
                                                </Badge>
                                            )}
                                            {template.category && (
                                                <Badge variant="outline" className="text-xs">
                                                    {template.category}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {template.content}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 ml-4">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => openEditDialog(template)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => confirmDelete(template.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingTemplate ? "Editar Resposta Rápida" : "Nova Resposta Rápida"}
                        </DialogTitle>
                        <DialogDescription>
                            Crie mensagens prontas para usar nas conversas do WhatsApp
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Título *</Label>
                            <Input
                                id="title"
                                placeholder="Ex: Saudação Inicial"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content">Conteúdo *</Label>
                            <Textarea
                                id="content"
                                placeholder="Olá {nome}! Tudo bem? Como posso ajudar?"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={4}
                            />
                            <div className="flex flex-wrap gap-1 mt-2">
                                <span className="text-xs text-muted-foreground mr-2">Variáveis:</span>
                                {["{nome}", "{empresa}", "{telefone}", "{meu_nome}"].map((v) => (
                                    <Badge
                                        key={v}
                                        variant="outline"
                                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs"
                                        onClick={() => insertVariable(v)}
                                    >
                                        {v}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="shortcut">Atalho (opcional)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">/</span>
                                    <Input
                                        id="shortcut"
                                        placeholder="hello"
                                        value={shortcut}
                                        onChange={(e) => setShortcut(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                                        className="pl-7"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="category">Categoria (opcional)</Label>
                                <Input
                                    id="category"
                                    placeholder="Saudações"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                            <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
                                Use variáveis como <code className="bg-background px-1 rounded">{"{nome}"}</code> para personalizar automaticamente com os dados do lead.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!title.trim() || !content.trim() || isCreating || isUpdating}
                        >
                            {(isCreating || isUpdating) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingTemplate ? "Salvar" : "Criar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir resposta rápida</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir esta resposta rápida? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
