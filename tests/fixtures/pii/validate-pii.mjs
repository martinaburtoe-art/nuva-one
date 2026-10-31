import { readFile } from "node:fs/promises";
import { people } from "../../../src/lib/agency/specialists.mjs";

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const RUT_DOTTED_RE = /\b\d{1,2}(\.\d{3}){2}-[\dkK]\b/g;
const RUT_PLAIN_RE = /\b\d{7,8}-[\dkK]\b/g;

function redactPII(content) {
  let count = 0;
  let redacted = content
    .replace(EMAIL_RE, () => { count++; return "[REDACTED]"; })
    .replace(RUT_DOTTED_RE, () => { count++; return "[REDACTED]"; })
    .replace(RUT_PLAIN_RE, () => { count++; return "[REDACTED]"; });
  return { content: redacted, count };
}

async function main() {
  let passed = 0;
  let failed = 0;

  // Test 1: Fixture positivo debe detectar 2 PII (1 email + 1 RUT)
  const posContent = await readFile("tests/fixtures/pii/positivo-pii.txt", "utf8");
  const posResult = redactPII(posContent);
  console.log(`Test 1 - Fixture positivo: PII detectados = ${posResult.count}`);
  if (posResult.count === 2 && posResult.content.includes("[REDACTED]") && !posResult.content.includes("juan.perez@empresa.cl") && !posResult.content.includes("12.345.678-9")) {
    console.log("  PASS: 2 PII detectados y redactados, valores no expuestos");
    passed++;
  } else {
    console.log("  FAIL: conteo incorrecto o valores expuestos");
    console.log("  Contenido redactado:", posResult.content);
    failed++;
  }

  // Test 2: Fixture negativo debe detectar 0 PII
  const negContent = await readFile("tests/fixtures/pii/negativo-sin-pii.txt", "utf8");
  const negResult = redactPII(negContent);
  console.log(`Test 2 - Fixture negativo: PII detectados = ${negResult.count}`);
  if (negResult.count === 0) {
    console.log("  PASS: 0 PII detectados en contenido limpio");
    passed++;
  } else {
    console.log("  FAIL: se detectaron PII en contenido sin PII");
    failed++;
  }

  // Test 3: RUT sin puntos (formato simple)
  const rutPlain = redactPII("RUT: 12345678-9");
  console.log(`Test 3 - RUT simple: detectados = ${rutPlain.count}`);
  if (rutPlain.count === 1 && rutPlain.content === "RUT: [REDACTED]") {
    console.log("  PASS: RUT simple detectado y redactado");
    passed++;
  } else {
    console.log("  FAIL: RUT simple no detectado correctamente");
    failed++;
  }

  // Test 4: RUT con K (dígito verificador)
  const rutK = redactPII("RUT: 7.654.321-K");
  console.log(`Test 4 - RUT con K: detectados = ${rutK.count}`);
  if (rutK.count === 1 && rutK.content === "RUT: [REDACTED]") {
    console.log("  PASS: RUT con K detectado y redactado");
    passed++;
  } else {
    console.log("  FAIL: RUT con K no detectado correctamente");
    failed++;
  }

  // Test 5: Ejecutar especialista people real
  const result = await people.execute({ id: "t-pii-test-001", title: "PII scan test", tipo: "pii-scan" });
  console.log(`Test 5 - Especialista people: result = ${result.result}`);
  console.log(`  Evidencia: ${result.evidence.join(" | ")}`);
  if (result.result === "PASS" || result.result === "WARN") {
    const hasEmail = result.evidence.some(e => e.includes("@"));
    const hasRut = /\d{7,8}-[\dkK]/.test(result.evidence.join(" | "));
    if (!hasEmail && !hasRut) {
      console.log("  PASS: ningún valor PII expuesto en evidencia");
      passed++;
    } else {
      console.log("  FAIL: valores PII expuestos en evidencia");
      failed++;
    }
  } else {
    console.log("  FAIL: resultado inesperado");
    failed++;
  }

  console.log(`\nResultado: ${passed} pasaron, ${failed} fallaron`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
