import { describe, expect, it } from "vitest";
import { calculateDv, cleanRut, formatRut, normalizeRut, rutForSii, validateRut } from "./rut";

describe("validateRut", () => {
  it("acepta RUT válido con puntos y guion", () => {
    expect(validateRut("12.345.678-5")).toBe(true);
    expect(validateRut("7.654.321-6")).toBe(true);
    expect(validateRut("19.234.567-7")).toBe(true);
  });

  it("acepta RUT válido sin puntos ni guion", () => {
    expect(validateRut("12345678-5")).toBe(true);
    expect(validateRut("7654321-6")).toBe(true);
  });

  it("acepta RUT con dígito verificador K", () => {
    expect(validateRut("1000005-K")).toBe(true);
  });

  it("acepta RUT con dígito verificador 0", () => {
    expect(validateRut("1000013-0")).toBe(true);
  });

  it("acepta minúscula k", () => {
    expect(validateRut("1000005-k")).toBe(true);
  });

  it("rechaza RUT con dígito verificador incorrecto", () => {
    expect(validateRut("12.345.678-1")).toBe(false);
    expect(validateRut("12345678-9")).toBe(false);
  });

  it("rechaza RUT demasiado corto", () => {
    expect(validateRut("1-1")).toBe(false);
    expect(validateRut("12-3")).toBe(false);
  });

  it("rechaza RUT vacío", () => {
    expect(validateRut("")).toBe(false);
    expect(validateRut("-")).toBe(false);
  });

  it("rechaza cuerpo no numérico", () => {
    expect(validateRut("ABCD-1")).toBe(false);
    expect(validateRut("12.345.67X-5")).toBe(false);
  });

  it("rechaza solo el dígito verificador", () => {
    expect(validateRut("5")).toBe(false);
    expect(validateRut("K")).toBe(false);
  });
});

describe("calculateDv", () => {
  it("calcula DV correcto para casos conocidos", () => {
    expect(calculateDv("12345678")).toBe("5");
    expect(calculateDv("7654321")).toBe("6");
    expect(calculateDv("19234567")).toBe("7");
  });

  it("devuelve K cuando el DV es 10", () => {
    expect(calculateDv("1000005")).toBe("K");
  });

  it("devuelve 0 cuando el DV es 11", () => {
    expect(calculateDv("1000013")).toBe("0");
  });

  it("ignora una k final en el cuerpo", () => {
    expect(calculateDv("1000005K")).toBe("K");
  });

  it("lanza error si el cuerpo está vacío", () => {
    expect(() => calculateDv("")).toThrow();
  });

  it("lanza error si el cuerpo no es numérico", () => {
    expect(() => calculateDv("ABC")).toThrow();
  });
});

describe("cleanRut", () => {
  it("elimina puntos, guion y espacios", () => {
    expect(cleanRut("12.345.678-5")).toBe("123456785");
    expect(cleanRut(" 12 . 345 . 678 - 5 ")).toBe("123456785");
  });

  it("normaliza a mayúsculas", () => {
    expect(cleanRut("12.345.673-k")).toBe("12345673K");
  });
});

describe("formatRut", () => {
  it("formatea con puntos y guion", () => {
    expect(formatRut("12345678-5")).toBe("12.345.678-5");
    expect(formatRut("7654321-6")).toBe("7.654.321-6");
  });

  it("devuelve vacío para entrada vacía", () => {
    expect(formatRut("")).toBe("");
  });

  it("devuelve solo DV si no hay cuerpo", () => {
    expect(formatRut("5")).toBe("5");
  });
});

describe("normalizeRut", () => {
  it("equivale a cleanRut", () => {
    expect(normalizeRut("12.345.678-5")).toBe(cleanRut("12.345.678-5"));
    expect(normalizeRut("12.345.673-k")).toBe(cleanRut("12.345.673-k"));
  });
});

describe("rutForSii", () => {
  it("devuelve formato cuerpo-DV para SII", () => {
    expect(rutForSii("12.345.678-5")).toBe("12345678-5");
    expect(rutForSii("12345678-5")).toBe("12345678-5");
  });

  it("devuelve entrada si es demasiado corta", () => {
    expect(rutForSii("5")).toBe("5");
    expect(rutForSii("")).toBe("");
  });
});

describe("validateRut integra con funciones existentes", () => {
  it("valida RUTs formateados por formatRut", () => {
    const ruts = ["12345678-5", "7654321-6", "19234567-7"];
    for (const raw of ruts) {
      const formatted = formatRut(raw);
      expect(validateRut(formatted)).toBe(true);
    }
  });

  it("valida RUTs redondeados por rutForSii", () => {
    const ruts = ["12.345.678-5", "7.654.321-6"];
    for (const raw of ruts) {
      const sii = rutForSii(raw);
      expect(validateRut(sii)).toBe(true);
    }
  });
});
