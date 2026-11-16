import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: vi.fn() } },
}));

import { validateProductImage } from "./product-image";

describe("product image validation", () => {
  it.each(["image/jpeg", "image/png", "image/webp", "image/gif"])(
    "accepts supported image format %s under the size limit",
    (type) => {
      expect(validateProductImage({ type, size: 1024 } as File)).toBeNull();
    },
  );

  it("accepts a file at the 5 MB limit", () => {
    expect(validateProductImage({ type: "image/webp", size: 5 * 1024 * 1024 } as File)).toBeNull();
  });

  it("rejects files larger than 5 MB", () => {
    expect(validateProductImage({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 } as File)).toContain("5MB");
  });

  it("rejects unsupported formats", () => {
    expect(validateProductImage({ type: "image/svg+xml", size: 1024 } as File)).toContain("Formato no soportado");
  });
});
