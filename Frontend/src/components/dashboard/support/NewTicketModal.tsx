import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Bug, Sparkles, CreditCard, Plug, HelpCircle, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FileUploader } from "./FileUploader";
import { useCreateTicket, TICKET_CATEGORIES, TICKET_PRIORITIES } from "@/hooks/useTickets";
import type { TicketCategory, TicketPriority } from "@/hooks/useTickets";

const categoryIcons: Record<string, React.ElementType> = {
    bug: Bug, feature: Sparkles, billing: CreditCard, integration: Plug, general: HelpCircle,
};

interface NewTicketModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NewTicketModal({ open, onOpenChange }: NewTicketModalProps) {
    const [category, setCategory] = useState<TicketCategory>("general");
    const [priority, setPriority] = useState<TicketPriority>("medium");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const createTicket = useCreateTicket();

    const isValid =
        title.trim().length >= 3 &&
        title.trim().length <= 200 &&
        description.trim().length >= 10 &&
        description.trim().length <= 5000;

    const reset = () => {
        setCategory("general");
        setPriority("medium");
        setTitle("");
        setDescription("");
        setFiles([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        await createTicket.mutateAsync({
            title, description, category, priority, attachments: files,
        });

        reset();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                        Novo Chamado
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-2">
                    {/* Category */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Categoria *</Label>
                        <div className="grid grid-cols-5 gap-2">
                            {TICKET_CATEGORIES.map((cat) => {
                                const Icon = categoryIcons[cat.value];
                                return (
                                    <button
                                        key={cat.value}
                                        type="button"
                                        onClick={() => setCategory(cat.value)}
                                        className={cn(
                                            "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium",
                                            category === cat.value
                                                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-sm"
                                                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400"
                                        )}
                                    >
                                        <Icon className="h-5 w-5" />
                                        {cat.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Prioridade *</Label>
                        <div className="flex gap-2">
                            {TICKET_PRIORITIES.map((p) => (
                                <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => setPriority(p.value)}
                                    className={cn(
                                        "flex-1 py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all",
                                        priority === p.value
                                            ? p.value === "urgent"
                                                ? "border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                                                : p.value === "high"
                                                    ? "border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300"
                                                    : p.value === "medium"
                                                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                                                        : "border-slate-400 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                            : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300"
                                    )}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Título *</Label>
                            <span className={cn("text-xs", title.length > 200 ? "text-red-500" : "text-slate-400")}>
                                {title.length}/200
                            </span>
                        </div>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Descreva o problema em poucas palavras..."
                            maxLength={200}
                            className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        />
                        {title.length > 0 && title.length < 3 && (
                            <p className="text-xs text-red-500">Mínimo de 3 caracteres</p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Descrição *</Label>
                            <span className={cn("text-xs", description.length > 5000 ? "text-red-500" : "text-slate-400")}>
                                {description.length}/5000
                            </span>
                        </div>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Explique com detalhes o que aconteceu, o que esperava e como reproduzir o problema..."
                            rows={5}
                            maxLength={5000}
                            className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 resize-none"
                        />
                        {description.length > 0 && description.length < 10 && (
                            <p className="text-xs text-red-500">Mínimo de 10 caracteres</p>
                        )}
                    </div>

                    {/* Attachments */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Anexos <span className="font-normal text-slate-400">(opcional)</span>
                        </Label>
                        <FileUploader
                            files={files}
                            onChange={setFiles}
                            maxFiles={5}
                            disabled={createTicket.isPending}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => { reset(); onOpenChange(false); }}
                            className="rounded-xl"
                            disabled={createTicket.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={!isValid || createTicket.isPending}
                            className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white min-w-[140px]"
                        >
                            {createTicket.isPending ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Enviando...</>
                            ) : (
                                "Enviar Chamado"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
