import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLeads, useAllLeads } from "@/hooks/useLeads";
import { LeadFilters } from "@/components/dashboard/LeadFilters";
import { LeadTable } from "@/components/dashboard/LeadTable";
import { LeadModal } from "@/components/dashboard/LeadModal";
import { KanbanWrapper } from "@/components/dashboard/KanbanWrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableIcon, KanbanSquare, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Paginated data for table view
  const {
    data: paginatedData,
    isLoading,
    isFetching
  } = useLeads({
    page: currentPage,
    pageSize,
    searchQuery,
    segmentFilter,
    sourceFilter
  });

  // All leads for Kanban (uses optimized query with less fields)
  const { data: allLeadsData } = useAllLeads();

  const leads = paginatedData?.leads || [];
  const totalCount = paginatedData?.totalCount || 0;
  const totalPages = paginatedData?.totalPages || 1;

  const handleEdit = (id: string) => {
    setEditingLeadId(id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("lyn_leads").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Lead excluído com sucesso",
      });

      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["all-leads"] });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir lead",
        variant: "destructive",
      });
    }
  };

  const handleNewLead = () => {
    setEditingLeadId(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingLeadId(null);
  };

  const editingLead = editingLeadId
    ? leads.find((lead) => lead.id === editingLeadId)
    : null;

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page
  };

  // Reset page when filters change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page
  };

  const handleSegmentChange = (segment: string) => {
    setSegmentFilter(segment);
    setCurrentPage(1); // Reset to first page
  };

  const handleSourceChange = (source: string) => {
    setSourceFilter(source);
    setCurrentPage(1); // Reset to first page
  };

  if (isLoading && !leads.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie e acompanhe todos os seus leads em um só lugar
            {totalCount > 0 && (
              <span className="ml-2 text-sm font-medium">
                ({totalCount.toLocaleString('pt-BR')} total)
              </span>
            )}
          </p>
        </div>
      </div>

      <LeadFilters
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        segmentFilter={segmentFilter}
        onSegmentFilterChange={handleSegmentChange}
        sourceFilter={sourceFilter}
        onSourceFilterChange={handleSourceChange}
        onNewLead={handleNewLead}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="list" className="gap-2">
            <TableIcon className="h-4 w-4" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="kanban" className="gap-2">
            <KanbanSquare className="h-4 w-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2" disabled>
            <BarChart3 className="h-4 w-4" />
            Estatísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-6">
          <LeadTable
            leads={leads}
            onEdit={handleEdit}
            onDelete={handleDelete}
            // Server-side pagination props
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            isLoading={isFetching}
          />
        </TabsContent>

        <TabsContent value="kanban" className="mt-6">
          <KanbanWrapper
            searchQuery={searchQuery}
            segmentFilter={segmentFilter}
            sourceFilter={sourceFilter}
          />
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            Estatísticas em desenvolvimento
          </div>
        </TabsContent>
      </Tabs>

      <LeadModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ["leads"] });
          queryClient.invalidateQueries({ queryKey: ["all-leads"] });
          queryClient.invalidateQueries({ queryKey: ["lead_notes"] }); // Ensure notes are refreshed
          handleModalClose();
        }}
        mode={editingLeadId ? "edit" : "create"}
        initialData={
          editingLead
            ? {
              id: editingLead.id,
              nome: editingLead.nome,
              email: editingLead.email || "",
              telefone: editingLead.telefone || "",
              empresa: editingLead.empresa || "",
              segmento: editingLead.segmento || "",
              prioridade: (editingLead as any).prioridade || "medium",
              notas: Array.isArray(editingLead.notas) ? editingLead.notas.join("\n") : (editingLead.notas || ""),
              funil: editingLead.funil || "",
              status: editingLead.status || "",
              responsavel_id: editingLead.responsavel_id || "",
            }
            : undefined
        }
      />
    </div>
  );
}
