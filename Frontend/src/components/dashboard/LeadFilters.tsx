import { Search, Filter, Globe, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// Facebook icon component
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

interface LeadFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  segmentFilter: string;
  onSegmentFilterChange: (value: string) => void;
  sourceFilter?: string;
  onSourceFilterChange?: (value: string) => void;
  onNewLead: () => void;
}

const SEGMENTS = ["All", "Startup", "SMB", "Enterprise", "Other"];

const SOURCES = [
  { value: "All", label: "Todas as Origens", icon: null },
  { value: "system", label: "Sistema", icon: Globe },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "facebook_lead_ads", label: "Facebook Ads", icon: FacebookIcon },
];

export function LeadFilters({
  searchQuery,
  onSearchChange,
  segmentFilter,
  onSegmentFilterChange,
  sourceFilter = "All",
  onSourceFilterChange,
  onNewLead,
}: LeadFiltersProps) {
  // Count active filters
  const activeFilters =
    (segmentFilter !== "All" ? 1 : 0) + (sourceFilter !== "All" ? 1 : 0);

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <h1 className="text-2xl font-bold text-foreground">Leads</h1>

      <div className="flex items-center gap-3 flex-1 justify-end">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Busque por nome, e-mail ou telefone"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {activeFilters > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {activeFilters}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-4">
              <div>
                <Label>Segmento</Label>
                <Select value={segmentFilter} onValueChange={onSegmentFilterChange}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Todos os segmentos" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map((segment) => (
                      <SelectItem key={segment} value={segment}>
                        {segment === "All" ? "Todos os segmentos" : segment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {onSourceFilterChange && (
                <div>
                  <Label>Origem</Label>
                  <Select value={sourceFilter} onValueChange={onSourceFilterChange}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Todas as origens" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCES.map((source) => (
                        <SelectItem key={source.value} value={source.value}>
                          <div className="flex items-center gap-2">
                            {source.icon && (
                              <source.icon
                                className={`h-4 w-4 ${
                                  source.value === "whatsapp"
                                    ? "text-[#25D366]"
                                    : source.value === "facebook_lead_ads"
                                    ? "text-[#1877F2]"
                                    : "text-muted-foreground"
                                }`}
                              />
                            )}
                            {source.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {activeFilters > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    onSegmentFilterChange("All");
                    onSourceFilterChange?.("All");
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Button onClick={onNewLead} className="bg-[#2563eb] hover:bg-[#1d4ed8] gap-2">
          <span className="text-lg">+</span>
          Novo Lead
        </Button>
      </div>
    </div>
  );
}
