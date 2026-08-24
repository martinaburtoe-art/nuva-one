import { readFileSync, writeFileSync } from "node:fs";

// This build hook also normalizes Caja's payment methods so the production
// POS exposes only the supported in-store methods.
const posPath = "src/routes/_authenticated/pos.tsx";
let pos = readFileSync(posPath, "utf8");

pos = pos.replace(
  'type PayMethod = "efectivo" | "tarjeta" | "transferencia" | "online";',
  'type PayMethod = "efectivo" | "tarjeta" | "transferencia";'
);
pos = pos.replace(
  /  const \{ data: paymentIntegrations \} = useBizList<any>\("billing_integrations"[^\n]*\);\n  const hasPaymentGateway =[^\n]*\n/,
  ""
);
pos = pos.replace(
  /  const \[onlinePayment, setOnlinePayment\] = useState<\{ url: string; saleId: string \} \| null>\(null\);\n  const \[creatingLink, setCreatingLink\] = useState\(false\);\n/,
  ""
);
pos = pos.replace(
  /  const canPay = cart\.length > 0 && total > 0 && \(method !== "efectivo" \|\| received >= total\) && !\(method === "online" && !hasPaymentGateway\);/,
  '  const canPay = cart.length > 0 && total > 0 && (method !== "efectivo" || received >= total);'
);
pos = pos.replace(
  /    if \(method === "online"\) \{[\s\S]*?    \}\n    try \{/,
  "    try {"
);
pos = pos.replace(
  /\{\(\["efectivo", "tarjeta", "transferencia", "online"\] as PayMethod\[\]\)\.map\(\(m\) => <button key=\{m\} onClick=\{\(\) => \(m !== "online" \|\| hasPaymentGateway\) && setMethod\(m\)\} disabled=\{m === "online" && !hasPaymentGateway\} className=\{cn\("rounded-lg border px-2 py-2 text-xs font-medium capitalize transition", method === m \? "border-primary bg-primary text-primary-foreground" : m === "online" && !hasPaymentGateway \? "cursor-not-allowed opacity-40" : "hover:bg-accent"\)\}>\{m\}<\/button>\)\)\}/,
  '{(["efectivo", "tarjeta", "transferencia"] as PayMethod[]).map((m) => <button key={m} onClick={() => setMethod(m)} className={cn("rounded-lg border px-2 py-2 text-xs font-medium capitalize transition", method === m ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}>{m}</button>)}'
);
pos = pos.replace("grid grid-cols-4 gap-1.5", "grid grid-cols-3 gap-1.5");
pos = pos.replace(
  'method === "online" ? `Generar link de pago · ${fmtCLP(total)}` : `Cobrar ${fmtCLP(total)}`',
  '`Cobrar ${fmtCLP(total)}`'
);
pos = pos.replace(
  /        <Dialog open=\{!!onlinePayment\}[\s\S]*?<\/Dialog>\n(?=      <\/>)/,
  ""
);
pos = pos.replace(
  "Receipt, Link2, Copy, ScanBarcode",
  "Receipt, ScanBarcode"
);

// Some older variants of Caja may have the legacy declarations split across
// lines. Remove only those exact legacy declarations as a final normalization.
pos = pos
  .split("\n")
  .filter((line) => !line.includes("creatingLink") && !line.includes("hasPaymentGateway"))
  .join("\n");

const forbidden = [
  'method === "online"',
  "onlinePayment",
  "creatingLink",
  "billing/payments/create",
  "hasPaymentGateway",
];
const leftovers = forbidden.filter((token) => pos.includes(token));
if (leftovers.length) {
  throw new Error(`Caja online payment cleanup incomplete: ${leftovers.join(", ")}`);
}

writeFileSync(posPath, pos);
process.stdout.write("Nüva Caja build hook: online payment method removed.\n");
