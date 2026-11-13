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
 * destinations and the searchable secondary directory. Every input item is
 * returned exactly once, so mobile cannot silently drop a desktop module.
 */
export function splitMobileNavigation<T extends MobileNavigationItem>(
  items: readonly T[],
  query = "",
): { primary: T[]; more: T[] } {
  const normalizedQuery = normalizeSearchText(query.trim());
  return {
    primary: items.filter((item) => MOBILE_PRIMARY_PATHS.has(item.to)),
    more: items.filter((item) => {
      if (MOBILE_PRIMARY_PATHS.has(item.to)) return false;
      if (!normalizedQuery) return true;
      return normalizeSearchText(item.label).includes(normalizedQuery)
        || normalizeSearchText(item.section ?? "").includes(normalizedQuery);
    }),
  };
}
