export type ResumenPage<T> = {
  data: T[] | null;
  error: unknown | null;
};

/**
 * Reads a complete, deterministically ordered Supabase result in bounded pages.
 * Supabase projects commonly cap each response at 1,000 rows; dashboard totals
 * must not silently undercount once a business grows beyond that limit.
 */
export async function fetchAllResumenRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<ResumenPage<T>>,
  pageSize = 1000,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError("pageSize must be a positive integer");
  }

  const rows: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await fetchPage(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
