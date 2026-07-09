// Client-side CSV export utility. Escapes fields per RFC 4180 and triggers
// a browser download via an object URL. UTF-8 BOM so Excel opens tildes and
// the ü in "Nüva" correctly on Windows.
export function downloadCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns?: { key: keyof T; label: string }[],
) {
  if (typeof window === "undefined") return;
  const cols =
    columns ??
    (rows[0]
      ? (Object.keys(rows[0]).map((k) => ({ key: k as keyof T, label: k })) as {
          key: keyof T;
          label: string;
        }[])
      : []);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.map((c) => escape(c.label)).join(",");
  const body = rows.map((r) => cols.map((c) => escape(r[c.key])).join(",")).join("\n");
  const csv = "\ufeff" + header + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
