import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { GripVertical, Loader2, Plus, Trash2, Pencil, Check, X, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import {
  usePipelines,
  usePipelineStages,
  useCreatePipeline,
  useUpdatePipeline,
  useDeletePipeline,
  useTogglePipelineVisibility,
  useCreateStage,
  useUpdateStage,
  useDeleteStage,
  useReorderStages,
  PipelineStage,
} from "@/hooks/usePipelines";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const companySchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
});

type CompanyFormData = z.infer<typeof companySchema>;

// Sortable Stage Item Component
interface SortableStageItemProps {
  stage: PipelineStage;
  isEditing: boolean;
  editingName: string;
  onEditStart: () => void;
  onEditChange: (name: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onDelete: () => void;
  isUpdating: boolean;
  isDeleting: boolean;
  canDelete: boolean;
}

function SortableStageItem({
  stage,
  isEditing,
  editingName,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  onDelete,
  isUpdating,
  isDeleting,
  canDelete,
}: SortableStageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
    >
      <button
        type="button"
        className="touch-none cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5 text-muted-foreground shrink-0" />
      </button>
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: stage.color || "#6B7280" }}
      />

      {isEditing ? (
        <>
          <Input
            value={editingName}
            onChange={(e) => onEditChange(e.target.value)}
            className="flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") onEditSave();
              if (e.key === "Escape") onEditCancel();
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEditSave}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4 text-green-600" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEditCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1">{stage.name}</span>
          {stage.is_final && (
            <Badge variant="secondary" className="text-xs">Final</Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEditStart}
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting || !canDelete}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </>
      )}
    </div>
  );
}

