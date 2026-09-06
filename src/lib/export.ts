// Client-side export utilities. The default exporter is RFC 4180 compatible and
// keeps an UTF-8 BOM so Excel opens Spanish accents correctly on Windows.
export type ExportColumn<T> = { key: keyof T; label: string };

function escapeCsv(v: unknown) {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns?: ExportColumn<T>[],
) {
  if (typeof window === "undefined") return;
  const cols = columns ?? (rows[0] ? Object.keys(rows[0]).map((key) => ({ key: key as keyof T, label: key })) : []);
  const header = cols.map((c) => escapeCsv(c.label)).join(",");
  const body = rows.map((row) => cols.map((c) => escapeCsv(row[c.key])).join(",")).join("\n");
  const blob = new Blob(["\ufeff", header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}

/**
 * Exports canonical Nüva data using an external business vocabulary/order.
 * This is the inverse of intelligent import: the business can keep its own
 * column names instead of being forced into Nüva's internal schema.
 */
export function downloadMappedCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  mapping: { key: keyof T; header: string }[],
) {
  downloadCsv(filename, rows, mapping.map(({ key, header }) => ({ key, label: header })));
}
