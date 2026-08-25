import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { EmptyState, PageHeader } from "@/components/page-utils";
import { useBizInsert, useBizList, useBizUpdate, fmtCLP } from "@/lib/biz-data";
import { useActiveBusiness, useMyRole, canWriteOperations } from "@/lib/use-business";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  Download,
  FileText,
  Landmark,
  Plus,
  Receipt,
  Scale,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { downloadCsv } from "@/lib/export";

type Tab = "dashboard" | "accounts" | "journal" | "ledger" | "statements" | "tax";

const ACCOUNT_TYPES = [
  ["asset", "Activo"],
  ["liability", "Pasivo"],
  ["equity", "Patrimonio"],
  ["revenue", "Ingreso"],
  ["cost_of_sales", "Costo de ventas"],
  ["expense", "Gasto"],
  ["other_income", "Otro ingreso"],
] as const;

const TAX_DOCS = [
  "dte_sale",
  "dte_purchase",
  "credit_note",
  "debit_note",
  "bank_statement",
  "payment_receipt",
  "f29_receipt",
  "f22_receipt",
  "declaration",
  "other",
];

function money(v: unknown) {
  return fmtCLP(Number(v || 0));
}

export function FinanceAccountingWorkspace() {
  const { active } = useActiveBusiness();
  const { data: role } = useMyRole();
  const canWrite = canWriteOperations(role);
  const canAdmin = role === "owner" || role === "admin";
  const [tab, setTab] = useState<Tab>("dashboard");
  const [search, setSearch] = useState("");
  const [accountType, setAccountType] = useState("all");
  const [accountOpen, setAccountOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const { data: accounts = [] } = useBizList<any>("accounting_accounts", {
    order: "code",
    ascending: true,
  });
  const { data: ledger = [] } = useBizList<any>("v_financial_trial_balance", {
    order: "code",
    ascending: true,
  });
  const { data: balances = [] } = useBizList<any>("v_financial_account_balances", {
    order: "code",
    ascending: true,
  });
  const { data: journals = [] } = useBizList<any>("accounting_journals", {
    order: "entry_date",
    ascending: false,
  });
  const { data: pnl = [] } = useBizList<any>("v_financial_pnl_monthly", {
    order: "month",
    ascending: false,
  });
  const { data: cash = [] } = useBizList<any>("v_financial_cash_flow_daily", {
    order: "flow_date",
    ascending: false,
  });
  const { data: tax = [] } = useBizList<any>("v_financial_tax_control", {
    order: "period_year",
    ascending: false,
  });
  const { data: vat = [] } = useBizList<any>("v_financial_vat_working_paper", {
    order: "period_year",
    ascending: false,
  });
  const { data: reconciliation = [] } = useBizList<any>("v_financial_source_reconciliation");
  const { data: taxPayments = [] } = useBizList<any>("tax_payments", {
    order: "due_date",
    ascending: true,
  });
  const { data: taxDocs = [] } = useBizList<any>("tax_supporting_documents", {
    order: "document_date",
    ascending: false,
  });

  const insertAccount = useBizInsert("accounting_accounts");
  const insertTaxDoc = useBizInsert("tax_supporting_documents");
  const updatePayment = useBizUpdate("tax_payments");

  const selectedPnl = useMemo(
    () =>
      pnl.find((r: any) => {
        const d = new Date(r.month);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      }),
    [pnl, year, month],
  );
  const selectedTax = useMemo(
    () => tax.find((r: any) => Number(r.period_year) === year && Number(r.period_month) === month),
    [tax, year, month],
  );
  const cashSummary = useMemo(
    () =>
      cash.reduce(
        (a: any, r: any) => ({
          inflow: a.inflow + Number(r.cash_in || 0),
          outflow: a.outflow + Number(r.cash_out || 0),
          net: a.net + Number(r.net_cash || 0),
        }),
        { inflow: 0, outflow: 0, net: 0 },
      ),
    [cash],
  );
  const filteredAccounts = useMemo(
    () =>
      accounts.filter(
        (a: any) =>
          (!search || `${a.code} ${a.name}`.toLowerCase().includes(search.toLowerCase())) &&
          (accountType === "all" || a.account_type === accountType),
      ),
    [accounts, search, accountType],
  );
  const groupedBalance = useMemo(
    () =>
      ledger.reduce((a: any, r: any) => {
        const k = r.account_type || "other";
        a[k] = (a[k] || 0) + Number(r.net_debit || 0) - Number(r.net_credit || 0);
        return a;
      }, {}),
    [ledger],
  );
  const assets = Number(groupedBalance.asset || 0);
  const liabilities = Number(groupedBalance.liability || 0);
  const equity = Number(groupedBalance.equity || 0);
  const balanceDifference = assets - (liabilities + equity);
  const openRecon = reconciliation.filter(
    (r: any) => !["reconciled", "posted"].includes(r.status),
  ).length;

  async function createAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!active || !canAdmin) return;
    const fd = new FormData(e.currentTarget);
    await insertAccount.mutateAsync({
      code: fd.get("code"),
      name: fd.get("name"),
      account_type: fd.get("account_type"),
      tax_category: fd.get("tax_category") || null,
      active: true,
    });
    setAccountOpen(false);
    toast.success("Cuenta creada");
  }

  async function postJournal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!active || !canWrite) return;
    const fd = new FormData(e.currentTarget);
    const debit = Number(fd.get("debit"));
    const credit = Number(fd.get("credit"));
    if (debit <= 0 || debit !== credit)
      return toast.error("El asiento debe estar cuadrado: Debe = Haber");
    const { error } = await supabase.rpc("post_financial_journal", {
      p_business_id: active.id,
      p_entry_date: fd.get("date") || new Date().toISOString().slice(0, 10),
      p_description: String(fd.get("description") || "Asiento manual"),
      p_source_type: "manual",
      p_source_id: null,
      p_lines: [
        {
          account_id: fd.get("debit_account"),
          description: String(fd.get("description") || ""),
          debit,
          credit: 0,
          tax_code: fd.get("tax_code") || null,
        },
        {
          account_id: fd.get("credit_account"),
          description: String(fd.get("description") || ""),
          debit: 0,
          credit,
          tax_code: fd.get("tax_code") || null,
        },
      ],
    });
    if (error) return toast.error(error.message);
    setJournalOpen(false);
    toast.success("Asiento publicado y cuadrado");
  }

  async function seedAccounts() {
    if (!active || !canAdmin || accounts.length) return;
    const base = [
      ["1.01", "Caja y efectivo", "asset", "cash"],
      ["1.02", "Bancos", "asset", "bank"],
      ["1.03", "Clientes por cobrar", "asset", "receivables"],
      ["1.04", "IVA crédito fiscal", "asset", "iva_credit"],
      ["1.05", "Existencias", "asset", "inventory"],
      ["2.01", "Proveedores", "liability", "payables"],
      ["2.02", "IVA débito fiscal", "liability", "iva_debit"],
      ["2.03", "Impuestos por pagar", "liability", "tax_payable"],
      ["3.01", "Patrimonio", "equity", "equity"],
      ["4.01", "Ingresos por ventas", "revenue", "sales"],
      ["4.02", "Otros ingresos", "other_income", "other_income"],
      ["5.01", "Costo de ventas", "cost_of_sales", "cogs"],
      ["6.01", "Gastos operacionales", "expense", "operating_expense"],
      ["6.02", "Gastos de personal", "expense", "payroll"],
      ["6.03", "Gastos financieros", "expense", "finance_expense"],
    ];
    const { error } = await supabase.from("accounting_accounts").insert(
      base.map(([code, name, type, key]) => ({
        business_id: active.id,
        code,
        name,
        account_type: type,
        system_key: key,
        active: true,
      })),
    );
    if (error) toast.error(error.message);
    else toast.success("Plan de cuentas base creado");
  }

  async function registerTaxDocument(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canWrite) return;
    const fd = new FormData(e.currentTarget);
    await insertTaxDoc.mutateAsync({
      document_type: fd.get("type"),
      document_date: fd.get("date") || null,
      document_number: fd.get("number") || null,
      counterparty_rut: fd.get("rut") || null,
      counterparty_name: fd.get("name") || null,
      net_amount: Number(fd.get("net") || 0),
      exempt_amount: Number(fd.get("exempt") || 0),
      iva_amount: Number(fd.get("iva") || 0),
      total_amount: Number(fd.get("total") || 0),
      status: "validated",
    });
    toast.success("Documento incorporado al expediente tributario");
  }

  const tabs: [Tab, string, any][] = [
    ["dashboard", "Centro", Activity],
    ["accounts", "Plan de cuentas", BookOpenCheck],
    ["journal", "Libro diario", FileText],
    ["ledger", "Mayor y balance", Scale],
    ["statements", "Estados financieros", Landmark],
    ["tax", "Tributación Chile", Receipt],
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Finanzas · Contabilidad · Tributación"
        description="Centro contable profesional para PYMEs chilenas: registro, control, conciliación, estados financieros y papeles tributarios."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  "plan-cuentas.csv",
                  accounts.map((a: any) => ({
                    codigo: a.code,
                    cuenta: a.name,
                    tipo: a.account_type,
                    categoria_tributaria: a.tax_category,
                    activa: a.active,
                  })),
                )
              }
            >
              <Download className="mr-1.5 h-4 w-4" /> Exportar
            </Button>
            {canAdmin && !accounts.length && (
              <Button variant="outline" onClick={seedAccounts}>
                <BookOpenCheck className="mr-1.5 h-4 w-4" /> Crear plan base
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi
          label="Resultado período"
          value={money(selectedPnl?.net_result)}
          icon={<Activity />}
          good={Number(selectedPnl?.net_result || 0) >= 0}
        />
        <Kpi label="Activos" value={money(assets)} icon={<Scale />} />
        <Kpi
          label="Caja neta"
          value={money(cashSummary.net)}
          icon={<Wallet />}
          good={cashSummary.net >= 0}
        />
        <Kpi label="IVA estimado" value={money(selectedTax?.total_to_pay)} icon={<Receipt />} />
        <Kpi
          label="Conciliaciones pendientes"
          value={String(openRecon)}
          icon={<ShieldCheck />}
          good={openRecon === 0}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto border-b pb-2">
        {tabs.map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${tab === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <Dashboard
          selectedPnl={selectedPnl}
          selectedTax={selectedTax}
          cashSummary={cashSummary}
          balanceDifference={balanceDifference}
          openRecon={openRecon}
        />
      )}
      {tab === "accounts" && (
        <Accounts
          accounts={filteredAccounts}
          search={search}
          setSearch={setSearch}
          accountType={accountType}
          setAccountType={setAccountType}
          selected={selectedAccount}
          setSelected={setSelectedAccount}
          canAdmin={canAdmin}
          accountOpen={accountOpen}
          setAccountOpen={setAccountOpen}
          createAccount={createAccount}
        />
      )}
      {tab === "journal" && (
        <Journal
          journals={journals}
          accounts={accounts}
          canWrite={canWrite}
          journalOpen={journalOpen}
          setJournalOpen={setJournalOpen}
          postJournal={postJournal}
        />
      )}
      {tab === "ledger" && <Ledger ledger={ledger} balances={balances} />}
      {tab === "statements" && (
        <Statements
          pnl={pnl}
          ledger={ledger}
          year={year}
          month={month}
          setYear={setYear}
          setMonth={setMonth}
          assets={assets}
          liabilities={liabilities}
          equity={equity}
          difference={balanceDifference}
        />
      )}
      {tab === "tax" && (
        <TaxCenter
          year={year}
          month={month}
          setYear={setYear}
          setMonth={setMonth}
          tax={tax}
          vat={vat}
          payments={taxPayments}
          docs={taxDocs}
          selected={selectedTax}
          canWrite={canWrite}
          registerTaxDocument={registerTaxDocument}
          updatePayment={updatePayment}
        />
      )}

      {selectedAccount && (
        <AccountDialog account={selectedAccount} onClose={() => setSelectedAccount(null)} />
      )}
    </div>
  );
}