export function CompanySettingsForm() {
  const { company, refetch } = useCompany();
  const { isAdmin, isSuperAdmin } = useRole();
  const [saving, setSaving] = useState(false);

  // Pipeline management state
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [newStageName, setNewStageName] = useState("");
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState("");
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null);
  const [editingPipelineName, setEditingPipelineName] = useState("");

  // Hooks for pipeline management
  const { data: pipelinesData, isLoading: loadingPipelines } = usePipelines();
  const pipelines = pipelinesData ?? [];
  const { data: stagesData, isLoading: loadingStages } = usePipelineStages(selectedPipelineId);
  const stages = stagesData ?? [];

  // Mutations
  const createPipeline = useCreatePipeline();
  const updatePipeline = useUpdatePipeline();
  const deletePipeline = useDeletePipeline();
  const toggleVisibility = useTogglePipelineVisibility();
  const createStage = useCreateStage();
  const updateStage = useUpdateStage();
  const deleteStage = useDeleteStage();
  const reorderStages = useReorderStages();

  const canEdit = isAdmin || isSuperAdmin;

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Select first pipeline when loaded
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];
      setSelectedPipelineId(defaultPipeline.id);
    }
  }, [pipelines, selectedPipelineId]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company?.name || "",
    },
  });

  const onSubmit = async (data: CompanyFormData) => {
    if (!canEdit || !company?.id) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("lyn_company")
        .update({ name: data.name })
        .eq("id", company.id);

      if (error) throw error;

      toast({
        title: "Empresa atualizada",
        description: "As informações foram salvas com sucesso.",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Pipeline handlers
  const handleAddPipeline = async () => {
    if (!newPipelineName.trim()) return;

    try {
      await createPipeline.mutateAsync({
        name: newPipelineName.trim(),
      });
      setNewPipelineName("");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeletePipeline = async (id: string) => {
    try {
      await deletePipeline.mutateAsync(id);
      if (selectedPipelineId === id) {
        setSelectedPipelineId(null);
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Stage handlers
  const handleAddStage = async () => {
    if (!newStageName.trim() || !selectedPipelineId) return;

    try {
      await createStage.mutateAsync({
        pipelineId: selectedPipelineId,
        name: newStageName.trim(),
      });
      setNewStageName("");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleStartEditStage = (stage: PipelineStage) => {
    setEditingStageId(stage.id);
    setEditingStageName(stage.name);
  };

  const handleSaveStage = async () => {
    if (!editingStageId || !editingStageName.trim() || !selectedPipelineId) return;

    try {
      await updateStage.mutateAsync({
        id: editingStageId,
        pipelineId: selectedPipelineId,
        name: editingStageName.trim(),
      });
      setEditingStageId(null);
      setEditingStageName("");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCancelEditStage = () => {
    setEditingStageId(null);
    setEditingStageName("");
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!selectedPipelineId) return;

    try {
      await deleteStage.mutateAsync({
        id: stageId,
        pipelineId: selectedPipelineId,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Drag and Drop handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !selectedPipelineId || !stages || stages.length === 0) return;

    const oldIndex = stages.findIndex((s) => s.id === active.id);
    const newIndex = stages.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedStages = arrayMove(stages, oldIndex, newIndex);
    const stageOrder = reorderedStages.map((s) => s.id);

    try {
      await reorderStages.mutateAsync({
        pipelineId: selectedPipelineId,
        stageIds: stageOrder,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (!canEdit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configurações da Empresa</CardTitle>
          <CardDescription>
            Você não tem permissão para editar estas informações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Nome da Empresa</Label>
              <Input value={company?.name || ""} disabled className="bg-muted" />
            </div>
            <div>
              <Label>Funis Configurados</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {Array.isArray(pipelines) && pipelines.map((pipeline) => (
                  <span key={pipeline.id} className="px-3 py-1 bg-lyn-primary-light/20 text-lyn-primary rounded-full text-sm">
                    {pipeline.name}
                    {pipeline.is_default && <Badge variant="outline" className="ml-1 text-xs">Padrão</Badge>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Informações da Empresa</CardTitle>
            <CardDescription>
              Configure os dados principais da sua organização
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Empresa</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Nome
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Pipeline Management */}
      <Card>
        <CardHeader>
          <CardTitle>Funis de Vendas</CardTitle>
          <CardDescription>
            Gerencie os funis de entrada de leads (WhatsApp, Instagram, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Pipeline List */}
            <div className="space-y-2">
              {loadingPipelines ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : Array.isArray(pipelines) && pipelines.length > 0 ? (
                pipelines.map((pipeline) => (
                  <div
                    key={pipeline.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-4 rounded-xl cursor-pointer transition-colors min-h-[60px]",
                      selectedPipelineId === pipeline.id
                        ? "bg-lyn-primary/10 border border-lyn-primary/30"
                        : "bg-muted/50 hover:bg-muted",
                      !pipeline.is_active && "opacity-50"
                    )}
                    onClick={() => setSelectedPipelineId(pipeline.id)}
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: pipeline.color || "#3B82F6" }}
                    />

                    {editingPipelineId === pipeline.id ? (
                      <>
                        <Input
                          value={editingPipelineName}
                          onChange={(e) => setEditingPipelineName(e.target.value)}
                          className="flex-1 h-8"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              updatePipeline.mutate({ id: pipeline.id, name: editingPipelineName.trim() }, {
                                onSuccess: () => setEditingPipelineId(null),
                              });
                            }
                            if (e.key === "Escape") setEditingPipelineId(null);
                          }}
                        />
                        <Button type="button" variant="ghost" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          updatePipeline.mutate({ id: pipeline.id, name: editingPipelineName.trim() }, {
                            onSuccess: () => setEditingPipelineId(null),
                          });
                        }}>
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          setEditingPipelineId(null);
                        }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 font-medium">{pipeline.name}</span>
                        {pipeline.is_default && (
                          <Badge variant="secondary" className="text-xs">Padrao</Badge>
                        )}
                        {!pipeline.is_active && (
                          <Badge variant="outline" className="text-xs">Oculto</Badge>
                        )}

                        {/* Edit name */}
                        <Button type="button" variant="ghost" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          setEditingPipelineId(pipeline.id);
                          setEditingPipelineName(pipeline.name);
                        }}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>

                        {/* Toggle visibility */}
                        <Button type="button" variant="ghost" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          toggleVisibility.mutate({ id: pipeline.id, is_active: !pipeline.is_active });
                        }} disabled={toggleVisibility.isPending}>
                          {pipeline.is_active ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>

                        {/* Delete */}
                        <Button type="button" variant="ghost" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Excluir o funil "${pipeline.name}"? Os leads nao serao apagados.`)) {
                            handleDeletePipeline(pipeline.id);
                          }
                        }} disabled={deletePipeline.isPending}>
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                ))
              ) : null}
            </div>

            {/* Add Pipeline */}
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar novo funil..."
                value={newPipelineName}
                onChange={(e) => setNewPipelineName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddPipeline();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddPipeline}
                disabled={!newPipelineName.trim() || createPipeline.isPending}
              >
                {createPipeline.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage Management for Selected Pipeline */}
      {selectedPipelineId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Etapas do Funil
              {selectedPipeline && (
                <Badge variant="outline" style={{ backgroundColor: selectedPipeline.color || "#3B82F6", color: "#fff" }}>
                  {selectedPipeline.name}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Arraste as etapas para reordená-las. As etapas aparecem como colunas no Kanban.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Stages List with DnD */}
              <div className="space-y-2">
                {loadingStages ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !Array.isArray(stages) || stages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma etapa configurada. Adicione etapas abaixo.
                  </p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={stages.map(s => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {stages.map((stage) => (
                        <SortableStageItem
                          key={stage.id}
                          stage={stage}
                          isEditing={editingStageId === stage.id}
                          editingName={editingStageName}
                          onEditStart={() => handleStartEditStage(stage)}
                          onEditChange={setEditingStageName}
                          onEditSave={handleSaveStage}
                          onEditCancel={handleCancelEditStage}
                          onDelete={() => handleDeleteStage(stage.id)}
                          isUpdating={updateStage.isPending}
                          isDeleting={deleteStage.isPending}
                          canDelete={stages.length > 1}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* Add Stage */}
              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar nova etapa..."
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddStage();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleAddStage}
                  disabled={!newStageName.trim() || createStage.isPending}
                >
                  {createStage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                💡 As etapas criadas aqui aparecem automaticamente como colunas no Kanban.
              </p>
            </div>
          </CardContent>
        </Card>
      )
      }
    </div >
  );
}
