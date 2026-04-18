import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "./badge";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface TagInputProps {
    value: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    className?: string;
    maxTags?: number;
}

export function TagInput({
    value,
    onChange,
    placeholder = "Digite e pressione Enter...",
    className,
    maxTags = 10
}: TagInputProps) {
    const [inputValue, setInputValue] = useState("");
    const tags = Array.isArray(value) ? value : [];

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag();
        } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
            // Remove last tag when backspace is pressed on empty input
            removeTag(tags.length - 1);
        }
    };

    const addTag = () => {
        const trimmedValue = inputValue.trim().toLowerCase();

        if (!trimmedValue) return;
        if (tags.length >= maxTags) return;
        if (tags.includes(trimmedValue)) {
            setInputValue("");
            return;
        }

        onChange([...tags, trimmedValue]);
        setInputValue("");
    };

    const removeTag = (indexToRemove: number) => {
        onChange(tags.filter((_, index) => index !== indexToRemove));
    };

    return (
        <div className={cn("flex flex-wrap gap-2 p-2 border rounded-md bg-background", className)}>
            {tags.map((tag, index) => (
                <Badge
                    key={`${tag}-${index}`}
                    variant="secondary"
                    className="gap-1 pr-1"
                >
                    {tag}
                    <button
                        type="button"
                        onClick={() => removeTag(index)}
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                    >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remover {tag}</span>
                    </button>
                </Badge>
            ))}
            <Input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={addTag}
                placeholder={tags.length === 0 ? placeholder : ""}
                className="flex-1 min-w-[120px] border-0 p-0 h-7 focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={tags.length >= maxTags}
            />
        </div>
    );
}
