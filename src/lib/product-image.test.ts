import { beforeEach, describe, expect, it, vi } from "vitest";

const { storageFrom } = vi.hoisted(() => ({ storageFrom: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: storageFrom } },
}));
import { removeProductImage, uploadProductImage, validateProductImage } from "./product-image";

describe("product image validation", () => {
  it.each(["image/jpeg", "image/png", "image/webp", "image/gif"])(
    "accepts supported image format %s under the size limit",
    (type) => {
      expect(validateProductImage({ type, size: 1024 } as File)).toBeNull();
    },
  );

  it("accepts original camera photos up to 20 MB for optimization", () => {
    expect(validateProductImage({ type: "image/jpeg", size: 20 * 1024 * 1024 } as File)).toBeNull();
  });

  it("rejects original photos larger than 20 MB", () => {
    expect(validateProductImage({ type: "image/jpeg", size: 20 * 1024 * 1024 + 1 } as File)).toContain("20MB");
  });

  it("rejects unsupported formats", () => {
    expect(validateProductImage({ type: "image/svg+xml", size: 1024 } as File)).toContain("Formato no soportado");
  });
});

describe("product image storage lifecycle", () => {
  beforeEach(() => {
    storageFrom.mockReset();
  });

  it("does not attempt an upload when the file type is invalid", async () => {
    await expect(uploadProductImage("business-id", { type: "image/svg+xml", size: 10 } as File))
      .rejects.toThrow("Formato no soportado");
    expect(storageFrom).not.toHaveBeenCalled();
  });

  it("removes only objects from the product-images bucket", async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });
    storageFrom.mockReturnValue({ remove });
    await removeProductImage("https://example.supabase.co/storage/v1/object/public/product-images/business%2Fitem.webp");
    expect(storageFrom).toHaveBeenCalledWith("product-images");
    expect(remove).toHaveBeenCalledWith(["business/item.webp"]);
  });

  it("does not delete externally hosted product images", async () => {
    await removeProductImage("https://cdn.example.com/products/item.webp");
    expect(storageFrom).not.toHaveBeenCalled();
  });

  it("propagates storage deletion failures", async () => {
    const remove = vi.fn().mockResolvedValue({ error: new Error("Storage denied") });
    storageFrom.mockReturnValue({ remove });
    await expect(removeProductImage("https://example.supabase.co/storage/v1/object/public/product-images/business/item.webp"))
      .rejects.toThrow("Storage denied");
  });
});
