export type DemoProduct = {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  cost: number;
  reorderAt: number;
};

export type DemoCustomer = {
  id: string;
  name: string;
  company: string;
  lastPurchase: string;
  value: number;
};

export const DEMO_BUSINESS = {
  name: "Alma Café",
  industry: "Cafetería y pastelería",
  location: "Talca, Maule",
  plan: "Pro",
  score: 78,
  monthlyRevenue: 359_910,
  monthlyExpenses: 170_000,
  cash: 589_910,
};

export const DEMO_PRODUCTS: DemoProduct[] = [
  { id: "coffee", name: "Café de especialidad 250 g", category: "Café", stock: 18, price: 8_990, cost: 4_100, reorderAt: 8 },
  { id: "beans", name: "Granos Colombia 1 kg", category: "Café", stock: 6, price: 18_990, cost: 10_500, reorderAt: 8 },
  { id: "cake", name: "Torta de chocolate", category: "Pastelería", stock: 4, price: 24_990, cost: 13_000, reorderAt: 3 },
  { id: "cookie", name: "Cookie chocolate", category: "Pastelería", stock: 27, price: 2_990, cost: 1_100, reorderAt: 10 },
];

export const DEMO_CUSTOMERS: DemoCustomer[] = [
  { id: "c1", name: "Camila Rojas", company: "Estudio Norte", lastPurchase: "Hoy", value: 84_900 },
  { id: "c2", name: "Diego Muñoz", company: "Independiente", lastPurchase: "Ayer", value: 52_990 },
  { id: "c3", name: "Sofía Pérez", company: "Taller 21", lastPurchase: "Hace 3 días", value: 39_900 },
];

export const DEMO_SALES = [
  { id: "s1", customer: "Camila Rojas", product: "Torta de chocolate", total: 24_990, status: "Pagada" },
  { id: "s2", customer: "Diego Muñoz", product: "Café de especialidad 250 g", total: 8_990, status: "Pagada" },
  { id: "s3", customer: "Sofía Pérez", product: "Granos Colombia 1 kg", total: 18_990, status: "Pagada" },
];

export const money = (value: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
