import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Code2 } from 'lucide-react';

interface VariablePickerProps {
    onSelect: (variable: string) => void;
    customVariables?: string[];
}

const defaultVariables = [
    {
        group: 'Contato', vars: [
            { name: 'contact.name', label: 'Nome do contato' },
            { name: 'contact.phone', label: 'Telefone' },
            { name: 'contact.email', label: 'Email' },
            { name: 'contact.remote_jid', label: 'WhatsApp ID' },
        ]
    },
    {
        group: 'Fluxo', vars: [
            { name: 'flow.name', label: 'Nome do fluxo' },
            { name: 'flow.id', label: 'ID do fluxo' },
        ]
    },
    {
        group: 'Data/Hora', vars: [
            { name: 'current_date', label: 'Data atual' },
            { name: 'current_time', label: 'Hora atual' },
        ]
    },
    {
        group: 'Respostas', vars: [
            { name: 'user_response', label: 'Última resposta' },
        ]
    },
];

export function VariablePicker({ onSelect, customVariables = [] }: VariablePickerProps) {
    const [open, setOpen] = useState(false);

    const handleSelect = (variable: string) => {
        onSelect(`{{${variable}}}`);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 px-2">
                    <Code2 className="w-3 h-3 mr-1" />
                    {`{{}}`}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
                <Command>
                    <CommandInput placeholder="Buscar variável..." />
                    <CommandList>
                        <CommandEmpty>Nenhuma variável encontrada</CommandEmpty>

                        {defaultVariables.map((group) => (
                            <CommandGroup key={group.group} heading={group.group}>
                                {group.vars.map((v) => (
                                    <CommandItem
                                        key={v.name}
                                        value={v.name}
                                        onSelect={() => handleSelect(v.name)}
                                    >
                                        <span className="font-mono text-xs text-primary">{`{{${v.name}}}`}</span>
                                        <span className="ml-2 text-xs text-muted-foreground">{v.label}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}

                        {customVariables.length > 0 && (
                            <CommandGroup heading="Variáveis Personalizadas">
                                {customVariables.map((v) => (
                                    <CommandItem
                                        key={v}
                                        value={v}
                                        onSelect={() => handleSelect(v)}
                                    >
                                        <span className="font-mono text-xs text-primary">{`{{${v}}}`}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
