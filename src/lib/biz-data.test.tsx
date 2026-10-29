// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";

// ── Mocks de dependencias ──────────────────────────────────────────

const mockUseActiveBusiness = vi.fn();

const mockEq = vi.fn();
const mockSingle = vi.fn().mockResolvedValue({ data: { id: "rec-1" }, error: null });

vi.mock("@/lib/use-business", () => ({
  useActiveBusiness: () => mockUseActiveBusiness(),
}));

vi.mock("@/integrations/supabase/client", () => {
  let lastTable = "";
  let lastOp = "";
  const businessIdFilters: string[] = [];

  return {
    supabase: {
      from: (table: string) => {
        lastTable = table;
        return {
          delete: () => {
            lastOp = "delete";
            businessIdFilters.length = 0;
            const chain: any = {
              eq: (col: string, val: any) => {
                businessIdFilters.push(`${col}=${JSON.stringify(val)}`);
                return chain;
              },
              single: mockSingle,
            };
            return chain;
          },
          update: (patch: Record<string, any>) => {
            lastOp = "update";
            businessIdFilters.length = 0;
            const chain: any = {
              eq: (col: string, val: any) => {
                businessIdFilters.push(`${col}=${JSON.stringify(val)}`);
                return chain;
              },
              single: mockSingle,
            };
            return chain;
          },
          insert: () => ({ eq: mockEq, single: mockSingle }),
          select: () => ({ eq: mockEq, single: mockSingle }),
          order: () => ({ range: () => ({ single: mockSingle }) }),
          range: () => ({ single: mockSingle }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: mockSingle,
        };
      },
      __lastTable: () => lastTable,
      __lastOp: () => lastOp,
      __businessIdFilters: () => [...businessIdFilters],
      __reset: () => {
        lastTable = "";
        lastOp = "";
        businessIdFilters.length = 0;
      },
    },
  };
});

import { useBizDelete, useBizUpdate } from "@/lib/biz-data";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockSupabase = supabase as any;
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

// ── Helper: render un componente que expone el mutate del hook ──────

type MutationType = "delete" | "update";

function MountHook({ table, mutationType, resultRef }: { table: string; mutationType: MutationType; resultRef?: { current: any } }) {
  const del = useBizDelete(table);
  const upd = useBizUpdate(table);
  if (resultRef) resultRef.current = mutationType === "delete" ? del : upd;
  if (mutationType === "delete") {
    return (
      <button
        onClick={async () => {
          await del.mutateAsync("rec-to-delete").catch(() => {});
        }}
        disabled={del.isPending}
        data-testid="btn-delete"
      >
        Eliminar
      </button>
    );
  }
  return (
    <button
      onClick={async () => {
        await upd.mutateAsync({ id: "rec-to-update", patch: { name: "nuevo" } }).catch(() => {});
      }}
      disabled={upd.isPending}
      data-testid="btn-update"
    >
      Actualizar
    </button>
  );
}

function renderHookComponent(ui: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let resolved: any;
  act(() => {
    root.render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  });
  return {
    container,
    click(selector: string) {
      const btn = container.querySelector(selector);
      if (!btn) throw new Error(`No se encontró ${selector}`);
      return act(async () => {
        (btn as HTMLElement).click();
      });
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    },
  };
}

// ── Tests ──────────────────────────────────────────────────────────

function activeBizMock(active: { id: string; name: string } | null) {
  return { active, businesses: [], setActiveId: vi.fn(), isLoading: false };
}

describe("useBizDelete — aislamiento por negocio activo", () => {
  beforeEach(() => {
    mockSupabase.__reset();
    mockUseActiveBusiness.mockReturnValue(activeBizMock({ id: "biz-activo", name: "Biz Activo" }));
    mockSingle.mockResolvedValue({ data: { id: "rec-1" }, error: null });
  });

  it("filtra delete por business_id del negocio activo", async () => {
    const { click, unmount } = renderHookComponent(
      <MountHook table="sales" mutationType="delete" />
    );
    await click('[data-testid="btn-delete"]');

    await vi.waitFor(() => {
      expect(mockSupabase.__lastTable()).toBe("sales");
      expect(mockSupabase.__lastOp()).toBe("delete");
      expect(mockSupabase.__businessIdFilters()).toContain('business_id="biz-activo"');
    });

    unmount();
  });

  it("incluye filtro de id del registro junto al business_id", async () => {
    const { click, unmount } = renderHookComponent(
      <MountHook table="products" mutationType="delete" />
    );
    await click('[data-testid="btn-delete"]');

    await vi.waitFor(() => {
      const filters = mockSupabase.__businessIdFilters();
      expect(filters).toContain('id="rec-to-delete"');
      expect(filters).toContain('business_id="biz-activo"');
    });

    unmount();
  });

  it("mutationFn lanza error cuando no hay negocio activo", async () => {
    mockUseActiveBusiness.mockReturnValue(activeBizMock(null));

    const mutationRef = { current: null as any };
    const { click, unmount } = renderHookComponent(
      <MountHook table="sales" mutationType="delete" resultRef={mutationRef} />
    );

    await click('[data-testid="btn-delete"]');
    await new Promise((r) => setTimeout(r, 0));

    expect(mutationRef.current.isError).toBe(true);
    expect(mockSupabase.__lastTable()).toBe(""); // nunca llegó a ejecutar supabase
    unmount();
  });
});

describe("useBizUpdate — aislamiento por negocio activo", () => {
  beforeEach(() => {
    mockSupabase.__reset();
    mockUseActiveBusiness.mockReturnValue(activeBizMock({ id: "biz-activo", name: "Biz Activo" }));
    mockSingle.mockResolvedValue({ data: { id: "rec-1" }, error: null });
  });

  it("filtra update por business_id del negocio activo", async () => {
    const { click, unmount } = renderHookComponent(
      <MountHook table="quotes" mutationType="update" />
    );
    await click('[data-testid="btn-update"]');

    await vi.waitFor(() => {
      expect(mockSupabase.__lastTable()).toBe("quotes");
      expect(mockSupabase.__lastOp()).toBe("update");
      expect(mockSupabase.__businessIdFilters()).toContain('business_id="biz-activo"');
    });

    unmount();
  });

  it("incluye filtro de id del registro junto al business_id", async () => {
    const { click, unmount } = renderHookComponent(
      <MountHook table="customers" mutationType="update" />
    );
    await click('[data-testid="btn-update"]');

    await vi.waitFor(() => {
      const filters = mockSupabase.__businessIdFilters();
      expect(filters).toContain('id="rec-to-update"');
      expect(filters).toContain('business_id="biz-activo"');
    });

    unmount();
  });

  it("mutationFn lanza error cuando no hay negocio activo", async () => {
    mockUseActiveBusiness.mockReturnValue(activeBizMock(null));

    const mutationRef = { current: null as any };
    const { click, unmount } = renderHookComponent(
      <MountHook table="quotes" mutationType="update" resultRef={mutationRef} />
    );

    await click('[data-testid="btn-update"]');
    await new Promise((r) => setTimeout(r, 0));

    expect(mutationRef.current.isError).toBe(true);
    expect(mockSupabase.__lastTable()).toBe("");
    unmount();
  });
});

describe("useBizDelete/useBizUpdate — intento de operar sobre registro de otro negocio", () => {
  beforeEach(() => {
    mockSupabase.__reset();
    mockUseActiveBusiness.mockReturnValue(activeBizMock({ id: "biz-activo", name: "Biz Activo" }));
    // RLS rechaza: el registro pertenece a otro negocio, 0 filas afectadas
    mockSingle.mockResolvedValue({ data: null, error: { code: "42501", message: "violación de RLS" } });
  });

  it("el delete de otro negocio falla (RLS + filtro cliente)", async () => {
    const { click, unmount } = renderHookComponent(
      <MountHook table="sales" mutationType="delete" />
    );
    await click('[data-testid="btn-delete"]');

    await vi.waitFor(() => {
      expect(mockSupabase.__businessIdFilters()).toContain('business_id="biz-activo"');
      expect(mockSupabase.__businessIdFilters()).toContain('id="rec-to-delete"');
    });

    unmount();
  });

  it("el update de otro negocio lleva filtro business_id del activo", async () => {
    const { click, unmount } = renderHookComponent(
      <MountHook table="quotes" mutationType="update" />
    );
    await click('[data-testid="btn-update"]');

    await vi.waitFor(() => {
      expect(mockSupabase.__businessIdFilters()).toContain('business_id="biz-activo"');
      expect(mockSupabase.__businessIdFilters()).toContain('id="rec-to-update"');
    });

    unmount();
  });
});
