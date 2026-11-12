/**
 * Prueba por propiedades (fast-check) para `src/lib/finance-period.ts`.
 *
 * El módulo delimita períodos tributarios con fronteras UTC:
 *   período(y, m) = [Date.UTC(y, m, 1), Date.UTC(y, m+1, 1))
 *
 * Propiedades verificadas (entrada generada aleatoriamente, no ejemplos fijos):
 *  P1 Partición/exclusividad: un instante UTC pertenece a exactamente UNO de los
 *     12 períodos de su año, y es el período que lo contiene.
 *  P2 Fronteras: el período es cerrado en el inicio y abierto en el fin — el
 *     primer instante del mes siguiente queda fuera; el último del mes
 *     anterior también.
 *  P3 Equivalencia de representación: una fecha como objeto `Date` y como su
 *     ISO string (con Z) producen la misma membresía (ejercita la ruta
 *     `Date.parse` de `isInTaxPeriod`).
 *  P4 Robustez: entradas nulas/inválidas jamás lanzan y retornan `false`.
 *  P5 Totalidad del filtro: `filterTaxDocumentsForPeriod` devuelve exactamente
 *     los documentos generados dentro del período, preservando el orden; la
 *     membresía esperada se calcula desde los parámetros del generador
 *     (verdad de terreno independiente de la implementación).
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  filterTaxDocumentsForPeriod,
  isInTaxPeriod,
  type TaxDocument,
} from "./finance-period";

// ——— Generadores ———
// Rango donde Date.UTC y Date.parse son estables en todas las plataformas.
const yearArb = fc.integer({ min: 1971, max: 2098 });
const monthIndexArb = fc.integer({ min: 0, max: 11 });
const dayArb = fc.integer({ min: 1, max: 28 }); // ≤28: nunca desborda al mes siguiente
const hourArb = fc.integer({ min: 0, max: 23 });
const minuteArb = fc.integer({ min: 0, max: 59 });
const secondArb = fc.integer({ min: 0, max: 59 });
const msArb = fc.integer({ min: 0, max: 999 });

const invalidDateArb = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(""),
  fc.constant("not-a-date"),
  fc.constant("2026-13-45"),
  fc.constant(new Date(NaN)),
);

// Documento generado: id + instante con delta de meses (±13 cruza años) +
// representación (nulo | Date | ISO string). La verdad de terreno (si el
// instante cae dentro del período consultado) se deriva de t y las fronteras,
// no de la función bajo prueba.
const generatedDocArb = fc.tuple(
  fc.integer({ min: 1, max: 9999 }),
  fc.integer({ min: -13, max: 13 }),
  dayArb,
  hourArb,
  fc.mapToConstant(
    { num: 1, build: () => "null" as const },
    { num: 3, build: () => "date" as const },
    { num: 3, build: () => "iso" as const },
  ),
);

describe("finance-period — períodos tributarios UTC (propiedades fast-check)", () => {
  it("P1: un instante UTC pertenece a exactamente un período mensual de su año", () => {
    fc.assert(
      fc.property(
        yearArb,
        monthIndexArb,
        dayArb,
        hourArb,
        minuteArb,
        secondArb,
        msArb,
        (year, monthIndex, day, hour, minute, second, ms) => {
          const date = new Date(
            Date.UTC(year, monthIndex, day, hour, minute, second, ms),
          );
          const memberships = Array.from({ length: 12 }, (_, m) =>
            isInTaxPeriod(date, year, m),
          );
          expect(memberships.filter(Boolean)).toHaveLength(1);
          expect(isInTaxPeriod(date, year, monthIndex)).toBe(true);
        },
      ),
    );
  });

  it("P2: el período es [inicio, fin): fronteras exactas en UTC", () => {
    fc.assert(
      fc.property(yearArb, monthIndexArb, (year, monthIndex) => {
        const start = Date.UTC(year, monthIndex, 1);
        const firstOfNextMonth = Date.UTC(year, monthIndex + 1, 1);
        // Cerrado en el inicio:
        expect(isInTaxPeriod(new Date(start), year, monthIndex)).toBe(true);
        // Abierto en el fin — el primer instante del mes siguiente queda fuera:
        expect(isInTaxPeriod(new Date(firstOfNextMonth), year, monthIndex)).toBe(
          false,
        );
        // El último instante del mes anterior queda fuera:
        expect(isInTaxPeriod(new Date(start - 1), year, monthIndex)).toBe(false);
      }),
    );
  });

  it("P3: Date y su ISO string (con Z) producen membresía idéntica", () => {
    fc.assert(
      fc.property(
        yearArb,
        monthIndexArb,
        dayArb,
        hourArb,
        minuteArb,
        secondArb,
        msArb,
        (year, monthIndex, day, hour, minute, second, ms) => {
          const date = new Date(
            Date.UTC(year, monthIndex, day, hour, minute, second, ms),
          );
          expect(isInTaxPeriod(date.toISOString(), year, monthIndex)).toBe(
            isInTaxPeriod(date, year, monthIndex),
          );
        },
      ),
    );
  });

  it("P4: entradas nulas/inválidas retornan false sin lanzar", () => {
    fc.assert(
      fc.property(invalidDateArb, (invalid) => {
        expect(
          isInTaxPeriod(invalid as string | Date | null | undefined, 2026, 9),
        ).toBe(false);
      }),
    );
  });

  it("P5: filterTaxDocumentsForPeriod devuelve exactamente los documentos del período, en orden", () => {
    fc.assert(
      fc.property(
        yearArb,
        monthIndexArb,
        fc.array(generatedDocArb, { minLength: 0, maxLength: 40 }),
        (year, monthIndex, rows) => {
          const start = Date.UTC(year, monthIndex, 1);
          const end = Date.UTC(year, monthIndex + 1, 1);

          const generated = rows.map(([id, delta, day, hour, kind]) => {
            const t = Date.UTC(year, monthIndex + delta, day, hour);
            const document_date =
              kind === "null"
                ? null
                : kind === "iso"
                  ? new Date(t).toISOString()
                  : new Date(t);
            return {
              id,
              doc: { id, document_date } as TaxDocument & { id: number },
              expectedIn: kind !== "null" && t >= start && t < end,
            };
          });

          const docs = generated.map((g) => g.doc);
          const got = filterTaxDocumentsForPeriod(docs, year, monthIndex) as
            Array<TaxDocument & { id: number }>;

          const expectedIds = generated
            .filter((g) => g.expectedIn)
            .map((g) => g.id);
          expect(got.map((d) => d.id)).toEqual(expectedIds);
        },
      ),
      { numRuns: 100 },
    );
  });
});
