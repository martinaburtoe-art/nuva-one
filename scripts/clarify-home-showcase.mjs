import { readFileSync, writeFileSync } from "node:fs";

const indexPath = "src/routes/index.tsx";
const text = readFileSync(indexPath, "utf8");

const oldTitle = "Así se ve Nüva One por dentro";
const newTitle = "Una pequeña muestra de todo lo que puedes hacer con Nüva One";
const oldDescription =
  "Explora los módulos principales y descubre, de un vistazo, cómo puedes gestionar tu negocio desde un solo lugar.";
const newDescription =
  "Explora algunas de nuestras herramientas para gestionar, analizar y hacer crecer tu PYME. Este showcase representa solo una parte de la plataforma: Nüva One reúne muchas más funcionalidades para administrar tu negocio desde un solo lugar.";

if (text.includes(newTitle) && text.includes(newDescription)) {
  console.log("Homepage showcase copy already clarified");
  process.exit(0);
}

if (!text.includes(oldTitle) || !text.includes(oldDescription)) {
  throw new Error("Expected homepage showcase copy was not found; refusing to modify the page.");
}

const updated = text.replace(oldTitle, newTitle).replace(oldDescription, newDescription);

writeFileSync(indexPath, updated, "utf8");
console.log("Homepage showcase copy clarified");
