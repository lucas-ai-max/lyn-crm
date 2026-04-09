import { useCallback, useRef, useState } from "react";
import { Upload, X, FileText, Film, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateFile } from "@/hooks/useTickets";

interface FileUploaderProps {
    files: File[];
    onChange: (files: File[]) => void;
    maxFiles?: number;
    disabled?: boolean;
}

export function FileUploader({ files, onChange, maxFiles = 5, disabled }: FileUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const addFiles = useCallback((newFiles: FileList | File[]) => {
        const incoming = Array.from(newFiles);
        const validFiles: File[] = [];
        const newErrors: string[] = [];

        for (const file of incoming) {
            if (files.length + validFiles.length >= maxFiles) {
                newErrors.push(`Máximo de ${maxFiles} arquivos atingido.`);
                break;
            }
            const error = validateFile(file);
            if (error) {
                newErrors.push(`${file.name}: ${error}`);
            } else {
                validFiles.push(file);
            }
        }

        setErrors(newErrors);
        if (validFiles.length > 0) {
            onChange([...files, ...validFiles]);
        }
    }, [files, onChange, maxFiles]);

    const removeFile = (index: number) => {
        onChange(files.filter((_, i) => i !== index));
        setErrors([]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled) addFiles(e.dataTransfer.files);
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith("image/")) return ImageIcon;
        if (type.startsWith("video/")) return Film;
        return FileText;
    };

    const getPreviewUrl = (file: File) => {
        if (file.type.startsWith("image/")) return URL.createObjectURL(file);
        return null;
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    };

    return (
        <div className="space-y-3">
            {/* Drop zone */}
            <div
                onClick={() => !disabled && inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                    "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all",
                    dragOver
                        ? "border-indigo-400 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30"
                        : "border-slate-200 bg-slate-50/50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/30 dark:hover:border-slate-600",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            >
                <Upload className="h-8 w-8 text-slate-400" />
                <div className="text-center">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        Arraste arquivos aqui ou <span className="text-indigo-600 dark:text-indigo-400">clique para selecionar</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        Imagens, vídeos ou PDF · Máx {maxFiles} arquivos · 50MB cada
                    </p>
                </div>
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm,application/pdf"
                    onChange={(e) => e.target.files && addFiles(e.target.files)}
                    className="hidden"
                    disabled={disabled}
                />
            </div>

            {/* Errors */}
            {errors.length > 0 && (
                <div className="space-y-1">
                    {errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-500">{err}</p>
                    ))}
                </div>
            )}

            {/* File previews */}
            {files.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    {files.map((file, index) => {
                        const Icon = getFileIcon(file.type);
                        const preview = getPreviewUrl(file);
                        return (
                            <div
                                key={index}
                                className="group relative flex flex-col items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 w-24"
                            >
                                <button
                                    type="button"
                                    onClick={() => removeFile(index)}
                                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                                {preview ? (
                                    <img src={preview} alt={file.name} className="h-14 w-20 object-cover rounded-lg" />
                                ) : (
                                    <div className="h-14 w-20 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
                                        <Icon className="h-6 w-6 text-slate-400" />
                                    </div>
                                )}
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full text-center">{file.name}</p>
                                <p className="text-[10px] text-slate-400">{formatSize(file.size)}</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
