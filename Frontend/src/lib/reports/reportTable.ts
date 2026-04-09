export type ReportTableSortType = "text" | "date";

function parseSortDate(value: string | null | undefined) {
  if (!value) return null;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function compareReportTableValues(
  left: string | null | undefined,
  right: string | null | undefined,
  type: ReportTableSortType,
  direction: "asc" | "desc",
) {
  let comparison = 0;

  if (type === "date") {
    const leftDate = parseSortDate(left);
    const rightDate = parseSortDate(right);

    if (leftDate === null && rightDate === null) comparison = 0;
    else if (leftDate === null) comparison = 1;
    else if (rightDate === null) comparison = -1;
    else comparison = leftDate - rightDate;
  } else {
    const leftText = left?.trim() ?? "";
    const rightText = right?.trim() ?? "";

    if (!leftText && !rightText) comparison = 0;
    else if (!leftText) comparison = 1;
    else if (!rightText) comparison = -1;
    else comparison = leftText.localeCompare(rightText, "pt-BR", { numeric: true, sensitivity: "base" });
  }

  return direction === "asc" ? comparison : -comparison;
}

export function clampReportTablePage(page: number, totalItems: number, pageSize: number) {
  if (totalItems <= 0) return 0;
  return Math.max(0, Math.min(page, Math.ceil(totalItems / pageSize) - 1));
}
