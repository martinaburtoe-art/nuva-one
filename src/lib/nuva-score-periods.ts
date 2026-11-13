export type NuvaScorePeriod = {
  today: string;
  last30Start: string;
  currentMonthStart: string;
  previousMonthStart: string;
  previousComparableEndExclusive: string;
};

function toLocalIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Produces Chile/browser-local calendar boundaries without UTC ISO conversion.
 * Month-to-date growth compares the same day-of-month window in the previous
 * month, clamped to that month's final day (e.g. Mar 31 compares through Feb 28/29).
 */
export function getNuvaScorePeriod(now: Date): NuvaScorePeriod {
  const today = toLocalIsoDate(now);
  const currentMonthStart = toLocalIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const previousMonthStart = toLocalIsoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const previousMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  const comparablePreviousLastDay = Math.min(now.getDate(), previousMonthDays);
  const previousComparableEndExclusive = toLocalIsoDate(
    new Date(now.getFullYear(), now.getMonth() - 1, comparablePreviousLastDay + 1),
  );
  const last30Start = toLocalIsoDate(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29),
  );

  return {
    today,
    last30Start,
    currentMonthStart,
    previousMonthStart,
    previousComparableEndExclusive,
  };
}
