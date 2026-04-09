export interface LeadStageSnapshot {
  name?: string | null;
  position?: number | null;
  is_final?: boolean | null;
}

export interface LeadLifecycleInput {
  status?: string | null;
  stage?: LeadStageSnapshot | null;
}

export type LeadLifecycleBucket = "new" | "active" | "scheduled" | "converted" | "other";

export interface LeadLifecycleMeta {
  id: LeadLifecycleBucket;
  label: string;
  color: string;
}

const NEW_KEYS = new Set(["novo", "novos"]);
const ACTIVE_KEYS = new Set([
  "em_andamento",
  "negociacao",
  "objecao",
  "proposta",
  "qualificacao",
  "qualificacao_inicial",
]);
const SCHEDULE_KEYS = new Set(["agendamento", "agendado"]);
const CONVERSION_KEYS = new Set(["ganho", "fechamento", "fechado", "convertido"]);

export const LIFECYCLE_BUCKETS: LeadLifecycleMeta[] = [
  { id: "new", label: "Novos", color: "#4f46e5" },
  { id: "active", label: "Em atendimento", color: "#f59e0b" },
  { id: "scheduled", label: "Agendados", color: "#7c3aed" },
  { id: "converted", label: "Convertidos", color: "#10b981" },
  { id: "other", label: "Outros", color: "#94a3b8" },
];

export function normalizeLeadLifecycleKey(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[^\p{Letter}\p{Number}\s_/-]/gu, "")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s/-]+/g, "_");
}

function matchesKeySet(keys: Set<string>, values: Array<string | undefined>) {
  return values.some((value) => !!value && keys.has(value));
}

export function isLeadScheduled(input: LeadLifecycleInput) {
  const stageKey = normalizeLeadLifecycleKey(input.stage?.name);
  const statusKey = normalizeLeadLifecycleKey(input.status);
  return matchesKeySet(SCHEDULE_KEYS, [stageKey, statusKey]);
}

export function isLeadConverted(input: LeadLifecycleInput) {
  const stageKey = normalizeLeadLifecycleKey(input.stage?.name);
  const statusKey = normalizeLeadLifecycleKey(input.status);

  if (isLeadScheduled(input)) return false;

  return Boolean(input.stage?.is_final) || matchesKeySet(CONVERSION_KEYS, [stageKey, statusKey]);
}

export function classifyLeadLifecycle(input: LeadLifecycleInput): LeadLifecycleBucket {
  const stageKey = normalizeLeadLifecycleKey(input.stage?.name);
  const statusKey = normalizeLeadLifecycleKey(input.status);
  const stagePosition = typeof input.stage?.position === "number" ? input.stage.position : null;

  if (isLeadScheduled(input)) return "scheduled";
  if (isLeadConverted(input)) return "converted";
  if (stagePosition === 0 || matchesKeySet(NEW_KEYS, [stageKey, statusKey])) return "new";

  if (
    (stagePosition !== null && stagePosition > 0 && !input.stage?.is_final) ||
    matchesKeySet(ACTIVE_KEYS, [stageKey, statusKey])
  ) {
    return "active";
  }

  return "other";
}

export function getLifecycleMeta(bucket: LeadLifecycleBucket) {
  return LIFECYCLE_BUCKETS.find((item) => item.id === bucket) ?? LIFECYCLE_BUCKETS[LIFECYCLE_BUCKETS.length - 1];
}
