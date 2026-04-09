import { useState, useEffect } from "react";
import { useActivePipelines, usePipelineStages, Pipeline, PipelineStage } from "@/hooks/usePipelines";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface PipelineStageSelectorProps {
    pipelineId: string | null;
    stageId: string | null;
    onPipelineChange: (pipelineId: string | null) => void;
    onStageChange: (stageId: string | null) => void;
    disabled?: boolean;
}

export function PipelineStageSelector({
    pipelineId,
    stageId,
    onPipelineChange,
    onStageChange,
    disabled = false,
}: PipelineStageSelectorProps) {
    const { data: pipelines = [], isLoading: isLoadingPipelines } = useActivePipelines();
    const { data: stages = [], isLoading: isLoadingStages } = usePipelineStages(pipelineId);

    // When pipeline changes, reset stage to the first stage of the new pipeline
    useEffect(() => {
        if (stages.length > 0 && !stages.some(s => s.id === stageId)) {
            onStageChange(stages[0].id);
        }
    }, [stages, stageId, onStageChange]);

    if (isLoadingPipelines) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando funis...
            </div>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {/* Pipeline Select */}
            <div className="space-y-2">
                <Label>Funil</Label>
                <Select
                    value={pipelineId || ""}
                    onValueChange={(value) => {
                        onPipelineChange(value || null);
                    }}
                    disabled={disabled}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione um funil" />
                    </SelectTrigger>
                    <SelectContent>
                        {pipelines.map((pipeline) => (
                            <SelectItem key={pipeline.id} value={pipeline.id}>
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: pipeline.color || "#3B82F6" }}
                                    />
                                    <span className="truncate">{pipeline.name}</span>
                                    {pipeline.is_default && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 ml-auto">
                                            Padrão
                                        </Badge>
                                    )}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                    Escolha o funil de vendas para este lead
                </p>
            </div>

            {/* Stage Select */}
            <div className="space-y-2">
                <Label>Etapa</Label>
                <Select
                    value={stageId || ""}
                    onValueChange={(value) => {
                        onStageChange(value || null);
                    }}
                    disabled={disabled || !pipelineId || isLoadingStages}
                >
                    <SelectTrigger>
                        {isLoadingStages ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Carregando...</span>
                            </div>
                        ) : (
                            <SelectValue placeholder={pipelineId ? "Selecione uma etapa" : "Selecione um funil primeiro"} />
                        )}
                    </SelectTrigger>
                    <SelectContent>
                        {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: stage.color || "#6B7280" }}
                                    />
                                    <span className="truncate">{stage.name}</span>
                                    {stage.is_final && (
                                        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-auto">
                                            Final
                                        </Badge>
                                    )}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                    Define a etapa atual do lead no funil
                </p>
            </div>
        </div>
    );
}
