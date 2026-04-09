import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { LeadWithLastMessage } from "@/hooks/useLeads";
import { LeadStageSelector } from "@/components/dashboard/leads/LeadStageSelector";

type Lead = LeadWithLastMessage;

interface LeadTableProps {
  leads: Lead[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  // Server-side pagination props
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  isLoading?: boolean;
}

const segmentColors: Record<string, string> = {
  Startup: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20",
  SMB: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
  Enterprise: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20",
  Other: "bg-gray-500/10 text-gray-600 hover:bg-gray-500/20",
};

export function LeadTable({
  leads,
  onEdit,
  onDelete,
  currentPage: externalCurrentPage,
  totalPages: externalTotalPages,
  pageSize: externalPageSize,
  totalCount: externalTotalCount,
  onPageChange,
  onPageSizeChange,
  isLoading = false
}: LeadTableProps) {
  // Internal state for client-side pagination (fallback)
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const [internalItemsPerPage, setInternalItemsPerPage] = useState(10);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Use external pagination if provided, otherwise use internal
  const isServerPaginated = onPageChange !== undefined;
  const currentPage = isServerPaginated ? (externalCurrentPage ?? 1) : internalCurrentPage;
  const itemsPerPage = isServerPaginated ? (externalPageSize ?? 25) : internalItemsPerPage;
  const totalCount = isServerPaginated ? (externalTotalCount ?? 0) : leads.length;
  const totalPages = isServerPaginated
    ? (externalTotalPages ?? 1)
    : Math.ceil(leads.length / itemsPerPage);

  // For client-side pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLeads = isServerPaginated ? leads : leads.slice(startIndex, endIndex);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(currentLeads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads([...selectedLeads, leadId]);
    } else {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId));
    }
  };

  const handleDeleteClick = (id: string) => {
    setLeadToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (leadToDelete) {
      onDelete(leadToDelete);
    }
    setDeleteDialogOpen(false);
    setLeadToDelete(null);
  };

  const goToPage = (page: number) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    if (isServerPaginated && onPageChange) {
      onPageChange(newPage);
    } else {
      setInternalCurrentPage(newPage);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    const newSize = Number(value);
    if (isServerPaginated && onPageSizeChange) {
      onPageSizeChange(newSize);
    } else {
      setInternalItemsPerPage(newSize);
      setInternalCurrentPage(1);
    }
  };

  // Calculate display range
  const displayStart = isServerPaginated
    ? (currentPage - 1) * itemsPerPage + 1
    : startIndex + 1;
  const displayEnd = isServerPaginated
    ? Math.min(currentPage * itemsPerPage, totalCount)
    : Math.min(endIndex, leads.length);

  return (
    <div className="space-y-4">
      <div className="border rounded-lg relative">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedLeads.length === currentLeads.length && currentLeads.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Nome ⇅</TableHead>
              <TableHead>E-mail ⇅</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Empresa ⇅</TableHead>
              <TableHead>Segmento ⇅</TableHead>
              <TableHead>Funil ⇅</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentLeads.length === 0 && !isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhum lead encontrado
                </TableCell>
              </TableRow>
            ) : (
              currentLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/dashboard/whatsapp/chat?leadId=${lead.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedLeads.includes(lead.id)}
                      onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{lead.nome}</TableCell>
                  <TableCell>{lead.email || "-"}</TableCell>
                  <TableCell>{lead.telefone || "-"}</TableCell>
                  <TableCell>{lead.empresa || "-"}</TableCell>
                  <TableCell>
                    {lead.segmento ? (
                      <Badge variant="secondary" className={segmentColors[lead.segmento] || segmentColors.Other}>
                        {lead.segmento}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.pipeline?.name || lead.funil || "-"}
                  </TableCell>
                  <TableCell>
                    <LeadStageSelector
                      leadId={lead.id}
                      currentStatus={lead.status}
                      onStatusChange={() => {
                        queryClient.invalidateQueries({ queryKey: ["leads"] });
                        queryClient.invalidateQueries({ queryKey: ["lead-counts"] });
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(lead.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteClick(lead.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Mostrando {totalCount === 0 ? 0 : displayStart} – {displayEnd} de{" "}
          <span className="font-medium">{totalCount.toLocaleString('pt-BR')}</span> registros
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">Mostrar:</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={handleItemsPerPageChange}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 ml-4">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToPage(pageNum)}
                  disabled={isLoading}
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir este lead? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
