const DEFAULT_BUSINESS_TIME_ZONE = "America/Santiago";

export function getBusinessLocalDate(now: Date, timeZone = DEFAULT_BUSINESS_TIME_ZONE): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  try {
    return new Intl.DateTimeFormat("en-CA", options).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      ...options,
      timeZone: DEFAULT_BUSINESS_TIME_ZONE,
    }).format(now);
  }
}

/**
 * Date-only business deadlines are calendar dates in the business timezone,
 * not UTC instants. Timestamp deadlines retain instant-based comparison.
 */
export function isBusinessDateOverdue(dueDate: string, now: Date, timeZone = DEFAULT_BUSINESS_TIME_ZONE): boolean {
  const value = dueDate.trim();
  if (!value) return false;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false;
    return value < getBusinessLocalDate(now, timeZone);
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp < now.getTime();
}
