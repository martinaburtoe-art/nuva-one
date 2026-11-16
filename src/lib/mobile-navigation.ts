const MOBILE_PRIMARY_PATHS = new Set(["/dashboard", "/pos", "/sales", "/inventory"]);

export type MobileNavigationItem = {
  to: string;
  label: string;
  section?: string;
};

function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es");
}

/**
 * Splits the authorized desktop navigation into the four persistent mobile
 * destinations and the searchable module directory. With no query, primary
 * and secondary items partition the list; with a query, all authorized items
 * can appear in results while the persistent dock remains unchanged.
 */
export function splitMobileNavigation<T extends MobileNavigationItem>(
  items: readonly T[],
  query = "",
): { primary: T[]; more: T[] } {
  const normalizedQuery = normalizeSearchText(query.trim());
  const primary = items.filter((item) => MOBILE_PRIMARY_PATHS.has(item.to));
  const more = normalizedQuery
    ? items.filter((item) => (
      normalizeSearchText(item.label).includes(normalizedQuery)
      || normalizeSearchText(item.section ?? "").includes(normalizedQuery)
    ))
    : items.filter((item) => !MOBILE_PRIMARY_PATHS.has(item.to));

  return { primary, more };
}