function Dashboard({ selectedPnl, selectedTax, cashSummary, balanceDifference, openRecon }: any) {
  const checks = [
    [
      "Balance contable",
      Math.abs(balanceDifference) < 0.01,
      Math.abs(balanceDifference) < 0.01
        ? "Activos = Pasivos + Patrimonio"
        : `Diferencia ${money(balanceDifference)}`,
    ],
    [
      "Conciliación",
      openRecon === 0,
      openRecon === 0 ? "Sin excepciones abiertas" : `${openRecon} partidas pendientes`,
    ],
    [
      "Tributación",
      !!selectedTax,
      selectedTax ? "Período con información" : "Sin papel de trabajo para el período",
    ],
  ];
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold">Centro de control contable</h2>
            <p className="text-sm text-muted-foreground">
              Una sola vista para saber si la información financiera está completa, cuadrada y
              respaldada.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Mini label="Ventas" value={money(selectedPnl?.revenue)} />
          <Mini label="Gastos" value={money(selectedPnl?.operating_expenses)} />
          <Mini label="Resultado neto" value={money(selectedPnl?.net_result)} />
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold">Salud contable</h3>
          <div className="mt-4 space-y-2">
            {checks.map(([label, ok, text]) => (
              <div
                key={label as string}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div>
                  <div className="font-medium">{label as string}</div>
                  <div className="text-xs text-muted-foreground">{text as string}</div>
                </div>
                {ok ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-warning" />
                )}
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold">Tesorería</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Mini label="Entradas" value={money(cashSummary.inflow)} />
            <Mini label="Salidas" value={money(cashSummary.outflow)} />
            <Mini label="Neto" value={money(cashSummary.net)} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Accounts({
  accounts,
  search,
  setSearch,
  accountType,
  setAccountType,
  selected,
  setSelected,
  canAdmin,
  accountOpen,
  setAccountOpen,
  createAccount,
}: any) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Plan de cuentas</h2>
            <p className="text-sm text-muted-foreground">
              Cada cuenta es operable: consulta movimientos, saldo, naturaleza y clasificación
              tributaria.
            </p>
          </div>
          {canAdmin && (
            <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-1.5 h-4 w-4" /> Nueva cuenta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear cuenta contable</DialogTitle>
                </DialogHeader>
                <form onSubmit={createAccount} className="space-y-3">
                  <div>
                    <Label>Código</Label>
                    <Input name="code" placeholder="6.04.01" required />
                  </div>
                  <div>
                    <Label>Nombre</Label>
                    <Input name="name" placeholder="Gastos de transporte" required />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <select
                      name="account_type"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      {ACCOUNT_TYPES.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Categoría tributaria</Label>
                    <Input name="tax_category" placeholder="gasto_aceptado, iva_credito..." />
                  </div>
                  <Button className="w-full">Crear cuenta</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar código o cuenta..."
            />
          </div>
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="all">Todos los tipos</option>
            {ACCOUNT_TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left">
                <th className="p-3">Código</th>
                <th className="p-3">Cuenta</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Tributación</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a: any) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-3 font-mono">{a.code}</td>
                  <td className="p-3 font-medium">{a.name}</td>
                  <td className="p-3">{typeLabel(a.account_type)}</td>
                  <td className="p-3 text-muted-foreground">
                    {a.tax_category || "No clasificada"}
                  </td>
                  <td className="p-3">
                    <Badge variant={a.active ? "outline" : "destructive"}>
                      {a.active ? "Activa" : "Inactiva"}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setSelected(a)}>
                      Abrir cuenta
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!accounts.length && (
            <div className="p-8">
              <EmptyState
                title="No hay cuentas"
                description="Crea el plan base o registra una cuenta para comenzar."
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function AccountDialog({ account, onClose }: any) {
  const { data: lines = [] } = useBizList<any>("accounting_lines", {
    order: "created_at",
    ascending: false,
  });
  const rows = lines.filter((l: any) => l.account_id === account.id).slice(0, 100);
  const debit = rows.reduce((s: number, r: any) => s + Number(r.debit || 0), 0);
  const credit = rows.reduce((s: number, r: any) => s + Number(r.credit || 0), 0);
  return (
    <Dialog open={!!account} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {account.code} · {account.name}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          <Mini label="Debe" value={money(debit)} />
          <Mini label="Haber" value={money(credit)} />
          <Mini label="Saldo" value={money(debit - credit)} />
        </div>
        <div className="mt-4 max-h-[420px] overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="p-2 text-left">Fecha</th>
                <th className="p-2 text-left">Descripción</th>
                <th className="p-2 text-right">Debe</th>
                <th className="p-2 text-right">Haber</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString("es-CL") : "—"}
                  </td>
                  <td className="p-2">{r.description || "—"}</td>
                  <td className="p-2 text-right">{money(r.debit)}</td>
                  <td className="p-2 text-right">{money(r.credit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <div className="p-6">
              <EmptyState
                title="Sin movimientos"
                description="Los asientos publicados para esta cuenta aparecerán aquí."
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Journal({ journals, accounts, canWrite, journalOpen, setJournalOpen, postJournal }: any) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Libro diario</h2>
            <p className="text-sm text-muted-foreground">
              Asientos con validación de Debe = Haber, período abierto e idempotencia.
            </p>
          </div>
          {canWrite && (
            <Dialog open={journalOpen} onOpenChange={setJournalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-1.5 h-4 w-4" /> Nuevo asiento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo asiento contable</DialogTitle>
                </DialogHeader>
                <form onSubmit={postJournal} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Fecha</Label>
                      <Input
                        name="date"
                        type="date"
                        defaultValue={new Date().toISOString().slice(0, 10)}
                        required
                      />
                    </div>
                    <div>
                      <Label>Código tributario</Label>
                      <Input name="tax_code" placeholder="Opcional" />
                    </div>
                  </div>
                  <Input name="description" placeholder="Glosa del asiento" required />
                  <div>
                    <Label>Cuenta Debe</Label>
                    <select
                      name="debit_account"
                      required
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Seleccionar</option>
                      {accounts
                        .filter((a: any) => a.active)
                        .map((a: any) => (
                          <option key={a.id} value={a.id}>
                            {a.code} · {a.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <Label>Cuenta Haber</Label>
                    <select
                      name="credit_account"
                      required
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Seleccionar</option>
                      {accounts
                        .filter((a: any) => a.active)
                        .map((a: any) => (
                          <option key={a.id} value={a.id}>
                            {a.code} · {a.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Debe</Label>
                      <Input name="debit" type="number" min="0.01" step="0.01" required />
                    </div>
                    <div>
                      <Label>Haber</Label>
                      <Input name="credit" type="number" min="0.01" step="0.01" required />
                    </div>
                  </div>
                  <Button className="w-full">Validar y publicar</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left">
                <th className="p-3">Fecha</th>
                <th className="p-3">Glosa</th>
                <th className="p-3">Origen</th>
                <th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {journals.slice(0, 100).map((j: any) => (
                <tr key={j.id} className="border-b">
                  <td className="p-3">{new Date(j.entry_date).toLocaleDateString("es-CL")}</td>
                  <td className="p-3 font-medium">{j.description}</td>
                  <td className="p-3">{j.source_type}</td>
                  <td className="p-3">
                    <Badge variant="outline">{j.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!journals.length && (
            <div className="p-8">
              <EmptyState
                title="Libro diario vacío"
                description="Publica el primer asiento para comenzar."
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Ledger({ ledger, balances }: any) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-semibold">Balance de comprobación</h2>
        <p className="text-sm text-muted-foreground">Debe, Haber y saldo por cuenta.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Cuenta</th>
                <th className="p-2 text-right">Debe</th>
                <th className="p-2 text-right">Haber</th>
                <th className="p-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((r: any) => (
                <tr key={r.account_id} className="border-b">
                  <td className="p-2">
                    {r.code} · {r.name}
                  </td>
                  <td className="p-2 text-right">{money(r.net_debit)}</td>
                  <td className="p-2 text-right">{money(r.net_credit)}</td>
                  <td className="p-2 text-right font-semibold">
                    {money(Number(r.net_debit || 0) - Number(r.net_credit || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!ledger.length && (
            <div className="p-6">
              <EmptyState
                title="Sin balance"
                description="El balance aparecerá después de publicar asientos."
              />
            </div>
          )}
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold">Saldos de cuentas</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {balances.map((r: any) => (
            <div key={r.account_id} className="flex justify-between rounded-lg border p-3 text-sm">
              <span>
                {r.code} · {r.name}
              </span>
              <strong>{money(r.balance)}</strong>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Statements({
  pnl,
  ledger,
  year,
  month,
  setYear,
  setMonth,
  assets,
  liabilities,
  equity,
  difference,
}: any) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Estados financieros</h2>
            <p className="text-sm text-muted-foreground">
              Información construida desde la contabilidad publicada.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              className="w-24"
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {new Date(2020, i, 1).toLocaleDateString("es-CL", { month: "long" })}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Separator className="my-5" />
        <div className="grid gap-3 md:grid-cols-3">
          <Mini label="Activos" value={money(assets)} />
          <Mini label="Pasivos" value={money(liabilities)} />
          <Mini label="Patrimonio" value={money(equity)} />
        </div>
        <div className="mt-4 rounded-lg border p-4">
          <div className="flex justify-between">
            <span>Control ecuación contable</span>
            <strong>
              {Math.abs(difference) < 0.01 ? "CUADRADO" : `DIFERENCIA ${money(difference)}`}
            </strong>
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold">Estado de resultados mensual</h2>
        <div className="mt-4 space-y-2">
          <Line
            label="Ingresos"
            value={
              pnl.find(
                (r: any) =>
                  new Date(r.month).getFullYear() === year &&
                  new Date(r.month).getMonth() + 1 === month,
              )?.revenue
            }
          />
          <Line
            label="Costo de ventas"
            value={
              pnl.find(
                (r: any) =>
                  new Date(r.month).getFullYear() === year &&
                  new Date(r.month).getMonth() + 1 === month,
              )?.cost_of_sales
            }
            negative
          />
          <Line
            label="Gastos operacionales"
            value={
              pnl.find(
                (r: any) =>
                  new Date(r.month).getFullYear() === year &&
                  new Date(r.month).getMonth() + 1 === month,
              )?.operating_expenses
            }
            negative
          />
          <Line
            label="Resultado neto"
            value={
              pnl.find(
                (r: any) =>
                  new Date(r.month).getFullYear() === year &&
                  new Date(r.month).getMonth() + 1 === month,
              )?.net_result
            }
            strong
          />
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold">Criterio contable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Nüva presenta información financiera basada en asientos publicados. La compra de
          inventario no debe tratarse automáticamente como gasto: su tratamiento depende de la
          naturaleza y política contable de la empresa.
        </p>
      </Card>
    </div>
  );
}

function TaxCenter({
  year,
  month,
  setYear,
  setMonth,
  tax,
  vat,
  payments,
  docs,
  selected,
  canWrite,
  registerTaxDocument,
  updatePayment,
}: any) {
  const [docOpen, setDocOpen] = useState(false);
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="font-semibold">Tributación Chile</h2>
            <p className="text-sm text-muted-foreground">
              IVA, F29, PPM, documentos, pagos y papeles de trabajo. Los cálculos son de apoyo y
              deben validarse antes de una presentación oficial.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              className="w-24"
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {new Date(2020, i, 1).toLocaleDateString("es-CL", { month: "long" })}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Mini label="IVA débito" value={money(selected?.debit_iva)} />
          <Mini label="IVA crédito" value={money(selected?.credit_iva)} />
          <Mini label="IVA a pagar" value={money(selected?.iva_to_pay)} />
          <Mini label="PPM" value={money(selected?.ppm_amount)} />
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold">Control mensual F29</h3>
          <div className="mt-4 space-y-2">
            {tax.slice(0, 24).map((r: any) => (
              <div
                key={`${r.period_year}-${r.period_month}`}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <span>
                  {r.period_year}-{String(r.period_month).padStart(2, "0")}
                </span>
                <Badge variant="outline">{r.control_status || r.period_status}</Badge>
                <strong>{money(r.total_to_pay)}</strong>
              </div>
            ))}
            {!tax.length && (
              <EmptyState
                title="Sin períodos tributarios"
                description="Cuando existan papeles de trabajo, aparecerán aquí."
              />
            )}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Pagos tributarios</h3>
              <p className="text-xs text-muted-foreground">Seguimiento de vencimientos y pagos.</p>
            </div>
            <Badge variant="outline">{payments.length}</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {payments.slice(0, 20).map((p: any) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div>
                  <div className="font-medium">{p.tax_type}</div>
                  <div className="text-xs text-muted-foreground">
                    Vence {p.due_date || "sin fecha"}
                  </div>
                </div>
                <div className="text-right">
                  <strong>{money(p.amount)}</strong>
                  {canWrite && p.status !== "paid" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        updatePayment.mutate({
                          id: p.id,
                          patch: {
                            status: "paid",
                            paid_amount: p.amount,
                            payment_date: new Date().toISOString().slice(0, 10),
                          },
                        })
                      }
                    >
                      Marcar pagado
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!payments.length && (
              <EmptyState
                title="Sin pagos registrados"
                description="Registra obligaciones tributarias para controlar vencimientos."
              />
            )}
          </div>
        </Card>
      </div>
      <Card className="p-5">
        <div className="flex justify-between gap-3">
          <div>
            <h3 className="font-semibold">Expediente tributario</h3>
            <p className="text-sm text-muted-foreground">
              DTE, notas, cartolas, comprobantes y declaraciones quedan asociados al expediente.
            </p>
          </div>
          <Dialog open={docOpen} onOpenChange={setDocOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-1.5 h-4 w-4" /> Documento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar documento tributario</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={async (e) => {
                  await registerTaxDocument(e);
                  setDocOpen(false);
                }}
                className="space-y-3"
              >
                <select
                  name="type"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {TAX_DOCS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <Input name="date" type="date" />
                <Input name="number" placeholder="Folio / número" />
                <div className="grid grid-cols-2 gap-2">
                  <Input name="rut" placeholder="RUT" />
                  <Input name="name" placeholder="Cliente / proveedor" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input name="net" type="number" placeholder="Neto" />
                  <Input name="iva" type="number" placeholder="IVA" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input name="exempt" type="number" placeholder="Exento" />
                  <Input name="total" type="number" placeholder="Total" />
                </div>
                <Button className="w-full" disabled={!canWrite}>
                  Guardar documento
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Fecha</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Folio</th>
                <th className="p-2">Contraparte</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {docs.slice(0, 50).map((d: any) => (
                <tr key={d.id} className="border-b">
                  <td className="p-2">{d.document_date || "—"}</td>
                  <td className="p-2">{d.document_type}</td>
                  <td className="p-2">{d.document_number || "—"}</td>
                  <td className="p-2">{d.counterparty_name || d.counterparty_rut || "—"}</td>
                  <td className="p-2 text-right">{money(d.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!docs.length && (
            <div className="py-6">
              <EmptyState
                title="Expediente vacío"
                description="Agrega documentos para mantener trazabilidad tributaria."
              />
            </div>
          )}
        </div>
      </Card>
      <Card className="border-primary/20 bg-primary/5 p-5">
        <div className="flex gap-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">
            Nüva organiza información y papeles de trabajo para Chile. No debe presentarse una
            declaración oficial únicamente con una estimación del sistema: deben contrastarse RCV,
            DTE, régimen, retenciones, créditos, débitos y antecedentes del contribuyente.
          </p>
        </div>
      </Card>
    </div>
  );
}

function Kpi({ label, value, icon, good }: any) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div
            className={`mt-1 text-lg font-bold ${good === true ? "text-success" : good === false ? "text-destructive" : ""}`}
          >
            {value}
          </div>
        </div>
        <div className="rounded-xl bg-muted p-2">{icon}</div>
      </div>
    </Card>
  );
}
function Mini({ label, value }: any) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
function Line({ label, value, negative, strong }: any) {
  const n = Number(value || 0);
  return (
    <div className={`flex justify-between gap-4 py-1.5 ${strong ? "font-bold" : "text-sm"}`}>
      <span>{label}</span>
      <span>
        {negative ? "−" : ""}
        {money(Math.abs(n))}
      </span>
    </div>
  );
}
function typeLabel(type: string) {
  return ACCOUNT_TYPES.find(([v]) => v === type)?.[1] || type;
}
