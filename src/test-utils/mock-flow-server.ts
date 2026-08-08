import http from "node:http";
import crypto from "node:crypto";

// Simula el comportamiento real de sandbox.flow.cl: valida firma HMAC-SHA256
// (mismo algoritmo documentado por Flow), guarda estado en memoria y permite
// avanzar manualmente el estado de un pago para simular que el cliente pagó.
const SECRET = "test-secret-key-123";
const API_KEY = "test-api-key-abc";

const payments = new Map<string, { commerceOrder: string; amount: number; status: number }>();
let tokenCounter = 0;

function sign(params: Record<string, string>, secretKey: string): string {
  const ordered = Object.keys(params).sort();
  const toSign = ordered.map((k) => `${k}${params[k]}`).join("");
  return crypto.createHmac("sha256", secretKey).update(toSign).digest("hex");
}

function verifySignature(params: URLSearchParams): boolean {
  const obj: Record<string, string> = {};
  let receivedSig = "";
  for (const [k, v] of params) {
    if (k === "s") receivedSig = v;
    else obj[k] = v;
  }
  const expected = sign(obj, SECRET);
  return expected === receivedSig;
}

export function startMockFlowServer(port: number) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "", `http://localhost:${port}`);

    if (req.method === "POST" && url.pathname === "/api/payment/create") {
      let body = "";
      for await (const chunk of req) body += chunk;
      const params = new URLSearchParams(body);

      if (params.get("apiKey") !== API_KEY) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ code: 101, message: "apiKey inválida" }));
        return;
      }
      if (!verifySignature(params)) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ code: 102, message: "Firma inválida" }));
        return;
      }

      tokenCounter += 1;
      const token = `mock-token-${tokenCounter}`;
      payments.set(token, {
        commerceOrder: params.get("commerceOrder") ?? "",
        amount: Number(params.get("amount")),
        status: 1, // pendiente
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ url: `http://localhost:${port}/pay`, token, flowOrder: tokenCounter }),
      );
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/payment/getStatus") {
      if (!verifySignature(url.searchParams)) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ code: 102, message: "Firma inválida" }));
        return;
      }
      const token = url.searchParams.get("token") ?? "";
      const p = payments.get(token);
      if (!p) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ code: 103, message: "Token no encontrado" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: p.status,
          commerceOrder: p.commerceOrder,
          amount: p.amount,
          flowOrder: 1,
        }),
      );
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(port);
  return {
    server,
    setPaid: (token: string) => {
      const p = payments.get(token);
      if (p) p.status = 2;
    },
    setRejected: (token: string) => {
      const p = payments.get(token);
      if (p) p.status = 3;
    },
    API_KEY,
    SECRET,
  };
}
