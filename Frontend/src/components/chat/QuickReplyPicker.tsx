import { useState, useEffect } from "react";
import { useQuickReplies, QuickReplyTemplate } from "@/hooks/useQuickReplies";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Zap, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickReplyPickerProps {
    onSelect: (template: QuickReplyTemplate) => void;
    trigger?: React.ReactNode;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    className?: string;
}

export function QuickReplyPicker({
    onSelect,
    trigger,
    isOpen: externalIsOpen,
    onOpenChange: externalOnOpenChange,
    className
}: QuickReplyPickerProps) {
    const { templates, isLoading } = useQuickReplies();
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [search, setSearch] = useState("");

    const isControlled = externalIsOpen !== undefined;
    const isOpen = isControlled ? externalIsOpen : internalIsOpen;
    const onOpenChange = isControlled ? externalOnOpenChange : setInternalIsOpen;

    const filteredTemplates = templates.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.content.toLowerCase().includes(search.toLowerCase()) ||
        (t.shortcut && t.shortcut.toLowerCase().includes(search.toLowerCase())) ||
        (t.category && t.category.toLowerCase().includes(search.toLowerCase()))
    );

    const handleSelect = (template: QuickReplyTemplate) => {
        onSelect(template);
        if (onOpenChange) onOpenChange(false);
        setSearch("");
    };

    return (
        <Popover open={isOpen} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                {trigger || (
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("text-muted-foreground hover:text-foreground", className)}
                        title="Respostas Rápidas"
                    >
                        <Zap className="h-5 w-5" />
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0" align="start" side="top">
                <div className="p-3 border-b">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar resposta rápida..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <ScrollArea className="h-[300px]">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-20">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                            {search ? "Nenhuma resposta encontrada" : "Nenhuma resposta configurada"}
                        </div>
                    ) : (
                        <div className="p-1">
                            {filteredTemplates.map((template) => (
                                <button
                                    key={template.id}
                                    className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors group"
                                    onClick={() => handleSelect(template)}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-sm">{template.title}</span>
                                        <div className="flex items-center gap-1">
                                            {template.shortcut && (
                                                <Badge variant="secondary" className="font-mono text-[10px] h-5 px-1">
                                                    /{template.shortcut}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground transition-colors">
                                        {template.content}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <div className="p-2 border-t bg-muted/50 text-[10px] text-muted-foreground text-center">
                    Dica: Digite <kbd className="bg-background px-1 rounded border inline-block min-w-[1.2em] text-center font-mono">/</kbd> na conversa para acesso rápido
                </div>
            </PopoverContent>
        </Popover>
    );
}
