import { readFileSync, writeFileSync } from "node:fs";

const indexPath = "src/routes/index.tsx";
const text = readFileSync(indexPath, "utf8");

const oldHint = "Explora los módulos principales y descubre, de un vistazo, cómo puedes gestionar tu negocio desde un solo lugar.";
const newHint = "Haz clic en cada módulo para ver una pequeña muestra de cómo Nüva One puede ayudarte a gestionar, analizar y hacer crecer tu PYME.";

const oldButton = 'className={`rounded-xl px-3 py-2.5 text-left transition-all ${module === item.id ? "bg-primary/10 font-semibold text-primary shadow-soft" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}';
const newButton = 'aria-label={`Ver una muestra del módulo ${item.label}`} className={`rounded-xl px-3 py-2.5 text-left transition-all ${module === item.id ? "bg-primary/10 font-semibold text-primary shadow-soft" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}';

let updated = text;
let changed = false;

if (updated.includes(oldHint)) {
  updated = updated.replace(oldHint, newHint);
  changed = true;
}

if (updated.includes(oldButton) && !updated.includes("aria-label={`Ver una muestra del módulo")) {
  updated = updated.replace(oldButton, newButton);
  changed = true;
}

if (changed) {
  writeFileSync(indexPath, updated, "utf8");
  console.log("Homepage showcase interaction cues enhanced");
} else {
  console.log("Homepage showcase interaction cues already applied or source changed; no modification needed");
}
