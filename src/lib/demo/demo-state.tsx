import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { DEMO_BUSINESS, DEMO_CUSTOMERS, DEMO_PRODUCTS, DEMO_SALES, type DemoProduct } from "./demo-data";

type DemoState = {
  business: typeof DEMO_BUSINESS;
  products: DemoProduct[];
  customers: typeof DEMO_CUSTOMERS;
  sales: typeof DEMO_SALES;
  simulatedSales: number;
  revenueDelta: number;
  sell: (productId: string) => void;
  reset: () => void;
};

const DemoStateContext = createContext<DemoState | null>(null);

export function DemoStateProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState(DEMO_PRODUCTS);
  const [sales, setSales] = useState(DEMO_SALES);
  const [simulatedSales, setSimulatedSales] = useState(0);
  const [revenueDelta, setRevenueDelta] = useState(0);

  const sell = useCallback((productId: string) => {
    setProducts((current) =>
      current.map((product) => product.id === productId ? { ...product, stock: Math.max(0, product.stock - 1) } : product),
    );
    const product = DEMO_PRODUCTS.find((item) => item.id === productId);
    if (!product) return;
    setSales((current) => [
      { id: `demo-${Date.now()}`, customer: "Cliente demo", product: product.name, total: product.price, status: "Pagada" },
      ...current,
    ]);
    setSimulatedSales((value) => value + 1);
    setRevenueDelta((value) => value + product.price);
  }, []);

  const reset = useCallback(() => {
    setProducts(DEMO_PRODUCTS);
    setSales(DEMO_SALES);
    setSimulatedSales(0);
    setRevenueDelta(0);
  }, []);

  const value = useMemo(() => ({
    business: DEMO_BUSINESS,
    products,
    customers: DEMO_CUSTOMERS,
    sales,
    simulatedSales,
    revenueDelta,
    sell,
    reset,
  }), [products, sales, simulatedSales, revenueDelta, sell, reset]);

  return <DemoStateContext.Provider value={value}>{children}</DemoStateContext.Provider>;
}

export function useDemoState() {
  const value = useContext(DemoStateContext);
  if (!value) throw new Error("useDemoState must be used inside DemoStateProvider");
  return value;
}
